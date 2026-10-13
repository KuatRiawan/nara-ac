const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // tanpa 0/O/1/I/L

function generateBookingCode() {
  const bytes = crypto.randomBytes(4);
  let s = '';
  for (let i = 0; i < 4; i += 1) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `AC-${s}`;
}

const BOOKING_CODE_RE = /\bAC-[A-HJKMNP-Z2-9]{4}\b/i;

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

module.exports = { generateBookingCode, BOOKING_CODE_RE, normalizePhone, maskPhone, sha256, generateIdempotencyKey, getIdempotencyKey };
