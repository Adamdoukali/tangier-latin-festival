-- ─────────────────────────────────────────────────────────────────────
-- Tracks whether each guest has RECEIVED their bracelet (handed out at
-- the festival). Stored as a JSON array with one boolean per guest of
-- the booking, e.g. '[true,false]'.
--
-- Run in Supabase Dashboard → SQL Editor. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────

alter table public.bookings
  add column if not exists bracelet_given text;
