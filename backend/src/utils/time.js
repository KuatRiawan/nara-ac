/** Utilitas waktu. Bisnis berada di WIB (UTC+7, tanpa DST). */
const WIB_OFFSET_MIN = 7 * 60;
const DAY_MS = 86400000;

/** Date → {y,m,d,h,min,dow} dalam WIB (dow: 0=Minggu..6=Sabtu) */
function wibParts(date) {
  const d = new Date(date.getTime() + WIB_OFFSET_MIN * 60000);
  return {
    y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(),
    h: d.getUTCHours(), min: d.getUTCMinutes(), dow: d.getUTCDay(),
  };
}

/** Komponen WIB → Date (instan UTC yang benar) */
function fromWib(y, m, d, h = 0, min = 0) {
  return new Date(Date.UTC(y, m - 1, d, h, min) - WIB_OFFSET_MIN * 60000);
}

const pad = (n) => String(n).padStart(2, '0');

function wibDateString(date) {
  const p = wibParts(date);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** 'YYYY-MM-DD' → Date awal hari WIB */
function startOfWibDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return fromWib(y, m, d, 0, 0);
}

function addDaysWibString(dateStr, n) {
  return wibDateString(new Date(startOfWibDay(dateStr).getTime() + n * DAY_MS + 12 * 3600000));
}

/** Parse input tanggal-waktu. Tanpa zona waktu dianggap WIB. Mengembalikan Date atau null. */
function parseDateTimeInput(s) {
  if (typeof s !== 'string') return null;
  const str = s.trim().replace(' ', 'T');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/.test(str)) return null;
  const hasTz = /(Z|[+-]\d{2}:?\d{2})$/.test(str);
  const dt = new Date(hasTz ? str : `${str}+07:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

const toMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

function formatWib(date) {
  const p = wibParts(date);
  return `${pad(p.d)}/${pad(p.m)}/${p.y} ${pad(p.h)}:${pad(p.min)} WIB`;
}

module.exports = {
  wibParts, fromWib, wibDateString, startOfWibDay, addDaysWibString,
  parseDateTimeInput, toMinutes, formatWib, DAY_MS,
};
