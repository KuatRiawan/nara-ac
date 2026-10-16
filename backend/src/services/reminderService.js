const { query } = require('../db/pool');
const config = require('../config');
const { E } = require('../errors');
const { getOps } = require('./bookingService');
const {
  wibParts, wibDateString, addDaysWibString, startOfWibDay, formatWib, DAY_MS,
} = require('../utils/time');

/**
 * Kanal pengiriman. 'in_app' = pencatatan notifikasi in-app (tampil di aplikasi: halaman status pelanggan,
 * halaman pekerjaan teknisi, dan dasbor admin). Hanya 'in_app' yang selalu tersedia.
 * 'telegram' aktif HANYA jika TELEGRAM_BOT_TOKEN terpasang dan penerima punya chat id.
 */
async function telegramSend(chatId, text) {
  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }), signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Telegram API HTTP ${res.status}`);
  } finally { clearTimeout(timer); }
}

/**
 * Pengiriman pesan WhatsApp resmi CV. Nara Teknindotama (BR-18, BR-47).
 */
async function whatsappSend(phone, text) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 8) {
    throw new Error('Nomor WhatsApp pelanggan tidak valid atau kosong.');
  }

  let apiUrl = config.whatsappApiUrl;
  let apiToken = config.whatsappApiToken;
  let provider = 'fonnte';

  // Periksa konfigurasi dinamis yang disimpan admin di dashboard
  try {
    const row = (await query("SELECT value FROM settings WHERE setting_key='whatsapp_gateway_config'")).rows[0];
    if (row && row.value && row.value.enabled && row.value.api_token) {
      apiUrl = row.value.api_url;
      apiToken = row.value.api_token;
      provider = row.value.provider || 'fonnte';
    }
  } catch (_e) {
    // Abaikan jika DB query gagal, gunakan config fallback
  }

  // Jika integrasi gateway WhatsApp aktif (Fonnte, Wablas, Twilio, atau custom webhook)
  if (apiUrl && apiToken) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      if (provider === 'fonnte' || apiUrl.includes('fonnte.com')) {
        const targetUrl = apiUrl.includes('/send_message') ? 'https://api.fonnte.com/send' : (apiUrl || 'https://api.fonnte.com/send');
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiToken,
          },
          body: JSON.stringify({ target: cleanPhone, message: text }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`WhatsApp Gateway Error HTTP ${res.status}`);
      } else if (provider === 'wablas' || apiUrl.includes('wablas.com')) {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiToken,
          },
          body: JSON.stringify({ phone: cleanPhone, message: text }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`WhatsApp Gateway Error HTTP ${res.status}`);
      } else {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
          },
          body: JSON.stringify({ to: cleanPhone, message: text }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`WhatsApp Gateway Error HTTP ${res.status}`);
      }
    } finally {
      clearTimeout(timer);
    }
  } else {
    throw E.unavailable('Gateway WhatsApp belum dikonfigurasi. Pesan belum dikirim.');
  }
}

const defaultChannels = {
  in_app: async () => { /* tersimpan di DB dan tampil di aplikasi */ },
  telegram: telegramSend,
  whatsapp: whatsappSend, // BR-47: Kanal utama untuk pelanggan
};
let channels = { ...defaultChannels };
/** Untuk pengujian: ganti implementasi kanal. */
function setChannels(overrides) { channels = { ...defaultChannels, ...overrides }; }
function resetChannels() { channels = { ...defaultChannels }; }

function buildMessage(b, target, tipe = 'jadwal_h_minus_1') {
  const when = formatWib(new Date(b.jadwal_mulai));
  if (target === 'pelanggan') {
    if (tipe === 'perawatan_berkala') {
      return `Halo Bpk/Ibu, ini pengingat perawatan berkala dari CV. NARA TEKNINDOTAMA. Unit AC Anda (${b.brand || 'AC'} ${b.model || ''}) sudah mendekati jadwal cuci/servis berkala. Jadwalkan servis Anda melalui website kami atau balas pesan ini untuk booking otomatis.`;
    }
    return `Halo Bpk/Ibu, ini pengingat resmi dari CV. NARA TEKNINDOTAMA: Layanan "${b.nama_layanan}" dijadwalkan besok, ${when}. Kode tiket: ${b.kode_booking}. Teknisi bertugas: ${b.teknisi_nama || 'Tim Teknisi NARA AC'}. Mohon pastikan ada orang di lokasi pengerjaan.`;
  }
  return `Pengingat tugas teknisi: ${b.nama_layanan} besok ${when}, kode ${b.kode_booking}, lokasi: ${b.alamat}.`;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 5000, 15000]; // Exponential backoff: 1s, 5s, 15s

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function dispatch(row) {
  // BR-47: Pelanggan wajib menerima pengingat melalui WhatsApp
  let channel = 'in_app';
  let recipient = row.penerima;
  if (row.target === 'pelanggan') {
    channel = 'whatsapp';
  } else if (row.target === 'teknisi' && config.telegramBotToken && row.telegram_chat_id) {
    channel = 'telegram';
    recipient = row.telegram_chat_id;
  }
  const attempts = row.percobaan + 1;
  
  // Implement exponential backoff retry (BE-022, BR-43, BR-47)
  if (attempts > 1 && attempts <= MAX_RETRY_ATTEMPTS) {
    const delayMs = RETRY_DELAYS_MS[attempts - 2];
    await sleep(delayMs);
  }
  
  try {
    const fn = channels[channel] || channels.in_app;
    await fn(recipient, row.pesan);
    await query(
      `UPDATE reminder_log SET kanal=$2, status='sent', percobaan=$3, error=NULL, waktu_kirim=now() WHERE id=$1`,
      [row.id, channel, attempts],
    );
    return 'sent';
  } catch (e) {
    const errMsg = String(e.message || e).slice(0, 300);
    await query(
      `UPDATE reminder_log SET kanal=$2, status='failed', percobaan=$3, error=$4 WHERE id=$1`,
      [row.id, channel, attempts, errMsg],
    );
    // Only mark as permanently failed if we've exhausted all retries
    if (attempts >= MAX_RETRY_ATTEMPTS) {
      return 'failed';
    }
    return 'pending';
  }
}

const PENDING_SELECT = `
  SELECT r.*, t.telegram_chat_id FROM reminder_log r
  JOIN bookings b ON b.id = r.booking_id
  LEFT JOIN technicians t ON t.id = b.teknisi_id`;

/**
 * Job H-1: membuat baris reminder untuk booking `scheduled` besok (WIB) lalu mengirim yang pending via WhatsApp (BR-47).
 */
async function runReminders({ force = false, now = new Date() } = {}) {
  const ops = await getOps();
  const p = wibParts(now);
  if (!force && p.h < ops.reminder_hour) {
    return { dilewati: true, alasan: `Belum jam pengingat (${ops.reminder_hour}:00 WIB).`, dibuat: 0, terkirim: 0, gagal: 0 };
  }
  const today = wibDateString(now);
  const tomorrow = addDaysWibString(today, 1);
  const from = startOfWibDay(tomorrow);
  const to = new Date(from.getTime() + DAY_MS);
  const bookings = (await query(
    `SELECT b.*, s.nama_layanan, t.nama AS teknisi_nama FROM bookings b
     JOIN service_catalog s ON s.id=b.layanan_id LEFT JOIN technicians t ON t.id=b.teknisi_id
     WHERE b.status='scheduled' AND b.jadwal_mulai >= $1 AND b.jadwal_mulai < $2`, [from, to],
  )).rows;
  let created = 0;
  for (const b of bookings) {
    const targets = [['pelanggan', b.kontak]];
    if (b.teknisi_id) targets.push(['teknisi', b.teknisi_nama]);
    for (const [target, penerima] of targets) {
      const kanal = target === 'pelanggan' ? 'whatsapp' : (target === 'teknisi' && config.telegramBotToken ? 'telegram' : 'in_app');
      const r = await query(
        `INSERT INTO reminder_log (booking_id, target, penerima, kanal, untuk_tanggal, pesan, tipe_reminder)
         VALUES ($1,$2,$3,$4,$5,$6,'jadwal_h_minus_1') ON DUPLICATE KEY UPDATE booking_id=booking_id`,
        [b.id, target, penerima, kanal, tomorrow, buildMessage(b, target, 'jadwal_h_minus_1')],
      );
      created += r.rowCount;
    }
  }
  const pend = (await query(`${PENDING_SELECT} WHERE r.status='pending' AND r.untuk_tanggal=$1`, [tomorrow])).rows;
  let sent = 0; let failed = 0;
  for (const row of pend) {
    const st = await dispatch(row);
    if (st === 'sent') sent += 1; else failed += 1;
  }
  return { dilewati: false, untuk_tanggal: tomorrow, booking_dipindai: bookings.length, dibuat: created, terkirim: sent, gagal: failed };
}

/**
 * Mengirim pengingat perawatan berkala AC unit via WhatsApp (BR-16, BR-18, BR-47).
 */
async function runMaintenanceReminders({ days = 7, force = false } = {}) {
  const dashboard = require('./dashboardService');
  const dueUnits = await dashboard.maintenanceDue({ days, limit: 100 });
  let created = 0;
  let sent = 0;
  let failed = 0;

  for (const u of dueUnits) {
    if (!u.kontak) continue;
    // Cari booking terakhir untuk unit ini
    const lastB = (await query('SELECT id FROM bookings WHERE ac_unit_id=$1 ORDER BY jadwal_mulai DESC LIMIT 1', [u.id])).rows[0];
    if (!lastB) continue;

    const todayStr = wibDateString(new Date());
    const pesan = `Halo Bpk/Ibu ${u.customer || ''}, unit AC Anda (${u.brand || 'AC'} ${u.model || ''} di ${u.lokasi || 'lokasi'}) sudah memasuki masa perawatan berkala dari servis terakhir. Hubungi kami untuk jadwal servis agar performa AC tetap dingin dan higienis.`;

    const r = await query(
      `INSERT INTO reminder_log (booking_id, unit_ac_id, target, penerima, kanal, untuk_tanggal, pesan, tipe_reminder)
       VALUES ($1, $2, 'pelanggan', $3, 'whatsapp', $4, $5, 'perawatan_berkala')
       ON DUPLICATE KEY UPDATE booking_id=booking_id
       RETURNING id`,
      [lastB.id, u.id, u.kontak, todayStr, pesan]
    );

    if (r.rows[0]) {
      created++;
      const row = (await query(`${PENDING_SELECT} WHERE r.id=$1`, [r.rows[0].id])).rows[0];
      const res = await dispatch(row);
      if (res === 'sent') sent++; else failed++;
    }
  }

  return { units_checked: dueUnits.length, dibuat: created, terkirim: sent, gagal: failed };
}

async function retryReminder(id) {
  const row = (await query(`${PENDING_SELECT} WHERE r.id=$1`, [id])).rows[0];
  if (!row) throw E.notFound('Pengingat tidak ditemukan.');
  if (row.status !== 'failed') throw E.business('Hanya pengingat berstatus "failed" yang dapat dikirim ulang.');
  const status = await dispatch(row);
  const out = (await query('SELECT * FROM reminder_log WHERE id=$1', [id])).rows[0];
  return { ...out, hasil: status };
}

async function listReminders({ tanggal, status, target, booking_id: bookingId, limit = 100 }, user) {
  const where = []; const params = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
  if (tanggal) {
    const d = tanggal === 'H-1' ? addDaysWibString(wibDateString(new Date()), 1) : tanggal;
    add('r.untuk_tanggal = ?', d);
  }
  if (status) add('r.status = ?', status);
  if (target) add('r.target = ?', target);
  if (bookingId) add('r.booking_id = ?', bookingId);
  if (user.role === 'technician') {
    add('b.teknisi_id = ?', user.technicianId);
    where.push("r.target = 'teknisi'");
  }
  const rows = (await query(
    `SELECT r.id, r.booking_id, b.kode_booking, r.target, r.penerima, r.kanal, r.untuk_tanggal, r.pesan, r.status,
            r.percobaan, r.error, r.waktu_kirim, r.created_at, b.jadwal_mulai
     FROM reminder_log r JOIN bookings b ON b.id=r.booking_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY r.created_at DESC, r.id DESC LIMIT ${Math.min(limit, 500)}`, params,
  )).rows;
  // Privasi: nomor pelanggan dimasking pada daftar
  return rows.map((r) => ({
    ...r,
    penerima: r.target === 'pelanggan' ? `${r.penerima.slice(0, 4)}****${r.penerima.slice(-2)}` : r.penerima,
  }));
}

let timer = null;
function startScheduler() {
  if (!config.schedulerEnabled || timer) return;
   
  const cron = require('node-cron');
  timer = cron.schedule('*/15 * * * *', async () => {
    try {
      const r = await runReminders();
      if (!r.dilewati && (r.dibuat || r.terkirim || r.gagal) && process.env.NODE_ENV !== 'production') console.log('[reminder]', JSON.stringify(r));
    } catch (e) { if (process.env.NODE_ENV !== 'production') console.error('[reminder] job gagal:', e.message); }
  });
  if (process.env.NODE_ENV !== 'production') console.log('[reminder] scheduler aktif (tiap 15 menit; kirim H-1 setelah jam pengingat)');
}
function stopScheduler() { if (timer) { timer.stop(); timer = null; } }

module.exports = { runReminders, runMaintenanceReminders, retryReminder, listReminders, startScheduler, stopScheduler, setChannels, resetChannels, whatsappSend };
