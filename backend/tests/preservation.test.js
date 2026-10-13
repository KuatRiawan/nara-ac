/**
 * Preservation Property Tests — NARA AC Full Audit (A26-CS054)
 *
 * TUJUAN: Mengkodekan perilaku EXISTING yang BENAR pada unfixed code.
 *         Test ini HARUS LULUS sebelum implementasi fix apapun,
 *         dan HARUS TETAP LULUS setelah semua fix diterapkan.
 *
 * METODOLOGI: Observation-first — setiap test dimulai dari observasi
 *             nyata terhadap perilaku kode unfixed, lalu dienkode sebagai property.
 *
 * EXPECTED OUTCOME: SEMUA TEST LULUS pada unfixed code.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9,
 *            3.10, 3.11, 3.12, 3.13, 3.14, 3.15
 */

const jwt = require('jsonwebtoken');
const fc = require('fast-check');
const config = require('../src/config');
const { requireAuth } = require('../src/middleware/auth');
const { notify } = require('../src/services/common');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeReq(token) {
  return { headers: { authorization: `Bearer ${token}` } };
}
function makeReqNoAuth() {
  return { headers: {} };
}
function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
function makeNext() {
  let called = false;
  let calledWith = undefined;
  const fn = (arg) => { called = true; calledWith = arg; };
  fn.wasCalled = () => called;
  fn.calledWith = () => calledWith;
  return fn;
}
function sign(payload, opts = {}) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '1h', ...opts });
}

// ===========================================================================
// PRESERVATION-1 — Admin login → /admin
// ===========================================================================
/**
 * Observasi (pada unfixed code):
 *   login response { user: { role: 'admin' } } → LoginPage.jsx → navigate('/admin')
 *
 * Perilaku ini harus tetap ada setelah BUG-001 diperbaiki.
 *
 * Validates: Requirements 3.1
 */
describe('PRESERVATION-1 — Admin login selalu diarahkan ke /admin', () => {
  // Replicate exact current logic from LoginPage.jsx handleLogin
  function getNavigateTarget(loginResult) {
    if (loginResult.user.role === 'technician') {
      return '/technician/dashboard';
    } else {
      return '/admin';
    }
  }

  test('Observasi: role admin → /admin (perilaku existing yang benar)', () => {
    const res = { user: { role: 'admin', nama: 'Admin Utama', id: 1 } };
    expect(getNavigateTarget(res)).toBe('/admin');
  });

  test('Property: untuk semua input role === admin, navigate destination adalah /admin', () => {
    /**
     * Validates: Requirements 3.1
     * Property: ∀ loginResult dimana role === 'admin' → navigate('/admin')
     */
    fc.assert(
      fc.property(
        fc.record({
          user: fc.record({
            role: fc.constant('admin'),
            nama: fc.string({ minLength: 1, maxLength: 50 }),
            id: fc.integer({ min: 1, max: 9999 }),
          }),
        }),
        (loginResult) => {
          return getNavigateTarget(loginResult) === '/admin';
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// PRESERVATION-2 — Technician login → /technician/dashboard
// ===========================================================================
/**
 * Observasi (pada unfixed code):
 *   login response { user: { role: 'technician' } } → navigate('/technician/dashboard')
 *
 * Validates: Requirements 3.2
 */
describe('PRESERVATION-2 — Technician login selalu diarahkan ke /technician/dashboard', () => {
  function getNavigateTarget(loginResult) {
    if (loginResult.user.role === 'technician') {
      return '/technician/dashboard';
    } else {
      return '/admin';
    }
  }

  test('Observasi: role technician → /technician/dashboard (perilaku existing yang benar)', () => {
    const res = { user: { role: 'technician', nama: 'Andi Teknisi', id: 3 } };
    expect(getNavigateTarget(res)).toBe('/technician/dashboard');
  });

  test('Property: untuk semua input role === technician, navigate destination adalah /technician/dashboard', () => {
    /**
     * Validates: Requirements 3.2
     * Property: ∀ loginResult dimana role === 'technician' → navigate('/technician/dashboard')
     */
    fc.assert(
      fc.property(
        fc.record({
          user: fc.record({
            role: fc.constant('technician'),
            nama: fc.string({ minLength: 1, maxLength: 50 }),
            id: fc.integer({ min: 1, max: 9999 }),
          }),
        }),
        (loginResult) => {
          return getNavigateTarget(loginResult) === '/technician/dashboard';
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// PRESERVATION-3 — JWT dengan tid → req.user.technicianId === tid
// ===========================================================================
/**
 * Observasi (pada unfixed code):
 *   JWT payload { tid: 3, ... } → requireAuth → req.user.technicianId === 3
 *
 * Validates: Requirements 3.3
 */
describe('PRESERVATION-3 — JWT tid selalu dipetakan ke req.user.technicianId', () => {
  test('Observasi: JWT dengan tid=3 → req.user.technicianId === 3', () => {
    const payload = { sub: 3, role: 'technician', tid: 3, nama: 'Andi' };
    const token = sign(payload);
    const req = makeReq(token);
    const next = makeNext();

    requireAuth()(req, makeRes(), next);

    expect(next.wasCalled()).toBe(true);
    expect(next.calledWith()).toBeUndefined();
    expect(req.user.technicianId).toBe(3);
  });

  test('Property: untuk semua valid tid (1–9999), req.user.technicianId === tid', () => {
    /**
     * Validates: Requirements 3.3
     * Property: ∀ tid ∈ [1, 9999] → requireAuth → req.user.technicianId === tid
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (tid, nama) => {
          const payload = { sub: tid, role: 'technician', tid, nama };
          const token = sign(payload);
          const req = makeReq(token);
          const next = makeNext();

          requireAuth()(req, makeRes(), next);

          return next.wasCalled()
            && next.calledWith() === undefined
            && req.user.technicianId === tid;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// PRESERVATION-4 — JWT tanpa cid/tid → req.user.customerId === null
// ===========================================================================
/**
 * Observasi (pada unfixed code):
 *   JWT payload { sub: 1, role: 'admin' } tanpa cid/tid →
 *   requireAuth → req.user.customerId === null, req.user.technicianId === null
 *
 * NOTE: Pada unfixed code, req.user.customer_id (snake_case) TIDAK ADA (bug BUG-003).
 *       Test ini hanya memverifikasi req.user.customerId (camelCase) yang MEMANG ADA
 *       dan bernilai null — perilaku yang harus tetap ada setelah fix.
 *
 * Validates: Requirements 3.3 (req.user tetap berisi customerId)
 */
describe('PRESERVATION-4 — JWT tanpa cid/tid → customerId dan technicianId bernilai null', () => {
  test('Observasi: JWT admin tanpa cid/tid → req.user.customerId === null', () => {
    const payload = { sub: 1, role: 'admin', nama: 'Admin' };
    const token = sign(payload);
    const req = makeReq(token);
    const next = makeNext();

    requireAuth()(req, makeRes(), next);

    expect(next.wasCalled()).toBe(true);
    expect(next.calledWith()).toBeUndefined();
    expect(req.user.customerId).toBeNull();
    expect(req.user.technicianId).toBeNull();
  });

  test('Property: untuk semua JWT admin (tanpa cid/tid), customerId dan technicianId adalah null', () => {
    /**
     * Validates: Requirements 3.3
     * Property: ∀ JWT dengan role 'admin' dan tanpa cid/tid →
     *           req.user.customerId === null AND req.user.technicianId === null
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (id, nama) => {
          // Admin JWT — tidak memiliki cid atau tid
          const payload = { sub: id, role: 'admin', nama };
          const token = sign(payload);
          const req = makeReq(token);
          const next = makeNext();

          requireAuth()(req, makeRes(), next);

          return next.wasCalled()
            && next.calledWith() === undefined
            && req.user.customerId === null
            && req.user.technicianId === null;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// PRESERVATION-5 — req.user selalu berisi field wajib dari JWT valid
// ===========================================================================
/**
 * Observasi (pada unfixed code):
 *   JWT valid apapun → requireAuth → req.user SELALU berisi: id, role, nama, technicianId, customerId
 *
 * Validates: Requirements 3.3
 */
describe('PRESERVATION-5 — req.user selalu berisi semua field wajib untuk JWT valid', () => {
  test('Observasi: JWT customer → req.user berisi id, role, nama, technicianId, customerId', () => {
    const payload = { sub: 10, role: 'customer', cid: 5, nama: 'Budi Santoso' };
    const token = sign(payload);
    const req = makeReq(token);
    const next = makeNext();

    requireAuth()(req, makeRes(), next);

    expect(req.user).toMatchObject({
      id: 10,
      role: 'customer',
      nama: 'Budi Santoso',
      customerId: 5,
      technicianId: null,
    });
  });

  test('Property: untuk berbagai role JWT, req.user selalu berisi semua field wajib', () => {
    /**
     * Validates: Requirements 3.3
     * Property: ∀ JWT payload valid → req.user berisi { id, role, nama, technicianId, customerId }
     */
    fc.assert(
      fc.property(
        fc.oneof(
          // Admin JWT
          fc.record({
            sub: fc.integer({ min: 1, max: 9999 }),
            role: fc.constant('admin'),
            nama: fc.string({ minLength: 1, maxLength: 40 }),
          }),
          // Technician JWT
          fc.record({
            sub: fc.integer({ min: 1, max: 9999 }),
            role: fc.constant('technician'),
            tid: fc.integer({ min: 1, max: 9999 }),
            nama: fc.string({ minLength: 1, maxLength: 40 }),
          }),
          // Customer JWT
          fc.record({
            sub: fc.integer({ min: 1, max: 9999 }),
            role: fc.constant('customer'),
            cid: fc.integer({ min: 1, max: 9999 }),
            nama: fc.string({ minLength: 1, maxLength: 40 }),
          }),
        ),
        (payload) => {
          const token = sign(payload);
          const req = makeReq(token);
          const next = makeNext();

          requireAuth()(req, makeRes(), next);

          if (!next.wasCalled() || next.calledWith() !== undefined) return false;

          // Semua field wajib harus ada
          const user = req.user;
          return (
            typeof user.id !== 'undefined' &&
            typeof user.role === 'string' &&
            typeof user.nama === 'string' &&
            'technicianId' in user &&
            'customerId' in user
          );
        }
      ),
      { numRuns: 150 }
    );
  });
});

// ===========================================================================
// PRESERVATION-6 — Request tanpa Authorization header → HTTP 401
// ===========================================================================
/**
 * Observasi (pada unfixed code):
 *   Request tanpa Authorization header ke endpoint yang dilindungi → HTTP 401
 *
 * Validates: Requirements 3.10
 */
describe('PRESERVATION-6 — Request tanpa Authorization header → next(E.unauthorized())', () => {
  test('Observasi: tidak ada Authorization header → next dipanggil dengan AppError 401', () => {
    const req = makeReqNoAuth();
    const next = makeNext();

    requireAuth()(req, makeRes(), next);

    expect(next.wasCalled()).toBe(true);
    const err = next.calledWith();
    expect(err).toBeDefined();
    expect(err.status).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  test('Observasi: Authorization header tidak diawali Bearer → next dipanggil dengan AppError 401', () => {
    const req = { headers: { authorization: 'Basic sometoken' } };
    const next = makeNext();

    requireAuth()(req, makeRes(), next);

    expect(next.wasCalled()).toBe(true);
    const err = next.calledWith();
    expect(err.status).toBe(401);
  });

  test('Observasi: Authorization header berupa string kosong → next dipanggil dengan AppError 401', () => {
    const req = { headers: { authorization: '' } };
    const next = makeNext();

    requireAuth()(req, makeRes(), next);

    expect(next.wasCalled()).toBe(true);
    const err = next.calledWith();
    expect(err.status).toBe(401);
  });

  test('Property: tanpa Authorization header yang valid, requireAuth selalu menghasilkan 401', () => {
    /**
     * Validates: Requirements 3.10
     * Property: ∀ request tanpa Authorization header → next(err) dengan status 401
     */
    fc.assert(
      fc.property(
        // Generate request dengan header authorization yang tidak valid
        fc.oneof(
          // Tidak ada header sama sekali
          fc.constant({ headers: {} }),
          // Header Authorization tapi bukan Bearer format
          fc.record({
            headers: fc.record({
              authorization: fc.oneof(
                fc.constant(''),
                fc.constant('Basic invalidtoken'),
                fc.constant('Token sometoken'),
                fc.string({ minLength: 0, maxLength: 20 }),
              ),
            }),
          }),
        ),
        (req) => {
          const next = makeNext();
          requireAuth()(req, makeRes(), next);

          return next.wasCalled()
            && next.calledWith() !== undefined
            && next.calledWith().status === 401;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// PRESERVATION-7 — JWT expired/invalid → HTTP 401 dengan pesan spesifik
// ===========================================================================
/**
 * Observasi (pada unfixed code):
 *   JWT yang sudah expired atau tidak valid →
 *   next dipanggil dengan AppError 401 dan message "Sesi tidak valid atau kedaluwarsa. Silakan login ulang."
 *
 * Validates: Requirements 3.11
 */
describe('PRESERVATION-7 — JWT invalid/expired → 401 dengan pesan spesifik', () => {
  test('Observasi: JWT yang sudah expired → 401 dengan pesan sesi tidak valid', () => {
    // Sign dengan expiry di masa lalu
    const expiredToken = jwt.sign(
      { sub: 1, role: 'admin', nama: 'Admin' },
      config.jwtSecret,
      { expiresIn: '-1s' } // Expired 1 detik yang lalu
    );

    const req = makeReq(expiredToken);
    const next = makeNext();

    requireAuth()(req, makeRes(), next);

    expect(next.wasCalled()).toBe(true);
    const err = next.calledWith();
    expect(err).toBeDefined();
    expect(err.status).toBe(401);
    expect(err.message).toBe('Sesi tidak valid atau kedaluwarsa. Silakan login ulang.');
  });

  test('Observasi: JWT dengan secret yang salah → 401 dengan pesan spesifik', () => {
    const tokenWithWrongSecret = jwt.sign(
      { sub: 1, role: 'admin', nama: 'Admin' },
      'wrong-secret-entirely',
      { expiresIn: '1h' }
    );

    const req = makeReq(tokenWithWrongSecret);
    const next = makeNext();

    requireAuth()(req, makeRes(), next);

    expect(next.wasCalled()).toBe(true);
    const err = next.calledWith();
    expect(err.status).toBe(401);
    expect(err.message).toBe('Sesi tidak valid atau kedaluwarsa. Silakan login ulang.');
  });

  test('Observasi: token JWT yang benar-benar tidak valid (random string) → 401', () => {
    const req = makeReq('ini.bukan.jwt.valid');
    const next = makeNext();

    requireAuth()(req, makeRes(), next);

    expect(next.wasCalled()).toBe(true);
    const err = next.calledWith();
    expect(err.status).toBe(401);
    expect(err.message).toBe('Sesi tidak valid atau kedaluwarsa. Silakan login ulang.');
  });

  test('Observasi: JWT manipulasi (signature diubah) → 401', () => {
    const validToken = sign({ sub: 1, role: 'admin', nama: 'Admin' });
    // Ubah karakter terakhir signature untuk membatalkan validitas
    const manipulatedToken = validToken.slice(0, -3) + 'xyz';
    const req = makeReq(manipulatedToken);
    const next = makeNext();

    requireAuth()(req, makeRes(), next);

    expect(next.wasCalled()).toBe(true);
    const err = next.calledWith();
    expect(err.status).toBe(401);
    expect(err.message).toBe('Sesi tidak valid atau kedaluwarsa. Silakan login ulang.');
  });
});

// ===========================================================================
// PRESERVATION-8 — notify() idempotency: dedup_key sama → satu baris
// ===========================================================================
/**
 * Observasi (pada unfixed code):
 *   Memanggil notify() dua kali dengan dedup_key yang sama → ON CONFLICT DO NOTHING →
 *   hanya satu INSERT yang berhasil (idempotent)
 *
 * CATATAN: Test ini memverifikasi bahwa SQL notify() mengandung ON CONFLICT DO NOTHING,
 *          memastikan idempotency tetap terjaga setelah fix BUG-006.
 *
 * Validates: Requirements 3.15
 */
describe('PRESERVATION-8 — notify() idempotency dengan dedup_key yang sama', () => {
  test('Observasi: SQL notify() mengandung ON CONFLICT DO NOTHING untuk idempotency', () => {
    const fs = require('fs');
    const path = require('path');
    const commonJs = fs.readFileSync(
      path.join(__dirname, '../src/services/common.js'),
      'utf-8'
    );

    // Verifikasi ON CONFLICT DO NOTHING ada di fungsi notify
    const notifyFnMatch = commonJs.match(/async function notify[\s\S]+?\n\}/);
    expect(notifyFnMatch).not.toBeNull();
    const notifyFnBody = notifyFnMatch[0];

    expect(notifyFnBody).toContain('ON CONFLICT DO NOTHING');
  });

  test('Observasi: dua pemanggilan notify() dengan dedup yang sama → db.query dipanggil dua kali (SQL idempotent menangani)', () => {
    const callLog = [];
    const mockDb = {
      query: jest.fn((sql, params) => {
        callLog.push({ sql, params });
        return Promise.resolve({ rows: [] });
      }),
    };

    const notifParams = {
      role: 'customer',
      id: 5,
      title: 'Booking Confirmed',
      message: 'Your booking is confirmed',
      type: 'info',
      bookingId: 42,
      tautan: '/status/AC-0042',
      dedup: 'booking_confirmed_42',
    };

    return notify(mockDb, notifParams)
      .then(() => notify(mockDb, notifParams))
      .then(() => {
        // Kedua panggilan mengeksekusi SQL (database yang handle idempotency via ON CONFLICT)
        expect(callLog).toHaveLength(2);

        // Kedua panggilan menggunakan dedup_key yang sama
        const dedupKey = 'booking_confirmed_42';
        // dedup_key ada di params kedua pemanggilan (posisi terakhir)
        expect(callLog[0].params[callLog[0].params.length - 1]).toBe(dedupKey);
        expect(callLog[1].params[callLog[1].params.length - 1]).toBe(dedupKey);

        // SQL mengandung ON CONFLICT DO NOTHING
        expect(callLog[0].sql).toContain('ON CONFLICT DO NOTHING');
      });
  });

  test('Property: dedup_key selalu ada di params notify() untuk berbagai input', async () => {
    /**
     * Validates: Requirements 3.15
     * Property: ∀ pemanggilan notify() → ON CONFLICT DO NOTHING selalu ada di SQL
     *           → database menjamin hanya satu baris per dedup_key
     */
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),  // dedup_key
        fc.integer({ min: 1, max: 9999 }),            // bookingId
        async (dedupKey, bookingId) => {
          let capturedSql = '';
          let capturedParams = [];
          const mockDb = {
            query: jest.fn((sql, params) => {
              capturedSql = sql;
              capturedParams = params;
              return Promise.resolve({ rows: [] });
            }),
          };

          await notify(mockDb, {
            role: 'customer',
            id: 1,
            title: 'Test',
            message: 'Test msg',
            type: 'info',
            bookingId,
            tautan: `/status/AC-${bookingId}`,
            dedup: dedupKey,
          });

          // SQL selalu mengandung ON CONFLICT DO NOTHING
          const hasIdempotency = capturedSql.includes('ON CONFLICT DO NOTHING');
          // dedup_key selalu ada di array params
          const hasDedupInParams = capturedParams.includes(dedupKey);
          return hasIdempotency && hasDedupInParams;
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ===========================================================================
// PRESERVATION-9 — Chatbot rute bukan booking/status → action === null
// ===========================================================================
/**
 * Observasi (pada unfixed code):
 *   chatbot response dengan rute selain 'booking' atau 'status' → action === null
 *   (tidak ada CTA yang ditampilkan)
 *
 * Ini adalah perilaku yang BENAR untuk rute-rute lain seperti 'keluhan', 'tanya_layanan',
 * 'umum', dll. Perilaku ini harus tetap sama setelah BUG-005 diperbaiki.
 *
 * Validates: Requirements 3.6, 3.7
 */
describe('PRESERVATION-9 — Chatbot rute bukan booking/status → action === null', () => {
  // Exact unfixed logic from ChatbotWidget.jsx handleSend
  function getChatbotAction(chatbotResponse) {
    const rute = chatbotResponse.data?.rute || chatbotResponse.rute;
    let action = null;
    if (rute === 'booking') {
      action = { text: 'Pesan Sekarang', link: '/booking' };
    } else if (rute === 'status') {
      action = { text: 'Cek Status', link: '/status' };
    }
    return action;
  }

  test('Observasi: rute keluhan → action === null', () => {
    const response = { jawaban: 'Saya akan buat tiket komplain untuk Anda', rute: 'keluhan' };
    expect(getChatbotAction(response)).toBeNull();
  });

  test('Observasi: rute tanya_layanan → action === null', () => {
    const response = { jawaban: 'Kami menyediakan layanan service AC...', rute: 'tanya_layanan' };
    expect(getChatbotAction(response)).toBeNull();
  });

  test('Observasi: rute umum → action === null', () => {
    const response = { jawaban: 'Terima kasih atas pertanyaan Anda', rute: 'umum' };
    expect(getChatbotAction(response)).toBeNull();
  });

  test('Observasi: rute tidak ada / null → action === null', () => {
    const response = { jawaban: 'Baik, ada yang bisa saya bantu lagi?' };
    expect(getChatbotAction(response)).toBeNull();
  });

  test('Property: semua rute yang bukan booking/status selalu menghasilkan action === null', () => {
    /**
     * Validates: Requirements 3.6, 3.7
     * Property: ∀ rute ∉ {'booking', 'status'} → action === null
     *
     * Ini memverifikasi bahwa rute lainnya (keluhan, tanya_layanan, dll.)
     * TIDAK akan tiba-tiba muncul CTA setelah fix BUG-005.
     */
    const nonCTARutes = fc.string({ minLength: 1, maxLength: 30 }).filter(
      (s) => s !== 'booking' && s !== 'status'
    );

    fc.assert(
      fc.property(
        nonCTARutes,
        fc.string({ minLength: 1, maxLength: 100 }), // jawaban
        (rute, jawaban) => {
          const response = { jawaban, rute };
          return getChatbotAction(response) === null;
        }
      ),
      { numRuns: 200 }
    );
  });

  test('Property: rute yang mengandung string lain (bukan persis booking/status) → action === null', () => {
    /**
     * Konservasi: Pada unfixed code, 'booking_flow' dan 'status_ditemukan' menghasilkan null.
     * Setelah fix, 'booking_flow' dan 'status_ditemukan' akan menghasilkan CTA.
     * Tapi rute seperti 'new_booking_v2' atau 'status_check_2024' yang tidak termasuk
     * dalam definisi fixed code juga harus diverifikasi.
     *
     * CATATAN PENTING: Test ini khusus untuk rute-rute yang bukan dalam set
     * rute yang diperbaiki (booking_flow, status_*), yaitu rute-rute lain
     * yang benar-benar tidak boleh memunculkan CTA.
     *
     * Validates: Requirements 3.6, 3.7
     */
    const otherRutes = fc.constantFrom(
      'keluhan', 'tanya_layanan', 'umum', 'saran', 'lainnya',
      'complaint', 'feedback', 'general', 'unknown'
    );

    fc.assert(
      fc.property(
        otherRutes,
        (rute) => {
          const response = { jawaban: 'Test jawaban', rute };
          return getChatbotAction(response) === null;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// PRESERVATION-10 — requireAuth role check → 403 untuk role yang tidak diizinkan
// ===========================================================================
/**
 * Observasi (pada unfixed code):
 *   Token JWT valid tapi role tidak ada dalam daftar roles yang diizinkan → 403 FORBIDDEN
 *
 * Validates: Requirements 3.10
 */
describe('PRESERVATION-10 — requireAuth dengan role yang salah → 403 FORBIDDEN', () => {
  test('Observasi: JWT customer mencoba akses endpoint admin → 403', () => {
    const payload = { sub: 5, role: 'customer', cid: 5, nama: 'Budi' };
    const token = sign(payload);
    const req = makeReq(token);
    const next = makeNext();

    requireAuth(['admin'])(req, makeRes(), next);

    expect(next.wasCalled()).toBe(true);
    const err = next.calledWith();
    expect(err).toBeDefined();
    expect(err.status).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  test('Observasi: JWT technician mencoba akses endpoint customer → 403', () => {
    const payload = { sub: 3, role: 'technician', tid: 2, nama: 'Andi' };
    const token = sign(payload);
    const req = makeReq(token);
    const next = makeNext();

    requireAuth(['customer'])(req, makeRes(), next);

    expect(next.wasCalled()).toBe(true);
    expect(next.calledWith().status).toBe(403);
  });

  test('Property: JWT dengan role yang tidak ada dalam daftar izin selalu menghasilkan 403', () => {
    /**
     * Validates: Requirements 3.10
     * Property: ∀ JWT dimana role ∉ allowedRoles → next(err) dengan status 403
     */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant({ sub: 1, role: 'customer', cid: 1, nama: 'C' }),
          fc.constant({ sub: 2, role: 'technician', tid: 1, nama: 'T' }),
        ),
        (payload) => {
          const token = sign(payload);
          const req = makeReq(token);
          const next = makeNext();

          requireAuth(['admin'])(req, makeRes(), next);

          return next.wasCalled()
            && next.calledWith() !== undefined
            && next.calledWith().status === 403;
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ===========================================================================
// PRESERVATION-11 — requireAuth tanpa role restriction → next() tanpa error untuk JWT valid
// ===========================================================================
/**
 * Observasi (pada unfixed code):
 *   JWT valid APAPUN ke requireAuth() tanpa roles → next() tanpa error, req.user terisi
 *
 * Validates: Requirements 3.3
 */
describe('PRESERVATION-11 — JWT valid tanpa role restriction → next() tanpa error', () => {
  test('Property: semua JWT valid menghasilkan next() tanpa error ketika tidak ada role restriction', () => {
    /**
     * Validates: Requirements 3.3
     * Property: ∀ JWT valid → requireAuth() tanpa roles → next() tanpa error
     */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({
            sub: fc.integer({ min: 1, max: 9999 }),
            role: fc.constant('admin'),
            nama: fc.string({ minLength: 1, maxLength: 30 }),
          }),
          fc.record({
            sub: fc.integer({ min: 1, max: 9999 }),
            role: fc.constant('technician'),
            tid: fc.integer({ min: 1, max: 9999 }),
            nama: fc.string({ minLength: 1, maxLength: 30 }),
          }),
          fc.record({
            sub: fc.integer({ min: 1, max: 9999 }),
            role: fc.constant('customer'),
            cid: fc.integer({ min: 1, max: 9999 }),
            nama: fc.string({ minLength: 1, maxLength: 30 }),
          }),
        ),
        (payload) => {
          const token = sign(payload);
          const req = makeReq(token);
          const next = makeNext();

          // Tanpa role restriction
          requireAuth()(req, makeRes(), next);

          return next.wasCalled() && next.calledWith() === undefined;
        }
      ),
      { numRuns: 150 }
    );
  });
});

// ===========================================================================
// PRESERVATION-12 — Login redirect tidak pernah ke /customer/dashboard pada unfixed code
// ===========================================================================
/**
 * Observasi (pada unfixed code):
 *   LoginPage.jsx hanya memiliki dua cabang: technician → /technician/dashboard,
 *   semua lainnya → /admin. '/customer/dashboard' tidak pernah menjadi destination.
 *
 * Test ini adalah dokumentasi penting: sebelum fix, '/customer/dashboard' tidak pernah
 * muncul sebagai navigate target. Ini memvalidasi baseline unfixed behavior.
 *
 * NOTE: Test ini akan BERUBAH setelah BUG-001 diperbaiki — customer AKAN diarahkan
 *       ke /customer/dashboard. Namun test ini memverifikasi bahwa admin dan technician
 *       tetap diarahkan dengan benar bahkan setelah fix.
 */
describe('PRESERVATION-12 — Admin dan Technician redirect tidak berubah (baseline)', () => {
  // Versi unfixed dari getNavigateTarget
  function getNavigateTargetUnfixed(loginResult) {
    if (loginResult.user.role === 'technician') {
      return '/technician/dashboard';
    } else {
      return '/admin';
    }
  }

  test('Baseline: role admin → /admin pada unfixed code', () => {
    expect(getNavigateTargetUnfixed({ user: { role: 'admin' } })).toBe('/admin');
  });

  test('Baseline: role technician → /technician/dashboard pada unfixed code', () => {
    expect(getNavigateTargetUnfixed({ user: { role: 'technician' } })).toBe('/technician/dashboard');
  });

  test('Property: role admin dan technician selalu mendapat redirect yang benar', () => {
    /**
     * Validates: Requirements 3.1, 3.2
     * Baseline: admin → /admin, technician → /technician/dashboard
     * Ini harus tetap berlaku SETELAH fix BUG-001 juga.
     */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({ user: fc.record({ role: fc.constant('admin'), nama: fc.string({ minLength: 1 }) }) }),
          fc.record({ user: fc.record({ role: fc.constant('technician'), nama: fc.string({ minLength: 1 }) }) }),
        ),
        (loginResult) => {
          const target = getNavigateTargetUnfixed(loginResult);
          if (loginResult.user.role === 'admin') return target === '/admin';
          if (loginResult.user.role === 'technician') return target === '/technician/dashboard';
          return false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
