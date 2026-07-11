-- ─────────────────────────────────────────────────────────────────────
-- Language the guest used when booking ('en' | 'fr' | 'es').
-- Confirmation emails and ticket links use it so every guest is
-- addressed in their own language.
--
-- Run in Supabase Dashboard → SQL Editor. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────

alter table public.bookings
  add column if not exists lang text;
