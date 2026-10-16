const { query, withTx, withTransaction } = require('../db/pool');
const { E } = require('../errors');
const { notify } = require('./common');

async function createNotification({ target_role, target_id, judul, pesan, tipe, booking_id, tautan, dedup_key }, db = { query }) {
  try {
    await notify(db, {
      role: target_role,
      id: target_id,
      title: judul,
      message: pesan,
      type: ['warning', 'success', 'info'].includes(tipe) ? 'system' : tipe,
      bookingId: booking_id,
      tautan,
      dedup: dedup_key,
    });
  } catch (err) {
    // Non-blocking notification
  }
}

/**
 * Menghitung durasi garansi (hari) berdasarkan nama / katalog layanan (BR-23)
 * - 45 hari: Paket Core + Isi Freon
 * - 30 hari: Cuci AC Core (Deep Clean), Bongkar Pasang, Perbaikan
 * - 14 hari: Cuci Standard / lainnya
 */
function getWarrantyDurationDays(serviceName = '') {
  const name = (serviceName || '').toLowerCase();
  if (name.includes('freon') && name.includes('core')) {
    return 45;
  }
  if (name.includes('core') || name.includes('bongkar') || name.includes('perbaikan')) {
    return 30;
  }
  return 14;
}

/**
 * Mendapatkan status & detail garansi untuk sebuah booking (BR-23, BR-24)
 */
async function getWarrantyInfo(bookingId) {
  const bRes = await query(`
    SELECT b.*, s.nama_layanan, s.harga AS harga_layanan, c.nama AS nama_customer, c.kontak AS kontak_customer
    FROM bookings b
    JOIN service_catalog s ON s.id = b.layanan_id
    JOIN customers c ON c.id = b.customer_id
    WHERE b.id = $1
  `, [bookingId]);

  const booking = bRes.rows[0];
  if (!booking) throw E.notFound('Booking tidak ditemukan.');

  const durasiHari = getWarrantyDurationDays(booking.nama_layanan);
  const tanggalSelesai = booking.selesai_aktual || (booking.status === 'done' ? booking.updated_at : null);
  
  let garansiMulai = null;
  let garansiSelesai = null;
  let isGaransiAktif = false;
  let sisaHari = 0;

  if (tanggalSelesai && booking.status === 'done') {
    garansiMulai = new Date(tanggalSelesai);
    garansiSelesai = new Date(garansiMulai.getTime() + durasiHari * 86400000);
    const now = new Date();
    isGaransiAktif = now <= garansiSelesai;
    sisaHari = isGaransiAktif ? Math.ceil((garansiSelesai.getTime() - now.getTime()) / 86400000) : 0;
  }

  // Cek review/feedback yang ada (BR-25)
  const fbRes = await query('SELECT * FROM feedback WHERE booking_id = $1', [bookingId]);
  const feedback = fbRes.rows[0] || null;

  // Cek klaim aktif dan riwayat klaim (BR-30, BR-31)
  const claimsRes = await query(`
    SELECT c.*, t.nama AS nama_teknisi_pemeriksa
    FROM warranty_claims c
    LEFT JOIN technicians t ON t.id = c.teknisi_pemeriksa_id
    WHERE c.booking_id = $1
    ORDER BY c.created_at DESC
  `, [bookingId]);

  const allClaims = claimsRes.rows;
  const activeClaim = allClaims.find((c) => ['diajukan', 'dijadwalkan', 'diperiksa'].includes(c.status)) || null;

  return {
    booking_id: booking.id,
    kode_booking: booking.kode_booking,
    nama_layanan: booking.nama_layanan,
    status_booking: booking.status,
    durasi_garansi_hari: durasiHari,
    garansi_mulai: garansiMulai,
    garansi_selesai: garansiSelesai,
    is_garansi_aktif: isGaransiAktif,
    sisa_hari_garansi: sisaHari,
    feedback,
    active_claim: activeClaim,
    total_klaim: allClaims.length,
    riwayat_klaim: allClaims,
  };
}

/**
 * Mengajukan klaim garansi baru (BR-24, BR-25, BR-28, BR-30, BR-31)
 */
async function submitClaim({ booking_id, keluhan, rating, review_komentar, user, kontak }) {
  if (!keluhan || keluhan.trim().length < 5) {
    throw E.badRequest('Keluhan wajib diisi minimal 5 karakter.');
  }

  return withTransaction(async (client) => {
    // 1. Ambil data booking
    const bRes = await client.query(`
      SELECT b.*, s.nama_layanan, c.id AS customer_id
      FROM bookings b
      JOIN service_catalog s ON s.id = b.layanan_id
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = $1 FOR UPDATE
    `, [booking_id]);

    const booking = bRes.rows[0];
    if (!booking) throw E.notFound('Booking tidak ditemukan.');

    // Verifikasi kepemilikan jika user adalah customer atau guest dengan kontak
    if (user && user.role === 'customer' && user.customer_id && booking.customer_id !== user.customer_id) {
      throw E.forbidden('Anda tidak berhak mengajukan klaim untuk booking ini.');
    } else if (!user) {
      if (!kontak || !kontak.trim()) {
        throw E.unauthorized('Silakan login atau masukkan nomor WhatsApp pemesan untuk verifikasi klaim.');
      }
      const cleanKontak = kontak.replace(/\D/g, '');
      const cleanBookingKontak = (booking.kontak || '').replace(/\D/g, '');
      if (!cleanBookingKontak.endsWith(cleanKontak) && !cleanKontak.endsWith(cleanBookingKontak)) {
        throw E.forbidden('Nomor WhatsApp verifikasi tidak cocok dengan data booking.');
      }
    }

    if (booking.status !== 'done') {
      throw E.badRequest('Klaim garansi hanya dapat diajukan untuk pekerjaan yang telah selesai.');
    }

    // 2. BR-23 & BR-24: Verifikasi masa berlaku garansi
    const durasiHari = getWarrantyDurationDays(booking.nama_layanan);
    const tanggalSelesai = new Date(booking.selesai_aktual || booking.updated_at);
    const garansiSelesai = new Date(tanggalSelesai.getTime() + durasiHari * 86400000);
    const now = new Date();

    if (now > garansiSelesai) {
      throw E.badRequest(
        `Masa garansi untuk layanan ${booking.nama_layanan} (${durasiHari} hari) telah berakhir pada ${garansiSelesai.toLocaleDateString('id-ID')}.`
      );
    }

    // 3. BR-30: Hanya satu klaim garansi aktif pada satu waktu
    const activeClaim = (await client.query(`
      SELECT id, kode_klaim, status FROM warranty_claims 
      WHERE booking_id = $1 AND status IN ('diajukan', 'dijadwalkan', 'diperiksa')
    `, [booking_id])).rows[0];

    if (activeClaim) {
      throw E.conflict(
        `Hanya satu klaim garansi aktif yang diperbolehkan (BR-30). Klaim ${activeClaim.kode_klaim} saat ini berstatus ${activeClaim.status}.`
      );
    }

    // 4. BR-31: Klaim berikutnya dapat diajukan untuk masalah yang berbeda
    const prevClaims = (await client.query(`
      SELECT keluhan FROM warranty_claims WHERE booking_id = $1
    `, [booking_id])).rows;

    const normalizedNew = keluhan.trim().toLowerCase();
    if (prevClaims.some((c) => c.keluhan.trim().toLowerCase() === normalizedNew)) {
      throw E.badRequest(
        'Klaim berikutnya wajib untuk masalah / keluhan yang berbeda dari klaim sebelumnya (BR-31).'
      );
    }

    // 5. BR-25: Klaim wajib menyertakan review berupa rating dan komentar
    let feedback = (await client.query('SELECT * FROM feedback WHERE booking_id = $1', [booking_id])).rows[0];

    if (!feedback) {
      if (!rating || !review_komentar) {
        throw E.badRequest(
          'Klaim garansi wajib menyertakan review berupa rating (1-5) dan komentar pengalaman servis (BR-25).'
        );
      }
      const numRating = Number(rating);
      if (numRating < 1 || numRating > 5) {
        throw E.badRequest('Rating harus antara 1 sampai 5 bintang.');
      }
      if (review_komentar.trim().length < 3) {
        throw E.badRequest('Komentar review minimal 3 karakter.');
      }

      const fbInsert = await client.query(`
        INSERT INTO feedback (booking_id, rating, komentar, sentimen, waktu)
        VALUES ($1, $2, $3, $4, now()) RETURNING *
      `, [booking_id, numRating, review_komentar.trim(), numRating <= 2 ? 'negative' : 'positive']);
      feedback = fbInsert.rows[0];
    }

    // 6. Buat Klaim Baru (BR-28: Pemeriksaan klaim gratis)
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const kodeKlaim = `CLM-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

    const claimInsert = await client.query(`
      INSERT INTO warranty_claims (
        kode_klaim, booking_id, customer_id, ac_unit_id, keluhan, rating, review_komentar,
        status, is_gratis, biaya_tambahan
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'diajukan', true, 0)
      RETURNING *
    `, [
      kodeKlaim,
      booking_id,
      booking.customer_id,
      booking.ac_unit_id || null,
      keluhan.trim(),
      feedback ? feedback.rating : Number(rating),
      feedback ? feedback.komentar : review_komentar.trim(),
    ]);

    const claim = claimInsert.rows[0];

    // Notifikasi ke Admin
    await createNotification({
      target_role: 'admin',
      target_id: null,
      judul: 'Klaim Garansi Diajukan',
      pesan: `Pelanggan mengajukan klaim garansi ${kodeKlaim} untuk tiket ${booking.kode_booking}: "${keluhan.trim()}"`,
      tipe: 'warning',
      booking_id,
      tautan: `/admin/claims`,
      dedup_key: `claim_submitted_${claim.id}`,
    }, client);

    return claim;
  });
}

/**
 * Admin menentukan jadwal pemeriksaan dan teknisi pemeriksa (BR-26, BR-27)
 */
async function scheduleInspection(claimId, { jadwal_pemeriksaan, teknisi_pemeriksa_id }, adminUser) {
  if (!jadwal_pemeriksaan) {
    throw E.badRequest('Jadwal pemeriksaan wajib ditentukan oleh admin (BR-27).');
  }
  if (!teknisi_pemeriksa_id) {
    throw E.badRequest('Teknisi pemeriksa wajib ditunjuk (BR-26).');
  }

  const claim = (await query('SELECT * FROM warranty_claims WHERE id = $1', [claimId])).rows[0];
  if (!claim) throw E.notFound('Klaim garansi tidak ditemukan.');

  if (claim.status !== 'diajukan' && claim.status !== 'dijadwalkan') {
    throw E.badRequest(`Klaim berstatus "${claim.status}" tidak dapat dijadwalkan ulang pemeriksaan.`);
  }

  const updated = (await query(`
    UPDATE warranty_claims
    SET jadwal_pemeriksaan = $1, teknisi_pemeriksa_id = $2, status = 'dijadwalkan', updated_at = now()
    WHERE id = $3 RETURNING *
  `, [jadwal_pemeriksaan, teknisi_pemeriksa_id, claimId])).rows[0];

  // Notifikasi teknisi
  await createNotification({
    target_role: 'technician',
    target_id: teknisi_pemeriksa_id,
    judul: 'Tugas Pemeriksaan Klaim Garansi',
    pesan: `Anda ditugaskan memeriksa klaim garansi ${claim.kode_klaim} pada ${new Date(jadwal_pemeriksaan).toLocaleString('id-ID')}.`,
    tipe: 'info',
    booking_id: claim.booking_id,
    tautan: `/technician/jobs`,
    dedup_key: `claim_tech_scheduled_${claimId}`,
  });

  return updated;
}

/**
 * Teknisi mengisi laporan pemeriksaan klaim (BR-26)
 */
async function reportInspection(claimId, { catatan_pemeriksaan }, technicianUser) {
  if (!catatan_pemeriksaan || catatan_pemeriksaan.trim().length < 5) {
    throw E.badRequest('Catatan hasil pemeriksaan wajib diisi minimal 5 karakter.');
  }

  const claim = (await query('SELECT * FROM warranty_claims WHERE id = $1', [claimId])).rows[0];
  if (!claim) throw E.notFound('Klaim garansi tidak ditemukan.');

  if (claim.status !== 'dijadwalkan' && claim.status !== 'diperiksa') {
    throw E.badRequest('Pemeriksaan hanya dapat dilaporkan untuk klaim yang telah dijadwalkan.');
  }

  const updated = (await query(`
    UPDATE warranty_claims
    SET catatan_pemeriksaan = $1, status = 'diperiksa', updated_at = now()
    WHERE id = $2 RETURNING *
  `, [catatan_pemeriksaan.trim(), claimId])).rows[0];

  // Notifikasi admin bahwa laporan pemeriksaan sudah siap dinilai
  await createNotification({
    target_role: 'admin',
    target_id: null,
    judul: 'Hasil Pemeriksaan Klaim Siap Dinilai',
    pesan: `Laporan pemeriksaan klaim ${claim.kode_klaim} telah diisi oleh teknisi. Silakan tentukan kelayakan klaim.`,
    tipe: 'info',
    booking_id: claim.booking_id,
    tautan: `/admin/claims`,
    dedup_key: `claim_inspected_${claimId}`,
  });

  return updated;
}

/**
 * Admin menentukan kelayakan klaim (disetujui / ditolak) (BR-26, BR-28, BR-29, BR-33)
 */
async function decideClaim(claimId, { keputusan, alasan_penolakan, biaya_tambahan = 0 }, adminUser) {
  if (!['disetujui', 'ditolak'].includes(keputusan)) {
    throw E.badRequest('Keputusan harus berupa "disetujui" atau "ditolak".');
  }

  const claim = (await query('SELECT * FROM warranty_claims WHERE id = $1', [claimId])).rows[0];
  if (!claim) throw E.notFound('Klaim garansi tidak ditemukan.');

  if (['selesai'].includes(claim.status)) {
    throw E.badRequest('Klaim sudah selesai diproses.');
  }

  // BR-33: Jika ditolak, wajib sertakan alasan (segel rusak, pembongkaran pihak lain, kesalahan penggunaan, dll)
  if (keputusan === 'ditolak' && (!alasan_penolakan || alasan_penolakan.trim().length < 5)) {
    throw E.badRequest('Alasan penolakan klaim wajib dijelaskan minimal 5 karakter (BR-33).');
  }

  // BR-28: Kunjungan pemeriksaan tetap gratis (is_gratis = true)
  // BR-29: Biaya tambahan (spare part / jasa di luar garansi) dicatat terpisah
  const updated = (await query(`
    UPDATE warranty_claims
    SET status = $1, alasan_penolakan = $2, biaya_tambahan = $3, is_gratis = true, updated_at = now()
    WHERE id = $4 RETURNING *
  `, [keputusan, keputusan === 'ditolak' ? alasan_penolakan.trim() : null, Number(biaya_tambahan) || 0, claimId])).rows[0];

  // Notifikasi customer
  if (claim.customer_id) {
    await createNotification({
      target_role: 'customer',
      target_id: claim.customer_id,
      judul: `Klaim Garansi ${keputusan.toUpperCase()}`,
      pesan: keputusan === 'disetujui'
        ? `Klaim garansi Anda (${claim.kode_klaim}) telah disetujui. Teknisi kami akan segera menangani unit AC Anda.`
        : `Klaim garansi Anda (${claim.kode_klaim}) ditolak: "${alasan_penolakan}". Anda dapat mengajukan perbaikan berbayar (BR-32).`,
      tipe: keputusan === 'disetujui' ? 'success' : 'warning',
      booking_id: claim.booking_id,
      tautan: `/status/${claim.booking_id}`,
      dedup_key: `claim_decided_${claimId}`,
    });
  }

  return updated;
}

/**
 * BR-32: Klaim yang ditolak dapat ditindaklanjuti dengan booking servis berbayar
 */
async function convertToPaidBooking(claimId, { layanan_id, jadwal_mulai }, user) {
  return withTransaction(async (client) => {
    const claim = (await client.query('SELECT * FROM warranty_claims WHERE id = $1 FOR UPDATE', [claimId])).rows[0];
    if (!claim) throw E.notFound('Klaim tidak ditemukan.');

    if (claim.status !== 'ditolak') {
      throw E.badRequest('Fitur ini hanya dapat digunakan untuk klaim yang berstatus ditolak (BR-32).');
    }

    if (claim.booking_berbayar_id) {
      throw E.conflict('Booking servis berbayar untuk klaim ini sudah dibuat sebelumnya.');
    }

    // Ambil data booking awal untuk copy alamat & kontak
    const origBooking = (await client.query('SELECT * FROM bookings WHERE id = $1', [claim.booking_id])).rows[0];

    // Buat booking servis baru
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const kodeBooking = `NARA-AC${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
    const targetLayananId = layanan_id || origBooking.layanan_id;

    const newBookingRes = await client.query(`
      INSERT INTO bookings (
        kode_booking, customer_id, ac_unit_id, layanan_id, jadwal_mulai, jadwal_selesai,
        alamat, kontak, keluhan, status, status_pembayaran, jumlah_unit
      ) VALUES ($1, $2, $3, $4, $5, $5 + INTERVAL 90 MINUTE, $6, $7, $8, 'scheduled', 'pending', 1)
      RETURNING *
    `, [
      kodeBooking,
      claim.customer_id,
      claim.ac_unit_id,
      targetLayananId,
      jadwal_mulai || new Date(Date.now() + 86400000).toISOString(),
      origBooking.alamat,
      origBooking.kontak,
      `Tindak lanjut klaim garansi ditolak (${claim.kode_klaim}): ${claim.keluhan}`,
    ]);

    const newBooking = newBookingRes.rows[0];

    // Hubungkan booking baru ke claim
    await client.query('UPDATE warranty_claims SET booking_berbayar_id = $1, updated_at = now() WHERE id = $2', [
      newBooking.id, claimId,
    ]);

    return {
      message: 'Booking servis berbayar berhasil dibuat dari klaim yang ditolak (BR-32).',
      booking_baru: newBooking,
    };
  });
}

/**
 * Daftar semua klaim dengan paginasi & filter
 */
async function listClaims({ status, customer_id, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (status) {
    params.push(status);
    conditions.push(`c.status = $${params.length}`);
  }

  if (customer_id) {
    params.push(customer_id);
    conditions.push(`c.customer_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit, offset);
  const dataQuery = `
    SELECT c.*, b.kode_booking, s.nama_layanan, cust.nama AS nama_customer, cust.kontak AS kontak_customer,
           t.nama AS nama_teknisi_pemeriksa, u.brand AS unit_brand, u.model AS unit_model, u.lokasi AS unit_lokasi
    FROM warranty_claims c
    JOIN bookings b ON b.id = c.booking_id
    JOIN service_catalog s ON s.id = b.layanan_id
    LEFT JOIN customers cust ON cust.id = c.customer_id
    LEFT JOIN technicians t ON t.id = c.teknisi_pemeriksa_id
    LEFT JOIN ac_units u ON u.id = c.ac_unit_id
    ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const totalQuery = `
    SELECT COUNT(*) AS total
    FROM warranty_claims c
    ${whereClause}
  `;

  const [dataRes, countRes] = await Promise.all([
    query(dataQuery, params),
    query(totalQuery, params.slice(0, conditions.length)),
  ]);

  return {
    data: dataRes.rows,
    meta: {
      total: countRes.rows[0]?.total || 0,
      page: Number(page),
      limit: Number(limit),
    },
  };
}

module.exports = {
  getWarrantyDurationDays,
  getWarrantyInfo,
  submitClaim,
  scheduleInspection,
  reportInspection,
  decideClaim,
  convertToPaidBooking,
  listClaims,
};
