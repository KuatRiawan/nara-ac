const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth, signToken } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const { csrfTokenHandler, clearCsrfTokens } = require('../middleware/csrf');
const { E } = require('../errors');

const router = express.Router();

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).max(120).required().label('Email'),
  password: Joi.string().min(8).max(100).required().label('Password'),
});

router.post('/login', validate(loginSchema), wrap(async (req, res) => {
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
    token,
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
    token,
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

// Logout endpoint - invalidasi token dengan menambahkan ke blacklist atau menghapus session
// Untuk JWT, klien bertanggung jawab untuk menghapus token
router.post('/logout', requireAuth(), wrap(async (req, res) => {
  // Clear CSRF tokens for this user
  clearCsrfTokens(req.user.id);
  
  // Di JWT, logout di client-side dengan menghapus token
  // Clear HttpOnly cookie
  res.clearCookie('nara_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  res.json({ success: true, message: 'Logout berhasil.' });
}));

module.exports = router;
