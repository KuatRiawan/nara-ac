const express = require('express');
const rateLimit = require('express-rate-limit');
const { query } = require('../db/pool');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const svc = require('../services/bookingService');
const { E } = require('../errors');

const router = express.Router();

const publicLimiter = rateLimit({
  windowMs: 60000, limit: Number(process.env.PUBLIC_RATE_LIMIT || 40), standardHeaders: true, legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMIT,
  handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' } }),
});

const bookingSchema = Joi.object({
  nama: Joi.string().trim().min(2).max(80).required().label('Nama'),
  kontak: Joi.string().trim().max(20).required().label('Kontak'),
  layanan_id: Joi.number().integer().positive().required().label('Layanan'),
  jadwal_mulai: Joi.string().trim().required().label('Jadwal'),
  alamat: Joi.string().trim().max(500).required().label('Alamat'),
  keluhan: Joi.string().trim().allow('').max(500).label('Keluhan'),
  jumlah_unit: Joi.number().integer().min(1).max(20).default(1).label('Jumlah Unit'),
  ac_unit_id: Joi.number().integer().positive().allow(null),
  teknisi_id: Joi.number().integer().positive().allow(null),
  idempotency_key: Joi.string().trim().max(100).allow('', null).optional().label('Idempotency Key'),
});

const listSchema = Joi.object({
  q: Joi.string().trim().max(80).allow(''),
  status: Joi.string().valid('scheduled', 'on process', 'done', 'cancelled', 'rescheduled', 'delayed'),
  teknisi_id: Joi.number().integer().positive(),
  belum_ditugaskan: Joi.boolean(),
  dari: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  sampai: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  urut: Joi.string().valid('terdekat', 'terbaru'),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(200),
});

const idParam = Joi.object({ id: Joi.number().integer().positive().required().label('ID') });

// ---- Publik ----
router.get('/services', validate(Joi.object({
  aktif: Joi.boolean().default(true),
}), 'query'), wrap(async (req, res) => {
  const { aktif } = req.valid.query;
  const rows = (await query(
    'SELECT id, kode, nama_layanan, kategori, deskripsi, harga, durasi_menit, is_synthetic FROM service_catalog WHERE aktif=$1 ORDER BY id', [aktif])).rows;
  const ops = await svc.getOps();
  res.json({ data: rows, jam_operasional: { buka: ops.open, tutup: ops.close, hari: ops.days, slot_menit: ops.slot_minutes } });
}));

router.get('/availability', publicLimiter, validate(Joi.object({
  tanggal: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().label('Tanggal'),
  layanan_id: Joi.number().integer().positive().required().label('Layanan'),
}), 'query'), wrap(async (req, res) => {
  const q = req.valid.query;
  if (Number.isNaN(Date.parse(q.tanggal))) throw E.validation('Tanggal tidak valid.', { tanggal: 'Tanggal tidak valid.' });
  res.json(await svc.getAvailability(q.tanggal, q.layanan_id));
}));

router.get('/public/bookings/:kode', publicLimiter, validate(Joi.object({
  kode: Joi.string().pattern(/^(AC-[A-Za-z0-9]{4}|BK-[A-Za-z0-9-]+)$/i).required().label('Kode Booking'),
}), 'params'), wrap(async (req, res) => {
  res.json(await svc.publicStatusByCode(req.params.kode));
}));

router.patch('/public/bookings/:kode/reschedule', publicLimiter, validate(Joi.object({
  jadwal_mulai: Joi.string().trim().required().label('Jadwal Baru'),
  kontak: Joi.string().pattern(/^\d{6,20}$/).required().label('6-20 digit kontak'),
})), wrap(async (req, res) => {
  if (!/^(AC-[A-Za-z0-9]{4}|BK-[A-Za-z0-9-]+)$/i.test(req.params.kode)) throw E.notFound('Kode booking tidak ditemukan.');
  const booking = await svc.verifyPublicBooking(req.params.kode, req.body.kontak);
  res.json(await svc.reschedule(booking.id, req.body.jadwal_mulai, { label: 'customer' }));
}));

router.patch('/public/bookings/:kode/cancel', publicLimiter, validate(Joi.object({
  kontak: Joi.string().pattern(/^\d{6,20}$/).required().label('6-20 digit kontak'),
  alasan: Joi.string().trim().max(300).allow(''),
})), wrap(async (req, res) => {
  if (!/^(AC-[A-Za-z0-9]{4}|BK-[A-Za-z0-9-]+)$/i.test(req.params.kode)) throw E.notFound('Kode booking tidak ditemukan.');
  const booking = await svc.verifyPublicBooking(req.params.kode, req.body.kontak);
  res.json(await svc.cancelBooking(booking.id, { label: 'customer' }, req.body.alasan || 'Dibatalkan oleh pelanggan'));
}));

router.post('/bookings/:id/feedback', publicLimiter, validate(idParam, 'params'), validate(Joi.object({
  kode_booking: Joi.string().trim().required().label('Kode booking'),
  kontak: Joi.string().pattern(/^\d{6,20}$/).required().label('6-20 digit kontak'),
  rating: Joi.number().integer().min(1).max(5).required().label('Rating'),
  komentar: Joi.string().trim().allow('').max(500).label('Komentar'),
})), wrap(async (req, res) => {
  const out = await svc.submitFeedback(Number(req.params.id), req.body);
  res.status(201).json(out);
}));

// ---- Pembuatan booking: publik (pelanggan) atau admin ----
router.post('/bookings', publicLimiter, optionalAuth, validate(bookingSchema), wrap(async (req, res) => {
  if (req.user && req.user.role === 'technician') throw E.forbidden('Teknisi tidak dapat membuat booking.');
  const actor = { label: req.user ? `admin:${req.user.nama}` : 'customer' };
  const b = await svc.createBooking(req.body, actor);
  if (req.body.teknisi_id && req.user && req.user.role === 'admin') {
    try {
      await svc.assignTechnician(b.id, req.body.teknisi_id, actor);
    } catch (e) {
      // jika assign gagal karena bentrok, booking tetap terbuat tapi belum ditugaskan
      console.warn('Auto assign technician failed:', e.message);
    }
  }
  res.status(201).json({
    id: b.id, kode_booking: b.kode_booking, status: b.status,
    jadwal_mulai: b.jadwal_mulai, layanan: b.layanan.nama,
    pesan: `Booking berhasil dibuat. Kode tiket: ${b.kode_booking}`,
  });
}));

// ---- Terautentikasi ----
router.get('/bookings', requireAuth(['admin', 'technician']), validate(listSchema, 'query'), wrap(async (req, res) => {
  res.json(await svc.listBookings(req.valid.query, req.user));
}));

router.get('/bookings/:id', requireAuth(['admin', 'technician']), validate(idParam, 'params'), wrap(async (req, res) => {
  res.json(await svc.getBookingDetail(Number(req.params.id), req.user));
}));

router.patch('/bookings/:id/schedule', requireAuth(['admin']), validate(idParam, 'params'),
  validate(Joi.object({ jadwal_mulai: Joi.string().trim().required().label('Jadwal') })), wrap(async (req, res) => {
    res.json(await svc.reschedule(Number(req.params.id), req.body.jadwal_mulai, { label: `admin:${req.user.nama}` }));
  }));

router.patch('/bookings/:id/assign', requireAuth(['admin']), validate(idParam, 'params'),
  validate(Joi.object({ teknisi_id: Joi.number().integer().positive().required().label('Teknisi') })), wrap(async (req, res) => {
    res.json(await svc.assignTechnician(Number(req.params.id), req.body.teknisi_id, { label: `admin:${req.user.nama}` }));
  }));

router.patch('/bookings/:id/status', requireAuth(['admin', 'technician']), validate(idParam, 'params'),
  validate(Joi.object({
    status: Joi.string().valid('scheduled', 'on process', 'done').required().label('Status'),
    catatan: Joi.string().trim().allow('').max(500).label('Catatan'),
  })), wrap(async (req, res) => {
    res.json(await svc.changeStatus(Number(req.params.id), req.body.status, req.body.catatan, req.user));
  }));

router.post('/bookings/:id/inventory-usage', requireAuth(['admin', 'technician']), validate(idParam, 'params'),
  validate(Joi.object({
    item_id: Joi.number().integer().positive().required().label('Item'),
    jumlah: Joi.number().positive().max(10000).required().label('Jumlah'),
    catatan: Joi.string().trim().allow('').max(300).label('Catatan'),
  })), wrap(async (req, res) => {
    res.status(201).json(await svc.addInventoryUsage(Number(req.params.id), req.body, req.user));
  }));

router.get('/feedback', requireAuth(['admin']), validate(Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(200),
  page: Joi.number().integer().min(1).default(1),
}), 'query'), wrap(async (req, res) => {
  const { limit, page } = req.valid.query;
  const offset = (page - 1) * limit;
  const rows = (await query(
    `SELECT f.id, f.rating, f.komentar, f.sentimen, f.waktu, b.kode_booking, s.nama_layanan, t.nama AS teknisi
     FROM feedback f JOIN bookings b ON b.id=f.booking_id JOIN service_catalog s ON s.id=b.layanan_id
     LEFT JOIN technicians t ON t.id=b.teknisi_id ORDER BY f.waktu DESC LIMIT $1 OFFSET $2`, [limit, offset])).rows;
  const total = (await query('SELECT COUNT(*)::int FROM feedback')).rows[0].count;
  res.json({ data: rows, meta: { total: Number(total), page, limit } });
}));

module.exports = router;
