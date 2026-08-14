-- Migration script to add num_guests and is_private columns to packs table
ALTER TABLE packs ADD COLUMN IF NOT EXISTS num_guests INTEGER DEFAULT 1;
ALTER TABLE packs ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
