-- ─────────────────────────────────────────────────────────────────────
-- Tangier Latin Festival — Partner accounts upgrade
-- Run this in the Supabase Dashboard → SQL Editor (safe to run twice).
-- Requires supabase/schema.sql to have been run first.
--
-- Gives each collaborator a login for the Partner Portal (/partner):
-- username + access code, an optional invite quota, and a last-seen
-- timestamp so the admin can see which accounts are active.
-- ─────────────────────────────────────────────────────────────────────

alter table public.collaborators
  add column if not exists username     text unique,
  add column if not exists access_code  text,
  add column if not exists invite_quota integer,          -- null = unlimited
  add column if not exists last_seen_at timestamptz;

create index if not exists collaborators_username_idx on public.collaborators (username);
