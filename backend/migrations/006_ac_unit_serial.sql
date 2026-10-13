-- 006: nomor seri unit AC (sebelumnya terlewat di 002)
ALTER TABLE ac_units ADD COLUMN IF NOT EXISTS nomor_seri TEXT;
CREATE INDEX IF NOT EXISTS idx_ac_units_customer ON ac_units (customer_id);
