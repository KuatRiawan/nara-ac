const express = require('express');
const { query, withTx } = require('../db/pool');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const { E } = require('../errors');
const wf = require('../services/workflowService');
const bs = require('../services/bookingService');
const { audit } = require('../services/common');
const { receivePhoto } = require('../utils/upload');
const { wibDateString, startOfWibDay, DAY_MS } = require('../utils/time');

const router = express.Router();
const idParam = Joi.object({ id: Joi.number().integer().positive().required().label('ID') });
const jobParam = Joi.object({
  id: Joi.number().integer().positive().required(),
  cid: Joi.number().integer().positive(),
  pid: Joi.number().integer().positive(),
});
const TECH = requireAuth(['technician']);
const TECH_OR_ADMIN = requireAuth(['technician', 'admin']);
const tid = (req) => req.user.technicianId;

const JOB_COLS = `b.id, b.kode_booking, b.jadwal_mulai, b.jadwal_selesai, b.status, b.alamat, b.keluhan, b.alasan_tunda,
  c.nama AS nama_customer, c.kontak AS kontak_customer, s.nama_layanan, s.durasi_menit,
  u.brand, u.model, u.kapasitas_pk,
  (SELECT COUNT(*)::int FROM work_order_checklists k WHERE k.booking_id=b.id) AS checklist_total,
  (SELECT COUNT(*)::int FROM work_order_checklists k WHERE k.booking_id=b.id AND k.status<>'pending') AS checklist_selesai`;
const JOB_FROM = `FROM bookings b JOIN customers c ON c.id=b.customer_id JOIN service_catalog s ON s.id=b.layanan_id
  LEFT JOIN ac_units u ON u.id=b.ac_unit_id`;

router.get('/dashboard', TECH, validate(Joi.object({
  tanggal: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).label('Tanggal'),
}), 'query'), wrap(async (req, res) => {
  const today = req.valid.query.tanggal || wibDateString(new Date());
  const ds = startOfWibDay(today);
  const de = new Date(ds.getTime() + DAY_MS);
  const [todayJobs, current, upcoming, recent, availability, tech] = await Promise.all([
    query(`SELECT ${JOB_COLS} ${JOB_FROM} WHERE b.teknisi_id=$1 AND b.status<>'cancelled' AND b.jadwal_mulai>=$2 AND b.jadwal_mulai<$3 ORDER BY b.jadwal_mulai`, [tid(req), ds, de]),
    query(`SELECT ${JOB_COLS} ${JOB_FROM} WHERE b.teknisi_id=$1 AND b.status='on process' ORDER BY b.jadwal_mulai LIMIT 1`, [tid(req)]),
    query(`SELECT ${JOB_COLS} ${JOB_FROM} WHERE b.teknisi_id=$1 AND b.status IN ('scheduled','rescheduled','delayed') AND b.jadwal_mulai>=$2 ORDER BY b.jadwal_mulai LIMIT 10`, [tid(req), de]),
    query(`SELECT l.booking_id, b.kode_booking, l.status_baru, l.catatan, l.waktu FROM status_log l JOIN bookings b ON b.id=l.booking_id
           WHERE b.teknisi_id=$1 ORDER BY l.waktu DESC, l.id DESC LIMIT 6`, [tid(req)]),
    query('SELECT status, catatan FROM technician_availability WHERE teknisi_id=$1 AND tanggal=$2', [tid(req), today]),
    query('SELECT nama FROM technicians WHERE id=$1', [tid(req)]),
  ]);
  const hari = todayJobs.rows;
  const nextJob = current.rows[0] || hari.find((j) => ['scheduled', 'rescheduled', 'delayed'].includes(j.status)) || upcoming.rows[0] || null;
  res.json({
    nama: tech.rows[0] ? tech.rows[0].nama : req.user.nama,
    tanggal: today,
    ringkasan: {
      hari_ini: hari.length,
      berjalan: hari.filter((j) => j.status === 'on process').length + (current.rows[0] && !hari.find((j) => j.id === current.rows[0].id) ? 1 : 0),
      selesai: hari.filter((j) => j.status === 'done').length,
      tertunda: hari.filter((j) => j.status === 'delayed').length,
    },
    pekerjaan_saat_ini: current.rows[0] || null,
    pekerjaan_berikutnya: nextJob,
    pekerjaan_hari_ini: hari,
    pekerjaan_mendatang: upcoming.rows,
    aktivitas_terbaru: recent.rows,
    ketersediaan_hari_ini: availability.rows[0] || { status: 'available', catatan: null },
  });
}));

router.get('/jobs', TECH, validate(Joi.object({
  scope: Joi.string().valid('today', 'upcoming', 'done', 'all'),
  q: Joi.string().trim().max(60).allow(''),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
}), 'query'), wrap(async (req, res) => {
  const { scope = 'all', q, page = 1, limit = 30 } = req.valid.query;
  const today = wibDateString(new Date());
  const ds = startOfWibDay(today);
  const de = new Date(ds.getTime() + DAY_MS);
  const { sanitizeLimitOffset } = require('../db/pool');
  const { limit: safeLimit, offset: safeOffset } = sanitizeLimitOffset(limit, (page - 1) * limit);
  const params = [tid(req)];
  const where = ['b.teknisi_id=$1', "b.status<>'cancelled'"];
  if (scope === 'today') { params.push(ds, de); where.push(`b.jadwal_mulai>=$${params.length - 1} AND b.jadwal_mulai<$${params.length}`); }
  if (scope === 'upcoming') { params.push(de); where.push(`b.jadwal_mulai>=$${params.length} AND b.status<>'done'`); }
  if (scope === 'done') where.push("b.status='done'");
  if (q) { params.push(`%${q}%`); where.push(`(b.kode_booking ILIKE $${params.length} OR c.nama ILIKE $${params.length})`); }
  const w = where.join(' AND ');
  const total = (await query(`SELECT COUNT(*)::int n ${JOB_FROM} WHERE ${w}`, params)).rows[0].n;
  // ORDER BY direction: upcoming & today order chronologically ASC, all & done order newest first DESC
  const orderDir = (scope === 'today' || scope === 'upcoming') ? 'ASC' : 'DESC';
  const rows = (await query(`SELECT ${JOB_COLS} ${JOB_FROM} WHERE ${w} ORDER BY b.jadwal_mulai ${orderDir} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, safeLimit, safeOffset])).rows;
  res.json({ data: rows, meta: { total, page, limit } });
}));

router.get('/inventory', TECH, validate(Joi.object({}), 'query'), wrap(async (_req, res) => {
  const r = await query('SELECT id, nama, satuan, stok FROM inventory WHERE aktif = true ORDER BY kategori, nama ASC');
  res.json({ data: r.rows });
}));

router.get('/jobs/:id', TECH_OR_ADMIN, validate(idParam, 'params'), wrap(async (req, res) => {
  res.json(await wf.jobDetail(Number(req.params.id), req.user));
}));

router.patch('/jobs/:id/start', TECH_OR_ADMIN, validate(idParam, 'params'), wrap(async (req, res) => {
  res.json(await wf.startJob(Number(req.params.id), req.user));
}));

router.patch('/jobs/:id/complete', TECH_OR_ADMIN, validate(idParam, 'params'), validate(Joi.object({
  override_alasan: Joi.string().trim().max(300),
})), wrap(async (req, res) => {
  res.json(await wf.completeJob(Number(req.params.id), req.body, req.user));
}));

router.post('/jobs/:id/delay', TECH_OR_ADMIN, validate(idParam, 'params'), validate(Joi.object({
  kategori: Joi.string().valid(...wf.DELAY_CATEGORIES).required().label('Kategori'),
  alasan: Joi.string().trim().min(3).max(300).required().label('Alasan'),
  durasi_tunggu_menit: Joi.number().integer().min(0).max(180).optional().label('Durasi Tunggu'),
})), wrap(async (req, res) => {
  res.json(await wf.reportDelay(Number(req.params.id), req.body, req.user));
}));

router.post('/jobs/:id/checklist', TECH_OR_ADMIN, validate(idParam, 'params'), validate(Joi.object({
  task: Joi.string().trim().min(2).max(160).required().label('Tugas'),
  wajib: Joi.boolean().default(false),
})), wrap(async (req, res) => {
  res.status(201).json(await wf.addChecklistItem(Number(req.params.id), req.body, req.user));
}));

router.patch('/jobs/:id/checklist/:cid', TECH_OR_ADMIN, validate(jobParam, 'params'), validate(Joi.object({
  status: Joi.string().valid('pending', 'completed', 'skipped').required().label('Status'),
  alasan_skip: Joi.string().trim().max(200).allow(''),
})), wrap(async (req, res) => {
  res.json(await wf.setChecklistStatus(Number(req.params.id), Number(req.params.cid), req.body, req.user));
}));

router.put('/jobs/:id/work-order', TECH_OR_ADMIN, validate(idParam, 'params'), validate(Joi.object({
  diagnosis: Joi.string().trim().max(1000).allow(''),
  rekomendasi: Joi.string().trim().max(1000).allow(''),
  catatan: Joi.string().trim().max(1000).allow(''),
}).min(1)), wrap(async (req, res) => {
  res.json(await wf.saveWorkOrder(Number(req.params.id), req.body, req.user));
}));

// Cek kepemilikan sebelum menerima berkas (hindari menyimpan file untuk job orang lain)
const guardUpload = wrap(async (req, _res, next) => {
  const b = (await query('SELECT teknisi_id FROM bookings WHERE id=$1', [req.params.id])).rows[0];
  if (!b) throw E.notFound('Pekerjaan tidak ditemukan.');
  if (req.user.role === 'technician' && b.teknisi_id !== tid(req)) throw E.forbidden('Pekerjaan ini bukan penugasan Anda.');
  next();
});

router.post('/jobs/:id/photos', TECH_OR_ADMIN, validate(idParam, 'params'), guardUpload, receivePhoto, wrap(async (req, res) => {
  const tipe = req.body.tipe;
  if (!['before', 'after'].includes(tipe)) throw E.validation('Tipe foto harus before atau after.', { tipe: 'Pilih before atau after.' });
  res.status(201).json(await wf.addPhoto(Number(req.params.id), { tipe, catatan: String(req.body.catatan || '').slice(0, 200), file: req.savedFile }, req.user));
}));

router.delete('/jobs/:id/photos/:pid', TECH_OR_ADMIN, validate(jobParam, 'params'), wrap(async (req, res) => {
  await wf.removePhoto(Number(req.params.id), Number(req.params.pid), req.user);
  res.json({ ok: true });
}));

router.post('/jobs/:id/materials', TECH_OR_ADMIN, validate(idParam, 'params'), validate(Joi.object({
  item_id: Joi.number().integer().positive().required().label('Material'),
  jumlah: Joi.number().positive().max(10000).required().label('Jumlah'),
  catatan: Joi.string().trim().max(300).allow(''),
})), wrap(async (req, res) => {
  res.status(201).json(await bs.addInventoryUsage(Number(req.params.id), req.body, req.user));
}));

router.post('/jobs/:id/notes', TECH_OR_ADMIN, validate(idParam, 'params'), validate(Joi.object({
  catatan: Joi.string().trim().min(1).max(500).required().label('Catatan'),
})), wrap(async (req, res) => {
  const r = await withTx(async (client) => {
    const b = await bs.lockBooking(client, Number(req.params.id));
    if (req.user.role === 'technician' && b.teknisi_id !== tid(req)) throw E.forbidden('Pekerjaan ini bukan penugasan Anda.');
    const ins = await client.query(
      'INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan) VALUES ($1,$2,$2,$3,$4) RETURNING *',
      [b.id, b.status, req.user.nama, req.body.catatan]);
    return ins.rows[0];
  });
  res.status(201).json(r);
}));

// ---- Ketersediaan & jadwal sendiri ----
router.get('/availability', TECH, validate(Joi.object({
  limit: Joi.number().integer().min(1).max(365).default(30),
}), 'query'), wrap(async (req, res) => {
  const { limit } = req.valid.query;
  const today = wibDateString(new Date());
  const r = await query('SELECT tanggal::text AS tanggal, status, catatan FROM technician_availability WHERE teknisi_id=$1 AND tanggal>=$2 ORDER BY tanggal LIMIT $3', [tid(req), today, limit]);
  res.json({ data: r.rows });
}));

router.put('/availability', TECH, validate(Joi.object({
  tanggal: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().label('Tanggal'),
  status: Joi.string().valid('available', 'busy', 'off').required().label('Status'),
  catatan: Joi.string().trim().max(200).allow(''),
})), wrap(async (req, res) => {
  const { tanggal, status, catatan } = req.body;
  if (tanggal < wibDateString(new Date())) throw E.business('Tanggal ketersediaan tidak boleh di masa lalu.');
  const out = await withTx(async (client) => {
    const r = await client.query(
      `INSERT INTO technician_availability (teknisi_id, tanggal, status, catatan, updated_at) VALUES ($1,$2,$3,$4,now())
       ON CONFLICT (teknisi_id, tanggal) DO UPDATE SET status=$3, catatan=$4, updated_at=now() RETURNING tanggal::text AS tanggal, status, catatan`,
      [tid(req), tanggal, status, catatan || null]);
    await audit(client, req.user, 'availability_changed', 'technician', tid(req), { after: { tanggal, status } });
    return r.rows[0];
  });
  res.json(out);
}));

router.get('/schedule', TECH, validate(Joi.object({
  dari: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().label('Dari tanggal'),
  sampai: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().label('Sampai tanggal'),
}), 'query'), wrap(async (req, res) => {
  const { dari, sampai } = req.valid.query;
  const r = await query(
    `SELECT ${JOB_COLS} ${JOB_FROM} WHERE b.teknisi_id=$1 AND b.status<>'cancelled' AND b.jadwal_mulai>=$2 AND b.jadwal_mulai<$3 ORDER BY b.jadwal_mulai`,
    [tid(req), startOfWibDay(dari), new Date(startOfWibDay(sampai).getTime() + DAY_MS)]);
  res.json({ data: r.rows });
}));

module.exports = router;
