-- ─────────────────────────────────────────────────────────────────────
-- Tangier Latin Festival — Partner prices per pack
--
-- Each pack can carry two optional extra prices next to its public price:
--   partner_price_eur : per person, in euros, for bookings made through a
--                       euro partner's link or invite
--   partner_price_mad : per person, in dirhams, for bookings made through a
--                       Moroccan (dirham) partner's link or invite
-- Empty = that case uses the public price. The chosen price is locked on
-- the booking at creation (unit_price / price_currency), so changing these
-- later never touches existing bookings.
--
-- Run in Supabase Dashboard → SQL Editor. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────

alter table public.packs
  add column if not exists partner_price_eur numeric,
  add column if not exists partner_price_mad numeric;
