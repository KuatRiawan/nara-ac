-- 018_whatsapp_auth_otp.sql
-- Tabel untuk menyimpan kode OTP login WhatsApp Pelanggan / Member

CREATE TABLE IF NOT EXISTS whatsapp_otps (
  id          SERIAL PRIMARY KEY,
  kontak      TEXT NOT NULL,
  otp_hash    TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  is_used     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_otps_kontak_exp ON whatsapp_otps (kontak, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_otps_active ON whatsapp_otps (kontak, is_used, expires_at);
