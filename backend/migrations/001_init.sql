-- 001_init.sql — skema A26-CS054. Nama tabel/kolom mengikuti sketsa PRD §9.
-- Semua waktu timestamptz (UTC); jam operasional dievaluasi di zona waktu dari tabel settings.

CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE technicians (
  id          SERIAL PRIMARY KEY,
  nama        TEXT NOT NULL,
  kontak      TEXT NOT NULL,
  aktif       BOOLEAN NOT NULL DEFAULT TRUE,
  catatan     TEXT,
  telegram_chat_id TEXT,
  is_synthetic BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  nama          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','technician')),
  technician_id INTEGER REFERENCES technicians(id),
  aktif         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((role = 'technician') = (technician_id IS NOT NULL))
);

CREATE TABLE customers (
  id          SERIAL PRIMARY KEY,
  nama        TEXT NOT NULL,
  kontak      TEXT NOT NULL UNIQUE,
  alamat      TEXT,
  catatan_umum TEXT,
  aktif       BOOLEAN NOT NULL DEFAULT TRUE,
  is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE service_catalog (
  id             SERIAL PRIMARY KEY,
  kode           TEXT NOT NULL UNIQUE,
  nama_layanan   TEXT NOT NULL,
  kategori       TEXT NOT NULL CHECK (kategori IN ('cuci','perbaikan','instalasi','lainnya')),
  deskripsi      TEXT NOT NULL,
  harga          INTEGER NOT NULL CHECK (harga >= 0),
  durasi_menit   INTEGER NOT NULL DEFAULT 60 CHECK (durasi_menit > 0),
  aktif          BOOLEAN NOT NULL DEFAULT TRUE,
  is_synthetic   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id             SERIAL PRIMARY KEY,
  kode_booking   TEXT NOT NULL UNIQUE,
  customer_id    INTEGER NOT NULL REFERENCES customers(id),
  layanan_id     INTEGER NOT NULL REFERENCES service_catalog(id),
  jadwal_mulai   TIMESTAMPTZ NOT NULL,
  jadwal_selesai TIMESTAMPTZ NOT NULL,
  alamat         TEXT NOT NULL,
  keluhan        TEXT NOT NULL,
  kontak         TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','on process','done')),
  teknisi_id     INTEGER REFERENCES technicians(id),
  created_by     TEXT NOT NULL DEFAULT 'customer',
  is_synthetic   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jadwal_selesai > jadwal_mulai)
);
CREATE INDEX idx_bookings_jadwal ON bookings (jadwal_mulai);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_teknisi ON bookings (teknisi_id, jadwal_mulai);

CREATE TABLE status_log (
  id            SERIAL PRIMARY KEY,
  booking_id    INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status_lama   TEXT,
  status_baru   TEXT NOT NULL,
  diubah_oleh   TEXT NOT NULL,
  catatan       TEXT,
  waktu         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE booking_audit (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  aksi        TEXT NOT NULL,
  detail      JSONB NOT NULL DEFAULT '{}',
  oleh        TEXT NOT NULL,
  waktu       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory (
  id         SERIAL PRIMARY KEY,
  nama       TEXT NOT NULL UNIQUE,
  kategori   TEXT NOT NULL CHECK (kategori IN ('freon','pipa','kabel','komponen')),
  stok       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (stok >= 0),
  satuan     TEXT NOT NULL,
  min_stok   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (min_stok >= 0),
  aktif      BOOLEAN NOT NULL DEFAULT TRUE,
  is_synthetic BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory_usage (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  item_id     INTEGER NOT NULL REFERENCES inventory(id),
  jumlah      NUMERIC(10,2) NOT NULL CHECK (jumlah > 0),
  teknisi_id  INTEGER REFERENCES technicians(id),
  catatan     TEXT,
  waktu       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feedback (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  komentar    TEXT,
  sentimen    TEXT,
  waktu       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reminder_log (
  id             SERIAL PRIMARY KEY,
  booking_id     INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  target         TEXT NOT NULL CHECK (target IN ('pelanggan','teknisi')),
  penerima       TEXT NOT NULL,
  kanal          TEXT NOT NULL,
  untuk_tanggal  DATE NOT NULL,
  pesan          TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  percobaan      INTEGER NOT NULL DEFAULT 0,
  error          TEXT,
  waktu_kirim    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, target, untuk_tanggal)
);
CREATE INDEX idx_reminder_status ON reminder_log (status);

CREATE TABLE complaint_tickets (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  pesan       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  sumber      TEXT NOT NULL DEFAULT 'chatbot',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at   TIMESTAMPTZ
);

CREATE TABLE inference_log (
  id           SERIAL PRIMARY KEY,
  teks_hash    TEXT NOT NULL,
  panjang_teks INTEGER NOT NULL,
  intent       TEXT,
  confidence   NUMERIC(5,4),
  endpoint     TEXT NOT NULL,
  rute         TEXT,
  fallback     BOOLEAN NOT NULL DEFAULT FALSE,
  error        TEXT,
  latency_ms   INTEGER,
  model_version TEXT,
  waktu        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prediction_output (
  id            SERIAL PRIMARY KEY,
  target        TEXT NOT NULL,
  periode       TEXT NOT NULL,
  nilai_prediksi NUMERIC(10,2) NOT NULL,
  batas_bawah   NUMERIC(10,2),
  batas_atas    NUMERIC(10,2),
  model_version TEXT NOT NULL,
  keterangan    TEXT NOT NULL,
  is_synthetic  BOOLEAN NOT NULL DEFAULT TRUE,
  metrik        JSONB,
  dibuat_pada   TIMESTAMPTZ NOT NULL DEFAULT now()
);
