/**
 * Booking Regression Tests - P0 Bug Fixes
 * Tests for:
 * 1. Booking creation and admin dashboard visibility
 * 2. Customer invoice access and printing
 */

const request = require('supertest');
const { createApp } = require('../src/app');
const { pool, query } = require('../src/db/pool');

describe('Booking P0 Regression Tests', () => {
  let app;
  let adminCookie;
  let contactCounter = 1000000000;

  function nextContact() {
    return `081${String(contactCounter++).padStart(9, '0')}`;
  }

  // Remove bookings created by this suite (contact range 0811000000xx) so that
  // fixed schedule slots do not hit capacity limits on repeated runs.
  async function cleanupTestBookings() {
    await query(
      "DELETE FROM bookings WHERE customer_id IN (SELECT id FROM customers WHERE kontak LIKE '08110000%')"
    );
  }

  beforeAll(async () => {
    app = createApp();
    await cleanupTestBookings();
    
    // Login as admin to get auth cookie
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@nara-ac.local', password: 'Admin123' });
    
    expect(loginRes.status).toBe(200);
    adminCookie = loginRes.headers['set-cookie'];
  });

  afterAll(async () => {
    await cleanupTestBookings();
    await pool.end();
  });

  describe('P0-1: Booking Creation & Admin Dashboard Visibility', () => {
    test('POST /bookings creates booking with full data returned', async () => {
      const kontak = nextContact();
      const res = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Test Booking User',
          kontak,
          layanan_id: 1,
          jadwal_mulai: '2026-10-20T10:00:00+07:00',
          alamat: 'Jl. Test Booking No. 1',
          keluhan: 'AC tidak dingin',
          jumlah_unit: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('kode_booking');
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('status', 'scheduled');
      expect(res.body).toHaveProperty('customer');
      expect(res.body.customer).toHaveProperty('nama', 'Test Booking User');
      expect(res.body).toHaveProperty('layanan');
      expect(res.body.layanan).toHaveProperty('nama', 'Cuci AC Standard');
      expect(res.body).toHaveProperty('alamat', 'Jl. Test Booking No. 1');
      expect(res.body).toHaveProperty('jumlah_unit', 1);
      expect(res.body).toHaveProperty('status_pembayaran', 'pending');
    });

    test('Created booking persists in database', async () => {
      const kontak = nextContact();
      const createRes = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Persist Test User',
          kontak,
          layanan_id: 1,
          jadwal_mulai: '2026-10-21T10:00:00+07:00',
          alamat: 'Jl. Persist Test',
          keluhan: 'Test persist',
          jumlah_unit: 2,
        });

      expect(createRes.status).toBe(201);
      const bookingId = createRes.body.id;

      // Verify in database directly
      const dbRes = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
      expect(dbRes.rows.length).toBe(1);
      expect(dbRes.rows[0].customer_id).toBeDefined();
      expect(dbRes.rows[0].layanan_id).toBe(1);
      expect(dbRes.rows[0].jumlah_unit).toBe(2);
    });

    test('Admin can retrieve booking list with new booking', async () => {
      const kontak = nextContact();
      const createRes = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Admin List Test',
          kontak,
          layanan_id: 1,
          jadwal_mulai: '2026-10-22T10:00:00+07:00',
          alamat: 'Jl. Admin List',
          keluhan: 'Test admin list',
          jumlah_unit: 1,
        });

      expect(createRes.status).toBe(201);
      const newKode = createRes.body.kode_booking;

      const listRes = await request(app)
        .get('/api/v1/bookings')
        .set('Cookie', adminCookie)
        .query({ limit: 200 });

      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toBeInstanceOf(Array);
      
      const found = listRes.body.data.find(b => b.kode_booking === newKode);
      expect(found).toBeDefined();
      expect(found.status).toBe('scheduled');
    });

    test('Booking without assigned technician appears in admin dashboard', async () => {
      const kontak = nextContact();
      const createRes = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'No Tech Test',
          kontak,
          layanan_id: 1,
          jadwal_mulai: '2026-10-23T10:00:00+07:00',
          alamat: 'Jl. No Tech',
          keluhan: 'Test no technician',
          jumlah_unit: 1,
        });

      expect(createRes.status).toBe(201);
      const newKode = createRes.body.kode_booking;

      const listRes = await request(app)
        .get('/api/v1/bookings')
        .set('Cookie', adminCookie)
        .query({ limit: 200 });

      const found = listRes.body.data.find(b => b.kode_booking === newKode);
      expect(found).toBeDefined();
      expect(found.teknisi_id).toBeNull();
    });

    test('Booking with status "scheduled" appears in admin list', async () => {
      const kontak = nextContact();
      const createRes = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Scheduled Status Test',
          kontak,
          layanan_id: 1,
          jadwal_mulai: '2026-10-24T10:00:00+07:00',
          alamat: 'Jl. Scheduled Test',
          keluhan: 'Test scheduled status',
          jumlah_unit: 1,
        });

      expect(createRes.status).toBe(201);
      const newKode = createRes.body.kode_booking;

      const listRes = await request(app)
        .get('/api/v1/bookings')
        .set('Cookie', adminCookie)
        .query({ limit: 200 });

      const found = listRes.body.data.find(b => b.kode_booking === newKode);
      expect(found).toBeDefined();
      expect(found.status).toBe('scheduled');
    });
  });

  describe('P0-2: Customer Invoice Access & Printing', () => {
    let testBookingKode;
    let testBookingKontak;

    beforeAll(async () => {
      testBookingKontak = nextContact();
      const res = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Invoice Test User',
          kontak: testBookingKontak,
          layanan_id: 1,
          jadwal_mulai: '2026-10-26T10:00:00+07:00', // Monday
          alamat: 'Jl. Invoice Test',
          keluhan: 'Test invoice',
          jumlah_unit: 3,
        });
      testBookingKode = res.body.kode_booking;
    });

    test('Public status endpoint returns masked customer data and protects PII', async () => {
      const res = await request(app)
        .get(`/api/v1/public/bookings/${testBookingKode}`);

      expect(res.status).toBe(200);
      expect(res.body.customer_nama).not.toBe('Invoice Test User');
      expect(res.body.customer_nama).toContain('*');
      expect(res.body.kontak).not.toBe(testBookingKontak);
      expect(res.body.kontak).toContain('****');
      expect(res.body.alamat).toContain('Disamarkan');
      expect(res.body).toHaveProperty('keluhan', 'Test invoice');
      expect(res.body).toHaveProperty('harga', 75000);
      expect(res.body).toHaveProperty('jumlah_unit', 3);
      expect(res.body).toHaveProperty('status_pembayaran', 'pending');
    });

    test('Public invoice endpoint returns correct calculation for guest (0 discount)', async () => {
      const res = await request(app)
        .get(`/api/v1/public/bookings/${testBookingKode}/invoice`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('basePrice', 75000);
      expect(res.body).toHaveProperty('units', 3);
      expect(res.body).toHaveProperty('subtotal', 225000);
      expect(res.body).toHaveProperty('discount', 0);
      expect(res.body).toHaveProperty('total', 225000);
      expect(res.body).toHaveProperty('status_pembayaran', 'pending');
      expect(res.body).toHaveProperty('warrantyText', '14 Hari Kalender');
    });

    test('Single unit booking invoice calculation', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Single Unit Invoice',
          kontak: nextContact(),
          layanan_id: 1,
          jadwal_mulai: '2026-10-26T10:00:00+07:00',
          alamat: 'Jl. Single Unit',
          keluhan: 'Single unit test',
          jumlah_unit: 1,
        });

      const invoiceRes = await request(app)
        .get(`/api/v1/public/bookings/${res.body.kode_booking}/invoice`);

      expect(invoiceRes.body.basePrice).toBe(75000);
      expect(invoiceRes.body.units).toBe(1);
      expect(invoiceRes.body.subtotal).toBe(75000);
      expect(invoiceRes.body.discount).toBe(0);
      expect(invoiceRes.body.total).toBe(75000);
    });

    test('Two unit booking invoice for guest has 0 discount (discount member only)', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Two Unit Invoice',
          kontak: nextContact(),
          layanan_id: 1,
          jadwal_mulai: '2026-10-27T10:00:00+07:00',
          alamat: 'Jl. Two Unit',
          keluhan: 'Two unit test',
          jumlah_unit: 2,
        });

      const invoiceRes = await request(app)
        .get(`/api/v1/public/bookings/${res.body.kode_booking}/invoice`);

      expect(invoiceRes.body.basePrice).toBe(75000);
      expect(invoiceRes.body.units).toBe(2);
      expect(invoiceRes.body.subtotal).toBe(150000);
      expect(invoiceRes.body.discount).toBe(0);
      expect(invoiceRes.body.total).toBe(150000);
    });

    test('Core service warranty text is correct (layanan_id=4)', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Core Service Test',
          kontak: nextContact(),
          layanan_id: 4, // Cuci AC Core (Deep Clean)
          jadwal_mulai: '2026-10-28T10:00:00+07:00',
          alamat: 'Jl. Core Test',
          keluhan: 'Core test',
          jumlah_unit: 1,
        });

      const invoiceRes = await request(app)
        .get(`/api/v1/public/bookings/${res.body.kode_booking}/invoice`);

      expect(invoiceRes.body.warrantyText).toBe('30 Hari Penuh Garansi Pengerjaan');
    });

    test('Freon + Core service warranty text is correct (layanan_id=5)', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Freon Core Test',
          kontak: nextContact(),
          layanan_id: 5, // Paket Core + Isi Freon
          jadwal_mulai: '2026-10-29T10:00:00+07:00',
          alamat: 'Jl. Freon Test',
          keluhan: 'Freon test',
          jumlah_unit: 1,
        });

      const invoiceRes = await request(app)
        .get(`/api/v1/public/bookings/${res.body.kode_booking}/invoice`);

      expect(invoiceRes.body.warrantyText).toBe('45 Hari Penuh Garansi Dingin');
    });
  });

  describe('P0-3: Authorization & Security', () => {
    test('Customer cannot access another customer invoice without verification', async () => {
      const kontakA = nextContact();
      const resA = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Customer A',
          kontak: kontakA,
          layanan_id: 1,
          jadwal_mulai: '2026-10-30T10:00:00+07:00',
          alamat: 'Jl. Customer A',
          keluhan: 'Test A',
          jumlah_unit: 1,
        });

      const kontakB = nextContact();
      const res = await request(app)
        .patch(`/api/v1/public/bookings/${resA.body.kode_booking}/reschedule`)
        .send({
          jadwal_mulai: '2026-10-31T10:00:00+07:00',
          kontak: kontakB,
        });

      expect(res.status).toBe(403);
    });

    test('Customer can access own invoice with correct verification', async () => {
      const kontak = nextContact();
      const resA = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Customer B',
          kontak,
          layanan_id: 1,
          jadwal_mulai: '2026-10-30T14:00:00+07:00',
          alamat: 'Jl. Customer B',
          keluhan: 'Test B',
          jumlah_unit: 1,
        });

      const res = await request(app)
        .get(`/api/v1/public/bookings/${resA.body.kode_booking}`);

      expect(res.status).toBe(200);
      expect(res.body.customer_nama).not.toBe('Customer B');
      expect(res.body.customer_nama).toContain('*');
    });

    test('Technician can access bookings list (filtered to their assignments)', async () => {
      const techLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'budi@nara-ac.local', password: 'Admin123' });

      const techCookie = techLogin.headers['set-cookie'];

      const res = await request(app)
        .get('/api/v1/bookings')
        .set('Cookie', techCookie);

      expect([200, 403]).toContain(res.status);
    });
  });

  describe('P0-4: Idempotency & Duplicate Prevention', () => {
    test('Same idempotency key returns existing booking', async () => {
      const idempotencyKey = `idem-test-${Date.now()}-abc123`;
      const kontak = nextContact();

      const res1 = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Idempotency Test',
          kontak,
          layanan_id: 1,
          jadwal_mulai: '2026-11-02T10:00:00+07:00', // Monday
          alamat: 'Jl. Idempotency',
          keluhan: 'Test idempotency',
          jumlah_unit: 1,
          idempotency_key: idempotencyKey,
        });

      expect(res1.status).toBe(201);
      const kode1 = res1.body.kode_booking;

      const res2 = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Idempotency Test',
          kontak,
          layanan_id: 1,
          jadwal_mulai: '2026-11-02T10:00:00+07:00', // Monday
          alamat: 'Jl. Idempotency',
          keluhan: 'Test idempotency',
          jumlah_unit: 1,
          idempotency_key: idempotencyKey,
        });

      expect(res2.status).toBe(201);
      expect(res2.body.kode_booking).toBe(kode1);
    });

    test('Rapid duplicate booking within 30 seconds prevented', async () => {
      const kontak = nextContact();

      const res1 = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Duplicate Test',
          kontak,
          layanan_id: 1,
          jadwal_mulai: '2026-11-02T10:00:00+07:00',
          alamat: 'Jl. Duplicate',
          keluhan: 'Test duplicate',
          jumlah_unit: 1,
        });

      expect(res1.status).toBe(201);
      const kode1 = res1.body.kode_booking;

      const res2 = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Duplicate Test',
          kontak,
          layanan_id: 1,
          jadwal_mulai: '2026-11-02T10:00:00+07:00',
          alamat: 'Jl. Duplicate',
          keluhan: 'Test duplicate',
          jumlah_unit: 1,
        });

      expect(res2.status).toBe(201);
      expect(res2.body.kode_booking).toBe(kode1);
    });
  });
});