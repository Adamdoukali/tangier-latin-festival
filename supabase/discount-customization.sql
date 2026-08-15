-- Add discount scope, custom price override, target packs, and max guests discounted to discount_codes table
ALTER TABLE discount_codes 
ADD COLUMN IF NOT EXISTS apply_scope text DEFAULT 'per_booking',
ADD COLUMN IF NOT EXISTS override_price numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS applicable_pack_ids text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_guests_discounted integer DEFAULT NULL;

COMMENT ON COLUMN discount_codes.apply_scope IS 'Scope: per_booking, per_person, fixed_price';
COMMENT ON COLUMN discount_codes.override_price IS 'Fixed custom price override in €';
COMMENT ON COLUMN discount_codes.applicable_pack_ids IS 'List of pack IDs this code applies to; NULL = all packs';
COMMENT ON COLUMN discount_codes.max_guests_discounted IS 'Number of guests in booking receiving per-person discount; NULL = all guests';

