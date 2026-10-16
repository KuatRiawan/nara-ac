-- Migration 017: AI WhatsApp CS, Human Handoff, Availability Check & Maintenance Reminders (BR-44 s/d BR-47)

-- 1. Tabel percakapan WhatsApp AI & riwayat eskalasi ke admin (BR-44, BR-46)
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id SERIAL PRIMARY KEY,
  sender VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  message TEXT NOT NULL,
  intent VARCHAR(50),
  entities JSONB DEFAULT '{}'::jsonb,
  is_handoff BOOLEAN DEFAULT false,
  handoff_ticket_id INTEGER REFERENCES complaint_tickets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_sender ON whatsapp_conversations(sender, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_handoff ON whatsapp_conversations(is_handoff);

-- 2. Pastikan reminder_log mendukung kanal whatsapp dan link unit_ac_id (BR-47, BR-18)
ALTER TABLE reminder_log
  ADD COLUMN IF NOT EXISTS unit_ac_id INTEGER REFERENCES ac_units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipe_reminder VARCHAR(30) DEFAULT 'jadwal_h_minus_1';

-- 2b. Perluas sumber complaint_tickets untuk mendukung whatsapp_ai (BR-46)
ALTER TABLE complaint_tickets DROP CONSTRAINT IF EXISTS complaint_tickets_sumber_check;
ALTER TABLE complaint_tickets ADD CONSTRAINT complaint_tickets_sumber_check 
  CHECK (sumber IN ('chatbot', 'email', 'telepon', 'web', 'admin', 'whatsapp_ai'));

-- 3. Inisialisasi konfigurasi AI WhatsApp CS (BR-44, BR-45, BR-46, BR-47)
INSERT INTO settings (key, value)
VALUES (
  'ai_whatsapp_config',
  '{
    "enabled": true,
    "admin_whatsapp": "081385293137",
    "business_name": "CV. NARA TEKNINDOTAMA",
    "handoff_keywords": ["admin", "cs", "manusia", "oper", "operator", "orang", "komplain", "darurat", "hubungi admin"],
    "max_retries": 3,
    "auto_retry_interval_minutes": 15
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;
