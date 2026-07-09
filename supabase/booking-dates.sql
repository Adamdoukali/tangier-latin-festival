-- ─────────────────────────────────────────────────────────────────────
-- Arrival / departure dates on bookings (asked on the /book form).
--
-- Run in Supabase Dashboard → SQL Editor. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────

alter table public.bookings
  add column if not exists arrival_date date,
  add column if not exists departure_date date;
