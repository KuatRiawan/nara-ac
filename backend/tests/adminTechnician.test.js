/**
 * Checklist Section 10 (admin management) & Section 11 (technician workflow).
 */
const request = require('supertest');
const { createApp } = require('../src/app');
const { pool, query } = require('../src/db/pool');
const { signToken } = require('../src/middleware/auth');
const { generateCsrfToken } = require('../src/middleware/csrf');

const PREFIX = '081300';

describe('Admin management & technician workflow', () => {
  let app;
  let adminHeaders;
  let techId;
  let techHeaders;
  let seq = 0;

  const create = async (jadwal) => {
    const res = await request(app).post('/api/v1/bookings').send({
      nama: 'Workflow Tester', kontak: `${PREFIX}${String(100000 + seq++)}`, layanan_id: 1,
      jadwal_mulai: jadwal, alamat: 'Jl. Workflow No. 1', jumlah_unit: 1,
    });
    expect(res.status).toBe(201);
    return res.body;
  };
  const cleanup = () => query(`DELETE FROM bookings WHERE kontak LIKE '${PREFIX}%'`);

  beforeAll(async () => {
    app = createApp();
    await cleanup();
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@nara-ac.local', password: 'Admin123' });
    expect(login.status).toBe(200);
    const cookie = login.headers['set-cookie'];
    const csrf = await request(app).get('/api/v1/auth/csrf-token').set('Cookie', cookie);
    adminHeaders = { Cookie: cookie, 'X-CSRF-Token': csrf.body.csrfToken };

    techId = (await query('SELECT id FROM technicians WHERE aktif = true ORDER BY id LIMIT 1')).rows[0].id;
    const token = signToken({ id: 7001, role: 'technician', nama: 'Tek Uji', technician_id: techId });
    techHeaders = { Authorization: `Bearer ${token}`, 'X-CSRF-Token': generateCsrfToken(7001) };
  });

  afterAll(async () => {
    await cleanup();
    await pool.end();
  });

  describe('Section 10: admin', () => {
    test.each([
      '/api/v1/technicians',
      '/api/v1/admin/customers',
      '/api/v1/admin/ac-units',
      '/api/v1/admin/schedule/conflicts',
      '/api/v1/admin/dashboard/kpi',
    ])('GET %s → 200 untuk admin, 401 tanpa login', async (url) => {
      expect((await request(app).get(url).set(adminHeaders)).status).toBe(200);
      expect((await request(app).get(url)).status).toBe(401);
    });

    test('teknisi tidak boleh mengakses data admin (403)', async () => {
      expect((await request(app).get('/api/v1/admin/customers').set(techHeaders)).status).toBe(403);
      expect((await request(app).get('/api/v1/technicians').set(techHeaders)).status).toBe(403);
    });

    test('admin melihat workload teknisi dan detail customer', async () => {
      expect((await request(app).get(`/api/v1/admin/technicians/${techId}/workload`).set(adminHeaders)).status).toBe(200);
      const custId = (await query('SELECT id FROM customers LIMIT 1')).rows[0].id;
      expect((await request(app).get(`/api/v1/admin/customers/${custId}`).set(adminHeaders)).status).toBe(200);
    });
  });

  describe('Section 11: technician', () => {
    let booking;

    beforeAll(async () => {
      booking = await create('2026-12-10T10:00:00+07:00');
      const assign = await request(app).patch(`/api/v1/bookings/${booking.id}/assign`)
        .set(adminHeaders).send({ teknisi_id: techId });
      expect(assign.status).toBe(200);
    });

    test('teknisi melihat daftar & detail pekerjaan yang ditugaskan', async () => {
      const list = await request(app).get('/api/v1/technician/jobs').set(techHeaders);
      expect(list.status).toBe(200);
      const detail = await request(app).get(`/api/v1/technician/jobs/${booking.id}`).set(techHeaders);
      expect(detail.status).toBe(200);
    });

    test('teknisi lain tidak dapat melihat pekerjaan ini (403)', async () => {
      const other = signToken({ id: 7002, role: 'technician', nama: 'Lain', technician_id: techId + 9999 });
      const res = await request(app).get(`/api/v1/technician/jobs/${booking.id}`)
        .set({ Authorization: `Bearer ${other}`, 'X-CSRF-Token': generateCsrfToken(7002) });
      expect([403, 404]).toContain(res.status);
    });

    test('mulai pekerjaan → on process', async () => {
      const res = await request(app).patch(`/api/v1/technician/jobs/${booking.id}/start`).set(techHeaders);
      expect(res.status).toBe(200);
      const row = (await query('SELECT status FROM bookings WHERE id=$1', [booking.id])).rows[0];
      expect(row.status).toBe('on process');
    });

    test('checklist: tambah item wajib, tidak bisa selesai sebelum dicentang', async () => {
      const add = await request(app).post(`/api/v1/technician/jobs/${booking.id}/checklist`)
        .set(techHeaders).send({ task: 'Cek tekanan freon', wajib: true });
      expect(add.status).toBe(201);

      const early = await request(app).patch(`/api/v1/technician/jobs/${booking.id}/complete`).set(techHeaders).send({});
      expect(early.status).toBeGreaterThanOrEqual(400);
      expect(early.status).toBeLessThan(500);
    });

    test('checklist: item opsional dapat dilewati dengan alasan', async () => {
      const add = await request(app).post(`/api/v1/technician/jobs/${booking.id}/checklist`)
        .set(techHeaders).send({ task: 'Foto unit setelah dibersihkan', wajib: false });
      expect(add.status).toBe(201);
      const extra = (await query('SELECT id FROM work_order_checklists WHERE booking_id=$1 ORDER BY id DESC LIMIT 1', [booking.id])).rows[0];
      const res = await request(app).patch(`/api/v1/technician/jobs/${booking.id}/checklist/${extra.id}`)
        .set(techHeaders).send({ status: 'skipped', alasan_skip: 'Pelanggan tidak berkenan difoto' });
      expect(res.status).toBe(200);
    });

    test('checklist: seluruh item wajib ditandai selesai', async () => {
      const items = (await query("SELECT id FROM work_order_checklists WHERE booking_id=$1 AND status='pending' ORDER BY id", [booking.id])).rows;
      expect(items.length).toBeGreaterThan(0);
      for (const it of items) {
        const res = await request(app).patch(`/api/v1/technician/jobs/${booking.id}/checklist/${it.id}`)
          .set(techHeaders).send({ status: 'completed' });
        expect(res.status).toBe(200);
      }
    });


    test('catat pemakaian material', async () => {
      const item = (await query('SELECT id FROM inventory WHERE aktif = true AND stok >= 1 LIMIT 1')).rows[0];
      if (!item) return; // tidak ada stok pada DB uji
      const res = await request(app).post(`/api/v1/technician/jobs/${booking.id}/materials`)
        .set(techHeaders).send({ item_id: item.id, jumlah: 1 });
      expect(res.status).toBeLessThan(300);
    });

    test('lapor tunda memerlukan kategori valid', async () => {
      const bad = await request(app).post(`/api/v1/technician/jobs/${booking.id}/delay`)
        .set(techHeaders).send({ kategori: 'tidak-ada', alasan: 'Hujan deras' });
      expect(bad.status).toBe(400);
    });

    test('selesaikan pekerjaan → done, dan riwayat status tercatat', async () => {
      // BR-18 & BR-19: Lampirkan foto before dan after sesuai SOP
      await query(
        `INSERT INTO work_order_photos (booking_id, tipe, url_foto, catatan, file_name, mime_type, ukuran_byte, diunggah_oleh)
         VALUES ($1, 'before', '/api/v1/files/before.jpg', 'Kondisi awal', 'before.jpg', 'image/jpeg', 1024, 'Teknisi Test'),
                ($1, 'after', '/api/v1/files/after.jpg', 'Kondisi selesai', 'after.jpg', 'image/jpeg', 1024, 'Teknisi Test')`,
        [booking.id]
      );
      const res = await request(app).patch(`/api/v1/technician/jobs/${booking.id}/complete`).set(techHeaders).send({});
      expect(res.status).toBe(200);
      const row = (await query('SELECT status FROM bookings WHERE id=$1', [booking.id])).rows[0];
      expect(row.status).toBe('done');
      const log = (await query("SELECT COUNT(*)::int n FROM status_log WHERE booking_id=$1 AND status_baru='done'", [booking.id])).rows[0].n;
      expect(log).toBe(1);
    });
  });
});
