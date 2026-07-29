-- ─────────────────────────────────────────────────────────────────────
-- Guest details column on public.bookings (JSONB storing per-guest info
-- like email, phone, origin override: [{firstName, lastName, email, phone, origin, notes}]).
--
-- Run in Supabase Dashboard → SQL Editor. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────

alter table public.bookings
  add column if not exists guest_details jsonb;
