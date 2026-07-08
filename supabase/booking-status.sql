-- ─────────────────────────────────────────────────────────────────────
-- Fix: allow the "declined" booking status.
--
-- The bookings table was created with a CHECK constraint on the status
-- column that predates the "declined" status, so the database rejects
-- any attempt to decline a booking. This script removes the old
-- constraint and recreates it with all four statuses.
--
-- Run in Supabase Dashboard → SQL Editor. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────

do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.bookings drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'checked-in', 'declined'));
