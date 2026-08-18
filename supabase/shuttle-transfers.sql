-- ─────────────────────────────────────────────────────────────────────
-- Add shuttle transfer columns to bookings table
-- Run this in the Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS needs_transfer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS transfer_type text DEFAULT NULL,       -- 'port' | 'airport'
  ADD COLUMN IF NOT EXISTS transfer_option text DEFAULT NULL,     -- 'one_way_arrival' | 'one_way_departure' | 'round_trip'
  ADD COLUMN IF NOT EXISTS transfer_location text DEFAULT NULL,   -- e.g. 'Tanger Ville Port', 'Tangier Airport (TNG)'
  ADD COLUMN IF NOT EXISTS transfer_details text DEFAULT NULL,    -- flight / boat number or notes
  ADD COLUMN IF NOT EXISTS transfer_cost numeric DEFAULT 0;

COMMENT ON COLUMN public.bookings.needs_transfer IS 'Whether client requested airport/port shuttle';
COMMENT ON COLUMN public.bookings.transfer_type IS 'Type of transfer: port or airport';
COMMENT ON COLUMN public.bookings.transfer_option IS 'Direction: one_way_arrival, one_way_departure, or round_trip';
COMMENT ON COLUMN public.bookings.transfer_location IS 'Specific port or airport name';
COMMENT ON COLUMN public.bookings.transfer_details IS 'Flight number, ferry company or arrival/departure details';
COMMENT ON COLUMN public.bookings.transfer_cost IS 'Total cost in EUR charged for the shuttle transfer';
