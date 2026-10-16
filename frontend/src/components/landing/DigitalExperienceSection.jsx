import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Ticket,
  Wrench,
  CheckCircle2,
  Clock,
  ShieldCheck,
  User,
  FileText,
  RotateCcw,
  ArrowRight,
  Play,
  Pause,
  RotateCw,
  Camera,
  Wind,
  MessageCircle,
  X,
  Thermometer,
  Gauge,
  Zap,
  BellRing,
  Activity,
  Check
} from 'lucide-react';

const smoothSpring = { type: 'spring', stiffness: 350, damping: 30 };
const gentleEase = [0.22, 1, 0.36, 1];

// ==========================================
// DATA 1: 4 TAHAP ALUR PELACAKAN SERVIS
// ==========================================
const serviceSteps = [
  {
    step: 1,
    title: '1. Booking Diterima',
    sub: 'Tiket terbit & tercatat di sistem cloud',
    statusBadge: 'Tiket Terdaftar di Sistem',
    statusColor: 'bg-amber-50 text-amber-700 border-amber-200',
    pulseColor: 'bg-amber-500',
    timeInfo: '09:00 WIB • Terkonfirmasi Otomatis',
    techStatus: 'Standby Jadwal',
    techStatusBg: 'bg-amber-100 text-amber-800',
    orderStatus: 'Menunggu Jam Kunjungan',
    progressPercent: 25,
    summaryDesc: 'Pelanggan memesan secara online. Sistem langsung mengamankan slot waktu dan menerbitkan kode tiket resmi bergaransi.'
  },
  {
    step: 2,
    title: '2. Teknisi Ditugaskan',
    sub: 'Budi Santoso (TK-024) menuju lokasi',
    statusBadge: 'Teknisi Menuju Lokasi',
    statusColor: 'bg-blue-50 text-blue-700 border-blue-200',
    pulseColor: 'bg-blue-600',
    timeInfo: '09:40 WIB • Estimasi Tiba 15 Menit',
    techStatus: 'Dalam Perjalanan',
    techStatusBg: 'bg-blue-100 text-blue-800',
    orderStatus: 'Alat & Terpal SOP Siap',
    progressPercent: 50,
    summaryDesc: 'Teknisi bersertifikasi NARA AC berseragam rapi mengonfirmasi keberangkatan menuju kediaman atau kantor Anda.'
  },
  {
    step: 3,
    title: '3. SOP Pengerjaan',
    sub: 'Pencucian indoor, outdoor & freon',
    statusBadge: 'Sedang Dikerjakan di Lokasi',
    statusColor: 'bg-sky-50 text-sky-700 border-sky-300',
    pulseColor: 'bg-sky-500',
    timeInfo: '10:00 - 11:15 WIB • Durasi ±75 Menit',
    techStatus: 'Sedang Pengerjaan SOP',
    techStatusBg: 'bg-sky-100 text-sky-800',
    orderStatus: '7 Langkah SOP Aktif',
    progressPercent: 75,
    summaryDesc: 'Pembersihan mendalam tanpa cipratan air dengan plastik pelindung. Pengecekan tekanan freon & arus ampere sesuai standar pabrik.'
  },
  {
    step: 4,
    title: '4. Selesai & Garansi',
    sub: 'Garansi 30 hari & E-Invoice aktif',
    statusBadge: 'Pengerjaan Selesai & Terverifikasi',
    statusColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    pulseColor: 'bg-emerald-500',
    timeInfo: '11:20 WIB • QC Lolos 100%',
    techStatus: 'Pekerjaan Selesai',
    techStatusBg: 'bg-emerald-100 text-emerald-800',
    orderStatus: 'Garansi 30 Hari Aktif',
    progressPercent: 100,
    summaryDesc: 'Servis tuntas! Pelanggan menerima e-invoice resmi berbadan hukum CV dan kartu garansi digital aktif di sistem.'
  }
];

// ==========================================
// DATA 2: 7 LANGKAH SOP PENGERJAAN
// ==========================================
const sopStepsData = [
  {
    id: 1,
    title: 'Proteksi Area Kerja & Pasang Terpal',
    desc: 'Melindungi lantai, perabotan, dan dinding dengan terpal khusus agar ruangan tetap bersih bebas cipratan.',
    duration: '± 5 Menit',
    target: 'Area Kerja 100% Kering & Aman'
  },
  {
    id: 2,
    title: 'Cuci Filter Udara & Casing Cover Depan',
    desc: 'Pembersihan debu pekat, bakteri, dan sterilisasi cover indoor dengan cairan pembersih khusus higienis.',
    duration: '± 10 Menit',
    target: 'Bebas Debu Mikro & Jamur'
  },
  {
    id: 3,
    title: 'Semprot Evaporator Indoor Bertekanan',
    desc: 'Tembak kotoran lendir pada kisi-kisi coil evaporator bertekanan terukur hingga bersih tuntas tanpa merusak sirip.',
    duration: '± 20 Menit',
    target: 'Kisi-Kisi Bersih & Sirkulasi Bebas'
  },
  {
    id: 4,
    title: 'Flushing Talang Air & Saluran Drainase',
    desc: 'Penyemprotan selang drainase untuk mencegah penumpukan lumut yang menyebabkan kebocoran air menetes.',
    duration: '± 10 Menit',
    target: 'Debit Pembuangan Air Lancar 100%'
  },
  {
    id: 5,
    title: 'Pembersihan Kisi-Kisi Kondensor Outdoor',
    desc: 'Menghilangkan endapan panas pada unit luar agar kompresor bekerja ringan, awet, dan hemat daya listrik.',
    duration: '± 15 Menit',
    target: 'Pelepasan Panas Maksimal'
  },
  {
    id: 6,
    title: 'Pengecekan Tekanan Freon & Arus Ampere',
    desc: 'Pengukuran akurat menggunakan manifold gauge digital dan tang ampere sesuai spesifikasi nameplate kompresor.',
    duration: '± 10 Menit',
    target: '140-150 PSI (R32) • Ampere Standar'
  },
  {
    id: 7,
    title: 'Running Test Akhir & Verifikasi Suhu Dingin',
    desc: 'Pengujian hembusan angin presisi (16°C-20°C) serta pengecekan getaran suara sebelum unit diserahterimakan.',
    duration: '± 5 Menit',
    target: 'Suhu 16.4°C • QC Lolos Penuh'
  }
];

// ==========================================
// DATA 3: UNIT AC UNTUK DATABASE RIWAYAT
// ==========================================
const unitsData = [
  {
    id: 'unit-1',
    name: 'Daikin Flash Inverter 1 PK',
    model: 'FTKQ25',
    location: 'Kamar Tidur Utama (Lt. 2)',
    refrigerant: 'R32 Tersegel Pabrikan',
    statusTag: 'Kondisi Prima • Garansi Aktif',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    lastService: '12 Januari 2026',
    serviceType: 'Cuci AC Core (Deep Clean)',
    temperature: '16.4°C',
    pressure: '142 PSI',
    current: '2.4 A',
    nextService: 'April 2026',
    warrantyDaysLeft: 28,
    cleanliness: 98
  },
  {
    id: 'unit-2',
    name: 'Panasonic Eco Tough 0.5 PK',
    model: 'CS-YN5WKJ',
    location: 'Ruang Tamu & Keluarga (Lt. 1)',
    refrigerant: 'R32 Tersegel Pabrikan',
    statusTag: 'Waktunya Servis Berkala',
    statusColor: 'bg-amber-100 text-amber-800 border-amber-200',
    lastService: '05 Oktober 2025',
    serviceType: 'Core + Tambah Freon R32',
    temperature: '17.1°C',
    pressure: '140 PSI',
    current: '1.8 A',
    nextService: 'Jatuh Tempo (Bulan Ini)',
    warrantyDaysLeft: 0,
    cleanliness: 72
  }
];

export default function DigitalExperienceSection() {
  const [activeTab, setActiveTab] = useState('status'); // 'status' | 'sop' | 'history'

  // Tab 1 state: Alur Tiket
  const [currentStepIndex, setCurrentStepIndex] = useState(2);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(true);
  const [showChatDemo, setShowChatDemo] = useState(false);

  // Tab 2 state: Checklist SOP Live
  const [activeSopStep, setActiveSopStep] = useState(2); // Step 3 aktif secara default
  const [isSopPlaying, setIsSopPlaying] = useState(true);

  // Tab 3 state: Database Unit AC
  const [selectedUnitId, setSelectedUnitId] = useState('unit-1');
  const [isPulseScanning, setIsPulseScanning] = useState(false);

  // Timer Tab 1: Alur Tiket
  useEffect(() => {
    if (!isTimelinePlaying || activeTab !== 'status') return;
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % serviceSteps.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [isTimelinePlaying, activeTab]);

  // Timer Tab 2: Checklist SOP Live
  useEffect(() => {
    if (!isSopPlaying || activeTab !== 'sop') return;
    const timer = setInterval(() => {
      setActiveSopStep((prev) => (prev + 1) % sopStepsData.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [isSopPlaying, activeTab]);

  // Trigger brief scanning animation when switching units in Tab 3
  const handleSelectUnit = (id) => {
    setSelectedUnitId(id);
    setIsPulseScanning(true);
    setTimeout(() => setIsPulseScanning(false), 900);
  };

  const currentStep = serviceSteps[currentStepIndex];
  const activeUnit = unitsData.find((u) => u.id === selectedUnitId) || unitsData[0];

  return (
    <section className="py-24 bg-sky-50/40 border-t border-sky-100/60 relative overflow-hidden">
      {/* Background soft ambient accents */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-100/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 -left-20 w-80 h-80 bg-sky-100/50 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: gentleEase }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest border border-blue-200 mb-3 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Pengalaman Digital &amp; Transparan</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.6, ease: gentleEase }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4"
          >
            Sistem Layanan Terpadu &amp; <span className="text-blue-600">Transparan</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.6, ease: gentleEase }}
            className="text-slate-600 text-base sm:text-lg leading-relaxed"
          >
            Simulasi interaktif bagaimana NARA AC mengawal setiap tahapan servis dari pemesanan, verifikasi mutu pengerjaan, hingga rekam riwayat unit secara otomatis.
          </motion.p>
        </div>

        {/* Main Interactive Box */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: gentleEase }}
          className="bg-white rounded-3xl border border-sky-100 shadow-xl shadow-blue-900/5 overflow-hidden max-w-5xl mx-auto"
        >

          {/* Smooth Sliding Pill Navigation Tabs */}
          <div className="flex border-b border-sky-100 bg-sky-50/70 p-2 gap-2 overflow-x-auto scrollbar-none">
            {[
              { id: 'status', label: '1. Simulasi Alur Tiket Servis' },
              { id: 'sop', label: '2. Checklist 7 Langkah SOP (Live)' },
              { id: 'history', label: '3. Database Riwayat Unit AC' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    isActive ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-experience-tab"
                      transition={smoothSpring}
                      className="absolute inset-0 bg-white rounded-2xl shadow-xs border border-sky-200"
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Display with Smooth Cross-Fade */}
          <div className="relative">
            <AnimatePresence mode="wait">

              {/* ============================================================== */}
              {/* TAB 1: SIMULASI ALUR TIKET SERVIS                              */}
              {/* ============================================================== */}
              {activeTab === 'status' && (
                <motion.div
                  key="tab-live-status"
                  initial={{ opacity: 0, y: 12, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.99 }}
                  transition={{ duration: 0.35, ease: gentleEase }}
                  className="p-6 sm:p-8 space-y-6"
                >
                  {/* Top Header Strip with Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-sky-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Simulasi Tiket Servis Resmi
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <h4 className="text-xl sm:text-2xl font-black text-blue-700 font-mono tracking-wider">
                          BK-2026-0814
                        </h4>
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                          Live Demo
                        </span>
                      </div>
                    </div>

                    {/* Status Badge & Controller */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <motion.span
                        key={currentStep.statusBadge}
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={smoothSpring}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-2xs transition-colors ${currentStep.statusColor}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${currentStep.pulseColor} animate-pulse`} />
                        {currentStep.statusBadge}
                      </motion.span>

                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setIsTimelinePlaying(!isTimelinePlaying)}
                          title={isTimelinePlaying ? 'Jeda Animasi' : 'Putar Animasi'}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-white transition-all cursor-pointer"
                        >
                          {isTimelinePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentStepIndex(0)}
                          title="Ulangi dari Langkah 1"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-white transition-all cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Smooth Progress Timeline */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
                      <span>Kemajuan Alur: Tahap {currentStep.step} dari 4</span>
                      <span className="font-bold text-blue-600">{currentStep.timeInfo}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden relative">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500"
                        animate={{ width: `${currentStep.progressPercent}%` }}
                        transition={{ duration: 0.6, ease: gentleEase }}
                      />
                    </div>
                  </div>

                  {/* 4 Clickable Step Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {serviceSteps.map((s, idx) => {
                      const isDone = idx < currentStepIndex;
                      const isCurrent = idx === currentStepIndex;

                      return (
                        <div
                          key={s.step}
                          onClick={() => {
                            setCurrentStepIndex(idx);
                            setIsTimelinePlaying(false);
                          }}
                          className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer text-left relative overflow-hidden ${
                            isCurrent
                              ? 'bg-blue-50/90 border-blue-400 shadow-md ring-2 ring-blue-500/20'
                              : isDone
                              ? 'bg-emerald-50/60 border-emerald-200/90'
                              : 'bg-slate-50/70 border-slate-200/70 opacity-60 hover:opacity-90'
                          }`}
                        >
                          {isCurrent && (
                            <motion.div
                              layoutId="active-step-indicator"
                              transition={smoothSpring}
                              className="absolute top-0 left-0 right-0 h-1 bg-blue-600"
                            />
                          )}

                          <div className="flex items-start gap-3">
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs transition-colors ${
                                isDone
                                  ? 'bg-emerald-600 text-white'
                                  : isCurrent
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : isCurrent ? <Wrench className="w-3.5 h-3.5 animate-pulse" /> : s.step}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-xs font-bold leading-tight truncate ${
                                  isCurrent ? 'text-blue-900' : isDone ? 'text-emerald-950' : 'text-slate-800'
                                }`}
                              >
                                {s.title}
                              </p>
                              <p
                                className={`text-[11px] mt-0.5 leading-snug line-clamp-1 ${
                                  isCurrent ? 'text-blue-700' : 'text-slate-500'
                                }`}
                              >
                                {s.sub}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Animated Stage Summary Strip */}
                  <motion.div
                    key={`step-summary-${currentStep.step}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: gentleEase }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-white to-sky-50/60 border border-blue-100 flex items-center gap-3 text-xs text-slate-700"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold">
                      {currentStep.step}
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-blue-900 block">{currentStep.title}</span>
                      <span className="text-slate-600 leading-relaxed">{currentStep.summaryDesc}</span>
                    </div>
                  </motion.div>

                  {/* Two-Column Detail Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Technician Demo Card */}
                    <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-bold text-slate-900">Budi Santoso</h5>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              ID: TK-024
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Teknisi Senior • Seragam Resmi</p>
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 ${currentStep.techStatusBg}`}>
                            {currentStep.techStatus}
                          </span>
                        </div>
                      </div>

                      {/* Tombol Demo Simulasi */}
                      <button
                        type="button"
                        onClick={() => setShowChatDemo(true)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                        title="Klik untuk melihat demo simulasi koordinasi teknisi"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat Teknisi (Demo)</span>
                      </button>
                    </div>

                    {/* Order Spec Card */}
                    <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block text-sm">Paket Cuci Core (Deep Clean)</span>
                        <span className="text-slate-500">
                          2 Unit AC • Total: <strong>Rp 228.000</strong>
                        </span>
                        <span className="text-[11px] text-blue-600 font-semibold block mt-1">
                          Status Tiket: {currentStep.orderStatus}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                          Garansi 30 Hari
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">SOP 7 Langkah Penuh</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Features Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        Invoice Resmi Berbadan Hukum CV
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
                        <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                        Reschedule Mandiri via WhatsApp
                      </span>
                    </div>

                    <Link
                      to="/status"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      <span>Lacak Tiket Nyata di Halaman Cek Status</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* ============================================================== */}
              {/* TAB 2: CHECKLIST 7 LANGKAH SOP (ANIMASI LIVE PENGERJAAN)       */}
              {/* ============================================================== */}
              {activeTab === 'sop' && (
                <motion.div
                  key="tab-sop"
                  initial={{ opacity: 0, y: 12, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.99 }}
                  transition={{ duration: 0.35, ease: gentleEase }}
                  className="p-6 sm:p-8 space-y-6"
                >
                  {/* SOP Header with Live Progress & Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-sky-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-lg sm:text-xl font-bold text-slate-900">
                          Checklist 7 Langkah SOP Pengerjaan Teknisi
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Simulasi live kendali mutu wajib: teknisi mencentang aplikasi kerja langkah demi langkah hingga lolos QC penuh.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 shrink-0 w-fit">
                        SOP Digital Terverifikasi
                      </span>

                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsSopPlaying(!isSopPlaying)}
                          title={isSopPlaying ? 'Jeda Simulasi' : 'Jalankan Simulasi'}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-white transition-all cursor-pointer"
                        >
                          {isSopPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSopStep(0)}
                          title="Reset ke Langkah 1"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-white transition-all cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* SOP Live Progress Indicator */}
                  <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {activeSopStep + 1}/7
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 block">
                          Tahap Aktif: {sopStepsData[activeSopStep].title}
                        </span>
                        <span className="text-[11px] text-blue-700 font-semibold">
                          Target Mutu: {sopStepsData[activeSopStep].target} • Estimasi: {sopStepsData[activeSopStep].duration}
                        </span>
                      </div>
                    </div>

                    <div className="w-full sm:w-48 text-right">
                      <div className="text-[11px] text-slate-500 font-bold mb-1">
                        Kemajuan: {Math.round(((activeSopStep + 1) / 7) * 100)}% Selesai
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <motion.div
                          className="h-full bg-blue-600"
                          animate={{ width: `${((activeSopStep + 1) / 7) * 100}%` }}
                          transition={{ duration: 0.5, ease: gentleEase }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 7 SOP Animated Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sopStepsData.map((item, idx) => {
                      const isDone = idx < activeSopStep;
                      const isCurrent = idx === activeSopStep;

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setActiveSopStep(idx);
                            setIsSopPlaying(false);
                          }}
                          className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-3 cursor-pointer relative overflow-hidden ${
                            isDone
                              ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                              : isCurrent
                              ? 'bg-blue-50/90 border-blue-400 shadow-md ring-2 ring-blue-500/20 text-blue-950'
                              : 'bg-slate-50/70 border-slate-200/70 text-slate-600 opacity-65 hover:opacity-90'
                          }`}
                        >
                          {isCurrent && (
                            <motion.div
                              layoutId="active-sop-glow"
                              transition={smoothSpring}
                              className="absolute top-0 left-0 right-0 h-1 bg-blue-600"
                            />
                          )}

                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold shadow-xs transition-colors ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : isCurrent
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            {isDone ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : isCurrent ? (
                              <Wrench className="w-3.5 h-3.5 animate-pulse" />
                            ) : (
                              idx + 1
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="text-xs sm:text-sm font-bold truncate">
                                {idx + 1}. {item.title}
                              </h5>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 transition-colors ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isCurrent
                                    ? 'bg-blue-100 text-blue-800 font-extrabold animate-pulse'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {isDone ? 'Selesai ✓' : isCurrent ? 'Sedang Proses' : 'Antrean SOP'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quality Assurance Strip */}
                  <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <Camera className="w-4 h-4 text-blue-600" />
                        Foto Dokumentasi Sebelum &amp; Sesudah Tersimpan
                      </span>
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Freon Asli Tersegel Pabrikan (Tanpa Oplosan)
                      </span>
                    </div>
                    <span className="text-[11px] text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                      Standar Teknis Resmi CV. Nara Teknindotama
                    </span>
                  </div>
                </motion.div>
              )}

              {/* ============================================================== */}
              {/* TAB 3: DATABASE RIWAYAT UNIT AC (ANIMASI TELEMETRI & SCAN)    */}
              {/* ============================================================== */}
              {activeTab === 'history' && (
                <motion.div
                  key="tab-history"
                  initial={{ opacity: 0, y: 12, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.99 }}
                  transition={{ duration: 0.35, ease: gentleEase }}
                  className="p-6 sm:p-8 space-y-6"
                >
                  {/* Database Header & Customer Portal Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-sky-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <h4 className="text-lg sm:text-xl font-bold text-slate-900">
                          Database Unit AC &amp; Rekam Riwayat Servis
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Setiap unit AC pelanggan memiliki identitas digital: tipe unit, riwayat pencucian, data suhu, dan estimasi waktu servis berkala.
                      </p>
                    </div>
                    <Link
                      to="/login"
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Masuk Portal Pelanggan</span>
                    </Link>
                  </div>

                  {/* Interactive Unit Switcher Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 mr-1">Pilih Unit Demo:</span>
                    {unitsData.map((unit) => {
                      const isSelected = selectedUnitId === unit.id;
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => handleSelectUnit(unit.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Wind className="w-3.5 h-3.5" />
                          <span>{unit.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'}`}>
                            {unit.model}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Unit Telemetry & Condition Card */}
                  <motion.div
                    key={activeUnit.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: gentleEase }}
                    className="p-5 sm:p-6 rounded-2xl bg-white border border-sky-100 shadow-sm relative overflow-hidden"
                  >
                    {/* Simulated live scanning glow */}
                    {isPulseScanning && (
                      <motion.div
                        initial={{ opacity: 0.6, scaleY: 0 }}
                        animate={{ opacity: 0, scaleY: 1 }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 bg-blue-100/40 pointer-events-none"
                      />
                    )}

                    {/* Unit Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                          <Wind className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-base font-black text-slate-900">{activeUnit.name}</h5>
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {activeUnit.model}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Lokasi: {activeUnit.location}</p>
                        </div>
                      </div>

                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 w-fit ${activeUnit.statusColor}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {activeUnit.statusTag}
                      </span>
                    </div>

                    {/* Live Telemetry Sensor Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-slate-100">
                      <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mb-1">
                          <Thermometer className="w-3.5 h-3.5 text-blue-600" /> Suhu Hembusan
                        </span>
                        <div className="text-base font-black text-blue-700 font-mono flex items-center gap-1">
                          {activeUnit.temperature}
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        </div>
                        <span className="text-[10px] text-slate-400">Target Dingin Tercapai</span>
                      </div>

                      <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mb-1">
                          <Gauge className="w-3.5 h-3.5 text-blue-600" /> Tekanan Freon
                        </span>
                        <div className="text-base font-black text-slate-800 font-mono">
                          {activeUnit.pressure}
                        </div>
                        <span className="text-[10px] text-slate-400">Kondisi Ideal Standar</span>
                      </div>

                      <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mb-1">
                          <Zap className="w-3.5 h-3.5 text-blue-600" /> Arus Ampere
                        </span>
                        <div className="text-base font-black text-slate-800 font-mono">
                          {activeUnit.current}
                        </div>
                        <span className="text-[10px] text-slate-400">Kompresor Efisien</span>
                      </div>

                      <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mb-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Garansi Digital
                        </span>
                        <div className="text-base font-black text-emerald-700 font-mono">
                          {activeUnit.warrantyDaysLeft > 0 ? `${activeUnit.warrantyDaysLeft} Hari` : 'Expired'}
                        </div>
                        <span className="text-[10px] text-slate-400">Klaim Tanpa Kertas</span>
                      </div>
                    </div>

                    {/* Historical Details & Next Action */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Servis Terakhir:</span>
                        <span className="font-semibold text-slate-800">{activeUnit.lastService}</span>
                        <span className="text-[11px] text-blue-600 block mt-0.5">{activeUnit.serviceType}</span>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-400 block">Jadwal Cuci Berikutnya:</span>
                        <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600" /> {activeUnit.nextService}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Notifikasi Otomatis via WhatsApp</span>
                      </div>

                      <div className="flex items-center sm:justify-end">
                        <Link
                          to="/booking"
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border border-blue-200"
                        >
                          <span>Booking Servis Unit Ini</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>

                  {/* Automated WhatsApp Reminder Simulation Strip */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-white to-sky-50/80 border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <BellRing className="w-4 h-4 animate-bounce" />
                      </div>
                      <div>
                        <span className="font-bold text-emerald-900 block">
                          Fitur Pengingat Servis Rutin Otomatis
                        </span>
                        <span className="text-slate-600">
                          Sistem otomatis mengirim pengingat via WhatsApp setiap 3 bulan sekali agar AC Anda selalu dingin optimal dan terhindar dari kerusakan fatal.
                        </span>
                      </div>
                    </div>

                    <Link
                      to="/customer/units"
                      className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-blue-700 font-bold border border-slate-200 shrink-0 flex items-center gap-1 shadow-2xs"
                    >
                      <span>Kelola Semua Unit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* POPUP SIMULASI CHAT TEKNISI (DEMO INTERAKTIF) */}
      <AnimatePresence>
        {showChatDemo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={smoothSpring}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
            >
              {/* WhatsApp Simulated Header */}
              <div className="bg-emerald-700 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                    BS
                  </div>
                  <div>
                    <h5 className="font-bold text-sm leading-tight">Budi Santoso (Teknisi NARA AC)</h5>
                    <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      Online • Tiket BK-2026-0814
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChatDemo(false)}
                  className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Simulation Area */}
              <div className="p-4 bg-[#efeae2] space-y-3 min-h-[220px] max-h-[320px] overflow-y-auto text-xs">
                <div className="text-center">
                  <span className="inline-block px-3 py-1 rounded-lg bg-white/80 text-[10px] text-slate-500 shadow-2xs">
                    Hari ini • Tiket Servis Terkonfirmasi
                  </span>
                </div>

                {/* Bubble Teknisi */}
                <div className="flex items-end gap-1.5 max-w-[85%]">
                  <div className="bg-white p-3 rounded-2xl rounded-bl-xs shadow-xs text-slate-800 space-y-1">
                    <p className="font-semibold text-emerald-800 text-[11px]">Budi Santoso (Teknisi)</p>
                    <p>Halo Bapak/Ibu, saya Budi dari CV. NARA AC. Saya sudah berangkat menuju lokasi Anda untuk servis unit AC.</p>
                    <span className="text-[9px] text-slate-400 block text-right">09:42 WIB</span>
                  </div>
                </div>

                {/* Bubble Pelanggan */}
                <div className="flex items-end justify-end gap-1.5 ml-auto max-w-[85%]">
                  <div className="bg-[#d9fdd3] p-3 rounded-2xl rounded-br-xs shadow-xs text-slate-800 space-y-1">
                    <p>Halo Pak Budi, siap. Tolong dibersihkan juga saluran pembuangan outdoor-nya ya, ada sedikit tetesan.</p>
                    <span className="text-[9px] text-slate-400 block text-right">09:44 WIB • ✓✓</span>
                  </div>
                </div>

                {/* Bubble Teknisi Response */}
                <div className="flex items-end gap-1.5 max-w-[85%]">
                  <div className="bg-white p-3 rounded-2xl rounded-bl-xs shadow-xs text-slate-800 space-y-1">
                    <p className="font-semibold text-emerald-800 text-[11px]">Budi Santoso (Teknisi)</p>
                    <p>Siap Pak! Kami bawa jet cleaner bertekanan dan terpal pelindung dinding. Akan kami flushing tuntas sesuai SOP 7 langkah.</p>
                    <span className="text-[9px] text-slate-400 block text-right">09:45 WIB</span>
                  </div>
                </div>
              </div>

              {/* Explanation Note & Action */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2.5">
                <div className="flex items-start gap-2 text-[11px] text-slate-500">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Mode Simulasi Interaktif:</strong> Pada sistem riil, tombol ini langsung menghubungkan Anda ke obrolan WhatsApp resmi teknisi yang sedang bertugas.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChatDemo(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup Demo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
