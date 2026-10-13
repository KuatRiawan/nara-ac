const express = require('express');
const bcrypt = require('bcryptjs');
const { query, withTx, sanitizeLimitOffset } = require('../db/pool');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const { E } = require('../errors');
const { normalizePhone } = require('../utils/ids');

const router = express.Router();

const idParam = Joi.object({ id: Joi.number().integer().positive().required().label('ID') });
const listQ = Joi.object({
  q: Joi.string().trim().max(80).allow(''),
  aktif: Joi.boolean(),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(200),
});

function paged(table, searchCols, orderBy) {
  return wrap(async (req, res) => {
    const { q, aktif, page = 1, limit = 50 } = req.valid.query;
    const { limit: safeLimit, offset: safeOffset } = sanitizeLimitOffset(limit, (page - 1) * limit);
    const where = []; const params = [];
    if (q) { params.push(`%${q}%`); where.push(`(${searchCols.map((c) => `${c} ILIKE $${params.length}`).join(' OR ')})`); }
    if (aktif !== undefined) { params.push(aktif); where.push(`aktif = $${params.length}`); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = (await query(`SELECT COUNT(*)::int n FROM ${table} ${w}`, params)).rows[0].n;
    const rows = (await query(`SELECT * FROM ${table} ${w} ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, safeLimit, safeOffset])).rows;
    res.json({ data: rows, meta: { total, page: page, limit: safeLimit } });
  });
}

const phoneField = (label) => Joi.string().trim().max(20).custom((v, h) => {
  const n = normalizePhone(v);
  return n || h.error('any.invalid');
}).messages({ 'any.invalid': `${label} tidak valid. Gunakan nomor HP Indonesia, contoh 081234567890.` }).label(label);

// ---------- Customers ----------
const custCreate = Joi.object({
  nama: Joi.string().trim().min(2).max(80).required().label('Nama'),
  kontak: phoneField('Kontak').required(),
  alamat: Joi.string().trim().allow('').max(500).label('Alamat'),
  catatan_umum: Joi.string().trim().allow('').max(300).label('Catatan'),
});
const custPatch = Joi.object({
  nama: Joi.string().trim().min(2).max(80), kontak: phoneField('Kontak'),
  alamat: Joi.string().trim().allow('').max(500), catatan_umum: Joi.string().trim().allow('').max(300), aktif: Joi.boolean(),
}).min(1).messages({ 'object.min': 'Minimal satu field harus diubah.' });

router.get('/customers', requireAuth(['admin']), validate(listQ, 'query'), paged('customers', ['nama', 'kontak', 'alamat'], 'nama'));
router.post('/customers', requireAuth(['admin']), validate(custCreate), wrap(async (req, res) => {
  try {
    const r = await query('INSERT INTO customers (nama,kontak,alamat,catatan_umum) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.body.nama, req.body.kontak, req.body.alamat || null, req.body.catatan_umum || null]);
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') throw E.conflict('Nomor kontak sudah terdaftar pada customer lain.', { kontak: 'Kontak sudah digunakan.' });
    throw e;
  }
}));
async function patchTable(table, id, body, cols) {
  const sets = []; const params = [id];
  for (const c of cols) if (body[c] !== undefined) { params.push(body[c] === '' ? null : body[c]); sets.push(`${c} = $${params.length}`); }
  const r = await query(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
  if (!r.rows[0]) throw E.notFound('Data tidak ditemukan.');
  return r.rows[0];
}
router.patch('/customers/:id', requireAuth(['admin']), validate(idParam, 'params'), validate(custPatch), wrap(async (req, res) => {
  try { res.json(await patchTable('customers', req.params.id, req.body, ['nama', 'kontak', 'alamat', 'catatan_umum', 'aktif'])); } catch (e) {
    if (e.code === '23505') throw E.conflict('Nomor kontak sudah terdaftar pada customer lain.', { kontak: 'Kontak sudah digunakan.' });
    throw e;
  }
}));

// ---------- Technicians ----------
const techCreate = Joi.object({
  nama: Joi.string().trim().min(2).max(80).required().label('Nama'),
  kontak: phoneField('Kontak').required(),
  catatan: Joi.string().trim().allow('').max(300).label('Catatan'),
  telegram_chat_id: Joi.string().trim().allow('').max(40).label('Telegram chat id'),
  email: Joi.string().email({ tlds: { allow: false } }).max(120).label('Email login'),
  password: Joi.string().min(8).max(100).label('Password'),
}).and('email', 'password');
const techPatch = Joi.object({
  nama: Joi.string().trim().min(2).max(80), kontak: phoneField('Kontak'),
  catatan: Joi.string().trim().allow('').max(300), telegram_chat_id: Joi.string().trim().allow('').max(40), aktif: Joi.boolean(),
}).min(1).messages({ 'object.min': 'Minimal satu field harus diubah.' });

router.get('/technicians', requireAuth(['admin']), validate(listQ, 'query'), paged('technicians', ['nama', 'kontak'], 'nama'));
router.post('/technicians', requireAuth(['admin']), validate(techCreate), wrap(async (req, res) => {
  const out = await withTx(async (c) => {
    const t = (await c.query('INSERT INTO technicians (nama,kontak,catatan,telegram_chat_id,is_synthetic) VALUES ($1,$2,$3,$4,false) RETURNING *',
      [req.body.nama, req.body.kontak, req.body.catatan || null, req.body.telegram_chat_id || null])).rows[0];
    if (req.body.email) {
      try {
        await c.query("INSERT INTO users (nama,email,password_hash,role,technician_id) VALUES ($1,$2,$3,'technician',$4)",
          [req.body.nama, req.body.email, await bcrypt.hash(req.body.password, 10), t.id]);
      } catch (e) {
        if (e.code === '23505') throw E.conflict('Email login sudah dipakai.', { email: 'Email sudah terdaftar.' });
        throw e;
      }
    }
    return t;
  });
  res.status(201).json(out);
}));
router.patch('/technicians/:id', requireAuth(['admin']), validate(idParam, 'params'), validate(techPatch), wrap(async (req, res) => {
  if (req.body.aktif === false) {
    const n = (await query("SELECT COUNT(*)::int n FROM bookings WHERE teknisi_id=$1 AND status IN ('scheduled','on process')", [req.params.id])).rows[0].n;
    if (n > 0) throw E.business(`Teknisi masih memiliki ${n} pekerjaan aktif. Pindahkan/selesaikan dulu sebelum menonaktifkan.`);
  }
  const out = await patchTable('technicians', req.params.id, req.body, ['nama', 'kontak', 'catatan', 'telegram_chat_id', 'aktif']);
  if (req.body.aktif === false) await query('UPDATE users SET aktif=false WHERE technician_id=$1', [req.params.id]);
  if (req.body.aktif === true) await query('UPDATE users SET aktif=true WHERE technician_id=$1', [req.params.id]);
  res.json(out);
}));

router.delete('/technicians/:id', requireAuth(['admin']), validate(idParam, 'params'), wrap(async (req, res) => {
  await withTx(async (c) => {
    // 1. Update references to NULL to satisfy foreign key constraints
    await c.query('UPDATE bookings SET teknisi_id = NULL WHERE teknisi_id = $1', [req.params.id]);
    await c.query('UPDATE inventory_usage SET teknisi_id = NULL WHERE teknisi_id = $1', [req.params.id]);
    await c.query('UPDATE schedule_history SET teknisi_lama_id = NULL WHERE teknisi_lama_id = $1', [req.params.id]);
    await c.query('UPDATE schedule_history SET teknisi_baru_id = NULL WHERE teknisi_baru_id = $1', [req.params.id]);
    
    // 2. Delete related user account if exists
    await c.query('DELETE FROM users WHERE technician_id = $1', [req.params.id]);
    
    // 3. Delete the technician (availability will cascade)
    await c.query('DELETE FROM technicians WHERE id = $1', [req.params.id]);
  });
  res.json({ message: 'Teknisi berhasil dihapus' });
}));

// ---------- Inventory ----------
const KAT = ['freon', 'pipa', 'kabel', 'komponen'];
const invCreate = Joi.object({
  nama: Joi.string().trim().min(2).max(80).required().label('Nama'),
  kategori: Joi.string().valid(...KAT).required().label('Kategori'),
  stok: Joi.number().min(0).max(1000000).required().label('Stok'),
  satuan: Joi.string().trim().min(1).max(20).required().label('Satuan'),
  min_stok: Joi.number().min(0).max(1000000).required().label('Stok minimum'),
});
const invPatch = Joi.object({
  nama: Joi.string().trim().min(2).max(80), kategori: Joi.string().valid(...KAT), stok: Joi.number().min(0).max(1000000),
  satuan: Joi.string().trim().min(1).max(20), min_stok: Joi.number().min(0).max(1000000), aktif: Joi.boolean(),
}).min(1).messages({ 'object.min': 'Minimal satu field harus diubah.' });

router.get('/inventory', requireAuth(['admin']), validate(listQ, 'query'), paged('inventory', ['nama', 'kategori'], 'nama'));
router.post('/inventory', requireAuth(['admin']), validate(invCreate), wrap(async (req, res) => {
  try {
    const r = await query('INSERT INTO inventory (nama,kategori,stok,satuan,min_stok,is_synthetic) VALUES ($1,$2,$3,$4,$5,false) RETURNING *',
      [req.body.nama, req.body.kategori, req.body.stok, req.body.satuan, req.body.min_stok]);
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') throw E.conflict('Nama item sudah ada.', { nama: 'Nama item sudah digunakan.' });
    throw e;
  }
}));
router.patch('/inventory/:id', requireAuth(['admin']), validate(idParam, 'params'), validate(invPatch), wrap(async (req, res) => {
  try { res.json(await patchTable('inventory', req.params.id, { ...req.body }, ['nama', 'kategori', 'stok', 'satuan', 'min_stok', 'aktif'])); } catch (e) {
    if (e.code === '23505') throw E.conflict('Nama item sudah ada.', { nama: 'Nama item sudah digunakan.' });
    throw e;
  }
}));

const svcCreate = Joi.object({
  kode: Joi.string().trim().pattern(/^[a-zA-Z0-9-]{2,40}$/).required().label('Kode'),
  nama_layanan: Joi.string().trim().min(3).max(100).required().label('Nama layanan'),
  kategori: Joi.string().valid('cuci', 'perbaikan', 'instalasi', 'lainnya', 'Cleaning', 'Deep Clean', 'Freon', 'Freon & Clean', 'Repair', 'Instalasi', 'Lainnya').required().label('Kategori'),
  deskripsi: Joi.string().trim().min(10).max(500).required().label('Deskripsi'),
  harga: Joi.number().integer().min(0).max(100000000).required().label('Harga'),
  durasi_menit: Joi.number().integer().min(15).max(480).required().label('Durasi'),
});
const svcPatch = Joi.object({
  nama_layanan: Joi.string().trim().min(3).max(100), kategori: Joi.string().valid('cuci', 'perbaikan', 'instalasi', 'lainnya', 'Cleaning', 'Deep Clean', 'Freon', 'Freon & Clean', 'Repair', 'Instalasi', 'Lainnya'),
  deskripsi: Joi.string().trim().min(10).max(500), harga: Joi.number().integer().min(0).max(100000000),
  durasi_menit: Joi.number().integer().min(15).max(480), aktif: Joi.boolean(),
}).min(1).messages({ 'object.min': 'Minimal satu field harus diubah.' });

router.get('/service-catalog', validate(Joi.object({
  aktif: Joi.boolean(),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(200),
}), 'query'), wrap(async (req, res) => {
  const { aktif, page = 1, limit = 50 } = req.valid.query;
  const { limit: safeLimit, offset: safeOffset } = sanitizeLimitOffset(limit, (page - 1) * limit);
  const params = [];
  const where = [];
  if (aktif !== undefined) { params.push(aktif); where.push(`aktif = $${params.length}`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await query(`SELECT COUNT(*)::int n FROM service_catalog ${w}`, params)).rows[0].n;
  const rows = (await query(`SELECT * FROM service_catalog ${w} ORDER BY id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, safeLimit, safeOffset])).rows;
  res.json({ data: rows, meta: { total, page: page, limit: safeLimit } });
}));
router.post('/service-catalog', requireAuth(['admin']), validate(svcCreate), wrap(async (req, res) => {
  try {
    const b = req.body;
    const r = await query(`INSERT INTO service_catalog (kode,nama_layanan,kategori,deskripsi,harga,durasi_menit,is_synthetic)
      VALUES ($1,$2,$3,$4,$5,$6,false) RETURNING *`, [b.kode, b.nama_layanan, b.kategori, b.deskripsi, b.harga, b.durasi_menit]);
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') throw E.conflict('Kode layanan sudah ada.', { kode: 'Kode sudah digunakan.' });
    throw e;
  }
}));
router.patch('/service-catalog/:id', requireAuth(['admin']), validate(idParam, 'params'), validate(svcPatch), wrap(async (req, res) => {
  // Perubahan manual oleh admin = data resmi usaha, bukan lagi sintetis
  const row = await patchTable('service_catalog', req.params.id, req.body, ['nama_layanan', 'kategori', 'deskripsi', 'harga', 'durasi_menit', 'aktif']);
  await query('UPDATE service_catalog SET updated_at=now(), is_synthetic=false WHERE id=$1', [req.params.id]);
  res.json({ ...row, is_synthetic: false });
}));

// ---------- Pengaturan jam operasional ----------
const opsSchema = Joi.object({
  open: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required().label('Jam buka'),
  close: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required().label('Jam tutup'),
  days: Joi.array().items(Joi.number().integer().min(0).max(6)).min(1).unique().required().label('Hari'),
  slot_minutes: Joi.number().valid(30, 60, 90, 120).required().label('Durasi slot'),
  min_lead_minutes: Joi.number().integer().min(0).max(1440).required().label('Minimal sebelum jadwal'),
  max_advance_days: Joi.number().integer().min(1).max(365).required().label('Maksimal hari ke depan'),
  reminder_hour: Joi.number().integer().min(0).max(23).required().label('Jam pengingat'),
});
router.get('/settings/operating-hours', validate(Joi.object({}), 'query'), wrap(async (_req, res) => {
  res.json(await require('../services/bookingService').getOps());
}));
router.put('/settings/operating-hours', requireAuth(['admin']), validate(opsSchema), wrap(async (req, res) => {
  if (req.body.open >= req.body.close) throw E.validation('Jam operasional tidak valid.', { close: 'Jam tutup harus setelah jam buka.' });
  await query(`INSERT INTO settings (key,value) VALUES ('operating_hours',$1)
    ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`, [JSON.stringify(req.body)]);
  res.json(req.body);
}));

// ---------- Pengaturan Rekening Bank Pembayaran ----------
const defaultPaymentSettings = {
  accounts: [
    { id: '1', bank_name: 'BCA', account_number: '8720-9182-33', account_holder: 'CV NARA TEKNINDOTAMA' },
    { id: '2', bank_name: 'Mandiri', account_number: '137-00-9821-4451', account_holder: 'CV NARA TEKNINDOTAMA' },
  ],
  instruction_note: '*Tersedia juga opsi pembayaran tunai / QRIS langsung kepada teknisi setelah pekerjaan selesai di lokasi.'
};

const bankAccountItemSchema = Joi.object({
  id: Joi.string().optional().allow(''),
  bank_name: Joi.string().trim().required().label('Nama Bank'),
  account_number: Joi.string().trim().required().label('Nomor Rekening'),
  account_holder: Joi.string().trim().required().label('Atas Nama')
});

const paymentSettingsSchema = Joi.object({
  accounts: Joi.array().items(bankAccountItemSchema).min(1).required().label('Daftar Rekening'),
  instruction_note: Joi.string().trim().allow('').max(500).optional().label('Catatan Instruksi')
});

router.get('/settings/payment-accounts', validate(Joi.object({}), 'query'), wrap(async (_req, res) => {
  const r = await query("SELECT value FROM settings WHERE key = 'payment_accounts'");
  if (!r.rows[0]) return res.json(defaultPaymentSettings);
  res.json({ ...defaultPaymentSettings, ...r.rows[0].value });
}));

router.put('/settings/payment-accounts', requireAuth(['admin']), validate(paymentSettingsSchema), wrap(async (req, res) => {
  await query(`INSERT INTO settings (key, value) VALUES ('payment_accounts', $1)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [JSON.stringify(req.body)]);
  res.json(req.body);
}));

// ---------- Pengaturan Profil Bisnis & Operasional ----------
const defaultBusinessProfile = {
  name: 'CV. NARA TEKNINDOTAMA',
  tagline: 'Spesialis Layanan Service, Maintenance & Instalasi AC Profesional',
  address: 'Jl. Raya Industri No. 45, Kawasan Sentra Bisnis',
  phone: '+62 812-3456-7890',
  hours: 'Senin - Sabtu: 08.00 - 17.00 WIB',
  guarantee: 'Garansi Pengerjaan Resmi 30 Hari'
};

const businessProfileSchema = Joi.object({
  name: Joi.string().trim().required().label('Nama Usaha'),
  tagline: Joi.string().trim().allow('').label('Tagline'),
  address: Joi.string().trim().allow('').label('Alamat'),
  phone: Joi.string().trim().allow('').label('Kontak Hotline'),
  hours: Joi.string().trim().allow('').label('Jam Layanan'),
  guarantee: Joi.string().trim().allow('').label('Ketentuan Garansi')
});

router.get('/settings/business-profile', validate(Joi.object({}), 'query'), wrap(async (_req, res) => {
  const r = await query("SELECT value FROM settings WHERE key = 'business_profile'");
  if (!r.rows[0]) return res.json(defaultBusinessProfile);
  res.json({ ...defaultBusinessProfile, ...r.rows[0].value });
}));

router.put('/settings/business-profile', requireAuth(['admin']), validate(businessProfileSchema), wrap(async (req, res) => {
  await query(`INSERT INTO settings (key, value) VALUES ('business_profile', $1)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [JSON.stringify(req.body)]);
  res.json(req.body);
}));

module.exports = router;

