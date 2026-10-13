const { pool } = require('./pool');
const bcrypt = require('bcryptjs');
const config = require('../config');

async function seedDummyData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🚀 Mulai membuat data dummy NARA AC...');

    // 1. Password hash untuk akun demo
    const passwordHash = await bcrypt.hash(config.demoPassword, 10);

    // 2. Tambah Teknisi (Total 4 teknisi)
    console.log('📦 Menyiapkan teknisi...');
    const techData = [
      { nama: 'Budi Santoso', kontak: '081234567890', catatan: 'Spesialis AC Inverter & Multi-Split' },
      { nama: 'Agus Setiawan', kontak: '081234567891', catatan: 'Spesialis Bongkar Pasang & Instalasi Pipa' },
      { nama: 'Rian Hidayat', kontak: '081234567892', catatan: 'Teknisi Senior Overhaul Core & Chemical Wash' },
      { nama: 'Fajar Pratama', kontak: '081234567893', catatan: 'Spesialis Kelistrikan & Deteksi Kebocoran Freon' }
    ];

    const techMap = {};
    for (const t of techData) {
      const res = await client.query(`
        INSERT INTO technicians (nama, kontak, catatan, aktif, is_synthetic)
        VALUES ($1, $2, $3, true, true)
        ON CONFLICT DO NOTHING
        RETURNING id, nama;
      `, [t.nama, t.kontak, t.catatan]);

      let techId = res.rows[0]?.id;
      if (!techId) {
        const found = await client.query('SELECT id FROM technicians WHERE kontak = $1', [t.kontak]);
        techId = found.rows[0]?.id;
      }
      techMap[t.nama] = techId;

      // Buat akun user untuk teknisi
      const email = `${t.nama.split(' ')[0].toLowerCase()}@nara-ac.local`;
      await client.query(`
        INSERT INTO users (nama, email, password_hash, role, technician_id)
        VALUES ($1, $2, $3, 'technician', $4)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, technician_id = EXCLUDED.technician_id;
      `, [t.nama, email, passwordHash, techId]);
    }

    // 3. Tambah Inventaris / Sparepart
    console.log('📦 Menyiapkan inventaris...');
    const inventoryData = [
      { nama: 'Freon R32 Murni', kategori: 'freon', stok: 45.5, satuan: 'kg', min: 10.0 },
      { nama: 'Freon R410A Original', kategori: 'freon', stok: 32.0, satuan: 'kg', min: 8.0 },
      { nama: 'Freon R22 Refrigrant', kategori: 'freon', stok: 18.0, satuan: 'kg', min: 5.0 },
      { nama: 'Pipa Tembaga Saeki 1/4', kategori: 'pipa', stok: 95.0, satuan: 'meter', min: 20.0 },
      { nama: 'Pipa Tembaga Saeki 3/8', kategori: 'pipa', stok: 70.0, satuan: 'meter', min: 15.0 },
      { nama: 'Kapasitor Kompresor 25uF', kategori: 'komponen', stok: 24.0, satuan: 'pcs', min: 5.0 },
      { nama: 'Kapasitor Kompresor 35uF', kategori: 'komponen', stok: 16.0, satuan: 'pcs', min: 5.0 },
      { nama: 'Pompa Drainase Otomatis', kategori: 'komponen', stok: 8.0, satuan: 'unit', min: 2.0 },
      { nama: 'Chemical Coil Cleaner NARA', kategori: 'komponen', stok: 40.0, satuan: 'liter', min: 10.0 },
      { nama: 'Selang Fleksibel Pembuangan Air', kategori: 'pipa', stok: 120.0, satuan: 'meter', min: 25.0 },
      { nama: 'Kabel Listrik NYM 3x2.5mm', kategori: 'kabel', stok: 150.0, satuan: 'meter', min: 30.0 }
    ];

    const invMap = {};
    for (const inv of inventoryData) {
      const res = await client.query(`
        INSERT INTO inventory (nama, kategori, stok, satuan, min_stok, aktif, is_synthetic)
        VALUES ($1, $2, $3, $4, $5, true, true)
        ON CONFLICT (nama) DO UPDATE SET stok = EXCLUDED.stok
        RETURNING id, nama;
      `, [inv.nama, inv.kategori, inv.stok, inv.satuan, inv.min]);
      const invId = res.rows[0]?.id || (await client.query('SELECT id FROM inventory WHERE nama = $1', [inv.nama])).rows[0].id;
      invMap[inv.nama] = invId;
    }

    // 4. Tambah Pelanggan Nyata (15 Pelanggan)
    console.log('📦 Menyiapkan data pelanggan...');
    const customerData = [
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
      { nama: 'Ibu Linda Hartati', kontak: '081277665544', alamat: 'Cluster Bellflower Harvest City Blok BF No. 03, Setu, Kab. Bekasi' }
    ];

    const custMap = {};
    for (const c of customerData) {
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
      custMap[c.kontak] = { id: custId, ...c };
    }

    // 5. Tambah Data AC Units untuk Pelanggan
    console.log('📦 Menyiapkan unit AC terdaftar...');
    const acUnitsSeed = [
      { cust: '085512341234', brand: 'Daikin', model: 'Inverter Smile Curve', tipe: 'Split Wall', pk: 1.0, lokasi: 'Kamar Tidur Utama' },
      { cust: '085512341234', brand: 'Sharp', model: 'Sayonara Panas J-Tech', tipe: 'Split Wall', pk: 0.5, lokasi: 'Kamar Anak' },
      { cust: '085512341235', brand: 'Panasonic', model: 'CS-YN9WKJ Standard', tipe: 'Split Wall', pk: 1.0, lokasi: 'Ruang Tamu Lantai 1' },
      { cust: '081288223344', brand: 'Gree', model: 'F1 Deluxe Inverter', tipe: 'Split Wall', pk: 1.5, lokasi: 'Ruang Keluarga' },
      { cust: '081399112233', brand: 'LG', model: 'Dual Inverter Eco T10EV4', tipe: 'Split Wall', pk: 1.0, lokasi: 'Kamar Tidur Master' },
      { cust: '081277334455', brand: 'Daikin', model: 'Multi-S 2 Connection', tipe: 'Multi Split', pk: 2.0, lokasi: 'Lantai 2' },
      { cust: '081211009988', brand: 'Mitsubishi Heavy', model: 'SRK10CRS-S4 Standard', tipe: 'Cassette / Split', pk: 2.0, lokasi: 'Area Resepsionis Klinik' },
      { cust: '081388776655', brand: 'Gree', model: 'Commercial Ducting Inverter', tipe: 'Standing / Duct', pk: 2.5, lokasi: 'Ruang Rapat Utama' }
    ];

    for (const u of acUnitsSeed) {
      const c = custMap[u.cust];
      if (c) {
        await client.query(`
          INSERT INTO ac_units (customer_id, brand, model, tipe, kapasitas_pk, lokasi, nomor_seri, aktif)
          VALUES ($1, $2, $3, $4, $5, $6, $7, true)
          ON CONFLICT DO NOTHING;
        `, [c.id, u.brand, u.model, u.tipe, u.pk, u.lokasi, `SN-${u.brand.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`]);
      }
    }

    // 6. Ambil Service Catalog
    const svcs = (await client.query('SELECT id, kode, nama_layanan, harga, durasi_menit FROM service_catalog ORDER BY id')).rows;
    const sCuci = svcs.find(s => s.kode === 'SRV-CUCI-01') || svcs[0];
    const sCore = svcs.find(s => s.kode === 'SRV-CUCI-CORE') || svcs[1] || svcs[0];
    const sFreon = svcs.find(s => s.kode === 'SRV-CUCI-FREON') || svcs[2] || svcs[0];
    const sPasang = svcs.find(s => s.kode === 'SRV-BONGKAR-01') || svcs[3] || svcs[0];
    const sIsiFreon = svcs.find(s => s.kode === 'SRV-FREON-01') || svcs[4] || svcs[0];

    const techIds = Object.values(techMap).filter(Boolean);

    // 7. Data Booking Dummy (Realistis: Lampau, Berjalan, dan Mendatang)
    console.log('📦 Menyiapkan transaksi booking, invoice, & log...');

    const now = new Date();
    // Helper format ISO WIB
    const makeDate = (daysOffset, hours, minutes) => {
      const d = new Date(now);
      d.setDate(d.getDate() + daysOffset);
      d.setHours(hours, minutes, 0, 0);
      return d.toISOString();
    };

    const bookingsSeed = [
      // --- SELESAI (DONE) DENGAN FEEDBACK BINTANG 5 ---
      {
        kode: 'AC-7101',
        cust: '085512341234',
        svc: sCore,
        unit: 2,
        hari: -10, jam: 9, min: 0,
        status: 'done',
        techIdx: 0,
        keluhan: 'Hembusan angin berbau apek dan kurang dingin',
        rating: 5,
        komentar: 'Bongkar total talang air dan rotor blower bersih sekali! Tekanan freon dicek langsung di depan saya. Sangat profesional.',
        pakaiItem: 'Chemical Coil Cleaner NARA', pakaiQty: 1.5
      },
      {
        kode: 'AC-7102',
        cust: '085512341235',
        svc: sFreon,
        unit: 1,
        hari: -8, jam: 10, min: 30,
        status: 'done',
        techIdx: 1,
        keluhan: 'AC netes air dari indoor dan dinginnya lama',
        rating: 5,
        komentar: 'Teknisi ramah dan teliti. Saluran pembuangan disemprot lancar lagi, dingin kembali menusuk seperti baru.',
        pakaiItem: 'Freon R32 Murni', pakaiQty: 0.4
      },
      {
        kode: 'AC-7103',
        cust: '081288223344',
        svc: sCuci,
        unit: 3,
        hari: -7, jam: 13, min: 0,
        status: 'done',
        techIdx: 2,
        keluhan: 'Perawatan rutin berkala 3 unit AC rumah',
        rating: 5,
        komentar: 'Dapat diskon multi-unit 10%, invoice langsung tercetak rapi. Teknisi bawa cover plastik jadi lantai rumah tetap kering.',
        pakaiItem: 'Chemical Coil Cleaner NARA', pakaiQty: 2.0
      },
      {
        kode: 'AC-7104',
        cust: '081399112233',
        svc: sIsiFreon,
        unit: 1,
        hari: -5, jam: 9, min: 0,
        status: 'done',
        techIdx: 3,
        keluhan: 'Pipa outdoor timbul bunga es putih',
        rating: 4,
        komentar: 'Ternyata tekanan freon drop ke 60 psi. Diisi presisi ke 140 psi, pipa outdoor langsung basah berembun segar.',
        pakaiItem: 'Freon R410A Original', pakaiQty: 0.6
      },
      {
        kode: 'AC-7105',
        cust: '081277334455',
        svc: sCore,
        unit: 2,
        hari: -4, jam: 14, min: 0,
        status: 'done',
        techIdx: 0,
        keluhan: 'Suara kipas indoor berisik getar & debu tebal',
        rating: 5,
        komentar: 'Blower fan dilepas dan dicuci sampai hitam-hitamnya luntur. Suara AC jadi hening total.',
        pakaiItem: null
      },
      {
        kode: 'AC-7106',
        cust: '081366554433',
        svc: sCuci,
        unit: 1,
        hari: -3, jam: 10, min: 0,
        status: 'done',
        techIdx: 1,
        keluhan: 'Cuci AC standard 3 bulanan',
        rating: 5,
        komentar: 'Pelayanan cepat tanggap, invoice langsung masuk dengan kop resmi CV. Nara Teknindotama.',
        pakaiItem: null
      },
      {
        kode: 'AC-7107',
        cust: '081255443322',
        svc: sPasang,
        unit: 1,
        hari: -2, jam: 13, min: 30,
        status: 'done',
        techIdx: 1,
        keluhan: 'Pindahan kamar, pasang ulang AC Daikin 1 PK',
        rating: 5,
        komentar: 'Instalasi rapi, divakum 15 menit sebelum buka kran valve outdoor. Garansi instalasi 30 hari.',
        pakaiItem: 'Pipa Tembaga Saeki 1/4', pakaiQty: 4.0
      },
      {
        kode: 'AC-7108',
        cust: '081344332211',
        svc: sCore,
        unit: 1,
        hari: -1, jam: 9, min: 0,
        status: 'done',
        techIdx: 2,
        keluhan: 'Air menetes di pojok casing kanan',
        rating: 5,
        komentar: 'Talang air belakang yang tersumbat lendir berhasil dibersihkan. Sangat memuaskan.',
        pakaiItem: null
      },

      // --- SEDANG BERJALAN HARI INI (ON PROCESS) ---
      {
        kode: 'AC-8201',
        cust: '081233221100',
        svc: sFreon,
        unit: 2,
        hari: 0, jam: 9, min: 0,
        status: 'on process',
        techIdx: 0,
        keluhan: 'AC ruang tamu kurang nyes dinginnya dan hembusan kecil'
      },
      {
        kode: 'AC-8202',
        cust: '081322110099',
        svc: sCore,
        unit: 1,
        hari: 0, jam: 13, min: 30,
        status: 'on process',
        techIdx: 3,
        keluhan: 'Butuh deep clean sebelum acara keluarga malam nanti'
      },

      // --- MENDATANG / TERJADWAL HARI INI & BESOK (SCHEDULED DENGAN TEKNISI) ---
      {
        kode: 'AC-9301',
        cust: '081211009988',
        svc: sCore,
        unit: 2,
        hari: 1, jam: 9, min: 0,
        status: 'scheduled',
        techIdx: 0,
        keluhan: 'Servis rutin berkala untuk ruang praktek dokter klinik'
      },
      {
        kode: 'AC-9302',
        cust: '081300998877',
        svc: sCuci,
        unit: 1,
        hari: 1, jam: 11, min: 0,
        status: 'scheduled',
        techIdx: 1,
        keluhan: 'AC kamar anak mulai mengeluarkan bau lembap'
      },
      {
        kode: 'AC-9303',
        cust: '081299887766',
        svc: sFreon,
        unit: 1,
        hari: 2, jam: 13, min: 30,
        status: 'scheduled',
        techIdx: 2,
        keluhan: 'AC Sharp Inverter dinginnya hilang setelah 2 tahun tidak servis'
      },

      // --- MENDATANG BELUM DITUGASKAN (UNASSIGNED - UNTUK DICOBA OLEH ADMIN) ---
      {
        kode: 'AC-9304',
        cust: '081388776655',
        svc: sCore,
        unit: 3,
        hari: 2, jam: 9, min: 0,
        status: 'scheduled',
        techIdx: null,
        keluhan: 'Pembersihan 3 unit AC kantor sebelum jam operasional kantor'
      },
      {
        kode: 'AC-9305',
        cust: '081277665544',
        svc: sCuci,
        unit: 2,
        hari: 3, jam: 10, min: 0,
        status: 'scheduled',
        techIdx: null,
        keluhan: 'Pesan paket hemat 2 unit AC rumah baru'
      },
      {
        kode: 'AC-9306',
        cust: '085512341234',
        svc: sFreon,
        unit: 1,
        hari: 4, jam: 14, min: 0,
        status: 'scheduled',
        techIdx: null,
        keluhan: 'Penambahan freon R32 untuk unit ruang kerja'
      },

      // --- STATUS KHUSUS: RESCHEDULED & CANCELLED ---
      {
        kode: 'AC-9307',
        cust: '081288223344',
        svc: sCuci,
        unit: 1,
        hari: 3, jam: 15, min: 0,
        status: 'rescheduled',
        techIdx: 2,
        keluhan: 'Pergeseran jam servis atas permintaan pelanggan karena rapat mendadak'
      },
      {
        kode: 'AC-9308',
        cust: '081399112233',
        svc: sCuci,
        unit: 1,
        hari: -6, jam: 11, min: 0,
        status: 'cancelled',
        techIdx: null,
        keluhan: 'Dibatalkan: Pelanggan mendadak bertugas dinas ke luar kota'
      }
    ];

    let createdCount = 0;
    for (const b of bookingsSeed) {
      const c = custMap[b.cust];
      if (!c) continue;

      const durasi = b.svc.durasi_menit || 60;
      const startIso = makeDate(b.hari, b.jam, b.min);
      const startDate = new Date(startIso);
      const endDate = new Date(startDate.getTime() + durasi * 60000);
      const endIso = endDate.toISOString();

      const assignedTechId = (b.techIdx !== null && techIds[b.techIdx]) ? techIds[b.techIdx] : null;

      // Actual times for done
      const actualStart = b.status === 'done' ? startDate.toISOString() : null;
      const actualEnd = b.status === 'done' ? new Date(startDate.getTime() + (durasi - 5) * 60000).toISOString() : null;

      const insBooking = await client.query(`
        INSERT INTO bookings (
          kode_booking, customer_id, layanan_id, jadwal_mulai, jadwal_selesai,
          alamat, keluhan, kontak, status, teknisi_id, created_by,
          jumlah_unit, mulai_aktual, selesai_aktual, is_synthetic,
          alasan_batal, alasan_tunda
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, $15, $16)
        ON CONFLICT (kode_booking) DO UPDATE SET
          status = EXCLUDED.status,
          teknisi_id = EXCLUDED.teknisi_id,
          jadwal_mulai = EXCLUDED.jadwal_mulai,
          jadwal_selesai = EXCLUDED.jadwal_selesai
        RETURNING id;
      `, [
        b.kode, c.id, b.svc.id, startIso, endIso,
        c.alamat, b.keluhan, c.kontak, b.status, assignedTechId, 'customer',
        b.unit || 1, actualStart, actualEnd,
        b.status === 'cancelled' ? b.keluhan : null,
        b.status === 'rescheduled' ? 'Penyesuaian jam oleh pelanggan' : null
      ]);

      const bookingId = insBooking.rows[0]?.id;
      if (!bookingId) continue;
      createdCount++;

      // Log status
      await client.query(`
        INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan, waktu)
        VALUES ($1, NULL, $2, 'sistem', $3, $4)
        ON CONFLICT DO NOTHING;
      `, [bookingId, b.status, `Booking ${b.status}`, startDate]);

      // Feedback jika done
      if (b.status === 'done' && b.rating) {
        await client.query(`
          INSERT INTO feedback (booking_id, rating, komentar, sentimen, waktu)
          VALUES ($1, $2, $3, 'positif', $4)
          ON CONFLICT DO NOTHING;
        `, [bookingId, b.rating, b.komentar, new Date(startDate.getTime() + 7200000)]);
      }

      // Pemakaian inventory jika ada
      if (b.status === 'done' && b.pakaiItem && invMap[b.pakaiItem]) {
        await client.query(`
          INSERT INTO inventory_usage (booking_id, item_id, jumlah, teknisi_id, catatan, waktu)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT DO NOTHING;
        `, [
          bookingId,
          invMap[b.pakaiItem],
          b.pakaiQty || 1,
          assignedTechId,
          `Penggunaan ${b.pakaiItem} untuk tiket ${b.kode}`,
          actualEnd || startDate
        ]);
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Berhasil! ${createdCount} data booking dummy dan relasinya telah dibuat.`);
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
