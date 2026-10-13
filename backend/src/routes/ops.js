const express = require('express');
const rateLimit = require('express-rate-limit');
const { query } = require('../db/pool');
const config = require('../config');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const reminders = require('../services/reminderService');
const chat = require('../services/chatService');
const analytics = require('../services/analyticsService');
const aiClient = require('../services/aiClient');
const { E } = require('../errors');

const router = express.Router();
const idParam = Joi.object({ id: Joi.number().integer().positive().required().label('ID') });

// ---- Reminders ----
router.get('/reminders', requireAuth(['admin', 'technician']), validate(Joi.object({
  tanggal: Joi.alternatives().try(Joi.string().valid('H-1'), Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)).label('Tanggal'),
  status: Joi.string().valid('pending', 'sent', 'failed'),
  target: Joi.string().valid('pelanggan', 'teknisi'),
  booking_id: Joi.number().integer().positive(),
  limit: Joi.number().integer().min(1).max(500),
}), 'query'), wrap(async (req, res) => {
  const data = await reminders.listReminders(req.valid.query, req.user);
  res.json({ data });
}));

router.post('/reminders/run', requireAuth(['admin']), validate(Joi.object({}), 'body'), wrap(async (_req, res) => {
  res.json(await reminders.runReminders({ force: true }));
}));

router.post('/reminders/:id/retry', requireAuth(['admin']), validate(idParam, 'params'), wrap(async (req, res) => {
  res.json(await reminders.retryReminder(Number(req.params.id)));
}));

// ---- Tickets (keluhan dari chatbot) ----
router.get('/tickets', requireAuth(['admin']), wrap(async (_req, res) => {
  const rows = (await query(
    `SELECT k.id, k.pesan, k.status, k.sumber, k.created_at, k.closed_at, b.kode_booking
     FROM complaint_tickets k LEFT JOIN bookings b ON b.id=k.booking_id ORDER BY (k.status='open') DESC, k.created_at DESC LIMIT 100`)).rows;
  res.json({ data: rows });
}));
router.patch('/tickets/:id', requireAuth(['admin']), validate(idParam, 'params'),
  validate(Joi.object({ status: Joi.string().valid('open', 'closed').required().label('Status') })), wrap(async (req, res) => {
    const r = await query(
      `UPDATE complaint_tickets SET status=$2, closed_at = CASE WHEN $2='closed' THEN now() ELSE NULL END WHERE id=$1 RETURNING *`,
      [req.params.id, req.body.status]);
    if (!r.rows[0]) throw E.notFound('Tiket tidak ditemukan.');
    res.json(r.rows[0]);
  }));

// ---- AI (selalu lewat backend; API key/URL AI tidak pernah ke frontend) ----
const aiLimiter = rateLimit({
  windowMs: 60000, limit: Number(process.env.AI_RATE_LIMIT || 30), standardHeaders: true, legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMIT,
  handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Terlalu banyak pesan. Tunggu sebentar lalu coba lagi.' } }),
});
const msgSchema = Joi.object({
  text: Joi.string().trim().min(1).max(500).label('Pesan'),
  message: Joi.string().trim().min(1).max(500).label('Pesan'),
}).or('text', 'message');

router.post('/ai/predict-intent', requireAuth(), aiLimiter, validate(msgSchema), wrap(async (req, res) => {
  const out = await chat.predictIntent(req.body.text || req.body.message);
  res.json({ intent: out.intent, confidence: out.confidence, low_confidence: out.low_confidence, model_version: out.model_version });
}));

router.post('/ai/answer', requireAuth(), aiLimiter, validate(msgSchema), wrap(async (req, res) => {
  // Pass user ID to maintain conversation context
  const userId = req.user ? req.user.id : null;
  res.json(await chat.handleChat(req.body.text || req.body.message, userId));
}));

router.get('/ai/status', requireAuth(['admin']), validate(Joi.object({}), 'query'), wrap(async (_req, res) => {
  try {
    const h = await aiClient.health();
    res.json({ tersedia: true, ...h, ambang_confidence: config.aiConfidenceThreshold });
  } catch (e) {
    res.json({ tersedia: false, alasan: e.detail ? e.detail.reason : e.message, catatan: 'Alur booking/status tetap berjalan tanpa layanan AI.' });
  }
}));

router.get('/inference-logs', requireAuth(['admin']), validate(Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(100),
}), 'query'), wrap(async (req, res) => {
  const { limit } = req.valid.query;
  const rows = (await query(
    `SELECT id, intent, confidence::float, endpoint, rute, fallback, error, latency_ms, model_version, waktu, panjang_teks
     FROM inference_log ORDER BY id DESC LIMIT $1`, [limit])).rows;
  res.json({ data: rows });
}));

// ---- Analitik & prediksi ----
router.get('/analytics/summary', requireAuth(['admin']), validate(Joi.object({
  dari: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).label('Dari tanggal'),
  sampai: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).label('Sampai tanggal'),
}), 'query'), wrap(async (req, res) => {
  const out = await analytics.summary(req.valid.query);
  out.dasbor_ds_url = config.dataScienceDashboardUrl || null;
  res.json(out);
}));

router.get('/predictions/latest', requireAuth(['admin']), validate(Joi.object({}), 'query'), wrap(async (_req, res) => {
  const p = await analytics.latestPredictions();
  if (!p) throw E.notFound('Belum ada output prediksi. Jalankan pipeline Data Science (data-science/run_pipeline.py).');
  res.json(p);
}));

module.exports = router;
