-- 011_add_user_kontak.sql
-- Tambah kolom kontak pada tabel users untuk nomor WhatsApp/telepon admin dan pengguna
ALTER TABLE users ADD COLUMN IF NOT EXISTS kontak TEXT;
