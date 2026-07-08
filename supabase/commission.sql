-- ─────────────────────────────────────────────────────────────────────
-- Commission model per collaborator:
--   commission_type      'percent'    → commission = % of their € sales
--                        'per_person' → commission = fixed amount × people
--   commission_currency  'EUR' | 'MAD' (used for per-person amounts)
--
-- Run in Supabase Dashboard → SQL Editor. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────

alter table public.collaborators
  add column if not exists commission_type text not null default 'percent',
  add column if not exists commission_currency text not null default 'EUR';
