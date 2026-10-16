const request = require('supertest');
const { createApp } = require('../src/app');
const { query } = require('../src/db/pool');
const bcrypt = require('bcryptjs');

const app = createApp();

describe('Login & OTP Authentication Tests (Staff vs Member)', () => {
  let testAdminEmail = 'test_admin_auth@naraac.id';
  let testCustEmail = 'test_cust_auth@naraac.id';
  let testPhone = '081299998888';
  let customerId = null;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);

    // 1. Buat customer
    const cRes = await query(
      "INSERT INTO customers (nama, kontak, alamat) VALUES ('Budi Member', $1, 'Jl. Melati 12') RETURNING id",
      [testPhone]
    );
    customerId = cRes.rows[0].id;

    // 2. Buat akun customer di users
    await query(
      "INSERT INTO users (nama, email, password_hash, role, kontak, customer_id, aktif) VALUES ('Budi Member', $1, $2, 'customer', $3, $4, true)",
      [testCustEmail, passwordHash, testPhone, customerId]
    );

    // 3. Buat akun admin di users
    await query(
      "INSERT INTO users (nama, email, password_hash, role, aktif) VALUES ('Admin Nara', $1, $2, 'admin', true)",
      [testAdminEmail, passwordHash]
    );
  });

  afterAll(async () => {
    await query("DELETE FROM whatsapp_otps WHERE kontak = $1", [testPhone]);
    await query("DELETE FROM users WHERE email IN ($1, $2)", [testAdminEmail, testCustEmail]);
    if (customerId) {
      await query("DELETE FROM customers WHERE id = $1", [customerId]);
    }
  });

  describe('POST /api/v1/auth/staff/login', () => {
    it('Harus berhasil login jika kredensial admin valid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/staff/login')
        .send({ email: testAdminEmail, password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('admin');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('Harus menolak dengan HTTP 403 jika akun customer mencoba login di portal staf', async () => {
      const res = await request(app)
        .post('/api/v1/auth/staff/login')
        .send({ email: testCustEmail, password: 'Password123!' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('khusus untuk staf internal');
    });

    it('Harus gagal jika password staf salah', async () => {
      const res = await request(app)
        .post('/api/v1/auth/staff/login')
        .send({ email: testAdminEmail, password: 'WrongPassword!' });

      expect(res.status).toBe(401);
    });
  });

  describe('Customer WhatsApp OTP Flow', () => {
    let devOtp = null;

    it('Harus gagal request OTP jika nomor belum terdaftar', async () => {
      const res = await request(app)
        .post('/api/v1/auth/customer/request-otp')
        .send({ kontak: '089999999999' });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('belum terdaftar sebagai member');
    });

    it('Harus berhasil request OTP untuk nomor terdaftar', async () => {
      const res = await request(app)
        .post('/api/v1/auth/customer/request-otp')
        .send({ kontak: testPhone });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body._dev_otp).toBeDefined();
      devOtp = res.body._dev_otp;
    });

    it('Harus gagal verifikasi jika OTP salah', async () => {
      const res = await request(app)
        .post('/api/v1/auth/customer/verify-otp')
        .send({ kontak: testPhone, otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('salah');
    });

    it('Harus berhasil verifikasi OTP dan mendapatkan cookie token session', async () => {
      const res = await request(app)
        .post('/api/v1/auth/customer/verify-otp')
        .send({ kontak: testPhone, otp: devOtp });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('customer');
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });
});
