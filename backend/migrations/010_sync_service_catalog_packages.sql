-- 010_sync_service_catalog_packages.sql
-- Sinkronisasi layanan paket Core (Deep Clean) dan Core + Isi Freon agar seragam dengan Landing Page

INSERT INTO service_catalog (kode, nama_layanan, kategori, deskripsi, harga, durasi_menit)
VALUES 
('SRV-CUCI-CORE', 'Cuci AC Core (Deep Clean)', 'cuci', 'Bongkar total rotor blower fan & talang air, chemical wash, & sterilisasi mendalam', 120000, 90),
('SRV-CUCI-FREON', 'Paket Core + Isi Freon', 'cuci', 'Deep clean bongkar total plus isi freon murni presisi pabrikan R32/R410A', 220000, 105)
ON CONFLICT (kode) DO UPDATE SET
  nama_layanan = EXCLUDED.nama_layanan,
  harga = EXCLUDED.harga,
  durasi_menit = EXCLUDED.durasi_menit,
  deskripsi = EXCLUDED.deskripsi;
