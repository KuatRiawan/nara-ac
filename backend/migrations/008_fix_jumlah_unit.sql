-- 008_fix_jumlah_unit.sql — Add missing jumlah_unit column to bookings table
-- This column is referenced in bookingService.js but was never added to the schema

-- Add jumlah_unit column with default value of 1
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS jumlah_unit INTEGER NOT NULL DEFAULT 1;

-- Add constraint to ensure jumlah_unit is between 1 and 20
ALTER TABLE bookings ADD CONSTRAINT chk_jumlah_unit_range CHECK (jumlah_unit >= 1 AND jumlah_unit <= 20);

-- Add index for better query performance on jumlah_unit
CREATE INDEX IF NOT EXISTS idx_bookings_jumlah_unit ON bookings (jumlah_unit);
