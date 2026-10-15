const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { query } = require('../db/pool');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth, signToken } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const { csrfTokenHandler, clearCsrfTokens } = require('../middleware/csrf');
const { E } = require('../errors');

const router = express.Router();

// Rate limit khusus untuk login — cegah brute force (AUD-007)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: 10, // maksimal 10 percobaan per 15 menit per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (_req, res) => res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan login. Coba lagi setelah 15 menit.' },
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).max(120).required().label('Email'),
  password: Joi.string().min(8).max(100).required().label('Password'),
});

router.post('/login', loginLimiter, validate(loginSchema), wrap(async (req, res) => {
  const u = (await query('SELECT * FROM users WHERE lower(email)=lower($1)', [req.body.email])).rows[0];
  // Pesan generik: tidak membocorkan apakah email terdaftar
  const bad = () => E.unauthorized('Email atau password salah.');
  if (!u || !u.aktif) throw bad();
  if (!(await bcrypt.compare(req.body.password, u.password_hash))) throw bad();
  const token = signToken(u);
  const user = {
    id: u.id,
    nama: u.nama,
    email: u.email,
    role: u.role,
    kontak: u.kontak || null,
    technician_id: u.technician_id || null,
    customer_id: u.customer_id || null,
  };
  
  // Set token in HttpOnly cookie for security
  res.cookie('nara_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours to match JWT expiry
    path: '/',
  });
  
  res.json({
    user,
  });
}));

const registerSchema = Joi.object({
  nama: Joi.string().trim().min(2).max(80).required().label('Nama'),
  email: Joi.string().email({ tlds: { allow: false } }).max(120).required().label('Email'),
  password: Joi.string().min(8).max(100).required().label('Password'),
  kontak: Joi.string().trim().max(20).required().label('Kontak'),
  alamat: Joi.string().trim().max(300).allow('').label('Alamat'),
});

router.post('/register', validate(registerSchema), wrap(async (req, res) => {
  const { nama, email, password, kontak, alamat } = req.body;
  const { normalizePhone } = require('../utils/ids');
  const phone = normalizePhone(kontak);
  if (!phone) throw E.validation('Kontak tidak valid.', { kontak: 'Gunakan nomor HP Indonesia, contoh 081234567890.' });
  const hash = await bcrypt.hash(password, 10);
  const { withTx } = require('../db/pool');
  const user = await withTx(async (client) => {
    let cust = (await client.query('SELECT * FROM customers WHERE kontak=$1', [phone])).rows[0];
    if (!cust) {
      cust = (await client.query(
        'INSERT INTO customers (nama, kontak, alamat, is_synthetic) VALUES ($1,$2,$3,false) RETURNING *',
        [nama, phone, alamat || null],
      )).rows[0];
    }
    const existing = (await client.query('SELECT id FROM users WHERE lower(email)=lower($1) OR customer_id=$2', [email, cust.id])).rows[0];
    if (existing) throw E.conflict('Email atau nomor HP sudah terdaftar. Silakan login.');
    const u = (await client.query(
      "INSERT INTO users (nama, email, password_hash, role, customer_id) VALUES ($1,$2,$3,'customer',$4) RETURNING id, nama, email, role, customer_id",
      [nama, email, hash, cust.id],
    )).rows[0];
    return u;
  });
  const token = signToken(user);
  const userResponse = { id: user.id, nama: user.nama, email: user.email, role: user.role, technician_id: null, customer_id: user.customer_id };
  
  // Set token in HttpOnly cookie for security
  res.cookie('nara_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours to match JWT expiry
    path: '/',
  });
  
  res.status(201).json({
    user: userResponse,
  });
}));

router.get('/me', requireAuth(), wrap(async (req, res) => {
  const u = (await query('SELECT id, nama, email, role, kontak, technician_id, customer_id, aktif, created_at FROM users WHERE id=$1', [req.user.id])).rows[0];
  if (!u || !u.aktif) throw E.unauthorized('Akun tidak aktif.');
  res.json({ user: u });
}));

const updateProfileSchema = Joi.object({
  nama: Joi.string().trim().min(2).max(80).required().label('Nama Lengkap'),
  email: Joi.string().email({ tlds: { allow: false } }).max(120).required().label('Email'),
  kontak: Joi.string().trim().allow('', null).max(30).optional().label('Nomor WhatsApp / HP'),
});

router.patch('/profile', requireAuth(), validate(updateProfileSchema), wrap(async (req, res) => {
  const { nama, email, kontak } = req.body;
  const existing = (await query('SELECT id FROM users WHERE lower(email)=lower($1) AND id<>$2', [email, req.user.id])).rows[0];
  if (existing) throw E.conflict('Email sudah digunakan oleh akun lain.');

  const prev = (await query('SELECT id, nama, email, kontak, role FROM users WHERE id=$1', [req.user.id])).rows[0];
  const u = (await query(
    'UPDATE users SET nama=$1, email=$2, kontak=$3 WHERE id=$4 RETURNING id, nama, email, role, kontak, technician_id, customer_id, aktif, created_at',
    [nama, email, kontak || null, req.user.id]
  )).rows[0];

  const { audit } = require('../services/common');
  await audit(
    { query },
    req.user,
    'profile_updated',
    'user',
    req.user.id,
    { before: { nama: prev?.nama, email: prev?.email, kontak: prev?.kontak }, after: { nama: u.nama, email: u.email, kontak: u.kontak } }
  );

  res.json({ user: u, message: 'Profil berhasil diperbarui.' });
}));

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required().label('Password Saat Ini'),
  new_password: Joi.string().min(8).max(100).required().label('Password Baru'),
});

router.patch('/password', requireAuth(), validate(changePasswordSchema), wrap(async (req, res) => {
  const { current_password, new_password } = req.body;
  const u = (await query('SELECT id, password_hash, email, role FROM users WHERE id=$1', [req.user.id])).rows[0];
  if (!u) throw E.notFound('Pengguna tidak ditemukan.');

  const match = await bcrypt.compare(current_password, u.password_hash);
  if (!match) throw E.validation('Password saat ini tidak sesuai.', { current_password: 'Password saat ini salah.' });

  const hash = await bcrypt.hash(new_password, 10);
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);

  const { audit } = require('../services/common');
  await audit({ query }, req.user, 'password_changed', 'user', req.user.id, { metadata: { note: 'User changed password' } });

  res.json({ ok: true, message: 'Password berhasil diperbarui.' });
}));

// CSRF token endpoint - get a new CSRF token for state-changing requests
router.get('/csrf-token', requireAuth(), wrap(csrfTokenHandler));

// Rate limiter for password reset to prevent abuse and account enumeration
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (_req, res) => res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan reset password. Coba lagi dalam 15 menit.' },
  }),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).max(120).required().label('Email'),
});

router.post('/forgot-password', resetPasswordLimiter, validate(forgotPasswordSchema), wrap(async (req, res) => {
  const { email } = req.body;
  const crypto = require('crypto');
  const u = (await query('SELECT id, nama, email, aktif FROM users WHERE lower(email)=lower($1)', [email])).rows[0];

  // Generic response to prevent email enumeration (FIND-03)
  const genericMessage = 'Jika alamat email terdaftar di sistem kami, instruksi pemulihan kata sandi telah diproses sesuai kanal yang terkonfigurasi.';

  if (u && u.aktif) {
    // Generate secure random reset token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes validity

    // Invalidate existing unused tokens for this user
    await query('UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [u.id]);

    // Store securely hashed token
    await query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [u.id, tokenHash, expiresAt],
    );

    const { audit, notify } = require('../services/common');
    await audit(
      { query },
      { id: u.id, role: 'user', nama: u.nama },
      'password_reset_requested',
      'user',
      u.id,
      { metadata: { note: 'Password reset token generated' } },
    );

    // Send in-app notification since no external email provider is currently configured
    await notify({ query }, {
      role: u.role || 'customer',
      id: u.role === 'customer' ? (u.customer_id || null) : null,
      title: 'Permintaan Reset Password',
      message: 'Permintaan reset password akun Anda telah diproses.',
      type: 'system',
    });

    // In test environment only, return token for test verification
    if (process.env.NODE_ENV === 'test' || process.env.ENABLE_DEV_RESET_TOKEN === 'true') {
      return res.json({
        success: true,
        message: genericMessage,
        delivery_channel: 'in_app_notification',
        _dev_reset_token: rawToken,
      });
    }
  }

  res.json({
    success: true,
    message: genericMessage,
    delivery_channel: 'in_app_notification',
  });
}));

const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().hex().length(64).required().label('Token Reset'),
  new_password: Joi.string().min(8).max(100).required().label('Password Baru'),
});

router.post('/reset-password', resetPasswordLimiter, validate(resetPasswordSchema), wrap(async (req, res) => {
  const { token, new_password: newPassword } = req.body;
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { withTx } = require('../db/pool');
  await withTx(async (client) => {
    const row = (await client.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.email, u.nama, u.role
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1 FOR UPDATE`,
      [tokenHash],
    )).rows[0];

    if (!row || row.used_at !== null || new Date(row.expires_at) < new Date()) {
      throw E.validation('Token reset password tidak valid atau sudah kedaluwarsa.', {
        token: 'Token kedaluwarsa atau tidak valid.',
      });
    }

    // Hash new password and update user
    const newHash = await bcrypt.hash(newPassword, 10);
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, row.user_id]);

    // Invalidate token (single-use)
    await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [row.id]);
    // Invalidate all other reset tokens for this user
    await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND id <> $2', [row.user_id, row.id]);

    const { audit } = require('../services/common');
    await audit(
      client,
      { id: row.user_id, role: row.role, nama: row.nama },
      'password_reset_completed',
      'user',
      row.user_id,
      { metadata: { note: 'Password successfully reset via token' } },
    );
  });

  // Clear session cookie if any
  res.clearCookie('nara_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.json({
    success: true,
    message: 'Password berhasil direset. Silakan login kembali dengan password baru Anda.',
  });
}));

// Logout endpoint - invalidasi token dan hapus session
router.post('/logout', requireAuth(), wrap((req, res) => {
  clearCsrfTokens(req.user.id);
  res.clearCookie('nara_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  res.json({ success: true, message: 'Logout berhasil.' });
}));

module.exports = router;
