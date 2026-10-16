# Kamus Data Data Science NARA AC

Pipeline forecasting memakai data agregat dari MySQL `nara_ac`. Zona waktu bisnis adalah `Asia/Jakarta`. Data pelanggan yang dapat mengidentifikasi individu tidak dipakai sebagai fitur model.

## Tabel sumber

| Tabel | Grain | Kolom yang dipakai | Arti | Catatan |
| --- | --- | --- | --- | --- |
| `bookings` | Satu kunjungan servis | `id`, `kode_booking`, `jadwal_mulai`, `status`, `jumlah_unit`, `layanan_id`, `teknisi_id`, `is_synthetic` | Fakta permintaan dan jadwal servis | `jadwal_mulai` disimpan UTC dan dikonversi ke WIB saat agregasi |
| `booking_items` | Satu layanan dalam booking | `booking_id`, `jumlah_unit`, `harga_satuan`, `subtotal` | Detail unit dan nilai layanan | `subtotal = jumlah_unit × harga_satuan` |
| `service_catalog` | Satu jenis layanan | `id`, `kode`, `nama_layanan`, `kategori`, `harga` | Master layanan | Dipakai untuk analisis kategori, bukan identitas pelanggan |
| `technicians` | Satu teknisi | `id`, `nama`, `aktif`, `is_synthetic` | Kapasitas dan beban kerja | Nama hanya untuk tampilan agregat |
| `inventory` | Satu item stok | `id`, `nama`, `stok`, `satuan`, `min_stok` | Posisi stok saat ini | Tidak dianggap histori stok |
| `inventory_usage` | Satu pemakaian item | `booking_id`, `item_id`, `jumlah`, `waktu` | Konsumsi material per booking | Harga sumber tidak menjadi kolom terpisah |
| `prediction_output` | Satu periode prediksi dalam satu batch | `target`, `periode`, `nilai_prediksi`, batas, versi, metrik, waktu | Hasil yang dikonsumsi backend | Semua baris satu batch memiliki `dibuat_pada` sama |
| `ds_dashboard_snapshots` | Satu laporan, periode, dan kombinasi filter | `report_key`, `period_months`, `service_id`, `customer_id`, `payload`, `generated_at` | Hasil olahan DS yang dikonsumsi backend | Backend tidak menghitung ulang agregat laporan dari tabel transaksi |

## Dataset harian untuk forecasting

| Kolom | Tipe | Satuan | Definisi |
| --- | --- | --- | --- |
| `tanggal` | date | hari WIB | Tanggal jadwal servis setelah konversi UTC+7 |
| `jumlah_booking` | integer | booking | Booking selain `cancelled` pada tanggal tersebut |
| `jumlah_unit` | integer | unit AC | Total unit dari booking pada tanggal tersebut |
| `jumlah_selesai` | integer | booking | Booking dengan status `done` |
| `jumlah_batal` | integer | booking | Booking berstatus `cancelled`; saat ini tidak masuk target |
| `omzet` | integer | rupiah | Jumlah `booking_items.subtotal` |
| `booking_sintetis` | integer | booking | Booking dengan `is_synthetic=true` |
| `booking_nyata` | integer | booking | Booking dengan `is_synthetic=false` |

Hari tanpa booking dimasukkan dengan nilai nol agar fitur lag dan rolling tidak melewati tanggal.

## Target dan fitur model

- Target: `jumlah_booking_harian`.
- Horizon awal: 7 sampai 30 hari.
- Fitur kalender: hari dalam minggu, tanggal, bulan, hari ke-n, dan akhir pekan.
- Fitur historis: lag 1 dan 7 hari serta rolling mean 7 dan 28 hari.
- Fitur hanya memakai informasi yang sudah tersedia sebelum tanggal prediksi.

## Aturan kualitas

- `tanggal` unik, berurutan, dan tidak terputus.
- Nilai jumlah dan omzet tidak boleh negatif.
- Training membutuhkan minimal 90 hari.
- Data pada tanggal `as_of` dan setelahnya tidak masuk training.
- Train/test dipisahkan berdasarkan waktu.
- Jika ada data sample, metadata dan dashboard harus menampilkan `is_synthetic=true`.

## Kontrak dashboard laporan bisnis

Pipeline `business_report_pipeline.py` membaca tabel transaksi MySQL, memvalidasi dan mengolahnya, lalu menulis hasil siap tampil ke `ds_dashboard_snapshots`. Backend menyediakan hasil tersebut secara read-only melalui `GET /api/v1/admin/dashboard/reports?months=12`; backend tidak menghitung ulang agregat bisnis. Parameter `months` menerima `3`, `6`, atau `12`. Laporan teknisi dan booking terjadwal dapat difilter secara terpisah berdasarkan layanan dan customer. Seluruh pengelompokan tanggal menggunakan WIB dan hasil kosong tetap diisi nol agar deret bulanan tidak terputus.

| Output | Grain | Ukuran utama | Aturan inklusi |
| --- | --- | --- | --- |
| `topCustomers` | Satu pelanggan | `jumlah_transaksi`, `jumlah_unit`, `revenue` | Semua booking selain `cancelled`; diurutkan menurut jumlah transaksi, maksimum 10 |
| `topServices` | Satu layanan | `jumlah_booking`, `jumlah_unit`, `revenue` | Semua booking selain `cancelled`; diurutkan menurut jumlah booking, maksimum 10 |
| `topTechnicians` | Satu teknisi | `total_pengerjaan`, `selesai`, `aktif`, `tertunda` | Booking yang sudah ditugaskan selain `cancelled`; maksimum 10 |
| `revenueMonthly` | Satu bulan kalender WIB | `revenue` | Jumlah `booking_items.subtotal` untuk booking berstatus `done`, berdasarkan bulan jadwal |
| `scheduledBookingsMonthly` | Satu bulan kalender WIB | `jumlah_booking`, `pelanggan_unik`, `jumlah_unit` | Booking selain `cancelled`, berdasarkan bulan `jadwal_mulai` |

`sumber_data.jenis` bernilai `snapshot_ds_mysql`. `dibuat_pada` dan `source_max_updated_at` dipakai untuk memeriksa kesegaran hasil pipeline. Dashboard tidak menyediakan filter klasifikasi data nyata/sintetis. Ranking volume tidak boleh dipakai sendiri sebagai ukuran kualitas teknisi atau layanan.

## Batasan dataset awal

Dataset awal berasal dari data sample Excel. Pola jumlah transaksi dibuat untuk demonstrasi dan belum membuktikan pola permintaan pelanggan sebenarnya. Prediksi saat ini cocok untuk validasi integrasi sistem dan eksperimen model, belum untuk keputusan operasional produksi tanpa data nyata tambahan.
