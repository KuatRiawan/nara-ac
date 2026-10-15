-- 012_add_status_pembayaran.sql — Menyimpan status pembayaran invoice secara persisten pada booking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status_pembayaran VARCHAR(20) NOT NULL DEFAULT 'pending'
  CHECK (status_pembayaran IN ('pending', 'paid'));

CREATE INDEX IF NOT EXISTS idx_bookings_status_pembayaran ON bookings (status_pembayaran);

-- Set status_pembayaran = 'paid' untuk booking yang sudah 'done' secara historis
UPDATE bookings SET status_pembayaran = 'paid' WHERE status = 'done' AND status_pembayaran = 'pending';
