const express = require('express');
const bcrypt = require('bcryptjs');
const { query, withTx, sanitizeLimitOffset } = require('../db/pool');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const { E } = require('../errors');
const { normalizePhone } = require('../utils/ids');
const { audit, notify } = require('../services/common');
const wf = require('../services/workflowService');

const dash = require('../services/dashboardService');
const { wibDateString, startOfWibDay, parseDateTimeInput, DAY_MS } = require('../utils/time');

const router = express.Router();
router.use(requireAuth(['admin']));

const idParam = Joi.object({ id: Joi.number().integer().positive().required().label('ID') });
const dateStr = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);
const pageQ = { page: Joi.number().integer().min(1), limit: Joi.number().integer().min(1).max(100) };
const STATUSES = ['scheduled', 'on process', 'done', 'cancelled', 'rescheduled', 'delayed'];
const phoneField = Joi.string().trim().max(20).custom((v, h) => normalizePhone(v) || h.error('any.invalid'))
  .messages({ 'any.invalid': 'Kontak tidak valid. Gunakan nomor HP Indonesia, contoh 081234567890.' });

const paging = (q) => {
  const page = q.page || 1;
  const limit = q.limit || 20;
  const { limit: safeLimit, offset: safeOffset } = sanitizeLimitOffset(limit, (page - 1) * limit);
  return { page, limit: safeLimit, offset: safeOffset };
};

// ---------- Dasbor ----------
router.get('/dashboard/summary', validate(Joi.object({ hari: Joi.number().valid(7, 30).default(30) }), 'query'), wrap(async (req, res) => {
  res.json(await dash.summary({ hari: req.valid.query.hari }));
}));

router.get('/dashboard/kpi', validate(Joi.object({}), 'query'), wrap(async (_req, res) => {
  const s = await dash.summary({ hari: 30 });
  res.json({
    data: {
      ...s.kpi,
      rata_rating: s.feedback.rata,
      stok_menipis: s.inventoryAlerts.length,
      aksi_perlu_ditangani: s.actionRequired.length,
    },
  });
}));

// ---------- Pelanggan ----------
router.get('/customers', validate(Joi.object({ q: Joi.string().trim().max(80).allow(''), aktif: Joi.boolean(), ...pageQ }), 'query'), wrap(async (req, res) => {
  const { q, aktif } = req.valid.query;
  const { page, limit, offset } = paging(req.valid.query);
  const params = []; const where = [];
  if (q) { params.push(`%${q}%`); where.push(`(c.nama ILIKE $${params.length} OR c.kontak ILIKE $${params.length} OR c.alamat ILIKE $${params.length})`); }
  if (aktif !== undefined) { params.push(aktif); where.push(`c.aktif = $${params.length}`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await query(`SELECT COUNT(*)::int n FROM customers c ${w}`, params)).rows[0].n;
  const rows = (await query(
    `SELECT c.id, c.nama, c.kontak, c.alamat, c.aktif, c.created_at,
       (SELECT COUNT(*)::int FROM bookings b WHERE b.customer_id=c.id) AS total_booking,
       (SELECT COUNT(*)::int FROM ac_units u WHERE u.customer_id=c.id AND u.aktif) AS total_unit,
       (SELECT MAX(b.jadwal_mulai) FROM bookings b WHERE b.customer_id=c.id) AS booking_terakhir,
       EXISTS (SELECT 1 FROM users u WHERE u.customer_id=c.id) AS punya_akun
     FROM customers c ${w} ORDER BY c.created_at DESC, c.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset])).rows;
  res.json({ data: rows, meta: { total, page, limit } });
}));

router.get('/customers/:id', validate(idParam, 'params'), wrap(async (req, res) => {
  const id = Number(req.params.id);
  const c = (await query('SELECT * FROM customers WHERE id=$1', [id])).rows[0];
  if (!c) throw E.notFound('Pelanggan tidak ditemukan.');
  const [units, history, upcoming, feedback, notifs] = await Promise.all([
    query('SELECT * FROM ac_units WHERE customer_id=$1 ORDER BY aktif DESC, created_at DESC', [id]),
    query(`SELECT b.id, b.kode_booking, b.jadwal_mulai, b.status, s.nama_layanan, t.nama AS teknisi, u.brand, u.lokasi AS lokasi_unit
           FROM bookings b JOIN service_catalog s ON s.id=b.layanan_id LEFT JOIN technicians t ON t.id=b.teknisi_id LEFT JOIN ac_units u ON u.id=b.ac_unit_id
           WHERE b.customer_id=$1 ORDER BY b.jadwal_mulai DESC LIMIT 50`, [id]),
    query(`SELECT b.id, b.kode_booking, b.jadwal_mulai, b.status, s.nama_layanan, t.nama AS teknisi FROM bookings b JOIN service_catalog s ON s.id=b.layanan_id
           LEFT JOIN technicians t ON t.id=b.teknisi_id WHERE b.customer_id=$1 AND b.status IN ('scheduled','rescheduled','delayed','on process') ORDER BY b.jadwal_mulai`, [id]),
    query(`SELECT f.rating, f.komentar, f.waktu, b.kode_booking FROM feedback f JOIN bookings b ON b.id=f.booking_id WHERE b.customer_id=$1 ORDER BY f.waktu DESC`, [id]),
    query("SELECT id, title, message, is_read, created_at FROM notifications WHERE target_role='customer' AND target_id=$1 ORDER BY created_at DESC LIMIT 20", [id]),
  ]);
  res.json({ ...c, ac_units: units.rows, history: history.rows, upcoming: upcoming.rows, feedback: feedback.rows, notifications: notifs.rows });
}));

router.post('/customers', validate(Joi.object({
  nama: Joi.string().trim().min(2).max(80).required().label('Nama'),
  kontak: phoneField.required().label('Kontak'),
  alamat: Joi.string().trim().allow('').max(500).label('Alamat'),
  catatan_umum: Joi.string().trim().allow('').max(300).label('Catatan'),
})), wrap(async (req, res) => {
  const out = await withTx(async (c) => {
    const kontak = normalizePhone(req.body.kontak);
    const dup = (await c.query('SELECT id FROM customers WHERE kontak=$1', [kontak])).rows[0];
    if (dup) throw E.conflict('Pelanggan dengan kontak ini sudah terdaftar.', { kontak: 'Kontak sudah digunakan.' });
    const r = (await c.query('INSERT INTO customers (nama,kontak,alamat,catatan_umum) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.body.nama, kontak, req.body.alamat || null, req.body.catatan_umum || null])).rows[0];
    await audit(c, req.user, 'customer_created', 'customer', r.id, { after: { nama: r.nama } });
    return r;
  });
  res.status(201).json(out);
}));

router.patch('/customers/:id', validate(idParam, 'params'), validate(Joi.object({
  nama: Joi.string().trim().min(2).max(80), kontak: phoneField,
  alamat: Joi.string().trim().allow('').max(500), catatan_umum: Joi.string().trim().allow('').max(300), aktif: Joi.boolean(),
}).min(1)), wrap(async (req, res) => {
  const id = Number(req.params.id);
  const out = await withTx(async (c) => {
    const before = (await c.query('SELECT * FROM customers WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (!before) throw E.notFound('Pelanggan tidak ditemukan.');
    const patch = { ...req.body };
    if (patch.kontak) patch.kontak = normalizePhone(patch.kontak);
    if (patch.aktif === false) {
      const n = (await c.query("SELECT COUNT(*)::int n FROM bookings WHERE customer_id=$1 AND status IN ('scheduled','rescheduled','delayed','on process')", [id])).rows[0].n;
      if (n) throw E.business(`Pelanggan masih memiliki ${n} booking aktif. Selesaikan/batalkan dulu sebelum menonaktifkan.`);
    }
    // Whitelist kolom yang boleh diupdate untuk mencegah SQL injection
    const allowedColumns = new Set(['nama', 'kontak', 'alamat', 'catatan_umum', 'aktif']);
    const keys = Object.keys(patch).filter(k => allowedColumns.has(k));
    if (keys.length === 0) throw E.validation('Tidak ada field yang valid untuk diupdate.', { field: 'Minimal satu field valid diperlukan.' });
    const sets = keys.map((k, i) => `${k}=$${i + 2}`).join(', ');
    try {
      const r = (await c.query(`UPDATE customers SET ${sets} WHERE id=$1 RETURNING *`, [id, ...keys.map((k) => patch[k])])).rows[0];
      if (patch.aktif !== undefined) await c.query('UPDATE users SET aktif=$2 WHERE customer_id=$1', [id, patch.aktif]);
      await audit(c, req.user, 'customer_updated', 'customer', id, { before: { nama: before.nama, kontak: before.kontak, aktif: before.aktif }, after: patch });
      return r;
    } catch (e) {
      if (e.code === '23505') throw E.conflict('Kontak sudah digunakan pelanggan lain.', { kontak: 'Kontak sudah digunakan.' });
      throw e;
    }
  });
  res.json(out);
}));

// ---------- Unit AC ----------
const unitFields = {
  brand: Joi.string().trim().min(1).max(60).label('Merk'),
  model: Joi.string().trim().max(60).allow(null, ''),
  tipe: Joi.string().trim().max(40).allow(null, ''),
  kapasitas_pk: Joi.number().min(0.25).max(20).allow(null),
  nomor_seri: Joi.string().trim().max(60).allow(null, ''),
  lokasi: Joi.string().trim().min(1).max(80).label('Lokasi'),
  tanggal_pasang: dateStr.allow(null, ''),
  catatan: Joi.string().trim().max(300).allow(null, ''),
  aktif: Joi.boolean(),
};

router.get('/ac-units', validate(Joi.object({ q: Joi.string().trim().max(80).allow(''), customer_id: Joi.number().integer().positive(), ...pageQ }), 'query'), wrap(async (req, res) => {
  const { q, customer_id: cid } = req.valid.query;
  const { page, limit, offset } = paging(req.valid.query);
  const params = []; const where = [];
  if (q) { params.push(`%${q}%`); where.push(`(a.brand ILIKE $${params.length} OR a.model ILIKE $${params.length} OR c.nama ILIKE $${params.length} OR a.lokasi ILIKE $${params.length} OR a.nomor_seri ILIKE $${params.length})`); }
  if (cid) { params.push(cid); where.push(`a.customer_id=$${params.length}`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await query(`SELECT COUNT(*)::int n FROM ac_units a JOIN customers c ON c.id=a.customer_id ${w}`, params)).rows[0].n;
  const rows = (await query(
    `SELECT a.*, c.nama AS nama_customer, c.kontak AS kontak_customer,
       ls.terakhir AS servis_terakhir, ls.layanan AS layanan_terakhir,
       CASE WHEN ls.interval_hari IS NOT NULL THEN ls.terakhir + ls.interval_hari * interval '1 day' END AS maintenance_berikutnya
     FROM ac_units a JOIN customers c ON c.id=a.customer_id
     LEFT JOIN LATERAL (SELECT b.jadwal_mulai AS terakhir, s.nama_layanan AS layanan, s.interval_maintenance_hari AS interval_hari
        FROM bookings b JOIN service_catalog s ON s.id=b.layanan_id WHERE b.ac_unit_id=a.id AND b.status='done' ORDER BY b.jadwal_mulai DESC LIMIT 1) ls ON TRUE
     ${w} ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset])).rows;
  res.json({ data: rows, meta: { total, page, limit } });
}));

router.get('/ac-units/:id', validate(idParam, 'params'), wrap(async (req, res) => {
  const u = (await query('SELECT a.*, c.nama AS nama_customer, c.kontak AS kontak_customer FROM ac_units a JOIN customers c ON c.id=a.customer_id WHERE a.id=$1', [req.params.id])).rows[0];
  if (!u) throw E.notFound('Unit AC tidak ditemukan.');
  u.history = (await query(
    `SELECT b.id, b.kode_booking, b.jadwal_mulai, b.status, s.nama_layanan, t.nama AS teknisi, w.diagnosis, w.rekomendasi
     FROM bookings b JOIN service_catalog s ON s.id=b.layanan_id LEFT JOIN technicians t ON t.id=b.teknisi_id LEFT JOIN work_orders w ON w.booking_id=b.id
     WHERE b.ac_unit_id=$1 ORDER BY b.jadwal_mulai DESC`, [u.id])).rows;
  res.json(u);
}));

router.post('/ac-units', validate(Joi.object({
  customer_id: Joi.number().integer().positive().required().label('Pelanggan'),
  ...unitFields, brand: unitFields.brand.required(), lokasi: unitFields.lokasi.required(),
})), wrap(async (req, res) => {
  const b = req.body;
  const out = await withTx(async (c) => {
    if (!(await c.query('SELECT 1 FROM customers WHERE id=$1', [b.customer_id])).rows.length) throw E.validation('Pelanggan tidak ditemukan.', { customer_id: 'Pelanggan tidak ditemukan.' });
    const r = (await c.query(
      `INSERT INTO ac_units (customer_id, brand, model, tipe, kapasitas_pk, nomor_seri, lokasi, tanggal_pasang, catatan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [b.customer_id, b.brand, b.model || null, b.tipe || null, b.kapasitas_pk ?? null, b.nomor_seri || null, b.lokasi, b.tanggal_pasang || null, b.catatan || null])).rows[0];
    await audit(c, req.user, 'ac_unit_created', 'ac_unit', r.id, { after: { brand: r.brand, lokasi: r.lokasi } });
    return r;
  });
  res.status(201).json(out);
}));

router.patch('/ac-units/:id', validate(idParam, 'params'), validate(Joi.object(unitFields).min(1)), wrap(async (req, res) => {
  // Whitelist kolom yang boleh diupdate untuk mencegah SQL injection
  const allowedColumns = new Set(['brand', 'model', 'tipe', 'kapasitas_pk', 'nomor_seri', 'lokasi', 'tanggal_pasang', 'catatan', 'aktif']);
  const keys = Object.keys(req.body).filter(k => allowedColumns.has(k));
  if (keys.length === 0) throw E.validation('Tidak ada field yang valid untuk diupdate.', { field: 'Minimal satu field valid diperlukan.' });
  const vals = keys.map((k) => (req.body[k] === '' ? null : req.body[k]));
  const r = await query(`UPDATE ac_units SET ${keys.map((k, i) => `${k}=$${i + 2}`).join(', ')}, updated_at=now() WHERE id=$1 RETURNING *`, [req.params.id, ...vals]);
  if (!r.rows[0]) throw E.notFound('Unit AC tidak ditemukan.');
  res.json(r.rows[0]);
}));

router.delete('/ac-units/:id', validate(idParam, 'params'), wrap(async (req, res) => {
  const r = await query('UPDATE ac_units SET aktif=false, updated_at=now() WHERE id=$1 RETURNING id', [req.params.id]);
  if (!r.rows[0]) throw E.notFound('Unit AC tidak ditemukan.');
  res.json({ success: true, message: 'Unit AC berhasil dinonaktifkan' });
}));

// ---------- Teknisi ----------
router.get('/technicians/:id', validate(idParam, 'params'), wrap(async (req, res) => {
  const id = Number(req.params.id);
  const t = (await query('SELECT id, nama, kontak, aktif, catatan, telegram_chat_id, created_at FROM technicians WHERE id=$1', [id])).rows[0];
  if (!t) throw E.notFound('Teknisi tidak ditemukan.');
  const today = wibDateString(new Date());
  const ds = startOfWibDay(today);
  const [perf, rating, cal, current, completed, delayed, avail, user] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='done')::int AS selesai, COUNT(*) FILTER (WHERE status='delayed')::int AS tertunda,
                  COUNT(*) FILTER (WHERE status='cancelled')::int AS batal,
                  ROUND(AVG(EXTRACT(EPOCH FROM (selesai_aktual - mulai_aktual))/60) FILTER (WHERE status='done' AND mulai_aktual IS NOT NULL AND selesai_aktual IS NOT NULL))::int AS rata_durasi_menit
           FROM bookings WHERE teknisi_id=$1`, [id]),
    query('SELECT COALESCE(ROUND(AVG(f.rating)::numeric,2),0)::float AS rata, COUNT(f.id)::int AS jumlah FROM feedback f JOIN bookings b ON b.id=f.booking_id WHERE b.teknisi_id=$1', [id]),
    query(`SELECT b.id, b.kode_booking, b.jadwal_mulai, b.jadwal_selesai, b.status, c.nama AS customer, s.nama_layanan FROM bookings b JOIN customers c ON c.id=b.customer_id JOIN service_catalog s ON s.id=b.layanan_id
           WHERE b.teknisi_id=$1 AND b.status<>'cancelled' AND b.jadwal_mulai>=$2 AND b.jadwal_mulai<$3 ORDER BY b.jadwal_mulai`, [id, ds, new Date(ds.getTime() + 14 * DAY_MS)]),
    query(`SELECT b.id, b.kode_booking, b.jadwal_mulai, b.status, c.nama AS customer FROM bookings b JOIN customers c ON c.id=b.customer_id WHERE b.teknisi_id=$1 AND b.status IN ('on process','delayed') ORDER BY b.jadwal_mulai`, [id]),
    query(`SELECT b.id, b.kode_booking, b.jadwal_mulai, c.nama AS customer, s.nama_layanan FROM bookings b JOIN customers c ON c.id=b.customer_id JOIN service_catalog s ON s.id=b.layanan_id WHERE b.teknisi_id=$1 AND b.status='done' ORDER BY b.jadwal_mulai DESC LIMIT 10`, [id]),
    query(`SELECT b.id, b.kode_booking, b.jadwal_mulai, b.alasan_tunda FROM bookings b WHERE b.teknisi_id=$1 AND b.status='delayed' ORDER BY b.jadwal_mulai DESC LIMIT 10`, [id]),
    query('SELECT tanggal::text AS tanggal, status, catatan FROM technician_availability WHERE teknisi_id=$1 AND tanggal>=$2 ORDER BY tanggal LIMIT 30', [id, today]),
    query('SELECT email, aktif FROM users WHERE technician_id=$1', [id]),
  ]);
  res.json({
    ...t, akun: user.rows[0] || null, performa: perf.rows[0], rating: rating.rows[0],
    kalender: cal.rows, pekerjaan_berjalan: current.rows, pekerjaan_selesai: completed.rows, pekerjaan_tertunda: delayed.rows,
    ketersediaan: avail.rows,
    // alias kompatibilitas
    performance: {
      ...perf.rows[0],
      total_jobs: perf.rows[0].total,
      completed_jobs: perf.rows[0].selesai,
      delayed_jobs: perf.rows[0].tertunda,
      cancelled_jobs: perf.rows[0].batal,
      average_duration_minutes: perf.rows[0].rata_durasi_menit,
      average_rating: rating.rows[0].rata,
    },
    today_jobs: cal.rows.filter((j) => wibDateString(new Date(j.jadwal_mulai)) === today),
    availability: avail.rows,
  });
}));

router.get('/technicians/:id/workload', validate(idParam, 'params'), wrap((req, res, next) => {
  req.url = `/technicians/${req.params.id}`; return router.handle(req, res, next);
}));

router.post('/technicians/:id/availability', validate(idParam, 'params'), validate(Joi.object({
  tanggal: dateStr.required().label('Tanggal'), status: Joi.string().valid('available', 'busy', 'off').required().label('Status'),
  catatan: Joi.string().trim().max(200).allow(''),
})), wrap(async (req, res) => {
  const { tanggal, status, catatan } = req.body;
  const out = await withTx(async (c) => {
    if (!(await c.query('SELECT 1 FROM technicians WHERE id=$1', [req.params.id])).rows.length) throw E.notFound('Teknisi tidak ditemukan.');
    const r = await c.query(
      `INSERT INTO technician_availability (teknisi_id, tanggal, status, catatan, updated_at) VALUES ($1,$2,$3,$4,now())
       ON CONFLICT (teknisi_id, tanggal) DO UPDATE SET status=$3, catatan=$4, updated_at=now() RETURNING tanggal::text AS tanggal, status, catatan`,
      [req.params.id, tanggal, status, catatan || null]);
    await audit(c, req.user, 'availability_changed', 'technician', Number(req.params.id), { after: { tanggal, status } });
    return r.rows[0];
  });
  res.json(out);
}));

// ---------- Jadwal ----------
router.get('/schedule', validate(Joi.object({
  dari: dateStr.required(), sampai: dateStr.required(), teknisi_id: Joi.number().integer().positive(),
  layanan_id: Joi.number().integer().positive(), status: Joi.string().valid(...STATUSES),
}), 'query'), wrap(async (req, res) => {
  const f = req.valid.query;
  const params = [startOfWibDay(f.dari), new Date(startOfWibDay(f.sampai).getTime() + DAY_MS)];
  const where = ['b.jadwal_mulai>=$1', 'b.jadwal_mulai<$2'];
  if (f.teknisi_id) { params.push(f.teknisi_id); where.push(`b.teknisi_id=$${params.length}`); }
  if (f.layanan_id) { params.push(f.layanan_id); where.push(`b.layanan_id=$${params.length}`); }
  if (f.status) { params.push(f.status); where.push(`b.status=$${params.length}`); }
  const rows = (await query(
    `SELECT b.id, b.kode_booking, b.jadwal_mulai, b.jadwal_selesai, b.status, b.alamat, c.nama AS customer, s.nama_layanan AS layanan,
            t.id AS teknisi_id, t.nama AS teknisi
     FROM bookings b JOIN customers c ON c.id=b.customer_id JOIN service_catalog s ON s.id=b.layanan_id LEFT JOIN technicians t ON t.id=b.teknisi_id
     WHERE ${where.join(' AND ')} ORDER BY b.jadwal_mulai LIMIT 500`, params)).rows;
  res.json({ data: rows });
}));

router.get('/schedule/conflicts', validate(Joi.object({}), 'query'), wrap(async (_req, res) => { res.json({ data: await dash.conflicts() }); }));

router.get('/schedule/recommendation', validate(Joi.object({
  booking_id: Joi.number().integer().positive(),
  jadwal_mulai: Joi.string().max(50),
  durasi_menit: Joi.number().integer().positive().max(480),
}).or('booking_id', 'jadwal_mulai'), 'query'), wrap(async (req, res) => {
  const q = req.valid.query;
  let start; let end; let excl = null;
  if (q.booking_id) {
    const b = (await query('SELECT id, jadwal_mulai, jadwal_selesai FROM bookings WHERE id=$1', [q.booking_id])).rows[0];
    if (!b) throw E.notFound('Booking tidak ditemukan.');
    start = new Date(b.jadwal_mulai); end = new Date(b.jadwal_selesai); excl = b.id;
  } else {
    start = parseDateTimeInput(q.jadwal_mulai) || new Date(q.jadwal_mulai);
    if (Number.isNaN(start.getTime())) throw E.validation('Jadwal tidak valid.', { jadwal_mulai: 'Format jadwal tidak valid.' });
    end = new Date(start.getTime() + (q.durasi_menit || 60) * 60000);
  }
  res.json({ data: await wf.recommendTechnicians(start, end, excl) });
}));

// ---------- Aksi booking ----------
router.patch('/bookings/:id/assign', validate(idParam, 'params'), validate(Joi.object({ teknisi_id: Joi.number().integer().positive().required().label('Teknisi') })), wrap(async (req, res) => {
  res.json(await wf.assign(Number(req.params.id), req.body.teknisi_id, req.user));
}));

router.patch('/bookings/:id/reschedule', validate(idParam, 'params'), validate(Joi.object({
  jadwal_mulai: Joi.string().trim().required().label('Jadwal'), alasan: Joi.string().trim().min(3).max(300).required().label('Alasan'),
  teknisi_id: Joi.number().integer().positive(),
})), wrap(async (req, res) => {
  res.json(await wf.adminReschedule(Number(req.params.id), req.body, req.user));
}));

router.patch('/bookings/:id/cancel', validate(idParam, 'params'), validate(Joi.object({ alasan: Joi.string().trim().min(3).max(300).required().label('Alasan') })), wrap(async (req, res) => {
  res.json(await wf.adminCancel(Number(req.params.id), req.body.alasan, req.user));
}));

router.patch('/bookings/:id/delay', validate(idParam, 'params'), validate(Joi.object({
  kategori: Joi.string().valid(...wf.DELAY_CATEGORIES).default('lainnya'), alasan: Joi.string().trim().min(3).max(300).required().label('Alasan'),
})), wrap(async (req, res) => {
  res.json(await wf.reportDelay(Number(req.params.id), req.body, req.user));
}));

router.get('/bookings/:id/history', validate(idParam, 'params'), wrap(async (req, res) => {
  const id = Number(req.params.id);
  const [sh, st] = await Promise.all([
    query(`SELECT h.jadwal_lama, h.jadwal_baru, h.alasan, h.diubah_oleh, h.waktu, tl.nama AS teknisi_lama, tb.nama AS teknisi_baru FROM schedule_history h
           LEFT JOIN technicians tl ON tl.id=h.teknisi_lama_id LEFT JOIN technicians tb ON tb.id=h.teknisi_baru_id WHERE h.booking_id=$1 ORDER BY h.waktu DESC`, [id]),
    query('SELECT status_lama, status_baru, diubah_oleh, catatan, waktu FROM status_log WHERE booking_id=$1 ORDER BY waktu DESC, id DESC', [id]),
  ]);
  res.json({ riwayat_jadwal: sh.rows, riwayat_status: st.rows });
}));

router.get('/bookings/:id/report', validate(idParam, 'params'), wrap(async (req, res) => {
  const r = (await query('SELECT data, dibuat_pada FROM service_reports WHERE booking_id=$1', [req.params.id])).rows[0];
  if (!r) throw E.notFound('Laporan servis belum tersedia (pekerjaan belum selesai).');
  res.json(r);
}));

// ---------- Inventory ----------
const invStatus = (r) => (Number(r.stok) <= 0 ? 'out' : Number(r.stok) <= Number(r.min_stok) ? 'low' : 'ok');

router.get('/inventory', validate(Joi.object({ q: Joi.string().trim().max(60).allow(''), status: Joi.string().valid('ok', 'low', 'out') }), 'query'), wrap(async (req, res) => {
  const { q, status } = req.valid.query;
  const params = []; const where = [];
  if (q) { params.push(`%${q}%`); where.push(`(nama ILIKE $${params.length} OR kategori ILIKE $${params.length})`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  let rows = (await query(`SELECT i.*, (SELECT COALESCE(SUM(u.jumlah),0)::float FROM inventory_usage u WHERE u.item_id=i.id AND u.waktu>=now()-interval '30 days') AS pemakaian_30_hari FROM inventory i ${w} ORDER BY kategori, nama`, params)).rows;
  rows = rows.map((r) => ({ ...r, stok: Number(r.stok), min_stok: Number(r.min_stok), status_stok: invStatus(r) }));
  if (status) rows = rows.filter((r) => r.status_stok === status);
  res.json({ data: rows });
}));

router.get('/inventory/movements', validate(Joi.object({ item_id: Joi.number().integer().positive(), jenis: Joi.string().valid('in', 'out', 'adjustment', 'usage'), ...pageQ }), 'query'), wrap(async (req, res) => {
  const f = req.valid.query; const { page, limit, offset } = paging(f);
  const params = []; const where = [];
  if (f.item_id) { params.push(f.item_id); where.push(`m.item_id=$${params.length}`); }
  if (f.jenis) { params.push(f.jenis); where.push(`m.jenis=$${params.length}`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await query(`SELECT COUNT(*)::int n FROM inventory_adjustments m ${w}`, params)).rows[0].n;
  const rows = (await query(
    `SELECT m.id, m.item_id, i.nama, i.satuan, m.jenis, m.jumlah::float, m.stok_sebelum::float, m.stok_sesudah::float, m.catatan, m.oleh, m.created_at, b.kode_booking
     FROM inventory_adjustments m JOIN inventory i ON i.id=m.item_id LEFT JOIN bookings b ON b.id=m.booking_id ${w} ORDER BY m.created_at DESC, m.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset])).rows;
  res.json({ data: rows, meta: { total, page, limit } });
}));

router.post('/inventory/:id/adjust', validate(idParam, 'params'), validate(Joi.object({
  jenis: Joi.string().valid('in', 'out', 'adjustment').required().label('Jenis'),
  jumlah: Joi.number().min(0).max(1000000).required().label('Jumlah'),
  catatan: Joi.string().trim().min(3).max(300).required().label('Catatan'),
})), wrap(async (req, res) => {
  const { jenis, jumlah, catatan } = req.body;
  if (jenis !== 'adjustment' && jumlah <= 0) throw E.validation('Jumlah harus lebih dari 0.', { jumlah: 'Jumlah harus lebih dari 0.' });
  const out = await withTx(async (c) => {
    const it = (await c.query('SELECT * FROM inventory WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!it) throw E.notFound('Item tidak ditemukan.');
    const before = Number(it.stok);
    const after = jenis === 'in' ? before + jumlah : jenis === 'out' ? before - jumlah : jumlah;
    if (after < 0) throw E.business(`Stok ${it.nama} tidak cukup (tersisa ${before} ${it.satuan}).`, { stok: before });
    const r = (await c.query('UPDATE inventory SET stok=$2, updated_at=now() WHERE id=$1 RETURNING *', [it.id, after])).rows[0];
    await c.query(`INSERT INTO inventory_adjustments (item_id, jenis, jumlah, catatan, oleh, stok_sebelum, stok_sesudah) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [it.id, jenis, jumlah, catatan, req.user.nama, before, after]);
    await audit(c, req.user, 'inventory_adjusted', 'inventory', it.id, { before: { stok: before }, after: { stok: after }, metadata: { jenis, jumlah, catatan } });
    if (after <= Number(it.min_stok)) {
      await notify(c, { role: 'admin', title: after <= 0 ? 'Stok habis' : 'Stok menipis', message: `${it.nama} tersisa ${after} ${it.satuan} (minimum ${Number(it.min_stok)}).`, type: 'inventory', tautan: '/admin/inventory', dedup: `lowstock:${it.id}:${after}` });
    }
    return { ...r, stok: Number(r.stok), status_stok: invStatus(r) };
  });
  res.json(out);
}));

const invCreateAdmin = Joi.object({
  nama: Joi.string().trim().min(2).max(80).required().label('Nama item'),
  kategori: Joi.string().valid('freon', 'pipa', 'kabel', 'komponen').required().label('Kategori'),
  stok: Joi.number().min(0).max(1000000).required().label('Stok awal'),
  satuan: Joi.string().trim().min(1).max(20).required().label('Satuan'),
  min_stok: Joi.number().min(0).max(1000000).required().label('Stok minimum'),
  kode_barang: Joi.string().trim().allow('', null).optional(),
});

router.post('/inventory', validate(invCreateAdmin), wrap(async (req, res) => {
  const { nama, kategori, stok, satuan, min_stok } = req.body;
  try {
    const out = await withTx(async (c) => {
      const r = (await c.query(
        'INSERT INTO inventory (nama, kategori, stok, satuan, min_stok, is_synthetic) VALUES ($1,$2,$3,$4,$5,false) RETURNING *',
        [nama, kategori, stok, satuan, min_stok]
      )).rows[0];
      if (Number(stok) > 0) {
        await c.query(
          'INSERT INTO inventory_adjustments (item_id, jenis, jumlah, catatan, oleh, stok_sebelum, stok_sesudah) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [r.id, 'in', stok, 'Saldo stok awal saat penambahan barang baru', req.user.nama, 0, stok]
        );
      }
      await audit(c, req.user, 'inventory_created', 'inventory', r.id, { created: r });
      return { ...r, stok: Number(r.stok), min_stok: Number(r.min_stok), status_stok: invStatus(r) };
    });
    res.status(201).json({ data: out });
  } catch (e) {
    if (e.code === '23505') throw E.conflict('Nama item sudah ada.', { nama: 'Nama barang sudah terdaftar di sistem.' });
    throw e;
  }
}));

router.patch('/inventory/:id', validate(idParam, 'params'), validate(Joi.object({
  nama: Joi.string().trim().min(2).max(80),
  kategori: Joi.string().valid('freon', 'pipa', 'kabel', 'komponen'),
  satuan: Joi.string().trim().min(1).max(20),
  min_stok: Joi.number().min(0).max(1000000),
  aktif: Joi.boolean(),
}).min(1)), wrap(async (req, res) => {
  const sets = []; const params = [req.params.id];
  for (const [k, v] of Object.entries(req.body)) {
    params.push(v);
    sets.push(`${k}=$${params.length}`);
  }
  sets.push('updated_at=now()');
  try {
    const r = (await query(`UPDATE inventory SET ${sets.join(', ')} WHERE id=$1 RETURNING *`, params)).rows[0];
    if (!r) throw E.notFound('Item tidak ditemukan.');
    res.json({ data: { ...r, stok: Number(r.stok), min_stok: Number(r.min_stok), status_stok: invStatus(r) } });
  } catch (e) {
    if (e.code === '23505') throw E.conflict('Nama item sudah ada.', { nama: 'Nama barang sudah terdaftar di sistem.' });
    throw e;
  }
}));


// ---------- Audit log ----------
router.get('/audit-logs', validate(Joi.object({
  q: Joi.string().trim().max(60).allow(''), action: Joi.string().trim().max(60).allow(''), role: Joi.string().valid('admin', 'technician', 'customer', 'system'),
  dari: dateStr, sampai: dateStr, ...pageQ,
}), 'query'), wrap(async (req, res) => {
  const f = req.valid.query; const { page, limit, offset } = paging(f);
  const params = []; const where = [];
  if (f.q) { params.push(`%${f.q}%`); where.push(`(actor ILIKE $${params.length} OR action ILIKE $${params.length} OR entity ILIKE $${params.length})`); }
  if (f.action) { params.push(f.action); where.push(`action=$${params.length}`); }
  if (f.role) { params.push(f.role); where.push(`role=$${params.length}`); }
  if (f.dari) { params.push(startOfWibDay(f.dari)); where.push(`created_at>=$${params.length}`); }
  if (f.sampai) { params.push(new Date(startOfWibDay(f.sampai).getTime() + DAY_MS)); where.push(`created_at<$${params.length}`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await query(`SELECT COUNT(*)::int n FROM audit_logs ${w}`, params)).rows[0].n;
  const rows = (await query(`SELECT id, actor, role, action, entity, entity_id, metadata, sebelum, sesudah, created_at FROM audit_logs ${w} ORDER BY created_at DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset])).rows;
  res.json({ data: rows, meta: { total, page, limit } });
}));

// ---------- Notifikasi admin ----------
router.get('/notifications', validate(Joi.object({ unread: Joi.boolean(), ...pageQ }), 'query'), wrap(async (req, res) => {
  const { unread } = req.valid.query;
  const { page, limit, offset } = paging(req.valid.query);
  const params = [];
  const where = ["target_role='admin'"];
  if (unread !== undefined) {
    params.push(!unread ? true : false);
    where.push(`is_read=$${params.length}`);
  }
  const w = where.join(' AND ');
  const total = (await query(`SELECT COUNT(*)::int n FROM notifications WHERE ${w}`, params)).rows[0].n;
  const rows = (await query(
    `SELECT id, title, message, type, is_read, booking_id, tautan, created_at
     FROM notifications WHERE ${w} ORDER BY created_at DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  )).rows;
  res.json({ data: rows, meta: { total, page, limit } });
}));

router.patch('/notifications/:id/read', validate(idParam, 'params'), validate(Joi.object({}), 'body'), wrap(async (req, res) => {
  await query("UPDATE notifications SET is_read=true WHERE id=$1 AND target_role='admin'", [req.params.id]);
  res.json({ ok: true });
}));

router.patch('/notifications/read-all', validate(Joi.object({}), 'body'), wrap(async (_req, res) => {
  await query("UPDATE notifications SET is_read=true WHERE target_role='admin'");
  res.json({ ok: true });
}));

// ---------- Feedback ----------
router.get('/feedback', validate(Joi.object({
  rating: Joi.number().integer().min(1).max(5), teknisi_id: Joi.number().integer().positive(), maks_rating: Joi.number().integer().min(1).max(5), ...pageQ,
}), 'query'), wrap(async (req, res) => {
  const f = req.valid.query; const { page, limit, offset } = paging(f);
  const params = []; const where = [];
  if (f.rating) { params.push(f.rating); where.push(`f.rating=$${params.length}`); }
  if (f.maks_rating) { params.push(f.maks_rating); where.push(`f.rating<=$${params.length}`); }
  if (f.teknisi_id) { params.push(f.teknisi_id); where.push(`b.teknisi_id=$${params.length}`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const from = `FROM feedback f JOIN bookings b ON b.id=f.booking_id JOIN customers c ON c.id=b.customer_id JOIN service_catalog s ON s.id=b.layanan_id LEFT JOIN technicians t ON t.id=b.teknisi_id ${w}`;
  const total = (await query(`SELECT COUNT(*)::int n ${from}`, params)).rows[0].n;
  const rows = (await query(`SELECT f.id, f.rating, f.komentar, f.waktu, b.id AS booking_id, b.kode_booking, c.nama AS customer, s.nama_layanan, t.nama AS teknisi ${from} ORDER BY f.waktu DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset])).rows;
  const [sum] = (await query(`SELECT COALESCE(ROUND(AVG(rating)::numeric,2),0)::float AS rata, COUNT(*)::int AS jumlah, COUNT(*) FILTER (WHERE rating<=2)::int AS rendah FROM feedback`)).rows;
  const dist = (await query('SELECT rating, COUNT(*)::int AS jumlah FROM feedback GROUP BY rating ORDER BY rating')).rows;
  const perTeknisi = (await query(`SELECT t.id, t.nama, ROUND(AVG(f.rating)::numeric,2)::float AS rata, COUNT(*)::int AS jumlah FROM feedback f JOIN bookings b ON b.id=f.booking_id JOIN technicians t ON t.id=b.teknisi_id GROUP BY t.id ORDER BY rata DESC`)).rows;
  res.json({ data: rows, meta: { total, page, limit }, ringkasan: { ...sum, distribusi: [1, 2, 3, 4, 5].map((r) => ({ rating: r, jumlah: (dist.find((d) => d.rating === r) || {}).jumlah || 0 })), per_teknisi: perTeknisi } });
}));

// ---------- Akun pelanggan oleh admin ----------
router.post('/customers/:id/account', validate(idParam, 'params'), validate(Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).max(120).required().label('Email'), password: Joi.string().min(8).max(100).required().label('Password'),
})), wrap(async (req, res) => {
  const out = await withTx(async (c) => {
    const cu = (await c.query('SELECT * FROM customers WHERE id=$1', [req.params.id])).rows[0];
    if (!cu) throw E.notFound('Pelanggan tidak ditemukan.');
    try {
      await c.query("INSERT INTO users (nama,email,password_hash,role,customer_id) VALUES ($1,$2,$3,'customer',$4)", [cu.nama, req.body.email, await bcrypt.hash(req.body.password, 10), cu.id]);
    } catch (e) {
      if (e.code === '23505') throw E.conflict('Email atau akun pelanggan sudah ada.', { email: 'Sudah terdaftar.' });
      throw e;
    }
    await audit(c, req.user, 'customer_account_created', 'customer', cu.id, { metadata: { email: req.body.email } });
    return { ok: true };
  });
  res.status(201).json(out);
}));

module.exports = router;
