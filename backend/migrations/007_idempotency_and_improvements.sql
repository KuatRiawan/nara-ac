-- 007_idempotency_and_improvements.sql — Idempotency key, reminder deduplication constraint, 
-- status transition validation, and audit improvements

-- 1. Add idempotency key column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_idempotency ON bookings (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_idempotency ON bookings (idempotency_key);

-- 2. Add UNIQUE constraint to reminder_log for deduplication (already in 001, but ensuring it exists)
-- This prevents duplicate reminders for the same booking/target/date
-- Already exists in 001_init.sql: UNIQUE (booking_id, target, untuk_tanggal)

-- 3. Add status transition validation table or check constraint
-- The TRANSITIONS are already validated in code (bookingService.js line 341-345)
-- and workflowService.js line 199

-- 4. Add audit trail for booking status changes (already in 005 via status_log table)
-- status_log table already tracks all status changes with booking_id, status_lama, status_baru

-- 5. Add index for common query patterns
CREATE INDEX IF NOT EXISTS idx_bookings_kode ON bookings (kode_booking);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_log_booking ON status_log (booking_id, waktu DESC);

-- 6. Add constraint for booking status (already in 005)
-- Already exists: CHECK (status IN ('scheduled','on process','done','cancelled','rescheduled','delayed'))

-- 7. Add audit_logs indexes for better query performance (already in 005)
-- Already exists: idx_audit_created, idx_audit_action

-- 8. Add notifications index for performance (already in 005)
-- Already exists: idx_notif_target

-- 9. Add reminder_log indexes for better filtering
CREATE INDEX IF NOT EXISTS idx_reminder_booking ON reminder_log (booking_id);
CREATE INDEX IF NOT EXISTS idx_reminder_target_date ON reminder_log (target, untuk_tanggal);
CREATE INDEX IF NOT EXISTS idx_reminder_status ON reminder_log (status);
CREATE INDEX IF NOT EXISTS idx_reminder_created ON reminder_log (created_at DESC);
