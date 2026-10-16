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

    test('pagination pelanggan mengembalikan total database, bukan jumlah baris halaman', async () => {
      const expectedTotal = Number((await query('SELECT COUNT(*) AS n FROM customers')).rows[0].n);
      const response = await request(app)
        .get('/api/v1/admin/customers?page=1&limit=1')
        .set(adminHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(Number(response.body.meta.total)).toBe(expectedTotal);
      expect(Number(response.body.meta.total_customers)).toBe(expectedTotal);
    });

    test('dashboard laporan bisnis menyediakan lima dataset dengan definisi yang stabil', async () => {
      const publish = (reportKey, months, payload, serviceId = 0, customerId = 0) => query(
        `INSERT INTO ds_dashboard_snapshots
           (report_key, period_months, service_id, customer_id, payload, generated_at)
         VALUES ($1,$2,$3,$4,$5,now())
         ON DUPLICATE KEY UPDATE payload=VALUES(payload), generated_at=VALUES(generated_at)`,
        [reportKey, months, serviceId, customerId, JSON.stringify(payload)]
      );
      const definitions = {
        transaksi_customer: 'Booking valid', service: 'Layanan valid', teknisi: 'Teknisi valid',
        revenue: 'Revenue selesai', booking_terjadwal: 'Jadwal valid',
      };
      const monthly = (size) => Array.from({ length: size }, (_, index) => ({
        bulan: `2026-${String(index + 1).padStart(2, '0')}`, revenue: index * 1000,
        jumlah_transaksi: index, jumlah_booking: index, pelanggan_unik: index, jumlah_unit: index,
      }));
      await Promise.all([
        publish('filter_options', 0, { services: [{ id: 1, nama: 'Cuci' }], customers: [{ id: 1, nama: 'Uji' }] }),
        publish('overview', 12, { periode: { months: 12 }, definisi: definitions, topCustomers: [], topServices: [], revenueMonthly: monthly(12), sumber_data: { jenis: 'snapshot_ds_mysql', booking_total: 0 } }),
        publish('technicians', 12, []), publish('scheduled_bookings', 12, monthly(12)),
        publish('overview', 3, { periode: { months: 3 }, definisi: definitions, topCustomers: [], topServices: [], revenueMonthly: monthly(3), sumber_data: { jenis: 'snapshot_ds_mysql', booking_total: 0 } }),
        publish('technicians', 3, [], 1), publish('scheduled_bookings', 3, monthly(3), 1),
      ]);
      const response = await request(app)
        .get('/api/v1/admin/dashboard/reports?months=12')
        .set(adminHeaders);

      expect(response.status).toBe(200);
      expect(response.body.topCustomers).toBeInstanceOf(Array);
      expect(response.body.topServices).toBeInstanceOf(Array);
      expect(response.body.topTechnicians).toBeInstanceOf(Array);
      expect(response.body.revenueMonthly).toHaveLength(12);
      expect(response.body.scheduledBookingsMonthly).toHaveLength(12);
      expect(response.body.filterOptions.services).toBeInstanceOf(Array);
      expect(response.body.filterOptions.customers).toBeInstanceOf(Array);
      expect(response.body.definisi).toEqual(expect.objectContaining({
        transaksi_customer: expect.any(String),
        service: expect.any(String),
        teknisi: expect.any(String),
        revenue: expect.any(String),
        booking_terjadwal: expect.any(String),
      }));
      expect(response.body.sumber_data).toEqual(expect.objectContaining({
        booking_total: expect.any(Number),
        jenis: 'snapshot_ds_mysql',
      }));
      expect(response.body.dibuat_pada).toEqual(expect.any(String));

      const filtered = await request(app)
        .get('/api/v1/admin/dashboard/reports?months=3&technician_service_id=1&booking_service_id=1')
        .set(adminHeaders);
      expect(filtered.status).toBe(200);
      expect(filtered.body.revenueMonthly).toHaveLength(3);
      expect(filtered.body.scheduledBookingsMonthly).toHaveLength(3);
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
      const log = (await query("SELECT COUNT(*) n FROM status_log WHERE booking_id=$1 AND status_baru='done'", [booking.id])).rows[0].n;
      expect(log).toBe(1);
    });
  });
});
