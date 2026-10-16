const request = require('supertest');
const { createApp } = require('../src/app');
const { query } = require('../src/db/pool');
const { signToken } = require('../src/middleware/auth');
const { generateCsrfToken } = require('../src/middleware/csrf');
const chatService = require('../src/services/chatService');
const reminderService = require('../src/services/reminderService');
const bookingService = require('../src/services/bookingService');

describe('Phase 6: AI WhatsApp CS & Anti-Hallucination Rules (BR-44 s/d BR-47)', () => {
  let app;
  let adminToken;
  let adminHeaders;
  let customerId;
  let testBookingId;
  let testBookingCode;
  const testSuffix = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
  const testPhone = `0812${testSuffix}`;

  beforeAll(async () => {
    app = createApp();

    // 1. Admin Auth
    const adminUser = (await query("SELECT * FROM users WHERE role = 'admin' LIMIT 1")).rows[0] || { id: 1, role: 'admin', nama: 'Admin Nara' };
    adminToken = signToken(adminUser);
    adminHeaders = { Authorization: `Bearer ${adminToken}`, 'X-CSRF-Token': generateCsrfToken(adminUser.id) };

    // 2. Customer
    const custRes = await query(`
      INSERT INTO customers (nama, kontak, alamat)
      VALUES ('Customer AI WA Test', $1, 'Jl. AI Test No. 99 Jakarta')
      RETURNING id
    `, [testPhone]);
    customerId = custRes.rows[0].id;

    // 3. AC Unit & Booking untuk pengujian
    const unitRes = await query(`
      INSERT INTO ac_units (customer_id, brand, model, tipe, kapasitas_pk, lokasi)
      VALUES ($1, 'Daikin', 'FTV25', 'split_wall', 1.0, 'Kamar Tidur Utama')
      RETURNING id
    `, [customerId]);
    const acUnitId = unitRes.rows[0].id;

    const svc = (await query('SELECT id, harga FROM service_catalog WHERE aktif ORDER BY id LIMIT 1')).rows[0];

    const bRes = await query(`
      INSERT INTO bookings (
        kode_booking, customer_id, ac_unit_id, layanan_id, jadwal_mulai, jadwal_selesai,
        alamat, kontak, keluhan, status, status_pembayaran, skema_pembayaran, metode_pembayaran
      ) VALUES (
        $1, $2, $3, $4, now() + interval '2 days', now() + interval '2 days' + interval '60 minutes',
        'Jl. AI Test No. 99 Jakarta', $5, 'Servis berkala pengujian AI WhatsApp CS', 'scheduled', 'pending', 'pay_after_service', 'transfer'
      ) RETURNING id, kode_booking
    `, [`BK-${testSuffix}`, customerId, acUnitId, svc.id, testPhone]);
    testBookingId = bRes.rows[0].id;
    testBookingCode = bRes.rows[0].kode_booking;
  });

  afterAll(async () => {
    await query('DELETE FROM reminder_log WHERE booking_id = $1', [testBookingId]);
    await query('DELETE FROM warranty_claims WHERE booking_id = $1', [testBookingId]);
    await query('DELETE FROM whatsapp_conversations WHERE sender = $1', [testPhone]);
    await query('DELETE FROM bookings WHERE id = $1', [testBookingId]);
    await query('DELETE FROM ac_units WHERE customer_id = $1', [customerId]);
    await query('DELETE FROM customers WHERE id = $1', [customerId]);
  });

  describe('BR-44: Informasi Layanan & Katalog Harga Resmi', () => {
    test('AI WhatsApp CS memberikan katalog harga resmi dari database backend', async () => {
      const res = await request(app)
        .post('/api/v1/whatsapp/webhook')
        .send({
          sender: testPhone,
          message: 'Berapa harga cuci AC standard?',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toBeDefined();
      expect(res.body.data.reply.toLowerCase()).toContain('cuci ac standard');
      expect(res.body.data.reply).toContain('Rp');

      // Pastikan percakapan tersimpan di whatsapp_conversations
      const convs = (await query(
        'SELECT * FROM whatsapp_conversations WHERE sender = $1 ORDER BY id DESC LIMIT 2',
        [testPhone]
      )).rows;

      expect(convs.length).toBeGreaterThanOrEqual(2);
      expect(convs.some((c) => c.role === 'user' && c.message.includes('Berapa harga'))).toBe(true);
      expect(convs.some((c) => c.role === 'assistant')).toBe(true);
    });

    test('AI WhatsApp CS memberikan daftar layanan resmi saat ditanya info layanan', async () => {
      const res = await request(app)
        .post('/api/v1/whatsapp/message')
        .send({
          sender: testPhone,
          message: 'Apa saja layanan yang tersedia di Nara AC?',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toBeDefined();
      expect(res.body.data.reply.length).toBeGreaterThan(20);
    });
  });

  describe('BR-45: Pemeriksaan Ketersediaan Jadwal Slot Operasional Nyata', () => {
    test('Memeriksa ketersediaan jadwal slot operasional secara nyata via endpoint', async () => {
      const tom = new Date();
      tom.setDate(tom.getDate() + 2);
      const targetDate = tom.toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/v1/whatsapp/check-availability')
        .send({
          tanggal: targetDate,
          pesan: 'Apakah ada slot kosong?',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jawaban).toBeDefined();
      expect(res.body.data.tanggal).toBe(targetDate);
      expect(Array.isArray(res.body.data.slot_tersedia)).toBe(true);
      expect(typeof res.body.data.total_slot).toBe('number');
    });

    test('Pesan WhatsApp dengan kata kunci jadwal memeriksa ketersediaan slot nyata', async () => {
      const res = await request(app)
        .post('/api/v1/whatsapp/webhook')
        .send({
          sender: testPhone,
          message: 'Halo, saya mau cek jadwal slot kosong besok apakah ada?',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toBeDefined();
      expect(res.body.data.reply.toLowerCase()).toContain('slot');
    });
  });

  describe('BR-46: Human Handoff / Eskalasi ke Admin', () => {
    test('Meneruskan percakapan ke admin jika customer meminta bicara dengan manusia/admin', async () => {
      const res = await request(app)
        .post('/api/v1/whatsapp/webhook')
        .send({
          sender: testPhone,
          message: 'Saya ada kendala mendesak, mohon bicara dengan admin customer service sekarang',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_handoff).toBe(true);
      expect(res.body.data.ticket_id).toBeDefined();
      expect(res.body.data.wa_link).toBeDefined();
      expect(res.body.data.wa_link).toContain('https://wa.me/');

      // Pastikan tiket tercatat di complaint_tickets dengan sumber whatsapp_ai
      const ticket = (await query('SELECT * FROM complaint_tickets WHERE id = $1', [res.body.data.ticket_id])).rows[0];
      expect(ticket).toBeDefined();
      expect(ticket.sumber).toBe('whatsapp_ai');
      expect(ticket.status).toBe('open');

      // Pastikan conversation ditandai is_handoff = true
      const conv = (await query('SELECT * FROM whatsapp_conversations WHERE handoff_ticket_id = $1', [ticket.id])).rows[0];
      expect(conv).toBeDefined();
      expect(conv.is_handoff).toBe(true);
    });

    test('Endpoint POST /api/v1/whatsapp/handoff membuat tiket eskalasi dan menghasilkan link admin', async () => {
      const res = await request(app)
        .post('/api/v1/whatsapp/handoff')
        .send({
          sender: testPhone,
          pesan: 'Komplain layanan teknisi terlambat, tolong eskalasi ke admin',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticket_id).toBeDefined();
      expect(res.body.data.admin_whatsapp).toBeDefined();
      expect(res.body.data.wa_link).toContain('https://wa.me/');
    });
  });

  describe('BR-47: Pengiriman WhatsApp H-1 & Perawatan Berkala dengan Retry Queue', () => {
    test('Job Pengingat H-1 servis menggunakan kanal WhatsApp untuk customer', async () => {
      // Pastikan jadwal booking diatur untuk H-1 (besok)
      const besok = new Date();
      besok.setDate(besok.getDate() + 1);
      const jadwalBesok = `${besok.toISOString().split('T')[0]}T10:00:00+07:00`;

      await query('UPDATE bookings SET jadwal_mulai = $1 WHERE id = $2', [jadwalBesok, testBookingId]);

      const result = await reminderService.runReminders({ force: true });
      expect(result).toBeDefined();
      expect(typeof result.dibuat).toBe('number');

      // Periksa bahwa log reminder menggunakan kanal whatsapp untuk customer
      const rLog = (await query(
        "SELECT * FROM reminder_log WHERE booking_id = $1 AND target = 'pelanggan' ORDER BY id DESC LIMIT 1",
        [testBookingId]
      )).rows[0];

      if (rLog) {
        expect(rLog.kanal).toBe('whatsapp');
        expect(['pending', 'sent', 'failed']).toContain(rLog.status);
      }
    });

    test('Job Pengingat Perawatan Berkala AC Unit mengirim ke WhatsApp pelanggan', async () => {
      const result = await reminderService.runMaintenanceReminders({ days: 90, force: true });
      expect(result).toBeDefined();
      expect(typeof result.units_checked).toBe('number');
      expect(typeof result.dibuat).toBe('number');
    });

    test('Admin dapat mentrigger dispatch pengingat WhatsApp melalui API', async () => {
      const res = await request(app)
        .post('/api/v1/whatsapp/dispatch-reminders')
        .set(adminHeaders)
        .send({ days: 30, force: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pengingat_h_minus_1).toBeDefined();
      expect(res.body.data.pengingat_perawatan_berkala).toBeDefined();
    });
  });

  describe('Strict Anti-Hallucination & Integrity Constraints', () => {
    test('AI dilarang menyatakan booking telah berhasil sebelum tersimpan di database backend', async () => {
      const res = await request(app)
        .post('/api/v1/whatsapp/webhook')
        .send({
          sender: testPhone,
          message: 'Saya mau booking cuci AC 2 unit untuk besok jam 10 pagi',
        });

      expect(res.status).toBe(200);
      const reply = res.body.data.reply.toLowerCase();
      // AI harus menyatakan bahwa pemesanan belum tersimpan / belum ada kode booking
      expect(reply).toMatch(/belum tersimpan|belum berhasil|buka formulir/i);
      expect(reply).not.toContain('booking anda telah berhasil dijadwalkan dengan kode ac-');
    });

    test('AI dilarang menyatakan pembayaran terverifikasi sebelum status di database adalah paid/diverifikasi', async () => {
      // 1. Set status pembayaran ke pending / belum diverifikasi
      await query(`
        UPDATE bookings
        SET status_pembayaran = 'pending',
            status_verifikasi_pembayaran = 'menunggu_verifikasi'
        WHERE id = $1
      `, [testBookingId]);

      const res = await request(app)
        .post('/api/v1/whatsapp/webhook')
        .send({
          sender: testPhone,
          message: `Tolong cek status pembayaran dan bukti transfer untuk booking ${testBookingCode}`,
        });

      expect(res.status).toBe(200);
      const reply = res.body.data.reply.toLowerCase();
      expect(reply).toContain('belum terverifikasi');
      expect(reply).toContain('dilarang menyatakan pembayaran terverifikasi');

      // 2. Sekarang ubah status ke diverifikasi dan paid di DB
      await query(`
        UPDATE bookings
        SET status_pembayaran = 'paid',
            status_verifikasi_pembayaran = 'diverifikasi',
            total_dibayar = 75000
        WHERE id = $1
      `, [testBookingId]);

      const resVerified = await request(app)
        .post('/api/v1/whatsapp/webhook')
        .send({
          sender: testPhone,
          message: `Cek bukti transfer dan pembayaran booking ${testBookingCode}`,
        });

      expect(resVerified.status).toBe(200);
      const replyVerified = resVerified.body.data.reply.toLowerCase();
      expect(replyVerified).toContain('terverifikasi lunas');
    });

    test('AI dilarang menyatakan klaim garansi disetujui sebelum disetujui resmi oleh admin', async () => {
      // 1. Buat klaim garansi baru berstatus 'diajukan' (menunggu verifikasi)
      const claimRes = await query(`
        INSERT INTO warranty_claims (kode_klaim, booking_id, customer_id, status, keluhan)
        VALUES ($1, $2, $3, 'diajukan', 'AC kembali bocor air setelah diservis')
        RETURNING id
      `, [`CLM-TEST-${testSuffix}`, testBookingId, customerId]);
      const claimId = claimRes.rows[0].id;

      const res = await request(app)
        .post('/api/v1/whatsapp/webhook')
        .send({
          sender: testPhone,
          message: `Bagaimana status klaim garansi saya untuk booking ${testBookingCode}? Apakah sudah disetujui?`,
        });

      expect(res.status).toBe(200);
      const reply = res.body.data.reply.toLowerCase();
      expect(reply).toContain('masih dalam proses peninjauan');
      expect(reply).toContain('dilarang menyatakan klaim disetujui');

      // 2. Sekarang admin menyetujui klaim di DB
      await query(`
        UPDATE warranty_claims
        SET status = 'disetujui',
            catatan_pemeriksaan = 'Disetujui untuk servis ulang gratis teknisi'
        WHERE id = $1
      `, [claimId]);

      const resApproved = await request(app)
        .post('/api/v1/whatsapp/webhook')
        .send({
          sender: testPhone,
          message: `Cek status klaim garansi booking ${testBookingCode}`,
        });

      expect(resApproved.status).toBe(200);
      const replyApproved = resApproved.body.data.reply.toLowerCase();
      expect(replyApproved).toContain('telah disetujui oleh admin');
    });
  });

  describe('Riwayat Percakapan WhatsApp (Admin)', () => {
    test('Admin dapat melihat log percakapan WhatsApp CS via GET /api/v1/whatsapp/conversations', async () => {
      const res = await request(app)
        .get(`/api/v1/whatsapp/conversations?sender=${testPhone}`)
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('Mendapatkan konfigurasi AI WhatsApp CS via GET /api/v1/whatsapp/config', async () => {
      const res = await request(app)
        .get('/api/v1/whatsapp/config');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.admin_whatsapp).toBeDefined();
    });
  });
});
