const request = require('supertest');
const { createApp } = require('../src/app');
const { query } = require('../src/db/pool');
const { signToken } = require('../src/middleware/auth');
const { generateCsrfToken } = require('../src/middleware/csrf');
const paymentService = require('../src/services/paymentService');
const bookingService = require('../src/services/bookingService');

describe('Phase 5: Payments & Invoices (BR-34 s/d BR-43)', () => {
  let app;
  let adminToken;
  let adminHeaders;
  let customerToken;
  let customerHeaders;
  let customerId;
  let bookingId;
  let bookingKode;
  const testSuffix = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
  const testPhone = `0877${testSuffix}`;

  beforeAll(async () => {
    app = createApp();

    // 1. Admin auth & CSRF
    const adminUser = (await query("SELECT * FROM users WHERE role = 'admin' LIMIT 1")).rows[0] || { id: 1, role: 'admin', nama: 'Admin Nara' };
    adminToken = signToken(adminUser);
    adminHeaders = { Authorization: `Bearer ${adminToken}`, 'X-CSRF-Token': generateCsrfToken(adminUser.id) };

    // 2. Customer & User auth & CSRF
    const custRes = await query(`
      INSERT INTO customers (nama, kontak, alamat)
      VALUES ('Customer Payment Test', $1, 'Jl. Pembayaran No. 88 Jakarta')
      RETURNING id
    `, [testPhone]);
    customerId = custRes.rows[0].id;

    const custUserRes = await query(`
      INSERT INTO users (email, password_hash, role, nama, customer_id)
      VALUES ('custpay_${testSuffix}@test.com', 'dummy_hash', 'customer', 'Customer Payment', $1)
      RETURNING id, role, nama, customer_id
    `, [customerId]);
    customerToken = signToken(custUserRes.rows[0]);
    customerHeaders = { Authorization: `Bearer ${customerToken}`, 'X-CSRF-Token': generateCsrfToken(custUserRes.rows[0].id) };

    // 3. Buat booking baru untuk pengujian
    const bRes = await query(`
      INSERT INTO bookings (
        kode_booking, customer_id, layanan_id, jadwal_mulai, jadwal_selesai,
        alamat, kontak, keluhan, status, status_pembayaran, skema_pembayaran, metode_pembayaran
      ) VALUES (
        $1, $2, 1, now() + interval '2 days', now() + interval '2 days' + interval '60 minutes',
        'Jl. Pembayaran No. 88 Jakarta', $3, 'Cuci AC berkala', 'scheduled', 'pending', 'pay_after_service', 'transfer'
      ) RETURNING id, kode_booking
    `, [`NARA-PAY-TEST-${testSuffix}`, customerId, testPhone]);
    bookingId = bRes.rows[0].id;
    bookingKode = bRes.rows[0].kode_booking;
  });

  afterAll(async () => {
    // Cleanup
    await query('DELETE FROM whatsapp_invoice_logs WHERE booking_id = $1', [bookingId]);
    await query('DELETE FROM bookings WHERE id = $1', [bookingId]);
    await query('DELETE FROM users WHERE customer_id = $1', [customerId]);
    await query('DELETE FROM customers WHERE id = $1', [customerId]);
  });

  test('BR-34: Admin dapat melihat dan mengatur skema pembayaran yang aktif', async () => {
    // GET settings
    const getRes = await request(app).get('/api/v1/payments/settings');
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.schemes).toHaveProperty('full_upfront');
    expect(getRes.body.data.schemes).toHaveProperty('dp_50');
    expect(getRes.body.data.schemes).toHaveProperty('pay_after_service');

    // PUT settings (Admin updates available schemes)
    const updateRes = await request(app)
      .put('/api/v1/payments/settings')
      .set(adminHeaders)
      .send({
        schemes: {
          ...getRes.body.data.schemes,
          dp_50: { ...getRes.body.data.schemes.dp_50, enabled: true },
        },
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.schemes.dp_50.enabled).toBe(true);
  });

  test('BR-35, BR-36, BR-38: Customer memilih skema pembayaran (dp_50) dan booking tetap aktif', async () => {
    const res = await request(app)
      .post(`/api/v1/payments/bookings/${bookingId}/scheme`)
      .set(customerHeaders)
      .send({
        skema_pembayaran: 'dp_50',
        metode_pembayaran: 'transfer',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.booking.skema_pembayaran).toBe('dp_50');
    expect(res.body.booking.metode_pembayaran).toBe('transfer');

    // BR-38: Booking yang belum dibayar tetap aktif (status scheduled, status_pembayaran pending)
    expect(res.body.booking.status).toBe('scheduled');
    expect(res.body.booking.status_pembayaran).toBe('pending');
  });

  test('BR-36: Menolak pemilihan metode atau skema pembayaran yang tidak valid', async () => {
    const res = await request(app)
      .post(`/api/v1/payments/bookings/${bookingId}/scheme`)
      .set(customerHeaders)
      .send({
        skema_pembayaran: 'skema_palsu',
      });

    expect(res.status).toBe(400);
  });

  test('BR-37: Transfer bank mewajibkan unggahan bukti pembayaran', async () => {
    // Validasi gagal jika tanpa bukti_url
    const badRes = await request(app)
      .post(`/api/v1/payments/bookings/${bookingId}/proof`)
      .set(customerHeaders)
      .send({
        nominal: 50000,
      });
    expect(badRes.status).toBe(400);

    // Unggah bukti berhasil
    const res = await request(app)
      .post(`/api/v1/payments/bookings/${bookingId}/proof`)
      .set(customerHeaders)
      .send({
        bukti_url: 'https://cdn.nara-ac.com/bukti/transfer_bca_123.jpg',
        nominal: 45000,
        catatan: 'Transfer DP 50% via BCA',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.booking.status_verifikasi_pembayaran).toBe('menunggu_verifikasi');
    expect(res.body.booking.bukti_pembayaran_url).toMatch(/transfer_bca_123.jpg/);
  });

  test('BR-37: Admin melakukan verifikasi manual bukti pembayaran (Disetujui)', async () => {
    const res = await request(app)
      .patch(`/api/v1/payments/bookings/${bookingId}/verify`)
      .set(adminHeaders)
      .send({
        disetujui: true,
        nominal_disetujui: 45000,
        catatan: 'Dana transfer BCA Rp 45.000 sudah masuk ke rekening mutasi bank.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.booking.status_verifikasi_pembayaran).toBe('diverifikasi');
    expect(Number(res.body.booking.total_dibayar)).toBe(45000);
    expect(res.body.booking.verified_at).toBeDefined();
  });

  test('BR-39 & BR-40: Perhitungan invoice awal (proforma) dan penagihan kekurangan pembayaran', async () => {
    const booking = (await query(`${bookingService.BOOKING_SELECT} WHERE b.id = $1`, [bookingId])).rows[0];
    const invoice = bookingService.calculateInvoice(booking);

    expect(invoice.invoice_type).toBe('initial'); // Belum selesai = Invoice Awal
    expect(invoice.total_dibayar).toBe(45000);
    // Layanan 1 (Cuci AC Standard) seharga 90.000 (diskon member 10% jika ada atau 90.000 normal)
    // Karena baru bayar DP 45.000, balance_due harus positif (ditagihkan)
    expect(invoice.balance_due).toBeGreaterThan(0); // BR-40: Kekurangan pembayaran ditagihkan
    expect(invoice.refund_amount).toBe(0);
  });

  test('BR-39 & BR-41: Invoice final diterbitkan saat selesai dan kelebihan bayar dikembalikan', async () => {
    // Simulasikan booking selesai dengan pembayaran berlebih (misal total bayar 150.000, tapi biaya hanya 90.000)
    await query(`
      UPDATE bookings
      SET status = 'done', selesai_aktual = now(), total_dibayar = 150000
      WHERE id = $1
    `, [bookingId]);

    const bookingDone = (await query(`${bookingService.BOOKING_SELECT} WHERE b.id = $1`, [bookingId])).rows[0];
    const invoiceFinal = bookingService.calculateInvoice(bookingDone);

    expect(invoiceFinal.invoice_type).toBe('final'); // BR-39: Invoice final setelah pekerjaan selesai
    expect(invoiceFinal.refund_amount).toBeGreaterThan(0); // BR-41: Kelebihan pembayaran dikembalikan
    expect(invoiceFinal.balance_due).toBe(0);

    // Proses refund oleh admin (BR-41)
    const refundRes = await request(app)
      .post(`/api/v1/payments/bookings/${bookingId}/refund`)
      .set(adminHeaders)
      .send({
        nominal_refund: invoiceFinal.refund_amount,
        catatan: 'Transfer balik ke rekening BCA customer 88123',
      });

    expect(refundRes.status).toBe(200);
    expect(refundRes.body.success).toBe(true);
    expect(refundRes.body.booking.refund_status).toBe('processed');
    expect(Number(refundRes.body.booking.refund_nominal)).toBe(invoiceFinal.refund_amount);
  });

  test('BR-42: Mengirim invoice secara otomatis ke WhatsApp customer', async () => {
    const res = await request(app)
      .post(`/api/v1/payments/bookings/${bookingId}/send-whatsapp`)
      .set(adminHeaders)
      .send({
        tipe_invoice: 'final',
        simulatedFailure: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('sent');
    expect(res.body.log.pesan).toMatch(/INVOICE FINAL/);
    expect(res.body.log.tautan_invoice).toMatch(/nara-ac.com/);
  });

  test('BR-43: Jika pengiriman WhatsApp gagal, sistem mencatat status gagal dan mendukung pengiriman ulang otomatis', async () => {
    // 1. Simulasikan kegagalan jaringan pengiriman WhatsApp
    const failRes = await request(app)
      .post(`/api/v1/payments/bookings/${bookingId}/send-whatsapp`)
      .set(adminHeaders)
      .send({
        tipe_invoice: 'final',
        simulatedFailure: true,
      });

    expect(failRes.status).toBe(200);
    expect(failRes.body.success).toBe(false);
    expect(failRes.body.status).toBe('failed');
    expect(failRes.body.log.error_terakhir).toMatch(/Simulated WhatsApp Gateway Network Timeout/);

    // 2. Sistem menjalankan retry otomatis
    const retryRes = await request(app)
      .post('/api/v1/payments/retry-whatsapp')
      .set(adminHeaders)
      .send({ limit: 10 });

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.success).toBe(true);
    expect(retryRes.body.data.total_retried).toBeGreaterThan(0);
    expect(retryRes.body.data.results.some(r => r.status === 'sent')).toBe(true);
  });
});
