-- 015_warranty_claims_and_maintenance.sql
-- Fase 4: Unit AC, Perawatan & Garansi/Klaim (BR-15 s/d BR-18, BR-23 s/d BR-33)

CREATE TABLE IF NOT EXISTS warranty_claims (
  id                    SERIAL PRIMARY KEY,
  kode_klaim            TEXT UNIQUE NOT NULL,
  booking_id            INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id           INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  ac_unit_id            INTEGER REFERENCES ac_units(id) ON DELETE SET NULL,
  keluhan               TEXT NOT NULL,
  rating                INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_komentar       TEXT,
  status                TEXT NOT NULL DEFAULT 'diajukan'
                        CHECK (status IN ('diajukan', 'dijadwalkan', 'diperiksa', 'disetujui', 'ditolak', 'selesai')),
  jadwal_pemeriksaan    TIMESTAMPTZ,
  teknisi_pemeriksa_id  INTEGER REFERENCES technicians(id) ON DELETE SET NULL,
  catatan_pemeriksaan   TEXT,
  alasan_penolakan      TEXT,
  is_gratis             BOOLEAN NOT NULL DEFAULT TRUE,
  biaya_tambahan        NUMERIC(12,2) DEFAULT 0,
  booking_berbayar_id   INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claims_booking ON warranty_claims (booking_id);
CREATE INDEX IF NOT EXISTS idx_claims_customer ON warranty_claims (customer_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON warranty_claims (status);
