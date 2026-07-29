-- ─────────────────────────────────────────────────────────────────────
-- Room type column assigned in the admin Hotel section
-- (e.g. "Vue sur mer", "Vue sur piscine", "Vue normal", "Twin normal",
--  "Twin vue sur mer", "Triple", "Duplex", "Duplexe junior", "Duplexe senior").
--
-- Run in Supabase Dashboard → SQL Editor. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────

alter table public.bookings
  add column if not exists room_type text;
