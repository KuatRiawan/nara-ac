const { pool } = require('./pool');
const bcrypt = require('bcryptjs');
const config = require('../config');
const crypto = require('crypto');

function generateRealisticCode(date, index) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(index % 60);
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yy = String(d.getFullYear()).slice(-2);
  const timePart = `${hh}${min}${ss}${dd}${mm}${yy}`;
  const hexPart = crypto.randomBytes(16).toString('hex').toUpperCase();
  return `NARA-AC${timePart}-${hexPart}`;
}

async function seedDummyData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🚀 Mulai pembersihan & pembuatan data dummy baru (Januari - November 2026)...');

    // 1. Password hash untuk akun demo
    const passwordHash = await bcrypt.hash(config.demoPassword, 10);

    // 2. Bersihkan seluruh transaksi booking lama
    console.log('🧹 Membersihkan transaksi booking & riwayat lama...');
    for (const table of ['inventory_usage','status_log','feedback','booking_items','reminder_log','complaint_tickets','bookings']) {
      await client.query(`DELETE FROM ${table}`);
    }

    // 3. Pastikan Master Teknisi (8 Orang Berbeda Tanpa Duplikat)
    console.log('📦 Menyiapkan master teknisi...');
    const techData = [
      { nama: 'Budi Santoso', kontak: '081234567890', catatan: 'Spesialis AC Inverter & Multi-Split' },
      { nama: 'Agus Setiawan', kontak: '081234567891', catatan: 'Spesialis Bongkar Pasang & Instalasi Pipa' },
      { nama: 'Rian Hidayat', kontak: '081234567892', catatan: 'Teknisi Senior Overhaul Core & Chemical Wash' },
      { nama: 'Fajar Pratama', kontak: '081234567893', catatan: 'Spesialis Kelistrikan & Deteksi Kebocoran Freon' },
      { nama: 'Hendra Gunawan', kontak: '081234567894', catatan: 'Spesialis AC Cassette & Central Commercial' },
      { nama: 'Dimas Prasetyo', kontak: '081234567895', catatan: 'Spesialis Jet Cleaning & Servis Rutin' },
      { nama: 'Eko Prasetyo', kontak: '081234567896', catatan: 'Spesialis Servis AC Split Duct & VRV' },
      { nama: 'Ilham Saputra', kontak: '081234567897', catatan: 'Spesialis Overhaul & Penggantian Sparepart' }
    ];

    const techIds = [];
    for (const t of techData) {
      let techId;
      const found = await client.query('SELECT id FROM technicians WHERE kontak = $1', [t.kontak]);
      if (found.rows.length > 0) {
        techId = found.rows[0].id;
        await client.query('UPDATE technicians SET nama = $1, catatan = $2, aktif = true WHERE id = $3', [t.nama, t.catatan, techId]);
      } else {
        const ins = await client.query(`
          INSERT INTO technicians (nama, kontak, catatan, aktif, is_synthetic)
          VALUES ($1, $2, $3, true, true)
          RETURNING id;
        `, [t.nama, t.kontak, t.catatan]);
        techId = ins.rows[0].id;
      }
      techIds.push(techId);

      // Buat/update akun user untuk teknisi
      const email = `${t.nama.split(' ')[0].toLowerCase()}@nara-ac.local`;
      await client.query(`
        INSERT INTO users (nama, email, password_hash, role, technician_id)
        VALUES ($1, $2, $3, 'technician', $4)
        ON DUPLICATE KEY UPDATE nama = VALUES(nama), password_hash = VALUES(password_hash), technician_id = VALUES(technician_id);
      `, [t.nama, email, passwordHash, techId]);
    }

    // Bersihkan teknisi orphan yang tidak ada dalam daftar aktif dan tidak memiliki booking
    await client.query(`
      DELETE FROM technicians
      WHERE id NOT IN ($1)
        AND id NOT IN (SELECT DISTINCT teknisi_id FROM bookings WHERE teknisi_id IS NOT NULL);
    `, [techIds]);

    // Pastikan akun Admin Utama
    await client.query(`
      INSERT INTO users (nama, email, password_hash, role)
      VALUES ('Admin Utama', 'admin@nara-ac.local', $1, 'admin')
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);
    `, [passwordHash]);

    // 4. Pastikan Master Inventaris
    console.log('📦 Menyiapkan master inventaris...');
    const inventoryData = [
      { nama: 'Freon R32 Murni', kategori: 'freon', stok: 85.5, satuan: 'kg', min: 10.0 },
      { nama: 'Freon R410A Original', kategori: 'freon', stok: 62.0, satuan: 'kg', min: 8.0 },
      { nama: 'Freon R22 Refrigrant', kategori: 'freon', stok: 35.0, satuan: 'kg', min: 5.0 },
      { nama: 'Pipa Tembaga Saeki 1/4', kategori: 'pipa', stok: 180.0, satuan: 'meter', min: 20.0 },
      { nama: 'Pipa Tembaga Saeki 3/8', kategori: 'pipa', stok: 140.0, satuan: 'meter', min: 15.0 },
      { nama: 'Kapasitor Kompresor 25uF', kategori: 'komponen', stok: 45.0, satuan: 'pcs', min: 5.0 },
      { nama: 'Kapasitor Kompresor 35uF', kategori: 'komponen', stok: 38.0, satuan: 'pcs', min: 5.0 },
      { nama: 'Pompa Drainase Otomatis', kategori: 'komponen', stok: 15.0, satuan: 'unit', min: 2.0 },
      { nama: 'Chemical Coil Cleaner NARA', kategori: 'komponen', stok: 120.0, satuan: 'liter', min: 10.0 },
      { nama: 'Selang Fleksibel Pembuangan Air', kategori: 'pipa', stok: 250.0, satuan: 'meter', min: 25.0 }
    ];

    const invMap = {};
    for (const inv of inventoryData) {
      await client.query(`
        INSERT INTO inventory (nama, kategori, stok, satuan, min_stok, aktif, is_synthetic)
        VALUES ($1, $2, $3, $4, $5, true, true)
        ON DUPLICATE KEY UPDATE stok = VALUES(stok);
      `, [inv.nama, inv.kategori, inv.stok, inv.satuan, inv.min]);
      const res = await client.query('SELECT id FROM inventory WHERE nama = $1', [inv.nama]);
      invMap[inv.nama] = res.rows[0].id;
    }

    // 5. Siapkan Pelanggan Representatif (60 Pelanggan Jabodetabek)
    console.log('📦 Menyiapkan data pelanggan representatif...');
    const customerSeed = [
      { nama: 'Citra Lestari', kontak: '085512341234', alamat: 'Kota Wisata Cluster Montreal Blok M2 No. 15, Ciangsana, Kab. Bogor' },
      { nama: 'Dani Pratama', kontak: '085512341235', alamat: 'Cibubur Country Cluster Pine Blok P-08, Cikeas Udik, Kab. Bogor' },
      { nama: 'Hendra Wijaya', kontak: '081288223344', alamat: 'Legenda Wisata Cluster Einstein Blok E3 No. 22, Wanaherang, Kab. Bogor' },
      { nama: 'Siti Nurhaliza', kontak: '081399112233', alamat: 'Raffles Hills Blok HA No. 12, Harjamukti, Cimanggis, Depok' },
      { nama: 'Kevin Sanjaya', kontak: '081277334455', alamat: 'Grand Wisata Cluster Celebration Town Blok CT-05, Tambun Selatan, Bekasi' },
      { nama: 'Rina Marlina', kontak: '081366554433', alamat: 'Sentul City Cluster Taman Venesia Blok V-18, Babakan Madang, Kab. Bogor' },
      { nama: 'Ahmad Fauzi', kontak: '081255443322', alamat: 'Bukit Golf Riverside Blok A5 No. 9, Bojong Kulur, Gunung Putri, Kab. Bogor' },
      { nama: 'Maya Anggraini', kontak: '081344332211', alamat: 'Metland Transyogi Cluster Gandaria Blok G-14, Cileungsi Kidul, Kab. Bogor' },
      { nama: 'Doni Kusuma', kontak: '081233221100', alamat: 'Kemang Pratama 3 Blok C No. 10, Rawalumbu, Kota Bekasi' },
      { nama: 'Sarah Sechan', kontak: '081322110099', alamat: 'Ruko Jatibening Estate No. 8, Jatiasih, Kota Bekasi' },
      { nama: 'Dr. Robert Simanjuntak', kontak: '081211009988', alamat: 'Fresh Market Cibubur Ruko Blok FMR-05, Nagrak, Gunung Putri, Kab. Bogor' },
      { nama: 'Wahyu Triyono', kontak: '081300998877', alamat: 'Villa Nusa Indah 2 Blok V4 No. 11, Bojong Kulur, Kab. Bogor' },
      { nama: 'Nadia Putri', kontak: '081299887766', alamat: 'Pasadena Spring Cikeas Blok P-11, Gunung Putri, Kab. Bogor' },
      { nama: 'Surya Kencana', kontak: '081388776655', alamat: 'Komplek Perkantoran Graha Cibubur Kav. 7, Ciracas, Jakarta Timur' },
      { nama: 'Ibu Linda Hartati', kontak: '081277665544', alamat: 'Cluster Bellflower Harvest City Blok BF No. 03, Setu, Kab. Bekasi' },
      { nama: 'Bambang Pamungkas', kontak: '081234560001', alamat: 'Cluster Kyoto Kota Wisata No. 21, Ciangsana' },
      { nama: 'Dewi Sartika', kontak: '081234560002', alamat: 'Jl. Alternatif Cibubur KM 4 No. 18, Harjamukti' },
      { nama: 'Rudi Hartono', kontak: '081234560003', alamat: 'Taman Beverly Lippo Cikarang Blok B-12' },
      { nama: 'Anisa Rahma', kontak: '081234560004', alamat: 'Cluster Nashville Kota Wisata Blok N No. 5' },
      { nama: 'Ferry Salim', kontak: '081234560005', alamat: 'Perumahan Mahagoni Park Cibubur Blok M-09' },
      { nama: 'Bubu', kontak: '08212427490', alamat: 'Jl. Bunga, Kel. Ciracas, Kec. Ciracas, Kota Jakarta Timur, DKI Jakarta, 13740' },
      { nama: 'Arif Wibowo', kontak: '081234560006', alamat: 'Cluster Victoria River Park No. 8, Sentul City' },
      { nama: 'Dian Sastro', kontak: '081234560007', alamat: 'Cluster Pesona Madrid Kota Wisata Blok PM No. 3' },
      { nama: 'Eko Prasetyo', kontak: '081234560008', alamat: 'Jl. Raya Ciangsana No. 45, Gunung Putri' },
      { nama: 'Fitri Handayani', kontak: '081234560009', alamat: 'Cluster Acropolis Cibinong Blok AC No. 12' },
      { nama: 'Gilang Dirga', kontak: '081234560010', alamat: 'Metland Cileungsi Sektor 3 Blok C3 No. 15' },
      { nama: 'Hany Puspita', kontak: '081234560011', alamat: 'Cluster Bellanova Country Sentul City Blok B-07' },
      { nama: 'Indra Bekti', kontak: '081234560012', alamat: 'Ruko Madison Square Kota Wisata No. 10' },
      { nama: 'Joko Widodo', kontak: '081234560013', alamat: 'Kavling Hankam Cikeas Blok H No. 4' },
      { nama: 'Kartika Putri', kontak: '081234560014', alamat: 'Cluster Discovery Cibubur Blok D No. 22' },
      { nama: 'Lukman Sardi', kontak: '081234560015', alamat: 'Green Cibubur Residence Blok GC-11' },
      { nama: 'Mega Utami', kontak: '081234560016', alamat: 'Cluster Bellevue Kota Wisata Blok BV No. 19' },
      { nama: 'Nanang Qosim', kontak: '081234560017', alamat: 'Jl. Teluk Langsa No. 18, Ciangsana' },
      { nama: 'Oki Setiana', kontak: '081234560018', alamat: 'Cluster Monaco Kota Wisata Blok MO No. 6' },
      { nama: 'Panji Pragiwaksono', kontak: '081234560019', alamat: 'Kota Deltamas Cluster Narita Blok N-02' },
      { nama: 'Qori Sandioriva', kontak: '081234560020', alamat: 'Cluster Neo Permata Cileungsi Blok NP No. 9' },
      { nama: 'Raffi Ahmad', kontak: '081234560021', alamat: 'Andara Residence Kav. 1, Cinere' },
      { nama: 'Sule Sutisna', kontak: '081234560022', alamat: 'Grand Galaxy City Blok GG No. 14, Bekasi' },
      { nama: 'Taufik Hidayat', kontak: '081234560023', alamat: 'Cluster Rembrandt Legenda Wisata Blok R No. 7' },
      { nama: 'Ussy Sulistiawaty', kontak: '081234560024', alamat: 'Bukit Cimanggu City Blok BC No. 33, Bogor' },
      { nama: 'Vino Bastian', kontak: '081234560025', alamat: 'Cluster Den Haag Kota Wisata Blok DH No. 16' },
      { nama: 'Wika Salim', kontak: '081234560026', alamat: 'Apartemen Cibubur Junction Tower A Lantai 12' },
      { nama: 'Yayan Ruhian', kontak: '081234560027', alamat: 'Cluster Sevilla Ciangsana Blok S No. 11' },
      { nama: 'Zaskia Sungkar', kontak: '081234560028', alamat: 'Cluster Florida Kota Wisata Blok FL No. 20' }
    ];

    const customerIds = [];
    const customerMap = {};
    for (const c of customerSeed) {
      let custId;
      const ex = await client.query('SELECT id FROM customers WHERE kontak = $1', [c.kontak]);
      if (ex.rows.length) {
        custId = ex.rows[0].id;
        await client.query('UPDATE customers SET nama = $1, alamat = $2 WHERE id = $3', [c.nama, c.alamat, custId]);
      } else {
        const ins = await client.query(`
          INSERT INTO customers (nama, kontak, alamat, is_synthetic)
          VALUES ($1, $2, $3, true) RETURNING id;
        `, [c.nama, c.kontak, c.alamat]);
        custId = ins.rows[0].id;
      }
      customerIds.push(custId);
      customerMap[c.kontak] = { id: custId, ...c };
    }

    // 6. Ambil Service Catalog
    const svcs = (await client.query('SELECT id, kode, nama_layanan, harga, durasi_menit FROM service_catalog ORDER BY id')).rows;
    if (!svcs.length) {
      throw new Error('Service catalog kosong! Jalankan db:migrate terlebih dahulu.');
    }

    // Feedback template positif
    const feedbackComments = [
      'Bongkar total talang air dan blower bersih sekali! Tekanan freon dicek di depan saya. Sangat profesional.',
      'Teknisi ramah dan teliti. Saluran pembuangan disemprot lancar lagi, dingin kembali menusuk seperti baru.',
      'Dapat diskon multi-unit, invoice langsung tercetak rapi. Teknisi bawa cover plastik jadi lantai rumah tetap kering.',
      'Ternyata tekanan freon drop ke 60 psi. Diisi presisi ke 140 psi, pipa outdoor langsung basah berembun segar.',
      'Blower fan dilepas dan dicuci sampai lumutnya bersih total. Suara AC jadi hening.',
      'Pelayanan cepat tanggap, invoice masuk resmi via sistem digital CV. Nara Teknindotama.',
      'Instalasi rapi, divakum 15 menit sebelum buka kran outdoor. Garansi pengerjaan jelas.',
      'Talang air belakang yang tersumbat lendir berhasil dibersihkan. Sangat memuaskan.',
      'Teknisi datang tepat waktu berseragam rapi, bawa alat lengkap dan ramah menjelaskan kondisi unit AC.',
      'Hasil cuci bersih luar dalam. Dinginnya awet dan tidak ada bau apek lagi.'
    ];

    const keluhanList = [
      'AC kurang dingin dan hembusan angin kecil',
      'AC netes air dari pojok indoor',
      'Perawatan rutin berkala 3 bulanan',
      'Pipa outdoor timbul bunga es putih',
      'Suara blower indoor bergetar dan debu tebal',
      'AC berbau apek saat pertama kali dinyalakan',
      'Penambahan freon R32 karena dingin berkurang',
      'Pembersihan total deep clean talang air & rotor fan',
      'Servis rutin untuk ruang kamar tidur',
      'Cuci AC standard dan cek kelistrikan'
    ];

    // 7. Loop Harian dari 1 Januari 2026 s/d 30 November 2026
    console.log('📦 Membuat ~4.000 transaksi realistis (1 Jan 2026 - 30 Nov 2026)...');

    const startDate = new Date(2026, 0, 1); // 1 Jan 2026
    const endDate = new Date(2026, 10, 30); // 30 Nov 2026
    const todayDate = new Date(2026, 9, 15); // 15 Okt 2026

    const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    let totalBookingsCreated = 0;

    // Buffer for batch inserts
    const bookingsToInsert = [];
    const feedbackToInsert = [];
    const itemsToInsert = [];
    const logsToInsert = [];
    const invUsageToInsert = [];

    let bookingIndexCounter = 1;

    for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
      const curDate = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const curDateStr = curDate.toISOString().slice(0, 10);
      const isPast = curDate < todayDate;
      const isToday = curDate.getFullYear() === todayDate.getFullYear() &&
                      curDate.getMonth() === todayDate.getMonth() &&
                      curDate.getDate() === todayDate.getDate();

      const dayOfWeek = curDate.getDay(); // 0 = Sun, 6 = Sat
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

      // Skip dates reserved for backend unit test capacity suites (2026-11-23 s/d 2026-11-30)
      if (curDateStr >= '2026-11-23' && curDateStr <= '2026-11-30') {
        continue;
      }

      // Rata-rata 12 transaksi per hari (weekend 13-16, weekday 10-13)
      const countToday = isWeekend
        ? Math.floor(13 + Math.random() * 4) // 13 - 16
        : Math.floor(10 + Math.random() * 4); // 10 - 13

      const timeSlots = [
        { h: 8, m: 0 }, { h: 8, m: 30 }, { h: 9, m: 0 }, { h: 9, m: 30 },
        { h: 10, m: 0 }, { h: 10, m: 30 }, { h: 11, m: 0 }, { h: 13, m: 0 },
        { h: 13, m: 30 }, { h: 14, m: 0 }, { h: 14, m: 30 }, { h: 15, m: 0 },
        { h: 15, m: 30 }, { h: 16, m: 0 }, { h: 16, m: 30 }, { h: 17, m: 0 }
      ];

      for (let i = 0; i < countToday; i++) {
        const slot = timeSlots[i % timeSlots.length];
        const bookingTime = new Date(curDate);
        bookingTime.setHours(slot.h, slot.m, 0, 0);

        // Pilih Service
        const svcRand = Math.random();
        let chosenSvc = svcs[0]; // Default Cuci Standard
        if (svcRand < 0.40) chosenSvc = svcs.find(s => s.kode === 'SRV-CUCI-01') || svcs[0];
        else if (svcRand < 0.75) chosenSvc = svcs.find(s => s.kode === 'SRV-CUCI-CORE') || svcs[1] || svcs[0];
        else if (svcRand < 0.90) chosenSvc = svcs.find(s => s.kode === 'SRV-CUCI-FREON') || svcs[2] || svcs[0];
        else if (svcRand < 0.95) chosenSvc = svcs.find(s => s.kode === 'SRV-BONGKAR-01') || svcs[3] || svcs[0];
        else chosenSvc = svcs.find(s => s.kode === 'SRV-FREON-01') || svcs[4] || svcs[0];

        const durasi = chosenSvc.durasi_menit || 60;
        const endTime = new Date(bookingTime.getTime() + durasi * 60000);

        // Pilih Pelanggan
        const custId = customerIds[Math.floor(Math.random() * customerIds.length)];
        const custObj = customerSeed.find(c => customerMap[c.kontak]?.id === custId) || customerSeed[0];

        // Jumlah unit (1-3 unit)
        const unitRand = Math.random();
        const units = unitRand < 0.65 ? 1 : (unitRand < 0.90 ? 2 : 3);

        // Tentukan Status & Pembayaran
        let status = 'done';
        let statusPembayaran = 'paid';
        let techId = techIds[Math.floor(Math.random() * techIds.length)];
        let actualStart = bookingTime.toISOString();
        let actualEnd = endTime.toISOString();
        let alasanBatal = null;
        let alasanTunda = null;

        let bookingCode = generateRealisticCode(bookingTime, bookingIndexCounter++);

        if (isPast) {
          const randOutcome = Math.random();
          if (randOutcome < 0.92) {
            status = 'done';
            statusPembayaran = 'paid';
          } else if (randOutcome < 0.97) {
            status = 'cancelled';
            statusPembayaran = 'pending';
            techId = null;
            actualStart = null;
            actualEnd = null;
            alasanBatal = 'Dibatalkan pelanggan karena perubahan agenda pribadi';
          } else {
            status = 'rescheduled';
            statusPembayaran = 'pending';
            alasanTunda = 'Penyesuaian jam kunjungan atas permintaan pelanggan';
          }
        } else if (isToday) {
          // Khusus Hari Ini (15 Okt 2026):
          if (i === 0) {
            // Preservasi tiket Bubu jika ada di slot hari ini
            bookingCode = 'NARA-AC115815102026-98E76EC263DE3B4862996D355DDA7F9B';
            status = 'on process';
            statusPembayaran = 'pending';
            techId = techIds[0];
            actualStart = bookingTime.toISOString();
            actualEnd = null;
          } else if (i <= 7) {
            // 7 tiket selesai di pagi/siang hari (i = 1 .. 7)
            status = 'done';
            statusPembayaran = 'paid';
          } else if (i <= 9) {
            // 2 tiket sedang berjalan di lapangan (+ Bubu = 3 on process)
            status = 'on process';
            statusPembayaran = 'pending';
            actualEnd = null;
          } else {
            // 3 tiket terjadwal nanti sore
            status = 'scheduled';
            statusPembayaran = 'pending';
            actualStart = null;
            actualEnd = null;
            // Jadikan 1 tiket sore unassigned agar relevan dengan KPI Belum Ditugaskan & Pusat Tindakan
            if (i === 12) {
              techId = null;
            }
          }
        } else {
          // Masa Mendatang (16 Okt - 30 Nov 2026)
          status = 'scheduled';
          statusPembayaran = 'pending';
          actualStart = null;
          actualEnd = null;
          // 70% sudah ditugaskan teknisi, 30% sengaja unassigned
          if (Math.random() > 0.70) {
            techId = null;
          }
        }

        const keluhan = keluhanList[Math.floor(Math.random() * keluhanList.length)];

        bookingsToInsert.push({
          kode_booking: bookingCode,
          customer_id: custId,
          layanan_id: chosenSvc.id,
          jadwal_mulai: bookingTime.toISOString(),
          jadwal_selesai: endTime.toISOString(),
          alamat: custObj.alamat,
          keluhan,
          kontak: custObj.kontak,
          status,
          status_pembayaran: statusPembayaran,
          teknisi_id: techId,
          jumlah_unit: units,
          mulai_aktual: actualStart,
          selesai_aktual: actualEnd,
          alasan_batal: alasanBatal,
          alasan_tunda: alasanTunda,
          service: chosenSvc,
          bookingTime
        });
      }
    }

    console.log(`⚡ Menginsert ${bookingsToInsert.length} data booking secara batch...`);

    // Batch insert 400 baris per transaksi
    const CHUNK_SIZE = 400;
    for (let c = 0; c < bookingsToInsert.length; c += CHUNK_SIZE) {
      const chunk = bookingsToInsert.slice(c, c + CHUNK_SIZE);

      const valueClauses = [];
      const params = [];
      let paramIdx = 1;

      for (const b of chunk) {
        valueClauses.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5}, $${paramIdx+6}, $${paramIdx+7}, $${paramIdx+8}, $${paramIdx+9}, $${paramIdx+10}, $${paramIdx+11}, $${paramIdx+12}, $${paramIdx+13}, true, $${paramIdx+14}, $${paramIdx+15})`);
        params.push(
          b.kode_booking, b.customer_id, b.layanan_id, b.jadwal_mulai, b.jadwal_selesai,
          b.alamat, b.keluhan, b.kontak, b.status, b.teknisi_id, 'customer',
          b.jumlah_unit, b.mulai_aktual, b.selesai_aktual, b.alasan_batal, b.alasan_tunda
        );
        paramIdx += 16;
      }

      const insertSql = `
        INSERT INTO bookings (
          kode_booking, customer_id, layanan_id, jadwal_mulai, jadwal_selesai,
          alamat, keluhan, kontak, status, teknisi_id, created_by,
          jumlah_unit, mulai_aktual, selesai_aktual, is_synthetic,
          alasan_batal, alasan_tunda
        )
        VALUES ${valueClauses.join(',\n')}
        ;
      `;

      await client.query(insertSql, params);
      const rows = (await client.query('SELECT * FROM bookings WHERE kode_booking IN ($1)', [chunk.map(b => b.kode_booking)])).rows;
      const insertedRows = chunk.map(b => rows.find(row => row.kode_booking === b.kode_booking));
      totalBookingsCreated += insertedRows.length;

      // Update status_pembayaran & items
      for (let rIdx = 0; rIdx < insertedRows.length; rIdx++) {
        const row = insertedRows[rIdx];
        const original = chunk[rIdx];

        // Set status pembayaran
        if (original.status_pembayaran === 'paid') {
          await client.query('UPDATE bookings SET status_pembayaran = $1 WHERE id = $2', ['paid', row.id]);
        }

        // Insert booking items
        const harga = original.service.harga || 75000;
        const subtotal = harga * original.jumlah_unit;
        await client.query(`
          INSERT INTO booking_items (booking_id, layanan_id, jumlah_unit, harga_satuan, subtotal, catatan)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON DUPLICATE KEY UPDATE booking_id=booking_id;
        `, [row.id, original.service.id, original.jumlah_unit, harga, subtotal, original.keluhan]);

        // Status log
        await client.query(`
          INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan, waktu)
          VALUES ($1, NULL, $2, 'sistem', $3, $4)
          ON DUPLICATE KEY UPDATE booking_id=booking_id;
        `, [row.id, original.status, `Booking ${original.status}`, original.bookingTime]);

        // Feedback jika done
        if (original.status === 'done' && Math.random() < 0.65) {
          const rating = Math.random() < 0.85 ? 5 : 4;
          const komentar = feedbackComments[Math.floor(Math.random() * feedbackComments.length)];
          await client.query(`
            INSERT INTO feedback (booking_id, rating, komentar, sentimen, waktu)
            VALUES ($1, $2, $3, 'positif', $4)
            ON DUPLICATE KEY UPDATE booking_id=booking_id;
          `, [row.id, rating, komentar, new Date(new Date(original.jadwal_mulai).getTime() + 7200000)]);
        }

        // Inventory usage jika done
        if (original.status === 'done' && Math.random() < 0.25) {
          const invKey = Object.keys(invMap)[Math.floor(Math.random() * Object.keys(invMap).length)];
          const invId = invMap[invKey];
          if (invId) {
            await client.query(`
              INSERT INTO inventory_usage (booking_id, item_id, jumlah, teknisi_id, catatan, waktu)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON DUPLICATE KEY UPDATE booking_id=booking_id;
            `, [row.id, invId, 1, original.teknisi_id, `Pemakaian ${invKey} untuk tiket ${original.kode_booking}`, original.jadwal_mulai]);
          }
        }
      }

      console.log(`Progress: ${totalBookingsCreated} / ${bookingsToInsert.length} booking tersimpan...`);
    }

    await client.query('COMMIT');
    console.log(`🎉 SUKSES! Total ${totalBookingsCreated} data booking dummy aktif dari Jan s/d Nov 2026 berhasil dibuat.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Gagal membuat data dummy:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedDummyData().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { seedDummyData };
