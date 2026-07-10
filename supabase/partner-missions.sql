-- ─────────────────────────────────────────────────────────────────────
-- Partner missions: a bonus goal per collaborator, set by the admin.
--   mission_goal      how many people they must bring (null/0 = no mission)
--   mission_reward    money they win when the goal is reached
--   mission_currency  'EUR' | 'MAD'
--
-- Run in Supabase Dashboard → SQL Editor. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────

alter table public.collaborators
  add column if not exists mission_goal integer,
  add column if not exists mission_reward numeric default 0,
  add column if not exists mission_currency text not null default 'EUR';
