-- ─────────────────────────────────────────────────────────────────────
-- Tangier Latin Festival — Partner security & authentication upgrade
-- Run this in the Supabase Dashboard → SQL Editor (safe to run twice).
-- Requires supabase/schema.sql to have been run first.
--
-- Adds email/password login fields, password reset tokens, and enforces
-- default active status as false for newly created partner accounts.
-- ─────────────────────────────────────────────────────────────────────

alter table public.collaborators
  add column if not exists password_hash        text,
  add column if not exists reset_token          text,
  add column if not exists reset_token_expires  timestamptz;

-- Ensure email column is indexed for fast lookup
create index if not exists collaborators_email_idx on public.collaborators (email);
create index if not exists collaborators_reset_token_idx on public.collaborators (reset_token);
