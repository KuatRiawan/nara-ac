# Rencana Kolaborasi Full-Stack dan Data Science

Dokumen ini menerjemahkan checklist Asah 2026 menjadi urutan kerja untuk proyek NARA AC. Nilai checkbox pada workbook masih `false`, sehingga workbook dipakai sebagai daftar persyaratan, bukan bukti bahwa suatu pekerjaan sudah atau belum selesai.

## Sasaran bersama

Masalah bisnis yang dipilih adalah perencanaan kapasitas servis AC. Pemilik usaha perlu mengetahui pola permintaan, perkiraan booking harian, jumlah teknisi yang perlu disiapkan, dan material yang sering terpakai.

Hasil minimum yang disepakati:

1. Analitik aktual dari transaksi MySQL.
2. Prediksi jumlah booking untuk 7 sampai 30 hari berikutnya.
3. Rekomendasi kebutuhan teknisi berdasarkan kapasitas harian yang disepakati.
4. Hasil prediksi tersedia melalui API backend dan tampil di halaman admin.
5. Dashboard menjelaskan sumber data, tanggal pembaruan, versi model, metrik, dan keterbatasan data.

Pertanyaan bisnis awal:

- Bagaimana tren booking harian dan bulanan?
- Layanan apa yang paling banyak diminta?
- Pada hari apa permintaan paling tinggi?
- Berapa booking yang diperkirakan dalam 7 sampai 30 hari ke depan?
- Berapa teknisi yang perlu disiapkan per hari?
- Material apa yang paling sering digunakan?

## Kondisi proyek saat ini

- MySQL `nara_ac` sudah menjadi sumber data aplikasi.
- Dataset awal berisi 500 pelanggan, 2.500 transaksi, 10 layanan, 6 teknisi, dan 3.795 pemakaian material. Data tersebut adalah data sample dan harus tetap diberi label sintetis.
- `data-science/dashboard.py` sudah membaca MySQL untuk analitik operasional.
- `data-science/demand_pipeline.py` sudah mengekstrak transaksi MySQL, membangun dataset harian, membandingkan baseline dengan model kandidat, dan memublikasikan hasil ke `prediction_output`.
- Tabel `prediction_output` sudah tersedia sebagai tempat publikasi hasil prediksi.
- Backend sudah menyediakan `GET /api/v1/predictions/latest`.
- Frontend admin sudah mempunyai halaman analitik yang mengambil hasil `/predictions/latest` serta modal Streamlit.
- Dashboard utama sudah mengambil lima agregat deskriptif dari `GET /api/v1/admin/dashboard/reports` dan menampilkan sumber data serta definisi metrik.
- Perintah Streamlit menggunakan `streamlit run dashboard.py --server.port 8501`.

## Arsitektur kolaborasi yang disarankan

```text
MySQL nara_ac
    │
    ├── view/dataset harian read-only
    │       ↓
    │   validasi dan data wrangling DS
    │       ↓
    │   feature engineering
    │       ↓
    │   training dan evaluasi model
    │       ↓
    │   artefak model + laporan metrik
    │       ↓
    └── prediction_output
            ↓
        Express API
            ↓
        React Admin Analytics

MySQL ──read-only──> Streamlit Dashboard
```

Untuk MVP, hasil prediksi dipublikasikan secara batch ke `prediction_output`. Pendekatan ini memakai komponen yang sudah ada dan tidak memerlukan layanan prediksi baru. FastAPI baru diperlukan jika tim membutuhkan prediksi real-time berdasarkan parameter pengguna.

## Langkah kerja DS dari dataset yang tersedia

### 1. Sepakati unit analisis dan target

Gunakan satu baris per tanggal sebagai unit analisis utama.

- Target utama: `jumlah_booking` per hari.
- Target tambahan opsional: jumlah unit AC, omzet harian, atau pemakaian material per hari.
- Zona waktu resmi: `Asia/Jakarta`.
- Booking `cancelled` harus diputuskan sejak awal: dikeluarkan dari demand aktual atau dilaporkan sebagai kategori terpisah.
- Data dengan `is_synthetic=true` harus selalu diberi label sample pada laporan dan dashboard.

Keluaran tahap ini adalah definisi target tertulis yang disetujui DS dan FS.

### 2. Buat kamus data

DS membuat `data-science/DATA_DICTIONARY.md` dengan kolom berikut:

| Elemen | Isi minimum |
| --- | --- |
| Tabel dan kolom | Nama teknis dari MySQL |
| Definisi | Makna bisnis |
| Grain | Satu baris mewakili apa |
| Tipe dan satuan | Tanggal, jumlah, rupiah, kilogram, dan lain-lain |
| Nilai kosong | Boleh kosong atau wajib |
| Sumber | Aplikasi, Excel sample, atau sumber publik |
| Status data | Nyata atau sintetis |
| Pemilik | DS atau FS |

Tabel utama yang perlu dipahami adalah `bookings`, `booking_items`, `service_catalog`, `technicians`, `inventory`, dan `inventory_usage`.

Nama, alamat, dan nomor telepon pelanggan tidak diperlukan untuk forecasting. DS sebaiknya hanya memakai data agregat agar data pribadi tidak masuk ke dataset pelatihan.

### 3. Buat ekstraksi data yang dapat diulang

FS dan DS menyepakati query atau database view read-only, misalnya `ds_daily_demand`. View tersebut minimal menghasilkan:

```text
tanggal
jumlah_booking
jumlah_unit
jumlah_selesai
jumlah_batal
omzet
jumlah_teknisi_aktif
is_synthetic
```

DS tidak boleh mengandalkan ekspor manual sebagai jalur produksi. Ekspor CSV boleh dipakai untuk audit atau snapshot eksperimen, tetapi sumber utama tetap MySQL.

### 4. Audit kualitas data

DS menjalankan pemeriksaan berikut dan menyimpan hasilnya dalam laporan:

- Duplikasi `kode_booking`.
- Foreign key yang tidak memiliki master pelanggan, layanan, atau teknisi.
- Tanggal kosong atau di luar periode yang dijelaskan.
- Nilai `jumlah_unit` di luar batas.
- Subtotal yang tidak sama dengan `jumlah_unit × harga_satuan`.
- Status di luar daftar yang diizinkan.
- Proporsi booking sintetis dan nyata.
- Hari tanpa transaksi.
- Distribusi jumlah booking per hari, layanan, teknisi, kota, dan status.
- Outlier dan alasan apakah nilai tersebut dibuang, dibatasi, atau dipertahankan.

Karena dataset sample mempunyai jumlah transaksi yang dibuat secara terstruktur, DS harus menjelaskan bahwa pola tersebut belum mewakili permintaan produksi secara penuh.

### 5. Lakukan data wrangling

Urutan yang disarankan:

1. Ambil data dari MySQL.
2. Ubah timestamp ke `Asia/Jakarta`.
3. Buat kalender harian lengkap agar hari tanpa booking tetap bernilai nol.
4. Gabungkan booking dengan detail layanan dan pemakaian material.
5. Tangani nilai kosong secara eksplisit.
6. Hilangkan duplikasi yang telah dibuktikan sebagai duplikasi.
7. Simpan dataset siap model dengan versi dan waktu ekstraksi.

### 6. Lakukan eksplorasi dan jawab pertanyaan bisnis

Analisis minimum:

- Tren jumlah booking per hari dan bulan.
- Distribusi status booking.
- Layanan terpopuler dan kontribusi omzet.
- Beban kerja per teknisi.
- Pemakaian material per layanan.
- Hari dalam minggu dengan permintaan tertinggi.

Setiap grafik harus diikuti satu temuan dan satu tindakan yang dapat dilakukan pemilik usaha.

### 7. Bangun fitur model

Mulai dengan fitur yang benar-benar tersedia:

- `dayofweek`
- `dayofmonth`
- `month`
- `dayofyear`
- `is_weekend`
- lag permintaan 1, 7, 14, dan 28 hari
- rolling mean 7 dan 28 hari

Jangan memakai suhu sintetis sebagai fitur untuk model berbasis transaksi aktual. Jika suhu digunakan, ambil dari API cuaca yang dapat dipertanggungjawabkan, simpan sumbernya, dan pastikan nilai cuaca yang dipakai pada prediksi memang tersedia untuk masa depan.

Fitur yang menggunakan data masa depan atau hasil akhir booking tidak boleh masuk ke input training karena menyebabkan data leakage.

### 8. Pisahkan data berdasarkan waktu

Jangan melakukan random split untuk forecasting.

Untuk data Januari sampai Oktober 2026, pembagian awal yang mudah dijelaskan adalah:

- Train: Januari sampai Agustus.
- Validation: September.
- Test final: Oktober.

Jika jumlah hari belum cukup, gunakan `TimeSeriesSplit` dan jelaskan keterbatasannya. Test final hanya digunakan setelah pemilihan model selesai.

### 9. Buat baseline dan model pembanding

Model minimum:

1. Baseline naïf: prediksi sama dengan permintaan 7 hari sebelumnya atau rata-rata 7 hari terakhir.
2. `LinearRegression` sebagai baseline statistik.
3. `RandomForestRegressor` atau `HistGradientBoostingRegressor` sebagai model kandidat.

Bandingkan semua model dengan periode uji dan metrik yang sama:

- MAE untuk rata-rata selisih jumlah booking.
- RMSE untuk memberi penalti lebih besar pada kesalahan besar.
- WAPE untuk kesalahan relatif terhadap total permintaan.

Pilih model berdasarkan hasil test, kestabilan, kemudahan dijelaskan, dan biaya operasional. Model paling kompleks tidak otomatis menjadi pilihan terbaik.

### 10. Simpan artefak dan metadata

Artefak model harus menyimpan:

- Model terlatih.
- Urutan nama fitur.
- Waktu training.
- Rentang data train, validation, dan test.
- Metrik model dan baseline.
- Versi model.
- Status sumber data sintetis atau nyata.

Gunakan `joblib` untuk artefak dan nama versi seperti `demand_model_v3.pkl`.

### 11. Publikasikan prediksi untuk FS

Pipeline DS menulis hasil prediksi ke tabel `prediction_output`. Setiap batch harus mempunyai waktu `dibuat_pada` yang sama agar backend dapat mengambil satu versi prediksi lengkap.

Contoh kontrak response yang sudah sesuai dengan backend:

```json
{
  "target": "jumlah_booking_harian",
  "model_version": "3.0",
  "keterangan": "Prediksi permintaan tujuh hari",
  "is_synthetic": true,
  "dibuat_pada": "2026-10-16T10:00:00.000Z",
  "metrik": {
    "MAE": 1.8,
    "RMSE": 2.4,
    "WAPE": 0.16
  },
  "prediksi": [
    {
      "periode": "2026-10-17",
      "nilai": 9,
      "batas_bawah": 6,
      "batas_atas": 12
    }
  ]
}
```

FS bertanggung jawab atas autentikasi, validasi, kode HTTP, dan penyajian response. DS bertanggung jawab atas arti setiap nilai, kualitas prediksi, versi model, dan metadata.

## Alur kolaborasi laporan dashboard

1. FS mencatat transaksi aplikasi pada tabel operasional MySQL.
2. DS menjalankan `data-science/business_report_pipeline.py` untuk ekstraksi, validasi, wrangling, dan agregasi lima laporan bisnis.
3. Pipeline DS mempublikasikan payload siap tampil ke tabel `ds_dashboard_snapshots` untuk periode 3, 6, dan 12 bulan serta filter layanan/customer.
4. Backend hanya membaca snapshot melalui `GET /api/v1/admin/dashboard/reports`; backend tidak mengolah ulang tabel transaksi untuk laporan ini.
5. Frontend React menampilkan payload API tanpa mengubah definisi metrik.

Jalankan pembaruan laporan dari folder `data-science`:

```powershell
.\.venv\Scripts\python.exe business_report_pipeline.py
```

Kolom `generated_at` dan `source_max_updated_at` menunjukkan kapan snapshot dibuat dan kapan transaksi sumber terakhir berubah.

## Tools yang digunakan

| Kebutuhan | Tool | Pemilik utama |
| --- | --- | --- |
| Sumber data persisten | MySQL/MariaDB XAMPP | FS |
| Query dan koneksi Python | SQL + PyMySQL | DS |
| Data wrangling | pandas dan NumPy | DS |
| Eksplorasi | Jupyter opsional, pandas, Plotly | DS |
| Modeling | scikit-learn | DS |
| Penyimpanan model | joblib | DS |
| Pengujian pipeline | pytest | DS |
| Pemeriksaan kode Python | Ruff | DS |
| Dashboard eksperimen | Streamlit + Plotly | DS |
| API aplikasi | Express `/api/v1` | FS backend |
| Validasi request | Joi | FS backend |
| Dashboard produk | React, Vite, Recharts | FS frontend |
| Kontrak API | OpenAPI/Swagger + contoh JSON | FS dan DS |
| Kolaborasi kode | Git dan GitHub | Semua tim |

DS tidak perlu membuat koneksi langsung dari React ke Python atau MySQL. Jalur produk tetap React ke Express, kemudian Express membaca hasil DS dari database atau memanggil layanan model jika real-time serving benar-benar dibutuhkan.

## Langkah dashboard DS

### Laporan deskriptif prioritas

Lima keluaran awal yang disepakati adalah:

1. Top 10 transaksi customer terbanyak.
2. Top 10 service terbanyak.
3. Top 10 teknisi dengan pengerjaan terbanyak.
4. Revenue per bulan.
5. Booking terjadwal customer per bulan.

DS memvalidasi definisi, kualitas, dan rekonsiliasi angka. Backend mengagregasi data MySQL melalui `/api/v1/admin/dashboard/reports`, lalu React menampilkan hasilnya. Definisi resminya dicatat di `data-science/DATA_DICTIONARY.md`; perubahan rumus harus diperbarui di API, kamus data, dan pengujian pada perubahan yang sama.

Filter periode awal adalah 3, 6, atau 12 bulan. Laporan teknisi dan booking terjadwal memiliki filter layanan dan customer yang bekerja secara lokal pada laporannya. Booking `cancelled` dikeluarkan dari ranking dan booking terjadwal. Revenue hanya berasal dari booking `done`. Volume pengerjaan teknisi bukan ukuran kualitas, sehingga keputusan evaluasi perlu dilengkapi completion rate, rating, durasi, dan kapasitas.

### 1. Tentukan pengguna dan keputusan

Pengguna utama adalah pemilik/admin. Dashboard harus membantu keputusan penjadwalan teknisi, prioritas layanan, dan kesiapan material.

### 2. Pisahkan aktual dan prediksi

Dashboard memiliki dua kelompok yang jelas:

- Aktual: data MySQL yang sudah terjadi.
- Prediksi: keluaran model dengan versi, rentang prediksi, dan ketidakpastian.

Jangan mencampur data aktual dan prediksi dalam satu angka tanpa label.

### 3. Tambahkan filter yang relevan

Filter minimum:

- Rentang tanggal.
- Status booking.
- Layanan.
- Teknisi.
- Data nyata atau sintetis.

### 4. Tampilkan KPI bisnis

KPI minimum:

- Total booking.
- Jumlah unit AC.
- Completion rate.
- Omzet dari `booking_items`.
- Rata-rata booking harian.
- Layanan terpopuler.
- Beban kerja teknisi.
- Pemakaian dan posisi stok material.

### 5. Tampilkan evaluasi model

Tampilkan:

- Aktual dibanding prediksi pada test set.
- MAE, RMSE, dan WAPE.
- Model pembanding.
- Tanggal training terakhir.
- Rentang data training.
- Label bahwa data masih sample/sintetis.

### 6. Tampilkan forecast dan rekomendasi

Grafik forecast menampilkan nilai tengah serta batas bawah dan atas. Kebutuhan teknisi dihitung dari aturan bisnis yang disepakati, misalnya:

```text
kebutuhan_teknisi = ceil(prediksi_booking / kapasitas_booking_per_teknisi)
```

Nilai kapasitas tidak boleh ditentukan DS sendiri. Angka tersebut harus disepakati dengan pemilik usaha dan FS lalu disimpan sebagai konfigurasi.

### 7. Sediakan pembaruan data

Pilihan MVP:

- Tombol refresh hanya membaca ulang MySQL.
- Training dijalankan manual melalui perintah terdokumentasi.
- Prediksi ditulis ulang ke `prediction_output` setelah training berhasil.

Tahap lanjut dapat memakai scheduler backend atau job terjadwal. Training tidak dijalankan setiap halaman dashboard dibuka.

### 8. Integrasikan Streamlit dengan aplikasi

1. Jalankan `streamlit run dashboard.py --server.port 8501` dari folder `data-science`.
2. Set `VITE_STREAMLIT_URL=http://localhost:8501` pada frontend.
3. Set `DS_DASHBOARD_URL=http://localhost:8501` pada backend jika URL perlu dikirim melalui API.
4. FS memperbaiki petunjuk `app.py` menjadi `dashboard.py`.
5. Uji modal dan tombol buka tab baru dari `/admin/analytics`.
6. Uji keadaan Streamlit mati, database mati, model belum tersedia, dan prediksi kedaluwarsa.

Streamlit berfungsi sebagai lab analitik. Angka prediksi penting tetap harus tampil secara native di halaman React agar fitur utama tidak bergantung pada iframe.

### 9. Integrasikan prediksi native di React

FS frontend menambahkan pemanggilan `GET /api/v1/predictions/latest` pada halaman admin lalu menampilkan:

- Versi model.
- Waktu pembaruan.
- Status sintetis.
- Grafik prediksi 7 sampai 30 hari.
- Batas bawah dan atas.
- Rekomendasi jumlah teknisi.
- Pesan jelas ketika data belum tersedia.

## Pembagian tanggung jawab

| Pekerjaan | DS | FS backend | FS frontend |
| --- | --- | --- | --- |
| Pertanyaan bisnis | Memimpin analisis | Memberi batas fitur | Memastikan kebutuhan pengguna |
| Kamus data | Menulis definisi | Memverifikasi skema | Membaca kontrak |
| Query/view dataset | Menentukan kebutuhan | Membuat dan menjaga akses | Tidak mengakses DB langsung |
| Audit dan wrangling | Mengerjakan | Membantu aturan bisnis | Tidak mengolah dataset training |
| Model dan evaluasi | Mengerjakan | Menyediakan runtime/job bila perlu | Menampilkan metadata |
| Publikasi prediksi | Menulis batch hasil | Menjaga tabel dan endpoint | Mengonsumsi endpoint |
| Dashboard Streamlit | Membangun isi analitik | Menyediakan konfigurasi URL | Menyematkan dan menangani gagal muat |
| Dashboard React | Menentukan arti metrik | Menyediakan API | Membangun UX |
| Error handling | Menjelaskan status model/data | HTTP dan logging | Loading, empty, stale, dan error state |
| Dokumentasi | Metode dan keterbatasan | API dan deployment | Panduan penggunaan |

## Urutan kerja satu sprint

### Hari 1 — Kesepakatan

- DS dan FS menyetujui pertanyaan bisnis, target, horizon prediksi, zona waktu, dan definisi status.
- Buat contoh response API sebelum coding.
- Tentukan kriteria selesai.

### Hari 2 — Kontrak data

- DS menyelesaikan kamus data dan query kebutuhan.
- FS membuat view/read-only query dan memastikan akses MySQL.
- DS membuat laporan audit awal.

### Hari 3 — Dataset dan EDA

- DS membangun pipeline ekstraksi serta wrangling.
- DS menghasilkan analisis dan rekomendasi awal.
- FS backend menyiapkan mock response `/predictions/latest` untuk frontend.

### Hari 4 — Model

- DS membangun baseline dan minimal satu model kandidat.
- DS melakukan time-based split dan mencatat MAE, RMSE, dan WAPE.
- FS frontend membangun kartu dan grafik memakai mock response.

### Hari 5 — Integrasi

- DS menulis prediksi ke `prediction_output`.
- FS backend menguji endpoint dengan hasil nyata dari pipeline.
- FS frontend mengganti mock dengan endpoint aplikasi.

### Hari 6 — Dashboard dan kegagalan

- DS menyelesaikan Streamlit dengan filter, aktual, forecast, dan metadata.
- FS menguji iframe serta URL konfigurasi.
- Semua tim menguji model hilang, database mati, response kosong, dan prediksi lama.

### Hari 7 — Validasi dan dokumentasi

- Cocokkan angka dashboard dengan query MySQL.
- Jalankan pytest, lint, dan tes backend/frontend.
- Lengkapi README: sumber data, label sintetis, metode, perbandingan model, metrik, keterbatasan, API, serta cara menjalankan dashboard.
- Rekam alur demo dari transaksi sampai prediksi tampil di aplikasi.

## Aturan kolaborasi Git

- DS bekerja pada branch kecil seperti `feature/ds-data-pipeline`, `feature/ds-forecast`, dan `feature/ds-dashboard`.
- FS bekerja pada branch API dan frontend yang terpisah.
- Perubahan kontrak data atau API harus disetujui sebelum digabung.
- Pull request DS menyertakan metrik, data yang digunakan, cara menjalankan, dan hasil tes.
- Artefak model besar tidak dimasukkan ke Git tanpa kesepakatan. Simpan metadata serta checksum agar versi tetap dapat ditelusuri.

## Definition of Done

Kolaborasi FS dan DS dianggap selesai ketika:

- Pertanyaan bisnis dan target terdokumentasi.
- Kamus data tersedia.
- Dataset dapat dibangun ulang dari MySQL dengan satu perintah.
- Pemeriksaan kualitas data lulus atau pengecualiannya dijelaskan.
- Baseline dan model kandidat dibandingkan pada test berbasis waktu.
- Artefak dan metadata model memiliki versi.
- Prediksi tersimpan di `prediction_output`.
- Endpoint `/api/v1/predictions/latest` mengembalikan response yang disepakati.
- Prediksi tampil di React dengan loading, empty, stale, dan error state.
- Streamlit menampilkan aktual, forecast, filter, sumber data, dan metrik.
- Angka dashboard direkonsiliasi dengan MySQL.
- README menjelaskan sumber, metode, hasil, keterbatasan, dan cara menjalankan semua layanan.

## Keterkaitan dengan checklist Asah 2026

| Checklist Data Science | Bukti yang harus disiapkan |
| --- | --- |
| Identifikasi masalah dan peran data | Sasaran bersama dan pertanyaan bisnis |
| Merumuskan pertanyaan bisnis | Daftar pertanyaan dan KPI |
| Data wrangling | Pipeline ekstraksi, cleaning, dan dataset siap model |
| Analisis data | Notebook/script, grafik, temuan, dan rekomendasi |
| Hasil dapat digunakan anggota lain | View data, tabel prediksi, kontrak API |
| Memeriksa ketepatan | Laporan audit dan rekonsiliasi |
| Dashboard interaktif | Streamlit dengan filter dan sumber data |
| Pembaruan data | Koneksi MySQL dan prosedur refresh |
| Data primer atau dummy berlabel | `is_synthetic` dan dokumentasi keterbatasan |
| Integrasi dashboard | URL Streamlit dan halaman admin React |
| Data dictionary | `DATA_DICTIONARY.md` |
| Split tanpa leakage | Pembagian train, validation, dan test berbasis waktu |
| Model prediksi | Baseline, model kandidat, dan artefak versi |
| Feature engineering | Fitur kalender, lag, dan rolling yang terdokumentasi |
| Evaluasi model | MAE, RMSE, WAPE, dan perbandingan baseline |
| Integrasi prediksi | `prediction_output`, Express API, dan React |

