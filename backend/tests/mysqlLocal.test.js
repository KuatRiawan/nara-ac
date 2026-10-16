const request = require('supertest');
const { pool, query, withTx, bind } = require('../src/db/pool');
const { createApp } = require('../src/app');
const payments = require('../src/services/paymentService');
const reminders = require('../src/services/reminderService');
const { signToken } = require('../src/middleware/auth');
const { generateCsrfToken } = require('../src/middleware/csrf');

describe('MySQL local integration and payment regressions', () => {
  let app, customer, booking, admin, headers;
  const phone = '089911223344';
  let delivery;
  beforeAll(async () => {
    app = createApp();
    delivery = jest.spyOn(reminders, 'whatsappSend').mockResolvedValue(undefined);
    admin = (await query("SELECT * FROM users WHERE email='admin@nara-ac.local'")).rows[0];
    headers = { Authorization: `Bearer ${signToken(admin)}`, 'X-CSRF-Token': generateCsrfToken(admin.id) };
    customer = (await query('INSERT INTO customers (nama,kontak) VALUES ($1,$2) RETURNING *', ['MySQL Regression', phone])).rows[0];
    const service = (await query("SELECT id FROM service_catalog WHERE kode='SRV-CUCI-01'")).rows[0];
    booking = (await query(`INSERT INTO bookings (kode_booking,customer_id,layanan_id,jadwal_mulai,jadwal_selesai,alamat,keluhan,kontak)
      VALUES ('MYSQL-REGRESSION',$1,$2,$3,$4,'Alamat uji','Pengujian MySQL',$5) RETURNING *`,
    [customer.id, service.id, new Date('2026-11-05T02:00:00Z'), new Date('2026-11-05T03:00:00Z'), phone])).rows[0];
  });
  afterAll(async () => {
    await query('DELETE FROM bookings WHERE id=$1', [booking.id]);
    await query('DELETE FROM whatsapp_otps WHERE kontak=$1', [phone]);
    await query('DELETE FROM users WHERE customer_id=$1', [customer.id]);
    await query('DELETE FROM customers WHERE id=$1', [customer.id]);
    await query("DELETE FROM technician_availability WHERE catatan='mysql-regression'");
    delivery.mockRestore();
    await pool.end();
  });

  test('numbered parameters preserve order and quoted literals', () => {
    expect(bind("SELECT $2, '$1', $1, $2", ["x' OR 1=1 --", 42])).toEqual({ sql: "SELECT ?, '$1', ?, ?", values: [42, "x' OR 1=1 --", 42] });
  });
  test('rollback removes writes after a failed transaction', async () => {
    await expect(withTx(async client => {
      await client.query("INSERT INTO customers (nama,kontak) VALUES ('Rollback',$1)", ['089900001111']);
      throw new Error('rollback-check');
    })).rejects.toThrow('rollback-check');
    expect((await query("SELECT id FROM customers WHERE kontak='089900001111'")).rows).toHaveLength(0);
  });
  test('timestamps, booleans and JSON retain API types', async () => {
    expect(booking.jadwal_mulai.toISOString()).toBe('2026-11-05T02:00:00.000Z');
    expect(booking.is_synthetic).toBe(false);
    expect((await query("SELECT value FROM settings WHERE setting_key='operating_hours'")).rows[0].value.days).toBeInstanceOf(Array);
  });
  test('upsert returns the updated availability row on repeated saves', async () => {
    const tech = (await query('SELECT id FROM technicians ORDER BY id LIMIT 1')).rows[0];
    const sql = `INSERT INTO technician_availability (teknisi_id,tanggal,status,catatan) VALUES ($1,$2,$3,'mysql-regression')
      ON DUPLICATE KEY UPDATE status=$3 RETURNING tanggal,status`;
    await query(sql, [tech.id, '2026-12-20', 'off']);
    expect((await query(sql, [tech.id, '2026-12-20', 'available'])).rows[0]).toMatchObject({ tanggal: '2026-12-20', status: 'available' });
  });
  test('anonymous and wrong-contact payment mutations are rejected', async () => {
    const url = `/api/v1/payments/bookings/${booking.id}/proof`;
    const payload = { bukti_url: '/proof.jpg', nominal: 75000 };
    expect((await request(app).post(url).send(payload)).status).toBe(403);
    expect((await request(app).post(url).send({ ...payload, kontak: '3344' })).status).toBe(403);
    expect((await request(app).post(url).send({ ...payload, kontak: '+6289911223344' })).status).toBe(200);
  });
  test('concurrent verification counts one proof only once', async () => {
    const results = await Promise.allSettled([1, 2].map(() => payments.verifyPaymentProof(booking.id, { disetujui: true, nominal_disetujui: 75000 }, admin)));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(Number((await query('SELECT total_dibayar FROM bookings WHERE id=$1', [booking.id])).rows[0].total_dibayar)).toBe(75000);
  });
  test('refund cannot exceed actual overpayment', async () => {
    await expect(payments.processRefund(booking.id, { nominal_refund: 1 }, admin)).rejects.toMatchObject({ status: 400 });
  });
  test('a gateway failure is recorded and a real retry invokes delivery', async () => {
    delivery.mockRejectedValueOnce(new Error('Gateway unavailable'));
    const result = await payments.queueAndDispatchWhatsAppInvoice(booking.id);
    expect(result.status).toBe('failed');
    const calls = delivery.mock.calls.length;
    await payments.retryFailedWhatsAppInvoices();
    expect(delivery.mock.calls.length).toBeGreaterThan(calls);
    expect((await query('SELECT status FROM whatsapp_invoice_logs WHERE id=$1', [result.log.id])).rows[0].status).toBe('sent');
  });
  test('failed OTP attempts commit and enforce the attempt limit', async () => {
    const response = await request(app).post('/api/v1/auth/customer/request-otp').send({ kontak: phone });
    expect(response.status).toBe(200);
    const correct = response.body._dev_otp;
    const wrong = correct === '000000' ? '000001' : '000000';
    for (let attempt = 0; attempt < 3; attempt++) {
      expect((await request(app).post('/api/v1/auth/customer/verify-otp').send({ kontak: phone, otp: wrong })).status).toBe(400);
    }
    expect((await request(app).post('/api/v1/auth/customer/verify-otp').send({ kontak: phone, otp: correct })).status).toBe(400);
    expect((await query('SELECT attempts,is_used FROM whatsapp_otps WHERE kontak=$1 ORDER BY id DESC LIMIT 1', [phone])).rows[0]).toMatchObject({ attempts: 3, is_used: true });
  });
  test('dashboard and analytics execute their MySQL aggregates', async () => {
    for (const url of ['/api/v1/admin/dashboard/summary', '/api/v1/analytics/summary', '/api/v1/analytics/trends?period=90d']) {
      expect((await request(app).get(url).set(headers)).status).toBe(200);
    }
  });
});
