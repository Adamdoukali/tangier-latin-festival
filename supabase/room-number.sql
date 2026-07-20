-- ─────────────────────────────────────────────────────────────────────
-- Real hotel room number assigned at check-in (e.g. "214"), shown in
-- the admin Hotel section and the rooming-list Excel.
--
-- Run in Supabase Dashboard → SQL Editor. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────

alter table public.bookings
  add column if not exists room_number text;
