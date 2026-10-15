const { pool } = require('./pool');
const bcrypt = require('bcryptjs');
const config = require('../config');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Settings
    console.log('Seeding settings...');
    await client.query(`
      INSERT INTO settings (key, value) VALUES 
      ('operating_hours', '{"open": "08:00", "close": "17:00", "days": [1,2,3,4,5], "slot_minutes": 60, "min_lead_minutes": 120, "max_advance_days": 30, "reminder_hour": -24}')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `);

    // 2. Service Catalog
    console.log('Seeding service catalog...');
    await client.query(`
      INSERT INTO service_catalog (kode, nama_layanan, kategori, deskripsi, harga, durasi_menit)
      VALUES 
      ('SRV-CUCI-01', 'Cuci AC Standard', 'cuci', 'Pembersihan filter, evaporator, dan cek tekanan freon', 75000, 60),
      ('SRV-CUCI-CORE', 'Cuci AC Core (Deep Clean)', 'cuci', 'Bongkar total rotor fan & talang air, chemical wash, & sterilisasi', 120000, 90),
      ('SRV-CUCI-FREON', 'Paket Core + Isi Freon', 'cuci', 'Deep clean bongkar total plus isi freon murni presisi pabrikan', 220000, 105),
      ('SRV-BONGKAR-01', 'Bongkar Pasang AC', 'instalasi', 'Jasa bongkar dan pasang AC di lokasi baru', 350000, 120),
      ('SRV-FREON-01', 'Isi Freon R32', 'perbaikan', 'Pengisian freon R32 sampai tekanan standar', 150000, 45)
      ON CONFLICT (kode) DO NOTHING;
    `);

    // 3. Technicians
    console.log('Seeding technicians...');
    const techData = [
      { nama: 'Budi Santoso', kontak: '081234567890' },
      { nama: 'Agus Setiawan', kontak: '081234567891' }
    ];
    const techs = [];
    for (const t of techData) {
      const found = await client.query('SELECT id, nama FROM technicians WHERE kontak = $1', [t.kontak]);
      if (found.rows.length > 0) {
        const tid = found.rows[0].id;
        await client.query('UPDATE technicians SET nama = $1, aktif = true WHERE id = $2', [t.nama, tid]);
        techs.push({ id: tid, nama: t.nama });
      } else {
        const ins = await client.query('INSERT INTO technicians (nama, kontak, is_synthetic) VALUES ($1, $2, true) RETURNING id, nama', [t.nama, t.kontak]);
        techs.push(ins.rows[0]);
      }
    }

    // 4. Users
    console.log('Seeding users...');
    const passwordHash = await bcrypt.hash(config.demoPassword, 10);
    
    await client.query(`
      INSERT INTO users (nama, email, password_hash, role)
      VALUES ('Admin Utama', 'admin@nara-ac.local', $1, 'admin')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
    `, [passwordHash]);

    for (const t of techs) {
      const email = `${t.nama.split(' ')[0].toLowerCase()}@nara-ac.local`;
      await client.query(`
        INSERT INTO users (nama, email, password_hash, role, technician_id)
        VALUES ($1, $2, $3, 'technician', $4)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
      `, [t.nama, email, passwordHash, t.id]);
    }

    // 5. Customers
    console.log('Seeding customers...');
    const custRes = await client.query(`
      INSERT INTO customers (nama, kontak, alamat, is_synthetic)
      VALUES 
      ('Citra Lestari', '085512341234', 'Jl. Merdeka No.10, Jakarta', true),
      ('Dani Pratama', '085512341235', 'Jl. Sudirman No.5, Jakarta', true)
      ON CONFLICT (kontak) DO NOTHING
      RETURNING id;
    `);
    const customers = custRes.rows;
    
    // If no rows returned, fetch existing ones
    if (customers.length === 0) {
      const existingCust = await client.query(`SELECT id FROM customers WHERE kontak IN ('085512341234', '085512341235')`);
      customers.push(...existingCust.rows);
    }

    // 6. Inventory
    console.log('Seeding inventory...');
    await client.query(`
      INSERT INTO inventory (nama, kategori, stok, satuan, min_stok)
      VALUES 
      ('Freon R32', 'freon', 50.0, 'kg', 10.0),
      ('Pipa Tembaga 1/4', 'pipa', 100.0, 'meter', 20.0)
      ON CONFLICT (nama) DO NOTHING;
    `);

    // 7. Bookings
    console.log('Seeding bookings...');
    const svcs = (await client.query('SELECT id FROM service_catalog')).rows;
    
    if (customers.length > 0 && svcs.length > 0 && techs.length > 0) {
      // Check if seed bookings already exist
      const existingPast = (await client.query('SELECT 1 FROM bookings WHERE kode_booking = $1', ['BK-PAST-001'])).rows.length > 0;
      const existingFut = (await client.query('SELECT 1 FROM bookings WHERE kode_booking = $1', ['BK-FUT-001'])).rows.length > 0;
      
      if (!existingPast) {
        await client.query(`
          INSERT INTO bookings (kode_booking, customer_id, layanan_id, jadwal_mulai, jadwal_selesai, alamat, keluhan, kontak, status, teknisi_id, is_synthetic, status_pembayaran)
          VALUES (
            'BK-PAST-001', $1, $2, now() - interval '2 days', now() - interval '2 days' + interval '1 hour',
            'Jl. Merdeka No.10', 'AC kurang dingin', '085512341234', 'done', $3, true, 'paid'
          ) ON CONFLICT (kode_booking) DO NOTHING;
        `, [customers[0].id, svcs[0].id, techs[0].id]);
      }
      
      if (!existingFut) {
        await client.query(`
          INSERT INTO bookings (kode_booking, customer_id, layanan_id, jadwal_mulai, jadwal_selesai, alamat, keluhan, kontak, status, teknisi_id, is_synthetic, status_pembayaran)
          VALUES (
            'BK-FUT-001', $1, $2, now() + interval '1 days', now() + interval '1 days' + interval '1 hour',
            'Jl. Sudirman No.5', 'AC netes air', '085512341235', 'scheduled', $3, true, 'pending'
          ) ON CONFLICT (kode_booking) DO NOTHING;
        `, [customers[1].id, svcs[1].id, techs[1].id]);
      }
    }

    await client.query('COMMIT');
    console.log('Seeding selesai!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding gagal:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
