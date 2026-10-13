# NARA AC — Sistem Pengelolaan Jadwal & Pengingat Servis AC Terpadu

> **Dokumentasi Teknis Resmi Sistem Operasional, Layanan Mandiri, AI, & Analitik**  
> **Kode Proyek Capstone:** A26-CS054  
> **Mitra UMKM:** CV. Nara Teknindotama  
> **Status Sistem:** Siap Digunakan (Development & Production Ready)

---

## Daftar Isi

1. [Project Overview](#1-project-overview)
2. [Fitur dan Modul Fungsional](#2-fitur-dan-modul-fungsional)
   - [Customer (Pelanggan)](#21-customer-pelanggan)
   - [Admin / Pemilik Usaha](#22-admin--pemilik-usaha)
   - [Technician (Teknisi Lapangan)](#23-technician-teknisi-lapangan)
   - [AI Service & Data Science](#24-ai-service--data-science)
3. [Technology Stack](#3-technology-stack)
4. [Arsitektur Sistem](#4-arsitektur-sistem)
   - [Komponen & Batas Tanggung Jawab](#41-komponen--batas-tanggung-jawab)
   - [Diagram Arsitektur Sistem](#42-diagram-arsitektur-sistem)
   - [Alur Komunikasi Antar-Layanan](#43-alur-komunikasi-antar-layanan)
5. [Struktur Direktori Repositori](#5-struktur-direktori-repositori)
6. [Dokumentasi Frontend](#6-dokumentasi-frontend)
   - [Struktur & Routing](#61-struktur--routing)
   - [State Management & Autentikasi](#62-state-management--autentikasi)
   - [API Client & Interceptor](#63-api-client--interceptor)
   - [Pola Desain & Komponen UI](#64-pola-desain--komponen-ui)
7. [Dokumentasi Backend](#7-dokumentasi-backend)
   - [Arsitektur Layer & Lifecycle Request](#71-arsitektur-layer--lifecycle-request)
   - [Middleware Stack](#72-middleware-stack)
   - [Service Layer & Business Rules](#73-service-layer--business-rules)
   - [Error Handling & Audit Trail](#74-error-handling--audit-trail)
8. [API Reference](#8-api-reference)
   - [Daftar Endpoint Lengkap](#81-daftar-endpoint-lengkap)
   - [Spesifikasi Endpoint Kunci](#82-spesifikasi-endpoint-kunci)
9. [Dokumentasi Database](#9-dokumentasi-database)
   - [Spesifikasi Mesin & Migrasi](#91-spesifikasi-mesin--migrasi)
   - [Daftar Tabel & Tanggung Jawab](#92-daftar-tabel--tanggung-jawab)
   - [Entity Relationship Diagram (ERD)](#93-entity-relationship-diagram-erd)
   - [Manajemen Migrasi & Seeding](#94-manajemen-migrasi--seeding)
10. [Autentikasi dan Otorisasi](#10-autentikasi-dan-otorisasi)
    - [Mekanisme JWT & Cookie HttpOnly](#101-mekanisme-jwt--cookie-httponly)
    - [Role-Based Access Control (RBAC)](#102-role-based-access-control-rbac)
    - [Proteksi CSRF](#103-proteksi-csrf)
11. [Dokumentasi Data Science](#11-dokumentasi-data-science)
    - [Tujuan & Sumber Data](#111-tujuan--sumber-data)
    - [Pipeline Machine Learning & Algoritma](#112-pipeline-machine-learning--algoritma)
    - [Metrik Evaluasi & Pencegahan Data Leakage](#113-metrik-evaluasi--pencegahan-data-leakage)
    - [Streamlit Analytics Dashboard](#114-streamlit-analytics-dashboard)
12. [Dokumentasi AI / Machine Learning / Chatbot](#12-dokumentasi-ai--machine-learning--chatbot)
    - [Arsitektur AI Service (FastAPI)](#121-arsitektur-ai-service-fastapi)
    - [Intent Classification & Pelatihan Model](#122-intent-classification--pelatihan-model)
    - [Entity Extraction & RAG Extractive](#123-entity-extraction--rag-extractive)
    - [Keamanan AI & Pencegahan Prompt Injection](#124-keamanan-ai--pencegahan-prompt-injection)
13. [Integrasi Layanan & Alur Data](#13-integrasi-layanan--alur-data)
14. [Konfigurasi Environment](#14-konfigurasi-environment)
    - [Variabel Backend](#141-variabel-backend)
    - [Variabel Frontend](#142-variabel-frontend)
    - [Variabel AI Service & Data Science](#143-variabel-ai-service--data-science)
15. [Instalasi dan Setup Lokal](#15-instalasi-dan-setup-lokal)
    - [Prasyarat Sistem](#151-prasyarat-sistem)
    - [Panduan Langkah Demi Langkah](#152-panduan-langkah-demi-langkah)
    - [Pemeriksaan Startup Berhasil](#153-pemeriksaan-startup-berhasil)
16. [Workflow Pengembangan & Standar Kontribusi](#16-workflow-pengembangan--standar-kontribusi)
17. [Testing dan Quality Assurance](#17-testing-dan-quality-assurance)
18. [Deployment dan Infrastruktur](#18-deployment-dan-infrastruktur)
19. [Panduan Troubleshooting](#19-panduan-troubleshooting)
20. [Known Limitations & Roadmap](#20-known-limitations--roadmap)
21. [Glosarium Istilah](#21-glosarium-istilah)
22. [Informasi Lisensi & Proyek](#22-informasi-lisensi--proyek)

---

## 1. Project Overview

**NARA AC** adalah sistem digital terpadu untuk pengelolaan jadwal layanan servis, instalasi, dan perbaikan penyejuk udara (Air Conditioner) yang dikembangkan khusus untuk mitra UMKM **CV. Nara Teknindotama** (Kode Capstone: **A26-CS054**).

### Latar Belakang & Masalah Bisnis
Operasional manual pada bisnis jasa service pendingin udara skala UMKM kerap menghadapi hambatan nyata:
1. **Konflik Jadwal Teknisi:** Penjadwalan serampangan via pesan instan memicu bentrok penugasan pada jam yang sama di lokasi berbeda.
2. **Minimnya Transparansi Status:** Pelanggan tidak dapat memantau kapan teknisi berangkat, mulai bekerja, atau mengalami kendala di lapangan.
3. **Pencatatan Material & Inventori Rawan Selisih:** Suku cadang dan material habis pakai (freon, pipa tembaga, kabel) sulit terlacak penggunaannya per order kerja.
4. **Dokumentasi Kerja Tidak Terstandarisasi:** Tidak adanya bukti foto fisik sebelum (*before*) dan sesudah (*after*) pekerjaan memicu komplain berulang.
5. **Ketiadaan Prediksi Kebutuhan SDM:** Beban kerja melonjak saat musim panas tanpa estimasi jumlah teknisi yang harus disiagakan.

### Solusi Sistem NARA AC
Platform ini menyatukan seluruh siklus hidup operasional dalam satu kesatuan sistem:
- **Pemesanan Mandiri & Publik:** Pelanggan dapat memilih jenis layanan, memilih alamat presisi berjenjang Jabodetabek, mengecek slot jadwal yang valid tanpa tumpang tindih, dan memantau status secara publik menggunakan tiket kode booking unik (`AC-XXXX` atau `BK-YYYYMMDD-XXXX`).
- **Portal Khusus Pelanggan Terdaftar:** Manajemen riwayat servis, inventarisasi data fisik unit AC milik pribadi, serta notifikasi terpusat.
- **Konsol Operasional Admin:** Dashboard metrik KPI, deteksi otomatis bentrok penugasan, rekomendasi alokasi teknisi, manajemen multi-tarif katalog, penerbitan invoice resmi standar CV, audit log aktivitas, dan penyelesaian tiket keluhan.
- **Aplikasi Lapangan Teknisi:** Daftar penugasan harian, checklist SOP pekerjaan wajib, pelaporan penundaan berkategori, unggah bukti foto before/after, dan pencatatan riil pemakaian inventori material.
- **AI Chatbot Service:** Asisten cerdas terintegrasi untuk mengenali 19 intensi bahasa alami, ekstraksi entitas kode/tanggal, FAQ dokumen ekstraktif (RAG), serta pembuatan tiket komplain otomatis jika terdeteksi keluhan mendesak.
- **Dashboard Analitik & Prediksi Permintaan:** Visualisasi kinerja PostgreSQL dan model prediksi kebutuhan unit servis harian menggunakan algoritma *Random Forest Regressor* berbasis variabel historis waktu, suhu, dan hari libur.

---

## 2. Fitur dan Modul Fungsional

### 2.1 Customer (Pelanggan)
Fitur yang tersedia bagi pengguna publik dan pelanggan terdaftar:
- **Landing Page Interaktif:** Katalog paket layanan (Cuci Standar, Cuci Core Deep Clean, Paket Core + Isi Freon, Pasang Baru, Bongkar Pasang), FAQ, testimoni, trust bar, dan galeri pengerjaan.
- **Booking Mandiri:** Form pemesanan dengan pemilihan layanan, tanggal, slot jam operasional valid, dan integrasi selector wilayah presisi Jabodetabek (`Provinsi` -> `Kota/Kabupaten` -> `Kecamatan` -> `Kelurahan`).
- **Cek Ketersediaan Slot Real-time:** Memeriksa kuota teknisi yang tidak sedang bertugas pada jam dan tanggal tertentu.
- **Pelacakan Status Publik:** Halaman pelacakan publik cukup dengan memasukkan kode booking (contoh: `AC-A1B2`) tanpa kewajiban login.
- **Reschedule & Pembatalan Publik:** Pelanggan dapat mengubah jadwal atau membatalkan pesanan publik secara mandiri dengan verifikasi nomor kontak terdaftar.
- **Feedback & Rating:** Formulir penilaian bintang (1–5) dan ulasan pasca pekerjaan berstatus `done`.
- **Portal Mandiri Pelanggan (`/customer`):**
  - **Dashboard Ringkasan:** Rekap servis aktif, jumlah unit AC, dan hitungan servis selesai.
  - **Manajemen Unit AC (`My AC`):** CRUD inventaris unit AC milik pelanggan (merek, tipe PK, nomor seri, lokasi ruangan, tanggal pasang).
  - **Riwayat Servis:** Daftar riwayat pekerjaan servis terdahulu beserta nama teknisi dan detail penanganan.
  - **Pusat Notifikasi:** Menerima pengingat servis berkala dan status perubahan pekerjaan.

### 2.2 Admin / Pemilik Usaha
Fitur operasional penuh yang diakses melalui portal `/admin`:
- **Dashboard Eksekutif & KPI:** Rekap total booking, pendapatan terakumulasi, rasio pekerjaan selesai, rating rata-rata, dan grafik performa operasional.
- **Manajemen Booking Terpadu:** Filter status (`scheduled`, `on process`, `done`, `cancelled`, `rescheduled`, `delayed`), filter teknisi, rentang tanggal, serta modal pembuatan booking langsung oleh admin.
- **Smart Scheduling & Alokasi Teknisi:**
  - Deteksi otomatis konflik jadwal teknisi pada slot waktu bersamaan.
  - Mesin rekomendasi teknisi optimal berdasarkan status ketersediaan dan beban kerja terendah.
  - Penjadwalan ulang (*reschedule*) dan pelaporan penundaan (*delay*) berdasar alasan operasional.
- **Penerbitan Invoice Resmi (`OfficialInvoicePaper`):** Generate faktur tagihan resmi A4 standar CV. Nara Teknindotama lengkap dengan nomor faktur, NPWP perusahaan, rincian biaya jasa + suku cadang, rekening bank/QRIS, dan stempel status.
- **Manajemen Pelanggan & Pembuatan Akun:** CRUD data master pelanggan, riwayat servis per pelanggan, dan kemampuan membuatkan akun login pelanggan langsung dari kartu profil.
- **Manajemen Unit AC Pelanggan:** Pengawasan seluruh unit pendingin ruangan yang terdaftar di sistem.
- **Manajemen Teknisi & Ketersediaan:** CRUD data teknisi, pengelolaan jadwal cuti/libur/sibuk per tanggal, dan monitoring beban kerja (*workload*).
- **Manajemen Inventori & Mutasi Stok:** CRUD katalog suku cadang/material, pemantauan batas stok minimum (*low stock alert*), penyesuaian manual (*adjustment in/out*), dan riwayat mutasi terintegrasi *work order*.
- **Katalog Layanan & Pengaturan Operasional:** CRUD layanan servis, durasi pengerjaan, jam buka/tutup operasional, hari kerja, rekening pembayaran, dan profil perusahaan.
- **Pusat Audit Log & Notifikasi:** Rekap jejak audit perubahan kritis (*before/after snapshot*) dan penyiaran notifikasi internal.
- **Manajemen Tiket Komplain & Log AI:** Tinjauan tiket keluhan yang diteruskan dari percakapan bot dan pemantauan latensi/inferensi model AI.

### 2.3 Technician (Teknisi Lapangan)
Fitur lapangan yang diakses melalui konsol `/technician`:
- **Dashboard Kerja Harian:** Ringkasan pekerjaan hari ini, pekerjaan yang sedang berjalan (*on process*), dan daftar pekerjaan mendatang.
- **Detail Work Order:** Akses lengkap alamat, nomor telepon pelanggan, unit AC target, dan keluhan awal.
- **Lifecycle Status Pekerjaan:**
  - Memulai pengerjaan (*Start Job* -> status berpindah ke `on process` dan mencatat `mulai_aktual`).
  - Melaporkan kendala/penundaan (*Report Delay* -> status `delayed` dengan pilihan kategori kendala).
  - Menyelesaikan pekerjaan (*Complete Job* -> verifikasi checklist dan mencatat `selesai_aktual`).
- **Checklist Standar Operasional Prosedur (SOP):** Checklist tahapan kerja (pembersihan indoor, cuci outdoor, cek tekanan freon, tes nyala, dll.) dengan status `pending`, `completed`, atau `skipped` (wajib alasan skip jika dilewati).
- **Dokumentasi Foto Lapangan:** Unggah langsung foto fisik berkategori `before` (kondisi awal) dan `after` (hasil akhir) yang disimpan aman di server backend.
- **Pencatatan Pemakaian Material:** Input suku cadang/freon/pipa yang digunakan langsung memotong stok inventori secara real-time.
- **Work Order & Diagnosis Teknis:** Form isian diagnosa kerusakan, tindakan perbaikan, dan rekomendasi perawatan lanjutan.
- **Manajemen Ketersediaan Pribadi:** Form pengajuan status harian teknisi (`available`, `busy`, `off`) untuk mencegah penugasan saat cuti.

### 2.4 AI Service & Data Science
- **AI Customer Service Chatbot:** Widget interaktif pada aplikasi yang menangani obrolan pelanggan, klasifikasi 19 intensi obrolan, penyajian *quick replies*, penanganan komplain darurat ke tabel tiket, dan pencarian dokumen pengetahuan ekstraktif (RAG).
- **Data Science Streamlit Analytics:** Dashboard visualisasi analitik terpisah untuk pemantauan data relasional dan simulasi prediksi volume booking harian menggunakan algoritma *Random Forest Regressor v2.0*.

---

## 3. Technology Stack

Berikut adalah daftar teknologi yang terverifikasi secara aktual dari file konfigurasi dan manifest dependensi repositori:

| Layer | Technology | Purpose | Evidence / Location |
|---|---|---|---|
| **Frontend** | React 19.3.0 | Core UI Library berbasis komponen deklaratif | `frontend/package.json` |
| **Frontend** | Vite 8.3.3 | Build tool & modern development server | `frontend/vite.config.js` |
| **Frontend** | Tailwind CSS v4.3.3 (`@tailwindcss/vite`) | Utility-first CSS styling engine | `frontend/src/index.css`, `frontend/vite.config.js` |
| **Frontend** | React Router DOM 7.18.4 | Client-side routing SPA (Public, Admin, Tech, Customer) | `frontend/src/App.jsx` |
| **Frontend** | Axios 1.20.0 | HTTP client terkonfigurasi dengan interceptor & auth cookies | `frontend/src/api.js` |
| **Frontend** | Framer Motion 14.1.0 | Animasi antarmuka dan transisi dinamis | `frontend/package.json` |
| **Frontend** | Recharts 3.10.1 | Visualisasi grafik data analitik dashboard | `frontend/src/pages/admin/AdminAnalytics.jsx` |
| **Frontend** | Lucide React 1.52.0 | Icon system antarmuka | `frontend/package.json` |
| **Backend** | Node.js (18+ / 19+) | JavaScript runtime environment | `backend/package.json` |
| **Backend** | Express 4.19.2 | REST API Framework pengelola rute `/api/v1` | `backend/src/app.js` |
| **Backend** | PostgreSQL (`pg` 8.12.0) | Driver koneksi database dengan pooling & transaction support | `backend/src/db/pool.js` |
| **Backend** | Joi 17.13.3 | Validasi skema input (body, query, params) | `backend/src/middleware/validate.js` |
| **Backend** | jsonwebtoken 9.0.2 | Penerbitan dan verifikasi token autentikasi JWT | `backend/src/middleware/auth.js` |
| **Backend** | bcryptjs 2.4.3 | Hashing password satu arah dengan salt | `backend/src/routes/auth.js` |
| **Backend** | Helmet 7.1.0 & CORS 2.8.5 | Keamanan header HTTP dan proteksi asal domain | `backend/src/app.js` |
| **Backend** | express-rate-limit 7.4.0 | Pembatasan laju request mitigasi DDoS & brute-force | `backend/src/app.js`, `backend/src/routes/bookings.js` |
| **Backend** | Multer 1.4.4 | Multipart form-data parser untuk unggah berkas foto pekerjaan | `backend/src/utils/upload.js` |
| **Backend** | node-cron 3.0.3 | Task scheduler pengingat servis otomatis (H-1) | `backend/src/services/reminderService.js` |
| **Backend** | swagger-ui-express & yaml | Penyaji dokumentasi OpenAPI interaktif | `backend/src/app.js`, `backend/openapi.yaml` |
| **Database** | PostgreSQL 14+ | Relational Database Management System | `backend/migrations/*.sql` |
| **Database** | Custom SQL Runner | Sistem migrasi database terurut (11 berkas SQL) | `backend/src/db/migrate.js` |
| **AI / ML** | Python 3.9+ | Runtime pemrosesan model kecerdasan buatan | `ai-service/pyproject.toml` |
| **AI / ML** | FastAPI 0.110+ & Uvicorn 0.29+ | Framework web asinkron penyedia REST API AI | `ai-service/main.py` |
| **AI / ML** | Scikit-Learn 1.3+ | Pustaka klasifikasi teks, TF-IDF vectorizer, & evaluasi model | `ai-service/train.py` |
| **AI / ML** | Joblib 1.3+ | Serialisasi model ML (`.pkl`) | `ai-service/train.py`, `ai-service/main.py` |
| **Data Science** | Streamlit 1.32+ | Framework dashboard analitik interaktif berbasis Python | `data-science/dashboard.py` |
| **Data Science** | Plotly 5.18+ | Grafik visualisasi interaktif untuk data science | `data-science/dashboard.py` |
| **Data Science** | Scikit-Learn 1.3+ | Algoritma *RandomForestRegressor* & time-series split forecasting | `data-science/generate_dataset.py` |
| **Testing** | Jest 29.7.0 & Supertest 7.0.0 | Unit testing, integration testing, & HTTP assertion backend | `backend/package.json`, `backend/tests/` |
| **Testing** | Pytest 8.4+ | Automated test runner untuk AI service dan pipeline data science | `ai-service/`, `data-science/` |
| **Code Quality** | ESLint 9.39.5 | Standar gaya kode & static code analysis JavaScript | `backend/eslint.config.js`, `frontend/eslint.config.js` |

---

## 4. Arsitektur Sistem

### 4.1 Komponen & Batas Tanggung Jawab
Sistem mengadopsi arsitektur modular terkoordinasi (*service-oriented monolith with auxiliary AI/DS micro-services*):
1. **Frontend Client (Port 5173):** Bertindak sebagai antarmuka pengguna tunggal (SPA). Frontend tidak pernah terhubung langsung ke database atau AI Service eksternal demi keamanan. Seluruh interaksi obrolan dan manipulasi data melalui rute `/api/v1` Backend.
2. **Backend API Gateway & Business Engine (Port 4000):** Menjadi pusat kendali operasional, validasi data, autentikasi, otorisasi RBAC, penjadwalan transaksi atomik ke PostgreSQL, serta bertindak sebagai proxy aman ke AI Service.
3. **Database PostgreSQL (Port 5432/5433):** Sumber data tunggal (*Single Source of Truth*) yang mengelola integritas data relasional, constraint transaksi, audit trail, serta pencatatan stok dan booking.
4. **AI Service (Port 8000):** Layanan komputasi inferensi teks berbasis Python/FastAPI yang bertugas menerima payload teks dari backend, menentukan intensi obrolan, mengekstrak entitas, dan mencari jawaban ekstraktif dokumen.
5. **Data Science Analytics (Port 8501):** Layanan dasbor analitik berbasis Streamlit untuk membaca data operasional database secara *read-only* dan menyajikan simulasi *demand forecasting*.

### 4.2 Diagram Arsitektur Sistem

```mermaid
flowchart TB
    subgraph Clients["Pengguna & Browser Client"]
        Customer["Pelanggan Umum / Terdaftar"]
        Admin["Admin / Pemilik Usaha"]
        Technician["Teknisi Lapangan"]
    end

    subgraph FrontendApp["Frontend Application (React 19 + Vite - Port 5173)"]
        Landing["Landing & Booking Page"]
        CustPortal["Customer Portal (/customer)"]
        AdminPortal["Admin Dashboard (/admin)"]
        TechPortal["Technician Dashboard (/technician)"]
        ChatWidget["Chatbot Widget UI"]
    end

    subgraph BackendApp["Backend REST API (Express.js - Port 4000)"]
        AuthMid["Auth & RBAC Middleware"]
        CSRFMid["CSRF Protection"]
        RateLimit["Rate Limiting & Helmet"]
        RouteHandlers["Route Controllers (/api/v1)"]
        subgraph Services["Domain Services"]
            BS["Booking & Scheduling Service"]
            WS["Workflow & Work Order Service"]
            CS["Chat Service & Context Manager"]
            DS["Dashboard & KPI Service"]
            RS["Cron Reminder Service (H-1)"]
        end
    end

    subgraph Storage["Penyimpanan Data & Berkas"]
        PG[(PostgreSQL Database)]
        Uploads[("Storage Berkas Foto (uploads/)")]
    end

    subgraph AIService["AI Service (FastAPI - Port 8000)"]
        IntentClassifier["Intent Classifier (TF-IDF + Scikit-Learn)"]
        EntityExtract["Regex Entity Extractor"]
        RAGEngine["Extractive RAG (Cosine Similarity)"]
    end

    subgraph DataScience["Data Science (Streamlit - Port 8501)"]
        DSDash["Streamlit Dashboard"]
        MLDemand["Random Forest Demand Forecast v2.0"]
    end

    Customer --> Landing & CustPortal & ChatWidget
    Admin --> AdminPortal
    Technician --> TechPortal

    Landing & CustPortal & AdminPortal & TechPortal -->|HTTP JSON / Credentials| AuthMid
    ChatWidget -->|POST /api/v1/ai/answer| RouteHandlers

    AuthMid --> CSRFMid --> RateLimit --> RouteHandlers
    RouteHandlers --> Services
    BS & WS & DS -->|Pool Client / withTx| PG
    WS -->|Simpan Berkas Foto| Uploads
    CS -->|POST /predict-intent| AIService
    RS -->|Polling Jadwal H-1| PG

    DSDash -->|Query Read-Only| PG
    DSDash -.-> MLDemand
```

### 4.3 Alur Komunikasi Antar-Layanan
1. **Alur Transaksi Bisnis (Booking, Penugasan, Update Kerja):**
   `Browser` -> `Frontend Axios (dengan nara_token cookie/header)` -> `Express Auth Middleware` -> `Validation (Joi)` -> `Service Layer dengan withTx(client)` -> `PostgreSQL COMMIT/ROLLBACK` -> `Audit Log & Notifikasi Otomatis`.
2. **Alur Chatbot AI Pelanggan:**
   `User Chat Input` -> `Frontend ChatbotWidget` -> `POST /api/v1/ai/answer` (Backend) -> `chatService.js (Context State Check)` -> `POST /predict-intent` (FastAPI AI Service) -> `Intent + Entities Dikembalikan` -> `chatService.js Memproses Logika / Query Data Dinamis Katalog / Deteksi Komplain` -> `Response JSON Enriched (Jawaban, Quick Replies, Aksi Rute)` -> `Frontend Chat Widget`.
3. **Alur Pengingat Otomatis (Cron Scheduler):**
   `node-cron (setiap hari)` -> `reminderService.js` -> `Query Bookings H-1 Besok` -> `Pemeriksaan Duplikasi (reminder_log)` -> `Pencatatan Status pending/sent` -> `Notifikasi Tersimpan`.

---

## 5. Struktur Direktori Repositori

Struktur direktori aktual repositori NARA AC:

```text
CP 2026/
├── AI_IMPROVEMENT_DOCUMENTATION.md   # Dokumentasi historis peningkatan modul AI
├── README.md                          # Dokumentasi teknis utama proyek (berkas ini)
├── .gitignore                         # Konfigurasi eksklusi Git
│
├── ai-service/                        # Layanan Mikro AI / NLP (FastAPI)
│   ├── intent_model.pkl               # Model biner klasifikasi intent terlatih
│   ├── label_encoder.pkl              # Encoder label kelas intent
│   ├── vectorizer.pkl                 # TF-IDF Vectorizer vocabulary
│   ├── main.py                        # Entry point aplikasi FastAPI & route inferensi
│   ├── train.py                       # Skrip pelatihan & evaluasi model scikit-learn
│   ├── pyproject.toml                 # Konfigurasi toolset Python
│   ├── requirements.txt               # Daftar dependensi Python AI Service
│   ├── test_ai_improvements.py        # Pengujian komprehensif intent, entitas, & sanitasi
│   ├── test_end_to_end.py             # Pengujian end-to-end inferensi
│   └── test_main.py                   # Pengujian unit dasar FastAPI
│
├── backend/                           # Layanan REST API Utama (Express.js)
│   ├── .env.example                   # Template konfigurasi environment backend
│   ├── eslint.config.js               # Konfigurasi linter JavaScript backend
│   ├── openapi.yaml                   # Spesifikasi kontrak OpenAPI 3.0
│   ├── package.json                   # Dependensi & skrip eksekusi backend
│   ├── package-lock.json              # Lockfile dependensi npm backend
│   ├── migrations/                    # Berkas migrasi database SQL terurut (001 - 011)
│   │   ├── 001_init.sql               # Skema awal inti sistem
│   │   ├── 002_expansion.sql          # Unit AC, foto kerja, SOP checklist, cuti teknisi
│   │   ├── 003_admin_operations.sql   # Audit log, notifikasi, penyesuaian inventori
│   │   ├── 004_add_cancelled_status.sql # Penambahan status pembatalan booking
│   │   ├── 005_platform_upgrade.sql   # Work order, laporan servis, riwayat jadwal, role customer
│   │   ├── 006_ac_unit_serial.sql     # Penambahan kolom nomor seri unit AC
│   │   ├── 007_idempotency_and_improvements.sql # Idempotency key & indeks query
│   │   ├── 008_fix_jumlah_unit.sql    # Batasan & kolom jumlah unit per order (1-20)
│   │   ├── 009_add_missing_constraints.sql # Constraint referensial & tipe notifikasi
│   │   ├── 010_sync_service_catalog_packages.sql # Sinkronisasi paket layanan core & freon
│   │   └── 011_add_user_kontak.sql    # Kolom nomor kontak WhatsApp pada tabel users
│   ├── uploads/                       # Direktori penyimpanan berkas foto pengerjaan teknisi
│   ├── tests/                         # Berkas automated test suite (Jest + Supertest)
│   │   ├── app.test.js                # Pengujian konfigurasi server & health check
│   │   ├── auth.test.js               # Pengujian alur login, registrasi, & JWT
│   │   ├── backendImprovements.test.js# Pengujian perbaikan error handler & audit trail
│   │   ├── customer.test.js           # Pengujian portal customer & manajemen AC
│   │   ├── preservation.test.js       # Pengujian regresi & integritas alur bisnis
│   │   └── setupEnv.js                # Setup environment pengujian Jest
│   └── src/                           # Source code backend
│       ├── app.js                     # Inisialisasi Express, middleware, & router mount
│       ├── config.js                  # Pemuat konfigurasi terpusat & fail-safe env
│       ├── errors.js                  # Taksonomi kelas error kustom (E.validation, E.forbidden, dll)
│       ├── server.js                  # Entry point server HTTP & pemanggil migrasi/cron
│       ├── db/
│       │   ├── pool.js                # Inisialisasi pool PostgreSQL & helper withTx
│       │   ├── migrate.js             # Skrip eksekutor migrasi otomatis
│       │   └── seed.js                # Skrip pembenih data dasar (admin, teknisi, layanan)
│       ├── middleware/
│       │   ├── auth.js                # Middleware requireAuth & optionalAuth (JWT/Cookie)
│       │   ├── csrf.js                # Middleware proteksi token CSRF (X-CSRF-Token)
│       │   ├── errorHandler.js        # Global error handler & async route wrapper
│       │   └── validate.js            # Middleware validasi skema Joi
│       ├── routes/
│       │   ├── admin.js               # Router admin (kpi, unit ac, teknisi, jadwal, inventori)
│       │   ├── auth.js                # Router autentikasi (login, register, me, csrf, logout)
│       │   ├── bookings.js            # Router pemesanan publik & terautentikasi
│       │   ├── customer.js            # Router portal pelanggan (ac-units, history, notif)
│       │   ├── master.js              # Router data master (layanan, pelanggan, operasional)
│       │   ├── ops.js                 # Router operasional (reminder, ticket komplain, AI, analitik)
│       │   └── technician.js          # Router lapangan teknisi (dashboard, jobs, checklist, foto)
│       ├── services/
│       │   ├── aiClient.js            # Klien HTTP pemanggil FastAPI AI Service
│       │   ├── analyticsService.js    # Perhitungan agregasi metrik pendapatan & volume
│       │   ├── bookingService.js      # Business logic ketersediaan, booking, & verifikasi kode
│       │   ├── chatService.js         # Pengelola konteks percakapan bot & intent mapping
│       │   ├── common.js              # Utilitas audit log & pembuatan notifikasi sistem
│       │   ├── dashboardService.js    # Kalkulator ringkasan KPI & rekomendasi teknisi
│       │   ├── reminderService.js     # Scheduler node-cron & pengirim pengingat H-1
│       │   └── workflowService.js     # State machine siklus kerja teknisi & laporan servis
│       └── utils/
│           ├── ids.js                 # Generator kode booking tiket & normalisasi telepon
│           ├── logger.js              # Request correlation ID logger & health probe
│           ├── time.js                # Penanganan zona waktu WIB (UTC+7) & parser tanggal
│           └── upload.js              # Konfigurasi multer & filter tipe berkas foto
│
├── data-science/                      # Modul Data Science & Forecasting (Streamlit)
│   ├── dashboard.py                   # Dashboard analitik interaktif multi-tab
│   ├── generate_dataset.py            # Generator data historis sintetik & pelatihan Random Forest
│   ├── pyproject.toml                 # Konfigurasi proyek Python Data Science
│   ├── requirements.txt               # Daftar dependensi Python Data Science
│   ├── test_pipeline.py               # Pengujian validasi pipeline dataset & evaluasi model
│   ├── data/                          # Tempat penyimpanan dataset CSV
│   │   └── historical_demand.csv      # Dataset historis harian permintaan servis AC (365 record)
│   └── models/                        # Serialisasi model prediksi permintaan
│       ├── demand_model.pkl           # Artefak model dasar
│       └── demand_model_v2.pkl        # Artefak model Random Forest v2.0 ber-metadata
│
└── frontend/                          # Aplikasi Antarmuka Web (React 19 + Vite)
    ├── .env.example                   # Template konfigurasi environment frontend
    ├── eslint.config.js               # Konfigurasi linter JavaScript frontend
    ├── index.html                     # HTML host entry point
    ├── package.json                   # Dependensi & skrip eksekusi frontend
    ├── package-lock.json              # Lockfile dependensi npm frontend
    ├── tailwind.config.js             # Konfigurasi Tailwind CSS
    ├── vite.config.js                 # Konfigurasi Vite dev server, proxy, & plugins
    ├── public/                        # Aset statis publik
    └── src/                           # Source code frontend
        ├── App.jsx                    # Routing aplikasi React Router
        ├── AuthContext.jsx            # State context user, token, & konfirmasi logout
        ├── api.js                     # Klien Axios dengan interceptor token & anti-cache
        ├── index.css                  # Desain tema, token warna Tailwind v4, & font Inter
        ├── main.jsx                   # React DOM root render
        ├── components/                # Komponen antarmuka modular
        │   ├── ChatbotWidget.jsx      # Widget chat bot asisten cerdas
        │   ├── CompanyLogo.jsx        # Komponen logo SVG/identitas CV. Nara Teknindotama
        │   ├── OfficialInvoicePaper.jsx # Komponen cetak invoice resmi standar A4
        │   ├── admin/                 # Komponen khusus admin (modal create booking, dll)
        │   ├── booking/               # Komponen pemilihan alamat berjenjang Jabodetabek
        │   ├── landing/               # Komponen pendukung halaman landing (FAQ, Hero, TrustBar)
        │   ├── layout/                # Layout shell, sidebar responsif, & bottom nav
        │   └── ui/                    # Primitif UI (Button, Card, Input, Badge, Toast, Dialog)
        ├── data/                      # Dataset statis client-side
        │   └── regionsData.js         # Data wilayah operasional Jabodetabek & kode pos
        ├── lib/
        │   └── utils.js               # Utilitas penggabungan kelas Tailwind (cn, clsx)
        ├── pages/                     # Tampilan halaman utama
        │   ├── AdminDashboard.jsx     # Shell router portal administrator
        │   ├── BookingPage.jsx        # Formulir pendaftaran servis mandiri
        │   ├── FeedbackPage.jsx       # Formulir ulasan bintang & kepuasan
        │   ├── LandingPage.jsx        # Beranda utama publik & katalog paket
        │   ├── LoginPage.jsx          # Halaman masuk sistem terpadu
        │   ├── StatusPage.jsx         # Pelacak status pengerjaan tiket publik
        │   ├── TechnicianDashboard.jsx# Konsol kerja teknisi harian
        │   ├── TechnicianJobDetail.jsx# Halaman eksekusi detail pekerjaan & SOP checklist
        │   ├── admin/                 # Sub-halaman admin (Bookings, Customers, Invoices, dll)
        │   └── customer/              # Sub-halaman portal pelanggan (My AC, History, Dashboard)
        └── utils/
            └── errors.js              # Parser pesan error API terstandardisasi
```

---

## 6. Dokumentasi Frontend

### 6.1 Struktur & Routing
Frontend dibangun menggunakan **React 19** dengan bundler **Vite** dan **React Router DOM 7**. Rute didistribusikan secara modular:

| Rute Path | Komponen Halaman | Akses | Fungsi / Deskripsi |
|---|---|---|---|
| `/` | `LandingPage.jsx` | Publik | Beranda resmi, pengenalan layanan, garansi, FAQ, katalog paket |
| `/booking` | `BookingPage.jsx` | Publik / Terotentikasi | Form booking servis, penentuan unit AC, selector alamat presisi |
| `/status/:kode?` | `StatusPage.jsx` | Publik | Pelacakan status pengerjaan via tiket kode booking (`AC-XXXX`) |
| `/feedback/:kode` | `FeedbackPage.jsx` | Publik | Input rating (1-5) dan ulasan pelanggan terhadap order selesai |
| `/login` | `LoginPage.jsx` | Publik | Autentikasi masuk pengguna (Admin, Teknisi, Customer) |
| `/customer/*` | `CustomerPortal.jsx` | Khusus Role `customer` | Shell portal pelanggan dengan navigasi internal: |
| ↳ `/customer/dashboard` | `CustomerDashboard.jsx` | Role `customer` | Ringkasan servis aktif, total AC, dan pengingat servis |
| ↳ `/customer/ac-units` | `CustomerAcUnits.jsx` | Role `customer` | Inventarisasi unit AC pelanggan (tambah, edit, hapus) |
| ↳ `/customer/history` | `CustomerHistory.jsx` | Role `customer` | Riwayat seluruh pekerjaan servis yang pernah dilakukan |
| `/technician` | Redirect -> `/technician/dashboard` | Role `technician` | Navigasi otomatis ke konsol teknisi |
| `/technician/dashboard` | `TechnicianDashboard.jsx` | Role `technician` | Ringkasan tugas hari ini, kartu pekerjaan aktif, & ketersediaan |
| `/technician/jobs` | `TechnicianDashboard.jsx` | Role `technician` | Filter daftar tugas (hari ini, mendatang, riwayat selesai) |
| `/technician/schedule` | `TechnicianDashboard.jsx` | Role `technician` | Kalender jadwal penugasan mingguan teknisi |
| `/technician/profile` | `TechnicianDashboard.jsx` | Role `technician` | Profil dan pengaturan hari ketersediaan/libur |
| `/technician/jobs/:id` | `TechnicianJobDetail.jsx` | Role `technician` & `admin` | Halaman eksekusi SOP, upload foto before/after, catat material |
| `/admin/*` | `AdminDashboard.jsx` | Khusus Role `admin` | Shell portal administrator dengan rute sub-halaman: |
| ↳ `/admin/` | `AdminHome.jsx` | Role `admin` | Ringkasan operasional harian, quick actions, status terkini |
| ↳ `/admin/bookings` | `AdminBookings.jsx` | Role `admin` | Manajemen seluruh order, penugasan teknisi, modal create |
| ↳ `/admin/customers/*` | `AdminCustomers.jsx` | Role `admin` | CRUD pelanggan, kartu profil, generator akun pengguna |
| ↳ `/admin/ac-units` | `AdminACUnits.jsx` | Role `admin` | Pemantauan seluruh unit AC pelanggan di sistem |
| ↳ `/admin/technicians/*` | `AdminTechnicians.jsx` | Role `admin` | CRUD teknisi, monitoring beban kerja, pengaturan ketersediaan |
| ↳ `/admin/invoices` | `AdminInvoices.jsx` | Role `admin` | Pembuatan, pencarian, dan cetak invoice resmi perusahaan |
| ↳ `/admin/services` | `AdminServices.jsx` | Role `admin` | CRUD katalog harga jasa servis dan interval maintenance |
| ↳ `/admin/feedback` | `AdminFeedback.jsx` | Role `admin` | Rekapitulasi penilaian dan komplain kepuasan pelanggan |
| ↳ `/admin/inventory` | `AdminInventory.jsx` | Role `admin` | Pemantauan stok sparepart, pencatatan mutasi/penyesuaian |
| ↳ `/admin/schedule` | `AdminSchedule.jsx` | Role `admin` | Kalender jadwal terpadu, rekomendasi teknisi, deteksi bentrok |
| ↳ `/admin/reports` | `AdminReports.jsx` | Role `admin` | Laporan servis terstruktur per work order |
| ↳ `/admin/analytics` | `AdminAnalytics.jsx` | Role `admin` | Grafik tren pendapatan, popularitas jasa, performa teknisi |
| ↳ `/admin/settings` | `AdminSettings.jsx` | Role `admin` | Konfigurasi jam kerja, profil UMKM, rekening pembayaran |
| ↳ `/admin/notifications` | `AdminNotifications.jsx` | Role `admin` | Manajemen pengumuman dan riwayat notifikasi sistem |

### 6.2 State Management & Autentikasi
Manajemen status global dikelola secara terpusat oleh `AuthContext.jsx`:
- Menyimpan entitas `user` (`id`, `nama`, `email`, `role`, `technician_id`, `customer_id`) dan `token`.
- Sinkronisasi persistensi ganda: membaca token dari cookie HttpOnly `nara_token` dengan fallback ke `localStorage` (`nara_token`, `nara_user`).
- Menyediakan alur konfirmasi keluar sistem: `confirmLogout()` memunculkan dialog modal `LogoutConfirmation.jsx` sebelum `executeLogout()` memanggil endpoint backend `/api/v1/auth/logout`.
- Mendengarkan event jendela `auth-expired` (dipicu saat menerima respon HTTP 401) untuk membersihkan sesi dan mengarahkan kembali ke `/login`.

### 6.3 API Client & Interceptor
Dikonfigurasi di `frontend/src/api.js`:
- Base URL membaca variabel lingkungan `import.meta.env.VITE_API_URL` (default: `http://localhost:4000/api/v1`).
- Pengaturan `withCredentials: true` diaktifkan agar browser menyertakan cookie `nara_token` secara otomatis.
- **Request Interceptor:** Menyematkan header `Authorization: Bearer <token>` dan menyuntikkan parameter anti-cache `_t=Date.now()` pada seluruh permintaan `GET`.
- **Response Interceptor:** Mengembalikan `response.data` secara langsung dan meneruskan error jaringan secara terstruktur.
- **Helper `apiWithCsrf(csrfToken)`:** Pabrik instance Axios khusus untuk menyematkan header `X-CSRF-Token` pada operasi pengubah data (`POST`, `PUT`, `PATCH`, `DELETE`).

### 6.4 Pola Desain & Komponen UI
- Menggunakan Tailwind CSS v4 dengan palet warna khusus `brand-blue` (`#2563eb`), slate dark background, dan efek glassmorphism (`.glass`, `.glass-dark`).
- Komponen terpisah di `src/components/ui/` mencakup `button`, `input`, `card`, `badge`, `toast`, dan `ErrorBoundary`.
- Widget Chatbot (`ChatbotWidget.jsx`) tersemat melayang di pojok kanan bawah, dilengkapi transisi animasi smooth, render tombol quick reply, serta pengarah rute aksi (seperti langsung membuka halaman booking).
- Komponen Faktur Tagihan (`OfficialInvoicePaper.jsx`) dirancang khusus dengan ukuran kertas A4 presisi untuk siap dicetak melalui printer fisik atau disimpan sebagai PDF.

---

## 7. Dokumentasi Backend

### 7.1 Arsitektur Layer & Lifecycle Request
Backend mengimplementasikan pemisahan tanggung jawab yang tegas:
1. **Routing Layer (`src/routes/`):** Menerima request HTTP, mendefinisikan skema validasi Joi, dan memanggil fungsi service yang sesuai.
2. **Middleware Layer (`src/middleware/`):** Menangani autentikasi JWT, pemeriksaan izin role (RBAC), proteksi CSRF, dan penangkapan error.
3. **Service Layer (`src/services/`):** Pusat aturan bisnis (business logic). Menangani algoritma pemilihan teknisi, transisi status booking, integrasi AI, serta audit log.
4. **Data Access Layer (`src/db/pool.js`):** Mengelola koneksi PostgreSQL melalui `pg.Pool` dan menyediakan utilitas transaksi aman `withTx(callback)`.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Frontend Client
    participant Express as Express App (app.js)
    participant MW as Auth & Joi Middleware
    participant Route as Router Handler
    participant Svc as Domain Service
    participant DB as PostgreSQL (withTx)

    Client->>Express: HTTP Request (Headers + Cookies)
    Express->>MW: Request Validation & Token Verify
    alt Validasi Gagal / Token Tidak Sah
        MW-->>Client: 401 Unauthorized / 422 Unprocessable Entity
    else Validasi Berhasil
        MW->>Route: Meneruskan req.user & req.valid
        Route->>Svc: Eksekusi Operasi Bisnis
        Svc->>DB: BEGIN Transaction
        DB-->>Svc: Query Execution
        Svc->>DB: COMMIT & Catat Audit Log
        Svc-->>Route: Return Result Object
        Route-->>Client: HTTP 200/201 JSON Response
    end
```

### 7.2 Middleware Stack
Dikonfigurasi di `backend/src/app.js`:
- `helmet()`: Mengamankan HTTP response headers.
- `cookieParser()`: Membaca cookie HTTP dari browser (termasuk `nara_token`).
- `cors()`: Konfigurasi whitelist origin dengan validasi `credentials: true`.
- `express.json({ limit: '50kb' })`: Membatasi ukuran payload JSON untuk mencegah serangan memory exhaustion.
- `rateLimit()`: Batasan umum 600 request per menit per IP. Pada endpoint pemesanan publik dan AI, diterapkan batasan lebih ketat (30–40 request per menit).
- `requestLogger`: Menyematkan `correlation-id` unik pada setiap request dan mencatat durasi respon ke log konsol.
- `requireAuth(roles)`: Memastikan request memiliki token valid dan role sesuai hak akses.
- `csrfProtection`: Memvalidasi keberadaan dan kesesuaian token `X-CSRF-Token` untuk request mutasi.

### 7.3 Service Layer & Business Rules
Aturan bisnis utama yang ditegakkan pada service layer:
- **Aturan Slot Waktu & Jam Operasional (`bookingService.js`):** Booking hanya dapat dibuat di dalam rentang jam operasional (default: 08:00 - 17:00 WIB) dan tidak boleh pada hari libur yang ditentukan di tabel `settings`.
- **Deteksi Konflik Penugasan (`workflowService.js`):** Teknisi tidak dapat ditugaskan jika pada jadwal tersebut sudah memiliki pekerjaan aktif lain yang beririsan atau jika teknisi berstatus `off`/`busy` di tabel `technician_availability`.
- **Mesin State Siklus Booking:** Status booking mengikuti alur:  
  `scheduled` ➔ `on process` ➔ `done`  
  Order dapat berpindah ke `rescheduled` (perubahan jam), `delayed` (penundaan pekerjaan dengan alasan terdokumentasi), atau `cancelled` (pembatalan).
- **Integritas Inventori Otomatis:** Setiap kali teknisi mencatat penggunaan suku cadang (`inventory_usage`), sistem secara atomik memotong stok fisik di tabel `inventory` dan mencatat entri riwayat di `inventory_adjustments`.

### 7.4 Error Handling & Audit Trail
- Menggunakan taksonomi kelas error terpusat (`src/errors.js`):
  - `E.validation(message, fields)` ➔ HTTP 422
  - `E.unauthorized(message)` ➔ HTTP 401
  - `E.forbidden(message)` ➔ HTTP 403
  - `E.notFound(message)` ➔ HTTP 404
  - `E.conflict(message, detail)` ➔ HTTP 409
  - `E.business(message, detail)` ➔ HTTP 422
  - `E.unavailable(message, detail)` ➔ HTTP 503
- Seluruh mutasi kritis (pergantian jadwal, alokasi teknisi, perubahan status, update profil) mewajibkan pemanggilan fungsi `audit()` yang mencatat data sebelum (*before*) dan sesudah (*after*) ke tabel `audit_logs`.

---

## 8. API Reference

### 8.1 Daftar Endpoint Lengkap
Seluruh endpoint di bawah ini terdaftar secara faktual pada router backend (`/api/v1`):

#### A. Autentikasi (`/api/v1/auth`)
| Method | Endpoint | Access | Purpose | Request / Response Reference |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Masuk ke sistem, mengembalikan token JWT dan set cookie `nara_token` | Body: `{ email, password }` ➔ 200 `{ token, user }` |
| `POST` | `/api/v1/auth/register` | Public | Pendaftaran akun baru customer mandiri | Body: `{ nama, email, password, kontak, alamat }` ➔ 201 `{ token, user }` |
| `GET` | `/api/v1/auth/me` | Authenticated | Mendapatkan profil akun yang sedang login | Headers/Cookie ➔ 200 `{ user: {...} }` |
| `PATCH` | `/api/v1/auth/profile` | Authenticated | Memperbarui nama, email, dan nomor telepon akun | Body: `{ nama, email, kontak }` ➔ 200 `{ user, message }` |
| `PATCH` | `/api/v1/auth/password` | Authenticated | Mengubah password akun dengan validasi password lama | Body: `{ current_password, new_password }` ➔ 200 `{ ok: true }` |
| `GET` | `/api/v1/auth/csrf-token` | Authenticated | Mendapatkan token CSRF unik berumur 15 menit | Headers/Cookie ➔ 200 `{ csrfToken: string }` |
| `POST` | `/api/v1/auth/logout` | Authenticated | Keluar sistem, menghapus cookie `nara_token` & invalidasi CSRF | Headers/Cookie ➔ 200 `{ success: true }` |

#### B. Portal Customer (`/api/v1/customer`)
| Method | Endpoint | Access | Purpose | Request / Response Reference |
|---|---|---|---|---|
| `GET` | `/api/v1/customer/ac-units` | Customer | Daftar seluruh unit AC milik customer | Query: `aktif, page, limit` ➔ 200 `{ data, meta }` |
| `POST` | `/api/v1/customer/ac-units` | Customer | Mendaftarkan unit AC baru | Body: `{ brand, model, tipe, kapasitas_pk, lokasi, nomor_seri, ... }` ➔ 201 `{ data }` |
| `PATCH` | `/api/v1/customer/ac-units/:id` | Customer | Memperbarui data unit AC | Params: `id`, Body: `unitFields` ➔ 200 `{ data }` |
| `DELETE` | `/api/v1/customer/ac-units/:id` | Customer | Menonaktifkan (soft delete) unit AC | Params: `id` ➔ 200 `{ success: true }` |
| `GET` | `/api/v1/customer/history` | Customer | Riwayat pemesanan servis customer | Query: `page, limit` ➔ 200 `{ data, meta }` |
| `GET` | `/api/v1/customer/notifications` | Customer | Mengambil daftar notifikasi akun customer | Query: `limit, page, unread` ➔ 200 `{ data, meta }` |
| `PATCH` | `/api/v1/customer/notifications/:id/read` | Customer | Menandai notifikasi telah dibaca | Params: `id` ➔ 200 `{ success: true }` |
| `POST` | `/api/v1/customer/notifications/read-all` | Customer | Menandai semua notifikasi customer telah dibaca | Headers/Cookie ➔ 200 `{ success: true }` |
| `GET` | `/api/v1/customer/dashboard` | Customer | Ringkasan metrik dashboard portal customer | Headers/Cookie ➔ 200 `{ data: { active_bookings, ac_units_count, ... } }` |

#### C. Pemesanan & Alur Publik (`/api/v1`)
| Method | Endpoint | Access | Purpose | Request / Response Reference |
|---|---|---|---|---|
| `GET` | `/api/v1/services` | Public | Daftar katalog layanan servis aktif & jam operasional | Query: `aktif` ➔ 200 `{ data, jam_operasional }` |
| `GET` | `/api/v1/availability` | Public | Cek ketersediaan slot teknisi pada tanggal & layanan tertentu | Query: `tanggal, layanan_id` ➔ 200 `{ tanggal, slots: [...] }` |
| `GET` | `/api/v1/public/bookings/:kode` | Public | Cek status pengerjaan tiket publik dengan kode booking | Params: `kode` (misal `AC-A1B2`) ➔ 200 `{ booking }` |
| `PATCH` | `/api/v1/public/bookings/:kode/reschedule` | Public | Ubah jadwal mandiri oleh pelanggan publik | Params: `kode`, Body: `{ jadwal_mulai, kontak }` ➔ 200 `{ data }` |
| `PATCH` | `/api/v1/public/bookings/:kode/cancel` | Public | Batalkan pesanan mandiri oleh pelanggan publik | Params: `kode`, Body: `{ kontak, alasan }` ➔ 200 `{ data }` |
| `POST` | `/api/v1/bookings/:id/feedback` | Public | Kirim penilaian bintang dan ulasan untuk booking selesai | Params: `id`, Body: `{ kode_booking, kontak, rating, komentar }` ➔ 201 `{ data }` |
| `POST` | `/api/v1/bookings` | Public / Optional Auth | Buat pesanan baru (pelanggan publik atau admin) | Body: `{ nama, kontak, layanan_id, jadwal_mulai, alamat, keluhan, jumlah_unit }` ➔ 201 `{ id, kode_booking, ... }` |
| `GET` | `/api/v1/bookings` | Admin / Technician | Daftar seluruh booking dengan filter pencarian | Query: `q, status, teknisi_id, dari, sampai, page, limit` ➔ 200 `{ data, meta }` |
| `GET` | `/api/v1/bookings/:id` | Admin / Technician | Detail data booking lengkap | Params: `id` ➔ 200 `{ booking }` |
| `PATCH` | `/api/v1/bookings/:id/schedule` | Admin | Menjadwalkan ulang booking oleh admin | Params: `id`, Body: `{ jadwal_mulai }` ➔ 200 `{ booking }` |
| `PATCH` | `/api/v1/bookings/:id/assign` | Admin | Menugaskan teknisi ke booking tertentu | Params: `id`, Body: `{ teknisi_id }` ➔ 200 `{ booking }` |
| `PATCH` | `/api/v1/bookings/:id/status` | Admin / Technician | Mengubah status umum pekerjaan | Params: `id`, Body: `{ status, catatan }` ➔ 200 `{ booking }` |
| `POST` | `/api/v1/bookings/:id/inventory-usage` | Admin / Technician | Mencatat pemakaian suku cadang pada booking | Params: `id`, Body: `{ item_id, jumlah, catatan }` ➔ 201 `{ data }` |
| `GET` | `/api/v1/feedback` | Admin | Mengambil daftar ulasan dan rating pelanggan | Query: `limit, page` ➔ 200 `{ data, meta }` |

#### D. Data Master & Pengaturan (`/api/v1`)
| Method | Endpoint | Access | Purpose | Request / Response Reference |
|---|---|---|---|---|
| `GET` | `/api/v1/customers` | Admin | Daftar seluruh pelanggan terdaftar | Query: `q, aktif, page, limit` ➔ 200 `{ data, meta }` |
| `POST` | `/api/v1/customers` | Admin | Menambahkan data master pelanggan | Body: `{ nama, kontak, alamat, catatan_umum }` ➔ 201 `{ customer }` |
| `PATCH` | `/api/v1/customers/:id` | Admin | Memperbarui informasi pelanggan | Params: `id`, Body: `custPatch` ➔ 200 `{ customer }` |
| `GET` | `/api/v1/technicians` | Admin | Mengambil daftar seluruh teknisi | Query: `q, aktif, page, limit` ➔ 200 `{ data, meta }` |
| `POST` | `/api/v1/technicians` | Admin | Mendaftarkan teknisi baru | Body: `{ nama, kontak, catatan }` ➔ 201 `{ technician }` |
| `PATCH` | `/api/v1/technicians/:id` | Admin | Memperbarui profil teknisi | Params: `id`, Body: `techPatch` ➔ 200 `{ technician }` |
| `DELETE` | `/api/v1/technicians/:id` | Admin | Menonaktifkan teknisi | Params: `id` ➔ 200 `{ technician }` |
| `GET` | `/api/v1/inventory` | Admin | Daftar seluruh item inventori | Query: `q, aktif, page, limit` ➔ 200 `{ data, meta }` |
| `POST` | `/api/v1/inventory` | Admin | Menambah item suku cadang baru | Body: `{ nama, kategori, stok, satuan, min_stok }` ➔ 201 `{ item }` |
| `PATCH` | `/api/v1/inventory/:id` | Admin | Memperbarui informasi suku cadang | Params: `id`, Body: `invPatch` ➔ 200 `{ item }` |
| `GET` | `/api/v1/service-catalog` | Public | Daftar katalog layanan servis | Query: `aktif` ➔ 200 `{ data }` |
| `POST` | `/api/v1/service-catalog` | Admin | Menambah layanan servis baru | Body: `{ kode, nama_layanan, kategori, deskripsi, harga, durasi_menit }` ➔ 201 `{ data }` |
| `PATCH` | `/api/v1/service-catalog/:id` | Admin | Mengubah katalog layanan servis | Params: `id`, Body: `svcPatch` ➔ 200 `{ data }` |
| `GET` | `/api/v1/settings/operating-hours` | Public | Jam operasional dan hari libur sistem | Headers/Cookie ➔ 200 `{ buka, tutup, hari_libur }` |
| `PUT` | `/api/v1/settings/operating-hours` | Admin | Mengubah jam dan hari operasional | Body: `{ buka, tutup, hari_libur }` ➔ 200 `{ success: true }` |
| `GET` | `/api/v1/settings/payment-accounts` | Public | Daftar rekening bank / QRIS pembayaran | Headers/Cookie ➔ 200 `{ accounts: [...] }` |
| `PUT` | `/api/v1/settings/payment-accounts` | Admin | Memperbarui rekening pembayaran resmi | Body: `{ accounts }` ➔ 200 `{ accounts }` |
| `GET` | `/api/v1/settings/business-profile` | Public | Profil identitas UMKM (CV. Nara Teknindotama) | Headers/Cookie ➔ 200 `{ profile }` |
| `PUT` | `/api/v1/settings/business-profile` | Admin | Memperbarui profil UMKM resmi | Body: `{ nama_perusahaan, alamat, kontak, email, ... }` ➔ 200 `{ profile }` |

#### E. Operasional, AI, & Analitik (`/api/v1`)
| Method | Endpoint | Access | Purpose | Request / Response Reference |
|---|---|---|---|---|
| `GET` | `/api/v1/reminders` | Admin / Technician | Daftar log pengingat otomatis (H-1) | Query: `tanggal, status, target, booking_id, limit` ➔ 200 `{ data }` |
| `POST` | `/api/v1/reminders/run` | Admin | Memicu eksekusi pengingat secara manual | Headers/Cookie ➔ 200 `{ terkirim, gagal, log }` |
| `POST` | `/api/v1/reminders/:id/retry` | Admin | Mencoba ulang pengiriman pengingat yang gagal | Params: `id` ➔ 200 `{ result }` |
| `GET` | `/api/v1/tickets` | Admin | Daftar tiket keluhan dari chatbot AI | Headers/Cookie ➔ 200 `{ data: [...] }` |
| `PATCH` | `/api/v1/tickets/:id` | Admin | Mengubah status tiket keluhan (`open` / `closed`) | Params: `id`, Body: `{ status }` ➔ 200 `{ ticket }` |
| `POST` | `/api/v1/ai/predict-intent` | Authenticated | Klasifikasi intensi pesan tanpa context handler | Body: `{ text }` ➔ 200 `{ intent, confidence, fallback }` |
| `POST` | `/api/v1/ai/answer` | Authenticated | Obrolan terpadu chatbot AI dengan context memory | Body: `{ text }` ➔ 200 `{ jawaban, saran, quick_replies, ... }` |
| `GET` | `/api/v1/ai/status` | Admin | Pemeriksaan ketersediaan koneksi ke AI service | Headers/Cookie ➔ 200 `{ tersedia: true/false, ... }` |
| `GET` | `/api/v1/inference-logs` | Admin | Memeriksa riwayat inferensi & latensi model AI | Query: `limit` ➔ 200 `{ data: [...] }` |
| `GET` | `/api/v1/analytics/summary` | Admin | Agregasi metrik analitik bisnis periode tanggal | Query: `dari, sampai` ➔ 200 `{ total_pendapatan, total_booking, ... }` |
| `GET` | `/api/v1/predictions/latest` | Admin | Mengambil data output prediksi demand forecasting | Headers/Cookie ➔ 200 `{ target, nilai_prediksi, batas_bawah, ... }` |

#### F. Konsol Kerja Teknisi (`/api/v1/technician`)
| Method | Endpoint | Access | Purpose | Request / Response Reference |
|---|---|---|---|---|
| `GET` | `/api/v1/technician/dashboard` | Technician | Dashboard ringkasan pekerjaan teknisi hari ini | Query: `tanggal` ➔ 200 `{ ringkasan, pekerjaan_hari_ini, ... }` |
| `GET` | `/api/v1/technician/jobs` | Technician | Daftar pekerjaan teralokasi dengan cakupan filter | Query: `scope ('today'/'upcoming'/'done'/'all'), q, page, limit` ➔ 200 `{ data, meta }` |
| `GET` | `/api/v1/technician/inventory` | Technician | Memeriksa ketersediaan stok material di gudang | Headers/Cookie ➔ 200 `{ data: [...] }` |
| `GET` | `/api/v1/technician/jobs/:id` | Technician / Admin | Detail work order, checklist SOP, foto, dan material | Params: `id` ➔ 200 `{ job }` |
| `PATCH` | `/api/v1/technician/jobs/:id/start` | Technician / Admin | Mulai pengerjaan order (status -> `on process`) | Params: `id` ➔ 200 `{ job }` |
| `PATCH` | `/api/v1/technician/jobs/:id/complete` | Technician / Admin | Selesaikan pekerjaan (status -> `done`, kunci checklist) | Params: `id`, Body: `{ override_alasan }` ➔ 200 `{ job }` |
| `POST` | `/api/v1/technician/jobs/:id/delay` | Technician / Admin | Laporkan penundaan pekerjaan dengan kategori kendala | Params: `id`, Body: `{ kategori, alasan }` ➔ 200 `{ job }` |
| `POST` | `/api/v1/technician/jobs/:id/checklist` | Technician / Admin | Tambah butir tugas checklist SOP baru | Params: `id`, Body: `{ task, wajib }` ➔ 201 `{ checklist }` |
| `PATCH` | `/api/v1/technician/jobs/:id/checklist/:cid` | Technician / Admin | Perbarui status butir SOP (`completed`, `skipped`) | Params: `id, cid`, Body: `{ status, alasan_skip }` ➔ 200 `{ data }` |
| `PUT` | `/api/v1/technician/jobs/:id/work-order` | Technician / Admin | Simpan diagnosis kerusakan & catatan rekomendasi teknisi | Params: `id`, Body: `{ diagnosis, rekomendasi, catatan }` ➔ 200 `{ data }` |
| `POST` | `/api/v1/technician/jobs/:id/photos` | Technician / Admin | Unggah bukti foto pengerjaan fisik (`before`/`after`) | Multipart: `file, tipe, catatan` ➔ 201 `{ photo }` |
| `DELETE` | `/api/v1/technician/jobs/:id/photos/:pid` | Technician / Admin | Menghapus bukti foto pekerjaan fisik | Params: `id, pid` ➔ 200 `{ ok: true }` |
| `POST` | `/api/v1/technician/jobs/:id/materials` | Technician / Admin | Input pemakaian sparepart & otomatis memotong stok | Params: `id`, Body: `{ item_id, jumlah, catatan }` ➔ 201 `{ data }` |
| `POST` | `/api/v1/technician/jobs/:id/notes` | Technician / Admin | Tambahkan catatan status riwayat pengerjaan | Params: `id`, Body: `{ catatan }` ➔ 201 `{ log }` |
| `GET` | `/api/v1/technician/availability` | Technician | Mengambil status ketersediaan/libur diri sendiri | Query: `limit` ➔ 200 `{ data: [...] }` |
| `PUT` | `/api/v1/technician/availability` | Technician | Memperbarui status ketersediaan tanggal (`available`/`busy`/`off`) | Body: `{ tanggal, status, catatan }` ➔ 200 `{ data }` |
| `GET` | `/api/v1/technician/schedule` | Technician | Kalender rentang pekerjaan yang dijadwalkan | Query: `dari, sampai` ➔ 200 `{ data }` |

#### G. Konsol Manajemen Admin (`/api/v1/admin`)
| Method | Endpoint | Access | Purpose | Request / Response Reference |
|---|---|---|---|---|
| `GET` | `/api/v1/admin/dashboard/summary` | Admin | Ringkasan metrik dashboard operasional 7 / 30 hari | Query: `hari (7/30)` ➔ 200 `{ data }` |
| `GET` | `/api/v1/admin/dashboard/kpi` | Admin | Metrik performa kunci (pendapatan, rating, per status) | Headers/Cookie ➔ 200 `{ data }` |
| `GET` | `/api/v1/admin/customers` | Admin | Daftar pelanggan dengan jumlah unit AC & total booking | Query: `q, aktif, page, limit` ➔ 200 `{ data, meta }` |
| `GET` | `/api/v1/admin/customers/:id` | Admin | Detail pelanggan beserta seluruh unit AC & riwayat order | Params: `id` ➔ 200 `{ data }` |
| `POST` | `/api/v1/admin/customers` | Admin | Menambah pelanggan baru dari admin | Body: `{ nama, kontak, alamat, ... }` ➔ 201 `{ customer }` |
| `PATCH` | `/api/v1/admin/customers/:id` | Admin | Memperbarui informasi pelanggan | Params: `id`, Body: `custFields` ➔ 200 `{ customer }` |
| `POST` | `/api/v1/admin/customers/:id/account` | Admin | Membuatkan akun login pengguna untuk pelanggan | Params: `id`, Body: `{ email, password }` ➔ 201 `{ ok: true }` |
| `GET` | `/api/v1/admin/ac-units` | Admin | Daftar seluruh unit AC terdaftar di sistem | Query: `q, customer_id, page, limit` ➔ 200 `{ data, meta }` |
| `GET` | `/api/v1/admin/ac-units/:id` | Admin | Detail spesifikasi fisik unit AC | Params: `id` ➔ 200 `{ data }` |
| `POST` | `/api/v1/admin/ac-units` | Admin | Mendaftarkan unit AC milik pelanggan | Body: `{ customer_id, brand, lokasi, ... }` ➔ 201 `{ data }` |
| `PATCH` | `/api/v1/admin/ac-units/:id` | Admin | Mengubah data spesifikasi unit AC | Params: `id`, Body: `unitFields` ➔ 200 `{ data }` |
| `DELETE` | `/api/v1/admin/ac-units/:id` | Admin | Menonaktifkan data unit AC | Params: `id` ➔ 200 `{ success: true }` |
| `GET` | `/api/v1/admin/technicians/:id` | Admin | Detail performa teknisi, pekerjaan berjalan, & riwayat | Params: `id` ➔ 200 `{ data }` |
| `GET` | `/api/v1/admin/technicians/:id/workload` | Admin | Beban kerja harian teknisi | Params: `id` ➔ 200 `{ workload }` |
| `POST` | `/api/v1/admin/technicians/:id/availability` | Admin | Menetapkan ketersediaan/cuti teknisi oleh admin | Params: `id`, Body: `{ tanggal, status, catatan }` ➔ 200 `{ data }` |
| `GET` | `/api/v1/admin/schedule` | Admin | Kalender jadwal operasional seluruh teknisi | Query: `dari, sampai` ➔ 200 `{ data }` |
| `GET` | `/api/v1/admin/schedule/conflicts` | Admin | Mendeteksi jadwal bentrok antar-teknisi | Headers/Cookie ➔ 200 `{ data: [...] }` |
| `GET` | `/api/v1/admin/schedule/recommendation` | Admin | Rekomendasi teknisi paling cocok untuk slot waktu | Query: `jadwal_mulai, jadwal_selesai` ➔ 200 `{ data: [...] }` |
| `PATCH` | `/api/v1/admin/bookings/:id/assign` | Admin | Menugaskan teknisi terpilih ke booking | Params: `id`, Body: `{ teknisi_id }` ➔ 200 `{ booking }` |
| `PATCH` | `/api/v1/admin/bookings/:id/reschedule` | Admin | Menjadwalkan ulang jadwal pengerjaan booking | Params: `id`, Body: `{ jadwal_mulai, alasan }` ➔ 200 `{ booking }` |
| `PATCH` | `/api/v1/admin/bookings/:id/cancel` | Admin | Membatalkan booking dengan menyertakan alasan | Params: `id`, Body: `{ alasan }` ➔ 200 `{ booking }` |
| `PATCH` | `/api/v1/admin/bookings/:id/delay` | Admin | Menandai penundaan pekerjaan dengan alasan | Params: `id`, Body: `{ alasan }` ➔ 200 `{ booking }` |
| `GET` | `/api/v1/admin/bookings/:id/history` | Admin | Riwayat kronologis log status & audit booking | Params: `id` ➔ 200 `{ data: { status_log, schedule_history, audit_logs } }` |
| `GET` | `/api/v1/admin/bookings/:id/report` | Admin | Mengambil berkas laporan servis resmi terstruktur | Params: `id` ➔ 200 `{ data: { service_report, work_order, photos, ... } }` |
| `GET` | `/api/v1/admin/inventory` | Admin | Daftar inventori dengan status stok (`ok`, `low`, `out`) | Query: `q, status` ➔ 200 `{ data: [...] }` |
| `GET` | `/api/v1/admin/inventory/movements` | Admin | Rekapitulasi pergerakan mutasi stok inventori | Query: `item_id, jenis ('in'/'out'/'adjustment'/'usage'), page, limit` ➔ 200 `{ data, meta }` |
| `POST` | `/api/v1/admin/inventory/:id/adjust` | Admin | Penyesuaian stok manual (tambah/kurang/koreksi) | Params: `id`, Body: `{ delta, alasan, jenis }` ➔ 200 `{ data }` |
| `POST` | `/api/v1/admin/inventory` | Admin | Menambah sparepart baru dari portal admin | Body: `{ nama, kategori, stok, satuan, min_stok }` ➔ 201 `{ data }` |
| `PATCH` | `/api/v1/admin/inventory/:id` | Admin | Memperbarui spesifikasi inventori | Params: `id`, Body: `invFields` ➔ 200 `{ data }` |
| `GET` | `/api/v1/admin/audit-logs` | Admin | Meninjau rekaman jejak audit sistem | Query: `action, entity, limit, page` ➔ 200 `{ data, meta }` |
| `GET` | `/api/v1/admin/notifications` | Admin | Mengambil notifikasi admin | Query: `unread, page, limit` ➔ 200 `{ data, meta }` |
| `PATCH` | `/api/v1/admin/notifications/:id/read` | Admin | Menandai notifikasi admin terbaca | Params: `id` ➔ 200 `{ success: true }` |
| `PATCH` | `/api/v1/admin/notifications/read-all` | Admin | Menandai seluruh notifikasi admin terbaca | Headers/Cookie ➔ 200 `{ success: true }` |
| `GET` | `/api/v1/admin/feedback` | Admin | Rekap rating dan analisis sentimen kepuasan | Query: `rating, page, limit` ➔ 200 `{ data, meta }` |

#### H. Sistem & Berkas Statis (`/api/v1`)
| Method | Endpoint | Access | Purpose | Request / Response Reference |
|---|---|---|---|---|
| `GET` | `/health` | Public | Pemeriksaan kesehatan menyeluruh dependensi sistem | Headers ➔ 200/503 `{ status, dependencies: { database, ai_service } }` |
| `GET` | `/health-simple` | Public | Pemeriksaan sederhana ketersediaan database | Headers ➔ 200/503 `{ status: 'ok', uptime_s: ... }` |
| `GET` | `/api/v1/files/:name` | Public / Verified | Mengambil berkas foto fisik pengerjaan teknisi | Params: `name` ➔ File Stream Binary (JPEG/PNG) |
| `GET` | `/api/docs` | Public | Dokumentasi interaktif Swagger UI | Browser View |
| `GET` | `/api/openapi.json` | Public | Raw JSON kontrak spesifikasi OpenAPI | JSON Specification |

---

### 8.2 Spesifikasi Endpoint Kunci

#### 1. POST `/api/v1/auth/login`
- **Tujuan:** Autentikasi pengguna, menerbitkan JWT dan HttpOnly Cookie.
- **Request Body:**
  ```json
  {
    "email": "admin@nara-ac.local",
    "password": "YOUR_SAFE_PASSWORD"
  }
  ```
- **Response Sukses (HTTP 200):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "nama": "Admin Utama",
      "email": "admin@nara-ac.local",
      "role": "admin",
      "kontak": null,
      "technician_id": null,
      "customer_id": null
    }
  }
  ```
- **Error Umum:**  
  `401 Unauthorized` ➔ "Email atau password salah." (Pesan generik untuk mencegah user enumeration).

#### 2. POST `/api/v1/bookings`
- **Tujuan:** Membuat tiket pesanan servis baru oleh pelanggan atau admin.
- **Request Body:**
  ```json
  {
    "nama": "Budi Hartono",
    "kontak": "081234567890",
    "layanan_id": 1,
    "jadwal_mulai": "2026-10-20 09:00:00",
    "alamat": "Jl. Pemuda No. 45, Rawamangun, Jakarta Timur",
    "keluhan": "AC ruang tengah bocor air dan kurang dingin",
    "jumlah_unit": 2,
    "ac_unit_id": null
  }
  ```
- **Response Sukses (HTTP 201):**
  ```json
  {
    "id": 105,
    "kode_booking": "AC-9B2F",
    "status": "scheduled",
    "jadwal_mulai": "2026-10-20T02:00:00.000Z",
    "layanan": "Cuci AC Standard",
    "pesan": "Booking berhasil dibuat. Kode tiket: AC-9B2F"
  }
  ```
- **Error Umum:**  
  `422 Unprocessable Entity` ➔ Validasi nomor telepon tidak sah atau jadwal di luar jam operasional.  
  `409 Conflict` ➔ Teknisi yang dipilih bentrok dengan penugasan lain.

#### 3. POST `/api/v1/ai/answer`
- **Tujuan:** Berbicara dengan AI Customer Service assistant secara kontekstual.
- **Request Body:**
  ```json
  {
    "text": "Berapa biaya cuci AC di Nara AC?"
  }
  ```
- **Response Sukses (HTTP 200):**
  ```json
  {
    "jawaban": "Biaya cuci AC di Nara AC mulai dari Rp75.000 untuk Cuci AC Standard, dan Rp120.000 untuk Paket Deep Clean Core. Apakah Anda ingin menjadwalkan booking servis sekarang?",
    "intent": "tanya_harga",
    "confidence": 0.942,
    "quick_replies": [
      "Pesan Servis Sekarang",
      "Lihat Paket Lengkap",
      "Cek Jadwal Tersedia"
    ],
    "saran": [
      "Berapa harga cuci ac",
      "Apakah melayani isi freon"
    ],
    "aksi": [
      {
        "text": "Pesan Sekarang",
        "link": "/booking"
      }
    ]
  }
  ```

---

## 9. Dokumentasi Database

### 9.1 Spesifikasi Mesin & Migrasi
- **Engine:** PostgreSQL 14+ (UTF-8, TimeZone UTC dengan evaluasi WIB di aplikasi).
- **Driver:** `pg` (Node-Postgres) dengan koneksi terkelola via connection pool (`max: 20` client, idle timeout 30 detik).
- **Migrasi:** Menggunakan skrip kustom `backend/src/db/migrate.js` yang mencatat berkas SQL yang telah berhasil diaplikasikan ke tabel meta `schema_migrations`.
- **Status Migrasi Terverifikasi:** 11 berkas migrasi SQL (001 s.d. 011).

### 9.2 Daftar Tabel & Tanggung Jawab

| Nama Tabel | Tujuan & Tanggung Jawab Bisnis | Kunci Utama & Kolom Kunci | Foreign Key & Relasi |
|---|---|---|---|
| `schema_migrations` | Melacak status berkas migrasi database yang telah dieksekusi | `name TEXT PRIMARY KEY` | - |
| `settings` | Konfigurasi sistem dinamis (jam buka/tutup, hari libur, profil UMKM, rekening) | `key TEXT PRIMARY KEY` | Kolom `value JSONB` |
| `technicians` | Master data profil dan status aktif teknisi servis lapangan | `id SERIAL PRIMARY KEY` | Diacu oleh `users`, `bookings`, `inventory_usage` |
| `users` | Akun pengguna sistem dengan kredensial hash password dan peran (RBAC) | `id SERIAL PRIMARY KEY` | `technician_id -> technicians(id)`, `customer_id -> customers(id)` |
| `customers` | Master data pelanggan (nama, nomor WhatsApp, alamat utama) | `id SERIAL PRIMARY KEY` | Diacu oleh `bookings`, `ac_units`, `users` |
| `service_catalog` | Master katalog layanan servis, paket cuci, tarif, durasi, interval servis | `id SERIAL PRIMARY KEY` | Diacu oleh `bookings` |
| `ac_units` | Inventarisasi fisik unit AC pelanggan (brand, PK, model, nomor seri) | `id SERIAL PRIMARY KEY` | `customer_id -> customers(id)` |
| `bookings` | Transaksi tiket pemesanan servis utama beserta jadwal dan siklus status | `id SERIAL PRIMARY KEY` | `customer_id`, `layanan_id`, `teknisi_id`, `ac_unit_id` |
| `status_log` | Riwayat kronologis mutasi status pengerjaan booking | `id SERIAL PRIMARY KEY` | `booking_id -> bookings(id) ON DELETE CASCADE` |
| `booking_audit` | Jejak audit aksi spesifik yang terjadi pada setiap booking | `id SERIAL PRIMARY KEY` | `booking_id -> bookings(id) ON DELETE CASCADE` |
| `schedule_history` | Jejak kronologis rescheduling dan pergantian alokasi teknisi | `id SERIAL PRIMARY KEY` | `booking_id`, `teknisi_lama_id`, `teknisi_baru_id` |
| `work_orders` | Catatan diagnosa kerusakan fisik, tindakan teknisi, dan rekomendasi | `booking_id INTEGER PRIMARY KEY` | `booking_id -> bookings(id) ON DELETE CASCADE` |
| `work_order_checklists` | Butir tugas SOP pengerjaan di lapangan per order kerja | `id SERIAL PRIMARY KEY` | `booking_id -> bookings(id) ON DELETE CASCADE` |
| `work_order_photos` | Metadata dan referensi berkas fisik bukti foto before/after | `id SERIAL PRIMARY KEY` | `booking_id -> bookings(id) ON DELETE CASCADE` |
| `service_reports` | Snapshot data terstruktur laporan servis akhir saat pekerjaan selesai | `booking_id INTEGER PRIMARY KEY` | `booking_id -> bookings(id) ON DELETE CASCADE` |
| `technician_availability` | Status ketersediaan harian teknisi (available, busy, off) | `id SERIAL PRIMARY KEY` | `teknisi_id -> technicians(id) ON DELETE CASCADE` |
| `inventory` | Master stok fisik suku cadang, freon, pipa, dan batas minimum stok | `id SERIAL PRIMARY KEY` | Diacu oleh `inventory_usage`, `inventory_adjustments` |
| `inventory_usage` | Pencatatan riil pemakaian material per booking oleh teknisi | `id SERIAL PRIMARY KEY` | `booking_id`, `item_id`, `teknisi_id` |
| `inventory_adjustments` | Jejak mutasi stok masuk, keluar, penyesuaian opname, dan pemakaian | `id SERIAL PRIMARY KEY` | `item_id -> inventory(id)`, `booking_id -> bookings(id)` |
| `feedback` | Penilaian bintang (1-5), komentar, dan sentimen kepuasan pelanggan | `id SERIAL PRIMARY KEY` | `booking_id -> bookings(id) ON DELETE CASCADE` (UNIQUE) |
| `reminder_log` | Catatan pengiriman pesan pengingat jadwal (H-1) | `id SERIAL PRIMARY KEY` | `booking_id -> bookings(id) ON DELETE CASCADE` |
| `complaint_tickets` | Tiket eskalasi keluhan pelanggan hasil penangkapan chatbot AI | `id SERIAL PRIMARY KEY` | `booking_id -> bookings(id) ON DELETE SET NULL` |
| `notifications` | Pengumuman dan notifikasi dalam aplikasi per target role/pengguna | `id SERIAL PRIMARY KEY` | `booking_id -> bookings(id) ON DELETE CASCADE` |
| `audit_logs` | Jejak audit global aktivitas administratif (before & after payload) | `id SERIAL PRIMARY KEY` | Menampung aksi dari pengguna sistem |
| `inference_log` | Rekam jejak inferensi model AI, nilai confidence, dan latensi | `id SERIAL PRIMARY KEY` | Menyimpan log diagnostik AI |
| `prediction_output` | Hasil keluaran inferensi model forecasting data science | `id SERIAL PRIMARY KEY` | Nilai estimasi unit dan batas atas/bawah |

### 9.3 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    CUSTOMERS ||--o{ BOOKINGS : "memesan"
    CUSTOMERS ||--o{ AC_UNITS : "memiliki fisik"
    CUSTOMERS ||--o| USERS : "memiliki akun login"

    TECHNICIANS ||--o{ BOOKINGS : "ditugaskan ke"
    TECHNICIANS ||--o| USERS : "memiliki akun login"
    TECHNICIANS ||--o{ TECHNICIAN_AVAILABILITY : "mengajukan cuti/ketersediaan"
    TECHNICIANS ||--o{ INVENTORY_USAGE : "menggunakan"

    SERVICE_CATALOG ||--o{ BOOKINGS : "menentukan jenis & tarif"
    AC_UNITS ||--o{ BOOKINGS : "menjadi objek pengerjaan"

    BOOKINGS ||--o{ STATUS_LOG : "mencatat status"
    BOOKINGS ||--o{ SCHEDULE_HISTORY : "mencatat alokasi teknisi"
    BOOKINGS ||--o| WORK_ORDERS : "memiliki lembar diagnosa"
    BOOKINGS ||--o{ WORK_ORDER_CHECKLISTS : "memiliki checklist SOP"
    BOOKINGS ||--o{ WORK_ORDER_PHOTOS : "didokumentasikan foto"
    BOOKINGS ||--o| SERVICE_REPORTS : "menghasilkan laporan akhir"
    BOOKINGS ||--o| FEEDBACK : "menerima penilaian (1-5)"
    BOOKINGS ||--o{ REMINDER_LOG : "menerima pengingat H-1"
    BOOKINGS ||--o{ COMPLAINT_TICKETS : "dapat dilaporkan keluhan"
    BOOKINGS ||--o{ NOTIFICATIONS : "memicu notifikasi"

    INVENTORY ||--o{ INVENTORY_USAGE : "dipakai pada pengerjaan"
    INVENTORY ||--o{ INVENTORY_ADJUSTMENTS : "mengalami mutasi stok"
    BOOKINGS ||--o{ INVENTORY_USAGE : "mencatat material"
    BOOKINGS ||--o{ INVENTORY_ADJUSTMENTS : "terkait pemakaian"
```

### 9.4 Manajemen Migrasi & Seeding
- **Menjalankan Migrasi:**
  ```bash
  cd backend
  npm run migrate
  ```
  Perintah ini membaca folder `backend/migrations/*.sql` secara terurut alfabetis dan hanya menjalankan berkas migrasi baru yang belum tertera di tabel `schema_migrations`.
- **Menjalankan Seeding Awal:**
  ```bash
  cd backend
  npm run seed
  ```
  Menginisialisasi jam kerja default, 5 paket katalog layanan, 2 teknisi (Budi Santoso & Agus Setiawan), akun admin `admin@nara-ac.local`, master pelanggan, stok suku cadang, dan booking contoh.
- **Mereset Database (Khusus Lingkungan Development):**
  ```bash
  cd backend
  npm run db:reset
  ```
  *Peringatan:* Perintah ini mengeksekusi `DROP SCHEMA public CASCADE` dan memasukkan seed ulang. Dilarang keras dijalankan di lingkungan produksi!

---

## 10. Autentikasi dan Otorisasi

### 10.1 Mekanisme JWT & Cookie HttpOnly
- Token ditandatangani menggunakan algoritma HMAC SHA-256 (`jsonwebtoken`) dengan payload:
  ```json
  {
    "sub": 1,
    "role": "admin",
    "nama": "Admin Utama",
    "tid": null,
    "cid": null,
    "iat": 1728800000,
    "exp": 1728828800
  }
  ```
- Masa berlaku token dikonfigurasi melalui variabel `JWT_EXPIRES` (default: `8h`).
- Demi keamanan maksimal dari serangan Cross-Site Scripting (XSS), token disematkan langsung oleh server pada cookie browser dengan konfigurasi:
  - `httpOnly: true` (tidak dapat diakses oleh skrip `document.cookie`).
  - `secure: true` (pada production mode mewajibkan HTTPS).
  - `sameSite: 'strict'` (mencegah cookie dikirim pada permintaan lintas situs).
  - `path: '/'`.

### 10.2 Role-Based Access Control (RBAC)
Sistem membedakan tiga level otorisasi:
1. **`admin`:** Akses tak terbatas ke seluruh endpoint manajemen, konfigurasi jam kerja, master stok, alokasi teknisi, laporan, dan jejak audit.
2. **`technician`:** Dibatasi hanya untuk mengakses konsol `/api/v1/technician/*`, melihat pekerjaan miliknya sendiri, mengubah status pekerjaan yang ditugaskan kepadanya, mengisi checklist, dan mengunggah foto.
3. **`customer`:** Dibatasi hanya untuk melihat dan memanipulasi aset pribadinya di `/api/v1/customer/*` (unit AC miliknya, riwayat pesanannya, dan notifikasi miliknya).

### 10.3 Proteksi CSRF
- Dikelola melalui middleware `backend/src/middleware/csrf.js`.
- Endpoint `GET /api/v1/auth/csrf-token` menerbitkan token berbasis kriptografi acak (32 bytes hex) yang terikat dengan ID pengguna dan berlaku selama 15 menit.
- Permintaan mutasi data (`POST`, `PUT`, `PATCH`, `DELETE`) pada pengguna terautentikasi wajib menyertakan header `X-CSRF-Token`. Jika tidak disertakan atau token kadaluarsa, server menolak dengan HTTP `403 CSRF_TOKEN_INVALID`.

---

## 11. Dokumentasi Data Science

### 11.1 Tujuan & Sumber Data
Modul Data Science bertujuan membantu pemilik usaha CV. Nara Teknindotama merencanakan alokasi kapasitas teknisi harian berdasarkan estimasi permintaan servis yang dipengaruhi faktor hari, tren musiman, dan temperatur udara.
- **Sumber Data Real-Time:** Database relasional PostgreSQL Nara AC (koneksi via `psycopg2`).
- **Sumber Data Historis:** `data-science/data/historical_demand.csv` (berisi 365 observasi harian buatan yang memodelkan tren pesanan servis AC selama 1 tahun penuh).

### 11.2 Pipeline Machine Learning & Algoritma
Dikelola di `data-science/generate_dataset.py`:
- **Fitur Masukan (Features):**
  1. `dayofweek`: Hari dalam seminggu (0 = Senin, 6 = Minggu).
  2. `dayofyear`: Hari ke-n dalam setahun (1–365).
  3. `suhu_rata2`: Rata-rata temperatur udara harian (°C).
  4. `is_libur`: Penanda biner akhir pekan / hari libur (0 atau 1).
- **Target:** `jumlah_booking` (angka bulat permintaan servis harian).
- **Algoritma Utama:** **`RandomForestRegressor`** (100 estimators, random state 42).
- **Model Pembanding (Baseline):** `LinearRegression` konvensional.
- **Pencegahan Data Leakage:** Menggunakan pemisahan berbasis waktu (*chronological time-series split*): 75% data terawal (9 bulan) digunakan sebagai data latih (*training set*), dan 25% data terakhir (3 bulan) digunakan sebagai data uji (*test set*). Tidak menggunakan acak k-fold agar tidak terjadi kebocoran informasi masa depan ke masa lalu.

### 11.3 Metrik Evaluasi & Pencegahan Data Leakage
Evaluasi dihitung pada test set:
- **MAE (Mean Absolute Error):** Mengukur rata-rata selisih absolut estimasi unit.
- **RMSE (Root Mean Squared Error):** Mengukur penalti kuadrat terhadap kesalahan prediksi besar.
- **WAPE (Weighted Absolute Percentage Error):** Mengukur rasio total selisih error terhadap total aktual permintaan.
- Artefak model disimpan dalam `data-science/models/demand_model_v2.pkl` lengkap dengan metadata struktur fitur dan tanggal split.

### 11.4 Streamlit Analytics Dashboard
Dijalankan melalui `streamlit run data-science/dashboard.py` (Port 8501) dengan 3 tab analitik:
1. **Tab 1: Operational Insights (Realtime):** Membaca tabel `bookings`, `inventory`, `feedback`, dan `customers` langsung dari PostgreSQL untuk menampilkan metrik KPI, tren booking harian, distribusi beban kerja per teknisi, dan popularitas jenis layanan.
2. **Tab 2: AI Demand Forecasting:** Visualisasi deteksi outlier data historis menggunakan metode Interquartile Range (IQR), input slider pemilihan tanggal, slider temperatur udara (20–40°C), checkbox hari libur, serta kalkulator estimasi kebutuhan teknisi yang harus disiagakan (`max(1, round(prediksi / 3))`).
3. **Tab 3: Inventory & Feedback Analytics:** Grafik batang posisi stok barang terhadap batas minimum (*safety stock*) serta diagram lingkaran distribusi kepuasan bintang rating.

---

## 12. Dokumentasi AI / Machine Learning / Chatbot

### 12.1 Arsitektur AI Service (FastAPI)
Layanan AI Service berjalan independen menggunakan framework **FastAPI** pada port 8000:
- Menggunakan skema validasi Pydantic (`IntentRequest`, `IntentResponse`, `EntityExtractRequest`, `RagIndexRequest`, `RagAnswerRequest`).
- Model di-load ke memori pada event startup aplikasi dari file biner: `intent_model.pkl`, `vectorizer.pkl`, dan `label_encoder.pkl`.

### 12.2 Intent Classification & Pelatihan Model
Model dilatih menggunakan skrip `ai-service/train.py` terhadap dataset frasa bahasa Indonesia percakapan pelanggan pendingin ruangan.
- **19 Kelas Intensi Utama:**
  1. `greeting` (salam, sapaan pagi/siang/malam)
  2. `tanya_layanan` (jenis perawatan AC yang dilayani)
  3. `tanya_harga` (pertanyaan tarif cuci, pasang, perbaikan)
  4. `keluhan_ac` (keluhan AC tidak dingin, bocor air, bau, mati total)
  5. `booking_service` (permintaan pendaftaran jadwal servis)
  6. `ubah_jadwal` (permintaan perubahan waktu kunjungan teknisi)
  7. `batalkan_booking` (keinginan membatalkan jadwal)
  8. `tanya_status` (pengecekan kedatangan teknisi & tiket)
  9. `tanya_pembayaran` (cara transfer, pembayaran tunai/QRIS)
  10. `tanya_teknisi` (kualifikasi dan identitas teknisi)
  11. `tanya_area_layanan` (cakupan wilayah kerja Jabodetabek)
  12. `tanya_prosedur` (SOP dan estimasi durasi pengerjaan)
  13. `follow_up` (jawaban singkat persetujuan atau kelanjutan)
  14. `konfirmasi` (jawaban penegasan 'ya, betul')
  15. `penolakan` (jawaban penolakan 'tidak jadi')
  16. `human_handoff` (permintaan berbicara langsung ke admin manusia)
  17. `feedback` (penyampaian kepuasan atau saran pelanggan)
  18. `admin_query` (kueri bernuansa administratif sistem)
  19. `tech_query` (pertanyaan teknis spesifik tipe freon/pipa)
  20. `lainnya` (kategori tangkapan untuk teks di luar cakupan)
- **Komparasi Algoritma:** Skrip mengevaluasi `LinearSVC`, `LogisticRegression`, dan `MultinomialNB(alpha=0.1)` pada TF-IDF n-gram (1-2), lalu secara otomatis menyimpan model dengan Test Weighted F1-score tertinggi (mencapai F1 > 0.95).

### 12.3 Entity Extraction & RAG Extractive
- **Ekstraksi Entitas Otomatis (`/extract-entities`):** Menganalisis teks menggunakan pola *regular expression* (regex) untuk mengenali:
  - Kode Booking: Pola `AC-[A-Za-z0-9]{4}` atau `BK-[A-Za-z0-9-]+`.
  - Tipe Layanan: `cuci`, `bongkar pasang`, `freon`, `instalasi`.
  - Unit AC: Merek (Daikin, Panasonic, Sharp, dll.), Kapasitas PK (1/2 PK, 1 PK, 2 PK), dan jumlah unit.
  - Tanggal & Waktu: Ekstraksi indikator hari (besok, lusa, senin) dan jam kunjungan.
- **Extractive RAG Engine (`/rag/index` & `/rag/answer`):**
  - Mengindeks dokumen pengetahuan operasional secara in-memory menggunakan vektor TF-IDF per `corpus_hash`.
  - Menghitung kemiripan kosinus (*Cosine Similarity*) antara pertanyaan pengguna dengan dokumen. Jika skor kemiripan $\ge 0.2$, mengembalikan potongan dokumen yang relevan sebagai jawaban ekstraktif.

### 12.4 Keamanan AI & Pencegahan Prompt Injection
Endpoint `/predict-intent` dan `/rag/answer` dilengkapi pembersih sanitasi teks:
- **Pencegahan Prompt Injection:** Menghapus kata kunci instruksi override sistem berbahaya seperti `ignore all previous`, `forget all`, `disregard all instructions`, `system:`, `assistant:`, `[INST]`, `[/INST]`, `<|im_start|>`.
- **Panjang Teks Maksimal:** Membatasi input maksimal 1.000 karakter guna mencegah serangan Denial of Service (DoS) pada komputasi matriks vektor TF-IDF.

---

## 13. Integrasi Layanan & Alur Data

Integrasi antar-komponen sistem berjalan melalui protokol terstandarisasi:

```mermaid
flowchart LR
    A["Frontend (React)"] -->|"HTTP JSON (Credentials Enabled)"| B["Backend (Express API)"]
    B -->|"SQL Query & Transaction (pg.Pool)"| C[("PostgreSQL")]
    B -->|"Internal REST API (aiClient.js)"| D["AI Service (FastAPI)"]
    E["Data Science (Streamlit)"] -->|"Read-Only SQL Query (psycopg2)"| C
```

| Jalur Integrasi | Protokol | Autentikasi / Kredensial | Penanganan Kegagalan / Fallback |
|---|---|---|---|
| **Frontend ➔ Backend** | HTTP REST (JSON) | Cookie `nara_token` (HttpOnly) & Header `Authorization: Bearer` | Retry di client, modal pesan error terstruktur, redirect ke `/login` jika 401 |
| **Backend ➔ PostgreSQL** | PostgreSQL Wire Protocol (TCP 5432/5433) | `DATABASE_URL` via pool connection | Auto rollback transaksi via `withTx`, status degradasi pada `/health` probe |
| **Backend ➔ AI Service** | Internal HTTP REST | `AI_SERVICE_URL` internal | Timeout 6 detik (`AI_TIMEOUT_MS`); jika AI mati, backend beralih otomatis ke *rule-based fallback* tanpa memutus alur pemesanan pelanggan |
| **Data Science ➔ PostgreSQL** | PostgreSQL Wire Protocol (TCP 5432/5433) | `DATABASE_URL` dari `.env` | Peringatan pada sidebar dasbor; dasbor tetap dapat berjalan menggunakan data historis lokal CSV |

---

## 14. Konfigurasi Environment

Dokumentasikan nama variabel lingkungan yang digunakan oleh sistem tanpa menyertakan secret:

### 14.1 Variabel Backend (`backend/.env`)

| Variabel | Wajib / Opsional | Fungsi & Deskripsi | Format / Contoh Aman |
|---|---|---|---|
| `PORT` | Opsional (Default: 4000) | Port listener server HTTP backend | `4000` |
| `NODE_ENV` | Wajib | Lingkungan eksekusi runtime (`development` / `production`) | `development` |
| `DATABASE_URL` | Wajib | URL koneksi database PostgreSQL | `postgres://USER:PASSWORD@localhost:5432/nara_ac` |
| `DB_SSL` | Opsional (Default: false) | Mengaktifkan koneksi SSL untuk PostgreSQL produksi | `false` atau `true` |
| `JWT_SECRET` | Wajib | Kunci enkripsi penandatanganan token JWT | `generate_string_acak_minimal_32_karakter` |
| `JWT_EXPIRES` | Opsional (Default: 8h) | Durasi masa aktif token autentikasi | `8h` atau `24h` |
| `DEMO_PASSWORD` | Opsional (Default: Admin123) | Password default untuk akun hasil seeding database | `KataSandiKuat#2026` |
| `CORS_ORIGINS` | Opsional | Daftar domain asal frontend yang diizinkan (dipisah koma) | `http://localhost:5173,http://127.0.0.1:5173` |
| `AI_SERVICE_URL` | Opsional (Default: `http://localhost:8000`) | URL alamat layanan FastAPI AI Service | `http://localhost:8000` |
| `AI_TIMEOUT_MS` | Opsional (Default: 6000) | Batas waktu tunggu panggilan HTTP ke AI Service (milidetik) | `6000` |
| `AI_CONFIDENCE_THRESHOLD` | Opsional (Default: 0.55) | Ambang batas skor keyakinan inferensi intent AI | `0.55` |
| `TELEGRAM_BOT_TOKEN` | Opsional | Token bot Telegram untuk integrasi notifikasi (jika aktif) | `123456789:ABCDefghIJKLmnoPQRstuvwxYZ` |
| `SCHEDULER_ENABLED` | Opsional (Default: true) | Mengaktifkan task scheduler pengingat otomatis (H-1) | `true` atau `false` |
| `DS_DASHBOARD_URL` | Opsional | Tautan rujukan URL dashboard Streamlit Data Science | `http://localhost:8501` |
| `UPLOAD_DIR` | Opsional (Default: `./uploads`) | Direktori penyimpanan berkas foto pengerjaan fisik | `./uploads` |
| `AUTO_MIGRATE` | Opsional (Default: true) | Menjalankan migrasi database otomatis saat server mulai | `true` atau `false` |

### 14.2 Variabel Frontend (`frontend/.env`)

> [!IMPORTANT]
> Seluruh variabel di frontend dengan prefix `VITE_` akan dikompilasi ke dalam JavaScript publik browser. Jangan pernah memasukkan secret atau token rahasia ke file ini!

| Variabel | Wajib / Opsional | Fungsi & Deskripsi | Format / Contoh Aman |
|---|---|---|---|
| `VITE_API_URL` | Wajib | Base URL target endpoint REST API backend | `http://localhost:4000/api/v1` |
| `VITE_STREAMLIT_URL` | Opsional | URL penaut eksternal ke dasbor Streamlit Data Science | `http://localhost:8501` |

### 14.3 Variabel AI Service & Data Science
- **AI Service (`ai-service`):**  
  Membaca environment variabel `AI_CONFIDENCE_THRESHOLD` (opsional, default: `0.55`).
- **Data Science (`data-science`):**  
  Membaca file `../backend/.env` secara otomatis via `python-dotenv` untuk mengambil konfigurasi `DATABASE_URL`.

---

## 15. Instalasi dan Setup Lokal

### 15.1 Prasyarat Sistem
- **Node.js:** Versi 18.x atau 19.x ke atas.
- **NPM:** Versi 9.x ke atas.
- **Python:** Versi 3.9, 3.10, atau 3.11.
- **PostgreSQL:** Versi 14 atau lebih baru yang aktif di port lokal (default: 5432 atau 5433).
- **Git:** Terpasang pada sistem operasi.

### 15.2 Panduan Langkah Demi Langkah

#### 1. Persiapan Repositori
```bash
git clone <repository-url>
cd "CP 2026"
```

#### 2. Setup Database PostgreSQL
Pastikan layanan PostgreSQL telah berjalan di mesin lokal Anda dan buat database kosong:
```bash
# Contoh pembuatan database menggunakan psql
psql -U postgres -c "CREATE DATABASE nara_ac;"
```

#### 3. Setup Backend
```bash
cd backend

# 1. Install dependensi
npm install

# 2. Siapkan file konfigurasi environment
cp .env.example .env
# Edit .env dan sesuaikan nilai DATABASE_URL dengan kredensial PostgreSQL lokal Anda

# 3. Jalankan migrasi skema tabel
npm run migrate

# 4. Masukkan data awal (seeding)
npm run seed
```

#### 4. Setup Frontend
```bash
cd ../frontend

# 1. Install dependensi
npm install

# 2. Siapkan file konfigurasi environment
cp .env.example .env
# Pastikan VITE_API_URL bernilai http://localhost:4000/api/v1
```

#### 5. Setup AI Service (FastAPI)
```bash
cd ../ai-service

# 1. Buat dan aktifkan Python Virtual Environment
python3 -m venv .venv
source .venv/bin/activate  # macOS / Linux
# .venv\Scripts\activate   # Windows

# 2. Install dependensi
pip install -r requirements.txt

# 3. Latih model intent (menghasilkan intent_model.pkl, vectorizer.pkl, label_encoder.pkl)
python train.py
```

#### 6. Setup Data Science Dashboard (Streamlit)
```bash
cd ../data-science

# 1. Gunakan virtual environment Python (bisa memakai .venv yang sama atau tersendiri)
pip install -r requirements.txt

# 2. Generate dataset historis dan model Random Forest demand forecasting
python generate_dataset.py
```

### 15.3 Pemeriksaan Startup Berhasil

Jalankan seluruh service pada terminal terpisah:

```bash
# Terminal 1: Backend API (Port 4000)
cd backend && npm run dev

# Terminal 2: Frontend Web App (Port 5173)
cd frontend && npm run dev

# Terminal 3: AI Service (Port 8000)
cd ai-service && source .venv/bin/activate && python main.py

# Terminal 4: Data Science Dashboard (Port 8501)
cd data-science && source ../ai-service/.venv/bin/activate && streamlit run dashboard.py
```

**Verifikasi URL & Status Endpoint:**
- Frontend App: Buka `http://localhost:5173` di browser.
- Backend API Docs (Swagger): Akses `http://localhost:4000/api/docs`.
- Backend Health Probe: Akses `http://localhost:4000/health` (harus mengembalikan HTTP 200 `{ status: "ok" }`).
- AI Service Health: Akses `http://localhost:8000/health` (harus mengembalikan `{ status: "ok", model_loaded: true }`).
- Data Science Dashboard: Akses `http://localhost:8501`.

---

## 16. Workflow Pengembangan & Standar Kontribusi

### Menambahkan Endpoint API Baru
1. Daftarkan router dan logika handler pada berkas di `backend/src/routes/` yang relevan.
2. Definisikan skema validasi masukan menggunakan Joi pada objek `Joi.object(...)`.
3. Terapkan middleware otorisasi yang ketat: `requireAuth(['admin'])`, `requireAuth(['technician'])`, atau `requireAuth(['customer'])`.
4. Jika endpoint melakukan mutasi data penting pada database, selalu gunakan wrapper transaksi `withTx` dan panggil `audit()` di `src/services/common.js`.
5. Uji endpoint baru melalui Supertest di `backend/tests/`.

### Menambahkan Halaman atau Komponen Frontend
1. Buat komponen baru di `frontend/src/pages/` atau `frontend/src/components/`.
2. Gunakan styling utility classes dari Tailwind CSS v4 dan manfaatkan utility function `cn()` di `src/lib/utils.js`.
3. Daftarkan rute pada `src/App.jsx` atau router sub-halaman yang sesuai (`AdminDashboard.jsx` atau `CustomerPortal.jsx`).
4. Konsumsi data API melalui instance `api` di `src/api.js`.

### Mengubah Skema Database
1. Jangan mengubah berkas migrasi SQL lama yang sudah pernah di-commit ke Git.
2. Buat berkas migrasi baru di `backend/migrations/` dengan format penamaan nomor urut berikutnya, misalnya `012_nama_perubahan.sql`.
3. Gunakan pernyataan SQL idempoten seperti `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
4. Uji eksekusi migrasi menggunakan perintah `npm run migrate`.

---

## 17. Testing dan Quality Assurance

Repositari dilengkapi dengan rangkaian pengujian otomatis pada berbagai layer:

### Ringkasan Test Suite

| Layer / Modul | Framework Test | Lokasi Berkas Test | Perintah Eksekusi | Status & Cakupan Terverifikasi |
|---|---|---|---|---|
| **Backend API** | Jest 29.7.0 & Supertest | `backend/tests/*.test.js` | `cd backend && npm test` | **5 Test Suites LULUS, 72 Tests PASSED** (Auth, Life-cycle, Regresi, Preservasi, Error Handling) |
| **Data Science** | Pytest 8.4+ | `data-science/test_pipeline.py` | `.venv/bin/pytest data-science/test_pipeline.py` | **8 Tests PASSED** (Feature contract, Vektor shape, WAPE math, CSV generation, Baseline comparison, Model metadata) |
| **AI Service (Unit)** | Pytest 8.4+ | `ai-service/test_main.py` | `.venv/bin/pytest ai-service/test_main.py` | **2 Tests PASSED** (Model versioning, Confidence threshold contract) |
| **Frontend Linter** | ESLint 9.39+ | `frontend/` | `cd frontend && npm run lint` | Static code inspection & React rules |
| **Backend Linter** | ESLint 9.39+ | `backend/` | `cd backend && npm run lint` | Static code inspection & Node.js rules |

> [!NOTE]
> Catatan pengujian AI Service: Pengujian lanjutan pada `test_ai_improvements.py` menguji pemanggilan server langsung menggunakan TestClient. Model biner (`intent_model.pkl`) wajib dilatih terlebih dahulu melalui `python train.py` sebelum mengeksekusi test suite tersebut.

---

## 18. Deployment dan Infrastruktur

### Kesiapan Lingkungan Produksi
1. **Backend (Node.js):**
   - Jalankan menggunakan process manager seperti **PM2** atau container Docker:
     ```bash
     cd backend
     NODE_ENV=production PORT=4000 node src/server.js
     ```
   - Pastikan `DATABASE_URL` mengarah ke instance database produksi yang memiliki koneksi terisolasi dan backup otomatis.
   - Atur `CORS_ORIGINS` hanya ke nama domain produksi frontend resmi.
2. **Frontend (Vite Static Build):**
   - Kompilasi berkas statis frontend:
     ```bash
     cd frontend
     npm run build
     ```
   - Hasil kompilasi di folder `frontend/dist/` dapat di-host menggunakan Nginx, Cloudflare Pages, Vercel, atau AWS S3/CloudFront.
   - Atur konfigurasi URL rewrite (*fallback routing*) pada server web agar semua path diarahkan ke `index.html` (karena sistem menggunakan client-side routing).
3. **AI Service (FastAPI):**
   - Jalankan menggunakan server ASGI produksi berkinerja tinggi seperti **Uvicorn** di balik reverse proxy:
     ```bash
     cd ai-service
     uvicorn main:app --host 127.0.0.1 --port 8000 --workers 2
     ```
4. **Data Science Dashboard (Streamlit):**
   - Jalankan Streamlit mode headless produksi:
     ```bash
     cd data-science
     streamlit run dashboard.py --server.port 8501 --server.address 0.0.0.0 --server.headless true
     ```

---

## 19. Panduan Troubleshooting

Berikut adalah solusi penanganan kendala yang terverifikasi faktual terhadap implementasi sistem:

### 1. Backend: `Error: connect ECONNREFUSED` pada Database
- **Gejala:** Server gagal start dengan log `[db] pool error` atau `connection refused`.
- **Penyebab:** PostgreSQL belum berjalan di sistem lokal, atau port pada `DATABASE_URL` salah (misalnya default port 5432 tertukar dengan 5433).
- **Diagnosis & Solusi:**
  1. Periksa apakah PostgreSQL aktif: `pg_isready -h localhost -p 5432`.
  2. Periksa kembali port dan kredensial pada file `backend/.env`. Jangan ubah file template `.env.example`.

### 2. Migrasi Gagal: `Error: Migrasi XXX.sql gagal`
- **Gejala:** Perintah `npm run migrate` berhenti di tengah jalan dengan pesan error SQL.
- **Penyebab:** Terjadi konflik nama constraint atau skema tabel lokal tidak sinkron dengan riwayat migrasi.
- **Diagnosis & Solusi:**
  1. Periksa tabel `schema_migrations` dengan perintah: `SELECT * FROM schema_migrations;` untuk melihat migrasi mana yang telah terpasang.
  2. Pada lingkungan pengujian development lokal, Anda dapat menjalankan reset database bersih: `npm run db:reset`.

### 3. Frontend: Respon API `401 Unauthorized` Berulang
- **Gejala:** Halaman terus terpental ke `/login` atau request selalu ditolak status 401.
- **Penyebab:** Masa berlaku token JWT telah habis (`JWT_EXPIRES`), atau cookie `nara_token` terblokir oleh browser karena perbedaan konfigurasi origin/port.
- **Diagnosis & Solusi:**
  1. Buka browser Developer Tools (F12) -> Application -> Cookies -> periksa apakah cookie `nara_token` ada.
  2. Login ulang melalui `/login`.
  3. Pastikan `CORS_ORIGINS` di `backend/.env` mencakup origin URL frontend Anda (`http://localhost:5173`).

### 4. Chatbot Widget: Respon Lambat atau Menampilkan Jawaban Fallback
- **Gejala:** Chatbot hanya menjawab: *"Maaf, aku belum paham. Bisa ulangi..."*.
- **Penyebab:** Layanan AI Service di port 8000 belum dinyalakan, atau model biner `.pkl` belum dibuat.
- **Diagnosis & Solusi:**
  1. Cek kesehatan AI Service melalui browser di `http://localhost:8000/health`.
  2. Jika respon 503 atau model belum ada, buka terminal `ai-service` dan jalankan `python train.py`.
  3. Pastikan server FastAPI aktif di terminal terpisah: `python main.py`.

### 5. Frontend: Tampilan Peta Alamat atau Wilayah Kosong
- **Gejala:** Dropdown pilihan kecamatan/kelurahan pada pemesanan tidak muncul opsi.
- **Penyebab:** Data regional gagal dimuat dari `regionsData.js`.
- **Diagnosis & Solusi:**
  1. Buka Console browser (F12) untuk melihat apakah ada error syntax.
  2. Pastikan file `frontend/src/data/regionsData.js` tidak terhapus atau rusak.

---

## 20. Known Limitations & Roadmap

### Keterbatasan Terverifikasi Saat Ini
1. **Model NLP Berbasis Klasifikasi Statis:** AI Service saat ini menggunakan model supervised machine learning klasik (*TF-IDF Vectorizer* + *LinearSVC / Logistic Regression*), bukan arsitektur Large Language Model (LLM) generatif. Bot sangat akurat untuk 19 domain intensi terdaftar, namun tidak memiliki pemahaman generatif di luar kosakata training data.
2. **Dataset Demand Forecasting Sintetik:** Dataset historis `historical_demand.csv` yang digunakan untuk melatih model Random Forest adalah data sintetik terstruktur yang disimulasikan untuk kebutuhan demonstrasi akademik capstone.
3. **Penyimpanan Berkas Foto Lokal:** Bukti foto pengerjaan teknisi saat ini disimpan secara lokal di folder `backend/uploads/`. Belum terintegrasi dengan layanan cloud object storage (seperti AWS S3 atau Google Cloud Storage).
4. **Integrasi Notifikasi Eksternal:** Konfigurasi token bot Telegram tersedia di environment (`TELEGRAM_BOT_TOKEN`), namun integrasi webhook dinamis per nomor teknisi masih opsional dan pengingat saat ini diprioritaskan tersimpan di tabel log internal aplikasi.

### Rencana Pengembangan Mendatang
- [ ] Integrasi Cloud Object Storage (S3 / Cloud Storage) untuk penyimpanan dokumen dan foto pengerjaan.
- [ ] Migrasi chatbot ke LLM berbasis Retrieval-Augmented Generation (RAG) hybrid dengan vector database.
- [ ] Integrasi Payment Gateway otomatis (Midtrans / Xendit) untuk pembayaran instan via Virtual Account dan QRIS.
- [ ] Integrasi WhatsApp Business API resmi untuk pengiriman notifikasi pengingat otomatis langsung ke nomor pelanggan.

---

## 21. Glosarium Istilah

- **Booking:** Entitas pemesanan jasa servis pendingin udara yang diajukan pelanggan, memiliki kode referensi tiket unik dan jadwal waktu kunjungan.
- **Kode Tiket Booking:** Kode identifikasi pemesanan publik berformat `AC-XXXX` atau `BK-YYYYMMDD-XXXX` yang dapat dicek statusnya secara mandiri tanpa login.
- **Work Order:** Lembar perintah kerja lapangan teknisi yang menampung catatan diagnosis fisik, rekomendasi perbaikan, bukti foto pengerjaan, dan checklist SOP.
- **AC Unit:** Data spesifik unit pendingin ruangan milik pelanggan yang mencakup lokasi ruangan, merek, model, kapasitas tenaga kuda (PK), dan nomor seri.
- **Checklist SOP:** Rangkaian tahapan pengerjaan teknis berstandar operasional yang wajib dieksekusi teknisi sebelum pekerjaan dapat ditandai selesai (*done*).
- **Inventory Adjustment:** Catatan mutasi penyesuaian stok inventori fisik di gudang akibat pemakaian teknisi, barang masuk, barang rusak, atau koreksi opname.
- **Intent Classification:** Proses penentuan maksud atau tujuan kalimat yang diinputkan pengguna pada antarmuka obrolan chatbot menjadi kategori intensi yang terstruktur.
- **Extractive RAG (Retrieval-Augmented Generation):** Metode pencarian potongan teks informasi yang paling relevan dari kumpulan dokumen pengetahuan menggunakan kemiripan vektor kosinus.
- **WAPE (Weighted Absolute Percentage Error):** Metrik evaluasi akurasi peramalan (*forecasting*) yang mengukur persentase total kesalahan absolut terhadap total aktual permintaan.
- **RBAC (Role-Based Access Control):** Mekanisme pembatasan hak akses sistem berdasarkan peran pengguna (`admin`, `technician`, `customer`).

---

## 22. Informasi Lisensi & Proyek

- **Identitas Proyek:** Proyek Capstone Tim A26-CS054
- **Mitra Usaha:** CV. Nara Teknindotama
- **Status Proyek:** Aktif & Terverifikasi
- **Hak Cipta:** © 2026 CV. Nara Teknindotama & Tim Pengembang Capstone A26-CS054. Seluruh hak cipta dilindungi undang-undang.
