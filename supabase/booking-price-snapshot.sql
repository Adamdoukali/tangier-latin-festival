-- ─────────────────────────────────────────────────────────────────────
-- Tangier Latin Festival — Price locked at booking time
--
-- Each booking keeps the per-person price (and currency) it was sold at,
-- so raising a pack's price later never changes past bookings' totals,
-- partner commissions or the Moroccan "amount due".
--
-- Run in Supabase Dashboard → SQL Editor BEFORE changing any pack price.
-- Safe to run twice: the backfill only fills rows that have no price yet.
-- ─────────────────────────────────────────────────────────────────────

alter table public.bookings
  add column if not exists unit_price numeric,        -- per person, in price_currency
  add column if not exists price_currency text;       -- 'EUR' | 'MAD'

-- Backfill every existing booking with its pack's CURRENT price.
-- (Run this while the packs still carry the old prices.)
update public.bookings b
set
  unit_price = nullif(regexp_replace(p.price, '[^0-9.]', '', 'g'), '')::numeric,
  price_currency = case when p.currency ~* '(mad|dh)' then 'MAD' else 'EUR' end
from public.packs p
where b.pack_id = p.id
  and b.unit_price is null;

-- Bookings whose pack no longer exists keep NULL and fall back to the live
-- price in the admin (there is nothing better to recover).
select count(*) filter (where unit_price is not null) as priced,
       count(*) filter (where unit_price is null)     as still_unpriced
from public.bookings;
