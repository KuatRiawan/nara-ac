const express = require('express');
const { query } = require('../db/pool');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const { E } = require('../errors');

const router = express.Router();
router.use(requireAuth(['customer']));

const idParam = Joi.object({ id: Joi.number().integer().positive().required() });

// AC Units
const acUnitSchema = Joi.object({
  brand: Joi.string().trim().max(50).required().label('Merk'),
  model: Joi.string().trim().max(100).allow('', null).label('Model'),
  tipe: Joi.string().trim().max(50).allow('', null).label('Tipe'),
  kapasitas_pk: Joi.number().positive().allow(null).label('Kapasitas PK'),
  lokasi: Joi.string().trim().max(100).required().label('Lokasi'),
  tanggal_pasang: Joi.date().iso().allow(null).label('Tanggal Pasang'),
  nomor_seri: Joi.string().trim().max(100).allow('', null).label('Nomor Seri'),
  catatan: Joi.string().trim().max(500).allow('', null).label('Catatan')
});

const acUnitService = require('../services/acUnitService');

router.get('/ac-units', validate(Joi.object({
  aktif: Joi.boolean().default(true),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
}), 'query'), wrap(async (req, res) => {
  const { aktif, page, limit } = req.valid.query;
  const customerId = req.user.customer_id;
  const offset = (page - 1) * limit;
  const result = await query('SELECT * FROM ac_units WHERE customer_id = $1 AND aktif = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4', 
    [customerId, aktif, limit, offset]);
  const total = (await query('SELECT COUNT(*)::int FROM ac_units WHERE customer_id = $1 AND aktif = $2', [customerId, aktif])).rows[0].count;

  // Enrich unit dengan riwayat servis & jadwal perawatan berkala (BR-15, BR-16, BR-17)
  const enriched = await Promise.all(result.rows.map(async (u) => {
    const maint = await acUnitService.getUnitMaintenanceInfo(u.id);
    return {
      ...u,
      total_servis_selesai: maint?.total_servis_selesai || 0,
      servis_terakhir: maint?.servis_terakhir || null,
      jadwal_perawatan_berikutnya: maint?.jadwal_perawatan_berikutnya || null,
      status_perawatan: maint?.status_perawatan || 'optimal',
    };
  }));

  res.json({ data: enriched, meta: { total: Number(total), page, limit } });
}));

router.get('/ac-units/:id', validate(idParam, 'params'), wrap(async (req, res) => {
  const unit = await query('SELECT id FROM ac_units WHERE id=$1 AND customer_id=$2', [req.params.id, req.user.customer_id]);
  if (!unit.rows.length) throw E.notFound('Unit AC tidak ditemukan');
  const maint = await acUnitService.getUnitMaintenanceInfo(req.params.id);
  res.json({ data: maint });
}));

router.post('/ac-units', validate(acUnitSchema), wrap(async (req, res) => {
  const b = req.body;
  const result = await query(`
    INSERT INTO ac_units (customer_id, brand, model, tipe, kapasitas_pk, lokasi, tanggal_pasang, nomor_seri, catatan)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
  `, [req.user.customer_id, b.brand, b.model, b.tipe, b.kapasitas_pk, b.lokasi, b.tanggal_pasang, b.nomor_seri, b.catatan]);
  res.status(201).json({ data: result.rows[0] });
}));

router.patch('/ac-units/:id', validate(idParam, 'params'), validate(acUnitSchema), wrap(async (req, res) => {
  const b = req.body;
  const unit = await query('SELECT id FROM ac_units WHERE id=$1 AND customer_id=$2', [req.params.id, req.user.customer_id]);
  if (!unit.rows.length) throw E.notFound('Unit AC tidak ditemukan');
  
  const result = await query(`
    UPDATE ac_units SET brand=$1, model=$2, tipe=$3, kapasitas_pk=$4, lokasi=$5, tanggal_pasang=$6, nomor_seri=$7, catatan=$8, updated_at=now()
    WHERE id=$9 RETURNING *
  `, [b.brand, b.model, b.tipe, b.kapasitas_pk, b.lokasi, b.tanggal_pasang, b.nomor_seri, b.catatan, req.params.id]);
  res.json({ data: result.rows[0] });
}));

router.delete('/ac-units/:id', validate(idParam, 'params'), validate(Joi.object({}), 'body'), wrap(async (req, res) => {
  const unit = await query('SELECT id FROM ac_units WHERE id=$1 AND customer_id=$2', [req.params.id, req.user.customer_id]);
  if (!unit.rows.length) throw E.notFound('Unit AC tidak ditemukan');
  await query('UPDATE ac_units SET aktif=false, updated_at=now() WHERE id=$1', [req.params.id]);
  res.json({ success: true });
}));

// History
router.get('/history', validate(Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}), 'query'), wrap(async (req, res) => {
  const { page, limit } = req.valid.query;
  const offset = (page - 1) * limit;
  const q = `
    SELECT b.*, s.nama_layanan, t.nama as teknisi_nama, au.brand, au.lokasi 
    FROM bookings b
    JOIN service_catalog s ON b.layanan_id = s.id
    LEFT JOIN technicians t ON b.teknisi_id = t.id
    LEFT JOIN ac_units au ON b.ac_unit_id = au.id
    WHERE b.customer_id = $1
    ORDER BY b.jadwal_mulai DESC LIMIT $2 OFFSET $3
  `;
  const result = await query(q, [req.user.customer_id, limit, offset]);
  const total = (await query('SELECT COUNT(*)::int FROM bookings WHERE customer_id = $1', [req.user.customer_id])).rows[0].count;
  res.json({ data: result.rows, meta: { total: Number(total), page, limit } });
}));

// Notifications
router.get('/notifications', validate(Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(50),
  page: Joi.number().integer().min(1).default(1),
  unread: Joi.boolean(),
}), 'query'), wrap(async (req, res) => {
  const { limit, page, unread } = req.valid.query;
  const offset = (page - 1) * limit;
  const params = ['customer', req.user.customer_id];
  let where = 'target_role = $1 AND target_id = $2';
  if (unread !== undefined) {
    params.push(unread ? false : true);
    where += ` AND is_read = $${params.length}`;
  }
  const result = await query(`SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT $3 OFFSET $4`, [...params, limit, offset]);
  const total = (await query(`SELECT COUNT(*)::int FROM notifications WHERE ${where}`, params)).rows[0].count;
  res.json({ data: result.rows, meta: { total: Number(total), page, limit } });
}));

router.patch('/notifications/:id/read', validate(idParam, 'params'), validate(Joi.object({}), 'body'), wrap(async (req, res) => {
  await query('UPDATE notifications SET is_read = true WHERE id = $1 AND target_role = $2 AND target_id = $3', [req.params.id, 'customer', req.user.customer_id]);
  res.json({ success: true });
}));

router.post('/notifications/read-all', validate(Joi.object({}), 'body'), wrap(async (req, res) => {
  await query('UPDATE notifications SET is_read = true WHERE target_role = $1 AND target_id = $2', ['customer', req.user.customer_id]);
  res.json({ success: true });
}));

// Profile
const customerProfileSchema = Joi.object({
  nama: Joi.string().trim().min(2).max(80).required().label('Nama Lengkap'),
  email: Joi.string().email({ tlds: { allow: false } }).max(120).required().label('Email'),
  kontak: Joi.string().trim().allow('', null).max(30).optional().label('Nomor WhatsApp / HP'),
  alamat: Joi.string().trim().allow('', null).max(500).optional().label('Alamat Utama'),
});

router.get('/profile', wrap(async (req, res) => {
  const u = (await query('SELECT id, nama, email, kontak, role, customer_id, created_at FROM users WHERE id = $1', [req.user.id])).rows[0];
  let cust = null;
  if (u && u.customer_id) {
    cust = (await query('SELECT id, nama, kontak, alamat, catatan_umum, created_at FROM customers WHERE id = $1', [u.customer_id])).rows[0];
  }
  res.json({
    data: {
      user: u,
      customer: cust
    }
  });
}));

router.patch('/profile', validate(customerProfileSchema), wrap(async (req, res) => {
  const { nama, email, kontak, alamat } = req.body;
  const existing = (await query('SELECT id FROM users WHERE lower(email)=lower($1) AND id<>$2', [email, req.user.id])).rows[0];
  if (existing) throw E.conflict('Email sudah digunakan oleh akun lain.');

  const u = (await query(
    'UPDATE users SET nama=$1, email=$2, kontak=$3 WHERE id=$4 RETURNING id, nama, email, role, kontak, customer_id, created_at',
    [nama, email, kontak || null, req.user.id]
  )).rows[0];

  let cust = null;
  if (u.customer_id) {
    cust = (await query(
      'UPDATE customers SET nama=$1, kontak=$2, alamat=$3 WHERE id=$4 RETURNING *',
      [nama, kontak || '', alamat || null, u.customer_id]
    )).rows[0];
  }

  res.json({
    success: true,
    message: 'Profil Anda berhasil diperbarui.',
    data: {
      user: u,
      customer: cust
    }
  });
}));

// Dashboard overview
router.get('/dashboard', validate(Joi.object({}), 'query'), wrap(async (req, res) => {
  const customerId = req.user.customer_id;
  const activeBookings = await query(`
    SELECT b.*, s.nama_layanan, t.nama as teknisi_nama 
    FROM bookings b
    JOIN service_catalog s ON b.layanan_id = s.id
    LEFT JOIN technicians t ON b.teknisi_id = t.id
    WHERE b.customer_id = $1 AND b.status IN ('scheduled', 'on process', 'rescheduled', 'delayed')
    ORDER BY b.jadwal_mulai ASC LIMIT 5
  `, [customerId]);
  
  const acUnitsCount = await query('SELECT count(*) FROM ac_units WHERE customer_id = $1 AND aktif = true', [customerId]);
  const historyCount = await query('SELECT count(*) FROM bookings WHERE customer_id = $1 AND status = $2', [customerId, 'done']);
  
  const unreadNotifs = await query('SELECT count(*) FROM notifications WHERE target_role = $1 AND target_id = $2 AND is_read = false', ['customer', customerId]);
  
  res.json({
    data: {
      active_bookings: activeBookings.rows,
      ac_units_count: parseInt(acUnitsCount.rows[0].count, 10),
      history_count: parseInt(historyCount.rows[0].count, 10),
      unread_notifications: parseInt(unreadNotifs.rows[0].count, 10)
    }
  });
}));

// Reschedule mandiri oleh customer terdaftar (BR-09)
router.patch('/bookings/:id/reschedule', validate(idParam, 'params'), validate(Joi.object({
  jadwal_mulai: Joi.string().trim().required().label('Jadwal Baru'),
}), 'body'), wrap(async (req, res) => {
  const customerId = req.user.customer_id;
  const bookingId = Number(req.params.id);
  const b = (await query('SELECT * FROM bookings WHERE id = $1 AND customer_id = $2', [bookingId, customerId])).rows[0];
  if (!b) throw E.notFound('Pekerjaan tidak ditemukan atau bukan milik akun Anda.');

  const bs = require('../services/bookingService');
  const updated = await bs.reschedule(bookingId, req.body.jadwal_mulai, { label: `customer:${req.user.nama || 'Pelanggan'}` });
  res.json({
    success: true,
    message: 'Jadwal kunjungan servis berhasil diubah.',
    data: updated
  });
}));

// Konfirmasi pekerjaan selesai oleh customer (BR-14)
router.post('/bookings/:id/confirm-done', validate(idParam, 'params'), validate(Joi.object({
  catatan: Joi.string().trim().max(300).allow('').optional()
}), 'body'), wrap(async (req, res) => {
  const customerId = req.user.customer_id;
  const bookingId = Number(req.params.id);
  
  const b = (await query('SELECT * FROM bookings WHERE id = $1 AND customer_id = $2', [bookingId, customerId])).rows[0];
  if (!b) throw E.notFound('Pekerjaan tidak ditemukan atau bukan milik akun Anda.');
  if (b.status !== 'done') throw E.business('Hanya pekerjaan yang telah diselesaikan oleh teknisi yang dapat dikonfirmasi.');

  await query(
    `INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan)
     VALUES ($1, 'done', 'done', $2, $3)`,
    [bookingId, `customer:${req.user.nama || 'Pelanggan'}`, req.body.catatan || 'Pelanggan telah memverifikasi dan mengonfirmasi pekerjaan selesai']
  );

  res.json({
    success: true,
    message: 'Terima kasih, konfirmasi pekerjaan selesai telah berhasil dicatat.',
    booking_id: bookingId,
    status: 'done'
  });
}));

module.exports = router;
