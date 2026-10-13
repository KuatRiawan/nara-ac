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

module.exports = { summary, latestPredictions };
