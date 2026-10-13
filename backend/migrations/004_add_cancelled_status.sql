-- 004_add_cancelled_status.sql — Add cancelled status to bookings
-- NOTE: This migration now includes all 6 status values to prevent breaking the system
-- Status values: 'scheduled', 'on process', 'done', 'cancelled', 'rescheduled', 'delayed'

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('scheduled', 'on process', 'done', 'cancelled', 'rescheduled', 'delayed'));
