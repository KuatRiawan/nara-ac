-- 002_expansion.sql - Admin & Technician Features Expansion

-- 1. Alter Bookings Status Constraint to support cancelled, rescheduled, delayed
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('scheduled', 'on process', 'done', 'cancelled', 'rescheduled', 'delayed'));

-- 2. AC Unit Management
CREATE TABLE ac_units (
  id             SERIAL PRIMARY KEY,
  customer_id    INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  brand          TEXT NOT NULL,
  model          TEXT,
  tipe           TEXT,
  kapasitas_pk   NUMERIC(3,1),
  lokasi         TEXT NOT NULL, -- e.g., 'Kamar Utama', 'Ruang Tamu'
  tanggal_pasang DATE,
  catatan        TEXT,
  aktif          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link booking to specific AC Unit (optional, in case a booking targets multiple units, usually a booking is an overarching job, but let's associate it)
ALTER TABLE bookings ADD COLUMN ac_unit_id INTEGER REFERENCES ac_units(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN alasan_batal TEXT;

-- 3. Work Order Documentation (Photos)
CREATE TABLE work_order_photos (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tipe        TEXT NOT NULL CHECK (tipe IN ('before', 'after')),
  url_foto    TEXT NOT NULL,
  catatan     TEXT,
  waktu       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Work Order Checklist 
CREATE TABLE work_order_checklists (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  task        TEXT NOT NULL,
  is_checked  BOOLEAN NOT NULL DEFAULT FALSE,
  waktu       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Technician Leave / Availability
CREATE TABLE technician_availability (
  id          SERIAL PRIMARY KEY,
  teknisi_id  INTEGER NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('available', 'busy', 'off')),
  tanggal     DATE NOT NULL,
  catatan     TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teknisi_id, tanggal)
);
