const { query } = require('../db/pool');
const { E } = require('../errors');

/**
 * Menghitung estimasi jadwal perawatan berikutnya & status perawatan unit AC (BR-15, BR-16, BR-17)
 * BR-17: Booking yang dibatalkan TIDAK dihitung sebagai servis selesai.
 */
async function getUnitMaintenanceInfo(unitId) {
  // Ambil data unit AC
  const unit = (await query('SELECT * FROM ac_units WHERE id = $1', [unitId])).rows[0];
  if (!unit) return null;

  // Ambil riwayat booking dengan status = 'done' saja (BR-17)
  const historyRes = await query(`
    SELECT b.id, b.kode_booking, b.jadwal_mulai, b.selesai_aktual, b.status,
           s.id AS layanan_id, s.nama_layanan, s.interval_maintenance_hari,
           t.nama AS teknisi_nama, w.diagnosis, w.rekomendasi
    FROM bookings b
    JOIN service_catalog s ON s.id = b.layanan_id
    LEFT JOIN technicians t ON t.id = b.teknisi_id
    LEFT JOIN work_orders w ON w.booking_id = b.id
    WHERE b.ac_unit_id = $1 AND b.status = 'done'
    ORDER BY COALESCE(b.selesai_aktual, b.jadwal_mulai) DESC
  `, [unitId]);

  const history = historyRes.rows;
  const totalServis = history.length;
  const servisTerakhir = history[0] || null;

  // Cek apakah ada booking aktif / mendatang untuk unit ini
  const upcomingRes = await query(`
    SELECT b.id, b.kode_booking, b.jadwal_mulai, b.status, s.nama_layanan
    FROM bookings b
    JOIN service_catalog s ON s.id = b.layanan_id
    WHERE b.ac_unit_id = $1 AND b.status IN ('scheduled', 'on process', 'delayed', 'rescheduled')
    ORDER BY b.jadwal_mulai ASC LIMIT 1
  `, [unitId]);
  const upcomingBooking = upcomingRes.rows[0] || null;

  let jadwalPerawatanBerikutnya = null;
  const now = new Date();

  if (servisTerakhir) {
    const lastDate = new Date(servisTerakhir.selesai_aktual || servisTerakhir.jadwal_mulai);
    const intervalDays = servisTerakhir.interval_maintenance_hari || 90; // Default perawatan berkala 90 hari / 3 bulan
    jadwalPerawatanBerikutnya = new Date(lastDate.getTime() + intervalDays * 86400000);
  } else if (unit.tanggal_pasang) {
    // Jika belum pernah servis, hitung dari tanggal pasang + 90 hari
    const pasangDate = new Date(unit.tanggal_pasang);
    jadwalPerawatanBerikutnya = new Date(pasangDate.getTime() + 90 * 86400000);
  }

  // Tentukan status perawatan
  let statusPerawatan = 'optimal';
  let hariMenujuPerawatan = null;

  if (upcomingBooking) {
    statusPerawatan = 'terjadwal';
  } else if (jadwalPerawatanBerikutnya) {
    const diffMs = jadwalPerawatanBerikutnya.getTime() - now.getTime();
    hariMenujuPerawatan = Math.ceil(diffMs / 86400000);

    if (hariMenujuPerawatan <= 0) {
      statusPerawatan = 'jatuh_tempo';
    } else if (hariMenujuPerawatan <= 14) {
      statusPerawatan = 'perlu_servis';
    } else {
      statusPerawatan = 'optimal';
    }
  }

  return {
    unit_id: unit.id,
    brand: unit.brand,
    model: unit.model,
    tipe: unit.tipe,
    lokasi: unit.lokasi,
    kapasitas_pk: unit.kapasitas_pk,
    nomor_seri: unit.nomor_seri,
    tanggal_pasang: unit.tanggal_pasang,
    catatan: unit.catatan,
    aktif: unit.aktif,
    total_servis_selesai: totalServis,
    servis_terakhir: servisTerakhir ? {
      booking_id: servisTerakhir.id,
      kode_booking: servisTerakhir.kode_booking,
      nama_layanan: servisTerakhir.nama_layanan,
      tanggal: servisTerakhir.selesai_aktual || servisTerakhir.jadwal_mulai,
      teknisi: servisTerakhir.teknisi_nama,
      diagnosis: servisTerakhir.diagnosis,
    } : null,
    jadwal_perawatan_berikutnya: jadwalPerawatanBerikutnya,
    hari_menuju_perawatan: hariMenujuPerawatan,
    status_perawatan: statusPerawatan,
    booking_mendatang: upcomingBooking,
    riwayat_servis: history,
  };
}

module.exports = {
  getUnitMaintenanceInfo,
};
