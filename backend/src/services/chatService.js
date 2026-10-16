const { query } = require('../db/pool');
const config = require('../config');
const { E } = require('../errors');
const ai = require('./aiClient');
const { sha256, normalizePhone, BOOKING_CODE_RE } = require('../utils/ids');
const { getOps, getAvailability, publicStatusByCode } = require('./bookingService');
const { formatWib } = require('../utils/time');
const gemini = require('./geminiService');

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const rupiah = (n) => `Rp${Number(n).toLocaleString('id-ID')}`;

const FALLBACK_HELP = {
  pesan: 'Maaf, aku belum paham. Bisa ulangi atau coba pakai pertanyaan lain? Misalnya: "Berapa harga cuci AC?", "Cara booking gimana?", atau "AC saya bocor, bagaimana ya?"',
  saran: ['Berapa harga cuci AC?', 'Saya mau booking servis', 'Cek status AC-1234', 'AC saya tidak dingin'],
};

// Conversation state management with TTL and size limit
const conversationStates = new Map();
const CONVERSATION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CONVERSATIONS = 1000;

/**
 * Cleanup expired conversation states
 */
function cleanupConversationStates() {
  const now = Date.now();
  for (const [userId, state] of conversationStates.entries()) {
    if (now - state.lastUpdated > CONVERSATION_TTL_MS) {
      conversationStates.delete(userId);
    }
  }
  // Also limit total number of conversations
  while (conversationStates.size > MAX_CONVERSATIONS) {
    // Delete the oldest one
    let oldestUserId = null;
    let oldestTime = Infinity;
    for (const [userId, state] of conversationStates.entries()) {
      if (state.lastUpdated < oldestTime) {
        oldestTime = state.lastUpdated;
        oldestUserId = userId;
      }
    }
    if (oldestUserId) {
      conversationStates.delete(oldestUserId);
    }
  }
}

/**
 * Get or create conversation state for a user
 * State contains: current context, collected entities, conversation history
 */
function getConversationState(userId) {
  // Periodic cleanup (every 100 calls)
  if (Math.random() < 0.01) {
    cleanupConversationStates();
  }
  
  if (!conversationStates.has(userId)) {
    conversationStates.set(userId, {
      id: userId,
      context: null, // Current conversation context (e.g., 'booking_flow', 'status_check')
      entities: {},   // Collected entities (service_type, date, time, etc.)
      history: [],    // Last few messages for context
      createdAt: Date.now(),
      lastUpdated: Date.now()
    });
  }
  return conversationStates.get(userId);
}

function updateConversationState(userId, updates) {
  const state = getConversationState(userId);
  Object.assign(state, updates, { lastUpdated: Date.now() });
  // Keep history limited to last 10 messages
  if (state.history && state.history.length > 10) {
    state.history = state.history.slice(-10);
  }
  return state;
}

function clearConversationState(userId) {
  conversationStates.delete(userId);
}

// Intent to action mapping with context awareness
const INTENT_ACTIONS = {
  greeting: handleGreeting,
  tanya_layanan: handleServiceQuery,
  tanya_harga: handlePriceQuery,
  keluhan_ac: handleComplaint,
  booking_service: handleBookingRequest,
  ubah_jadwal: handleScheduleChange,
  batalkan_booking: handleBookingCancellation,
  tanya_status: handleStatusQuery,
  tanya_pembayaran: handlePaymentQuery,
  tanya_teknisi: handleTechnicianQuery,
  tanya_area_layanan: handleAreaQuery,
  tanya_prosedur: handleProcedureQuery,
  follow_up: handleFollowUp,
  konfirmasi: handleConfirmation,
  penolakan: handleRejection,
  human_handoff: handleHandoffRequest,
  cek_jadwal: handleAvailabilityCheck,
  tanya_jadwal: handleAvailabilityCheck,
  availability: handleAvailabilityCheck,
  feedback: handleFeedback,
  admin_query: handleAdminQuery,
  tech_query: handleTechQuery,
  // Legacy intents (map to new ones)
  booking: handleBookingRequest,
  keluhan: handleComplaint,
  lainnya: handleUnknown,
};

// Helper to get service catalog from database
async function getServiceCatalog() {
  const services = (await query('SELECT * FROM service_catalog WHERE aktif ORDER BY id')).rows;
  return services;
}

// Helper to get operational settings
async function getOperationalSettings() {
  const ops = await getOps();
  const hari = ops.days.map((d) => DAY_NAMES[d]).join(', ');
  return {
    ...ops,
    hari_layanan: hari,
    jam_buka: ops.open,
    jam_tutup: ops.close,
  };
}

// Helper to get payment settings from database
async function getPaymentSettings() {
  const r = await query("SELECT value FROM settings WHERE setting_key= 'payment_accounts'");
  if (r.rows[0]) {
    return r.rows[0].value;
  }
  // Return default payment settings
  return {
    accounts: [
      { id: '1', bank_name: 'BCA', account_number: '8720-9182-33', account_holder: 'CV NARA TEKNINDOTAMA' },
      { id: '2', bank_name: 'Mandiri', account_number: '137-00-9821-4451', account_holder: 'CV NARA TEKNINDOTAMA' },
    ],
    instruction_note: '*Tersedia juga opsi pembayaran tunai / QRIS langsung kepada teknisi setelah pekerjaan selesai di lokasi.'
  };
}

// Helper to get business profile from database
async function getBusinessProfile() {
  const r = await query("SELECT value FROM settings WHERE setting_key= 'business_profile'");
  if (r.rows[0]) {
    return r.rows[0].value;
  }
  // Return default business profile
  return {
    name: 'CV. NARA TEKNINDOTAMA',
    tagline: 'Spesialis Layanan Service, Maintenance & Instalasi AC Profesional',
    address: 'Jl. Raya Industri No. 45, Kawasan Sentra Bisnis',
    phone: '+62 812-3456-7890',
    hours: 'Senin - Sabtu: 08.00 - 17.00 WIB',
    guarantee: 'Garansi Pengerjaan Resmi 30 Hari'
  };
}

// Helper to identify complaint severity
function getComplaintSeverity(complaintText) {
  const lowerText = complaintText.toLowerCase();
  const severeKeywords = ['bocor', 'kebakaran', ' listrik ', 'tersengat', 'meledak', 'terbakar', 'asap', 'percikan api'];
  const urgentKeywords = ['tidak dingin sama sekali', 'mati total', 'tidak nyala', 'freon habis', 'segera', 'darurat'];
  
  for (const keyword of severeKeywords) {
    if (lowerText.includes(keyword)) {
      return 'severe';
    }
  }
  for (const keyword of urgentKeywords) {
    if (lowerText.includes(keyword)) {
      return 'urgent';
    }
  }
  return 'normal';
}

// Helper to generate quick replies based on context
function getQuickReplies(intent, context, entities) {
  const replies = [];
  
  switch (intent) {
    case 'greeting':
      replies.push('Info layanan & harga');
      replies.push('Buat booking servis');
      replies.push('Cek status booking');
      replies.push('Laporkan keluhan');
      break;
    case 'keluhan_ac':
      replies.push('Ya, saya ingin booking pemeriksaan');
      replies.push('Tanya perkiraan biaya');
      replies.push('Hubungi admin');
      break;
    case 'booking_service':
      replies.push('Lihat layanan yang tersedia');
      replies.push('Tanya harga dulu');
      replies.push('Langsung booking');
      break;
    case 'tanya_status':
      if (entities?.booking_code) {
        replies.push(`Cek status ${entities.booking_code}`);
      } else {
        replies.push('Cari dengan kode booking');
        replies.push('Bantu mencari booking saya');
      }
      break;
    case 'tanya_layanan':
      replies.push('Layanan cuci AC');
      replies.push('Layanan perbaikan');
      replies.push('Layanan instalasi');
      break;
    default:
      replies.push('Info layanan');
      replies.push('Buat booking');
      replies.push('Cek status');
  }
  
  return replies;
}

/** Korpus RAG dibangun dari satu sumber kebenaran: service_catalog + settings (bukan hardcode). */
async function buildCorpus() {
  const services = (await query('SELECT * FROM service_catalog WHERE aktif ORDER BY id')).rows;
  const ops = await getOps();
  const docs = services.map((s) => ({
    id: `layanan-${s.kode}`,
    title: s.nama_layanan,
    source: s.is_synthetic ? 'katalog-layanan (DATA DEMO SINTETIS)' : 'katalog-layanan',
    text: `Layanan ${s.nama_layanan} (kategori ${s.kategori}). ${s.deskripsi} Harga ${rupiah(s.harga)}. Estimasi durasi pengerjaan ${s.durasi_menit} menit.`,
  }));
  const hari = ops.days.map((d) => DAY_NAMES[d]).join(', ');
  docs.push({
    id: 'jam-operasional',
    title: 'Jam operasional',
    source: 'pengaturan-operasional',
    text: `Jam operasional layanan servis AC: ${ops.open} sampai ${ops.close} WIB. Hari layanan: ${hari}. Booking minimal ${ops.min_lead_minutes} menit sebelum jadwal.`,
  });
  docs.push({
    id: 'cara-booking',
    title: 'Cara booking dan pengingat',
    source: 'prosedur-aplikasi',
    text: 'Cara booking servis AC: buka halaman Booking, pilih layanan, pilih tanggal dan jam yang tersedia, isi alamat, keluhan, dan nomor HP, lalu kirim. Anda akan menerima kode booking berformat AC-XXXX. Cek status pekerjaan dengan kode booking tersebut. Status pekerjaan: scheduled, on process, lalu done. Pengingat jadwal dicatat H-1 sebelum kunjungan. Setelah pekerjaan selesai Anda dapat memberi rating dan feedback.',
  });
  return { docs, hash: sha256(JSON.stringify(docs)) };
}

async function logInference({ text, intent, confidence, endpoint, rute, fallback, error, latency, modelVersion }) {
  try {
    await query(
      `INSERT INTO inference_log (teks_hash, panjang_teks, intent, confidence, endpoint, rute, fallback, error, latency_ms, model_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [sha256(String(text).trim().toLowerCase()), String(text).length, intent || null,
        confidence === null || confidence === undefined ? null : confidence, endpoint, rute || null, !!fallback, error || null, latency || null, modelVersion || null],
    );
  } catch (e) {
    console.error('[inference_log] gagal menulis:', e.message);
  }
}

async function predictIntent(text) {
  const t0 = Date.now();
  try {
    const r = await ai.predictIntent(text);
    await logInference({
      text, intent: r.intent, confidence: r.confidence, endpoint: '/ai/predict-intent',
      fallback: r.low_confidence, latency: Date.now() - t0, modelVersion: r.model_version,
    });
    return r;
  } catch (e) {
    await logInference({ text, endpoint: '/ai/predict-intent', fallback: true, error: e.detail ? e.detail.reason : e.message, latency: Date.now() - t0 });
    throw e;
  }
}

let indexedHash = null;
async function ensureIndexed(corpus) {
  if (indexedHash === corpus.hash) return;
  await ai.ragIndex(corpus.docs, corpus.hash);
  indexedHash = corpus.hash;
}
function resetIndexCache() { indexedHash = null; }

async function answerService(message) {
  const corpus = await buildCorpus();
  await ensureIndexed(corpus);
  try {
    return await ai.ragAnswer(message, corpus.hash);
  } catch (e) {
    if (e.aiStatus === 409) { // indeks AI service kedaluwarsa / restart
      indexedHash = null;
      await ensureIndexed(corpus);
      return ai.ragAnswer(message, corpus.hash);
    }
    throw e;
  }
}

function unavailableWithFallback(e) {
  const reason = e.detail && e.detail.reason;
  const msg = reason === 'timeout'
    ? 'Asisten sedang lambat. Anda tetap bisa booking atau cek status secara manual.'
    : 'Asisten otomatis sedang tidak tersedia. Anda tetap bisa booking atau cek status secara manual, atau hubungi admin.';
  return E.unavailable(msg, {
    reason: reason || 'unavailable',
    fallback: { aksi: [{ type: 'open_booking', label: 'Buat booking', path: '/booking' }, { type: 'open_status', label: 'Cek status', path: '/status' }] },
  });
}

/** Orkestrasi chatbot: intent (model tim) → routing dengan context management. */
async function handleChat(message, userId = null, userRole = null) {
  const t0 = Date.now();
  
  // Get conversation state if userId is provided
  const state = userId ? getConversationState(userId) : null;
  
  // Add to history if state exists
  if (state) {
    state.history.push({ role: 'user', text: message, timestamp: Date.now() });
  }
  
  let pred;
  try {
    pred = await ai.predictIntent(message);
  } catch (e) {
    await logInference({ text: message, endpoint: '/ai/answer', fallback: true, error: e.detail ? e.detail.reason : e.message, rute: 'ai_unavailable', latency: Date.now() - t0 });
    if (e.status === 503) throw unavailableWithFallback(e);
    throw e;
  }
  
  // Extract entities from the message
  const entities = pred.entities || {};
  
  // Store entities in conversation state if available
  if (state && Object.keys(entities).length > 0) {
    state.entities = { ...state.entities, ...entities };
  }
  
  const intent = pred.intent;
  const confidence = pred.confidence;
  const threshold = config.aiConfidenceThreshold;
  
  const done = async (payload, rute) => {
    await logInference({
      text: message, intent, confidence, endpoint: '/ai/answer', rute,
      fallback: !!payload.fallback, latency: Date.now() - t0, modelVersion: pred.model_version,
    });
    
    // Add bot response to history
    if (state && payload.jawaban) {
      state.history.push({ role: 'bot', text: payload.jawaban, timestamp: Date.now() });
    }
    
    return { 
      intent, 
      confidence, 
      rute,
      entities: state ? state.entities : entities,
      ...payload 
    };
  };

  // If Gemini API is configured, use it for informative, conversational reasoning
  const hasBookingCode = BOOKING_CODE_RE.test(message);
  if (!(hasBookingCode && intent === 'tanya_status') && config.geminiApiKey) {
    try {
      const history = state ? state.history : [];
      const geminiRes = await gemini.generateGeminiAnswer(message, history);
      if (geminiRes && geminiRes.jawaban) {
        return await done(geminiRes, 'gemini_generative');
      }
    } catch (e) {
      console.warn('[chatService] Gemini call fallback to local engine:', e.message);
    }
  }

  // Handle low confidence or unknown intent
  if (intent === 'lainnya' || confidence < threshold) {
    // Try to use context from previous messages
    if (state && state.context) {
      // If we're in a booking flow, continue with it
      if (state.context === 'booking_flow') {
        return await handleBookingFollowUp(message, state, done);
      }
    }
    
    return done({
      jawaban: FALLBACK_HELP.pesan,
      saran: FALLBACK_HELP.saran,
      fallback: true,
      aksi: [
        { type: 'open_booking', label: 'Buat booking', path: '/booking' },
        { type: 'open_status', label: 'Cek status', path: '/status' }
      ],
      quick_replies: ['Info layanan', 'Harga cuci AC', 'Booking servis']
    }, 'fallback');
  }

  // Route to appropriate handler based on intent
  const handler = INTENT_ACTIONS[intent] || INTENT_ACTIONS.lainnya || handleUnknown;
  
  try {
    // Call the handler with context
    const result = await handler(message, { 
      entities, 
      state, 
      userId,
      userRole,
      intent,
      confidence,
      threshold
    });
    
    // If handler returns a promise, await it
    if (result && typeof result.then === 'function') {
      return await result;
    }
    
    // Otherwise, use the done helper
    return done(result, intent);
  } catch (e) {
    console.error(`[chatService] Error handling intent ${intent}:`, e.message);
    return done({
      jawaban: 'Maaf, terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi atau hubungi admin.',
      fallback: true
    }, 'error');
  }
}


// Individual intent handlers

async function handleGreeting(message, context) {
  const { state } = context;
  
  // Check if there's an ongoing conversation
  if (state && state.context) {
    switch (state.context) {
      case 'booking_flow':
        return {
          jawaban: 'Ya, lanjutkan aja. Mau cerita keluhan AC-mu atau langsung sebutkan layanannya?',
          aksi: [{ type: 'open_booking', label: 'Lanjut booking', path: '/booking' }],
          fallback: false,
          quick_replies: ['Cuci AC', 'Perbaikan AC', 'Pasang AC', 'Isi Freon']
        };
      default:
        break;
    }
  }
  
  // New conversation greeting - more casual and friendly
  const greetings = ['Halo!', 'Pagi!', 'Siang!', 'Sore!', 'Assalamualaikum!'];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  return {
    jawaban: `${greeting} Ada yang bisa aku bantu?`,
    saran: ['Berapa harga cuci AC?', 'Mau booking servis?', 'Cek status booking', 'AC saya rusak'],
    fallback: false,
    quick_replies: ['Info layanan & harga', 'Booking servis', 'Cek status'],
    aksi: [
      { type: 'open_booking', label: 'Booking', path: '/booking' },
      { type: 'open_status', label: 'Cek Status', path: '/status' }
    ]
  };
}

async function handleServiceQuery(message, context) {
  const { entities } = context;
  
  let r;
  try {
    r = await answerService(message);
  } catch (e) {
    // Fallback to database query (BR-44)
    const services = await getServiceCatalog();
    if (services.length === 0) {
      return {
        jawaban: 'Sedang tidak ada info layanan yang bisa aku tampilkan. Coba lagi nanti ya.',
        fallback: true
      };
    }
    
    // Try to match the query
    const lowerMsg = message.toLowerCase();
    for (const service of services) {
      if (lowerMsg.includes(service.nama_layanan.toLowerCase()) ||
          lowerMsg.includes(service.kategori.toLowerCase())) {
        return {
          jawaban: `Ya, kami menawarkan layanan ${service.nama_layanan}. ${service.deskripsi} Harganya ${rupiah(service.harga)} dan biasanya memakan waktu ${service.durasi_menit} menit.`,
          sumber: ['katalog-layanan'],
          fallback: false,
          aksi: [{ type: 'open_booking', label: 'Pesan layanan ini', path: `/booking?service=${service.kode}` }],
          quick_replies: ['Pesan sekarang', 'Tanya layanan lain', 'Cek harga lain']
        };
      }
    }
    
    // Return all services
    const serviceList = services.map(s => `• ${s.nama_layanan}: ${rupiah(s.harga)}`).join('\n');
    return {
      jawaban: `Ini beberapa layanan yang kami tawarkan:\n${serviceList}\n\nTertarik dengan yang mana? Atau mau tanya detail suatu layanan?`,
      fallback: false,
      quick_replies: services.slice(0, 3).map(s => `Info ${s.nama_layanan}`)
    };
  }
  
  if (!r.in_domain) {
    return {
      jawaban: 'Maaf ya, aku gak nemu info tentang itu di katalog layanan kami. Coba tanyakan dengan cara lain, misal: "Harga cuci AC berapa?", "Jam operasionalnya kapan?", atau "Bisa isi freon ga?"',
      fallback: true,
      saran: ['Berapa harga cuci AC?', 'Jam operasional kapan?', 'Apakah bisa isi freon?'],
      quick_replies: ['Harga cuci AC', 'Jam operasional', 'Layanan perbaikan']
    };
  }
  
  // Make RAG answer more natural
  let answer = r.answer;
  // Clean up RAG answer if it looks like it's from the catalog
  if (answer && answer.includes('Layanan')) {
    answer = answer.replace('Layanan', 'Kami punya layanan');
  }
  
  return {
    jawaban: answer,
    sumber: r.sources,
    mode_jawaban: r.mode,
    fallback: false,
    quick_replies: getQuickReplies('tanya_layanan', null, entities)
  };
}

async function handlePriceQuery(message, context) {
  const { entities } = context;
  const services = await getServiceCatalog();
  
  if (services.length === 0) {
    return {
      jawaban: 'Maaf, daftar harganya lagi gak bisa diload. Coba lagi nanti ya.',
      fallback: true
    };
  }
  
  // Try to find specific service
  const lowerMsg = message.toLowerCase();
  for (const service of services) {
    if (lowerMsg.includes(service.nama_layanan.toLowerCase()) ||
        lowerMsg.includes(service.kode.toLowerCase())) {
      return {
        jawaban: `Harga ${service.nama_layanan} (${service.kategori}) adalah ${rupiah(service.harga)}. Perkiraan waktu pengerjaan ${service.durasi_menit} menit.`,
        harga: { layanan: service.nama_layanan, harga: service.harga },
        fallback: false,
        aksi: [{ type: 'open_booking', label: 'Pesan sekarang', path: `/booking?service=${service.kode}` }],
        quick_replies: ['Pesan layanan ini', 'Tanya layanan lain', 'Lihat semuanya']
      };
    }
  }
  
  // Return price list in a more natural way
  const priceList = services.map(s => `• ${s.nama_layanan}: ${rupiah(s.harga)}`).join('\n');
  return {
    jawaban: `Ini daftar harga layanan kami:\n${priceList}\n\nMau tanya harga layanan tertentu? Cukup sebutkan namanya.`,
    fallback: false,
    quick_replies: services.slice(0, 5).map(s => s.nama_layanan)
  };
}

async function handleComplaint(message, context) {
  const { entities, userId } = context;
  const lowerMsg = message.toLowerCase();
  
  // Check severity for safety warnings
  const severity = getComplaintSeverity(message);
  
  let safetyWarning = '';
  if (severity === 'severe') {
    safetyWarning = '⚠️ PERINGATAN: Kalau ada kebocoran listrik, percikan api, atau bau terbakar, SEGERA matikan AC dan cabut stekernya! Hubungi layanan darurat!\n\n';
  } else if (severity === 'urgent') {
    safetyWarning = 'ℹ️ Saran: Kalau AC gak mau nyala sama sekali atau freon habis, sebaiknya segera periksa.\n\n';
  }
  
  // Extract booking code if available
  const m = BOOKING_CODE_RE.exec(message);
  let bookingId = null;
  if (m) {
    const b = (await query('SELECT id FROM bookings WHERE kode_booking=$1', [m[0].toUpperCase()])).rows[0];
    bookingId = b ? b.id : null;
  }
  
  // Record the complaint
  const t = (await query(
    "INSERT INTO complaint_tickets (booking_id, pesan, sumber, severity) VALUES ($1,$2,'chatbot',$3) RETURNING id",
    [bookingId, message.slice(0, 1000), severity]
  )).rows[0];
  
  const response = `${safetyWarning}Oke, keluhanmu sudah aku catat sebagai tiket #${t.id}. Admin akan lihat dan tanggapi secepatnya. Maaf ya atas ketidaknyamanannya.`;
  
  // Suggest next steps
  const hasBookingCode = m !== null;
  const suggestions = [];
  
  if (severity === 'severe') {
    suggestions.push('Hubungi admin SEKARANG');
  } else if (!hasBookingCode) {
    suggestions.push('Booking pemeriksaan');
  }
  
  return {
    jawaban: response,
    tiket: { id: t.id, status: 'open', severity },
    fallback: false,
    aksi: suggestions.length > 0 ? suggestions.map(s => ({ type: 'open_booking', label: s, path: '/booking' })) : [],
    quick_replies: ['Hubungi admin', 'Buat booking', 'Info layanan']
  };
}

async function handleBookingRequest(message, context) {
  const { state, userId, entities } = context;
  
  // If we already have context, this might be a follow-up
  if (state && state.context === 'booking_flow') {
    return await handleBookingFollowUp(message, state, context.done);
  }
  
  // New booking request
  // Try to extract service type and other entities
  const serviceType = entities.service_type || null;
  const acUnits = entities.ac_units || null;
  const date = entities.date || null;
  const time = entities.time || null;
  const urgency = entities.needs_urgent ? true : null;
  
  // Build a natural response
  let response;
  let actions = [{ type: 'open_booking', label: 'Buat booking', path: '/booking' }];
  let quickReplies = [];
  
  // If we have some information, acknowledge it in a natural way
  const infoParts = [];
  if (serviceType) {
    const serviceNames = {
      'cuci': 'cuci AC',
      'perbaikan': 'perbaikan AC',
      'instalasi': 'pemasangan AC',
      'isi freon': 'pengisian freon'
    };
    infoParts.push(serviceNames[serviceType] || serviceType);
  }
  if (acUnits) {
    infoParts.push(`${acUnits} unit`);
  }
  if (date) {
    infoParts.push(date);
  }
  if (time) {
    infoParts.push(`pukul ${time}`);
  }
  
  if (infoParts.length > 0) {
    if (urgency) {
      response = `Oke, aku catat kamu butuh ${infoParts.join(', ')} segera. `;
      response += 'Penting: Pemesanan Anda belum tersimpan di sistem. Silakan buka formulir booking, pilih layanan, tanggal dan jam kosong untuk mendapatkan Kode Booking resmi.';
    } else {
      response = `Oke, aku catat kamu mau booking untuk ${infoParts.join(', ')}. `;
      response += 'Penting: Pemesanan Anda belum tersimpan di sistem. Buka formulir booking ya, lalu pilih layanan, tanggal, dan jam yang tersedia untuk mendapatkan Kode Booking resmi.';
    }
    quickReplies.push('Lihat layanan lain');
  } else {
    if (urgency) {
      response = 'Oke, kamu butuh service AC segera ya? Pemesanan Anda belum tersimpan. Silakan buka formulir booking, pilih layanan dan jam yang kosong.';
    } else {
      response = 'Mau booking service AC? Pemesanan belum tersimpan sebelum Anda melengkapi formulir dan mendapatkan kode booking resmi.';
    }
  }
  
  // If urgency is indicated
  if (urgency) {
    quickReplies.push('Lihat slot tersedia hari ini');
  }
  
  // Set context for follow-up
  if (userId) {
    updateConversationState(userId, {
      context: 'booking_flow',
      entities: { serviceType, acUnits, date, time }
    });
  }
  
  return {
    jawaban: response,
    aksi: actions,
    fallback: false,
    quick_replies: quickReplies.length > 0 ? quickReplies : ['Lihat layanan', 'Tanya harga', 'Cek ketersediaan']
  };
}

async function handleBookingFollowUp(message, state, done) {
  // This handles follow-up messages in a booking conversation
  const { entities } = state;
  const lowerMsg = message.toLowerCase();
  
  // Check if user is providing more information
  const newEntities = {};
  
  // Extract additional info
  if (BOOKING_CODE_RE.test(message)) {
    newEntities.booking_code = BOOKING_CODE_RE.exec(message)[0];
  }
  
  // Check for date/time
  const datePatterns = [
    /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/,
    /\b(besok|lusa|hari ini|minggu depan)\b/,
    /\b(senin|selasa|rabu|kamis|jumat|sabtu|minggu)\b/
  ];
  
  for (const pattern of datePatterns) {
    const match = message.match(pattern);
    if (match) {
      newEntities.date = match[0];
      break;
    }
  }
  
  // Check for time
  const timeMatch = message.match(/\b(\d{1,2}:\d{2})\b/);
  if (timeMatch) {
    newEntities.time = timeMatch[0];
  }
  
  // Check for service type keywords
  const serviceKeywords = ['cuci', 'perbaikan', 'instalasi', 'isi freon', 'bongkar', 'pasang'];
  for (const keyword of serviceKeywords) {
    if (lowerMsg.includes(keyword)) {
      newEntities.service_type = keyword;
      break;
    }
  }
  
  // Merge with existing entities
  Object.assign(state.entities, newEntities);
  
  // If we now have enough info, suggest opening booking form
  if (state.entities.service_type || state.entities.date || state.entities.time) {
    return done({
      jawaban: 'Baik, informasi tambahan sudah saya catat. Silakan buka formulir booking untuk melengkapi data.',
      aksi: [{ type: 'open_booking', label: 'Buka form booking', path: '/booking' }],
      fallback: false,
      quick_replies: ['Lanjut ke booking', 'Tanya lagi', 'Batalkan']
    }, 'booking_followup');
  }
  
  // Otherwise, ask for missing information
  const missing = [];
  if (!state.entities.service_type) missing.push('jenis layanan');
  if (!state.entities.date && !state.entities.time) missing.push('tanggal/jam');
  
  if (missing.length > 0) {
    return done({
      jawaban: `Untuk melanjutkan booking, saya perlu tahu ${missing.join(' dan ')}. Bisakah Anda memberitahunya?`,
      fallback: false,
      quick_replies: ['Cuci AC', 'Perbaikan', 'Besok', 'Hari ini']
    }, 'booking_need_info');
  }
  
  return done({
    jawaban: 'Baik, mari buat booking. Pilih layanan, tanggal, dan jam yang tersedia.',
    aksi: [{ type: 'open_booking', label: 'Buka form booking', path: '/booking' }],
    fallback: false
  }, 'booking_flow');
}

async function handleScheduleChange(message, context) {
  const { entities, userId } = context;
  const bookingCode = entities.booking_code || (BOOKING_CODE_RE.exec(message) || [null])[0];
  
  if (!bookingCode) {
    return {
      jawaban: 'Mau ubah jadwal booking? Sebutkan aja kode bookingsmu. Contoh: AC-1234.',
      fallback: false,
      aksi: [{ type: 'open_status', label: 'Cek status booking', path: '/status' }]
    };
  }
  
  // Check if booking exists and can be modified
  try {
    const booking = (await query(
      'SELECT id, kode_booking, status, jadwal_mulai FROM bookings WHERE kode_booking=$1',
      [bookingCode.toUpperCase()]
    )).rows[0];
    
    if (!booking) {
      return {
        jawaban: `Kode booking ${bookingCode} gak ketemu. Pastikan lagi ya.`,
        fallback: true
      };
    }
    
    // Check if booking can be modified (not done or cancelled)
    const canModify = ['scheduled', 'rescheduled', 'delayed'].includes(booking.status);
    if (!canModify) {
      return {
        jawaban: `Booking ${bookingCode} udah status "${booking.status}", jadi gak bisa diubah lagi.`,
        fallback: false,
        aksi: [{ type: 'open_status', label: 'Lihat detail', path: `/status?kode=${bookingCode}` }]
      };
    }
    
    return {
      jawaban: `Untuk ubah jadwal booking ${bookingCode}, kamu harus hubungi admin dulu atau buka halaman status untuk lihat opsi yang tersedia.`,
      fallback: false,
      aksi: [{ type: 'open_status', label: 'Lihat detail booking', path: `/status?kode=${bookingCode}` }],
      quick_replies: ['Hubungi admin', 'Lihat detail']
    };
  } catch (e) {
    return {
      jawaban: 'Maaf, ada error nih. Coba lagi ya.',
      fallback: true
    };
  }
}

async function handleBookingCancellation(message, context) {
  const { entities } = context;
  const bookingCode = entities.booking_code || (BOOKING_CODE_RE.exec(message) || [null])[0];
  
  if (!bookingCode) {
    return {
      jawaban: 'Mau batalkan booking? Sebutkan aja kode bookingsmu.',
      fallback: false,
      aksi: [{ type: 'open_status', label: 'Cek status booking', path: '/status' }]
    };
  }
  
  return {
    jawaban: `Untuk batalkan booking ${bookingCode}, kamu harus hubungi admin dulu atau buka halaman status booking.`,
    fallback: false,
    aksi: [{ type: 'open_status', label: `Lihat ${bookingCode}`, path: `/status?kode=${bookingCode}` }],
    quick_replies: ['Hubungi admin', 'Cek status dulu', 'Gak jadi']
  };
}

async function handleStatusQuery(message, context) {
  const { entities } = context;
  
  // Try to extract booking code
  let bookingCode = entities.booking_code;
  const codeMatch = BOOKING_CODE_RE.exec(message);
  
  if (codeMatch) {
    bookingCode = codeMatch[0];
  }
  
  if (!bookingCode) {
    return {
      jawaban: 'Untuk cek status booking, sebutkan aja kode bookingsmu. Contoh: AC-1234. Atau buka halaman Cek Status.',
      aksi: [{ type: 'open_status', label: 'Cek status', path: '/status' }],
      fallback: false,
      quick_replies: ['Cek dengan kode booking']
    };
  }
  
  try {
    const s = await publicStatusByCode(bookingCode);
    const lower = message.toLowerCase();

    // Strict Anti-Hallucination: Verifikasi Pembayaran
    if (lower.includes('bayar') || lower.includes('bukti') || lower.includes('lunas') || lower.includes('pembayaran') || lower.includes('transfer')) {
      const isPaid = s.status_pembayaran === 'paid';
      const isVerified = s.status_verifikasi_pembayaran === 'diverifikasi';
      if (isPaid || isVerified) {
        return {
          jawaban: `Pembayaran untuk booking ${s.kode_booking} (${s.layanan}) telah TERVERIFIKASI LUNAS sebesar ${rupiah(s.total_dibayar || s.harga)}. Bukti pembayaran telah diterima dan diverifikasi resmi.`,
          status_pembayaran: s.status_pembayaran,
          status_verifikasi: s.status_verifikasi_pembayaran,
          terverifikasi: true,
          fallback: false,
          aksi: [{ type: 'open_status', label: 'Lihat Status', path: `/status?kode=${s.kode_booking}` }]
        };
      } else {
        return {
          jawaban: `Status pembayaran untuk booking ${s.kode_booking} saat ini adalah "${s.status_pembayaran}" dengan status verifikasi "${s.status_verifikasi_pembayaran}". Pembayaran belum terverifikasi oleh admin/keuangan. AI dilarang menyatakan pembayaran terverifikasi sebelum status pembayaran di database adalah "paid" atau "diverifikasi".`,
          status_pembayaran: s.status_pembayaran,
          status_verifikasi: s.status_verifikasi_pembayaran,
          terverifikasi: false,
          fallback: false,
          aksi: [{ type: 'open_status', label: 'Cek Status Pembayaran', path: `/status?kode=${s.kode_booking}` }]
        };
      }
    }

    // Strict Anti-Hallucination: Status Klaim Garansi
    if (lower.includes('klaim') || lower.includes('claim') || lower.includes('garansi') || lower.includes('kompensasi')) {
      const claim = (await query(
        `SELECT id, kode_klaim, status, keluhan, catatan_pemeriksaan, alasan_penolakan 
         FROM warranty_claims WHERE booking_id = $1 ORDER BY id DESC LIMIT 1`,
        [s.id]
      )).rows[0];

      if (!claim) {
        return {
          jawaban: `Belum ada pengajuan klaim garansi tercatat untuk booking ${s.kode_booking}. Jika Anda mengalami kendala setelah servis, silakan ajukan klaim melalui menu Garansi atau hubungi admin.`,
          fallback: false
        };
      }

      if (claim.status === 'disetujui') {
        return {
          jawaban: `Klaim garansi ${claim.kode_klaim || '#' + claim.id} untuk booking ${s.kode_booking} telah DISETUJUI oleh admin. Tim teknisi akan segera menindaklanjuti jadwal perbaikan garansi.`,
          status_klaim: claim.status,
          claim_id: claim.id,
          disetujui: true,
          fallback: false
        };
      } else if (claim.status === 'ditolak') {
        return {
          jawaban: `Klaim garansi ${claim.kode_klaim || '#' + claim.id} untuk booking ${s.kode_booking} telah DITOLAK oleh admin dengan alasan: "${claim.alasan_penolakan || 'Tidak memenuhi syarat garansi'}". Silakan hubungi admin jika butuh penjelasan lanjutan.`,
          status_klaim: claim.status,
          claim_id: claim.id,
          disetujui: false,
          fallback: false
        };
      } else {
        return {
          jawaban: `Klaim garansi ${claim.kode_klaim || '#' + claim.id} untuk booking ${s.kode_booking} saat ini MASIH DALAM PROSES PENINJAUAN oleh admin (status: ${claim.status}). AI dilarang menyatakan klaim disetujui sebelum disetujui resmi oleh admin di database.`,
          status_klaim: claim.status,
          claim_id: claim.id,
          disetujui: false,
          fallback: false
        };
      }
    }
    
    // Format status information
    const status = s.status;
    const layanan = s.layanan || 'Service AC';
    const jadwal = formatWib(new Date(s.jadwal_mulai));
    const teknisi = s.teknisi ? ` Teknisi: ${s.teknisi}.` : '';
    
    // Add natural explanation about what the status means
    let statusExplanation = '';
    switch (status) {
      case 'scheduled':
        statusExplanation = ' Sudah terjadwal.';
        break;
      case 'on process':
        statusExplanation = ' Sedang dikerjakan oleh teknisi.';
        break;
      case 'done':
        statusExplanation = ' Sudah selesai. Silakan beri rating dan feedback.';
        break;
      case 'cancelled':
        statusExplanation = ' Telah dibatalkan.';
        break;
      case 'delayed':
        statusExplanation = ' Ditunda. Silakan hubungi admin untuk info lebih lanjut.';
        break;
    }
    
    return {
      jawaban: `Booking ${s.kode_booking} (${layanan}) statusnya "${status}", jadwal ${jadwal}.${teknisi}${statusExplanation}`,
      status_booking: { kode_booking: s.kode_booking, status: s.status, layanan: s.layanan },
      fallback: false,
      aksi: [{ type: 'open_status', label: 'Lihat detail', path: `/status?kode=${s.kode_booking}` }],
      quick_replies: ['Lihat detail', status === 'scheduled' ? 'Ubah jadwal' : null, status === 'scheduled' ? 'Batalkan' : null].filter(x => x)
    };
  } catch (e) {
    if (e.status === 404) {
      return {
        jawaban: `Kode booking ${bookingCode} gak ketemu. Pastikan lagi kode nya atau hubungi admin ya.`,
        fallback: true,
        quick_replies: ['Cek lagi', 'Hubungi admin']
      };
    }
    throw e;
  }
}

async function handlePaymentQuery(message, context) {
  const paymentSettings = await getPaymentSettings();
  const businessProfile = await getBusinessProfile();
  
  // Build payment methods list from database
  const bankList = paymentSettings.accounts ? paymentSettings.accounts.map(a => `${a.bank_name} (${a.account_number})`).join(', ') : 'BCA, Mandiri';
  const instruction = paymentSettings.instruction_note || '';
  
  return {
    jawaban: `Bisa bayar dengan:\n• Transfer bank: ${bankList}\n• Tunai ke teknisi (COD)\n• E-wallet (Dana, OVO, Gopay, LinkAja)\n\n${instruction}\n\nHarga layanan sudah termasuk jasa pengerjaan. Kalau butuh bahan tambahan kayak freon, nanti dikasih tau dan bayar terpisah.`,
    fallback: false,
    quick_replies: ['Info layanan', 'Booking servis', 'Cek status']
  };
}

async function handleTechnicianQuery(message, context) {
  const { entities } = context;
  
  // Try to extract booking code to get technician info
  const bookingCode = entities.booking_code || (BOOKING_CODE_RE.exec(message) || [null])[0];
  
  if (bookingCode) {
    try {
      const s = await publicStatusByCode(bookingCode);
      if (s.teknisi) {
        return {
          jawaban: `Teknisi untuk booking ${bookingCode} adalah Pak ${s.teknisi}.`,
          teknisi: { nama: s.teknisi },
          fallback: false
        };
      } else {
        return {
          jawaban: `Booking ${bookingCode} belum ada teknisi yang ditugaskan.`,
          fallback: false
        };
      }
    } catch (e) {
      // Booking not found, provide general info
    }
  }
  
  return {
    jawaban: 'Teknisi kami adalah ahlinya AC yang sudah bersertifikasi. Mereka akan datang sesuai jadwal yang kamu pilih. Mau tahu siapa yang menangani bookingmu? Sebutkan aja kode bookingsmu.',
    fallback: false,
    quick_replies: ['Cek dengan kode booking', 'Booking servis', 'Info layanan']
  };
}

async function handleAreaQuery(message, context) {
  const ops = await getOperationalSettings();
  
  return {
    jawaban: `Kami melayani wilayah Jabodetabek (Jakarta, Bogor, Depok, Tangerang, Bekasi) dan sekitarnya. Bisa untuk rumah, kantor, maupun gedung. Alamatmu di mana? Kalau di wilayah kami, bisa langsung booking.`,
    fallback: false,
    quick_replies: ['Ya, di Jabodetabek', 'Di luar wilayah', 'Tanya harga']
  };
}

async function handleProcedureQuery(message, context) {
  return {
    jawaban: `Gampang banget! Cara bookingnya:\n1. Pilih layanan yang kamu butuhkan\n2. Pilih tanggal dan jam yang tersedia\n3. Isi alamat lengkap dan nomor HP\n4. Kalau ada keluhan AC, jelaskan disitu\n5. Kirim formulir\n\nNanti kamu akan dapet kode booking (format AC-XXXX) untuk cek status. H-1 sebelum jadwal, bakal dikirim reminder.`,
    fallback: false,
    aksi: [{ type: 'open_booking', label: 'Buat booking sekarang', path: '/booking' }],
    quick_replies: ['Buat booking sekarang', 'Lihat layanan dulu']
  };
}

async function handleFollowUp(message, context) {
  const { state } = context;
  const lowerMsg = message.toLowerCase();
  
  // Positive confirmations
  const positive = ['ya', 'iya', 'benar', 'betul', 'ok', 'oke', 'baikk', 'sip', 'terima kasih', 'makasih', 'thank'];
  const negative = ['tidak', 'gak', 'nggak', 'bukan', 'salah', 'engga', 'ngga'];
  
  if (positive.some(word => lowerMsg.includes(word))) {
    if (state && state.context === 'booking_flow') {
      return {
        jawaban: 'Oke, silakan buka formulir booking untuk melengkapi data dan konfirmasi pesanan.',
        aksi: [{ type: 'open_booking', label: 'Buka formulir booking', path: '/booking' }],
        fallback: false
      };
    }
    return {
      jawaban: 'Oke, senang bisa bantu! Ada lagi?',
      fallback: false,
      quick_replies: ['Info layanan', 'Booking servis', 'Cek status']
    };
  }
  
  if (negative.some(word => lowerMsg.includes(word))) {
    if (state) {
      clearConversationState(state.id);
    }
    return {
      jawaban: 'Oke, gapapa. Kalau butuh bantu lagi, tinggal hubungi aku ya.',
      fallback: false,
      quick_replies: ['Info layanan', 'Booking servis', 'Cek status']
    };
  }
  
  return {
    jawaban: 'Maaf, aku gak ngerti. Bisa ulangi atau pake kata lain?',
    fallback: true
  };
}

async function handleConfirmation(message, context) {
  const { state } = context;
  
  if (state && state.context === 'booking_flow') {
    return {
      jawaban: 'Oke, silakan buka formulir booking untuk melengkapi data dan konfirmasi pesanan.',
      aksi: [{ type: 'open_booking', label: 'Konfirmasi booking', path: '/booking' }],
      fallback: false
    };
  }
  
  return {
    jawaban: 'Oke, makasih. Ada lagi yang bisa aku bantu?',
    fallback: false,
    quick_replies: ['Info layanan', 'Booking servis', 'Cek status']
  };
}

async function handleRejection(message, context) {
  const { state } = context;
  
  if (state) {
    clearConversationState(state.id);
  }
  
  return {
    jawaban: 'Oke, gapapa. Kalau butuh layanan AC, tinggal hubungi aku lagi ya.',
    fallback: false,
    quick_replies: ['Info layanan', 'Booking servis', 'Cek status']
  };
}

/**
 * Human Handoff / Eskalasi ke Admin (BR-46)
 * Mencatat tiket eskalasi di complaint_tickets (sumber: 'whatsapp_ai') dan menyediakan tautan langsung ke WhatsApp admin.
 */
async function handleHandoffRequest(message, context = {}) {
  let adminPhone = '081385293137';
  try {
    const cfgRow = (await query("SELECT value FROM settings WHERE setting_key='ai_whatsapp_config'")).rows[0];
    if (cfgRow && cfgRow.value && cfgRow.value.admin_whatsapp) {
      adminPhone = cfgRow.value.admin_whatsapp;
    }
  } catch (error) { console.warn('[chat] Konfigurasi tidak dapat dimuat:', error.message); }

  // 1. Buat tiket eskalasi di complaint_tickets (BR-46)
  const cleanMsg = String(message || 'Permintaan eskalasi ke CS Admin').slice(0, 950);
  const ticketRes = await query(
    `INSERT INTO complaint_tickets (pesan, status, sumber)
     VALUES ($1, 'open', 'whatsapp_ai')
     RETURNING id, created_at`,
    [`[WhatsApp AI Handoff] ${cleanMsg}`]
  );
  const ticketId = ticketRes.rows[0].id;

  // 2. Format tautan WhatsApp langsung ke nomor admin
  let waPhone = adminPhone.replace(/[^0-9]/g, '');
  if (waPhone.startsWith('0')) waPhone = '62' + waPhone.slice(1);
  const waText = encodeURIComponent(`Halo Admin Nara AC, saya butuh bantuan CS manusia (Tiket #${ticketId}): ${cleanMsg.slice(0, 100)}`);
  const waLink = `https://wa.me/${waPhone}?text=${waText}`;

  return {
    jawaban: `Baik, percakapan Anda telah kami teruskan ke Tim Customer Service Admin Nara AC dengan nomor tiket #${ticketId}.\n\nAnda dapat langsung terhubung dengan Admin kami via WhatsApp:\n${waLink}\nAtau telepon di ${adminPhone}. Tim kami akan segera membantu Anda.`,
    ticket_id: ticketId,
    admin_whatsapp: adminPhone,
    wa_link: waLink,
    is_handoff: true,
    fallback: false,
    aksi: [{ type: 'open_whatsapp', label: 'Chat Admin Sekarang', url: waLink }],
    quick_replies: ['Kembali ke menu', 'Cek status booking']
  };
}

/**
 * Memeriksa ketersediaan jadwal slot operasional secara nyata via bookingService.getAvailability (BR-45).
 */
async function handleAvailabilityCheck(message, context = {}) {
  const { entities = {} } = context;
  const today = new Date();
  
  // 1. Ekstrak tanggal (format YYYY-MM-DD atau kata kunci)
  let dateStr = null;
  const dateMatch = /\b(\d{4}-\d{2}-\d{2})\b/.exec(message);
  if (dateMatch) {
    dateStr = dateMatch[1];
  } else if (entities && entities.date) {
    dateStr = entities.date;
  } else {
    const lower = (message || '').toLowerCase();
    const tom = new Date(today);
    if (lower.includes('lusa')) {
      tom.setDate(tom.getDate() + 2);
      dateStr = tom.toISOString().split('T')[0];
    } else if (lower.includes('besok')) {
      tom.setDate(tom.getDate() + 1);
      dateStr = tom.toISOString().split('T')[0];
    } else if (lower.includes('hari ini')) {
      dateStr = today.toISOString().split('T')[0];
    } else {
      tom.setDate(tom.getDate() + 1);
      dateStr = tom.toISOString().split('T')[0];
    }
  }

  // 2. Tentukan layanan dari katalog DB (BR-44, BR-45)
  const services = await getServiceCatalog();
  if (!services || services.length === 0) {
    return {
      jawaban: 'Mohon maaf, saat ini sistem penjadwalan sedang tidak dapat memuat katalog layanan.',
      fallback: true
    };
  }

  let svc = services[0];
  const lowerMsg = (message || '').toLowerCase();
  for (const s of services) {
    if (lowerMsg.includes(s.nama_layanan.toLowerCase()) || lowerMsg.includes(s.kategori.toLowerCase()) || lowerMsg.includes(s.kode.toLowerCase())) {
      svc = s;
      break;
    }
  }

  // 3. Panggil bookingService.getAvailability
  try {
    const avail = await getAvailability(dateStr, svc.id);
    if (!avail.buka) {
      return {
        jawaban: `Jadwal untuk tanggal ${dateStr} tutup: ${avail.alasan || 'Tidak melayani servis di hari tersebut.'}. Silakan pilih tanggal operasional lain.`,
        fallback: false,
        buka: false,
        tanggal: dateStr,
        layanan: svc.nama_layanan,
        slot_tersedia: [],
        total_slot: 0,
        quick_replies: ['Cek tanggal besok', 'Lihat layanan', 'Hubungi admin']
      };
    }

    const freeSlots = (avail.slot || []).filter(s => s.tersedia);
    if (freeSlots.length === 0) {
      return {
        jawaban: `Mohon maaf, semua slot jadwal untuk tanggal ${dateStr} (${svc.nama_layanan}) sudah penuh terisi (0 slot tersedia). Silakan pilih tanggal lain untuk servis Anda.`,
        fallback: false,
        buka: true,
        tanggal: dateStr,
        layanan: svc.nama_layanan,
        total_slot: 0,
        slot_tersedia: [],
        quick_replies: ['Cek hari berikutnya', 'Hubungi admin']
      };
    }

    const slotListStr = freeSlots.slice(0, 8).map(s => `• ${s.jam} WIB`).join('\n');
    return {
      jawaban: `Slot jadwal operasional untuk layanan ${svc.nama_layanan} pada ${dateStr} tersedia:\n${slotListStr}\n\n(Jam operasional: ${avail.jam_operasional} WIB, total ${freeSlots.length} slot kosong). Mau booking di jam berapa?`,
      fallback: false,
      buka: true,
      tanggal: dateStr,
      layanan: svc.nama_layanan,
      total_slot: freeSlots.length,
      slot_tersedia: freeSlots.map(s => s.jam),
      aksi: [{ type: 'open_booking', label: 'Booking Jadwal Ini', path: `/booking?date=${dateStr}&service=${svc.kode}` }],
      quick_replies: freeSlots.slice(0, 4).map(s => `Jam ${s.jam}`)
    };
  } catch (err) {
    return {
      jawaban: `Gagal memeriksa ketersediaan slot untuk ${dateStr}: ${err.message}`,
      fallback: true
    };
  }
}

/**
 * Deteksi Intent Berbasis Aturan untuk Fallback saat AI Service Offline (BR-44, BR-45, BR-46)
 */
function detectIntentRuleBased(message) {
  const lower = String(message || '').toLowerCase();
  
  // Handoff keywords
  if (['admin', 'cs', 'manusia', 'oper', 'operator', 'orang', 'komplain', 'darurat', 'hubungi admin', 'eskalasi', 'bantuan langsung'].some(k => lower.includes(k))) {
    return { intent: 'human_handoff', confidence: 0.95, model_version: 'rule_based_fallback' };
  }
  // Schedule / availability check
  if (['jadwal', 'slot', 'ketersediaan', 'kosong', 'bisa kapan', 'kapan bisa', 'jam berapa', 'hari apa'].some(k => lower.includes(k)) && !BOOKING_CODE_RE.test(message)) {
    return { intent: 'cek_jadwal', confidence: 0.95, model_version: 'rule_based_fallback' };
  }
  // Status check with booking code or status inquiry
  if (BOOKING_CODE_RE.test(message) || ['status', 'lacak', 'cek progress', 'bukti transfer', 'verifikasi pembayaran', 'klaim garansi'].some(k => lower.includes(k))) {
    return { intent: 'tanya_status', confidence: 0.95, model_version: 'rule_based_fallback' };
  }
  // Price inquiry
  if (['harga', 'biaya', 'tarif', 'ongkos', 'berapa'].some(k => lower.includes(k))) {
    return { intent: 'tanya_harga', confidence: 0.90, model_version: 'rule_based_fallback' };
  }
  // Service inquiry
  if (['layanan', 'servis', 'service', 'cuci', 'freon', 'bocor', 'netes', 'tidak dingin', 'bau', 'rusak', 'pasang'].some(k => lower.includes(k))) {
    return { intent: 'tanya_layanan', confidence: 0.90, model_version: 'rule_based_fallback' };
  }
  // Booking inquiry
  if (['booking', 'pesan', 'order', 'jadwalkan'].some(k => lower.includes(k))) {
    return { intent: 'booking_service', confidence: 0.90, model_version: 'rule_based_fallback' };
  }
  // Greeting
  if (['halo', 'hai', 'pagi', 'siang', 'sore', 'malam', 'assalamualaikum', 'tes'].some(k => lower.includes(k))) {
    return { intent: 'greeting', confidence: 0.90, model_version: 'rule_based_fallback' };
  }
  return { intent: 'lainnya', confidence: 0.5, model_version: 'rule_based_fallback' };
}

/**
 * Fallback pemrosesan chat langsung ke database resmi saat service AI offline (BR-44, BR-45)
 */
async function handleFallbackOfflineChat(message, userId) {
  const lower = String(message || '').toLowerCase();
  
  // 1. Cek kode booking, status, pembayaran, klaim garansi
  if (BOOKING_CODE_RE.test(message) || lower.includes('status') || lower.includes('lacak') || lower.includes('klaim') || lower.includes('garansi') || lower.includes('bukti') || lower.includes('transfer') || lower.includes('bayar')) {
    return await handleStatusQuery(message, { entities: {} });
  }
  // 2. Tanya harga
  if (lower.includes('harga') || lower.includes('biaya') || lower.includes('tarif')) {
    return await handlePriceQuery(message, { entities: {} });
  }
  // 3. Permintaan booking baru
  if (lower.includes('booking') || lower.includes('pesan') || lower.includes('order')) {
    return await handleBookingRequest(message, { entities: {}, userId });
  }
  // 4. Tanya layanan
  if (lower.includes('layanan') || lower.includes('servis') || lower.includes('service') || lower.includes('cuci')) {
    return await handleServiceQuery(message, { entities: {} });
  }
  if (lower.includes('halo') || lower.includes('hai') || lower.includes('pagi') || lower.includes('siang') || lower.includes('sore') || lower.includes('malam')) {
    return await handleGreeting(message, { entities: {} });
  }
  return {
    jawaban: 'Halo! Saya asisten WhatsApp Nara AC. Saya dapat membantu info layanan, katalog harga resmi, ketersediaan jadwal slot operasional, dan status booking Anda. Jika butuh bantuan langsung dari admin, ketik "admin".',
    fallback: false,
    quick_replies: ['Harga cuci AC', 'Cek jadwal kosong', 'Cek status booking', 'Hubungi admin']
  };
}

/**
 * Memproses pesan masuk WhatsApp CS (BR-44, BR-45, BR-46, BR-47).
 * Mencatat percakapan di database whatsapp_conversations dan merespons otomatis.
 */
async function handleWhatsAppMessage({ sender, message }) {
  if (!sender || !message) {
    throw E.validation('Sender dan message wajib diisi.');
  }

  const cleanPhone = normalizePhone(sender) || String(sender).trim();
  const cleanMsg = String(message).trim();

  // 1. Catat pesan masuk pengguna ke whatsapp_conversations (BR-44)
  await query(
    `INSERT INTO whatsapp_conversations (sender, role, message)
     VALUES ($1, 'user', $2)`,
    [cleanPhone, cleanMsg]
  );

  // 2. Evaluasi handoff ke admin manusia (BR-46)
  const handoffKeywords = ['admin', 'cs', 'manusia', 'oper', 'operator', 'orang', 'komplain', 'darurat', 'hubungi admin', 'eskalasi', 'bantuan langsung'];
  const lowerMsg = cleanMsg.toLowerCase();
  const isHandoffKeyword = handoffKeywords.some(k => lowerMsg.includes(k));

  let replyPayload;
  let isHandoff = false;
  let handoffTicketId = null;

  if (isHandoffKeyword) {
    const res = await handleHandoffRequest(cleanMsg, { sender: cleanPhone, userId: cleanPhone });
    replyPayload = res;
    isHandoff = true;
    handoffTicketId = res.ticket_id;
  } else {
    // 3. Evaluasi cek ketersediaan jadwal (BR-45)
    const availKeywords = ['jadwal', 'slot', 'ketersediaan', 'kosong', 'bisa kapan', 'kapan bisa', 'jam berapa', 'hari apa'];
    const isAvailKeyword = availKeywords.some(k => lowerMsg.includes(k));

    if (isAvailKeyword && !BOOKING_CODE_RE.test(cleanMsg)) {
      replyPayload = await handleAvailabilityCheck(cleanMsg, { sender: cleanPhone, userId: cleanPhone });
    } else {
      // 4. Tanya layanan / harga / status (BR-44)
      try {
        replyPayload = await handleChat(cleanMsg, cleanPhone, 'customer');
      } catch (err) {
        // Fallback jika AI service offline / 503
        replyPayload = await handleFallbackOfflineChat(cleanMsg, cleanPhone);
      }
    }
  }

  // 5. Simpan balasan bot ke whatsapp_conversations
  await query(
    `INSERT INTO whatsapp_conversations (sender, role, message, intent, is_handoff, handoff_ticket_id)
     VALUES ($1, 'assistant', $2, $3, $4, $5)`,
    [
      cleanPhone,
      replyPayload.jawaban,
      replyPayload.intent || (isHandoff ? 'human_handoff' : 'chat'),
      isHandoff,
      handoffTicketId
    ]
  );

  return {
    sender: cleanPhone,
    reply: replyPayload.jawaban,
    intent: replyPayload.intent || (isHandoff ? 'human_handoff' : 'chat'),
    is_handoff: isHandoff,
    ticket_id: handoffTicketId,
    wa_link: replyPayload.wa_link || null,
    data: replyPayload
  };
}

async function handleFeedback(message, context) {
  return {
    jawaban: 'Makasih ya atas feedback-nya! Kami selalu berusaha untuk memberikan layanan terbaik. Feedback dari pelanggan kayak kamu sangat berarti bagi kami.' ,
    fallback: false,
    quick_replies: ['Buat booking', 'Info layanan', 'Cek status']
  };
}

async function handleAdminQuery(message, context) {
  // Check if user has admin role
  const userRole = context.userRole;
  if (userRole !== 'admin') {
    throw E.forbidden('Anda tidak memiliki hak akses untuk informasi ini.');
  }
  
  const today = new Date().toISOString().split('T')[0];
  const totalToday = (await query(`SELECT COUNT(*) as n FROM bookings WHERE jadwal_mulai >= $1 AND jadwal_mulai < DATE_ADD($1, INTERVAL 1 DAY)`, [today])).rows[0].n;
  const totalPending = (await query("SELECT COUNT(*) as n FROM bookings WHERE status = 'scheduled' AND jadwal_mulai >= now()")).rows[0].n;
  
  return {
    jawaban: `Info operasional hari ini:\n• Total booking: ${totalToday}\n• Booking tertunda: ${totalPending}\n\nUntuk info lengkap, cek Dashboard KPI di admin panel.`,
    fallback: false,
    aksi: [{ type: 'open_dashboard', label: 'Buka Dashboard', path: '/admin/analytics' }]
  };
}

async function handleTechQuery(message, context) {
  // Check if user has technician role
  const userRole = context.userRole;
  if (userRole !== 'technician' && userRole !== 'admin') {
    throw E.forbidden('Anda tidak memiliki hak akses untuk informasi ini.');
  }
  
  return {
    jawaban: 'Panduan Teknisi: Untuk pengisian freon, pastikan dulu jenis freonnya (R32, R410a, atau R22). Standar tekanan R32 adalah 140-160 psi saat kompresor menyala. Jangan lupa vakum sistem sebelum isi freon kalau dari kosong. Untuk SOP lengkap, lihat di Dashboard.',
    fallback: false
  };
}

async function handleUnknown(message, context) {
  const { state } = context;
  
  if (state && state.context) {
    // Continue with current context
    if (state.context === 'booking_flow') {
      return await handleBookingFollowUp(message, state, context.done);
    }
  }
  
  return {
    jawaban: FALLBACK_HELP.pesan,
    saran: FALLBACK_HELP.saran,
    fallback: true,
    aksi: [
      { type: 'open_booking', label: 'Booking', path: '/booking' },
      { type: 'open_status', label: 'Cek status', path: '/status' }
    ],
    quick_replies: ['Info layanan', 'Booking servis', 'Cek status']
  };
}

module.exports = { 
  handleChat, 
  handleWhatsAppMessage,
  handleAvailabilityCheck,
  handleHandoffRequest,
  detectIntentRuleBased,
  predictIntent, 
  buildCorpus, 
  resetIndexCache, 
  FALLBACK_HELP,
  getConversationState,
  clearConversationState,
  getQuickReplies
};
