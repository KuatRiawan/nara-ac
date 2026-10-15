const { query } = require('../db/pool');
const { wibDateString, addDaysWibString, startOfWibDay, DAY_MS } = require('../utils/time');

/** Ringkasan dasbor dari data aktual di database. Rentang berdasarkan jadwal_mulai (WIB). */
async function summary({ dari, sampai } = {}, now = new Date()) {
  const today = wibDateString(now);
  const to = sampai || today;
  const from = dari || addDaysWibString(today, -29);
  const fromD = startOfWibDay(from);
  const toD = new Date(startOfWibDay(to).getTime() + DAY_MS);
  const range = [fromD, toD];
  const one = async (sql, p = range) => (await query(sql, p)).rows;

  const [tot] = await one(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_synthetic)::int AS sintetis,
            COUNT(*) FILTER (WHERE teknisi_id IS NULL AND status='scheduled')::int AS belum_ditugaskan
     FROM bookings WHERE jadwal_mulai >= $1 AND jadwal_mulai < $2`);
  const status = await one(
    `SELECT status, COUNT(*)::int AS jumlah FROM bookings WHERE jadwal_mulai >= $1 AND jadwal_mulai < $2 GROUP BY status`);
  const perPeriode = await one(
    `SELECT to_char(date_trunc('month', jadwal_mulai AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM') AS periode, COUNT(*)::int AS jumlah
     FROM bookings WHERE jadwal_mulai >= $1 AND jadwal_mulai < $2 GROUP BY 1 ORDER BY 1`);
  const perHari = await one(
    `SELECT to_char((jadwal_mulai AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS tanggal, COUNT(*)::int AS jumlah
     FROM bookings WHERE jadwal_mulai >= $1 AND jadwal_mulai < $2 GROUP BY 1 ORDER BY 1`);
  const bulanIni = (await one(
    `SELECT COUNT(*)::int AS n FROM bookings WHERE to_char(jadwal_mulai AT TIME ZONE 'Asia/Jakarta','YYYY-MM') = $1`,
    [today.slice(0, 7)]))[0].n;
  const workload = await one(
    `SELECT t.id, t.nama, t.aktif,
            COUNT(b.id) FILTER (WHERE b.status='scheduled')::int AS scheduled,
            COUNT(b.id) FILTER (WHERE b.status='on process')::int AS on_process,
            COUNT(b.id) FILTER (WHERE b.status='done')::int AS done,
            COUNT(b.id)::int AS total
     FROM technicians t LEFT JOIN bookings b ON b.teknisi_id=t.id AND b.jadwal_mulai >= $1 AND b.jadwal_mulai < $2
     GROUP BY t.id ORDER BY total DESC, t.nama`);
  const [rating] = await one(
    `SELECT COALESCE(ROUND(AVG(f.rating)::numeric,2),0)::float AS rata, COUNT(f.id)::int AS jumlah,
            COUNT(*) FILTER (WHERE f.rating<=2)::int AS rendah
     FROM feedback f JOIN bookings b ON b.id=f.booking_id WHERE b.jadwal_mulai >= $1 AND b.jadwal_mulai < $2`);
  const distRating = await one(
    `SELECT f.rating, COUNT(*)::int AS jumlah FROM feedback f JOIN bookings b ON b.id=f.booking_id
     WHERE b.jadwal_mulai >= $1 AND b.jadwal_mulai < $2 GROUP BY f.rating ORDER BY f.rating`);
  const stokMenipis = await one(
    `SELECT id, nama, kategori, stok::float, satuan, min_stok::float FROM inventory
     WHERE aktif AND stok <= min_stok ORDER BY (stok / NULLIF(min_stok,0)) NULLS FIRST, nama`, []);
  const reminder = await one(
    `SELECT status, COUNT(*)::int AS jumlah FROM reminder_log GROUP BY status`, []);
  const [komplain] = await one(`SELECT COUNT(*) FILTER (WHERE status='open')::int AS terbuka FROM complaint_tickets`, []);

  const besok = addDaysWibString(today, 1);
  const [bsk] = await one(
    `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE teknisi_id IS NULL)::int AS tanpa_teknisi
     FROM bookings WHERE status='scheduled' AND (jadwal_mulai AT TIME ZONE 'Asia/Jakarta')::date = $1::date`, [besok]);

  const toMap = (rows, k) => Object.fromEntries(rows.map((r) => [r[k], r.jumlah]));
  const statusDist = { scheduled: 0, 'on process': 0, done: 0, ...toMap(status, 'status') };
  const reminderDist = { pending: 0, sent: 0, failed: 0, ...toMap(reminder, 'status') };

  const insights = [];
  if (bsk.tanpa_teknisi > 0) insights.push({ tingkat: 'peringatan', teks: `${bsk.tanpa_teknisi} booking besok belum memiliki teknisi — tetapkan teknisi sekarang.` });
  if (tot.belum_ditugaskan > 0) insights.push({ tingkat: 'info', teks: `${tot.belum_ditugaskan} booking berstatus scheduled belum ditugaskan ke teknisi.` });
  if (stokMenipis.length) insights.push({ tingkat: 'peringatan', teks: `${stokMenipis.length} item inventory menipis: ${stokMenipis.slice(0, 3).map((s) => s.nama).join(', ')}.` });
  if (reminderDist.failed > 0) insights.push({ tingkat: 'peringatan', teks: `${reminderDist.failed} pengingat gagal terkirim — buka halaman Pengingat untuk kirim ulang.` });
  if (rating.jumlah >= 5 && rating.rata < 4) insights.push({ tingkat: 'peringatan', teks: `Rata-rata rating ${rating.rata} di bawah 4 — tinjau feedback terbaru.` });
  if (komplain.terbuka > 0) insights.push({ tingkat: 'info', teks: `${komplain.terbuka} tiket keluhan belum ditangani.` });
  const aktif = workload.filter((w) => w.aktif && w.total > 0);
  if (aktif.length >= 2) {
    const max = aktif[0]; const min = aktif[aktif.length - 1];
    if (max.total >= 2 * Math.max(min.total, 1)) insights.push({ tingkat: 'info', teks: `Beban kerja tidak seimbang: ${max.nama} (${max.total}) vs ${min.nama} (${min.total}).` });
  }
  if (!insights.length) insights.push({ tingkat: 'ok', teks: 'Tidak ada hal mendesak pada rentang ini.' });

  return {
    rentang: { dari: from, sampai: to },
    booking_total: tot.total,
    booking_bulan_ini: bulanIni,
    booking_besok: bsk.total,
    status_distribusi: statusDist,
    booking_per_bulan: perPeriode,
    booking_per_hari: perHari,
    workload_teknisi: workload,
    rating: { ...rating, distribusi: distRating },
    inventory_menipis: stokMenipis,
    reminder: reminderDist,
    tiket_keluhan_terbuka: komplain.terbuka,
    insight: insights,
    sumber_data: {
      database: 'PostgreSQL (tabel bookings, feedback, inventory, reminder_log)',
      booking_sintetis: tot.sintetis,
      booking_nyata: tot.total - tot.sintetis,
      catatan: tot.sintetis > 0
        ? 'Sebagian/seluruh data pada rentang ini adalah DATA SINTETIS untuk demo (bukan data pelanggan nyata).'
        : 'Data berasal dari booking yang tercatat di aplikasi.',
    },
  };
}

async function latestPredictions() {
  const rows = (await query(
    `SELECT target, periode, nilai_prediksi::float AS nilai, batas_bawah::float AS bawah, batas_atas::float AS atas,
            model_version, keterangan, is_synthetic, metrik, dibuat_pada
     FROM prediction_output
     WHERE dibuat_pada = (SELECT MAX(dibuat_pada) FROM prediction_output)
     ORDER BY periode`)).rows;
  if (!rows.length) return null;
  return {
    target: rows[0].target,
    model_version: rows[0].model_version,
    keterangan: rows[0].keterangan,
    is_synthetic: rows[0].is_synthetic,
    dibuat_pada: rows[0].dibuat_pada,
    metrik: rows[0].metrik,
    prediksi: rows.map((r) => ({ periode: r.periode, nilai: r.nilai, batas_bawah: r.bawah, batas_atas: r.atas })),
  };
}

/**
 * Agregasi tren kunjungan servis & penyelesaian untuk grafik dasbor operasional
 * @param {string} period '7d' | '30d' | '90d' | '1y'
 * @param {Date} now
 */
async function trends(period = '7d', now = new Date()) {
  const p = ['7d', '30d', '90d', '1y'].includes(period) ? period : '7d';
  
  if (p === '1y') {
    // 1 Tahun (Jan - Des tahun berjalan)
    const year = now.getFullYear();
    const startYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const endYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

    const rows = (await query(`
      SELECT 
        to_char(date_trunc('month', jadwal_mulai AT TIME ZONE 'Asia/Jakarta'), 'MM') AS month_num,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'done')::int AS selesai
      FROM bookings
      WHERE jadwal_mulai >= $1 AND jadwal_mulai <= $2
      GROUP BY 1
      ORDER BY 1
    `, [startYear, endYear])).rows;

    const monthMap = new Map(rows.map(r => [r.month_num, r]));
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    return monthNames.map((name, idx) => {
      const mStr = String(idx + 1).padStart(2, '0');
      const found = monthMap.get(mStr) || {};
      return {
        date: name,
        key: `${year}-${mStr}`,
        total: found.total || 0,
        selesai: found.selesai || 0
      };
    });
  }

  if (p === '90d') {
    // 90 Hari (3 Bulan terakhir) - Agregasi mingguan (13 minggu)
    const startDate = new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const rows = (await query(`
      SELECT 
        to_char(date_trunc('week', jadwal_mulai AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD') AS week_start,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'done')::int AS selesai
      FROM bookings
      WHERE jadwal_mulai >= $1 AND jadwal_mulai <= $2
      GROUP BY 1
      ORDER BY 1
    `, [startDate, now])).rows;

    return rows.map(r => {
      const d = new Date(r.week_start);
      return {
        date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        key: r.week_start,
        total: r.total || 0,
        selesai: r.selesai || 0
      };
    });
  }

  // 7d atau 30d: Agregasi per hari
  const daysCount = p === '30d' ? 30 : 7;
  const startDate = new Date(now.getTime() - (daysCount - 1) * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const rows = (await query(`
    SELECT 
      to_char((jadwal_mulai AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS day_str,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'done')::int AS selesai
    FROM bookings
    WHERE jadwal_mulai >= $1 AND jadwal_mulai <= $2
    GROUP BY 1
    ORDER BY 1
  `, [startDate, endOfToday])).rows;

  const dayMap = new Map(rows.map(r => [r.day_str, r]));
  const result = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    const found = dayMap.get(key) || {};

    const label = p === '7d'
      ? d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
      : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

    result.push({
      date: label,
      key,
      total: found.total || 0,
      selesai: found.selesai || 0
    });
  }

  return result;
}

module.exports = { summary, latestPredictions, trends };
