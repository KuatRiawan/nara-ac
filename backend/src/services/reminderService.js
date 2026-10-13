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

const defaultChannels = {
  in_app: async () => { /* tersimpan di DB dan tampil di aplikasi */ },
  telegram: telegramSend,
};
let channels = { ...defaultChannels };
/** Untuk pengujian: ganti implementasi kanal. */
function setChannels(overrides) { channels = { ...defaultChannels, ...overrides }; }
function resetChannels() { channels = { ...defaultChannels }; }

function buildMessage(b, target) {
  const when = formatWib(new Date(b.jadwal_mulai));
  if (target === 'pelanggan') {
    return `Pengingat servis: layanan "${b.nama_layanan}" dijadwalkan besok, ${when}. Kode booking ${b.kode_booking}. Mohon pastikan ada orang di lokasi.`;
  }
  return `Pengingat tugas: ${b.nama_layanan} besok ${when}, kode ${b.kode_booking}, lokasi: ${b.alamat}.`;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 5000, 15000]; // Exponential backoff: 1s, 5s, 15s

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function dispatch(row) {
  let channel = 'in_app';
  let recipientChat = null;
  if (row.target === 'teknisi' && config.telegramBotToken && row.telegram_chat_id) {
    channel = 'telegram';
    recipientChat = row.telegram_chat_id;
  }
  const attempts = row.percobaan + 1;
  
  // Implement exponential backoff retry (BE-022)
  if (attempts > 1 && attempts <= MAX_RETRY_ATTEMPTS) {
    const delayMs = RETRY_DELAYS_MS[attempts - 2]; // 0-indexed: first retry (attempt 2) -> delay 1s
    await sleep(delayMs);
  }
  
  try {
    await channels[channel](recipientChat, row.pesan);
    await query(
      `UPDATE reminder_log SET kanal=$2, status='sent', percobaan=$3, error=NULL, waktu_kirim=now() WHERE id=$1`,
      [row.id, channel, attempts],
    );
    return 'sent';
  } catch (e) {
    await query(
      `UPDATE reminder_log SET kanal=$2, status='failed', percobaan=$3, error=$4 WHERE id=$1`,
      [row.id, channel, attempts, String(e.message || e).slice(0, 300)],
    );
    // Only mark as failed if we've exhausted all retries
    if (attempts >= MAX_RETRY_ATTEMPTS) {
      return 'failed';
    }
    // Otherwise, it will be retried by the scheduler
    return 'pending';
  }
}

const PENDING_SELECT = `
  SELECT r.*, t.telegram_chat_id FROM reminder_log r
  JOIN bookings b ON b.id = r.booking_id
  LEFT JOIN technicians t ON t.id = b.teknisi_id`;

/**
 * Job H-1: membuat baris reminder untuk booking `scheduled` besok (WIB) lalu mengirim yang pending.
 * Tanpa `force`, hanya berjalan setelah jam pengingat (settings.reminder_hour, default 08:00 WIB).
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
       
      const r = await query(
        `INSERT INTO reminder_log (booking_id, target, penerima, kanal, untuk_tanggal, pesan)
         VALUES ($1,$2,$3,'in_app',$4,$5) ON CONFLICT (booking_id,target,untuk_tanggal) DO NOTHING`,
        [b.id, target, penerima, tomorrow, buildMessage(b, target)],
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

module.exports = { runReminders, retryReminder, listReminders, startScheduler, stopScheduler, setChannels, resetChannels };
