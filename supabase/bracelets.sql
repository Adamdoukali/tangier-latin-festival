-- ─────────────────────────────────────────────────────────────────────
-- Bracelet category per booking, for the admin "Bracelets" section:
--   'artist' | 'hotel' | 'fullpass'  (null = automatic from the pack:
--   room packs → hotel, everything else → fullpass)
--
-- Run in Supabase Dashboard → SQL Editor. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────

alter table public.bookings
  add column if not exists bracelet text;
