const express = require('express');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const paymentService = require('../services/paymentService');

const idParam = Joi.object({ id: Joi.number().integer().positive().required().label('ID') });
const router = express.Router();

// GET /api/v1/payments/settings - Dapatkan skema & metode pembayaran aktif (BR-34, BR-36)
router.get('/settings', wrap(async (_req, res) => {
  const settings = await paymentService.getPaymentSettings();
  res.json({ success: true, data: settings });
}));

// PUT /api/v1/payments/settings - Admin mengatur ketersediaan skema pembayaran (BR-34)
router.put('/settings', requireAuth(['admin']), validate(Joi.object({
  schemes: Joi.object().optional().label('Skema Pembayaran'),
  methods: Joi.object().optional().label('Metode Pembayaran'),
})), wrap(async (req, res) => {
  const updated = await paymentService.updatePaymentSettings(req.body);
  res.json({
    success: true,
    message: 'Pengaturan skema pembayaran berhasil diperbarui (BR-34).',
    data: updated,
  });
}));

// POST /api/v1/payments/bookings/:id/scheme - Customer memilih skema pembayaran (BR-35, BR-36, BR-38)
router.post('/bookings/:id/scheme', optionalAuth, validate(idParam, 'params'), validate(Joi.object({
  skema_pembayaran: Joi.string().valid('full_upfront', 'dp_50', 'pay_after_service').required().label('Skema Pembayaran'),
  metode_pembayaran: Joi.string().valid('transfer', 'qris', 'cash').optional().label('Metode Pembayaran'),
  kontak: Joi.string().trim().optional().label('Nomor Kontak'),
})), wrap(async (req, res) => {
  const result = await paymentService.selectPaymentScheme(
    Number(req.params.id),
    req.body,
    req.user,
    req.body.kontak
  );
  res.json(result);
}));

// POST /api/v1/payments/bookings/:id/proof - Customer mengunggah bukti bayar transfer bank (BR-37)
router.post('/bookings/:id/proof', optionalAuth, validate(idParam, 'params'), validate(Joi.object({
  bukti_url: Joi.string().trim().required().label('URL Bukti Pembayaran'),
  nominal: Joi.number().positive().required().label('Nominal Pembayaran'),
  catatan: Joi.string().trim().max(500).optional().label('Catatan'),
  kontak: Joi.string().trim().optional().label('Nomor Kontak'),
})), wrap(async (req, res) => {
  const result = await paymentService.uploadTransferProof(
    Number(req.params.id),
    req.body,
    req.user,
    req.body.kontak
  );
  res.json(result);
}));

// PATCH /api/v1/payments/bookings/:id/verify - Admin verifikasi manual bukti bayar (BR-37)
router.patch('/bookings/:id/verify', requireAuth(['admin']), validate(idParam, 'params'), validate(Joi.object({
  disetujui: Joi.boolean().required().label('Status Persetujuan'),
  nominal_disetujui: Joi.number().min(0).optional().label('Nominal yang Disetujui'),
  catatan: Joi.string().trim().max(500).optional().allow('').label('Catatan Verifikasi'),
})), wrap(async (req, res) => {
  const result = await paymentService.verifyPaymentProof(
    Number(req.params.id),
    req.body,
    req.user
  );
  res.json(result);
}));

// POST /api/v1/payments/bookings/:id/refund - Admin proses refund kelebihan bayar (BR-41)
router.post('/bookings/:id/refund', requireAuth(['admin']), validate(idParam, 'params'), validate(Joi.object({
  nominal_refund: Joi.number().positive().required().label('Nominal Refund'),
  catatan: Joi.string().trim().max(500).optional().label('Catatan Refund'),
})), wrap(async (req, res) => {
  const result = await paymentService.processRefund(
    Number(req.params.id),
    req.body,
    req.user
  );
  res.json(result);
}));

// POST /api/v1/payments/bookings/:id/send-whatsapp - Kirim invoice ke WhatsApp (BR-42, BR-43)
router.post('/bookings/:id/send-whatsapp', requireAuth(['admin', 'customer']), validate(idParam, 'params'), validate(Joi.object({
  tipe_invoice: Joi.string().valid('initial', 'final', 'auto').default('auto').label('Tipe Invoice'),
  simulatedFailure: Joi.boolean().default(false).optional().label('Simulasi Gagal'),
})), wrap(async (req, res) => {
  const { query } = require('../db/pool');
  const booking = (await query('SELECT * FROM bookings WHERE id=$1', [Number(req.params.id)])).rows[0];
  if (!booking) throw require('../errors').E.notFound('Booking tidak ditemukan.');
  paymentService.assertPaymentOwner(booking, req.user);
  const result = await paymentService.queueAndDispatchWhatsAppInvoice(
    Number(req.params.id),
    req.body
  );
  res.json(result);
}));

// POST /api/v1/payments/retry-whatsapp - Coba kirim ulang WhatsApp invoice yang gagal (BR-43)
router.post('/retry-whatsapp', requireAuth(['admin']), validate(Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
})), wrap(async (req, res) => {
  const result = await paymentService.retryFailedWhatsAppInvoices(req.body.limit);
  res.json({
    success: true,
    message: `${result.total_retried} pengiriman WhatsApp berhasil diproses ulang (BR-43).`,
    data: result,
  });
}));

module.exports = router;
