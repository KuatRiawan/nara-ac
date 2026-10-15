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

const bookingItemSchema = Joi.object({
  layanan_id: Joi.number().integer().positive().required().label('Layanan ID'),
  jumlah_unit: Joi.number().integer().min(1).max(20).default(1).label('Jumlah Unit'),
  catatan: Joi.string().trim().allow('').max(200).optional().label('Catatan'),
});

const bookingSchema = Joi.object({
  nama: Joi.string().trim().min(2).max(80).required().label('Nama'),
  kontak: Joi.string().trim().max(20).required().label('Kontak'),
  layanan_id: Joi.number().integer().positive().optional().label('Layanan'),
  items: Joi.array().items(bookingItemSchema).min(1).optional().label('Items Layanan'),
  jadwal_mulai: Joi.string().trim().required().label('Jadwal'),
  alamat: Joi.string().trim().max(500).required().label('Alamat'),
  keluhan: Joi.string().trim().allow('').max(500).label('Keluhan'),
  jumlah_unit: Joi.number().integer().min(1).max(20).default(1).label('Jumlah Unit'),
  ac_unit_id: Joi.number().integer().positive().allow(null),
  teknisi_id: Joi.number().integer().positive().allow(null),
  idempotency_key: Joi.string().trim().max(100).allow('', null).optional().label('Idempotency Key'),
}).or('layanan_id', 'items');

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
  jumlah_unit: Joi.number().integer().min(1).max(20).default(1).label('Jumlah Unit'),
}), 'query'), wrap(async (req, res) => {
  const q = req.valid.query;
  if (Number.isNaN(Date.parse(q.tanggal))) throw E.validation('Tanggal tidak valid.', { tanggal: 'Tanggal tidak valid.' });
  res.json(await svc.getAvailability(q.tanggal, q.layanan_id, q.jumlah_unit || 1));
}));

router.get('/public/bookings/:kode', publicLimiter, validate(Joi.object({
  kode: Joi.string().pattern(/^(NARA-AC[A-Za-z0-9-]+|AC-[A-Za-z0-9-]+|BK-[A-Za-z0-9-]+)$/i).required().label('Kode Booking'),
}), 'params'), wrap(async (req, res) => {
  res.json(await svc.publicStatusByCode(req.params.kode));
}));

router.patch('/public/bookings/:kode/reschedule', publicLimiter, validate(Joi.object({
  jadwal_mulai: Joi.string().trim().required().label('Jadwal Baru'),
  kontak: Joi.string().pattern(/^\d{6,20}$/).required().label('6-20 digit kontak'),
})), wrap(async (req, res) => {
  if (!/^(NARA-AC[A-Za-z0-9-]+|AC-[A-Za-z0-9-]+|BK-[A-Za-z0-9-]+)$/i.test(req.params.kode)) throw E.notFound('Kode booking tidak ditemukan.');
  const booking = await svc.verifyPublicBooking(req.params.kode, req.body.kontak);
  res.json(await svc.reschedule(booking.id, req.body.jadwal_mulai, { label: 'customer' }));
}));

router.patch('/public/bookings/:kode/cancel', publicLimiter, validate(Joi.object({
  kontak: Joi.string().pattern(/^\d{6,20}$/).required().label('6-20 digit kontak'),
  alasan: Joi.string().trim().max(300).allow(''),
})), wrap(async (req, res) => {
  if (!/^(NARA-AC[A-Za-z0-9-]+|AC-[A-Za-z0-9-]+|BK-[A-Za-z0-9-]+)$/i.test(req.params.kode)) throw E.notFound('Kode booking tidak ditemukan.');
  const booking = await svc.verifyPublicBooking(req.params.kode, req.body.kontak);
  res.json(await svc.cancelBooking(booking.id, { label: 'customer' }, req.body.alasan || 'Dibatalkan oleh pelanggan'));
}));

router.get('/public/bookings/:kode/invoice', publicLimiter, optionalAuth, validate(Joi.object({
  kode: Joi.string().pattern(/^(NARA-AC[A-Za-z0-9-]+|AC-[A-Za-z0-9-]+|BK-[A-Za-z0-9-]+)$/i).required().label('Kode Booking'),
}), 'params'), wrap(async (req, res) => {
  const booking = await svc.publicStatusByCode(req.params.kode);
  const invoice = svc.calculateInvoice(booking);
  
  // Ownership verification check
  let isVerified = false;
  if (req.user && (req.user.role === 'admin' || req.user.role === 'technician')) {
    isVerified = true;
  } else if (req.user && req.user.role === 'customer' && req.user.customerId === booking.customer_id) {
    isVerified = true;
  } else if (req.query?.kontak) {
    try {
      await svc.verifyPublicBooking(req.params.kode, req.query.kontak);
      isVerified = true;
    } catch {
      isVerified = false;
    }
  }

  invoice.is_verified_ownership = isVerified;
  res.json(invoice);
}));

router.post('/bookings/:id/feedback', publicLimiter, optionalAuth, validate(idParam, 'params'), validate(Joi.object({
  kode_booking: Joi.string().trim().required().label('Kode booking'),
  kontak: Joi.string().trim().allow('').max(30).label('Kontak'),
  feedback_token: Joi.string().trim().allow('').max(100).label('Token feedback'),
  rating: Joi.number().integer().min(1).max(5).required().label('Rating'),
  komentar: Joi.string().trim().allow('').max(500).label('Komentar'),
})), wrap(async (req, res) => {
  const out = await svc.submitFeedback(Number(req.params.id), req.body, null, req.user);
  res.status(201).json(out);
}));

// ---- Pembuatan booking: publik (pelanggan) atau admin ----
router.post('/bookings', publicLimiter, optionalAuth, validate(bookingSchema), wrap(async (req, res) => {
  if (req.user && req.user.role === 'technician') throw E.forbidden('Teknisi tidak dapat membuat booking.');
  const actor = { 
    label: req.user 
      ? (req.user.role === 'admin' ? `admin:${req.user.nama}` : 'customer') 
      : 'customer' 
  };
  const b = await svc.createBooking(req.body, actor);
  if (req.body.teknisi_id && req.user && req.user.role === 'admin') {
    try {
      await svc.assignTechnician(b.id, req.body.teknisi_id, actor);
    } catch (e) {
      // jika assign gagal karena bentrok, booking tetap terbuat tapi belum ditugaskan
      console.warn('Auto assign technician failed:', e.message);
    }
  }
  // Return full booking data for invoice display and frontend consistency
  res.status(201).json(b);
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

// Update payment status for a booking (UX-003)
router.patch('/bookings/:id/payment-status', requireAuth(['admin']), validate(idParam, 'params'),
  validate(Joi.object({
    status_pembayaran: Joi.string().valid('pending', 'paid').required().label('Status Pembayaran'),
  })), wrap(async (req, res) => {
    const bookingId = Number(req.params.id);
    const { status_pembayaran } = req.body;

    // Verify booking exists
    const existing = (await query('SELECT id, status_pembayaran FROM bookings WHERE id=$1', [bookingId])).rows[0];
    if (!existing) throw E.notFound('Booking tidak ditemukan.');

    // Update payment status
    await query(
      'UPDATE bookings SET status_pembayaran=$1, updated_at=NOW() WHERE id=$2',
      [status_pembayaran, bookingId]
    );

    res.json({
      id: bookingId,
      status_pembayaran,
      message: `Status pembayaran berhasil diperbarui menjadi ${status_pembayaran === 'paid' ? 'Lunas' : 'Pending'}.`
    });
  }));

module.exports = router;
