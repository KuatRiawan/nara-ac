/**
 * Checklist coverage: Skenario D (edge cases), Section 4 (conflict), Section 6 (status lifecycle),
 * Section 7 (auth & verification), Section 8 (database integrity).
 */
const request = require('supertest');
const { createApp } = require('../src/app');
const { pool, query } = require('../src/db/pool');
const { signToken } = require('../src/middleware/auth');
const { generateCsrfToken } = require('../src/middleware/csrf');
const { TRANSITIONS } = require('../src/services/bookingService');

const PREFIX = '081200'; // kontak uji: 081200xxxxxx (dibersihkan sebelum/sesudah run)

describe('Booking rules, lifecycle, auth, and DB integrity', () => {
  let app;
  let adminCookie;
  let adminHeaders;
  let seq = 0;
  const contact = () => `${PREFIX}${String(100000 + seq++)}`;

  const basePayload = (over = {}) => ({
    nama: 'Rules Tester',
    kontak: contact(),
    layanan_id: 1,
    jadwal_mulai: '2026-11-16T09:00:00+07:00', // Senin
    alamat: 'Jl. Aturan No. 1',
    jumlah_unit: 1,
    ...over,
  });
  const post = (payload, headers = {}) => request(app).post('/api/v1/bookings').set(headers).send(payload);

  async function cleanup() {
    await query(`DELETE FROM bookings WHERE kontak LIKE '${PREFIX}%'`);
  }

  beforeAll(async () => {
    app = createApp();
    await cleanup();
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@nara-ac.local', password: 'Admin123' });
    expect(login.status).toBe(200);
    adminCookie = login.headers['set-cookie'];
    const csrf = await request(app).get('/api/v1/auth/csrf-token').set('Cookie', adminCookie);
    expect(csrf.status).toBe(200);
    adminHeaders = { Cookie: adminCookie, 'X-CSRF-Token': csrf.body.csrfToken };
  });

  afterAll(async () => {
    await cleanup();
    await pool.end();
  });

  describe('Skenario D: edge cases', () => {
    test.each([
      ['jumlah_unit 0', { jumlah_unit: 0 }],
      ['jumlah_unit > 20', { jumlah_unit: 21 }],
      ['layanan_id hilang', { layanan_id: undefined }],
    ])('menolak %s dengan 400', async (_n, over) => {
      const res = await post(basePayload(over));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('menolak layanan tidak dikenal', async () => {
      const res = await post(basePayload({ layanan_id: 999999 }));
      expect(res.status).toBe(400);
      expect(res.body.error.detail).toHaveProperty('layanan_id');
    });

    test('menolak tanggal lampau', async () => {
      const res = await post(basePayload({ jadwal_mulai: '2020-01-06T09:00:00+07:00' }));
      expect(res.status).toBe(400);
      expect(res.body.error.detail).toHaveProperty('jadwal_mulai');
    });

    test('menolak jam di luar operasional', async () => {
      const res = await post(basePayload({ jadwal_mulai: '2026-11-16T05:00:00+07:00' }));
      expect(res.status).toBe(400);
      expect(res.body.error.detail.jadwal_mulai).toMatch(/operasional/i);
    });

    test('menolak hari Minggu', async () => {
      const res = await post(basePayload({ jadwal_mulai: '2026-11-15T09:00:00+07:00' }));
      expect(res.status).toBe(400);
      expect(res.body.error.detail.jadwal_mulai).toMatch(/Minggu/);
    });

    test('menolak kontak tidak valid', async () => {
      const res = await post(basePayload({ kontak: '123' }));
      expect(res.status).toBe(400);
    });

    test('keluhan opsional: booking tanpa keluhan berhasil (bukan 500)', async () => {
      const res = await post(basePayload({ jadwal_mulai: '2026-12-01T13:00:00+07:00' }));
      expect(res.status).toBe(201);
      expect(res.body.keluhan).toBe('');
    });
  });

  describe('Section 4: konflik & kapasitas', () => {
    test('menolak booking ketika kapasitas slot penuh (409)', async () => {
      const cap = (await query('SELECT COUNT(*)::int AS n FROM technicians WHERE aktif = true')).rows[0].n;
      expect(cap).toBeGreaterThan(0);
      const slot = '2026-11-23T09:00:00+07:00'; // Senin
      for (let i = 0; i < cap; i++) {
        const ok = await post(basePayload({ jadwal_mulai: slot }));
        expect(ok.status).toBe(201);
      }
      const full = await post(basePayload({ jadwal_mulai: slot }));
      expect(full.status).toBe(409);
      expect(full.body.error.code).toBe('CONFLICT');
    });
  });

  describe('Section 6: status lifecycle', () => {
    let booking;
    let teknisiId;

    beforeAll(async () => {
      const res = await post(basePayload({ jadwal_mulai: '2026-11-30T10:00:00+07:00' }));
      expect(res.status).toBe(201);
      booking = res.body;
      teknisiId = (await query('SELECT id FROM technicians WHERE aktif = true ORDER BY id LIMIT 1')).rows[0].id;
    });

    const setStatus = (status) =>
      request(app).patch(`/api/v1/bookings/${booking.id}/status`).set(adminHeaders).send({ status });

    test('TRANSITIONS: done & cancelled adalah status akhir', () => {
      expect(TRANSITIONS.done).toEqual([]);
      expect(TRANSITIONS.cancelled).toEqual([]);
      expect(TRANSITIONS.scheduled).toContain('on process');
    });

    test('menolak scheduled → done (lompat status)', async () => {
      const res = await setStatus('done');
      expect(res.status).toBe(422);
    });

    test('menolak memulai pekerjaan tanpa teknisi', async () => {
      const res = await setStatus('on process');
      expect(res.status).toBe(422);
      expect(res.body.error.message).toMatch(/teknisi/i);
    });

    test('admin menugaskan teknisi lalu memulai pekerjaan; riwayat tercatat', async () => {
      const assign = await request(app)
        .patch(`/api/v1/bookings/${booking.id}/assign`).set(adminHeaders).send({ teknisi_id: teknisiId });
      expect(assign.status).toBe(200);

      const start = await setStatus('on process');
      expect(start.status).toBe(200);

      const detail = await request(app).get(`/api/v1/bookings/${booking.id}`).set(adminHeaders);
      expect(detail.status).toBe(200);
      expect(detail.body.status).toBe('on process');
      expect(detail.body.riwayat_status.some((r) => r.status_baru === 'on process')).toBe(true);

      const log = (await query('SELECT COUNT(*)::int AS n FROM status_log WHERE booking_id = $1', [booking.id])).rows[0].n;
      expect(log).toBeGreaterThan(0);
    });

    test('menolak mundur on process → scheduled', async () => {
      const res = await setStatus('scheduled');
      expect(res.status).toBe(422);
    });

    test('menolak "done" lewat endpoint umum (harus lewat endpoint teknisi)', async () => {
      const res = await setStatus('done');
      expect(res.status).toBe(422);
    });
  });

  describe('Section 7: autentikasi & verifikasi publik', () => {
    let booking;
    const kontak = `${PREFIX}777888`;

    beforeAll(async () => {
      const res = await post(basePayload({ kontak, jadwal_mulai: '2026-12-07T10:00:00+07:00' }));
      expect(res.status).toBe(201);
      booking = res.body;
    });

    const patchReschedule = (k) =>
      request(app).patch(`/api/v1/public/bookings/${booking.kode_booking}/reschedule`)
        .send({ jadwal_mulai: '2026-12-08T10:00:00+07:00', kontak: k });

    test('kontak dengan 6 digit terakhir salah → 403', async () => {
      const res = await patchReschedule('000000');
      expect(res.status).toBe(403);
    });

    test('kontak terlalu pendek (<6 digit) ditolak validasi', async () => {
      const res = await patchReschedule('12345');
      expect(res.status).toBe(400);
    });

    test('kontak benar → reschedule publik berhasil', async () => {
      const res = await patchReschedule(kontak);
      expect(res.status).toBe(200);
    });

    test('cancel publik dengan kontak salah → 403, dengan kontak benar → 200', async () => {
      const url = `/api/v1/public/bookings/${booking.kode_booking}/cancel`;
      expect((await request(app).patch(url).send({ kontak: '111111' })).status).toBe(403);
      expect((await request(app).patch(url).send({ kontak })).status).toBe(200);
    });

    test('booking terotentikasi (admin) berhasil', async () => {
      const res = await post(basePayload({ jadwal_mulai: '2026-12-09T10:00:00+07:00' }), adminHeaders);
      expect(res.status).toBe(201);
    });

    test('teknisi tidak boleh membuat booking (403)', async () => {
      const token = signToken({ id: 99, role: 'technician', nama: 'Tek', technician_id: 1 });
      const res = await post(basePayload(), { Authorization: `Bearer ${token}`, 'X-CSRF-Token': generateCsrfToken(99) });
      expect(res.status).toBe(403);
    });

    test('daftar booking tanpa token → 401; customer → 403; admin → 200', async () => {
      expect((await request(app).get('/api/v1/bookings')).status).toBe(401);
      const cust = signToken({ id: 5, role: 'customer', nama: 'C', customer_id: 1 });
      expect((await request(app).get('/api/v1/bookings').set('Authorization', `Bearer ${cust}`)).status).toBe(403);
      expect((await request(app).get('/api/v1/bookings').set(adminHeaders)).status).toBe(200);
    });

    test('teknisi hanya melihat booking yang ditugaskan kepadanya', async () => {
      const tid = (await query('SELECT id FROM technicians WHERE aktif = true ORDER BY id LIMIT 1')).rows[0].id;
      const token = signToken({ id: 50, role: 'technician', nama: 'Tek', technician_id: tid });
      const res = await request(app).get('/api/v1/bookings?limit=200').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((b) => !b.teknisi || b.teknisi.id === tid || b.teknisi_id === tid)).toBe(true);
    });

    test('hanya admin yang dapat mengubah status pembayaran', async () => {
      const url = `/api/v1/bookings/${booking.id}/payment-status`;
      const tech = signToken({ id: 50, role: 'technician', nama: 'Tek', technician_id: 1 });
      const techCsrf = generateCsrfToken(50);
      expect((await request(app).patch(url).send({ status_pembayaran: 'paid' })).status).toBe(401);
      expect((await request(app).patch(url).set({ Authorization: `Bearer ${tech}`, 'X-CSRF-Token': techCsrf }).send({ status_pembayaran: 'paid' })).status).toBe(403);
      expect((await request(app).patch(url).set(adminHeaders).send({ status_pembayaran: 'bogus' })).status).toBe(400);
      expect((await request(app).patch(url).set(adminHeaders).send({ status_pembayaran: 'paid' })).status).toBe(200);
    });
  });

  describe('Skenario C: Multi-service items dalam satu booking', () => {
    test('berhasil membuat booking dengan beberapa unit dan jenis layanan berbeda (items)', async () => {
      const res = await post({
        nama: 'Multi Service Tester',
        kontak: contact(),
        jadwal_mulai: '2026-11-25T09:00:00+07:00',
        alamat: 'Jl. Multi Layanan No. 5',
        items: [
          { layanan_id: 1, jumlah_unit: 2, catatan: 'AC Ruang Tamu & Kamar Utama' },
          { layanan_id: 2, jumlah_unit: 1, catatan: 'AC Ruang Kerja' },
        ],
      });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('kode_booking');
      expect(res.body.jumlah_unit).toBe(3);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0]).toMatchObject({ layanan_id: 1, jumlah_unit: 2, harga_satuan: 75000, subtotal: 150000 });
      expect(res.body.items[1]).toMatchObject({ layanan_id: 2, jumlah_unit: 1, harga_satuan: 350000, subtotal: 350000 });

      // Verifikasi invoice publik
      const invRes = await request(app).get(`/api/v1/public/bookings/${res.body.kode_booking}/invoice`);
      expect(invRes.status).toBe(200);
      expect(invRes.body.units).toBe(3);
      expect(invRes.body.subtotal).toBe(500000);
      expect(invRes.body.discount).toBe(0); // Diskon eksklusif hanya untuk member
      expect(invRes.body.total).toBe(500000);
      expect(invRes.body.items).toHaveLength(2);

      // Verifikasi detail admin
      const detailRes = await request(app).get(`/api/v1/bookings/${res.body.id}`).set(adminHeaders);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.items).toHaveLength(2);
    });

    test('durasi jadwal mengikuti jumlah unit secara akumulatif', async () => {
      const res = await post({
        nama: 'Duration Tester',
        kontak: contact(),
        jadwal_mulai: '2026-11-24T09:00:00+07:00',
        alamat: 'Jl. Durasi Akumulatif No. 10',
        items: [
          { layanan_id: 1, jumlah_unit: 2 },
          { layanan_id: 2, jumlah_unit: 1 },
        ],
      });
      expect(res.status).toBe(201);
      const mulai = new Date(res.body.jadwal_mulai).getTime();
      const selesai = new Date(res.body.jadwal_selesai).getTime();
      const durasiMenit = (selesai - mulai) / 60000;
      expect(durasiMenit).toBeGreaterThanOrEqual(150);
    });
  });

  describe('Section 8: integritas database', () => {
    const count = async (sql) => (await query(sql)).rows[0].n;

    test('tidak ada booking yatim (customer, layanan, teknisi)', async () => {
      expect(await count('SELECT COUNT(*)::int n FROM bookings b LEFT JOIN customers c ON c.id=b.customer_id WHERE c.id IS NULL')).toBe(0);
      expect(await count('SELECT COUNT(*)::int n FROM bookings b LEFT JOIN service_catalog s ON s.id=b.layanan_id WHERE s.id IS NULL')).toBe(0);
      expect(await count('SELECT COUNT(*)::int n FROM bookings b LEFT JOIN technicians t ON t.id=b.teknisi_id WHERE b.teknisi_id IS NOT NULL AND t.id IS NULL')).toBe(0);
    });

    test('semua booking memiliki status dan status_pembayaran valid', async () => {
      expect(await count("SELECT COUNT(*)::int n FROM bookings WHERE status NOT IN ('scheduled','on process','done','cancelled','rescheduled','delayed')")).toBe(0);
      expect(await count("SELECT COUNT(*)::int n FROM bookings WHERE status_pembayaran NOT IN ('pending','paid')")).toBe(0);
    });

    test('foreign key dan index kunci terdefinisi', async () => {
      const fks = (await query(
        "SELECT conname FROM pg_constraint WHERE contype='f' AND conrelid='bookings'::regclass")).rows;
      expect(fks.length).toBeGreaterThanOrEqual(3);
      const idx = (await query("SELECT indexname FROM pg_indexes WHERE tablename='bookings'")).rows;
      expect(idx.length).toBeGreaterThanOrEqual(2);
    });

    test('constraint bekerja: status tidak valid ditolak database', async () => {
      await expect(query("UPDATE bookings SET status='bogus' WHERE id = (SELECT id FROM bookings LIMIT 1)")).rejects.toThrow();
    });

    test('kode_booking unik', async () => {
      expect(await count('SELECT COUNT(*)::int n FROM (SELECT kode_booking FROM bookings GROUP BY 1 HAVING COUNT(*)>1) d')).toBe(0);
    });
  });
});
