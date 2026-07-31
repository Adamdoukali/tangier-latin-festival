-- ─────────────────────────────────────────────────────────────────────
-- Tangier Latin Festival — Discount Codes Setup
-- Run this in the Supabase Dashboard → SQL Editor (safe to run twice).
-- ─────────────────────────────────────────────────────────────────────

-- 1. Discount Codes table
create table if not exists public.discount_codes (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique,
  discount_amount      numeric not null default 0,
  discount_type        text not null default 'fixed', -- 'fixed' (€) or 'percent' (%)
  commission_override  numeric,                      -- custom collaborator commission (e.g., 10 €) when used on referral links
  commission_type      text default 'fixed',          -- 'fixed' or 'percent'
  max_uses             integer,
  used_count           integer not null default 0,
  active               boolean not null default true,
  notes                text,
  created_at           timestamptz not null default now()
);

-- 2. Add discount attribution columns to bookings table
alter table public.bookings
  add column if not exists discount_code text,
  add column if not exists discount_amount numeric default 0,
  add column if not exists discount_code_id uuid references public.discount_codes(id) on delete set null;

create index if not exists bookings_discount_code_idx on public.bookings (discount_code);

-- 3. Row Level Security policies
alter table public.discount_codes enable row level security;

drop policy if exists "tlf_all_discount_codes" on public.discount_codes;
create policy "tlf_all_discount_codes" on public.discount_codes for all using (true) with check (true);
