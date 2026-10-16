const { query, withTx } = require('../db/pool');
const { E } = require('../errors');
const { notify } = require('./common');
const { calculateInvoice } = require('./bookingService');
const { normalizePhone } = require('../utils/ids');
const config = require('../config');

async function loadInvoiceData(db, booking) {
  booking.items = (await db.query(`SELECT bi.*, s.nama_layanan FROM booking_items bi JOIN service_catalog s ON s.id=bi.layanan_id WHERE bi.booking_id=$1`, [booking.id])).rows;
  booking.harga = (await db.query('SELECT harga FROM service_catalog WHERE id=$1', [booking.layanan_id])).rows[0]?.harga || 0;
  booking.is_member = (await db.query("SELECT id FROM users WHERE customer_id=$1 AND role='customer' AND aktif=true", [booking.customer_id])).rows.length > 0;
  return booking;
}

function assertPaymentOwner(booking, user, kontak) {
  if (user?.role === 'admin') return;
  if (user) {
    if (user.role === 'customer' && user.customer_id && Number(user.customer_id) === Number(booking.customer_id)) return;
    throw E.forbidden('Booking ini bukan milik Anda.');
  }
  const phone = normalizePhone(kontak);
  if (!phone || phone !== normalizePhone(booking.kontak)) throw E.forbidden('Nomor kontak lengkap yang sesuai booking wajib diisi.');
}


/**
 * Mengambil pengaturan skema & metode pembayaran aktif (BR-34, BR-36)
 */
async function getPaymentSettings() {
  const schemesRow = (await query("SELECT value FROM settings WHERE setting_key= 'payment_schemes'")).rows[0];
  const methodsRow = (await query("SELECT value FROM settings WHERE setting_key= 'payment_methods'")).rows[0];

  const defaultSchemes = {
    full_upfront: { enabled: true, label: 'Bayar Lunas di Awal', deskripsi: 'Pelunasan penuh saat booking dibuat' },
    dp_50: { enabled: true, label: 'Uang Muka (DP 50%)', deskripsi: 'Bayar 50% di awal, sisa 50% setelah pekerjaan selesai' },
    pay_after_service: { enabled: true, label: 'Bayar Setelah Selesai', deskripsi: 'Pelunasan setelah pekerjaan selesai diservis' },
  };

  const defaultMethods = {
    transfer: { enabled: true, label: 'Transfer Bank', instruksi: 'Transfer ke rekening resmi Nara AC dan upload bukti bayar.' },
    qris: { enabled: true, label: 'QRIS', instruksi: 'Scan QRIS resmi Nara AC dengan aplikasi m-banking atau e-wallet.' },
    cash: { enabled: true, label: 'Tunai', instruksi: 'Bayar tunai langsung kepada teknisi di lokasi servis.' },
  };

  return {
    schemes: (schemesRow && schemesRow.value) ? schemesRow.value : defaultSchemes,
    methods: (methodsRow && methodsRow.value) ? methodsRow.value : defaultMethods,
  };
}

/**
 * Admin mengatur skema & metode pembayaran yang tersedia (BR-34)
 */
async function updatePaymentSettings({ schemes, methods }) {
  if (schemes) {
    await query(`
      INSERT INTO settings (setting_key, value)
      VALUES ('payment_schemes', $1)
      ON DUPLICATE KEY UPDATE value = VALUES(value)
    `, [JSON.stringify(schemes)]);
  }

  if (methods) {
    await query(`
      INSERT INTO settings (setting_key, value)
      VALUES ('payment_methods', $1)
      ON DUPLICATE KEY UPDATE value = VALUES(value)
    `, [JSON.stringify(methods)]);
  }

  return getPaymentSettings();
}

/**
 * Customer memilih skema & metode pembayaran yang tersedia (BR-35, BR-36, BR-38)
 */
async function selectPaymentScheme(bookingId, { skema_pembayaran, metode_pembayaran }, user = null, kontak = null) {
  const settings = await getPaymentSettings();

  // Validasi skema tersedia
  if (skema_pembayaran) {
    const schemeConfig = settings.schemes[skema_pembayaran];
    if (!schemeConfig || !schemeConfig.enabled) {
      throw E.badRequest(`Skema pembayaran "${skema_pembayaran}" sedang tidak tersedia (BR-34).`);
    }
  }

  // Validasi metode tersedia
  if (metode_pembayaran) {
    const methodConfig = settings.methods[metode_pembayaran];
    if (!methodConfig || !methodConfig.enabled) {
      throw E.badRequest(`Metode pembayaran "${metode_pembayaran}" sedang tidak tersedia (BR-36).`);
    }
  }

  return withTx(async (client) => {
    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
    const booking = bRes.rows[0];
    if (!booking) throw E.notFound('Booking tidak ditemukan.');

    assertPaymentOwner(booking, user, kontak);

    const updated = (await client.query(`
      UPDATE bookings
      SET skema_pembayaran = COALESCE($1, skema_pembayaran),
          metode_pembayaran = COALESCE($2, metode_pembayaran),
          updated_at = now()
      WHERE id = $3
      RETURNING *
    `, [skema_pembayaran || null, metode_pembayaran || null, bookingId])).rows[0];

    // BR-38: Booking yang belum dibayar tetap aktif (status tetap scheduled/on process, status_pembayaran tetap pending)
    return {
      success: true,
      booking: updated,
      message: 'Skema dan metode pembayaran berhasil diperbarui. Booking tetap aktif (BR-38).',
    };
  });
}

/**
 * Upload bukti pembayaran transfer bank (BR-37)
 */
async function uploadTransferProof(bookingId, { bukti_url, nominal, catatan }, user = null, kontak = null) {
  if (!bukti_url || !bukti_url.trim()) {
    throw E.badRequest('Bukti pembayaran wajib diunggah (BR-37).');
  }

  const nominalNum = Number(nominal);
  if (!Number.isFinite(nominalNum) || nominalNum <= 0) {
    throw E.badRequest('Nominal pembayaran harus berupa angka positif.');
  }

  return withTx(async (client) => {
    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
    const booking = bRes.rows[0];
    if (!booking) throw E.notFound('Booking tidak ditemukan.');

    assertPaymentOwner(booking, user, kontak);
    if (booking.bukti_pembayaran_url === bukti_url.trim() && booking.status_verifikasi_pembayaran === 'diverifikasi') {
      throw E.conflict('Bukti pembayaran ini sudah diverifikasi.');
    }

    const updated = (await client.query(`
      UPDATE bookings
      SET bukti_pembayaran_url = $1,
          status_verifikasi_pembayaran = 'menunggu_verifikasi',
          catatan_verifikasi = $2,
          updated_at = now()
      WHERE id = $3
      RETURNING *
    `, [bukti_url.trim(), catatan ? catatan.trim() : null, bookingId])).rows[0];

    // Notifikasi ke Admin untuk verifikasi manual
    try {
      await notify({ query: (t, p) => client.query(t, p) }, {
        role: 'admin',
        id: null,
        title: 'Bukti Pembayaran Baru Diunggah',
        message: `Customer telah mengunggah bukti pembayaran untuk booking ${booking.kode_booking} sebesar Rp ${nominalNum.toLocaleString('id-ID')}. Mohon verifikasi manual (BR-37).`,
        type: 'booking',
        bookingId: booking.id,
        tautan: `/admin/bookings/${booking.id}`,
        dedup: `proof_uploaded_${booking.id}_${Date.now()}`,
      });
    } catch (error) { console.warn('[payment] Notifikasi gagal:', error.message); }

    return {
      success: true,
      message: 'Bukti pembayaran berhasil diunggah dan sedang menunggu verifikasi manual admin (BR-37).',
      booking: updated,
    };
  });
}

/**
 * Verifikasi manual bukti pembayaran oleh Admin (BR-37, BR-39, BR-40, BR-41)
 */
async function verifyPaymentProof(bookingId, { disetujui, catatan, nominal_disetujui }, adminUser) {
  if (typeof disetujui !== 'boolean') {
    throw E.badRequest('Status verifikasi disetujui (true/false) wajib ditentukan (BR-37).');
  }

  return withTx(async (client) => {
    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
    const booking = bRes.rows[0];
    if (!booking) throw E.notFound('Booking tidak ditemukan.');

    if (booking.status_verifikasi_pembayaran !== 'menunggu_verifikasi' || !booking.bukti_pembayaran_url) {
      throw E.badRequest('Booking ini belum memiliki bukti pembayaran yang menunggu verifikasi.');
    }

    let updated;
    if (disetujui) {
      const nominal = Number(nominal_disetujui) || 0;
      if (!Number.isFinite(nominal) || nominal <= 0) {
        throw E.badRequest('Nominal yang disetujui harus lebih dari 0.');
      }

      const totalDibayarBaru = (Number(booking.total_dibayar) || 0) + nominal;

      // Hitung invoice untuk menentukan apakah lunas atau masih ada sisa
      // Ambil items booking
      const itemsRes = await client.query(`
        SELECT bi.*, sc.nama_layanan
        FROM booking_items bi
        LEFT JOIN service_catalog sc ON sc.id = bi.layanan_id
        WHERE bi.booking_id = $1
      `, [bookingId]);
      booking.items = itemsRes.rows;
      booking.total_dibayar = totalDibayarBaru;

      await loadInvoiceData(client, booking);
      const invoice = calculateInvoice(booking);
      const isLunas = invoice.balance_due === 0;

      updated = (await client.query(`
        UPDATE bookings
        SET status_verifikasi_pembayaran = 'diverifikasi',
            total_dibayar = $1,
            status_pembayaran = $2,
            verified_by = $3,
            verified_at = now(),
            catatan_verifikasi = $4,
            updated_at = now()
        WHERE id = $5
        RETURNING *
      `, [totalDibayarBaru, isLunas ? 'paid' : 'pending', adminUser.id, catatan || 'Pembayaran telah diverifikasi admin.', bookingId])).rows[0];

      // Kirim invoice otomatis melalui WhatsApp (BR-42)
      await queueAndDispatchWhatsAppInvoice(bookingId, {
        tipe_invoice: booking.status === 'done' ? 'final' : 'initial',
      }, client);

    } else {
      if (!catatan || catatan.trim().length < 5) {
        throw E.badRequest('Alasan penolakan bukti pembayaran wajib dijelaskan minimal 5 karakter.');
      }

      updated = (await client.query(`
        UPDATE bookings
        SET status_verifikasi_pembayaran = 'ditolak',
            verified_by = $1,
            verified_at = now(),
            catatan_verifikasi = $2,
            updated_at = now()
        WHERE id = $3
        RETURNING *
      `, [adminUser.id, catatan.trim(), bookingId])).rows[0];
    }

    return {
      success: true,
      message: disetujui ? 'Pembayaran berhasil diverifikasi.' : 'Bukti pembayaran ditolak.',
      booking: updated,
    };
  });
}

/**
 * Memproses pengembalian kelebihan pembayaran kepada customer (BR-41)
 */
async function processRefund(bookingId, { nominal_refund, catatan }, adminUser) {
  const nominal = Number(nominal_refund);
  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw E.badRequest('Nominal refund harus lebih dari 0 (BR-41).');
  }

  return withTx(async (client) => {
    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
    const booking = bRes.rows[0];
    if (!booking) throw E.notFound('Booking tidak ditemukan.');

    await loadInvoiceData(client, booking);
    const remaining = calculateInvoice(booking).refund_amount - Number(booking.refund_nominal || 0);
    if (nominal > remaining) throw E.badRequest('Nominal refund melebihi sisa kelebihan pembayaran.');

    const updated = (await client.query(`
      UPDATE bookings
      SET refund_nominal = $1,
          refund_status = 'processed',
          refund_catatan = $2,
          updated_at = now()
      WHERE id = $3
      RETURNING *
    `, [nominal + Number(booking.refund_nominal || 0), catatan ? catatan.trim() : 'Kelebihan pembayaran telah dikembalikan kepada customer.', bookingId])).rows[0];

    return {
      success: true,
      message: `Pengembalian kelebihan pembayaran sebesar Rp ${nominal.toLocaleString('id-ID')} berhasil diproses (BR-41).`,
      booking: updated,
    };
  });
}

/**
 * Antrean dan pengiriman Invoice melalui WhatsApp (BR-42, BR-43)
 */
async function queueAndDispatchWhatsAppInvoice(bookingId, { tipe_invoice = 'auto', simulatedFailure = false } = {}, dbClient = null) {
  const db = dbClient || { query };

  // 1. Ambil detail booking & invoice
  const bRes = await db.query(`
    SELECT b.*, c.nama AS customer_nama, c.kontak AS customer_kontak,
           s.nama_layanan, s.harga
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    LEFT JOIN service_catalog s ON s.id = b.layanan_id
    WHERE b.id = $1
  `, [bookingId]);

  const booking = bRes.rows[0];
  if (!booking) throw E.notFound('Booking tidak ditemukan.');

  // Ambil booking items jika ada
  const itemsRes = await db.query(`
    SELECT bi.*, sc.nama_layanan
    FROM booking_items bi
    LEFT JOIN service_catalog sc ON sc.id = bi.layanan_id
    WHERE bi.booking_id = $1
  `, [bookingId]);
  booking.items = itemsRes.rows;

  await loadInvoiceData(db, booking);
  const invoice = calculateInvoice(booking);

  const determinedType = tipe_invoice === 'auto'
    ? (booking.status === 'done' ? 'final' : 'initial')
    : tipe_invoice;

  const phone = (booking.kontak || booking.customer_kontak || '').trim();
  const invoiceLink = `${config.frontendUrl}/invoice/${encodeURIComponent(booking.kode_booking)}`;

  const pesan = [
    `*NARA AC SERVICE - ${determinedType === 'final' ? 'INVOICE FINAL' : 'INVOICE AWAL'}*`,
    `Halo *${booking.customer_nama}*,`,
    `Berikut rincian tagihan servis AC Anda (No: ${booking.kode_booking}):`,
    `----------------------------------------`,
    `Layanan: ${booking.nama_layanan || 'Servis AC'} (${invoice.units} unit)`,
    `Subtotal Jasa: Rp ${invoice.subtotal_jasa.toLocaleString('id-ID')}`,
    invoice.subtotal_sparepart > 0 ? `Subtotal Spare Part: Rp ${invoice.subtotal_sparepart.toLocaleString('id-ID')}` : null,
    invoice.discount > 0 ? `Diskon: -Rp ${invoice.discount.toLocaleString('id-ID')} (${invoice.discount_reason})` : null,
    `*TOTAL: Rp ${invoice.total.toLocaleString('id-ID')}*`,
    `Total Dibayar: Rp ${invoice.total_dibayar.toLocaleString('id-ID')}`,
    invoice.balance_due > 0 ? `*SISA KURANG BAYAR: Rp ${invoice.balance_due.toLocaleString('id-ID')}*` : null,
    invoice.refund_amount > 0 ? `*KELEBIHAN BAYAR (REFUND): Rp ${invoice.refund_amount.toLocaleString('id-ID')}*` : null,
    `----------------------------------------`,
    `Lihat / Cetak Invoice Resmi:`,
    invoiceLink,
    `\nTerima kasih telah mempercayakan perawatan AC Anda kepada Nara AC.`,
  ].filter(Boolean).join('\n');

  // Simpan ke whatsapp_invoice_logs
  const logInsert = await db.query(`
    INSERT INTO whatsapp_invoice_logs (
      booking_id, tipe_invoice, nomor_whatsapp, pesan, tautan_invoice, status, percobaan, waktu_kirim
    ) VALUES ($1, $2, $3, $4, $5, 'pending', 0, NULL)
    RETURNING *
  `, [bookingId, determinedType, phone, pesan, invoiceLink]);

  const logId = logInsert.rows[0].id;

  // Simulasi pengiriman atau integrasi WhatsApp API
  // BR-43: Jika pengiriman gagal, sistem mencatat status gagal dan mendukung pengiriman ulang otomatis
  try {
    if (simulatedFailure) {
      throw new Error('Simulated WhatsApp Gateway Network Timeout (BR-43)');
    }

    await require('./reminderService').whatsappSend(phone, pesan);

    // Berhasil terkirim
    const updatedLog = (await db.query(`
      UPDATE whatsapp_invoice_logs
      SET status = 'sent',
          percobaan = percobaan + 1,
          waktu_kirim = now(),
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `, [logId])).rows[0];

    return {
      success: true,
      status: 'sent',
      log: updatedLog,
      message: 'Invoice berhasil dikirim ke nomor WhatsApp customer (BR-42).',
    };
  } catch (err) {
    // Pengiriman gagal -> simpan error & retry count
    const updatedLog = (await db.query(`
      UPDATE whatsapp_invoice_logs
      SET status = 'failed',
          percobaan = percobaan + 1,
          error_terakhir = $1,
          updated_at = now()
      WHERE id = $2
      RETURNING *
    `, [err.message, logId])).rows[0];

    return {
      success: false,
      status: 'failed',
      log: updatedLog,
      error: err.message,
      message: 'Pengiriman WhatsApp gagal, dijadwalkan untuk pengiriman ulang otomatis (BR-43).',
    };
  }
}

/**
 * Pengiriman ulang otomatis untuk pesan WhatsApp yang gagal (BR-43)
 */
async function retryFailedWhatsAppInvoices(maxLimit = 20) {
  const failedLogs = (await query(`
    SELECT * FROM whatsapp_invoice_logs
    WHERE status = 'failed' AND percobaan < max_percobaan
    ORDER BY created_at ASC
    LIMIT $1
  `, [maxLimit])).rows;

  const results = [];

  for (const log of failedLogs) {
    try {
      await require('./reminderService').whatsappSend(log.nomor_whatsapp, log.pesan);
      // Mencoba mengirim ulang
      await query(`
        UPDATE whatsapp_invoice_logs
        SET status = 'sent',
            percobaan = percobaan + 1,
            waktu_kirim = now(),
            error_terakhir = NULL,
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `, [log.id]);

      results.push({ id: log.id, status: 'sent', success: true });
    } catch (err) {
      const updated = (await query(`
        UPDATE whatsapp_invoice_logs
        SET percobaan = percobaan + 1,
            error_terakhir = $1,
            updated_at = now()
        WHERE id = $2
        RETURNING *
      `, [err.message, log.id])).rows[0];

      results.push({ id: log.id, status: updated.status, success: false, error: err.message });
    }
  }

  return {
    total_retried: failedLogs.length,
    results,
  };
}

module.exports = {
  assertPaymentOwner,
  getPaymentSettings,
  updatePaymentSettings,
  selectPaymentScheme,
  uploadTransferProof,
  verifyPaymentProof,
  processRefund,
  queueAndDispatchWhatsAppInvoice,
  retryFailedWhatsAppInvoices,
};
