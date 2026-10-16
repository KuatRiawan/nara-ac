/**
 * Workflow operasional: penugasan, jadwal ulang, pembatalan, penundaan, pengerjaan teknisi,
 * checklist, foto, bahan, laporan servis. Semua aksi kritis berjalan dalam transaksi dan
 * menulis audit log + notifikasi (atomik).
 */
const { withTx, query } = require('../db/pool');
const { E } = require('../errors');
const { audit, notify } = require('./common');
const bs = require('./bookingService');
const {
  parseDateTimeInput, wibDateString, formatWib, startOfWibDay, DAY_MS,
} = require('../utils/time');

const { EDITABLE, BOOKING_SELECT, mapBooking, lockBooking } = bs;

const DEFAULT_CHECKLIST = [
  { task: 'Cuci Filter Udara (Indoor)', wajib: true },
  { task: 'Bersihkan Evaporator (Indoor)', wajib: true },
  { task: 'Cek Tekanan Freon', wajib: true },
  { task: 'Bersihkan Kondensor (Outdoor)', wajib: true },
  { task: 'Cek Arus Listrik & Kompresor', wajib: true },
  { task: 'Cek Pipa Kapiler & Sambungan', wajib: false },
  { task: 'Tes Nyala (Running Test)', wajib: true },
];

const DELAY_CATEGORIES = [
  'pelanggan_tidak_di_tempat', 'kendala_peralatan', 'pekerjaan_sebelumnya_molor', 'macet', 'kendala_teknis', 'lainnya',
];

const label = (b) => b.kode_booking;
const bookingRow = async (db, id) => mapBooking((await db.query(`${BOOKING_SELECT} WHERE b.id = $1`, [id])).rows[0]);

function assertOwnJob(b, user) {
  if (user.role === 'technician' && b.teknisi_id !== user.technicianId) {
    throw E.forbidden('Pekerjaan ini bukan penugasan Anda.');
  }
}

/** Cek semua aturan penugasan. Melempar 409 (bentrok/tidak tersedia) atau 422 (teknisi nonaktif). */
async function assertTechnicianAssignable(db, teknisiId, start, end, excludeBookingId) {
  const t = (await db.query('SELECT * FROM technicians WHERE id=$1', [teknisiId])).rows[0];
  if (!t) throw E.validation('Teknisi tidak valid.', { teknisi_id: 'Teknisi tidak ditemukan.' });
  if (!t.aktif) throw E.business('Teknisi nonaktif dan tidak dapat ditugaskan.', { teknisi: t.nama });

  const tanggal = wibDateString(new Date(start));
  const av = (await db.query('SELECT status, catatan FROM technician_availability WHERE teknisi_id=$1 AND tanggal=$2', [teknisiId, tanggal])).rows[0];
  if (av && av.status !== 'available') {
    throw E.conflict(`${t.nama} tidak tersedia pada ${tanggal} (${av.status === 'off' ? 'libur/cuti' : 'sibuk'}).`, {
      code: 'TECHNICIAN_UNAVAILABLE', teknisi: t.nama, tanggal, status: av.status,
    });
  }
  const c = (await db.query(
    `SELECT id, kode_booking, jadwal_mulai, jadwal_selesai FROM bookings
     WHERE teknisi_id=$1 AND status NOT IN ('cancelled','done') AND jadwal_mulai < $3 AND jadwal_selesai > $2
       AND ($4 IS NULL OR id <> $4) ORDER BY jadwal_mulai LIMIT 1`,
    [teknisiId, start, end, excludeBookingId || null],
  )).rows[0];
  if (c) {
    throw E.conflict(`${t.nama} sudah memiliki jadwal pada waktu tersebut (booking ${c.kode_booking}).`, {
      code: 'BOOKING_CONFLICT', teknisi: t.nama, bentrok_dengan: c.kode_booking,
      mulai: c.jadwal_mulai, selesai: c.jadwal_selesai,
    });
  }
  return t;
}

/** Rekomendasi teknisi: ketersediaan, bentrok, beban kerja hari itu, status aktif. */
async function recommendTechnicians(start, end, excludeBookingId = null) {
  const tanggal = wibDateString(start);
  const dayStart = startOfWibDay(tanggal);
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);
  const r = await query(
    `SELECT t.id, t.nama, t.aktif,
       (SELECT ta.status FROM technician_availability ta WHERE ta.teknisi_id=t.id AND ta.tanggal=$1) AS status_harian,
       (SELECT json_agg(json_build_object('kode', b.kode_booking, 'mulai', b.jadwal_mulai, 'selesai', b.jadwal_selesai) ORDER BY b.jadwal_mulai)
          FROM bookings b WHERE b.teknisi_id=t.id AND b.status NOT IN ('cancelled','done') AND ($4 IS NULL OR b.id<>$4)
           AND b.jadwal_mulai < $3 AND b.jadwal_selesai > $2) AS bentrok,
       (SELECT COUNT(*) AS count FROM bookings b WHERE b.teknisi_id=t.id AND b.status<>'cancelled'
           AND b.jadwal_mulai >= $5 AND b.jadwal_mulai < $6) AS pekerjaan_hari_ini,
       (SELECT json_build_object('kode', b.kode_booking, 'selesai', b.jadwal_selesai) FROM bookings b
          WHERE b.teknisi_id=t.id AND b.status='on process' LIMIT 1) AS pekerjaan_berjalan,
       (SELECT MAX(b.jadwal_selesai) FROM bookings b WHERE b.teknisi_id=t.id AND b.status NOT IN ('cancelled','done')
           AND b.jadwal_mulai >= $5 AND b.jadwal_mulai < $6) AS selesai_terakhir_hari_ini
     FROM technicians t WHERE t.aktif ORDER BY t.nama`,
    [tanggal, start, end, excludeBookingId, dayStart, dayEnd],
  );
  const rows = r.rows.map((t) => {
    const unavailable = t.status_harian && t.status_harian !== 'available';
    const conflict = (t.bentrok || []).length > 0;
    const status = unavailable ? 'unavailable' : conflict ? 'conflict' : 'available';
    return {
      id: t.id, nama: t.nama, status, status_harian: t.status_harian || 'available',
      pekerjaan_hari_ini: t.pekerjaan_hari_ini, pekerjaan_berjalan: t.pekerjaan_berjalan,
      bentrok: t.bentrok || [],
      slot_kosong_berikutnya: status === 'available' ? start
        : (t.bentrok && t.bentrok.length ? t.bentrok[t.bentrok.length - 1].selesai : t.selesai_terakhir_hari_ini),
      assignable: status === 'available',
    };
  });
  rows.sort((a, b) => (a.assignable === b.assignable ? a.pekerjaan_hari_ini - b.pekerjaan_hari_ini : a.assignable ? -1 : 1));
  const first = rows.find((x) => x.assignable);
  rows.forEach((x) => { x.direkomendasikan = !!first && x.id === first.id; });
  return rows;
}

async function assign(id, teknisiId, user) {
  return await withTx(async (client) => {
    await client.query("SELECT name FROM scheduling_locks WHERE name='booking-slots' FOR UPDATE");
    const b = await lockBooking(client, id);
    if (!EDITABLE.includes(b.status)) throw E.business(`Teknisi tidak dapat ditugaskan pada status "${b.status}".`);
    const t = await assertTechnicianAssignable(client, teknisiId, b.jadwal_mulai, b.jadwal_selesai, id);
    await client.query('UPDATE bookings SET teknisi_id=$2, updated_at=now() WHERE id=$1', [id, teknisiId]);
    await client.query(
      `INSERT INTO schedule_history (booking_id, jadwal_lama, jadwal_baru, teknisi_lama_id, teknisi_baru_id, alasan, diubah_oleh)
       VALUES ($1,$2,$2,$3,$4,$5,$6)`,
      [id, b.jadwal_mulai, b.teknisi_id, teknisiId, b.teknisi_id ? 'Penggantian teknisi' : 'Penugasan teknisi', user.nama],
    );
    await client.query('INSERT INTO booking_audit (booking_id, aksi, detail, oleh) VALUES ($1,$2,$3,$4)',
      [id, 'assign_technician', JSON.stringify({ dari: b.teknisi_id, ke: teknisiId, nama: t.nama }), user.nama]);
    await audit(client, user, 'technician_assigned', 'booking', id, {
      before: { teknisi_id: b.teknisi_id }, after: { teknisi_id: teknisiId }, metadata: { kode: label(b), teknisi: t.nama },
    });
    await notify(client, { role: 'technician', id: teknisiId, title: 'Pekerjaan baru', message: `${label(b)} pada ${formatWib(new Date(b.jadwal_mulai))}. Cek detail pekerjaan.`, type: 'booking', bookingId: id, tautan: `/technician/jobs/${id}` });
    if (b.teknisi_id && b.teknisi_id !== teknisiId) {
      await notify(client, { role: 'technician', id: b.teknisi_id, title: 'Penugasan dialihkan', message: `${label(b)} dialihkan ke teknisi lain.`, type: 'booking', bookingId: id });
    }
    await notify(client, { role: 'customer', id: b.customer_id, title: 'Teknisi ditugaskan', message: `Teknisi ${t.nama.split(' ')[0]} akan menangani booking ${label(b)}.`, type: 'booking', bookingId: id, tautan: `/status/${label(b)}` });
    return bookingRow(client, id);
  });
}

async function adminReschedule(id, { jadwal_mulai: input, teknisi_id: newTech, alasan }, user, now = new Date()) {
  const start = parseDateTimeInput(input);
  if (!start) throw E.validation('Jadwal tidak valid.', { jadwal_mulai: 'Format jadwal tidak valid.' });
  return await withTx(async (client) => {
    await client.query("SELECT name FROM scheduling_locks WHERE name='booking-slots' FOR UPDATE");
    const b = await lockBooking(client, id);
    if (!EDITABLE.includes(b.status)) throw E.business(`Jadwal tidak dapat diubah pada status "${b.status}".`);
    const svc = (await client.query('SELECT * FROM service_catalog WHERE id=$1', [b.layanan_id])).rows[0];
    const ops = await bs.getOps(client);
    const end = bs.computeEnd(start, svc.durasi_menit, ops.slot_minutes);
    bs.assertSlotAllowed(start, end, ops, now);
    const teknisi = newTech || b.teknisi_id;
    if (teknisi) await assertTechnicianAssignable(client, teknisi, start, end, id);
    await client.query(
      "UPDATE bookings SET jadwal_mulai=$2, jadwal_selesai=$3, teknisi_id=$4, status='rescheduled', updated_at=now() WHERE id=$1",
      [id, start, end, teknisi || null],
    );
    await client.query('INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan) VALUES ($1,$2,$3,$4,$5)',
      [id, b.status, 'rescheduled', user.nama, alasan]);
    await client.query(
      `INSERT INTO schedule_history (booking_id, jadwal_lama, jadwal_baru, teknisi_lama_id, teknisi_baru_id, alasan, diubah_oleh)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, b.jadwal_mulai, start, b.teknisi_id, teknisi || null, alasan, user.nama],
    );
    await client.query("DELETE FROM reminder_log WHERE booking_id=$1 AND status IN ('pending','failed')", [id]);
    await audit(client, user, 'booking_rescheduled', 'booking', id, {
      before: { jadwal_mulai: b.jadwal_mulai, teknisi_id: b.teknisi_id },
      after: { jadwal_mulai: start, teknisi_id: teknisi || null }, metadata: { alasan, kode: label(b) },
    });
    const msg = `${label(b)} dijadwalkan ulang ke ${formatWib(start)}. Alasan: ${alasan}`;
    await notify(client, { role: 'customer', id: b.customer_id, title: 'Jadwal diubah', message: msg, type: 'booking', bookingId: id, tautan: `/status/${label(b)}` });
    if (teknisi) await notify(client, { role: 'technician', id: teknisi, title: 'Jadwal berubah', message: msg, type: 'booking', bookingId: id, tautan: `/technician/jobs/${id}` });
    if (b.teknisi_id && b.teknisi_id !== teknisi) await notify(client, { role: 'technician', id: b.teknisi_id, title: 'Penugasan dialihkan', message: `${label(b)} tidak lagi ditugaskan kepada Anda.`, type: 'booking', bookingId: id });
    return bookingRow(client, id);
  });
}

async function adminCancel(id, alasan, user) {
  return await bs.cancelBooking(id, { label: user.nama, role: user.role }, alasan);
}

async function reportDelay(id, { kategori, alasan, durasi_tunggu_menit: durasiTunggu }, user) {
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    assertOwnJob(b, user);
    if (!['scheduled', 'rescheduled', 'on process'].includes(b.status)) {
      throw E.business(`Keterlambatan tidak dapat dilaporkan pada status "${b.status}".`);
    }
    const tungguNote = durasiTunggu ? ` (Telah menunggu ${durasiTunggu} menit)` : '';
    const teks = `[${kategori}] ${alasan}${tungguNote}`;
    await client.query('UPDATE bookings SET status=$2, alasan_tunda=$3, updated_at=now() WHERE id=$1', [id, 'delayed', teks]);
    await client.query('INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan) VALUES ($1,$2,$3,$4,$5)',
      [id, b.status, 'delayed', user.nama, teks]);
    await audit(client, user, 'job_delayed', 'booking', id, { before: { status: b.status }, after: { status: 'delayed' }, metadata: { kategori, alasan, durasi_tunggu_menit: durasiTunggu, kode: label(b) } });
    await notify(client, { role: 'admin', title: 'Pekerjaan terlambat', message: `${label(b)} dilaporkan tertunda: ${teks}`, type: 'booking', bookingId: id, tautan: '/admin/bookings?status=delayed' });
    await notify(client, { role: 'customer', id: b.customer_id, title: 'Pekerjaan tertunda', message: `Booking ${label(b)} mengalami keterlambatan. Admin akan menghubungi Anda.`, type: 'booking', bookingId: id, tautan: `/status/${label(b)}` });
    return bookingRow(client, id);
  });
}

async function ensureWorkOrder(client, id, user) {
  await client.query('INSERT INTO work_orders (booking_id, updated_by) VALUES ($1,$2) ON DUPLICATE KEY UPDATE booking_id=booking_id', [id, user.nama]);
}

async function startJob(id, user) {
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    assertOwnJob(b, user);
    if (!b.teknisi_id) throw E.business('Pekerjaan belum memiliki teknisi.');
    if (b.status === 'cancelled') throw E.business('Pekerjaan sudah dibatalkan.');
    if (!bs.TRANSITIONS[b.status].includes('on process')) throw E.business(`Pekerjaan tidak dapat dimulai dari status "${b.status}".`);
    await client.query('UPDATE bookings SET status=$2, mulai_aktual=COALESCE(mulai_aktual, now()), updated_at=now() WHERE id=$1', [id, 'on process']);
    await client.query('INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan) VALUES ($1,$2,$3,$4,$5)',
      [id, b.status, 'on process', user.nama, b.status === 'delayed' ? 'Pekerjaan dilanjutkan' : 'Pekerjaan dimulai']);
    await ensureWorkOrder(client, id, user);
    const has = (await client.query('SELECT 1 FROM work_order_checklists WHERE booking_id=$1 LIMIT 1', [id])).rows.length;
    if (!has) {
      for (const it of DEFAULT_CHECKLIST) {
        await client.query('INSERT INTO work_order_checklists (booking_id, task, wajib) VALUES ($1,$2,$3)', [id, it.task, it.wajib]);
      }
    }
    await audit(client, user, 'job_started', 'booking', id, { before: { status: b.status }, after: { status: 'on process' }, metadata: { kode: label(b) } });
    await notify(client, { role: 'customer', id: b.customer_id, title: 'Teknisi mulai bekerja', message: `Pekerjaan untuk booking ${label(b)} sedang dikerjakan.`, type: 'booking', bookingId: id, tautan: `/status/${label(b)}` });
    return bookingRow(client, id);
  });
}

async function addChecklistItem(id, { task, wajib }, user) {
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    assertOwnJob(b, user);
    if (!['on process', 'delayed'].includes(b.status) && user.role !== 'admin') throw E.business('Checklist hanya dapat diubah saat pekerjaan berjalan.');
    const r = await client.query('INSERT INTO work_order_checklists (booking_id, task, wajib) VALUES ($1,$2,$3) RETURNING *', [id, task, !!wajib]);
    return r.rows[0];
  });
}

async function setChecklistStatus(id, cid, { status, alasan_skip: alasan }, user) {
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    assertOwnJob(b, user);
    if (b.status !== 'on process') throw E.business('Checklist hanya dapat diubah saat pekerjaan berjalan (status "on process").');
    const item = (await client.query('SELECT * FROM work_order_checklists WHERE id=$1 AND booking_id=$2 FOR UPDATE', [cid, id])).rows[0];
    if (!item) throw E.notFound('Item checklist tidak ditemukan.');
    if (status === 'skipped' && item.wajib && !alasan) throw E.validation('Alasan wajib diisi untuk melewati item wajib.', { alasan_skip: 'Alasan wajib diisi.' });
    const r = await client.query(
      'UPDATE work_order_checklists SET status=$3, is_checked=($3=\'completed\'), alasan_skip=$4, waktu=now() WHERE id=$1 AND booking_id=$2 RETURNING *',
      [cid, id, status, status === 'skipped' ? alasan || null : null],
    );
    return r.rows[0];
  });
}

async function saveWorkOrder(id, { diagnosis, rekomendasi, catatan }, user) {
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    assertOwnJob(b, user);
    if (['cancelled'].includes(b.status)) throw E.business('Pekerjaan sudah dibatalkan.');
    const r = await client.query(
      `INSERT INTO work_orders (booking_id, diagnosis, rekomendasi, catatan, updated_by) VALUES ($1,$2,$3,$4,$5)
       ON DUPLICATE KEY UPDATE
         diagnosis = COALESCE($2, work_orders.diagnosis), rekomendasi = COALESCE($3, work_orders.rekomendasi),
         catatan = COALESCE($4, work_orders.catatan), updated_by = $5, updated_at = now() RETURNING *`,
      [id, diagnosis ?? null, rekomendasi ?? null, catatan ?? null, user.nama],
    );
    return r.rows[0];
  });
}

async function addPhoto(id, { tipe, catatan, file }, user) {
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    assertOwnJob(b, user);
    if (!['on process', 'delayed'].includes(b.status)) throw E.business('Foto hanya dapat diunggah saat pekerjaan berjalan.');
    const r = await client.query(
      `INSERT INTO work_order_photos (booking_id, tipe, url_foto, catatan, file_name, mime_type, ukuran_byte, diunggah_oleh)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, tipe, url_foto, catatan, waktu`,
      [id, tipe, `/api/v1/files/${file.storedName}`, catatan || null, file.storedName, file.mime, file.size, user.nama],
    );
    await audit(client, user, 'photo_uploaded', 'booking', id, { metadata: { tipe, kode: label(b) } });
    return r.rows[0];
  });
}

async function removePhoto(id, pid, user) {
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    assertOwnJob(b, user);
    if (b.status === 'done' || b.status === 'cancelled') throw E.business('Foto tidak dapat dihapus setelah pekerjaan selesai/dibatalkan.');
    const r = await client.query('DELETE FROM work_order_photos WHERE id=$1 AND booking_id=$2 RETURNING file_name', [pid, id]);
    if (!r.rows.length) throw E.notFound('Foto tidak ditemukan.');
    return r.rows[0];
  });
}

async function buildServiceReport(client, id) {
  const b = (await client.query(
    `SELECT b.*, c.nama AS customer, c.kontak AS kontak_customer, s.nama_layanan, s.kategori, s.harga,
            t.nama AS teknisi, u.brand, u.model, u.tipe AS tipe_unit, u.kapasitas_pk, u.lokasi AS lokasi_unit
     FROM bookings b JOIN customers c ON c.id=b.customer_id JOIN service_catalog s ON s.id=b.layanan_id
     LEFT JOIN technicians t ON t.id=b.teknisi_id LEFT JOIN ac_units u ON u.id=b.ac_unit_id WHERE b.id=$1`, [id])).rows[0];
  const wo = (await client.query('SELECT diagnosis, rekomendasi, catatan FROM work_orders WHERE booking_id=$1', [id])).rows[0] || {};
  const checklist = (await client.query('SELECT task, status, wajib, alasan_skip FROM work_order_checklists WHERE booking_id=$1 ORDER BY id', [id])).rows;
  const materials = (await client.query(
    `SELECT i.nama, u.jumlah, i.satuan, u.catatan FROM inventory_usage u JOIN inventory i ON i.id=u.item_id WHERE u.booking_id=$1 ORDER BY u.waktu`, [id])).rows;
  const photos = (await client.query('SELECT tipe, url_foto, catatan, waktu FROM work_order_photos WHERE booking_id=$1 ORDER BY waktu', [id])).rows;
  return {
    kode_booking: b.kode_booking,
    customer: { nama: b.customer, kontak: b.kontak_customer, alamat: b.alamat },
    unit_ac: b.brand ? { brand: b.brand, model: b.model, tipe: b.tipe_unit, pk: b.kapasitas_pk, lokasi: b.lokasi_unit } : null,
    layanan: { nama: b.nama_layanan, kategori: b.kategori },
    teknisi: b.teknisi,
    jadwal: { mulai: b.jadwal_mulai, selesai: b.jadwal_selesai },
    waktu_aktual: { mulai: b.mulai_aktual, selesai: b.selesai_aktual || new Date().toISOString() },
    keluhan: b.keluhan,
    checklist, bahan: materials, foto: photos,
    diagnosis: wo.diagnosis || null, rekomendasi: wo.rekomendasi || null, catatan: wo.catatan || null,
  };
}

async function completeJob(id, { override_alasan: overrideAlasan } = {}, user) {
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    assertOwnJob(b, user);
    if (b.status === 'cancelled') throw E.business('Pekerjaan yang dibatalkan tidak dapat diselesaikan.');
    if (b.status !== 'on process') throw E.business(`Pekerjaan hanya dapat diselesaikan dari status "on process" (saat ini "${b.status}").`);
    const pending = (await client.query(
      "SELECT id, task FROM work_order_checklists WHERE booking_id=$1 AND wajib AND status='pending'", [id])).rows;
    if (pending.length) {
      if (!(user.role === 'admin' && overrideAlasan)) {
        throw E.business(`Masih ada ${pending.length} item checklist wajib yang belum selesai.`, { checklist_pending: pending.map((p) => p.task) });
      }
    }

    // BR-18 & BR-19: Wajib melampirkan minimal 1 foto kondisi sebelum (before) dan 1 foto sesudah pengerjaan (after)
    const photoCounts = (await client.query(
      `SELECT tipe, COUNT(*) AS total FROM work_order_photos WHERE booking_id = $1 GROUP BY tipe`, [id]
    )).rows;
    const beforeCount = (photoCounts.find((p) => p.tipe === 'before')?.total) || 0;
    const afterCount = (photoCounts.find((p) => p.tipe === 'after')?.total) || 0;

    if (beforeCount < 1 || afterCount < 1) {
      if (!(user.role === 'admin' && overrideAlasan)) {
        throw E.business(
          `SOP Dokumentasi: Wajib melampirkan minimal 1 foto sebelum pengerjaan (before) dan 1 foto sesudah pengerjaan (after) sebelum menyelesaikan order. (Saat ini: ${beforeCount} foto before, ${afterCount} foto after)`,
          { foto_before: beforeCount, foto_after: afterCount }
        );
      }
    }

    await client.query('UPDATE bookings SET status=$2, selesai_aktual=now(), updated_at=now() WHERE id=$1', [id, 'done']);
    await client.query('INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan) VALUES ($1,$2,$3,$4,$5)',
      [id, 'on process', 'done', user.nama, pending.length ? `Selesai dengan override admin: ${overrideAlasan}` : 'Pekerjaan selesai']);
    const report = await buildServiceReport(client, id);
    await client.query(
      `INSERT INTO service_reports (booking_id, data) VALUES ($1,$2)
       ON DUPLICATE KEY UPDATE data=$2, dibuat_pada=now()`, [id, JSON.stringify(report)]);
    await audit(client, user, 'job_completed', 'booking', id, { before: { status: 'on process' }, after: { status: 'done' }, metadata: { kode: label(b), override: pending.length ? overrideAlasan : null } });
    await notify(client, { role: 'customer', id: b.customer_id, title: 'Service selesai', message: `Booking ${label(b)} telah selesai. Berikan penilaian Anda.`, type: 'booking', bookingId: id, tautan: `/feedback/${label(b)}` });
    await notify(client, { role: 'admin', title: 'Pekerjaan selesai', message: `${label(b)} diselesaikan oleh ${user.nama}.`, type: 'booking', bookingId: id, tautan: '/admin/bookings' });
    return bookingRow(client, id);
  });
}

/** Detail pekerjaan lengkap (dipakai teknisi & admin). Kontrol akses: teknisi hanya pekerjaannya. */
async function jobDetail(id, user) {
  const b = (await query(
    `SELECT b.id, b.kode_booking, b.jadwal_mulai, b.jadwal_selesai, b.status, b.alamat, b.keluhan, b.teknisi_id, b.alasan_tunda, b.alasan_batal,
            b.mulai_aktual, b.selesai_aktual, b.customer_id, b.ac_unit_id,
            c.nama AS nama_customer, c.kontak AS kontak_customer,
            s.nama_layanan, s.durasi_menit, s.kategori, t.nama AS nama_teknisi,
            u.brand, u.model, u.tipe, u.kapasitas_pk, u.lokasi, u.catatan AS catatan_unit, u.tanggal_pasang
     FROM bookings b JOIN customers c ON c.id=b.customer_id JOIN service_catalog s ON s.id=b.layanan_id
     LEFT JOIN technicians t ON t.id=b.teknisi_id LEFT JOIN ac_units u ON u.id=b.ac_unit_id WHERE b.id=$1`, [id])).rows[0];
  if (!b) throw E.notFound('Pekerjaan tidak ditemukan.');
  assertOwnJob(b, user);
  const [wo, cl, ph, mt, notes, sh, hist, rep] = await Promise.all([
    query('SELECT diagnosis, rekomendasi, catatan FROM work_orders WHERE booking_id=$1', [id]),
    query('SELECT id, task, status, wajib, alasan_skip FROM work_order_checklists WHERE booking_id=$1 ORDER BY id', [id]),
    query('SELECT id, tipe, url_foto, catatan, waktu FROM work_order_photos WHERE booking_id=$1 ORDER BY waktu DESC', [id]),
    query(`SELECT u.id, u.jumlah, u.catatan, u.waktu, i.nama, i.satuan FROM inventory_usage u JOIN inventory i ON i.id=u.item_id WHERE u.booking_id=$1 ORDER BY u.waktu DESC`, [id]),
    query('SELECT id, catatan, waktu, diubah_oleh, status_baru FROM status_log WHERE booking_id=$1 AND catatan IS NOT NULL ORDER BY waktu DESC, id DESC', [id]),
    query(`SELECT h.jadwal_lama, h.jadwal_baru, h.alasan, h.diubah_oleh, h.waktu, tl.nama AS teknisi_lama, tb.nama AS teknisi_baru
           FROM schedule_history h LEFT JOIN technicians tl ON tl.id=h.teknisi_lama_id LEFT JOIN technicians tb ON tb.id=h.teknisi_baru_id
           WHERE h.booking_id=$1 ORDER BY h.waktu DESC`, [id]),
    b.ac_unit_id ? query(
      `SELECT b2.kode_booking, b2.jadwal_mulai, b2.status, s2.nama_layanan FROM bookings b2 JOIN service_catalog s2 ON s2.id=b2.layanan_id
       WHERE b2.ac_unit_id=$1 AND b2.id<>$2 ORDER BY b2.jadwal_mulai DESC LIMIT 5`, [b.ac_unit_id, id]) : { rows: [] },
    query('SELECT data, dibuat_pada FROM service_reports WHERE booking_id=$1', [id]),
  ]);
  const wajibPending = cl.rows.filter((c) => c.wajib && c.status === 'pending').length;
  return {
    ...b,
    work_order: wo.rows[0] || { diagnosis: null, rekomendasi: null, catatan: null },
    checklists: cl.rows, photos: ph.rows, materials: mt.rows, notes: notes.rows,
    riwayat_jadwal: sh.rows, riwayat_unit: hist.rows,
    laporan: rep.rows[0] || null,
    aksi: {
      bisa_mulai: !!b.teknisi_id && ['scheduled', 'rescheduled', 'delayed'].includes(b.status),
      bisa_selesai: b.status === 'on process' && wajibPending === 0,
      bisa_tunda: ['scheduled', 'rescheduled', 'on process'].includes(b.status),
      checklist_wajib_tersisa: wajibPending,
    },
  };
}

module.exports = {
  DELAY_CATEGORIES, assertTechnicianAssignable, recommendTechnicians, assign, adminReschedule, adminCancel,
  reportDelay, startJob, addChecklistItem, setChecklistStatus, saveWorkOrder, addPhoto, removePhoto,
  completeJob, jobDetail, buildServiceReport,
};
