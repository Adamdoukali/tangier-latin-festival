-- ─────────────────────────────────────────────────────────────────────
-- Tangier Latin Festival — Pack ordering
-- Run this in the Supabase Dashboard → SQL Editor (safe to run twice).
--
-- Adds a sort_order column so the admin can arrange how packs are laid
-- out on the website (e.g. put the "Populaire" pack in the middle).
-- ─────────────────────────────────────────────────────────────────────

alter table public.packs
  add column if not exists sort_order integer;

-- Give existing packs an initial order based on creation date
update public.packs p
set sort_order = sub.rn
from (
  select id, row_number() over (order by created_at) as rn
  from public.packs
) sub
where p.id = sub.id and p.sort_order is null;
