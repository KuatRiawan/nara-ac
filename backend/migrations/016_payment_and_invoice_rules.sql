-- Migration 016: Payment Schemes, Verification, Invoicing, Refunds, & WhatsApp Invoice Logs (BR-34 s/d BR-43)

-- 1. Tambah kolom pembayaran & verifikasi pada tabel bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS skema_pembayaran VARCHAR(30) DEFAULT 'pay_after_service',
  ADD COLUMN IF NOT EXISTS metode_pembayaran VARCHAR(30) DEFAULT 'transfer',
  ADD COLUMN IF NOT EXISTS bukti_pembayaran_url TEXT,
  ADD COLUMN IF NOT EXISTS status_verifikasi_pembayaran VARCHAR(30) DEFAULT 'belum_ada_bukti',
  ADD COLUMN IF NOT EXISTS catatan_verifikasi TEXT,
  ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_dibayar NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_nominal NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refund_catatan TEXT;

-- Index untuk memudahkan filter verifikasi bukti transfer pembayaran
CREATE INDEX IF NOT EXISTS idx_bookings_verifikasi_bayar ON bookings(status_verifikasi_pembayaran);
CREATE INDEX IF NOT EXISTS idx_bookings_skema_bayar ON bookings(skema_pembayaran);

-- 2. Tabel antrean & log pengiriman WhatsApp Invoice (BR-42, BR-43)
CREATE TABLE IF NOT EXISTS whatsapp_invoice_logs (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tipe_invoice VARCHAR(20) NOT NULL DEFAULT 'initial' CHECK (tipe_invoice IN ('initial', 'final')),
  nomor_whatsapp VARCHAR(30) NOT NULL,
  pesan TEXT NOT NULL,
  tautan_invoice TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  percobaan INTEGER NOT NULL DEFAULT 0,
  max_percobaan INTEGER NOT NULL DEFAULT 3,
  error_terakhir TEXT,
  waktu_kirim TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_invoice_status ON whatsapp_invoice_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_invoice_booking ON whatsapp_invoice_logs(booking_id);

-- 3. Inisialisasi konfigurasi skema pembayaran & rekening bank jika belum ada
INSERT INTO settings (key, value)
VALUES (
  'payment_schemes',
  '{"full_upfront":{"enabled":true,"label":"Bayar Lunas di Awal","deskripsi":"Pelunasan penuh saat booking dibuat"},"dp_50":{"enabled":true,"label":"Uang Muka (DP 50%)","deskripsi":"Bayar 50% di awal, sisa 50% setelah pekerjaan selesai"},"pay_after_service":{"enabled":true,"label":"Bayar Setelah Selesai","deskripsi":"Pelunasan setelah pekerjaan selesai diservis"}}'::jsonb
) ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value)
VALUES (
  'payment_methods',
  '{"transfer":{"enabled":true,"label":"Transfer Bank","instruksi":"Transfer ke rekening resmi Nara AC dan upload bukti bayar."},"qris":{"enabled":true,"label":"QRIS","instruksi":"Scan QRIS resmi Nara AC dengan aplikasi m-banking atau e-wallet."},"cash":{"enabled":true,"label":"Tunai","instruksi":"Bayar tunai langsung kepada teknisi di lokasi servis."}}'::jsonb
) ON CONFLICT (key) DO NOTHING;
