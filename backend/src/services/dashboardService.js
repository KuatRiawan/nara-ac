/** Agregasi dasbor admin: satu endpoint, semua dari database nyata (WIB). */
const { query } = require('../db/pool');
const { wibDateString, addDaysWibString, startOfWibDay, DAY_MS } = require('../utils/time');
const analytics = require('./analyticsService');

const ACTIVE = "('scheduled','rescheduled','delayed','on process')";

async function conflicts() {
  const overlaps = (await query(
    `SELECT a.id AS a_id, a.kode_booking AS a_kode, b.id AS b_id, b.kode_booking AS b_kode, t.id AS teknisi_id, t.nama AS teknisi,
            GREATEST(a.jadwal_mulai, b.jadwal_mulai) AS mulai, LEAST(a.jadwal_selesai, b.jadwal_selesai) AS selesai
     FROM bookings a JOIN bookings b ON a.teknisi_id=b.teknisi_id AND a.id<b.id AND a.jadwal_mulai<b.jadwal_selesai AND a.jadwal_selesai>b.jadwal_mulai
     JOIN technicians t ON t.id=a.teknisi_id
     WHERE a.status NOT IN ('cancelled','done') AND b.status NOT IN ('cancelled','done') AND b.jadwal_selesai >= now()
     ORDER BY mulai LIMIT 50`)).rows.map((r) => ({ ...r, jenis: 'double_booking' }));
  const unavailable = (await query(
    `SELECT b.id AS a_id, b.kode_booking AS a_kode, t.id AS teknisi_id, t.nama AS teknisi, b.jadwal_mulai AS mulai, b.jadwal_selesai AS selesai,
            CASE WHEN NOT t.aktif THEN 'teknisi_nonaktif' ELSE 'teknisi_tidak_tersedia' END AS jenis
     FROM bookings b JOIN technicians t ON t.id=b.teknisi_id
     LEFT JOIN technician_availability ta ON ta.teknisi_id=t.id AND ta.tanggal=(b.jadwal_mulai AT TIME ZONE 'Asia/Jakarta')::date
     WHERE b.status IN ('scheduled','rescheduled','delayed') AND b.jadwal_selesai >= now()
       AND (NOT t.aktif OR (ta.status IS NOT NULL AND ta.status <> 'available'))
     ORDER BY b.jadwal_mulai LIMIT 50`)).rows;
  return [...overlaps, ...unavailable];
}

async function maintenanceDue(daysArg = 14, limitArg = 50) {
  let days = daysArg;
  let limit = limitArg;
  if (typeof daysArg === 'object' && daysArg !== null) {
    days = daysArg.days !== undefined ? daysArg.days : 14;
    limit = daysArg.limit !== undefined ? daysArg.limit : 50;
  }
  const { sanitizeLimitOffset } = require('../db/pool');
  const { limit: safeLimit } = sanitizeLimitOffset(limit);
  return (await query(
    `WITH last AS (
       SELECT DISTINCT ON (b.ac_unit_id) b.ac_unit_id, b.jadwal_mulai AS terakhir, s.interval_maintenance_hari AS interval_hari, s.nama_layanan
       FROM bookings b JOIN service_catalog s ON s.id=b.layanan_id
       WHERE b.status='done' AND b.ac_unit_id IS NOT NULL AND s.interval_maintenance_hari IS NOT NULL
       ORDER BY b.ac_unit_id, b.jadwal_mulai DESC)
     SELECT u.id, u.brand, u.model, u.lokasi, c.id AS customer_id, c.nama AS customer, c.kontak,
            l.terakhir, l.nama_layanan, (l.terakhir + l.interval_hari * interval '1 day') AS jatuh_tempo
     FROM last l JOIN ac_units u ON u.id=l.ac_unit_id AND u.aktif JOIN customers c ON c.id=u.customer_id
     WHERE l.terakhir + l.interval_hari * interval '1 day' <= now() + ($1::int * interval '1 day')
       AND NOT EXISTS (SELECT 1 FROM bookings x WHERE x.ac_unit_id=u.id AND x.status IN ${ACTIVE})
     ORDER BY jatuh_tempo LIMIT $2`, [days, safeLimit])).rows;
}

async function summary({ hari = 30 } = {}, now = new Date()) {
  const today = wibDateString(now);
  const ds = startOfWibDay(today);
  const de = new Date(ds.getTime() + DAY_MS);
  const rangeFrom = startOfWibDay(addDaysWibString(today, -(hari - 1)));
  const prevFrom = startOfWibDay(addDaysWibString(today, -(2 * hari - 1)));
  const next7 = new Date(de.getTime() + 6 * DAY_MS);
  const q = async (sql, p = []) => (await query(sql, p)).rows;

  const [
    [kpi], trend, statusRange, popularity, workload, availability, today_ops, upcoming, recent,
    inventory, [rating], ratingDist, lowRatings, [rem], [komplain], [perf], [prevCount], [curCount], conf, due, byHour,
  ] = await Promise.all([
    q(`SELECT
         COUNT(*) FILTER (WHERE jadwal_mulai>=$1 AND jadwal_mulai<$2 AND status<>'cancelled')::int AS booking_hari_ini,
         COUNT(*) FILTER (WHERE status='on process')::int AS sedang_berjalan,
         COUNT(*) FILTER (WHERE status='done' AND COALESCE(selesai_aktual, jadwal_mulai)>=$1 AND COALESCE(selesai_aktual, jadwal_mulai)<$2)::int AS selesai_hari_ini,
         COUNT(*) FILTER (WHERE teknisi_id IS NULL AND status IN ('scheduled','rescheduled','delayed'))::int AS menunggu_assignment,
         COUNT(*) FILTER (WHERE status='delayed' OR (status IN ('scheduled','rescheduled') AND jadwal_mulai<now()) OR (status='on process' AND jadwal_selesai<now()))::int AS terlambat,
         COUNT(*) FILTER (WHERE status IN ('scheduled','rescheduled','delayed') AND jadwal_mulai>=$2 AND jadwal_mulai<$3)::int AS booking_mendatang
       FROM bookings`, [ds, de, next7]),
    q(`SELECT to_char(d::date,'YYYY-MM-DD') AS tanggal,
         COUNT(b.id) FILTER (WHERE b.status<>'cancelled')::int AS jumlah,
         COUNT(b.id) FILTER (WHERE b.status='done')::int AS selesai,
         COUNT(b.id) FILTER (WHERE b.status='cancelled')::int AS batal
       FROM generate_series($1::date, $2::date, interval '1 day') d
       LEFT JOIN bookings b ON (b.jadwal_mulai AT TIME ZONE 'Asia/Jakarta')::date = d::date
       GROUP BY d ORDER BY d`, [addDaysWibString(today, -(hari - 1)), today]),
    q('SELECT status, COUNT(*)::int AS jumlah FROM bookings WHERE jadwal_mulai>=$1 AND jadwal_mulai<$2 GROUP BY status', [rangeFrom, de]),
    q(`SELECT s.id, s.nama_layanan AS nama, COUNT(b.id)::int AS jumlah
       FROM service_catalog s JOIN bookings b ON b.layanan_id=s.id AND b.status<>'cancelled' AND b.jadwal_mulai>=$1 AND b.jadwal_mulai<$2
       GROUP BY s.id ORDER BY jumlah DESC, s.nama_layanan LIMIT 8`, [rangeFrom, de]),
    q(`SELECT t.id, t.nama, t.aktif,
         COUNT(b.id) FILTER (WHERE b.status IN ('scheduled','rescheduled'))::int AS dijadwalkan,
         COUNT(b.id) FILTER (WHERE b.status='on process')::int AS berjalan,
         COUNT(b.id) FILTER (WHERE b.status='done')::int AS selesai,
         COUNT(b.id) FILTER (WHERE b.status='delayed')::int AS tertunda,
         COUNT(b.id) FILTER (WHERE b.jadwal_mulai>=$3 AND b.jadwal_mulai<$4 AND b.status<>'cancelled')::int AS hari_ini,
         COUNT(b.id) FILTER (WHERE b.status<>'cancelled')::int AS total
       FROM technicians t LEFT JOIN bookings b ON b.teknisi_id=t.id AND b.jadwal_mulai>=$1 AND b.jadwal_mulai<$2
       WHERE t.aktif GROUP BY t.id ORDER BY total DESC, t.nama`, [rangeFrom, de, ds, de]),
    q(`SELECT t.id, t.nama, COALESCE(ta.status,'available') AS status, ta.catatan,
         (SELECT b.kode_booking FROM bookings b WHERE b.teknisi_id=t.id AND b.status='on process' LIMIT 1) AS pekerjaan_berjalan
       FROM technicians t LEFT JOIN technician_availability ta ON ta.teknisi_id=t.id AND ta.tanggal=$1::date
       WHERE t.aktif ORDER BY t.nama`, [today]),
    q(`SELECT b.id, b.kode_booking, b.jadwal_mulai, b.jadwal_selesai, b.status, b.alamat, c.nama AS customer,
              s.nama_layanan AS layanan, t.id AS teknisi_id, t.nama AS teknisi
       FROM bookings b JOIN customers c ON c.id=b.customer_id JOIN service_catalog s ON s.id=b.layanan_id
       LEFT JOIN technicians t ON t.id=b.teknisi_id
       WHERE b.jadwal_mulai>=$1 AND b.jadwal_mulai<$2 AND b.status<>'cancelled' ORDER BY b.jadwal_mulai`, [ds, de]),
    q(`SELECT b.id, b.kode_booking, b.jadwal_mulai, b.status, c.nama AS customer, s.nama_layanan AS layanan, t.nama AS teknisi
       FROM bookings b JOIN customers c ON c.id=b.customer_id JOIN service_catalog s ON s.id=b.layanan_id
       LEFT JOIN technicians t ON t.id=b.teknisi_id
       WHERE b.jadwal_mulai>=$1 AND b.status IN ('scheduled','rescheduled','delayed') ORDER BY b.jadwal_mulai LIMIT 8`, [de]),
    q('SELECT id, actor, role, action, entity, entity_id, metadata, created_at FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT 8'),
    q(`SELECT id, nama, kategori, stok::float, satuan, min_stok::float,
         CASE WHEN stok<=0 THEN 'out' WHEN stok<=min_stok THEN 'low' ELSE 'ok' END AS status
       FROM inventory WHERE aktif AND stok<=min_stok ORDER BY stok/NULLIF(min_stok,0) NULLS FIRST, nama LIMIT 10`),
    q(`SELECT COALESCE(ROUND(AVG(f.rating)::numeric,2),0)::float AS rata, COUNT(f.id)::int AS jumlah
       FROM feedback f JOIN bookings b ON b.id=f.booking_id WHERE b.jadwal_mulai>=$1 AND b.jadwal_mulai<$2`, [rangeFrom, de]),
    q(`SELECT f.rating, COUNT(*)::int AS jumlah FROM feedback f JOIN bookings b ON b.id=f.booking_id
       WHERE b.jadwal_mulai>=$1 AND b.jadwal_mulai<$2 GROUP BY f.rating ORDER BY f.rating`, [rangeFrom, de]),
    q(`SELECT f.id, f.rating, f.komentar, f.waktu, b.kode_booking, c.nama AS customer, t.nama AS teknisi
       FROM feedback f JOIN bookings b ON b.id=f.booking_id JOIN customers c ON c.id=b.customer_id LEFT JOIN technicians t ON t.id=b.teknisi_id
       WHERE f.rating<=2 AND f.waktu>=now()-interval '30 days' ORDER BY f.waktu DESC LIMIT 5`),
    q("SELECT COUNT(*) FILTER (WHERE status='failed')::int AS gagal, COUNT(*) FILTER (WHERE status='pending')::int AS pending, COUNT(*) FILTER (WHERE status='sent')::int AS terkirim FROM reminder_log"),
    q("SELECT COUNT(*) FILTER (WHERE status='open')::int AS terbuka FROM complaint_tickets"),
    q(`SELECT COUNT(*) FILTER (WHERE status='done')::int AS selesai,
              COUNT(*) FILTER (WHERE status='delayed')::int AS tertunda,
              COUNT(*) FILTER (WHERE status='cancelled')::int AS batal, COUNT(*)::int AS total
       FROM bookings WHERE jadwal_mulai>=$1 AND jadwal_mulai<$2`, [rangeFrom, de]),
    q("SELECT COUNT(*)::int AS n FROM bookings WHERE status<>'cancelled' AND jadwal_mulai>=$1 AND jadwal_mulai<$2", [prevFrom, rangeFrom]),
    q("SELECT COUNT(*)::int AS n FROM bookings WHERE status<>'cancelled' AND jadwal_mulai>=$1 AND jadwal_mulai<$2", [rangeFrom, de]),
    conflicts(),
    maintenanceDue(14, 20),
    q(`SELECT EXTRACT(HOUR FROM jadwal_mulai AT TIME ZONE 'Asia/Jakarta')::int AS jam, COUNT(*)::int AS jumlah
       FROM bookings WHERE status<>'cancelled' AND jadwal_mulai>=$1 AND jadwal_mulai<$2 GROUP BY 1 ORDER BY 1`, [rangeFrom, de]),
  ]);

  const statusMap = Object.fromEntries(statusRange.map((r) => [r.status, r.jumlah]));
  const bookingStatus = ['scheduled', 'on process', 'done', 'delayed', 'rescheduled', 'cancelled']
    .map((s) => ({ status: s, jumlah: statusMap[s] || 0 }));

  const actionRequired = [
    { kunci: 'belum_ditugaskan', jumlah: kpi.menunggu_assignment, teks: 'booking belum ditugaskan', tautan: '/admin/bookings?belum_ditugaskan=1', tingkat: 'danger' },
    { kunci: 'terlambat', jumlah: kpi.terlambat, teks: 'pekerjaan terlambat / tertunda', tautan: '/admin/bookings?status=delayed', tingkat: 'danger' },
    { kunci: 'bentrok', jumlah: conf.length, teks: 'jadwal bentrok / teknisi tidak tersedia', tautan: '/admin/schedule', tingkat: 'danger' },
    { kunci: 'stok_menipis', jumlah: inventory.length, teks: 'stok menipis', tautan: '/admin/inventory', tingkat: 'warning' },
    { kunci: 'maintenance_due', jumlah: due.length, teks: 'unit AC jatuh tempo maintenance', tautan: '/admin/ac-units', tingkat: 'warning' },
    { kunci: 'reminder_gagal', jumlah: rem.gagal, teks: 'reminder gagal terkirim', tautan: '/admin/notifications', tingkat: 'warning' },
    { kunci: 'rating_rendah', jumlah: lowRatings.length, teks: 'feedback rating rendah (30 hari)', tautan: '/admin/feedback', tingkat: 'warning' },
    { kunci: 'keluhan_terbuka', jumlah: komplain.terbuka, teks: 'tiket keluhan terbuka', tautan: '/admin/notifications', tingkat: 'info' },
  ].filter((a) => a.jumlah > 0);

  // Insight hanya dari data nyata
  const insights = [];
  if (prevCount.n >= 3 && curCount.n > prevCount.n * 1.15) {
    insights.push({ tingkat: 'info', judul: 'Permintaan meningkat', teks: `Booking ${hari} hari terakhir (${curCount.n}) naik dibanding periode sebelumnya (${prevCount.n}).`, rekomendasi: 'Pertimbangkan memastikan ketersediaan teknisi dan material sebelum periode ramai.' });
  } else if (prevCount.n >= 3 && curCount.n < prevCount.n * 0.85) {
    insights.push({ tingkat: 'info', judul: 'Permintaan menurun', teks: `Booking ${hari} hari terakhir (${curCount.n}) turun dibanding periode sebelumnya (${prevCount.n}).`, rekomendasi: 'Pertimbangkan pengingat maintenance untuk pelanggan lama.' });
  }
  if (perf.total >= 5 && (perf.batal / perf.total) >= 0.2) insights.push({ tingkat: 'warning', judul: 'Tingkat pembatalan tinggi', teks: `${Math.round((perf.batal / perf.total) * 100)}% booking dibatalkan pada periode ini.`, rekomendasi: 'Tinjau alasan pembatalan di audit log.' });
  const aktif = workload.filter((w) => w.total > 0);
  if (aktif.length >= 2 && aktif[0].total >= 2 * Math.max(aktif[aktif.length - 1].total, 1)) insights.push({ tingkat: 'info', judul: 'Beban kerja tidak seimbang', teks: `${aktif[0].nama} (${aktif[0].total}) vs ${aktif[aktif.length - 1].nama} (${aktif[aktif.length - 1].total}).`, rekomendasi: 'Gunakan rekomendasi teknisi saat penugasan.' });
  if (byHour.length) { const top = [...byHour].sort((a, b) => b.jumlah - a.jumlah)[0]; insights.push({ tingkat: 'info', judul: 'Jam paling ramai', teks: `Jam ${String(top.jam).padStart(2, '0')}:00 WIB paling banyak dijadwalkan (${top.jumlah} booking).`, rekomendasi: null }); }

  let prediksi = null;
  try { prediksi = await analytics.latestPredictions(); } catch { prediksi = null; }

  const [{ sintetis, total }] = await q('SELECT COUNT(*) FILTER (WHERE is_synthetic)::int AS sintetis, COUNT(*)::int AS total FROM bookings');

  return {
    dibuat_pada: now.toISOString(),
    tanggal: today,
    periode_hari: hari,
    kpi: { ...kpi, teknisi_aktif: availability.filter((a) => a.status === 'available').length, teknisi_total_aktif: availability.length, maintenance_due: due.length },
    bookingTrend: trend,
    bookingStatus,
    servicePopularity: popularity,
    technicianWorkload: workload,
    technicianAvailability: availability,
    completionPerformance: { ...perf, tingkat_selesai: perf.total ? Math.round((perf.selesai / perf.total) * 100) : null },
    feedback: { ...rating, distribusi: [1, 2, 3, 4, 5].map((r) => ({ rating: r, jumlah: (ratingDist.find((x) => x.rating === r) || {}).jumlah || 0 })), rendah: lowRatings },
    actionRequired,
    todayOperations: today_ops,
    upcomingJobs: upcoming,
    recentActivity: recent,
    maintenanceDue: due,
    inventoryAlerts: inventory,
    conflicts: conf,
    reminder: rem,
    busyHours: byHour,
    insights,
    prediction: prediksi,
    sumber_data: { booking_total: total, booking_sintetis: sintetis, catatan: sintetis > 0 ? 'Sebagian data adalah DATA DEMO/SINTETIS untuk pengembangan.' : 'Data nyata dari aplikasi.' },
  };
}

module.exports = { summary, conflicts, maintenanceDue };
