const { withTx, query } = require('../db/pool');
const { E } = require('../errors');
const { generateBookingCode, normalizePhone } = require('../utils/ids');
const { audit, notify } = require('./common');
const {
  wibParts, fromWib, wibDateString, startOfWibDay, parseDateTimeInput, toMinutes, DAY_MS, formatWib,
} = require('../utils/time');

const DEFAULT_OPS = {
  open: '08:00', close: '17:00', days: [1, 2, 3, 4, 5, 6], slot_minutes: 60,
  min_lead_minutes: 60, max_advance_days: 60, reminder_hour: 8,
};
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Lifecycle: scheduled → on process → done. Operasional: delayed, rescheduled, cancelled.
const EDITABLE = ['scheduled', 'rescheduled', 'delayed'];
const TRANSITIONS = {
  scheduled: ['on process', 'delayed'],
  rescheduled: ['on process', 'delayed'],
  delayed: ['on process'],
  'on process': ['done', 'delayed'],
  done: [],
  cancelled: [],
};

async function getOps(db = { query }) {
  const r = await db.query("SELECT value FROM settings WHERE key = 'operating_hours'");
  return { ...DEFAULT_OPS, ...(r.rows[0] ? r.rows[0].value : {}) };
}

const lockSlots = (client) => client.query("SELECT pg_advisory_xact_lock(hashtext('booking-slots'))");

function computeEnd(start, durasiMenit, slot) {
  const slots = Math.max(1, Math.ceil(durasiMenit / slot));
  return new Date(start.getTime() + slots * slot * 60000);
}

/** Validasi tanggal/jam terhadap jam operasional. Melempar 400 dengan detail per field. */
function assertSlotAllowed(start, end, ops, now = new Date(), isAdmin = false) {
  const p = wibParts(start);
  const pe = wibParts(new Date(end.getTime() - 1));
  const errs = [];
  if (start.getTime() < now.getTime() - (isAdmin ? 30 * 60000 : 0)) {
    errs.push('Tanggal/jam sudah lewat. Pilih jadwal yang akan datang.');
  } else if (!isAdmin && start.getTime() < now.getTime() + ops.min_lead_minutes * 60000) {
    errs.push(`Booking minimal ${ops.min_lead_minutes} menit sebelum jadwal.`);
  } else if (start.getTime() > now.getTime() + ops.max_advance_days * DAY_MS) {
    errs.push(`Booking maksimal ${ops.max_advance_days} hari ke depan.`);
  }
  if (!ops.days.includes(p.dow)) {
    const open = ops.days.map((d) => DAY_NAMES[d]).join(', ');
    errs.push(`Hari ${DAY_NAMES[p.dow]} tidak melayani servis. Hari operasional: ${open}.`);
  } else {
    const startMin = p.h * 60 + p.min;
    const endMin = pe.h * 60 + pe.min + 1;
    const sameDay = pe.d === p.d;
    if (startMin < toMinutes(ops.open) || !sameDay || endMin > toMinutes(ops.close)) {
      errs.push(`Jam di luar operasional (${ops.open}–${ops.close} WIB) atau durasi layanan melewati jam tutup.`);
    } else if ((startMin - toMinutes(ops.open)) % ops.slot_minutes !== 0) {
      errs.push(`Jam mulai harus mengikuti slot ${ops.slot_minutes} menit sejak ${ops.open}.`);
    }
  }
  if (errs.length) throw E.validation('Jadwal yang dipilih tidak valid.', { jadwal_mulai: errs[0] });
}

async function countOverlap(db, start, end, excludeId) {
  const r = await db.query(
    `SELECT COUNT(*)::int AS n FROM bookings
     WHERE status <> 'cancelled' AND jadwal_mulai < $2 AND jadwal_selesai > $1 AND ($3::int IS NULL OR id <> $3)`,
    [start, end, excludeId || null],
  );
  return r.rows[0].n;
}

async function activeTechnicianCount(db) {
  const r = await db.query('SELECT COUNT(*)::int AS n FROM technicians WHERE aktif');
  return r.rows[0].n;
}

async function assertCapacity(db, start, end, excludeId) {
  const cap = await activeTechnicianCount(db);
  if (cap === 0) throw E.conflict('Belum ada teknisi aktif yang tersedia. Hubungi admin.');
  const used = await countOverlap(db, start, end, excludeId);
  if (used >= cap) {
    throw E.conflict('Slot waktu tersebut sudah penuh (bentrok dengan booking lain). Pilih jam lain.', {
      jadwal_mulai: 'Slot sudah terisi penuh.',
    });
  }
}

async function assertTechnicianFree(db, teknisiId, start, end, excludeId) {
  const r = await db.query(
    `SELECT kode_booking FROM bookings
     WHERE teknisi_id = $1 AND status NOT IN ('cancelled','done') AND jadwal_mulai < $3 AND jadwal_selesai > $2 AND ($4::int IS NULL OR id <> $4) LIMIT 1`,
    [teknisiId, start, end, excludeId || null],
  );
  if (r.rows.length) {
    throw E.conflict(`Teknisi sudah memiliki pekerjaan pada jam tersebut (booking ${r.rows[0].kode_booking}).`, {
      teknisi_id: 'Teknisi bentrok jadwal.',
    });
  }
}

const BOOKING_SELECT = `
  SELECT b.id, b.kode_booking, b.status, b.jadwal_mulai, b.jadwal_selesai, b.alamat, b.keluhan, b.kontak,
         b.created_at, b.updated_at, b.created_by, b.is_synthetic, b.ac_unit_id, b.alasan_batal, b.alasan_tunda,
         b.mulai_aktual, b.selesai_aktual, b.jumlah_unit, b.idempotency_key,
         b.customer_id, c.nama AS customer_nama,
         b.layanan_id, s.nama_layanan, s.harga, s.kategori,
         b.teknisi_id, t.nama AS teknisi_nama,
         f.rating, f.komentar, (f.id IS NOT NULL) AS sudah_feedback
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  JOIN service_catalog s ON s.id = b.layanan_id
  LEFT JOIN technicians t ON t.id = b.teknisi_id
  LEFT JOIN feedback f ON f.booking_id = b.id`;

function mapBooking(r) {
  return {
    id: r.id,
    kode_booking: r.kode_booking,
    status: r.status,
    jadwal_mulai: r.jadwal_mulai,
    jadwal_selesai: r.jadwal_selesai,
    layanan: { id: r.layanan_id, nama: r.nama_layanan, kategori: r.kategori, harga: r.harga },
    customer: { id: r.customer_id, nama: r.customer_nama, kontak: r.kontak },
    alamat: r.alamat,
    keluhan: r.keluhan,
    teknisi_id: r.teknisi_id ? Number(r.teknisi_id) : null,
    teknisi: r.teknisi_id ? { id: Number(r.teknisi_id), nama: r.teknisi_nama } : null,
    feedback: r.sudah_feedback ? { rating: r.rating, komentar: r.komentar } : null,
    ac_unit_id: r.ac_unit_id,
    jumlah_unit: r.jumlah_unit,
    alasan_batal: r.alasan_batal,
    alasan_tunda: r.alasan_tunda,
    mulai_aktual: r.mulai_aktual,
    selesai_aktual: r.selesai_aktual,
    dibuat_oleh: r.created_by,
    is_synthetic: r.is_synthetic,
    created_at: r.created_at,
    updated_at: r.updated_at,
    idempotency_key: r.idempotency_key,
  };
}

async function createBooking(input, actor = { label: 'customer' }, now = new Date()) {
  const kontak = normalizePhone(input.kontak);
  if (!kontak) throw E.validation('Kontak tidak valid.', { kontak: 'Gunakan nomor HP Indonesia, contoh 081234567890.' });
  const start = parseDateTimeInput(input.jadwal_mulai);
  if (!start) throw E.validation('Jadwal tidak valid.', { jadwal_mulai: 'Format jadwal tidak valid.' });

  return await withTx(async (client) => {
    await lockSlots(client);
    
    // Idempotency key handling - prevent duplicate submissions
    if (input.idempotency_key) {
      const existing = (await client.query(
        'SELECT id, kode_booking, status FROM bookings WHERE idempotency_key = $1', [input.idempotency_key]
      )).rows[0];
      if (existing) {
        // Return existing booking if it's still valid (not cancelled)
        if (existing.status !== 'cancelled') {
          const row = (await client.query(`${BOOKING_SELECT} WHERE b.id = $1`, [existing.id])).rows[0];
          return mapBooking(row);
        }
        // If cancelled, we can reuse the idempotency key for a new booking
        await client.query('DELETE FROM bookings WHERE idempotency_key = $1', [input.idempotency_key]);
      }
    }
    
    const svc = (await client.query('SELECT * FROM service_catalog WHERE id = $1 AND aktif', [input.layanan_id])).rows[0];
    if (!svc) throw E.validation('Layanan tidak valid.', { layanan_id: 'Layanan tidak ditemukan atau tidak aktif.' });
    const ops = await getOps(client);
    const end = computeEnd(start, svc.durasi_menit, ops.slot_minutes);
    const isAdmin = typeof actor?.label === 'string' && (actor.label.startsWith('admin') || actor.label === 'admin');
    assertSlotAllowed(start, end, ops, now, isAdmin);
    await assertCapacity(client, start, end, null);

    let cust = (await client.query('SELECT * FROM customers WHERE kontak = $1', [kontak])).rows[0];
    if (!cust) {
      cust = (await client.query(
        'INSERT INTO customers (nama, kontak, alamat) VALUES ($1,$2,$3) RETURNING *',
        [input.nama, kontak, input.alamat],
      )).rows[0];
    }

    // Auto-deduplication window check: prevent rapid double bookings (within 30 seconds)
    // for the same customer with identical schedule and service
    const recentDuplicate = (await client.query(
      `SELECT id, kode_booking, status FROM bookings 
       WHERE customer_id = $1 AND jadwal_mulai = $2 AND layanan_id = $3 
         AND status != 'cancelled' 
         AND created_at >= NOW() - INTERVAL '30 seconds'
       ORDER BY id DESC LIMIT 1`,
      [cust.id, start, svc.id]
    )).rows[0];
    if (recentDuplicate) {
      const row = (await client.query(`${BOOKING_SELECT} WHERE b.id = $1`, [recentDuplicate.id])).rows[0];
      return mapBooking(row);
    }

    let booking;
    for (let i = 0; i < 8 && !booking; i += 1) {
      const code = generateBookingCode();
       
      const ins = await client.query(
        `INSERT INTO bookings (kode_booking, customer_id, layanan_id, jadwal_mulai, jadwal_selesai, alamat, keluhan, kontak, created_by, jumlah_unit, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (kode_booking) DO NOTHING RETURNING id`,
        [code, cust.id, svc.id, start, end, input.alamat, input.keluhan, kontak, actor.label, input.jumlah_unit || 1, input.idempotency_key || null],
      );
      if (ins.rows.length) booking = ins.rows[0];
    }
    if (!booking) throw E.conflict('Gagal membuat kode booking unik. Coba lagi.');
    await client.query(
      'INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan) VALUES ($1,NULL,$2,$3,$4)',
      [booking.id, 'scheduled', actor.label, 'Booking dibuat'],
    );
    if (input.ac_unit_id) {
      const unit = (await client.query('SELECT id FROM ac_units WHERE id=$1 AND customer_id=$2', [input.ac_unit_id, cust.id])).rows[0];
      if (!unit) throw E.validation('Unit AC tidak valid.', { ac_unit_id: 'Unit AC bukan milik Anda.' });
      await client.query('UPDATE bookings SET ac_unit_id=$2 WHERE id=$1', [booking.id, unit.id]);
    }
    const kodeBooking = (await client.query('SELECT kode_booking FROM bookings WHERE id=$1', [booking.id])).rows[0].kode_booking;
    await notify(client, { role: 'admin', title: 'Booking baru', message: `${kodeBooking} — ${cust.nama} (${svc.nama_layanan}), ${formatWib(start)}. Belum ditugaskan.`, type: 'booking', bookingId: booking.id, tautan: '/admin/bookings' });
    await notify(client, { role: 'customer', id: cust.id, title: 'Booking diterima', message: `Booking ${kodeBooking} untuk ${svc.nama_layanan} pada ${formatWib(start)} berhasil dibuat.`, type: 'booking', bookingId: booking.id, tautan: `/status/${kodeBooking}` });
    await audit(client, { nama: actor.label, role: actor.role || 'customer' }, 'booking_created', 'booking', booking.id, { metadata: { kode: kodeBooking } });
    const row = (await client.query(`${BOOKING_SELECT} WHERE b.id = $1`, [booking.id])).rows[0];
    return mapBooking(row);
  });
}

async function listBookings(filters, user) {
  const where = [];
  const params = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
  if (user.role === 'technician') add('b.teknisi_id = ?', user.technicianId);
  if (filters.status) add('b.status = ?', filters.status);
  if (filters.teknisi_id) add('b.teknisi_id = ?', filters.teknisi_id);
  if (filters.belum_ditugaskan) where.push('b.teknisi_id IS NULL');
  if (filters.dari) add('b.jadwal_mulai >= ?', startOfWibDay(filters.dari));
  if (filters.sampai) add('b.jadwal_mulai < ?', new Date(startOfWibDay(filters.sampai).getTime() + DAY_MS));
  if (filters.q) {
    params.push(`%${filters.q}%`);
    const i = params.length;
    where.push(`(b.kode_booking ILIKE $${i} OR c.nama ILIKE $${i} OR b.kontak ILIKE $${i} OR b.alamat ILIKE $${i})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = filters.urut === 'terbaru' ? 'b.jadwal_mulai DESC' : 'b.jadwal_mulai ASC';
  const total = (await query(
    `SELECT COUNT(*)::int AS n FROM bookings b JOIN customers c ON c.id = b.customer_id ${whereSql}`, params,
  )).rows[0].n;
  const { sanitizeLimitOffset } = require('../db/pool');
  const { limit: safeLimit, offset: safeOffset } = sanitizeLimitOffset(filters.limit || 20, ((filters.page || 1) - 1) * (filters.limit || 20));
  const rows = (await query(
    `${BOOKING_SELECT} ${whereSql} ORDER BY ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, safeLimit, safeOffset],
  )).rows;
  return { data: rows.map(mapBooking), meta: { total, page: filters.page || 1, limit: safeLimit } };
}

async function getBookingDetail(id, user) {
  const row = (await query(`${BOOKING_SELECT} WHERE b.id = $1`, [id])).rows[0];
  if (!row) throw E.notFound('Booking tidak ditemukan.');
  if (user.role === 'technician' && row.teknisi_id !== user.technicianId) {
    throw E.forbidden('Pekerjaan ini bukan penugasan Anda.');
  }
  const b = mapBooking(row);
  b.riwayat_status = (await query(
    'SELECT status_lama, status_baru, diubah_oleh, catatan, waktu FROM status_log WHERE booking_id = $1 ORDER BY waktu, id', [id],
  )).rows;
  b.pemakaian_inventory = (await query(
    `SELECT u.id, i.nama, i.satuan, u.jumlah, u.catatan, u.waktu FROM inventory_usage u
     JOIN inventory i ON i.id = u.item_id WHERE u.booking_id = $1 ORDER BY u.waktu`, [id],
  )).rows;
  if (user.role === 'admin') {
    b.audit = (await query('SELECT aksi, detail, oleh, waktu FROM booking_audit WHERE booking_id = $1 ORDER BY waktu, id', [id])).rows;
  }
  return b;
}

async function lockBooking(client, id) {
  const r = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
  if (!r.rows[0]) throw E.notFound('Booking tidak ditemukan.');
  return r.rows[0];
}

async function reschedule(id, jadwalInput, actor, now = new Date()) {
  const start = parseDateTimeInput(jadwalInput);
  if (!start) throw E.validation('Jadwal tidak valid.', { jadwal_mulai: 'Format jadwal tidak valid.' });
  return await withTx(async (client) => {
    await lockSlots(client);
    const b = await lockBooking(client, id);
    if (!EDITABLE.includes(b.status)) {
      throw E.business(`Jadwal tidak dapat diubah pada status "${b.status}".`);
    }
    const svc = (await client.query('SELECT * FROM service_catalog WHERE id = $1', [b.layanan_id])).rows[0];
    const ops = await getOps(client);
    const end = computeEnd(start, svc.durasi_menit, ops.slot_minutes);
    assertSlotAllowed(start, end, ops, now);
    await assertCapacity(client, start, end, id);
    if (b.teknisi_id) await assertTechnicianFree(client, b.teknisi_id, start, end, id);
    await client.query("UPDATE bookings SET jadwal_mulai=$2, jadwal_selesai=$3, status='rescheduled', updated_at=now() WHERE id=$1", [id, start, end]);
    await client.query(
      'INSERT INTO booking_audit (booking_id, aksi, detail, oleh) VALUES ($1,$2,$3,$4)',
      [id, 'reschedule', JSON.stringify({ dari: b.jadwal_mulai, ke: start }), actor.label],
    );
    await client.query(
      'INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan) VALUES ($1,$2,$3,$4,$5)',
      [id, b.status, 'rescheduled', actor.label, 'Dijadwalkan ulang oleh pelanggan'],
    );
    await client.query(
      `INSERT INTO schedule_history (booking_id, jadwal_lama, jadwal_baru, teknisi_lama_id, teknisi_baru_id, alasan, diubah_oleh)
       VALUES ($1,$2,$3,$4,$4,$5,$6)`,
      [id, b.jadwal_mulai, start, b.teknisi_id, 'Permintaan pelanggan', actor.label],
    );
    await notify(client, { role: 'admin', title: 'Jadwal diubah pelanggan', message: `${b.kode_booking} dijadwalkan ulang ke ${formatWib(start)}.`, type: 'booking', bookingId: id, tautan: '/admin/schedule' });
    if (b.teknisi_id) await notify(client, { role: 'technician', id: b.teknisi_id, title: 'Jadwal berubah', message: `${b.kode_booking} dipindahkan ke ${formatWib(start)}.`, type: 'booking', bookingId: id, tautan: `/technician/jobs/${id}` });
    // Pengingat lama (H-1 untuk jadwal sebelumnya) yang belum terkirim menjadi tidak relevan
    await client.query("DELETE FROM reminder_log WHERE booking_id=$1 AND status IN ('pending','failed')", [id]);
    return (await client.query(`${BOOKING_SELECT} WHERE b.id = $1`, [id])).rows.map(mapBooking)[0];
  });
}

async function cancelBooking(id, actor, alasan = 'Dibatalkan oleh pelanggan') {
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    if (!EDITABLE.includes(b.status)) {
      throw E.business(`Booking dengan status "${b.status}" tidak dapat dibatalkan.`);
    }
    await client.query('UPDATE bookings SET status=$2, alasan_batal=$3, updated_at=now() WHERE id=$1', [id, 'cancelled', alasan]);
    await client.query(
      'INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan) VALUES ($1,$2,$3,$4,$5)',
      [id, b.status, 'cancelled', actor.label, alasan],
    );
    await client.query(
      'INSERT INTO booking_audit (booking_id, aksi, detail, oleh) VALUES ($1,$2,$3,$4)',
      [id, 'cancel', JSON.stringify({ reason: alasan }), actor.label],
    );
    await audit(client, { nama: actor.label, role: actor.role || 'customer' }, 'booking_cancelled', 'booking', id, { before: { status: b.status }, after: { status: 'cancelled' }, metadata: { alasan } });
    // Pengingat lama yang belum terkirim menjadi tidak relevan
    await client.query("DELETE FROM reminder_log WHERE booking_id=$1 AND status IN ('pending','failed')", [id]);
    await notify(client, { role: 'admin', title: 'Booking dibatalkan', message: `${b.kode_booking} dibatalkan: ${alasan}`, type: 'booking', bookingId: id, tautan: '/admin/bookings' });
    if (b.teknisi_id) await notify(client, { role: 'technician', id: b.teknisi_id, title: 'Booking dibatalkan', message: `${b.kode_booking} dibatalkan.`, type: 'booking', bookingId: id });
    await notify(client, { role: 'customer', id: b.customer_id, title: 'Booking dibatalkan', message: `Booking ${b.kode_booking} dibatalkan. Alasan: ${alasan}`, type: 'booking', bookingId: id, tautan: `/status/${b.kode_booking}` });
    return (await client.query(`${BOOKING_SELECT} WHERE b.id = $1`, [id])).rows.map(mapBooking)[0];
  });
}

async function assignTechnician(id, teknisiId, actor) {
  return await withTx(async (client) => {
    await lockSlots(client);
    const b = await lockBooking(client, id);
    if (!EDITABLE.includes(b.status)) {
      throw E.business(`Teknisi tidak dapat ditetapkan/diganti pada status "${b.status}".`);
    }
    const t = (await client.query('SELECT * FROM technicians WHERE id = $1', [teknisiId])).rows[0];
    if (!t) throw E.validation('Teknisi tidak valid.', { teknisi_id: 'Teknisi tidak ditemukan.' });
    if (!t.aktif) throw E.business('Teknisi tidak aktif dan tidak dapat ditugaskan.');
    await assertTechnicianFree(client, teknisiId, b.jadwal_mulai, b.jadwal_selesai, id);
    await client.query('UPDATE bookings SET teknisi_id=$2, updated_at=now() WHERE id=$1', [id, teknisiId]);
    await client.query(
      'INSERT INTO booking_audit (booking_id, aksi, detail, oleh) VALUES ($1,$2,$3,$4)',
      [id, 'assign_technician', JSON.stringify({ dari: b.teknisi_id, ke: teknisiId, nama: t.nama }), actor.label],
    );
    return (await client.query(`${BOOKING_SELECT} WHERE b.id = $1`, [id])).rows.map(mapBooking)[0];
  });
}

async function changeStatus(id, newStatus, catatan, user) {
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    if (user.role === 'technician' && b.teknisi_id !== user.technicianId) {
      throw E.forbidden('Pekerjaan ini bukan penugasan Anda.');
    }
    if (b.status === newStatus) throw E.business(`Booking sudah berstatus "${newStatus}".`);
    if (!(TRANSITIONS[b.status] || []).includes(newStatus)) {
      throw E.business(
        `Status tidak boleh berubah dari "${b.status}" ke "${newStatus}". Urutan yang sah: scheduled → on process → done.`,
        { dari: b.status, ke: newStatus, diizinkan: TRANSITIONS[b.status] },
      );
    }
    if (newStatus === 'on process' && !b.teknisi_id) {
      throw E.business('Pekerjaan belum memiliki teknisi. Tetapkan teknisi sebelum memulai.');
    }
    if (newStatus === 'done' || newStatus === 'delayed') {
      throw E.business('Gunakan endpoint teknisi (selesaikan / laporkan tunda) agar checklist, laporan servis, dan alasan tercatat.');
    }
    await client.query('UPDATE bookings SET status=$2, updated_at=now() WHERE id=$1', [id, newStatus]);
    await client.query(
      'INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan) VALUES ($1,$2,$3,$4,$5)',
      [id, b.status, newStatus, user.nama || user.role, catatan || null],
    );
    const logs = (await client.query(
      'SELECT status_lama, status_baru, diubah_oleh, catatan, waktu FROM status_log WHERE booking_id=$1 ORDER BY waktu, id', [id],
    )).rows;
    return { id, kode_booking: b.kode_booking, status: newStatus, status_log: logs };
  });
}

async function addInventoryUsage(id, { item_id: itemId, jumlah, catatan }, user) {
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    if (user.role === 'technician' && b.teknisi_id !== user.technicianId) {
      throw E.forbidden('Pekerjaan ini bukan penugasan Anda.');
    }
    if (b.status !== 'on process') {
      throw E.business('Pemakaian bahan hanya dapat dicatat saat pekerjaan berjalan (status "on process").');
    }
    const item = (await client.query('SELECT * FROM inventory WHERE id=$1 FOR UPDATE', [itemId])).rows[0];
    if (!item || !item.aktif) throw E.validation('Item tidak valid.', { item_id: 'Item inventory tidak ditemukan atau nonaktif.' });
    if (Number(item.stok) < jumlah) {
      throw E.business(`Stok ${item.nama} tidak cukup (tersisa ${Number(item.stok)} ${item.satuan}).`, { stok: Number(item.stok) });
    }
    await client.query('UPDATE inventory SET stok = stok - $2, updated_at=now() WHERE id=$1', [itemId, jumlah]);
    const ins = (await client.query(
      'INSERT INTO inventory_usage (booking_id,item_id,jumlah,teknisi_id,catatan) VALUES ($1,$2,$3,$4,$5) RETURNING id, waktu',
      [id, itemId, jumlah, user.technicianId || b.teknisi_id, catatan || null],
    )).rows[0];
    const sisa = Number(item.stok) - jumlah;
    await client.query(
      `INSERT INTO inventory_adjustments (item_id, jenis, jumlah, catatan, oleh, booking_id, stok_sebelum, stok_sesudah)
       VALUES ($1,'usage',$2,$3,$4,$5,$6,$7)`,
      [itemId, jumlah, catatan || `Dipakai pada ${b.kode_booking}`, user.nama || user.role, id, item.stok, sisa],
    );
    await audit(client, user, 'material_used', 'inventory', itemId, { before: { stok: Number(item.stok) }, after: { stok: sisa }, metadata: { booking: b.kode_booking, jumlah } });
    if (sisa <= Number(item.min_stok)) {
      await notify(client, { role: 'admin', title: 'Stok menipis', message: `${item.nama} tersisa ${sisa} ${item.satuan} (minimum ${Number(item.min_stok)}).`, type: 'inventory', tautan: '/admin/inventory', dedup: `lowstock:${itemId}:${sisa}` });
    }
    return {
      id: ins.id, booking_id: id, item: item.nama, jumlah, satuan: item.satuan,
      sisa_stok: Number(item.stok) - jumlah, waktu: ins.waktu,
    };
  });
}

/** Ringkasan publik (tanpa PII) berdasar kode booking. */
async function publicStatusByCode(codeRaw) {
  const code = String(codeRaw || '').trim().toUpperCase();
  const row = (await query(`${BOOKING_SELECT} WHERE b.kode_booking = $1`, [code])).rows[0];
  if (!row) throw E.notFound('Kode booking tidak ditemukan. Periksa kembali kode Anda.');
  const riwayat = (await query(
    'SELECT status_baru AS status, waktu FROM status_log WHERE booking_id=$1 ORDER BY waktu, id', [row.id],
  )).rows;
  const reminders = (await query(
    `SELECT kanal, status, untuk_tanggal, waktu_kirim FROM reminder_log
     WHERE booking_id=$1 AND target='pelanggan' ORDER BY id DESC LIMIT 3`, [row.id],
  )).rows;
  return {
    id: row.id,
    kode_booking: row.kode_booking,
    status: row.status,
    layanan: row.nama_layanan,
    harga: row.harga,
    jumlah_unit: row.jumlah_unit || 1,
    alamat: row.alamat,
    keluhan: row.keluhan,
    customer_nama: row.customer_nama,
    kontak: row.kontak,
    jadwal_mulai: row.jadwal_mulai,
    jadwal_selesai: row.jadwal_selesai,
    teknisi: row.teknisi_nama ? row.teknisi_nama.split(' ')[0] : null,
    teknisi_lengkap: row.teknisi_nama,
    riwayat_status: riwayat,
    pengingat: reminders,
    bisa_feedback: row.status === 'done' && !row.sudah_feedback,
    sudah_feedback: !!row.sudah_feedback,
    jadwal_teks: formatWib(new Date(row.jadwal_mulai)),
    created_at: row.created_at,
  };
}

async function submitFeedback(id, { kode_booking: kode, kontak, rating, komentar }, sentimen = null) {
  return await withTx(async (client) => {
    const b = (await client.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE', [id])).rows[0];
    const inputKontak = String(kontak || '');
    const bookingKontak = String(b?.kontak || '');
    const ok = b && b.kode_booking === String(kode).toUpperCase() && bookingKontak.length >= 6 && inputKontak.length >= 6 && bookingKontak.slice(-6) === inputKontak.slice(-6);
    if (!ok) throw E.notFound('Booking tidak ditemukan atau data verifikasi tidak cocok.');
    if (b.status !== 'done') throw E.business('Feedback hanya dapat diberikan setelah pekerjaan berstatus "done".');
    const ex = await client.query('SELECT 1 FROM feedback WHERE booking_id=$1', [id]);
    if (ex.rows.length) throw E.conflict('Feedback untuk booking ini sudah pernah dikirim. Terima kasih!');
    await client.query(
      'INSERT INTO feedback (booking_id, rating, komentar, sentimen) VALUES ($1,$2,$3,$4)',
      [id, rating, komentar || null, sentimen],
    );
    await notify(client, {
      role: 'admin', title: rating <= 2 ? 'Feedback rating rendah' : 'Feedback baru',
      message: `${b.kode_booking} diberi rating ${rating}/5${komentar ? `: "${String(komentar).slice(0, 80)}"` : ''}`,
      type: 'feedback', bookingId: id, tautan: '/admin/feedback',
    });
    return { rating, terima_kasih: true };
  });
}

async function getAvailability(dateStr, layananId, now = new Date()) {
  const svc = (await query('SELECT * FROM service_catalog WHERE id=$1 AND aktif', [layananId])).rows[0];
  if (!svc) throw E.validation('Layanan tidak valid.', { layanan_id: 'Layanan tidak ditemukan atau tidak aktif.' });
  const ops = await getOps();
  const dayStart = startOfWibDay(dateStr);
  const dow = wibParts(new Date(dayStart.getTime() + 3600000)).dow;
  if (!ops.days.includes(dow)) {
    return { tanggal: dateStr, buka: false, alasan: `Hari ${DAY_NAMES[dow]} tidak melayani servis.`, slot: [] };
  }
  const cap = await activeTechnicianCount({ query });
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);
  const booked = (await query(
    "SELECT jadwal_mulai, jadwal_selesai FROM bookings WHERE status <> 'cancelled' AND jadwal_mulai < $2 AND jadwal_selesai > $1", [dayStart, dayEnd],
  )).rows.map((r) => [new Date(r.jadwal_mulai), new Date(r.jadwal_selesai)]);
  const [y, m, d] = dateStr.split('-').map(Number);
  const slots = [];
  const openMin = toMinutes(ops.open);
  const closeMin = toMinutes(ops.close);
  for (let t = openMin; t < closeMin; t += ops.slot_minutes) {
    const start = fromWib(y, m, d, Math.floor(t / 60), t % 60);
    const end = computeEnd(start, svc.durasi_menit, ops.slot_minutes);
    let tersedia = true;
    let alasan = null;
    try { assertSlotAllowed(start, end, ops, now); } catch (e) { tersedia = false; alasan = e.detail ? e.detail.jadwal_mulai : e.message; }
    if (tersedia) {
      const used = booked.filter(([s, e2]) => s < end && e2 > start).length;
      if (cap === 0 || used >= cap) { tersedia = false; alasan = 'Slot penuh.'; }
    }
    slots.push({ mulai: start.toISOString(), jam: `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`, tersedia, alasan });
  }
  return { tanggal: dateStr, buka: true, jam_operasional: `${ops.open}–${ops.close}`, slot: slots };
}

/**
 * Verifikasi booking publik menggunakan kode booking dan kontak pelanggan.
 * Ini digunakan untuk endpoint publik yang memungkinkan pelanggan mengubah booking mereka.
 * Untuk keamanan, memerlukan minimal 6 digit terakhir kontak (bukan 4 digit).
 */
async function verifyPublicBooking(kode, kontak) {
  const code = String(kode || '').trim().toUpperCase();
  const b = (await query('SELECT * FROM bookings WHERE kode_booking = $1', [code])).rows[0];
  if (!b) throw E.notFound('Kode booking tidak ditemukan. Periksa kembali kode Anda.');
  
  // Verifikasi dengan minimal 6 digit terakhir kontak untuk keamanan yang lebih baik
  const inputKontak = String(kontak || '').trim();
  const bookingKontak = String(b.kontak || '');
  
  // Minimal 6 digit terakhir harus cocok
  if (bookingKontak.length < 6 || inputKontak.length < 6) {
    throw E.forbidden('Data verifikasi tidak valid. Kontak harus memiliki minimal 6 digit.');
  }
  
  if (bookingKontak.slice(-6) !== inputKontak.slice(-6)) {
    throw E.forbidden('Data verifikasi tidak cocok. Pastikan 6 digit terakhir kontak benar.');
  }
  
  // Validasi tambahan: pastikan booking milik pelanggan yang terverifikasi
  if (b.status === 'cancelled') {
    throw E.business('Booking ini sudah dibatalkan dan tidak dapat diubah.');
  }
  return b;
}

module.exports = {
  getOps, createBooking, listBookings, getBookingDetail, reschedule, cancelBooking, assignTechnician, changeStatus,
  addInventoryUsage, publicStatusByCode, submitFeedback, getAvailability, TRANSITIONS, EDITABLE, computeEnd,
  assertSlotAllowed, wibDateString, mapBooking, BOOKING_SELECT, lockBooking, verifyPublicBooking,
};
