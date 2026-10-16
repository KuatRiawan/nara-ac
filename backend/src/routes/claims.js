const express = require('express');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const warrantyService = require('../services/warrantyService');

const idParam = Joi.object({ id: Joi.number().integer().positive().required().label('ID') });
const router = express.Router();

// GET /api/v1/claims/warranty-info/:bookingId - Info status garansi booking (BR-23, BR-24)
router.get('/warranty-info/:bookingId', validate(Joi.object({
  bookingId: Joi.number().integer().positive().required(),
}), 'params'), wrap(async (req, res) => {
  const info = await warrantyService.getWarrantyInfo(Number(req.params.bookingId));
  res.json({ success: true, data: info });
}));

// POST /api/v1/claims - Ajukan klaim garansi baru (BR-24, BR-25, BR-28, BR-30, BR-31)
router.post('/', optionalAuth, validate(Joi.object({
  booking_id: Joi.number().integer().positive().required().label('ID Booking'),
  keluhan: Joi.string().trim().min(5).max(500).required().label('Keluhan'),
  rating: Joi.number().integer().min(1).max(5).optional().label('Rating Review'),
  review_komentar: Joi.string().trim().min(3).max(500).optional().label('Komentar Review'),
  kontak: Joi.string().trim().optional().label('Nomor WhatsApp Pemesan'),
})), wrap(async (req, res) => {
  const result = await warrantyService.submitClaim({
    booking_id: req.body.booking_id,
    keluhan: req.body.keluhan,
    rating: req.body.rating,
    review_komentar: req.body.review_komentar,
    user: req.user,
    kontak: req.body.kontak,
  });
  res.status(201).json({
    success: true,
    message: `Klaim garansi ${result.kode_klaim} berhasil diajukan dan sedang menunggu jadwal pemeriksaan dari admin.`,
    data: result,
  });
}));

// GET /api/v1/claims/my-claims - Daftar klaim garansi milik customer yang sedang login
router.get('/my-claims', requireAuth(['customer']), validate(Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  status: Joi.string().valid('diajukan', 'dijadwalkan', 'diperiksa', 'disetujui', 'ditolak', 'selesai').optional(),
}), 'query'), wrap(async (req, res) => {
  const result = await warrantyService.listClaims({
    customer_id: req.user.customer_id,
    status: req.valid.query.status,
    page: req.valid.query.page,
    limit: req.valid.query.limit,
  });
  res.json(result);
}));

// GET /api/v1/claims/admin - Admin list semua klaim
router.get('/admin', requireAuth(['admin']), validate(Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('diajukan', 'dijadwalkan', 'diperiksa', 'disetujui', 'ditolak', 'selesai').optional(),
  customer_id: Joi.number().integer().positive().optional(),
}), 'query'), wrap(async (req, res) => {
  const result = await warrantyService.listClaims(req.valid.query);
  res.json(result);
}));

// PATCH /api/v1/claims/:id/schedule - Admin menjadwalkan pemeriksaan dan menunjuk teknisi (BR-26, BR-27)
router.patch('/:id/schedule', requireAuth(['admin']), validate(idParam, 'params'), validate(Joi.object({
  jadwal_pemeriksaan: Joi.string().trim().required().label('Jadwal Pemeriksaan'),
  teknisi_pemeriksa_id: Joi.number().integer().positive().required().label('Teknisi Pemeriksa'),
})), wrap(async (req, res) => {
  const updated = await warrantyService.scheduleInspection(Number(req.params.id), req.body, req.user);
  res.json({
    success: true,
    message: 'Jadwal pemeriksaan klaim dan teknisi pemeriksa berhasil ditentukan.',
    data: updated,
  });
}));

// POST /api/v1/claims/:id/inspect - Teknisi mengisi laporan pemeriksaan (BR-26)
router.post('/:id/inspect', requireAuth(['technician', 'admin']), validate(idParam, 'params'), validate(Joi.object({
  catatan_pemeriksaan: Joi.string().trim().min(5).max(1000).required().label('Catatan Hasil Pemeriksaan'),
})), wrap(async (req, res) => {
  const updated = await warrantyService.reportInspection(Number(req.params.id), req.body, req.user);
  res.json({
    success: true,
    message: 'Laporan pemeriksaan klaim berhasil disimpan.',
    data: updated,
  });
}));

// PATCH /api/v1/claims/:id/decide - Admin memutuskan klaim disetujui atau ditolak (BR-26, BR-28, BR-29, BR-33)
router.patch('/:id/decide', requireAuth(['admin']), validate(idParam, 'params'), validate(Joi.object({
  keputusan: Joi.string().valid('disetujui', 'ditolak').required().label('Keputusan Klaim'),
  alasan_penolakan: Joi.string().trim().min(5).max(500).optional().allow('').label('Alasan Penolakan'),
  biaya_tambahan: Joi.number().min(0).default(0).label('Biaya Tambahan'),
})), wrap(async (req, res) => {
  const updated = await warrantyService.decideClaim(Number(req.params.id), req.body, req.user);
  res.json({
    success: true,
    message: `Klaim garansi berhasil ${updated.status}.`,
    data: updated,
  });
}));

// POST /api/v1/claims/:id/convert-to-paid - Booking berbayar dari klaim ditolak (BR-32)
router.post('/:id/convert-to-paid', requireAuth(['customer', 'admin']), validate(idParam, 'params'), validate(Joi.object({
  layanan_id: Joi.number().integer().positive().optional().label('ID Layanan'),
  jadwal_mulai: Joi.string().trim().optional().label('Jadwal Mulai'),
})), wrap(async (req, res) => {
  const result = await warrantyService.convertToPaidBooking(Number(req.params.id), req.body, req.user);
  res.status(201).json(result);
}));

module.exports = router;
