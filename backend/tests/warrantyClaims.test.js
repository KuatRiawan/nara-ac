const request = require('supertest');
const { createApp } = require('../src/app');
const { query } = require('../src/db/pool');
const { signToken } = require('../src/middleware/auth');
const { generateCsrfToken } = require('../src/middleware/csrf');
const warrantyService = require('../src/services/warrantyService');
const acUnitService = require('../src/services/acUnitService');

describe('Phase 4: Warranty Claims & AC Unit Maintenance (BR-15 s/d BR-33)', () => {
  let app;
  let adminToken;
  let techToken;
  let customerToken;
  let adminHeaders;
  let techHeaders;
  let customerHeaders;
  let testTechId;
  let customerId;
  let unitId;
  let doneBookingId;
  let expiredBookingId;

  beforeAll(async () => {
    app = createApp();

    // Pastikan user admin ada
    const adminUser = (await query("SELECT * FROM users WHERE role = 'admin' LIMIT 1")).rows[0] || { id: 1, role: 'admin', nama: 'Admin Test' };
    adminToken = signToken(adminUser);
    adminHeaders = { Authorization: `Bearer ${adminToken}`, 'X-CSRF-Token': generateCsrfToken(adminUser.id) };

    // Pastikan teknisi ada
    const techRow = (await query('SELECT id FROM technicians WHERE aktif = true ORDER BY id LIMIT 1')).rows[0];
    testTechId = techRow ? techRow.id : 1;
    const techUser = (await query("SELECT * FROM users WHERE role = 'technician' LIMIT 1")).rows[0] || { id: 2, role: 'technician', nama: 'Teknisi Test', technician_id: testTechId };
    techToken = signToken(techUser);
    techHeaders = { Authorization: `Bearer ${techToken}`, 'X-CSRF-Token': generateCsrfToken(techUser.id) };

    const testSuffix = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
    const testPhone = `0889${testSuffix}`;

    // Buat customer & unit AC untuk testing
    const custRes = await query(`
      INSERT INTO customers (nama, kontak, alamat)
      VALUES ('Customer Garansi', $1, 'Jl. Garansi No. 123')
      RETURNING id
    `, [testPhone]);
    customerId = custRes.rows[0].id;

    const custUserRes = await query(`
      INSERT INTO users (email, password_hash, role, nama, customer_id)
      VALUES ('custgaransi_${Date.now()}@test.com', 'dummy_hash', 'customer', 'Customer Garansi', $1)
      RETURNING id, role, nama, customer_id
    `, [customerId]);
    customerToken = signToken(custUserRes.rows[0]);
    customerHeaders = { Authorization: `Bearer ${customerToken}`, 'X-CSRF-Token': generateCsrfToken(custUserRes.rows[0].id) };

    // Buat AC Unit (BR-15)
    const unitRes = await query(`
      INSERT INTO ac_units (customer_id, brand, model, lokasi, kapasitas_pk, tanggal_pasang)
      VALUES ($1, 'Daikin', 'Inverter FTKQ', 'Kamar Utama', 1.0, '2026-01-15')
      RETURNING id
    `, [customerId]);
    unitId = unitRes.rows[0].id;

    // Buat booking selesai baru-baru ini (garansi aktif)
    const bDone = await query(`
      INSERT INTO bookings (
        kode_booking, customer_id, ac_unit_id, layanan_id, jadwal_mulai, jadwal_selesai,
        selesai_aktual, alamat, kontak, keluhan, status, status_pembayaran
      ) VALUES (
        $1, $2, $3, 4, now() - interval '3 days', now() - interval '3 days' + interval '90 minutes',
        now() - interval '3 days', 'Jl. Garansi No. 123', $4, 'AC bocor air', 'done', 'paid'
      ) RETURNING id
    `, [`NARA-AC-GARANSI-AKTIF-${testSuffix}`, customerId, unitId, testPhone]);
    doneBookingId = bDone.rows[0].id;

    // Buat booking selesai yang sudah lampau (garansi kadaluarsa > 45 hari)
    const bExpired = await query(`
      INSERT INTO bookings (
        kode_booking, customer_id, ac_unit_id, layanan_id, jadwal_mulai, jadwal_selesai,
        selesai_aktual, alamat, kontak, keluhan, status, status_pembayaran
      ) VALUES (
        $1, $2, $3, 1, now() - interval '60 days', now() - interval '60 days' + interval '60 minutes',
        now() - interval '60 days', 'Jl. Garansi No. 123', $4, 'AC bau apek', 'done', 'paid'
      ) RETURNING id
    `, [`NARA-AC-GARANSI-EXPIRED-${testSuffix}`, customerId, unitId, testPhone]);
    expiredBookingId = bExpired.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await query('DELETE FROM warranty_claims WHERE booking_id IN ($1, $2)', [doneBookingId, expiredBookingId]);
    await query('DELETE FROM feedback WHERE booking_id IN ($1, $2)', [doneBookingId, expiredBookingId]);
    await query('DELETE FROM bookings WHERE id IN ($1, $2)', [doneBookingId, expiredBookingId]);
    await query('DELETE FROM ac_units WHERE id = $1', [unitId]);
    await query('DELETE FROM users WHERE customer_id = $1', [customerId]);
    await query('DELETE FROM customers WHERE id = $1', [customerId]);
  });

  test('BR-23: Menghitung durasi garansi sesuai jenis layanan secara akurat', () => {
    expect(warrantyService.getWarrantyDurationDays('Cuci AC Standard')).toBe(14);
    expect(warrantyService.getWarrantyDurationDays('Cuci AC Core (Deep Clean)')).toBe(30);
    expect(warrantyService.getWarrantyDurationDays('Paket Core + Isi Freon')).toBe(45);
    expect(warrantyService.getWarrantyDurationDays('Bongkar Pasang AC')).toBe(30);
  });

  test('BR-23 & BR-24: Endpoint warranty-info menampilkan durasi, masa berlaku, dan sisa hari', async () => {
    const res = await request(app).get(`/api/v1/claims/warranty-info/${doneBookingId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.durasi_garansi_hari).toBe(30); // Cuci AC Core = 30 hari
    expect(res.body.data.is_garansi_aktif).toBe(true);
    expect(res.body.data.sisa_hari_garansi).toBeGreaterThan(20);
  });

  test('BR-24: Menolak klaim jika masa garansi sudah berakhir', async () => {
    const res = await request(app)
      .post('/api/v1/claims')
      .set(customerHeaders)
      .send({
        booking_id: expiredBookingId,
        keluhan: 'AC bocor air kembali setelah 2 bulan',
        rating: 4,
        review_komentar: 'Layanan cukup baik',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Masa garansi.*telah berakhir/i);
  });

  test('BR-25: Klaim wajib menyertakan review berupa rating dan komentar', async () => {
    const res = await request(app)
      .post('/api/v1/claims')
      .set(customerHeaders)
      .send({
        booking_id: doneBookingId,
        keluhan: 'AC kembali kurang dingin setelah 3 hari',
        // Tidak menyertakan rating dan review_komentar
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/wajib menyertakan review/i);
  });

  let createdClaimId;
  let claimKode;

  test('BR-25 & BR-28: Pengajuan klaim berhasil dan otomatis diset bebas biaya (is_gratis = true)', async () => {
    const res = await request(app)
      .post('/api/v1/claims')
      .set(customerHeaders)
      .send({
        booking_id: doneBookingId,
        keluhan: 'AC kembali berbunyi getar pada indoor unit',
        rating: 4,
        review_komentar: 'Pengerjaan teknisi rapi, tapi muncul bunyi getar setelah dipakai 3 hari.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('kode_klaim');
    expect(res.body.data.is_gratis).toBe(true);
    expect(res.body.data.status).toBe('diajukan');

    createdClaimId = res.body.data.id;
    claimKode = res.body.data.kode_klaim;

    // Verifikasi review tersimpan di feedback (BR-25)
    const fb = (await query('SELECT * FROM feedback WHERE booking_id = $1', [doneBookingId])).rows[0];
    expect(fb).toBeDefined();
    expect(fb.rating).toBe(4);
    expect(fb.komentar).toMatch(/bunyi getar/);
  });

  test('BR-30: Menolak pengajuan klaim kedua jika masih ada klaim aktif untuk booking yang sama', async () => {
    const res = await request(app)
      .post('/api/v1/claims')
      .set(customerHeaders)
      .send({
        booking_id: doneBookingId,
        keluhan: 'AC juga tidak mau swing otomatis',
        rating: 3,
        review_komentar: 'Ada kendala swing',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/Hanya satu klaim garansi aktif yang diperbolehkan \(BR-30\)/i);
  });

  test('BR-26 & BR-27: Admin menjadwalkan pemeriksaan dan menunjuk teknisi pemeriksa', async () => {
    const res = await request(app)
      .patch(`/api/v1/claims/${createdClaimId}/schedule`)
      .set(adminHeaders)
      .send({
        jadwal_pemeriksaan: new Date(Date.now() + 86400000).toISOString(),
        teknisi_pemeriksa_id: testTechId,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('dijadwalkan');
    expect(res.body.data.teknisi_pemeriksa_id).toBe(testTechId);
  });

  test('BR-26: Teknisi mengisi laporan hasil pemeriksaan klaim', async () => {
    const res = await request(app)
      .post(`/api/v1/claims/${createdClaimId}/inspect`)
      .set(techHeaders)
      .send({
        catatan_pemeriksaan: 'Baut bracket indoor sedikit longgar menyebabkan getaran. Sudah dikencangkan kembali dan normal.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('diperiksa');
    expect(res.body.data.catatan_pemeriksaan).toMatch(/Baut bracket/);
  });

  test('BR-26, BR-28, BR-33: Admin memutuskan kelayakan klaim (disetujui/ditolak)', async () => {
    const res = await request(app)
      .patch(`/api/v1/claims/${createdClaimId}/decide`)
      .set(adminHeaders)
      .send({
        keputusan: 'disetujui',
        biaya_tambahan: 0,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('disetujui');
    expect(res.body.data.is_gratis).toBe(true); // BR-28
  });

  test('BR-32: Tindak lanjut klaim ditolak dengan booking servis berbayar', async () => {
    // Buat klaim baru lalu tolak (BR-33: segel rusak)
    const claimDitolakRes = await query(`
      INSERT INTO warranty_claims (kode_klaim, booking_id, customer_id, ac_unit_id, keluhan, status, is_gratis, alasan_penolakan)
      VALUES ('CLM-TEST-REJECT', $1, $2, $3, 'Freon habis', 'ditolak', true, 'Segel outdoor rusak akibat dibongkar teknisi luar (BR-33)')
      RETURNING id
    `, [doneBookingId, customerId, unitId]);
    const rejClaimId = claimDitolakRes.rows[0].id;

    const res = await request(app)
      .post(`/api/v1/claims/${rejClaimId}/convert-to-paid`)
      .set(customerHeaders)
      .send({
        layanan_id: 3, // Isi Freon berbayar
        jadwal_mulai: new Date(Date.now() + 2 * 86400000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.booking_baru).toBeDefined();
    expect(res.body.booking_baru.status).toBe('scheduled');
    expect(res.body.booking_baru.status_pembayaran).toBe('pending'); // Berbayar

    // Cleanup klaim dummy
    await query('DELETE FROM bookings WHERE id = $1', [res.body.booking_baru.id]);
    await query('DELETE FROM warranty_claims WHERE id = $1', [rejClaimId]);
  });

  test('BR-15, BR-16, BR-17: Perhitungan riwayat servis unit AC mengabaikan booking yang dibatalkan', async () => {
    // Tambah booking dibatalkan untuk unit ini
    const bBatal = await query(`
      INSERT INTO bookings (
        kode_booking, customer_id, ac_unit_id, layanan_id, jadwal_mulai, jadwal_selesai,
        alamat, kontak, keluhan, status, status_pembayaran
      ) VALUES (
        'NARA-AC-BATAL', $1, $2, 1, now() - interval '1 days', now() - interval '1 days' + interval '60 minutes',
        'Jl. Garansi No. 123', '081299887766', 'AC berisik', 'cancelled', 'pending'
      ) RETURNING id
    `, [customerId, unitId]);

    const maint = await acUnitService.getUnitMaintenanceInfo(unitId);

    // BR-17: Booking yang dibatalkan TIDAK dihitung sebagai servis selesai
    expect(maint.total_servis_selesai).toBe(2); // Hanya doneBookingId dan expiredBookingId, TIDAK termasuk bBatal
    expect(maint.riwayat_servis.every(b => b.status === 'done')).toBe(true);

    // BR-16: Sistem menghitung jadwal perawatan berikutnya
    expect(maint.jadwal_perawatan_berikutnya).toBeDefined();

    // Cleanup booking batal
    await query('DELETE FROM bookings WHERE id = $1', [bBatal.rows[0].id]);
  });
});
