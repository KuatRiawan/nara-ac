const config = require('../config');
const { query } = require('../db/pool');
const { getOps } = require('./bookingService');

const CANDIDATE_MODELS = [
  config.geminiModel || 'gemini-3.5-flash',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
];

const rupiah = (n) => `Rp${Number(n).toLocaleString('id-ID')}`;

/**
 * Builds live business context from database
 */
async function getBusinessContext() {
  try {
    const services = (await query('SELECT kode, nama_layanan, kategori, harga, durasi_menit, deskripsi FROM service_catalog WHERE aktif ORDER BY id')).rows;
    const ops = await getOps().catch(() => ({ open: '08:00', close: '17:00' }));

    const serviceList = services.map(s => 
      `- ${s.nama_layanan} (${s.kategori}): ${s.deskripsi}. Harga: ${rupiah(s.harga)}, Durasi pengerjaan: ±${s.durasi_menit} menit.`
    ).join('\n');

    return `
PROFIL PERUSAHAAN & LAYANAN RESMI:
Perusahaan: CV. Nara Teknidotama (Nara AC)
Spesialis: Jasa Servis, Cuci AC, Perbaikan, dan Pemasangan AC Rumah & Kantor Terpercaya
Jam Operasional: Setiap hari ${ops.open || '08:00'} - ${ops.close || '17:00'} WIB
Garansi Pengerjaan: Resmi 30 Hari untuk semua pengerjaan
Standar Kerja: SOP 7 Langkah Pengerjaan higienis dengan teknisi tersertifikasi
Alur Booking: Pengguna bisa langsung memesan lewat tombol "Booking Service", pilih slot jadwal, dan langsung mendapatkan Kode Booking unik (format AC-XXXX).
Cek Status: Bisa memantau progress teknisi secara real-time di menu "Cek Status" menggunakan kode booking atau nomor HP.

KATALOG LAYANAN & HARGA RESMI:
${serviceList}

PANDUAN MASALAH AC & SOLUSI:
1. AC Bocor / Menetes Air: Penyebab umum adalah talang air tersumbat lendir/lumut, selang pembuangan mampet, atau filter terlalu kotor sehingga terjadi pembekuan es di evaporator. Solusi: Cuci AC Core Deep Clean (Rp120.000) untuk bongkar talang dan chemical flush saluran.
2. AC Tidak Dingin / Angin Biasa: Penyebab bisa filter kotor tebal, tekanan freon berkurang akibat kebocoran halus, kapasitor lemah, atau kompresor overheat. Solusi: Cek tekanan freon + Paket Cuci AC Standard (Rp75.000) atau Paket Core + Isi Freon (Rp220.000).
3. AC Bau Apek / Asam: Jamur dan bakteri yang tumbuh di evaporator dan blower fan. Solusi: Cuci AC Core Deep Clean dengan chemical sterilisasi anti-bakteri.
4. AC Berisik / Bergetar: Blower indoor kotor tidak seimbang, baut kendor, atau bearing motor aus. Solusi: Pengecekan unit dan servis pembersihan menyeluruh.
`;
  } catch (err) {
    console.warn('[geminiService] Gagal memuat konteks dinamis database:', err.message);
    return 'Layanan Nara AC: Cuci AC Standard (Rp75.000), Cuci Core Deep Clean (Rp120.000), Paket Core + Freon (Rp220.000), Isi Freon R32 (Rp150.000), Bongkar Pasang (Rp350.000). Garansi 30 hari.';
  }
}

/**
 * Generate an informative and conversational response using Google Gemini
 */
async function generateGeminiAnswer(userMessage, conversationHistory = []) {
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    return null;
  }

  const businessContext = await getBusinessContext();

  const systemInstruction = `
Kamu adalah Nara, Asisten AI Cerdas dari CV. Nara Teknidotama (Nara AC).
Karaktermu: Sangat informatif, ramah, profesional, solutif, empatik, dan komunikatif seperti Google Gemini.

ATURAN PENTING & INTEGRITAS (ANTI-HALUSINASI):
1. Berikan penjelasan yang edukatif dan solutif. Jika pelanggan menceritakan keluhan AC (misal: bocor, bau, tidak dingin, berisik), jelaskan penyebabnya secara teknis namun mudah dimengerti, berikan tips darurat/sementara jika relevan, lalu rekomendasikan paket servis Nara AC yang tepat.
2. Selalu gunakan data harga, nama layanan, dan jam operasional resmi dari basis pengetahuan Nara AC. JANGAN mengarang harga di luar katalog.
3. ATURAN ANTI-HALUSINASI BOOKING: AI dilarang keras menyatakan pemesanan/booking telah berhasil dijadwalkan sebelum tersimpan resmi di database backend dan memiliki kode booking resmi (format AC-XXXX). Selalu arahkan pelanggan untuk melengkapi data pemesanan.
4. ATURAN ANTI-HALUSINASI PEMBAYARAN: AI dilarang keras menyatakan bukti transfer atau pembayaran telah diverifikasi lunas jika status verifikasi di database masih menunggu verifikasi admin atau pending.
5. ATURAN ANTI-HALUSINASI KLAIM: AI dilarang keras menyatakan klaim garansi atau kompensasi telah disetujui sebelum disetujui resmi oleh admin di database.
6. Format teks dengan rapi menggunakan paragraf dan bullet points (*) agar nyaman dibaca di layar chat.
7. Jangan terlalu kaku, gunakan sapaan santun dan bersahabat (misal: "Halo Kak!", "Bisa kami bantu").
8. Tawarkan bantuan untuk membuat booking atau cek status di bagian akhir jawaban secara alami.
9. Jawab secara padat, to-the-point, dan solutif (maksimal 120-180 kata) agar cepat dibaca dan tidak memakan waktu lama saat dimuat.

${businessContext}
`;

  // Build message sequence with conversation history (last 4 turns)
  const contents = [];
  if (Array.isArray(conversationHistory)) {
    for (const h of conversationHistory.slice(-4)) {
      if (h.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: h.text }] });
      } else if (h.role === 'bot' || h.role === 'model') {
        contents.push({ role: 'model', parts: [{ text: h.text }] });
      }
    }
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  // Try candidate models with fallback
  let lastError = null;
  const modelsToTry = [...new Set(CANDIDATE_MODELS)];

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 350,
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(35000), // 35 seconds max
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const status = response.status;
        console.warn(`[geminiService] Model ${model} mengembalikan status ${status}:`, errBody?.error?.message || response.statusText);
        // If 503 or 404 or 429, try next candidate model
        if ([503, 404, 429].includes(status)) {
          lastError = new Error(`Model ${model} unavailable (${status})`);
          continue;
        }
        return null;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        // Detect action recommendations based on user question and answer
        const lower = (userMessage + ' ' + text).toLowerCase();
        const aksi = [];
        const quickReplies = [];

        if (lower.includes('booking') || lower.includes('pesan') || lower.includes('order') || lower.includes('jadwal') || lower.includes('bocor') || lower.includes('rusak') || lower.includes('tidak dingin') || lower.includes('cuci')) {
          aksi.push({ type: 'open_booking', label: 'Pesan Servis Sekarang', path: '/booking' });
          quickReplies.push('Pesan Servis Sekarang', 'Lihat Paket & Harga', 'Hubungi WhatsApp');
        } else if (lower.includes('status') || lower.includes('lacak') || lower.includes('ac-')) {
          aksi.push({ type: 'open_status', label: 'Cek Status Pengerjaan', path: '/status' });
          quickReplies.push('Cek Status Booking', 'Tanya Layanan Lain');
        } else {
          quickReplies.push('Harga Cuci AC', 'Solusi AC Kurang Dingin', 'Cara Pesan Servis');
        }

        return {
          jawaban: text.trim(),
          model: model,
          sumber: ['Google Gemini', 'Katalog Resmi CV. Nara Teknidotama'],
          saran: [
            'Berapa harga Cuci AC Core?',
            'AC saya tidak dingin, kenapa ya?',
            'Bagaimana cara booking teknisi?',
            'Berapa lama garansi servis?'
          ],
          quick_replies: quickReplies,
          aksi,
          fallback: false,
          rute: 'gemini_generative'
        };
      }
    } catch (e) {
      console.warn(`[geminiService] Error pada model ${model}:`, e.message);
      lastError = e;
    }
  }

  console.error('[geminiService] Semua model Gemini gagal:', lastError?.message);
  return null;
}

module.exports = {
  generateGeminiAnswer,
  getBusinessContext
};
