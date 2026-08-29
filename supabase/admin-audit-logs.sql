-- Persistent admin activity history.
-- Run once in Supabase Dashboard -> SQL Editor. Safe to run repeatedly.

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

alter table public.admin_audit_logs enable row level security;

drop policy if exists "tlf_read_admin_audit_logs" on public.admin_audit_logs;
create policy "tlf_read_admin_audit_logs"
  on public.admin_audit_logs for select using (true);

drop policy if exists "tlf_insert_admin_audit_logs" on public.admin_audit_logs;
create policy "tlf_insert_admin_audit_logs"
  on public.admin_audit_logs for insert with check (true);

-- There is deliberately no update or delete policy. Activity entries are
-- append-only from the application so ordinary admin actions cannot rewrite
-- or erase their history.
