-- 005_platform_upgrade.sql — perbaikan lifecycle status, role customer, work order, laporan servis,
-- riwayat jadwal, pergerakan inventory, notifikasi. Backward-compatible (tidak menghapus data).

-- 1. Status lifecycle penuh (migrasi 004 sebelumnya menghapus delayed/rescheduled sehingga fitur delay/reschedule gagal)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('scheduled','on process','done','cancelled','rescheduled','delayed'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS alasan_tunda TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS mulai_aktual TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS selesai_aktual TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings (customer_id, jadwal_mulai DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_kontak ON bookings (kontak);
CREATE INDEX IF NOT EXISTS idx_bookings_unit ON bookings (ac_unit_id);

-- 2. Role customer (akun pelanggan terhubung ke customers)
ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','technician','customer'));
ALTER TABLE users ADD CONSTRAINT users_role_link_check CHECK (
  (role = 'technician' AND technician_id IS NOT NULL AND customer_id IS NULL) OR
  (role = 'customer'   AND customer_id IS NOT NULL AND technician_id IS NULL) OR
  (role = 'admin'      AND technician_id IS NULL AND customer_id IS NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_customer ON users (customer_id) WHERE customer_id IS NOT NULL;

-- 3. Katalog layanan: interval maintenance & bahan yang dibutuhkan
ALTER TABLE service_catalog ADD COLUMN IF NOT EXISTS interval_maintenance_hari INTEGER CHECK (interval_maintenance_hari IS NULL OR interval_maintenance_hari > 0);
ALTER TABLE service_catalog ADD COLUMN IF NOT EXISTS bahan_dibutuhkan JSONB NOT NULL DEFAULT '[]';

-- 4. Work order (satu per booking) — diagnosis, rekomendasi, catatan
CREATE TABLE IF NOT EXISTS work_orders (
  booking_id   INTEGER PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  diagnosis    TEXT,
  rekomendasi  TEXT,
  catatan      TEXT,
  updated_by   TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Checklist: status pending/completed/skipped + wajib
ALTER TABLE work_order_checklists ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending','completed','skipped'));
ALTER TABLE work_order_checklists ADD COLUMN IF NOT EXISTS wajib BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE work_order_checklists ADD COLUMN IF NOT EXISTS alasan_skip TEXT;
UPDATE work_order_checklists SET status = 'completed' WHERE is_checked AND status = 'pending';
CREATE INDEX IF NOT EXISTS idx_checklist_booking ON work_order_checklists (booking_id);

-- 6. Foto: berkas nyata di storage lokal (bukan sekadar URL)
ALTER TABLE work_order_photos ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE work_order_photos ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE work_order_photos ADD COLUMN IF NOT EXISTS ukuran_byte INTEGER;
ALTER TABLE work_order_photos ADD COLUMN IF NOT EXISTS diunggah_oleh TEXT;
CREATE INDEX IF NOT EXISTS idx_photos_booking ON work_order_photos (booking_id);

-- 7. Riwayat jadwal (reschedule / ganti teknisi)
CREATE TABLE IF NOT EXISTS schedule_history (
  id               SERIAL PRIMARY KEY,
  booking_id       INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  jadwal_lama      TIMESTAMPTZ,
  jadwal_baru      TIMESTAMPTZ,
  teknisi_lama_id  INTEGER REFERENCES technicians(id),
  teknisi_baru_id  INTEGER REFERENCES technicians(id),
  alasan           TEXT NOT NULL,
  diubah_oleh      TEXT NOT NULL,
  waktu            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_schedule_history_booking ON schedule_history (booking_id);

-- 8. Laporan servis (snapshot terstruktur saat pekerjaan selesai)
CREATE TABLE IF NOT EXISTS service_reports (
  booking_id  INTEGER PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  data        JSONB NOT NULL,
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Inventory: pergerakan stok teraudit (usage ikut tercatat)
ALTER TABLE inventory_adjustments DROP CONSTRAINT IF EXISTS inventory_adjustments_jenis_check;
ALTER TABLE inventory_adjustments ADD CONSTRAINT inventory_adjustments_jenis_check CHECK (jenis IN ('in','out','adjustment','usage'));
ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL;
ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS stok_sebelum NUMERIC(10,2);
ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS stok_sesudah NUMERIC(10,2);
CREATE INDEX IF NOT EXISTS idx_inv_adj_item ON inventory_adjustments (item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_usage_item ON inventory_usage (item_id, waktu DESC);
CREATE INDEX IF NOT EXISTS idx_inv_usage_booking ON inventory_usage (booking_id);

-- 10. Notifikasi: target_role + target_id (customers.id / technicians.id; NULL = semua admin)
CREATE INDEX IF NOT EXISTS idx_notif_target ON notifications (target_role, target_id, is_read, created_at DESC);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tautan TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedup_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_dedup ON notifications (dedup_key) WHERE dedup_key IS NOT NULL;

-- 11. Audit log: before/after + index
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS sebelum JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS sesudah JSONB;
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action);

-- 12. Keluhan: ticket lebih informatif
ALTER TABLE complaint_tickets ADD COLUMN IF NOT EXISTS kontak TEXT;
ALTER TABLE complaint_tickets ADD COLUMN IF NOT EXISTS kode_referensi TEXT UNIQUE;

-- 13. Feedback index
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback (rating);
