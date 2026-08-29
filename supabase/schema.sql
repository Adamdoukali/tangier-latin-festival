-- ─────────────────────────────────────────────────────────────────────
-- Tangier Latin Festival — Supabase setup
-- Run this in the Supabase Dashboard → SQL Editor (safe to run twice).
--
-- Your project already has: packs, bookings, invites.
-- This script adds the collaborators system, attribution columns,
-- row-level-security policies, and seeds the default packs.
-- ─────────────────────────────────────────────────────────────────────

-- 0. Make sure the existing tables can generate their own ids/timestamps
alter table public.packs    alter column id set default gen_random_uuid();
alter table public.bookings alter column id set default gen_random_uuid();
alter table public.invites  alter column id set default gen_random_uuid();
alter table public.packs    alter column created_at set default now();
alter table public.bookings alter column created_at set default now();
alter table public.invites  alter column created_at set default now();

-- 1. Collaborators (partners / promoters who sell or give away tickets)
create table if not exists public.collaborators (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,           -- short referral code, e.g. SALSERO
  email       text,
  phone       text,
  commission  numeric default 0,              -- optional % for reporting
  active      boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now()
);

-- Admin activity history (append-only from the application)
create table if not exists public.admin_audit_logs (
  id            uuid primary key default gen_random_uuid(),
  admin_id      text not null,
  admin_name    text not null,
  admin_email   text not null,
  action        text not null check (action in ('create', 'update', 'delete', 'status', 'reorder')),
  section       text not null,
  entity_id     text,
  entity_label  text,
  summary       text not null,
  changes       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_admin_email_idx
  on public.admin_audit_logs (admin_email);
create index if not exists admin_audit_logs_section_idx
  on public.admin_audit_logs (section);

-- 2. Attribution columns on bookings + invites
alter table public.bookings
  add column if not exists collaborator_id uuid references public.collaborators(id) on delete set null,
  add column if not exists source text not null default 'manual';  -- manual | website | invite | referral

alter table public.invites
  add column if not exists collaborator_id uuid references public.collaborators(id) on delete set null;

create index if not exists bookings_collaborator_idx on public.bookings (collaborator_id);
create index if not exists bookings_status_idx       on public.bookings (status);
create index if not exists invites_collaborator_idx  on public.invites (collaborator_id);
create index if not exists invites_code_idx          on public.invites (code);

-- 3. Row Level Security.
-- NOTE: the admin panel currently authenticates client-side only, so these
-- policies are intentionally permissive (the anon key can read and write).
-- When you move to Supabase Auth for admins, tighten the write policies.
alter table public.packs         enable row level security;
alter table public.bookings      enable row level security;
alter table public.invites       enable row level security;
alter table public.collaborators enable row level security;
alter table public.admin_audit_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['packs','bookings','invites','collaborators'] loop
    execute format('drop policy if exists "tlf_all_%s" on public.%I', t, t);
    execute format('create policy "tlf_all_%s" on public.%I for all using (true) with check (true)', t, t);
  end loop;
end $$;

drop policy if exists "tlf_read_admin_audit_logs" on public.admin_audit_logs;
create policy "tlf_read_admin_audit_logs"
  on public.admin_audit_logs for select using (true);
drop policy if exists "tlf_insert_admin_audit_logs" on public.admin_audit_logs;
create policy "tlf_insert_admin_audit_logs"
  on public.admin_audit_logs for insert with check (true);

-- 4. Seed default packs (only inserts ones that don't exist yet)
insert into public.packs (name, sub, price, currency, category, features, popular, active)
select * from (values
  ('Chambre double', 'SOLAZUR HOTEL TANGIER (2 NIGHTS)', '335', '€', 'Chambre double', array['2 NIGHTS','BREAKFAST','DINNER','FULL PASS'], false, true),
  ('Chambre double', 'SOLAZUR HOTEL TANGIER (3 NIGHTS)', '385', '€', 'Chambre double', array['3 NIGHTS','BREAKFAST','DINNER','FULL PASS'], true,  true),
  ('Chambre double', 'SOLAZUR HOTEL TANGIER (4 NIGHTS)', '435', '€', 'Chambre double', array['4 NIGHTS','BREAKFAST','DINNER','FULL PASS'], false, true),
  ('Chambre single', 'SOLAZUR HOTEL TANGIER (2 NIGHTS)', '435', '€', 'Chambre single', array['2 NIGHTS','BREAKFAST','DINNER','FULL PASS'], false, true),
  ('Chambre single', 'SOLAZUR HOTEL TANGIER (3 NIGHTS)', '535', '€', 'Chambre single', array['3 NIGHTS','BREAKFAST','DINNER','FULL PASS'], false, true),
  ('Chambre single', 'SOLAZUR HOTEL TANGIER (4 NIGHTS)', '635', '€', 'Chambre single', array['4 NIGHTS','BREAKFAST','DINNER','FULL PASS'], false, true),
  ('Full Pass',   'WITHOUT ACCOMMODATION', '130', '€', 'Full Pass', array['ALL WORKSHOPS','SHOWS','SOCIAL PARTIES','POOL PARTIES'], false, true),
  ('Couple Pass', 'WITHOUT ACCOMMODATION', '200', '€', 'Full Pass', array['1 LEADER + 1 FOLLOWER','ALL WORKSHOPS','SHOWS & PARTIES','POOL PARTIES'], false, true),
  ('Party Pass',  'WITHOUT ACCOMMODATION', '90',  '€', 'Full Pass', array['SHOWS','SOCIAL PARTIES','POOL PARTIES','(NO WORKSHOPS)'], false, true),
  ('Day Pass',    'WITHOUT ACCOMMODATION', '50',  '€', 'Full Pass', array['ALL WORKSHOPS','SHOWS','SOCIAL PARTIES','POOL PARTIES (1 DAY ONLY)'], false, true)
) as seed(name, sub, price, currency, category, features, popular, active)
where not exists (
  select 1 from public.packs p where p.name = seed.name and p.sub = seed.sub
);
