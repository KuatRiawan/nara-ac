/** Helper bersama: audit log & notifikasi dalam-aplikasi. Selalu dipanggil dengan client transaksi. */

const actorOf = (user) => ({
  nama: (user && (user.nama || user.label)) || 'sistem',
  role: (user && user.role) || 'system',
});

async function audit(db, user, action, entity, entityId, { before = null, after = null, metadata = {} } = {}) {
  const a = actorOf(user);
  await db.query(
    `INSERT INTO audit_logs (actor, role, action, entity, entity_id, metadata, sebelum, sesudah)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [a.nama, a.role, action, entity, entityId || null, JSON.stringify(metadata),
      before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null],
  );
}

/**
 * role: 'admin' (id null = semua admin) | 'technician' (technicians.id) | 'customer' (customers.id).
 * dedup: kunci unik agar notifikasi sama tidak berulang (mis. reminder).
 */
async function notify(db, { role, id = null, title, message, type, bookingId = null, tautan = null, dedup = null }) {
  await db.query(
    `INSERT INTO notifications (target_role, target_id, title, message, type, reference_id, booking_id, tautan, dedup_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
    [role, id, title, message, type, bookingId, bookingId, tautan, dedup],
  );
}

module.exports = { audit, notify, actorOf };
