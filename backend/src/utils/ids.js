const crypto = require('crypto');


function generateBookingCode(date = new Date(), attempt = 0) {
  // WIB is UTC+7
  const d = new Date(date.getTime() + 7 * 3600000);
  const pad = (n) => String(n).padStart(2, '0');
  const hh = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const dd = pad(d.getUTCDate());
  const mo = pad(d.getUTCMonth() + 1);
  const yyyy = d.getUTCFullYear();
  // 16 bytes = 128 bits of cryptographically secure pseudo-randomness
  const rand = crypto.randomBytes(16).toString('hex').toUpperCase();
  const base = `NARA-AC${hh}${mm}${dd}${mo}${yyyy}-${rand}`;
  if (attempt === 0) return base;
  const extraRand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${base}-${extraRand}`;
}

const BOOKING_CODE_RE = /\b(NARA-AC[A-Za-z0-9-]+|AC-[A-HJKMNP-Z2-9]{4}|BK-[A-Za-z0-9-]+)\b/i;

/** Normalisasi nomor HP Indonesia ke format 08xxxxxxxxx. Null jika tidak valid. */
function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  let s = raw.replace(/[\s().-]/g, '');
  if (s.startsWith('+62')) s = `0${s.slice(3)}`;
  else if (s.startsWith('62')) s = `0${s.slice(2)}`;
  if (!/^08[1-9]\d{7,10}$/.test(s)) return null;
  return s;
}

const maskPhone = (p) => (p ? `${p.slice(0, 4)}****${p.slice(-2)}` : '');

function maskCustomerName(name) {
  if (!name || typeof name !== 'string') return 'Pelanggan NARA AC';
  const parts = name.trim().split(/\s+/);
  return parts.map((part) => {
    if (part.length <= 2) return `${part[0]}*`;
    return `${part[0]}${'*'.repeat(Math.min(part.length - 2, 4))}${part.slice(-1)}`;
  }).join(' ');
}

/** Generate secure single-use feedback token */
function generateFeedbackToken() {
  return crypto.randomBytes(24).toString('hex');
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** Generate idempotency key for duplicate request prevention */
function generateIdempotencyKey() {
  return crypto.randomBytes(16).toString('hex');
}

/** Generate idempotency key from provided key or generate new one */
function getIdempotencyKey(providedKey) {
  if (providedKey && typeof providedKey === 'string' && providedKey.length > 0) {
    return providedKey;
  }
  return generateIdempotencyKey();
}

module.exports = {
  generateBookingCode,
  BOOKING_CODE_RE,
  normalizePhone,
  maskPhone,
  maskCustomerName,
  generateFeedbackToken,
  sha256,
  generateIdempotencyKey,
  getIdempotencyKey,
};
