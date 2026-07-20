-- ─────────────────────────────────────────────────────────────────────
-- Per-category per-person commission rates: a partner can earn a
-- different fixed amount per person depending on what was sold —
-- e.g. 15 for a double room, 10 for a single room, 5 for a full pass.
-- Null falls back to the general `commission` amount.
--
-- Run in Supabase Dashboard → SQL Editor. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────

alter table public.collaborators
  add column if not exists commission_double numeric,
  add column if not exists commission_single numeric,
  add column if not exists commission_fullpass numeric;
