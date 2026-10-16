const express = require('express');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const chatService = require('../services/chatService');
const reminderService = require('../services/reminderService');
const { query } = require('../db/pool');
const config = require('../config');

const router = express.Router();

// GET /api/v1/whatsapp/webhook - Webhook Verification Challenge (BR-44)
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = config.whatsappVerifyToken || 'nara_ac_webhook_token';

  if (mode === 'subscribe' && token === expectedToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// POST /api/v1/whatsapp/webhook & POST /api/v1/whatsapp/message - Terima Pesan Masuk WhatsApp CS (BR-44, BR-45, BR-46)
const messageSchema = Joi.object({
  sender: Joi.string().trim().required().label('Nomor Pengirim / WhatsApp'),
  message: Joi.string().trim().min(1).max(1000).required().label('Isi Pesan'),
});

const handleIncoming = async (req, res) => {
  const { sender, message } = req.body;
  const result = await chatService.handleWhatsAppMessage({ sender, message });
  res.json({
    success: true,
    data: result,
  });
};

router.post('/webhook', validate(messageSchema), wrap(handleIncoming));
router.post('/message', validate(messageSchema), wrap(handleIncoming));

// POST /api/v1/whatsapp/check-availability - Pemeriksaan Jadwal Slot Nyata (BR-45)
router.post('/check-availability', validate(Joi.object({
  tanggal: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().label('Tanggal Servis (YYYY-MM-DD)'),
  pesan: Joi.string().trim().optional().label('Pesan Pelanggan'),
  layanan_id: Joi.number().integer().positive().optional().label('ID Layanan'),
})), wrap(async (req, res) => {
  const { tanggal, pesan, layanan_id: layananId } = req.body;
  const result = await chatService.handleAvailabilityCheck(pesan || tanggal || '', {
    entities: { date: tanggal, service_id: layananId },
  });
  res.json({
    success: true,
    data: result,
  });
}));

// POST /api/v1/whatsapp/handoff - Eskalasi ke Admin Manusia (BR-46)
router.post('/handoff', validate(Joi.object({
  sender: Joi.string().trim().required().label('Nomor WhatsApp'),
  pesan: Joi.string().trim().min(1).max(1000).required().label('Keluhan / Pesan'),
})), wrap(async (req, res) => {
  const { sender, pesan } = req.body;
  const result = await chatService.handleHandoffRequest(pesan, { sender, userId: sender });
  res.json({
    success: true,
    data: result,
  });
}));

// POST /api/v1/whatsapp/dispatch-reminders - Kirim Pengingat WhatsApp H-1 & Perawatan Berkala (BR-47)
router.post('/dispatch-reminders', requireAuth(['admin']), validate(Joi.object({
  days: Joi.number().integer().min(1).max(90).default(7),
  force: Joi.boolean().default(true),
})), wrap(async (req, res) => {
  const { days, force } = req.body;
  const hMinus1Result = await reminderService.runReminders({ force });
  const maintenanceResult = await reminderService.runMaintenanceReminders({ days, force });

  res.json({
    success: true,
    message: 'Semua pengingat WhatsApp berhasil diproses (BR-47).',
    data: {
      pengingat_h_minus_1: hMinus1Result,
      pengingat_perawatan_berkala: maintenanceResult,
    },
  });
}));

// GET /api/v1/whatsapp/conversations - Riwayat Percakapan WhatsApp AI & Eskalasi Admin (BR-44, BR-46)
router.get('/conversations', requireAuth(['admin']), validate(Joi.object({
  sender: Joi.string().trim().optional(),
  is_handoff: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(200).default(50),
}), 'query'), wrap(async (req, res) => {
  const { sender, is_handoff: isHandoff, limit } = req.valid.query;
  const where = [];
  const params = [];

  if (sender) {
    params.push(sender);
    where.push(`sender = $${params.length}`);
  }
  if (isHandoff !== undefined) {
    params.push(isHandoff);
    where.push(`is_handoff = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(limit);
  const sql = `
    SELECT id, sender, role, message, intent, is_handoff, handoff_ticket_id, created_at
    FROM whatsapp_conversations
    ${whereClause}
    ORDER BY created_at DESC, id DESC
    LIMIT $${params.length}
  `;

  const rows = (await query(sql, params)).rows;
  res.json({
    success: true,
    data: rows,
  });
}));

// GET /api/v1/whatsapp/config - Konfigurasi AI WhatsApp CS
router.get('/config', wrap(async (_req, res) => {
  const row = (await query("SELECT value FROM settings WHERE setting_key='ai_whatsapp_config'")).rows[0];
  res.json({
    success: true,
    data: row ? row.value : null,
  });
}));

// GET /api/v1/whatsapp/gateway-config - Ambil Konfigurasi Gateway WhatsApp (Admin)
router.get('/gateway-config', requireAuth(['admin']), wrap(async (_req, res) => {
  const row = (await query("SELECT value FROM settings WHERE setting_key='whatsapp_gateway_config'")).rows[0];
  const aiRow = (await query("SELECT value FROM settings WHERE setting_key='ai_whatsapp_config'")).rows[0];
  
  const defaultConfig = {
    provider: 'fonnte',
    api_url: 'https://api.fonnte.com/send',
    api_token: '',
    sender_number: '081385293137',
    admin_whatsapp: aiRow?.value?.admin_whatsapp || '081385293137',
    enabled: true,
    auto_reminder_h1: true,
    auto_invoice: true,
    ai_bot_enabled: aiRow?.value?.enabled !== false,
  };

  const current = row ? { ...defaultConfig, ...row.value } : defaultConfig;
  // Normalize old fonnte url if saved with /send_message
  if (current.api_url && current.api_url.includes('fonnte.com/send_message')) {
    current.api_url = 'https://api.fonnte.com/send';
  }

  res.json({
    success: true,
    data: current,
  });
}));

// PUT /api/v1/whatsapp/gateway-config - Simpan Konfigurasi Gateway WhatsApp (Admin)
router.put('/gateway-config', requireAuth(['admin']), validate(Joi.object({
  provider: Joi.string().valid('fonnte', 'wablas', 'twilio', 'custom').default('fonnte'),
  api_url: Joi.string().uri().allow('', null).optional(),
  api_token: Joi.string().allow('', null).optional(),
  sender_number: Joi.string().trim().allow('', null).optional(),
  admin_whatsapp: Joi.string().trim().required().label('Nomor WhatsApp Admin'),
  enabled: Joi.boolean().default(true),
  auto_reminder_h1: Joi.boolean().default(true),
  auto_invoice: Joi.boolean().default(true),
  ai_bot_enabled: Joi.boolean().default(true),
})), wrap(async (req, res) => {
  const val = req.body;
  // Normalize Fonnte endpoint
  if (val.provider === 'fonnte' && (!val.api_url || val.api_url.includes('/send_message'))) {
    val.api_url = 'https://api.fonnte.com/send';
  }

  await query(`
    INSERT INTO settings (setting_key, value)
    VALUES ('whatsapp_gateway_config', $1)
    ON DUPLICATE KEY UPDATE value = $1
  `, [JSON.stringify(val)]);

  // Sync admin_whatsapp and ai_bot_enabled to ai_whatsapp_config
  const aiRow = (await query("SELECT value FROM settings WHERE setting_key='ai_whatsapp_config'")).rows[0];
  const aiVal = aiRow?.value || {};
  aiVal.admin_whatsapp = val.admin_whatsapp;
  aiVal.enabled = val.ai_bot_enabled;
  await query(`
    INSERT INTO settings (setting_key, value)
    VALUES ('ai_whatsapp_config', $1)
    ON DUPLICATE KEY UPDATE value = $1
  `, [JSON.stringify(aiVal)]);

  res.json({
    success: true,
    message: 'Konfigurasi Gateway WhatsApp berhasil disimpan.',
    data: val,
  });
}));

// POST /api/v1/whatsapp/test-connection - Uji Coba Kirim Pesan / Verifikasi API (Admin)
router.post('/test-connection', requireAuth(['admin']), validate(Joi.object({
  phone: Joi.string().trim().required().label('Nomor WhatsApp Penerima'),
  message: Joi.string().trim().min(1).max(500).required().label('Pesan Tes'),
  provider: Joi.string().valid('fonnte', 'wablas', 'twilio', 'custom').optional(),
  api_url: Joi.string().uri().allow('', null).optional(),
  api_token: Joi.string().allow('', null).optional(),
})), wrap(async (req, res) => {
  const { phone, message, provider, api_url, api_token } = req.body;
  const row = (await query("SELECT value FROM settings WHERE setting_key='whatsapp_gateway_config'")).rows[0];
  const cfg = row?.value || {};

  const effectiveToken = (api_token && api_token.trim()) || cfg.api_token;
  const effectiveProvider = provider || cfg.provider || 'fonnte';
  let apiUrl = api_url || cfg.api_url;

  if (!effectiveToken) {
    return res.status(400).json({
      error: {
        code: 'MISSING_API_TOKEN',
        message: 'Token API WhatsApp belum diatur. Silakan masukkan API Token di kolom formulir terlebih dahulu.'
      }
    });
  }

  if (effectiveProvider === 'fonnte') {
    if (!apiUrl || apiUrl.includes('/send_message')) {
      apiUrl = 'https://api.fonnte.com/send';
    }
  } else if (!apiUrl) {
    apiUrl = 'https://api.fonnte.com/send';
  }

  let headers = {};
  let payload = {};

  if (effectiveProvider === 'fonnte' || apiUrl.includes('fonnte.com')) {
    headers = {
      'Authorization': effectiveToken,
      'Content-Type': 'application/json',
    };
    payload = {
      target: phone,
      message: message,
    };
  } else if (effectiveProvider === 'wablas' || apiUrl.includes('wablas.com')) {
    headers = {
      'Authorization': effectiveToken,
      'Content-Type': 'application/json',
    };
    payload = {
      phone: phone,
      message: message,
    };
  } else {
    headers = {
      'Authorization': `Bearer ${effectiveToken}`,
      'Content-Type': 'application/json',
    };
    payload = {
      phone: phone,
      message: message,
    };
  }

  try {
    const apiRes = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const resText = await apiRes.text();
    let resJson;
    try { resJson = JSON.parse(resText); } catch { resJson = resText; }

    if (!apiRes.ok || (typeof resJson === 'object' && resJson.status === false)) {
      const reason = typeof resJson === 'object' && (resJson.reason || resJson.detail || resJson.message)
        ? (resJson.reason || resJson.detail || resJson.message)
        : resText.slice(0, 150);
      return res.status(400).json({
        error: {
          code: 'GATEWAY_ERROR',
          message: `Gateway merespons HTTP ${apiRes.status}: ${reason}`
        }
      });
    }

    // Auto-save the token and config if provided in test request so user doesn't lose it
    if (api_token) {
      const updatedConfig = {
        ...cfg,
        provider: effectiveProvider,
        api_url: apiUrl,
        api_token: effectiveToken,
        enabled: true,
      };
      await query(`
        INSERT INTO settings (setting_key, value)
        VALUES ('whatsapp_gateway_config', $1)
        ON DUPLICATE KEY UPDATE value = $1
      `, [JSON.stringify(updatedConfig)]);
    }

    return res.json({
      success: true,
      message: `Pesan uji coba WhatsApp berhasil terkirim ke ${phone}! Koneksi API aktif.`,
      details: resJson,
    });
  } catch (err) {
    return res.status(500).json({
      error: {
        code: 'GATEWAY_CONNECTION_FAILED',
        message: `Gagal menghubungi endpoint WhatsApp API (${apiUrl}): ${err.message}`
      }
    });
  }
}));

module.exports = router;
