-- ─────────────────────────────────────────────────────────────────────
-- Language per collaborator ('en' | 'fr' | 'es'):
-- the Partner Portal displays in this language, and the partner's
-- booking/referral links open the website in it for their guests.
--
-- Run in Supabase Dashboard → SQL Editor. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────

alter table public.collaborators
  add column if not exists language text not null default 'en';
