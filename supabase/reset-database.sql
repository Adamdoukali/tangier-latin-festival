-- ─────────────────────────────────────────────────────────────────────
-- Tangier Latin Festival — Database Reset Script
-- Run this in the Supabase Dashboard → SQL Editor to perform a fresh start.
-- ─────────────────────────────────────────────────────────────────────

-- 1. Wipe all bookings, invites, collaborators, and discount codes
TRUNCATE TABLE public.bookings CASCADE;
TRUNCATE TABLE public.invites CASCADE;
TRUNCATE TABLE public.collaborators CASCADE;
TRUNCATE TABLE public.discount_codes CASCADE;
