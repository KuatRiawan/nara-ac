-- 013_add_booking_items.sql — Multi-service & per-item booking support
CREATE TABLE IF NOT EXISTS booking_items (
  id           SERIAL PRIMARY KEY,
  booking_id   INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  layanan_id   INTEGER NOT NULL REFERENCES service_catalog(id),
  jumlah_unit  INTEGER NOT NULL DEFAULT 1 CHECK (jumlah_unit > 0),
  harga_satuan INTEGER NOT NULL CHECK (harga_satuan >= 0),
  subtotal     INTEGER NOT NULL CHECK (subtotal >= 0),
  catatan      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_layanan ON booking_items(layanan_id);

-- Backfill data existing agar semua booking lama memiliki setidaknya 1 booking_item
INSERT INTO booking_items (booking_id, layanan_id, jumlah_unit, harga_satuan, subtotal)
SELECT 
  b.id, 
  b.layanan_id, 
  COALESCE(b.jumlah_unit, 1), 
  s.harga, 
  (s.harga * COALESCE(b.jumlah_unit, 1))
FROM bookings b
JOIN service_catalog s ON s.id = b.layanan_id
WHERE NOT EXISTS (
  SELECT 1 FROM booking_items bi WHERE bi.booking_id = b.id
);
