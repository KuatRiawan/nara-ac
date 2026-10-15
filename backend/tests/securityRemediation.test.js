const request = require('supertest');
const { createApp } = require('../src/app');
const { query } = require('../src/db/pool');
const { generateCsrfToken, validateCsrfToken } = require('../src/middleware/csrf');
const { generateBookingCode, generateFeedbackToken } = require('../src/utils/ids');

describe('Security Remediation Suite (FIND-01 to FIND-18)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  describe('FIND-01 & FIND-02: Public Booking Status & Invoice PII Masking', () => {
    let testBooking;

    beforeAll(async () => {
      const uniquePhone = `0812${Math.floor(10000000 + Math.random() * 90000000)}`;
      await query("DELETE FROM bookings WHERE jadwal_mulai = '2026-11-12T14:00:00+07:00'");
      const res = await request(app)
        .post('/api/v1/bookings')
        .send({
          nama: 'Budi Raharjo',
          kontak: uniquePhone,
          alamat: 'Jl. Melati No. 42 Kompleks Asri Jakarta',
          layanan_id: 1,
          jadwal_mulai: '2026-11-12T14:00:00+07:00',
          keluhan: 'AC bocor dan bau apek',
          jumlah_unit: 1,
        });
      expect(res.status).toBe(201);
      testBooking = res.body;
    });

    test('Public booking status does not expose raw customer PII', async () => {
      const res = await request(app)
        .get(`/api/v1/public/bookings/${testBooking.kode_booking}`);

      expect(res.status).toBe(200);
      // Customer name must be masked
      expect(res.body.customer_nama).not.toBe('Budi Raharjo');
      expect(res.body.customer_nama).toContain('*');
      // Full phone must not be leaked
      expect(res.body.kontak).toContain('****');
      expect(res.body.kontak).not.toBe(testBooking.kontak);
      // Home address must be masked
      expect(res.body.alamat).toContain('Disamarkan');
      expect(res.body.alamat).not.toBe('Jl. Melati No. 42 Kompleks Asri Jakarta');
    });

    test('Public invoice lookup without verification marks is_verified_ownership as false', async () => {
      const res = await request(app)
        .get(`/api/v1/public/bookings/${testBooking.kode_booking}/invoice`);

      expect(res.status).toBe(200);
      expect(res.body.is_verified_ownership).toBe(false);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('subtotal');
    });

    test('Public invoice lookup with matching customer phone verifies ownership', async () => {
      const res = await request(app)
        .get(`/api/v1/public/bookings/${testBooking.kode_booking}/invoice?kontak=${testBooking.customer.kontak}`);

      expect(res.status).toBe(200);
      expect(res.body.is_verified_ownership).toBe(true);
    });

    test('Cryptographic randomness in booking code prevents time enumeration (>= 128 bits entropy)', () => {
      const code1 = generateBookingCode();
      const code2 = generateBookingCode();
      expect(code1).not.toBe(code2);
      // 128-bit random hex string is 32 characters
      expect(code1).toMatch(/^NARA-AC\d{12}-[A-F0-9]{32}/);
    });
  });

  describe('FIND-03: Forgot & Reset Password Flow', () => {
    test('Forgot password returns generic message for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent-user-12345@domain-fake.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Jika alamat email terdaftar');
    });

    test('Forgot password generates secure token and resets password successfully', async () => {
      const email = `reset-user-${Date.now()}@example.com`;
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          nama: 'User Reset Test',
          email,
          password: 'InitialPassword123!',
          kontak: `0813${Math.floor(10000000 + Math.random() * 90000000)}`,
          alamat: 'Jl. Uji Reset',
        });
      expect(regRes.status).toBe(201);

      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.success).toBe(true);
      expect(forgotRes.body._dev_reset_token).toBeDefined();

      const resetToken = forgotRes.body._dev_reset_token;
      const newPassword = 'NewSecurePassword123!';

      // Reset password using token
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          new_password: newPassword,
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Verify login with new password works
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: newPassword });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user).toBeDefined();

      // Token reuse must fail
      const reuseRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          new_password: 'AnotherPassword123!',
        });

      expect(reuseRes.status).toBe(400);
    });
  });

  describe('FIND-04: Secure Feedback Token & Invalidation', () => {
    let completedBooking;
    let feedbackToken;

    beforeAll(async () => {
      const uniquePhone = `0812${Math.floor(10000000 + Math.random() * 90000000)}`;
      feedbackToken = generateFeedbackToken();
      
      // Create done booking directly in DB with feedback token
      const client = await query(
        `INSERT INTO bookings (kode_booking, customer_id, layanan_id, jadwal_mulai, jadwal_selesai, alamat, keluhan, kontak, status, feedback_token)
         VALUES ($1, 1, 1, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', 'Alamat Test', 'Keluhan test', $2, 'done', $3)
         RETURNING id, kode_booking, feedback_token`,
        [`NARA-AC-FB-${Date.now()}`, uniquePhone, feedbackToken]
      );
      completedBooking = client.rows[0];
    });

    test('Feedback submission succeeds with valid feedback token', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${completedBooking.id}/feedback`)
        .send({
          kode_booking: completedBooking.kode_booking,
          feedback_token: feedbackToken,
          rating: 5,
          komentar: 'Pelayanan teknisi sangat ramah dan AC dingin!',
        });

      expect(res.status).toBe(201);
      expect(res.body.terima_kasih).toBe(true);
    });

    test('Feedback token cannot be reused (single-use enforcement)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${completedBooking.id}/feedback`)
        .send({
          kode_booking: completedBooking.kode_booking,
          feedback_token: feedbackToken,
          rating: 4,
          komentar: 'Percobaan submit ulang.',
        });

      // Should be rejected because feedback was already submitted or token invalidated
      expect([403, 409]).toContain(res.status);
    });

    test('Feedback submission without token or valid ownership is rejected', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${completedBooking.id}/feedback`)
        .send({
          kode_booking: completedBooking.kode_booking,
          rating: 5,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('FIND-09: Stateless HMAC CSRF Tokens', () => {
    test('Generates and validates stateless HMAC token across mock restarts', () => {
      const userId = 42;
      const token = generateCsrfToken(userId);
      expect(typeof token).toBe('string');
      expect(token).toContain('.');

      // Validates successfully
      expect(validateCsrfToken(userId, token)).toBe(true);

      // Rejects if different userId
      expect(validateCsrfToken(999, token)).toBe(false);

      // Rejects tampered token
      const tampered = token.slice(0, -4) + '0000';
      expect(validateCsrfToken(userId, tampered)).toBe(false);
    });
  });

  describe('FIND-10: Strict CORS Hostname Allowlist', () => {
    test('Rejects spoofed origin containing localhost substring', async () => {
      const res = await request(app)
        .get('/api/v1/availability?tanggal=2026-10-28&layanan_id=1')
        .set('Origin', 'http://attacker-localhost.com:5173');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('Allows genuine localhost origin on dev port', async () => {
      const res = await request(app)
        .get('/api/v1/availability?tanggal=2026-10-28&layanan_id=1')
        .set('Origin', 'http://localhost:5173');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });

  describe('FIND-18: Staging Noindex Header', () => {
    test('Sets X-Robots-Tag when APP_ENV is staging', async () => {
      process.env.APP_ENV = 'staging';
      const stagingApp = createApp();
      const res = await request(stagingApp).get('/health');
      expect(res.headers['x-robots-tag']).toContain('noindex');
      delete process.env.APP_ENV;
    });
  });

  afterAll(async () => {
    await query("DELETE FROM feedback WHERE booking_id IN (SELECT id FROM bookings WHERE kode_booking LIKE 'NARA-AC-FB-%')");
    await query("DELETE FROM bookings WHERE kode_booking LIKE 'NARA-AC-FB-%'");
    await query("DELETE FROM bookings WHERE customer_id IN (SELECT id FROM customers WHERE nama = 'Budi Raharjo')");
  });
});
