CREATE TABLE IF NOT EXISTS settings (
  setting_key         VARCHAR(255) PRIMARY KEY,
  value       JSON NOT NULL,
  updated_at  DATETIME(3) NOT NULL DEFAULT now()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS technicians (
  id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nama        VARCHAR(255) NOT NULL,
  kontak      VARCHAR(255) NOT NULL,
  aktif       BOOLEAN NOT NULL DEFAULT TRUE,
  catatan TEXT,
  telegram_chat_id VARCHAR(255),
  is_synthetic BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  DATETIME(3) NOT NULL DEFAULT now()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nama        VARCHAR(255) NOT NULL,
  kontak      VARCHAR(255) NOT NULL UNIQUE,
  alamat TEXT,
  catatan_umum TEXT,
  aktif       BOOLEAN NOT NULL DEFAULT TRUE,
  is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  DATETIME(3) NOT NULL DEFAULT now()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_catalog (
  id             INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kode           VARCHAR(255) NOT NULL UNIQUE,
  nama_layanan   VARCHAR(255) NOT NULL,
  kategori       VARCHAR(255) NOT NULL CHECK (kategori IN ('cuci','perbaikan','instalasi','lainnya')),
  deskripsi TEXT NOT NULL,
  harga          INTEGER NOT NULL CHECK (harga >= 0),
  durasi_menit   INTEGER NOT NULL DEFAULT 60 CHECK (durasi_menit > 0),
  aktif          BOOLEAN NOT NULL DEFAULT TRUE,
  is_synthetic   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at     DATETIME(3) NOT NULL DEFAULT now(),
  interval_maintenance_hari INTEGER CHECK (interval_maintenance_hari IS NULL OR interval_maintenance_hari > 0),
  bahan_dibutuhkan JSON NOT NULL DEFAULT '[]'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory (
  id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nama       VARCHAR(255) NOT NULL UNIQUE,
  kategori   VARCHAR(255) NOT NULL CHECK (kategori IN ('freon','pipa','kabel','komponen')),
  stok       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (stok >= 0),
  satuan     VARCHAR(255) NOT NULL,
  min_stok   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (min_stok >= 0),
  aktif      BOOLEAN NOT NULL DEFAULT TRUE,
  is_synthetic BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at DATETIME(3) NOT NULL DEFAULT now()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inference_log (
  id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teks_hash    VARCHAR(255) NOT NULL,
  panjang_teks INTEGER NOT NULL,
  intent       VARCHAR(255),
  confidence   NUMERIC(5,4),
  endpoint     VARCHAR(255) NOT NULL,
  rute         VARCHAR(255),
  fallback     BOOLEAN NOT NULL DEFAULT FALSE,
  error TEXT,
  latency_ms   INTEGER,
  model_version VARCHAR(255),
  waktu        DATETIME(3) NOT NULL DEFAULT now()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prediction_output (
  id            INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  target        VARCHAR(255) NOT NULL,
  periode       VARCHAR(255) NOT NULL,
  nilai_prediksi NUMERIC(10,2) NOT NULL,
  batas_bawah   NUMERIC(10,2),
  batas_atas    NUMERIC(10,2),
  model_version VARCHAR(255) NOT NULL,
  keterangan    VARCHAR(255) NOT NULL,
  is_synthetic  BOOLEAN NOT NULL DEFAULT TRUE,
  metrik        JSON,
  dibuat_pada   DATETIME(3) NOT NULL DEFAULT now()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor       VARCHAR(255) NOT NULL,
  role        VARCHAR(255) NOT NULL,
  action      VARCHAR(255) NOT NULL,
  entity      VARCHAR(255) NOT NULL,
  entity_id   INTEGER,
  metadata    JSON DEFAULT '{}',
  created_at  DATETIME(3) NOT NULL DEFAULT now(),
  sebelum JSON,
  sesudah JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS whatsapp_otps (
  id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kontak      VARCHAR(255) NOT NULL,
  otp_hash    VARCHAR(255) NOT NULL,
  expires_at  DATETIME(3) NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  is_used     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  DATETIME(3) NOT NULL DEFAULT now()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scheduling_locks (
  name VARCHAR(100) PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id            INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nama          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('admin','technician','customer')),
  technician_id INTEGER,
  aktif         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    DATETIME(3) NOT NULL DEFAULT now(),
  customer_id INTEGER,
  CONSTRAINT users_role_link_check CHECK (
  (role = 'technician' AND technician_id IS NOT NULL AND customer_id IS NULL) OR
  (role = 'customer'   AND customer_id IS NOT NULL AND technician_id IS NULL) OR
  (role = 'admin'      AND technician_id IS NULL AND customer_id IS NULL)
),
  kontak VARCHAR(255),
  FOREIGN KEY (technician_id) REFERENCES technicians(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ac_units (
  id             INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_id    INTEGER NOT NULL,
  brand          VARCHAR(255) NOT NULL,
  model          VARCHAR(255),
  tipe           VARCHAR(255),
  kapasitas_pk   NUMERIC(3,1),
  lokasi         VARCHAR(255) NOT NULL,
  tanggal_pasang DATE,
  catatan TEXT,
  aktif          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     DATETIME(3) NOT NULL DEFAULT now(),
  updated_at     DATETIME(3) NOT NULL DEFAULT now(),
  nomor_seri VARCHAR(255),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS technician_availability (
  id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teknisi_id  INTEGER NOT NULL,
  status      VARCHAR(255) NOT NULL CHECK (status IN ('available', 'busy', 'off')),
  tanggal     DATE NOT NULL,
  catatan TEXT,
  updated_at  DATETIME(3) NOT NULL DEFAULT now(),
  UNIQUE (teknisi_id, tanggal),
  FOREIGN KEY (teknisi_id) REFERENCES technicians(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookings (
  id             INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kode_booking   VARCHAR(255) NOT NULL UNIQUE,
  customer_id    INTEGER NOT NULL,
  layanan_id     INTEGER NOT NULL,
  jadwal_mulai   DATETIME(3) NOT NULL,
  jadwal_selesai DATETIME(3) NOT NULL,
  alamat TEXT NOT NULL,
  keluhan TEXT NOT NULL,
  kontak         VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','on process','done','cancelled','rescheduled','delayed')),
  teknisi_id     INTEGER,
  created_by     VARCHAR(255) NOT NULL DEFAULT 'customer',
  is_synthetic   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     DATETIME(3) NOT NULL DEFAULT now(),
  updated_at     DATETIME(3) NOT NULL DEFAULT now(),
  ac_unit_id INTEGER,
  alasan_batal TEXT,
  alasan_tunda TEXT,
  mulai_aktual DATETIME(3),
  selesai_aktual DATETIME(3),
  idempotency_key VARCHAR(255),
  jumlah_unit INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT chk_jumlah_unit_range CHECK (jumlah_unit >= 1 AND jumlah_unit <= 20),
  status_pembayaran VARCHAR(20) NOT NULL DEFAULT 'pending'
  CHECK (status_pembayaran IN ('pending', 'paid')),
  feedback_token VARCHAR(255) UNIQUE,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (layanan_id) REFERENCES service_catalog(id),
  FOREIGN KEY (teknisi_id) REFERENCES technicians(id),
  FOREIGN KEY (ac_unit_id) REFERENCES ac_units(id) ON DELETE SET NULL,
  skema_pembayaran VARCHAR(30) DEFAULT 'pay_after_service',
  metode_pembayaran VARCHAR(30) DEFAULT 'transfer',
  bukti_pembayaran_url TEXT,
  status_verifikasi_pembayaran VARCHAR(30) DEFAULT 'belum_ada_bukti',
  catatan_verifikasi TEXT,
  verified_by INTEGER,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  verified_at DATETIME(3),
  total_dibayar NUMERIC(12, 2) DEFAULT 0,
  refund_nominal NUMERIC(12, 2) DEFAULT 0,
  refund_status VARCHAR(20) DEFAULT 'none',
  refund_catatan TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS status_log (
  id            INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_id    INTEGER NOT NULL,
  status_lama   VARCHAR(255),
  status_baru   VARCHAR(255) NOT NULL,
  diubah_oleh   VARCHAR(255) NOT NULL,
  catatan TEXT,
  waktu         DATETIME(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_audit (
  id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_id  INTEGER NOT NULL,
  aksi        VARCHAR(255) NOT NULL,
  detail      JSON NOT NULL DEFAULT '{}',
  oleh        VARCHAR(255) NOT NULL,
  waktu       DATETIME(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_usage (
  id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_id  INTEGER NOT NULL,
  item_id     INTEGER NOT NULL,
  jumlah      NUMERIC(10,2) NOT NULL CHECK (jumlah > 0),
  teknisi_id  INTEGER,
  catatan TEXT,
  waktu       DATETIME(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES inventory(id),
  FOREIGN KEY (teknisi_id) REFERENCES technicians(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feedback (
  id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_id  INTEGER NOT NULL UNIQUE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  komentar TEXT,
  sentimen    VARCHAR(255),
  waktu       DATETIME(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reminder_log (
  id             INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_id     INTEGER NOT NULL,
  target         VARCHAR(255) NOT NULL CHECK (target IN ('pelanggan','teknisi')),
  penerima       VARCHAR(255) NOT NULL,
  kanal          VARCHAR(255) NOT NULL,
  untuk_tanggal  DATE NOT NULL,
  pesan TEXT NOT NULL,
  status         VARCHAR(255) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  percobaan      INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  waktu_kirim    DATETIME(3),
  created_at     DATETIME(3) NOT NULL DEFAULT now(),
  UNIQUE (booking_id, target, untuk_tanggal),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  unit_ac_id INTEGER,
  FOREIGN KEY (unit_ac_id) REFERENCES ac_units(id) ON DELETE SET NULL,
  tipe_reminder VARCHAR(30) DEFAULT 'jadwal_h_minus_1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_tickets (
  id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_id  INTEGER,
  pesan TEXT NOT NULL,
  status      VARCHAR(255) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  sumber      VARCHAR(255) NOT NULL DEFAULT 'chatbot',
  created_at  DATETIME(3) NOT NULL DEFAULT now(),
  closed_at   DATETIME(3),
  kontak VARCHAR(255),
  kode_referensi VARCHAR(255) UNIQUE,
  severity VARCHAR(20) NOT NULL DEFAULT 'normal',
  CHECK (sumber IN ('chatbot','email','telepon','web','admin','whatsapp_ai')),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_order_photos (
  id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_id  INTEGER NOT NULL,
  tipe        VARCHAR(255) NOT NULL CHECK (tipe IN ('before', 'after')),
  url_foto    VARCHAR(255) NOT NULL,
  catatan TEXT,
  waktu       DATETIME(3) NOT NULL DEFAULT now(),
  file_name VARCHAR(255),
  mime_type VARCHAR(255),
  ukuran_byte INTEGER,
  diunggah_oleh VARCHAR(255),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_order_checklists (
  id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_id  INTEGER NOT NULL,
  task        VARCHAR(255) NOT NULL,
  is_checked  BOOLEAN NOT NULL DEFAULT FALSE,
  waktu       DATETIME(3) NOT NULL DEFAULT now(),
  status VARCHAR(255) NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending','completed','skipped')),
  wajib BOOLEAN NOT NULL DEFAULT FALSE,
  alasan_skip VARCHAR(255),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  target_role VARCHAR(255),
  target_id   INTEGER,
  title       VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  type        VARCHAR(255) NOT NULL,
  reference_id INTEGER,
  created_at  DATETIME(3) NOT NULL DEFAULT now(),
  booking_id INTEGER,
  tautan VARCHAR(255),
  dedup_key VARCHAR(255),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  item_id     INTEGER NOT NULL,
  jenis VARCHAR(30) NOT NULL CHECK (jenis IN ('in','out','adjustment','usage')),
  jumlah      NUMERIC(10,2) NOT NULL,
  catatan TEXT,
  oleh        VARCHAR(255) NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT now(),
  booking_id INTEGER,
  stok_sebelum NUMERIC(10,2),
  stok_sesudah NUMERIC(10,2),
  FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_orders (
  booking_id   INTEGER PRIMARY KEY,
  diagnosis TEXT,
  rekomendasi TEXT,
  catatan TEXT,
  updated_by   VARCHAR(255),
  updated_at   DATETIME(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schedule_history (
  id               INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_id       INTEGER NOT NULL,
  jadwal_lama      DATETIME(3),
  jadwal_baru      DATETIME(3),
  teknisi_lama_id  INTEGER,
  teknisi_baru_id  INTEGER,
  alasan           VARCHAR(255) NOT NULL,
  diubah_oleh      VARCHAR(255) NOT NULL,
  waktu            DATETIME(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (teknisi_lama_id) REFERENCES technicians(id),
  FOREIGN KEY (teknisi_baru_id) REFERENCES technicians(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_reports (
  booking_id  INTEGER PRIMARY KEY,
  data        JSON NOT NULL,
  dibuat_pada DATETIME(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_items (
  id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_id   INTEGER NOT NULL,
  layanan_id   INTEGER NOT NULL,
  jumlah_unit  INTEGER NOT NULL DEFAULT 1 CHECK (jumlah_unit > 0),
  harga_satuan INTEGER NOT NULL CHECK (harga_satuan >= 0),
  subtotal     INTEGER NOT NULL CHECK (subtotal >= 0),
  catatan TEXT,
  created_at   DATETIME(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (layanan_id) REFERENCES service_catalog(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warranty_claims (
  id                    INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kode_klaim            VARCHAR(255) UNIQUE NOT NULL,
  booking_id            INTEGER NOT NULL,
  customer_id           INTEGER,
  ac_unit_id            INTEGER,
  keluhan TEXT NOT NULL,
  rating                INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_komentar TEXT,
  status                VARCHAR(255) NOT NULL DEFAULT 'diajukan'
                        CHECK (status IN ('diajukan', 'dijadwalkan', 'diperiksa', 'disetujui', 'ditolak', 'selesai')),
  jadwal_pemeriksaan    DATETIME(3),
  teknisi_pemeriksa_id  INTEGER,
  catatan_pemeriksaan TEXT,
  alasan_penolakan TEXT,
  is_gratis             BOOLEAN NOT NULL DEFAULT TRUE,
  biaya_tambahan        NUMERIC(12,2) DEFAULT 0,
  booking_berbayar_id   INTEGER,
  created_at            DATETIME(3) NOT NULL DEFAULT now(),
  updated_at            DATETIME(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (ac_unit_id) REFERENCES ac_units(id) ON DELETE SET NULL,
  FOREIGN KEY (teknisi_pemeriksa_id) REFERENCES technicians(id) ON DELETE SET NULL,
  FOREIGN KEY (booking_berbayar_id) REFERENCES bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS whatsapp_invoice_logs (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_id INTEGER NOT NULL,
  tipe_invoice VARCHAR(20) NOT NULL DEFAULT 'initial' CHECK (tipe_invoice IN ('initial', 'final')),
  nomor_whatsapp VARCHAR(30) NOT NULL,
  pesan TEXT NOT NULL,
  tautan_invoice VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  percobaan INTEGER NOT NULL DEFAULT 0,
  max_percobaan INTEGER NOT NULL DEFAULT 3,
  error_terakhir TEXT,
  waktu_kirim DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT now(),
  updated_at DATETIME(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sender VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  message TEXT NOT NULL,
  intent VARCHAR(50),
  entities JSON DEFAULT '{}',
  is_handoff BOOLEAN DEFAULT false,
  handoff_ticket_id INTEGER,
  created_at DATETIME(3) NOT NULL DEFAULT now(),
  FOREIGN KEY (handoff_ticket_id) REFERENCES complaint_tickets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- MySQL 8 / MariaDB 10.4 baseline. All DATETIME values are UTC.

































































ALTER TABLE bookings ADD COLUMN IF NOT EXISTS skema_pembayaran VARCHAR(30) DEFAULT 'pay_after_service';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS metode_pembayaran VARCHAR(30) DEFAULT 'transfer';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bukti_pembayaran_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status_verifikasi_pembayaran VARCHAR(30) DEFAULT 'belum_ada_bukti';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS catatan_verifikasi TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS verified_by INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS verified_at DATETIME(3);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_dibayar NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_nominal NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT 'none';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_catatan TEXT;
ALTER TABLE reminder_log ADD COLUMN IF NOT EXISTS unit_ac_id INTEGER;
ALTER TABLE reminder_log ADD COLUMN IF NOT EXISTS tipe_reminder VARCHAR(30) DEFAULT 'jadwal_h_minus_1';

CREATE INDEX idx_bookings_jadwal ON bookings (jadwal_mulai);

CREATE INDEX idx_bookings_status ON bookings (status);

CREATE INDEX idx_bookings_teknisi ON bookings (teknisi_id, jadwal_mulai);

CREATE INDEX idx_reminder_status ON reminder_log (status);

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings (customer_id, jadwal_mulai DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_kontak ON bookings (kontak);

CREATE INDEX IF NOT EXISTS idx_bookings_unit ON bookings (ac_unit_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_customer ON users (customer_id);

CREATE INDEX IF NOT EXISTS idx_checklist_booking ON work_order_checklists (booking_id);

CREATE INDEX IF NOT EXISTS idx_photos_booking ON work_order_photos (booking_id);

CREATE INDEX IF NOT EXISTS idx_schedule_history_booking ON schedule_history (booking_id);

CREATE INDEX IF NOT EXISTS idx_inv_adj_item ON inventory_adjustments (item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inv_usage_item ON inventory_usage (item_id, waktu DESC);

CREATE INDEX IF NOT EXISTS idx_inv_usage_booking ON inventory_usage (booking_id);

CREATE INDEX IF NOT EXISTS idx_notif_target ON notifications (target_role, target_id, is_read, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_dedup ON notifications (dedup_key);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action);

CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback (rating);

CREATE INDEX IF NOT EXISTS idx_ac_units_customer ON ac_units (customer_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_idempotency ON bookings (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_bookings_idempotency ON bookings (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_bookings_kode ON bookings (kode_booking);

CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_log_booking ON status_log (booking_id, waktu DESC);

CREATE INDEX IF NOT EXISTS idx_reminder_booking ON reminder_log (booking_id);

CREATE INDEX IF NOT EXISTS idx_reminder_target_date ON reminder_log (target, untuk_tanggal);

CREATE INDEX IF NOT EXISTS idx_reminder_status ON reminder_log (status);

CREATE INDEX IF NOT EXISTS idx_reminder_created ON reminder_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_jumlah_unit ON bookings (jumlah_unit);

CREATE INDEX IF NOT EXISTS idx_bookings_status_pembayaran ON bookings (status_pembayaran);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_items_layanan ON booking_items(layanan_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens (token_hash);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_feedback_token ON bookings (feedback_token);

CREATE INDEX IF NOT EXISTS idx_claims_booking ON warranty_claims (booking_id);

CREATE INDEX IF NOT EXISTS idx_claims_customer ON warranty_claims (customer_id);

CREATE INDEX IF NOT EXISTS idx_claims_status ON warranty_claims (status);

CREATE INDEX IF NOT EXISTS idx_bookings_verifikasi_bayar ON bookings(status_verifikasi_pembayaran);

CREATE INDEX IF NOT EXISTS idx_bookings_skema_bayar ON bookings(skema_pembayaran);

CREATE INDEX IF NOT EXISTS idx_whatsapp_invoice_status ON whatsapp_invoice_logs(status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_invoice_booking ON whatsapp_invoice_logs(booking_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_sender ON whatsapp_conversations(sender, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_handoff ON whatsapp_conversations(is_handoff);

CREATE INDEX IF NOT EXISTS idx_whatsapp_otps_kontak_exp ON whatsapp_otps (kontak, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_otps_active ON whatsapp_otps (kontak, is_used, expires_at);



INSERT INTO settings (setting_key, value)
VALUES (
  'payment_schemes',
  '{"full_upfront":{"enabled":true,"label":"Bayar Lunas di Awal","deskripsi":"Pelunasan penuh saat booking dibuat"},"dp_50":{"enabled":true,"label":"Uang Muka (DP 50%)","deskripsi":"Bayar 50% di awal, sisa 50% setelah pekerjaan selesai"},"pay_after_service":{"enabled":true,"label":"Bayar Setelah Selesai","deskripsi":"Pelunasan setelah pekerjaan selesai diservis"}}'
) ON DUPLICATE KEY UPDATE setting_key=setting_key;

INSERT INTO settings (setting_key, value)
VALUES (
  'payment_methods',
  '{"transfer":{"enabled":true,"label":"Transfer Bank","instruksi":"Transfer ke rekening resmi Nara AC dan upload bukti bayar."},"qris":{"enabled":true,"label":"QRIS","instruksi":"Scan QRIS resmi Nara AC dengan aplikasi m-banking atau e-wallet."},"cash":{"enabled":true,"label":"Tunai","instruksi":"Bayar tunai langsung kepada teknisi di lokasi servis."}}'
) ON DUPLICATE KEY UPDATE setting_key=setting_key;

INSERT INTO settings (setting_key, value)
VALUES (
  'ai_whatsapp_config',
  '{
    "enabled": true,
    "admin_whatsapp": "081385293137",
    "business_name": "CV. NARA TEKNINDOTAMA",
    "handoff_keywords": ["admin", "cs", "manusia", "oper", "operator", "orang", "komplain", "darurat", "hubungi admin"],
    "max_retries": 3,
    "auto_retry_interval_minutes": 15
  }'
) ON DUPLICATE KEY UPDATE setting_key=setting_key;

INSERT INTO scheduling_locks (name) VALUES ('booking-slots') ON DUPLICATE KEY UPDATE name=name;
