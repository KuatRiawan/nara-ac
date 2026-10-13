import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import api from '../api';
import {
  CalendarCheck, Search, ArrowRight, CheckCircle2, ShieldCheck,
  Clock, Wrench, Sparkles, MapPin, Phone, Mail,
  Wind, ChevronRight, FileText,
  ChevronDown, Check, X, HelpCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import CompanyLogo from '../components/CompanyLogo';
import FAQAccordion from '../components/landing/FAQAccordion';
import TrustBar from '../components/landing/TrustBar';
import GallerySection from '../components/landing/GallerySection';
import MobileNav from '../components/landing/MobileNav';
import AirflowBreeze from '../components/landing/AirflowBreeze';
import HeroInteractiveCard from '../components/landing/HeroInteractiveCard';
import StickyBottomBooking from '../components/landing/StickyBottomBooking';

const easeOutCubic = [0.16, 1, 0.3, 1];

// Staggered scroll animation variants
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const fadeInUpVariant = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOutCubic },
  },
};

export default function LandingPage() {
  const navigate = useNavigate();

  // State
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [typingIndex, setTypingIndex] = useState(0);
  const [showComparisonTable, setShowComparisonTable] = useState(true);

  // Digital Experience Demo Tab State
  const [activeDemoTab, setActiveDemoTab] = useState('status');

  // Parallax scroll tracking
  const { scrollY } = useScroll();
  const smoothScroll = useSpring(scrollY, { damping: 25, stiffness: 120 });
  const yHeroGlow1 = useTransform(smoothScroll, [0, 700], [0, 130]);
  const yHeroGlow2 = useTransform(smoothScroll, [0, 700], [0, -90]);
  const yHeroLeft = useTransform(smoothScroll, [0, 600], [0, 35]);
  const yHeroRight = useTransform(smoothScroll, [0, 600], [0, -20]);

  const rotatingWords = useMemo(() => [
    'Lebih Terencana.',
    'Lebih Transparan.',
    'Lebih Profesional.',
    'Lebih Nyaman.'
  ], []);

  // Rotating headline text interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTypingIndex(prev => (prev + 1) % rotatingWords.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [rotatingWords]);

  // Scroll listener for sticky header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = useCallback((id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const [liveServices, setLiveServices] = useState([]);

  useEffect(() => {
    let active = true;
    api.get('/services')
      .then(res => {
        if (!active) return;
        const raw = res?.data?.data || res?.data;
        if (Array.isArray(raw) && raw.length > 0) {
          setLiveServices(raw);
        }
      })
      .catch(() => {
        // Fallback to static defaults
      });
    return () => { active = false; };
  }, []);

  // Structured Service Packages for AC Scope Comparison (Standar vs Core vs Core + Freon)
  // Dynamically synchronized with backend pricing when admin updates tariff
  const servicePackages = useMemo(() => {
    const list = Array.isArray(liveServices) ? liveServices : [];
    const std = list.find(s => s.kode === 'SRV-CUCI-01' || (s.nama_layanan || '').toLowerCase().includes('standard') || s.id === 1);
    const cr = list.find(s => s.kode === 'SRV-CUCI-CORE' || ((s.nama_layanan || '').toLowerCase().includes('core') && !(s.nama_layanan || '').toLowerCase().includes('freon')) || s.id === 4);
    const cf = list.find(s => s.kode === 'SRV-CUCI-FREON' || ((s.nama_layanan || '').toLowerCase().includes('freon') && (s.nama_layanan || '').toLowerCase().includes('core')) || s.id === 5);

    return [
      {
        id: std?.id || 1,
        tier: 'standard',
        nama_layanan: std?.nama_layanan || 'Cuci AC Standar',
        subtitle: 'Perawatan Rutin 2-3 Bulan',
        badge: 'Perawatan Rutin',
        isPopular: false,
        deskripsi: std?.deskripsi || 'Pembersihan debu permukaan untuk AC yang masih dingin normal dan rutin dirawat.',
        harga: std?.harga !== undefined ? Number(std.harga) : 75000,
        durasi_menit: std?.durasi_menit !== undefined ? Number(std.durasi_menit) : 60,
        garansi: '14 Hari',
        scopeIncluded: [
          'Cuci filter udara & cover casing indoor',
          'Cuci evaporator indoor (permukaan luar)',
          'Semprot saluran pembuangan air (drain pipe)',
          'Semprot kisi-kisi kondensor unit outdoor',
          'Pengecekan suhu dingin & arus listrik (Ampere)',
          'Garansi pengerjaan 14 hari'
        ],
        scopeExcluded: [
          'Bongkar total blower fan rotor & talang air',
          'Chemical wash anti-bakteri & bau apek',
          'Vakum kuras pipa drainase lendir anti-bocor',
          'Garansi 30 hari penuh'
        ],
        ctaText: 'Pilih Paket Standar',
        bookingUrl: `/booking?layanan=${std?.id || 1}&paket=standard`
      },
      {
        id: cr?.id || 4,
        tier: 'core',
        nama_layanan: cr?.nama_layanan || 'Cuci AC Core (Deep Clean)',
        subtitle: 'Bongkar Total & Overhaul Lengkap',
        badge: 'Deep Clean & Overhaul',
        isPopular: true,
        deskripsi: cr?.deskripsi || 'Pembersihan total tuntas dengan membongkar komponen. Solusi tuntas untuk AC bau apek, bocor air, atau hembusan angin pelan.',
        harga: cr?.harga !== undefined ? Number(cr.harga) : 120000,
        durasi_menit: cr?.durasi_menit !== undefined ? Number(cr.durasi_menit) : 90,
        garansi: '30 Hari Penuh',
        scopeIncluded: [
          'SEMUA cakupan Paket Standar lengkap',
          'Bongkar total rotor blower fan & talang air indoor (atasi bocor tuntas)',
          'Deep wash evaporator & kondensor outdoor tekanan tinggi',
          'Chemical treatment anti-bakteri & pembasmi bau apek',
          'Vakum sedot kuras saluran drainase (bebas sumbat lendir 100%)',
          'Pengecekan tekanan freon digital & arus kompresor',
          'Garansi pengerjaan nyata 30 hari penuh'
        ],
        benefitNote: '💡 Mengapa Memilih Core? Menuntaskan 95% keluhan AC bocor air menetes dan bau apek. Hembusan angin jadi kencang, dingin merata, dan hemat listrik hingga 30%!',
        ctaText: 'Pilih Paket Core (Rekomendasi)',
        bookingUrl: `/booking?layanan=${cr?.id || 4}&paket=core`
      },
      {
        id: cf?.id || 5,
        tier: 'core_freon',
        nama_layanan: cf?.nama_layanan || 'Paket Core + Isi Freon',
        subtitle: 'Deep Clean Total + Freon Murni Pabrikan',
        badge: 'Solusi AC Kurang / Tidak Dingin',
        isPopular: false,
        deskripsi: cf?.deskripsi || 'Kombinasi cuci Deep Clean total plus pengisian ulang freon murni presisi pabrikan agar performa AC kembali menggigil seperti baru.',
        harga: cf?.harga !== undefined ? Number(cf.harga) : 220000,
        durasi_menit: cf?.durasi_menit !== undefined ? Number(cf.durasi_menit) : 105,
        garansi: '45 Hari Garansi Dingin',
        scopeIncluded: [
          'SEMUA layanan Paket Core (Deep Clean bongkar total)',
          'Pengisian freon murni R32 / R410A / R22 presisi pabrikan',
          'Deteksi titik kebocoran pipa & pengencangan sambungan flaring',
          'Pengujian tekanan manifold digital & kalibrasi thermostat',
          'Pengujian performa kompresor & stabilitas suhu',
          'Prioritas jadwal teknisi & garansi dingin 45 hari'
        ],
        benefitNote: '❄️ Solusi Total: Mengembalikan performa AC yang tidak dingin / pipa bersalju. AC langsung dingin maksimal & kompresor bekerja lebih tenang.',
        ctaText: 'Pilih Paket Core + Freon',
        bookingUrl: `/booking?layanan=${cf?.id || 5}&paket=core_freon`
      }
    ];
  }, [liveServices]);

  // Comparison Matrix for Table Breakdown
  const comparisonMatrix = useMemo(() => [
    {
      feature: 'Pembersihan Filter Udara & Casing Cover',
      detail: 'Pencucian cover depan & filter debu mikro',
      standard: true,
      core: true,
      coreFreon: true
    },
    {
      feature: 'Pencucian Evaporator Indoor',
      detail: 'Pembersihan kisi-kisi pendingin indoor',
      standard: 'Permukaan Luar',
      core: 'Deep Clean Total',
      coreFreon: 'Deep Clean Total'
    },
    {
      feature: 'Semprot Kondensor Unit Outdoor',
      detail: 'Pembersihan kisi-kisi pembuang panas kompresor',
      standard: true,
      core: true,
      coreFreon: true
    },
    {
      feature: 'Bongkar Total Rotor Blower Fan',
      detail: 'Rontokkan kotoran tebal di baling-baling kipas silinder',
      standard: false,
      core: true,
      coreFreon: true
    },
    {
      feature: 'Bongkar & Bersihkan Talang Air (Drain Pan)',
      detail: 'Basmi lendir hitam & lumut penyebab utama AC bocor air',
      standard: false,
      core: true,
      coreFreon: true
    },
    {
      feature: 'Treatment Cairan Anti-Bakteri & Jamur',
      detail: 'Hilangkan bau apek membandel & sterilisasi udara',
      standard: false,
      core: true,
      coreFreon: true
    },
    {
      feature: 'Vakum Sedot Saluran Pembuangan Lendir',
      detail: 'Penyedotan pipa pembuangan agar bebas mampet 100%',
      standard: false,
      core: true,
      coreFreon: true
    },
    {
      feature: 'Pengecekan Tekanan Freon Digital',
      detail: 'Pengukuran akurat dengan manifold digital',
      standard: 'Cek Standar',
      core: 'Cek Presisi Digital',
      coreFreon: 'Cek & Kalibrasi'
    },
    {
      feature: 'Pengisian Ulang Freon Murni Pabrikan',
      detail: 'Refill freon R32 / R410A / R22 murni sesuai PK unit',
      standard: false,
      core: false,
      coreFreon: true
    },
    {
      feature: 'Pemeriksaan Kebocoran & Pengencangan Flaring',
      detail: 'Deteksi kebocoran pada nepel dan sambungan tembaga',
      standard: false,
      core: 'Cek Visual',
      coreFreon: true
    },
    {
      feature: 'Masa Garansi Purna-Layanan Resmi',
      detail: 'Jaminan servis ulang jika ada kendala pasca-pengerjaan',
      standard: '14 Hari',
      core: '30 Hari Penuh',
      coreFreon: '45 Hari Garansi Dingin'
    }
  ], []);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden text-slate-800">

      {/* ============================================================== */}
      {/* 1. NAVBAR                                                      */}
      {/* ============================================================== */}
      <header
        className={`fixed w-full top-0 z-40 transition-all duration-300 ${isScrolled
            ? 'bg-white/95 backdrop-blur-xl shadow-xs border-b border-sky-100 py-3.5'
            : 'bg-white/90 backdrop-blur-md border-b border-sky-100/60 py-4.5'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">

          {/* Brand Logo */}
          <Link to="/" className="flex items-center group transition-transform hover:opacity-90">
            <CompanyLogo dark={false} iconSize="h-9 sm:h-10" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-bold text-slate-700">
            {[
              { id: 'home', label: 'Beranda' },
              { id: 'layanan', label: 'Layanan' },
              { id: 'keunggulan', label: 'Keunggulan' },
              { id: 'cara-kerja', label: 'Cara Kerja' },
              { id: 'galeri', label: 'Dokumentasi' },
              { id: 'profil', label: 'Profil' },
              { id: 'faq', label: 'FAQ' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`relative py-1 transition-colors hover:text-blue-600 cursor-pointer ${activeSection === item.id ? 'text-blue-600' : 'text-slate-600'
                  }`}
              >
                {item.label}
                {activeSection === item.id && (
                  <motion.span
                    layoutId="navbar-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link to="/status" className="hidden sm:block">
              <Button
                variant="outline"
                className="border-sky-200 text-slate-700 hover:text-blue-600 hover:bg-sky-50 font-bold rounded-xl px-4 h-10 text-xs sm:text-sm cursor-pointer shadow-2xs"
              >
                <Search className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Cek Status
              </Button>
            </Link>

            <Link to="/booking">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-4 sm:px-5 h-10 text-xs sm:text-sm shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer flex items-center"
              >
                <CalendarCheck className="w-4 h-4 mr-1.5" />
                <span>Booking Service</span>
              </Button>
            </Link>

            {/* Mobile Hamburger Trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-sky-50 transition-colors cursor-pointer"
              aria-label="Buka menu navigasi"
            >
              <div className="flex flex-col gap-1.5 w-5">
                <span className="w-full h-0.5 bg-slate-800 rounded-full"></span>
                <span className="w-3/4 h-0.5 bg-slate-800 rounded-full"></span>
                <span className="w-full h-0.5 bg-slate-800 rounded-full"></span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        scrollTo={scrollTo}
      />

      {/* ============================================================== */}
      {/* 2. HERO SECTION (CLEAN LIGHT BLUE & WHITE THEME)               */}
      {/* ============================================================== */}
      <section
        id="home"
        className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sky-50/90 via-blue-50/40 to-white text-slate-900 overflow-hidden min-h-[92vh] flex items-center"
      >
        {/* Parallax Atmospheric Glowing Ambient Spheres */}
        <motion.div
          style={{ y: yHeroGlow1 }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-sky-200/40 rounded-full blur-[140px] pointer-events-none"
        />
        <motion.div
          style={{ y: yHeroGlow2 }}
          className="absolute bottom-10 right-10 w-96 h-96 bg-blue-200/35 rounded-full blur-[120px] pointer-events-none"
        />

        {/* Cinematic Cool Air Breeze Wave Streams */}
        <AirflowBreeze />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.14] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #93C5FD 1px, transparent 0)`,
            backgroundSize: '36px 36px'
          }}
        />

        <div className="max-w-7xl mx-auto w-full relative z-10 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          {/* Left Hero Storytelling with Parallax */}
          <motion.div
            style={{ y: yHeroLeft }}
            className="lg:col-span-7 space-y-7 text-center lg:text-left"
          >

            {/* Pill Tag */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: easeOutCubic }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md border border-sky-200 text-blue-700 text-xs sm:text-sm font-semibold shadow-xs"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Solusi Perawatan AC Terencana • CV. Nara Teknindotama</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, ease: easeOutCubic }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-slate-900"
            >
              Udara Nyaman,<br />
              Perawatan AC{' '}
              <span className="inline-block bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 bg-clip-text text-transparent">
                {rotatingWords[typingIndex]}
              </span>
            </motion.h1>

            {/* Supporting Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: easeOutCubic }}
              className="text-slate-600 text-base sm:text-lg lg:text-xl font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0"
            >
              Jadwalkan servis AC dengan lebih mudah, pantau proses pengerjaan secara transparan, dan kelola perawatan AC Anda bersama teknisi terverifikasi NARA AC.
            </motion.p>

            {/* Hero CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: easeOutCubic }}
              className="flex flex-col sm:flex-row gap-3.5 sm:gap-4 justify-center lg:justify-start pt-2"
            >
              <Link to="/booking">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl px-8 h-13 sm:h-14 text-base shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/35 transition-all cursor-pointer group flex items-center justify-center"
                >
                  <CalendarCheck className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Booking Service Sekarang
                </Button>
              </Link>

              <button
                type="button"
                onClick={() => scrollTo('layanan')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 h-13 sm:h-14 rounded-2xl bg-white hover:bg-sky-50 text-slate-800 font-bold text-base border border-sky-200 shadow-xs transition-all cursor-pointer group"
              >
                <span>Jelajahi Paket & Harga</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-blue-600" />
              </button>
            </motion.div>

            {/* Live Micro Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-slate-600 font-medium"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Garansi Pengerjaan Nyata</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>SOP 7 Langkah Pengerjaan</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <span>Slot Waktu Terorganisir</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Hero: Upgraded Interactive Dual Card (Calculator + Live Tracker) with Parallax */}
          <motion.div
            style={{ y: yHeroRight }}
            className="lg:col-span-5 relative"
          >
            <HeroInteractiveCard services={liveServices} />
          </motion.div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. TRUST MARQUEE & CREDENTIALS STRIP                           */}
      {/* ============================================================== */}
      <TrustBar />

      {/* ============================================================== */}
      {/* 4. PERBANDINGAN PAKET & CAKUPAN PENGERJAAN AC                   */}
      {/* ============================================================== */}
      <section id="layanan" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest border border-blue-200 mb-3">
              <Wind className="w-3.5 h-3.5" /> Pilihan Paket & Cakupan Layanan
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Perbandingan Paket Servis AC
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Bandingkan cakupan pengerjaan antara <strong>Paket Standar</strong>, <strong>Core (Deep Clean)</strong>, dan <strong>Core + Freon</strong> agar Anda mendapatkan hasil perawatan AC yang paling optimal sesuai kondisi unit.
            </p>
          </div>

          {/* Pricing Comparison Cards Grid with Stagger & 3D Tilt Hover */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-12"
          >
            {servicePackages.map((pkg) => {
              const isCore = pkg.isPopular;

              return (
                <motion.div
                  key={pkg.id}
                  variants={fadeInUpVariant}
                  whileHover={{ y: -8, scale: 1.015, transition: { duration: 0.25, ease: easeOutCubic } }}
                  className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative group ${isCore
                      ? 'bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-500 shadow-xl shadow-blue-500/10 lg:-translate-y-2'
                      : 'bg-white border-2 border-sky-100 hover:border-sky-300 shadow-md hover:shadow-xl shadow-sky-900/5'
                    }`}
                >
                  {/* Popular Highlight Badge */}
                  {isCore && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-sky-600 text-white text-[11px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md whitespace-nowrap">
                      ⭐ Paling Direkomendasikan (Best Value)
                    </div>
                  )}

                  <div>
                    {/* Top Tier Info */}
                    <div className="flex items-center justify-between mb-3 pt-1">
                      <Badge className={`font-bold uppercase text-[10px] tracking-wider border-0 ${isCore
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-sky-100 text-sky-800'
                        }`}>
                        {pkg.badge}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        ± {pkg.durasi_menit} Menit
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {pkg.nama_layanan}
                    </h3>
                    <p className="text-xs font-bold text-blue-600 mb-3">
                      {pkg.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">
                      {pkg.deskripsi}
                    </p>

                    {/* Price Block */}
                    <div className="mb-6 pb-6 border-b border-sky-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Estimasi Biaya Jasa</span>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900">
                          Rp {pkg.harga.toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">/ unit</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-2">
                        <ShieldCheck className="w-3.5 h-3.5" /> Garansi Servis {pkg.garansi}
                      </span>
                    </div>

                    {/* Scope Checklist: Included */}
                    <div className="space-y-3 mb-6">
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Cakupan yang Anda Dapatkan:</span>
                      </p>
                      <div className="space-y-2">
                        {pkg.scopeIncluded.map((task, tIdx) => (
                          <div key={tIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                            <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isCore ? 'text-blue-600 font-bold' : 'text-emerald-500'
                              }`} />
                            <span className={isCore && tIdx > 0 && tIdx < 5 ? 'font-bold text-slate-900' : ''}>
                              {task}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Scope Checklist: Excluded (if any, showing clear contrast) */}
                    {pkg.scopeExcluded && pkg.scopeExcluded.length > 0 && (
                      <div className="space-y-2 mb-6 pt-3 border-t border-dashed border-slate-200">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-slate-400" />
                          <span>Belum Termasuk di Standar:</span>
                        </p>
                        <div className="space-y-1.5">
                          {pkg.scopeExcluded.map((ex, exIdx) => (
                            <div key={exIdx} className="flex items-start gap-2 text-xs text-slate-400 line-through">
                              <X className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                              <span>{ex}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Benefit Callout Note */}
                    {pkg.benefitNote && (
                      <div className="mb-6 p-3.5 rounded-2xl bg-sky-50 border border-sky-100 text-xs text-blue-950 font-medium leading-relaxed">
                        {pkg.benefitNote}
                      </div>
                    )}
                  </div>

                  {/* Booking CTA Button */}
                  <Link to={pkg.bookingUrl} className="block w-full pt-4">
                    <Button
                      className={`w-full h-12 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${isCore
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25'
                          : 'bg-sky-100 hover:bg-sky-200 text-blue-700 border border-sky-200'
                        }`}
                    >
                      <CalendarCheck className="w-4 h-4" />
                      <span>{pkg.ctaText}</span>
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Toggle Comparison Table Button */}
          <div className="text-center mb-8">
            <button
              onClick={() => setShowComparisonTable(prev => !prev)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-blue-700 font-bold text-xs sm:text-sm border border-sky-200 transition-all cursor-pointer shadow-2xs"
            >
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>{showComparisonTable ? 'Sembunyikan Tabel Perbandingan Detail' : 'Buka Tabel Perbandingan Detail Cakupan Pengerjaan'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showComparisonTable ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Side-by-Side Comparison Matrix Table */}
          <AnimatePresence>
            {showComparisonTable && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: easeOutCubic }}
                className="overflow-hidden mb-14"
              >
                <div className="bg-white rounded-3xl border border-sky-100 shadow-xl shadow-sky-900/5 overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead>
                      <tr className="bg-sky-50/70 border-b border-sky-100 text-slate-900 text-xs sm:text-sm">
                        <th className="p-4 sm:p-5 font-black">Cakupan Pengerjaan & Komponen</th>
                        <th className="p-4 sm:p-5 font-bold text-center w-1/4">Paket Standar</th>
                        <th className="p-4 sm:p-5 font-black text-center w-1/4 bg-blue-100/60 text-blue-900">
                          Paket Core ⭐
                        </th>
                        <th className="p-4 sm:p-5 font-bold text-center w-1/4">Core + Freon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100/60 text-xs sm:text-sm">
                      {comparisonMatrix.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-sky-50/30 transition-colors">
                          <td className="p-4 sm:p-5">
                            <span className="font-bold text-slate-900 block">{row.feature}</span>
                            <span className="text-[11px] text-slate-500">{row.detail}</span>
                          </td>

                          {/* Standard Column */}
                          <td className="p-4 sm:p-5 text-center">
                            {typeof row.standard === 'boolean' ? (
                              row.standard ? (
                                <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                              ) : (
                                <X className="w-5 h-5 text-slate-300 mx-auto" />
                              )
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                                {row.standard}
                              </span>
                            )}
                          </td>

                          {/* Core Column (Highlighted) */}
                          <td className="p-4 sm:p-5 text-center bg-blue-50/40">
                            {typeof row.core === 'boolean' ? (
                              row.core ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white mx-auto shadow-2xs">
                                  <Check className="w-4 h-4" />
                                </span>
                              ) : (
                                <X className="w-5 h-5 text-slate-300 mx-auto" />
                              )
                            ) : (
                              <span className="inline-block px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-bold shadow-2xs">
                                {row.core}
                              </span>
                            )}
                          </td>

                          {/* Core + Freon Column */}
                          <td className="p-4 sm:p-5 text-center">
                            {typeof row.coreFreon === 'boolean' ? (
                              row.coreFreon ? (
                                <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                              ) : (
                                <X className="w-5 h-5 text-slate-300 mx-auto" />
                              )
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-xs font-bold">
                                {row.coreFreon}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom helper: Kantor / B2B */}
          <div className="p-6 sm:p-8 rounded-3xl bg-sky-50/70 border border-sky-200/80 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 bg-white px-3 py-1 rounded-full border border-sky-200 inline-block mb-1.5">
                Layanan Korporat & Residensial
              </span>
              <h4 className="font-black text-slate-900 text-base sm:text-lg">Butuh Servis AC dalam Jumlah Banyak untuk Kantor / Ruko?</h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                Kami menyediakan kontrak pemeliharaan berkala untuk gedung, instansi, dan perumahan dengan invoice resmi dan penawaran harga khusus instansi.
              </p>
            </div>
            <a
              href="https://wa.me/6281385293137?text=Halo%20NARA%20AC,%20saya%20ingin%20konsultasi%20servis%20AC%20kantor/ruko"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-sky-200 text-slate-900 hover:text-blue-600 font-bold text-xs sm:text-sm shrink-0 shadow-xs hover:shadow-md transition-all"
            >
              <Phone className="w-4 h-4 text-emerald-500" />
              <span>Konsultasi WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. KEUNGGULAN NARA AC (CLEAN WHITE & LIGHT BLUE BENTO GRID)     */}
      {/* ============================================================== */}
      <section id="keunggulan" className="py-24 bg-gradient-to-b from-white via-sky-50/40 to-white text-slate-900 relative overflow-hidden border-t border-sky-100/60">

        {/* Glows */}
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-blue-200/30 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-sky-200/30 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-widest mb-3">
              <ShieldCheck className="w-3.5 h-3.5" /> Standar Mutu
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Mengapa Memilih NARA AC?
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed font-normal">
              Kami memadukan disiplin teknisi berpengalaman dengan sistem digital terorganisasi untuk kepuasan dan kenyamanan hunian Anda.
            </p>
          </div>

          {/* Asymmetric Bento Grid (Staggered Animation with Spring Lift) */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >

            {/* Bento Card 1 */}
            <motion.div
              variants={fadeInUpVariant}
              whileHover={{ y: -6, scale: 1.012, transition: { duration: 0.25, ease: easeOutCubic } }}
              className="bg-white rounded-3xl p-7 border border-sky-100 hover:border-blue-300 shadow-md hover:shadow-xl shadow-blue-500/5 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-6">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Jadwal Pasti & Terjadwal</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Tidak perlu menebak kapan teknisi datang. Pilih tanggal dan jam pengerjaan sesuai kebutuhan Anda langsung dari formulir booking online.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-sky-50 text-xs font-semibold text-blue-600 flex items-center gap-1">
                <span>Manajemen Slot Jam Presisi</span>
              </div>
            </motion.div>

            {/* Bento Card 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: easeOutCubic }}
              viewport={{ once: true }}
              className="bg-white rounded-3xl p-7 border border-sky-100 hover:border-sky-300 shadow-md hover:shadow-xl shadow-blue-500/5 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mb-6">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Pelacakan Status Digital</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Pantau tiket pengerjaan Anda dari mana saja. Cek apakah tiket berstatus terjadwal, sedang dikerjakan teknisi, atau sudah selesai.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-sky-50 text-xs font-semibold text-sky-600 flex items-center gap-1">
                <span>Terhubung API Sistem Publik</span>
              </div>
            </motion.div>

            {/* Bento Card 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: easeOutCubic }}
              viewport={{ once: true }}
              className="bg-white rounded-3xl p-7 border border-sky-100 hover:border-emerald-300 shadow-md hover:shadow-xl shadow-blue-500/5 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">7 Langkah SOP Standar Baku</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Bukan servis asal-asalan. Mulai dari pembersihan filter, cuci evaporator bertekanan, cuci outdoor, hingga uji running test dingin sebelum teknisi pamit.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-sky-50 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <span>Standar Operasional Tertulis</span>
              </div>
            </motion.div>

            {/* Bento Card 4 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: easeOutCubic }}
              viewport={{ once: true }}
              className="bg-white rounded-3xl p-7 border border-sky-100 hover:border-amber-300 shadow-md hover:shadow-xl shadow-blue-500/5 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-6">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Transparansi Biaya Mutlak</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Tidak ada istilah tembak harga mendadak saat tiba di tempat. Semua biaya jasa mengacu pada katalog resmi tanpa biaya tersembunyi.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-sky-50 text-xs font-semibold text-amber-600 flex items-center gap-1">
                <span>Katalog Harga Terpublikasi</span>
              </div>
            </motion.div>

            {/* Bento Card 5 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5, ease: easeOutCubic }}
              viewport={{ once: true }}
              className="bg-white rounded-3xl p-7 border border-sky-100 hover:border-indigo-300 shadow-md hover:shadow-xl shadow-blue-500/5 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-6">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Rekam Jejak & Riwayat Unit</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Data unit AC dan riwayat servis Anda tersimpan rapi di sistem. Memudahkan mengetahui kapan jadwal perawatan berkala berikutnya.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-sky-50 text-xs font-semibold text-indigo-600 flex items-center gap-1">
                <span>Database Terstruktur</span>
              </div>
            </motion.div>

            {/* Bento Card 6 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5, ease: easeOutCubic }}
              viewport={{ once: true }}
              className="bg-white rounded-3xl p-7 border border-sky-100 hover:border-rose-300 shadow-md hover:shadow-xl shadow-blue-500/5 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-6">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Garansi Pekerjaan Nyata</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Komitmen purna-servis terjamin. Jika terjadi kendala pasca-pengerjaan, teknisi siap datang kembali melakukan pemeriksaan ulang gratis.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-sky-50 text-xs font-semibold text-rose-600 flex items-center gap-1">
                <span>Perlindungan Pelanggan Nyata</span>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 6. CARA KERJA & ALUR RESERVASI                                 */}
      {/* ============================================================== */}
      <section id="cara-kerja" className="py-24 bg-white relative border-t border-sky-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest border border-blue-200 mb-3">
              <Clock className="w-3.5 h-3.5" /> Alur Cepat & Praktis
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">
              4 Langkah Mudah Booking Servis AC
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Dari pemesanan online hingga teknisi menyelesaikan pengerjaan di tempat Anda.
            </p>
          </div>

          {/* Animated Connecting Pathway on Desktop */}
          <div className="relative">
            <div className="hidden lg:block absolute top-1/2 left-10 right-10 -translate-y-8 h-1 pointer-events-none z-0">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: easeOutCubic }}
                className="h-full bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400 origin-left opacity-40 rounded-full"
              />
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10"
            >
              {[
                {
                  step: '01',
                  title: 'Pilih Layanan & Waktu',
                  desc: 'Pilih paket AC (Standar / Core / Core + Freon), lalu tentukan tanggal dan jam pengerjaan yang sesuai.'
                },
                {
                  step: '02',
                  title: 'Sistem Terbitkan Kode',
                  desc: 'Booking Anda otomatis tercatat di sistem, menerbitkan kode unik (BK-XXX), dan diteruskan ke admin teknisi.'
                },
                {
                  step: '03',
                  title: 'Pengerjaan SOP Ketat',
                  desc: 'Teknisi tiba sesuai jadwal dengan seragam resmi, membawa mesin steam bertekanan, dan memproteksi area kerja.'
                },
                {
                  step: '04',
                  title: 'Verifikasi & Selesai',
                  desc: 'Uji running test suhu dingin, cek kelancaran drainase, dan riwayat servis tersimpan aman di sistem.'
                }
              ].map((st, sIndex) => (
                <motion.div
                  key={st.step}
                  variants={fadeInUpVariant}
                  whileHover={{ y: -8, scale: 1.015, transition: { duration: 0.25, ease: easeOutCubic } }}
                  className="bg-sky-50/60 border border-sky-100 rounded-3xl p-6 sm:p-7 relative flex flex-col justify-between hover:bg-white hover:border-blue-300 hover:shadow-xl shadow-blue-900/5 transition-all duration-300 group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span className="font-mono text-3xl font-black text-blue-600 group-hover:scale-110 transition-transform">
                        {st.step}
                      </span>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-blue-700 bg-white px-2.5 py-1 rounded-full border border-sky-200 shadow-2xs">
                        Tahap {sIndex + 1}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{st.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{st.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 7. DOKUMENTASI NYATA KEGIATAN TEKNISI                          */}
      {/* ============================================================== */}
      <GallerySection />

      {/* ============================================================== */}
      {/* 8. DIGITAL EXPERIENCE PREVIEW                                  */}
      {/* ============================================================== */}
      <section className="py-24 bg-sky-50/40 border-t border-sky-100/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest border border-blue-200 mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Pengalaman Digital
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Sistem Layanan Terpadu & Transparan
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Lihat bagaimana NARA AC mengelola setiap detail servis AC dari pelacakan tiket hingga laporan pengerjaan.
            </p>
          </div>

          {/* Interactive Preview Tabs */}
          <div className="bg-white rounded-3xl border border-sky-100 shadow-xl overflow-hidden max-w-5xl mx-auto">

            {/* Tab navigation pills */}
            <div className="flex border-b border-sky-100 bg-sky-50/60 p-2 gap-2 overflow-x-auto scrollbar-none">
              {[
                { id: 'status', label: 'Pelacakan Status Booking' },
                { id: 'sop', label: 'Checklist 7 Langkah SOP' },
                { id: 'history', label: 'Rekam Riwayat Unit AC' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDemoTab(tab.id)}
                  className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${activeDemoTab === tab.id
                      ? 'bg-white text-blue-600 shadow-xs border border-sky-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content animated transitions */}
            <AnimatePresence mode="wait">
              {/* Tab 1: Pelacakan Status Demo */}
              {activeDemoTab === 'status' && (
                <motion.div
                  key="tab-status"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, ease: easeOutCubic }}
                  className="p-6 sm:p-10 space-y-8"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-sky-100">
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-400 uppercase">Kode Tiket Order</span>
                      <h4 className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">BK-2026-0814</h4>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 font-bold border-blue-200 px-3 py-1 rounded-full text-xs w-fit">
                      SEDANG DIKERJAKAN
                    </Badge>
                  </div>

                  {/* Timeline Progress */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative">
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Terjadwal
                      </span>
                      <p className="text-xs text-slate-600">Teknisi & slot waktu telah dikonfirmasi sistem.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-300 shadow-sm">
                      <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5 mb-1">
                        <Clock className="w-4 h-4 text-blue-600 animate-spin" /> Sedang Dikerjakan
                      </span>
                      <p className="text-xs text-slate-600">Teknisi sedang melakukan pencucian indoor & outdoor.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 opacity-60">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                        <Check className="w-4 h-4 text-slate-400" /> Selesai
                      </span>
                      <p className="text-xs text-slate-600">Running test lulus dan laporan tersimpan.</p>
                    </div>
                  </div>

                  <div className="bg-sky-50/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 border border-sky-100">
                    <span>Ingin mencoba melacak status pengerjaan Anda sendiri?</span>
                    <Link to="/status" className="font-bold text-blue-600 hover:underline flex items-center gap-1">
                      Buka Halaman Cek Status &rarr;
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* Tab 2: SOP Checklist Demo */}
              {activeDemoTab === 'sop' && (
                <motion.div
                  key="tab-sop"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, ease: easeOutCubic }}
                  className="p-6 sm:p-10 space-y-6"
                >
                  <div className="pb-4 border-b border-sky-100">
                    <h4 className="text-lg sm:text-xl font-bold text-slate-900">Prosedur 7 Langkah Standar Servis AC</h4>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">Daftar periksa yang diverifikasi teknisi NARA AC pada setiap unit.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {[
                      'Proteksi terpal pelindung perabotan & dinding',
                      'Pencucian filter indoor & casing cover depan',
                      'Penyemprotan evaporator indoor bertekanan',
                      'Pembersihan talang air & saluran pembuangan drain',
                      'Pencucian kisi-kisi kondensor outdoor',
                      'Pengecekan tekanan freon & arus listrik (ampere)',
                      'Uji running test suhu dingin & kelancaran air'
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-sky-50/50 border border-sky-100 text-xs sm:text-sm text-slate-700">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                          ✓
                        </div>
                        <span className="font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Tab 3: Unit History Demo */}
              {activeDemoTab === 'history' && (
                <motion.div
                  key="tab-history"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, ease: easeOutCubic }}
                  className="p-6 sm:p-10 space-y-6"
                >
                  <div className="pb-4 border-b border-sky-100">
                    <h4 className="text-lg sm:text-xl font-bold text-slate-900">Rekam Jejak Pemeliharaan Unit</h4>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">Riwayat servis transparan untuk pemantauan kondisi mesin pendingin.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <p className="text-xs font-mono font-bold text-blue-600">Daikin Inverter 1 PK — Ruang Keluarga</p>
                        <p className="text-xs text-slate-500 mt-0.5">Servis Terakhir: 12 Januari 2026 • Teknisi: Budi Santoso</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                        Kondisi Prima (16.2°C)
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <p className="text-xs font-mono font-bold text-blue-600">Panasonic Standard 0.5 PK — Kamar Utama</p>
                        <p className="text-xs text-slate-500 mt-0.5">Servis Terakhir: 05 Oktober 2025 • Tambah Freon R32</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                        Jadwal Cuci Berikutnya: April 2026
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 9. PROFIL PERUSAHAAN & LEGALITAS                              */}
      {/* ============================================================== */}
      <section id="profil" className="py-24 bg-white relative border-t border-sky-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">

            {/* Story */}
            <div className="lg:col-span-6 space-y-6">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest border border-blue-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Profil Resmi
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                CV. Nara Teknindotama
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                CV. Nara Teknindotama adalah entitas usaha berbadan hukum yang berdedikasi pada penyediaan jasa teknis pendingin udara (AC), suku cadang resmi, serta pemeliharaan unit skala residensial maupun komersial.
              </p>
              <p className="text-slate-600 text-base leading-relaxed">
                Aktivitas operasional perawatan AC telah dirintis sejak <strong>Februari 2022</strong> dan resmi berbadan hukum pada <strong>Mei 2025</strong> guna memberikan perlindungan, kepastian hukum, dan standar pelayanan profesional bagi seluruh pelanggan.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100">
                  <p className="text-xs text-slate-500 font-bold uppercase">Operasional Dimulai</p>
                  <p className="text-lg font-black text-slate-900 mt-1">Februari 2022</p>
                </div>
                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100">
                  <p className="text-xs text-slate-500 font-bold uppercase">Legalitas Resmi</p>
                  <p className="text-lg font-black text-slate-900 mt-1">Mei 2025</p>
                </div>
              </div>
            </div>

            {/* Coverage Card (Clean Light Blue & White) */}
            <div className="lg:col-span-6 bg-gradient-to-br from-sky-50 via-blue-50/70 to-sky-100/60 text-slate-900 rounded-3xl p-8 sm:p-10 shadow-xl shadow-blue-500/5 border border-sky-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200/40 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative z-10 space-y-6">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Wilayah Layanan</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">Cakupan Wilayah Operasional</h3>
                  <p className="text-slate-600 text-xs sm:text-sm mt-2 leading-relaxed">
                    Teknisi NARA AC siap melayani pengerjaan servis langsung ke lokasi di area:
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs sm:text-sm">
                  {[
                    'Ciangsana & Gunung Putri',
                    'Kota Wisata & Cibubur',
                    'Cikeas & Bojong Kulur',
                    'Kab. Bogor & Sekitarnya',
                    'Kota Depok Bagian Timur',
                    'Jakarta Timur & Sekitarnya'
                  ].map((area, aIdx) => (
                    <div key={aIdx} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/90 border border-sky-100 text-slate-700 shadow-2xs">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{area}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-sky-200/60 text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-900">Alamat Kantor & Workshop:</strong><br />
                  Jl. Teluk Langsa RT.002 RW.016, Ciangsana, Kec. Gunung Putri, Kabupaten Bogor, Jawa Barat.
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 10. FAQ ACCORDION                                              */}
      {/* ============================================================== */}
      <section id="faq" className="py-24 bg-sky-50/30 border-t border-sky-100/60 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest border border-blue-200 mb-3">
              <ChevronDown className="w-3.5 h-3.5" /> Tanya Jawab
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Jawaban ringkas dan jelas seputar cara booking, waktu pengerjaan, dan ketentuan garansi NARA AC.
            </p>
          </div>

          <div className="space-y-4">
            <FAQAccordion
              index={0}
              question="Berapa lama durasi pengerjaan cuci AC standar dan Core?"
              answer="Cuci AC Standar membutuhkan waktu sekitar 45 hingga 60 menit per unit. Sedangkan Paket Core (Deep Clean) membutuhkan 75 hingga 90 menit karena teknisi membongkar total kipas blower dan talang air untuk membersihkan lumut dan lendir penyumbat secara tuntas."
            />
            <FAQAccordion
              index={1}
              question="Apa perbedaan utama Paket Standar dan Paket Core?"
              answer="Paket Standar cocok untuk perawatan rutin AC yang masih dingin dan hanya berdebu ringan (dibersihkan dari luar). Sedangkan Paket Core adalah overhaul deep-clean: casing, talang air, dan rotor blower dilepas total, dicuci dengan cairan anti-bakteri, dan pipa pembuangan divakum. Core sangat direkomendasikan jika AC Anda pernah meneteskan air (bocor) atau berbau apek."
            />
            <FAQAccordion
              index={2}
              question="Bagaimana cara mengecek status tiket booking saya?"
              answer="Anda dapat membuka menu 'Cek Status' di website ini, lalu masukkan kode booking Anda (misal BK-2026-001) atau nomor HP yang didaftarkan. Anda dapat melihat apakah tiket sedang dijadwalkan, dikerjakan oleh teknisi, atau sudah selesai."
            />
            <FAQAccordion
              index={3}
              question="Apakah ada garansi setelah pengerjaan servis AC?"
              answer="Ya, kami memberikan garansi pekerjaan nyata: 14 hari untuk Paket Standar, 30 hari penuh untuk Paket Core, dan 45 hari untuk Paket Core + Freon. Jika AC mengalami kendala seperti bocor air atau kurang dingin pasca pengerjaan, teknisi kami akan datang memeriksa kembali gratis."
            />
            <FAQAccordion
              index={4}
              question="Apakah NARA AC melayani pengerjaan untuk kantor, ruko, atau instansi?"
              answer="Tentu. Selain rumah tinggal, CV. Nara Teknindotama melayani kantor, ruko, restoran, klinik, dan instansi dengan opsi pembuatan invoice resmi dan penawaran kerja sama pemeliharaan rutin berkala."
            />
            <FAQAccordion
              index={5}
              question="Bagaimana jika saya perlu mengubah jadwal pengerjaan (reschedule)?"
              answer="Anda dapat menghubungi admin layanan pelanggan NARA AC melalui nomor WhatsApp resmi kami setidaknya 24 jam sebelum jadwal pengerjaan agar kami dapat menyesuaikan kembali slot teknisi lapangan."
            />
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 11. FINAL HEROIC CALL TO ACTION BANNER (CLEAN LIGHT BLUE)       */}
      {/* ============================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-t border-sky-100/60">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOutCubic }}
            viewport={{ once: true }}
            className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-sky-500 p-8 sm:p-14 lg:p-16 text-white text-center relative overflow-hidden shadow-2xl shadow-blue-500/20"
          >
            {/* Ambient Lighting */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-300/20 rounded-full blur-[90px] pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/20">
                <Wind className="w-3.5 h-3.5" /> Udara Sejuk, Nyaman, & Sehat
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
                Jadwalkan Perawatan AC Anda dengan Lebih Mudah
              </h2>

              <p className="text-blue-50 text-base sm:text-lg leading-relaxed font-normal">
                Mulai dengan memilih paket layanan dan menentukan jadwal yang sesuai. Nikmati proses pengerjaan profesional dan transparan bersama CV. Nara Teknindotama.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link to="/booking">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-white hover:bg-sky-50 text-blue-700 font-black rounded-2xl px-8 h-14 text-base shadow-xl hover:shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2 group"
                  >
                    <CalendarCheck className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                    <span>Booking Service Sekarang</span>
                  </Button>
                </Link>

                <Link to="/status">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto bg-white/15 hover:bg-white/25 text-white border-white/30 rounded-2xl px-8 h-14 text-base font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4 text-white" />
                    <span>Cek Status Booking</span>
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 12. FOOTER (CLEAN LIGHT BLUE & WHITE THEME)                    */}
      {/* ============================================================== */}
      <footer className="bg-sky-50/60 text-slate-600 pt-16 pb-12 px-4 sm:px-6 lg:px-8 border-t border-sky-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-sky-200/70">

          {/* Brand Info */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="inline-block">
              <CompanyLogo dark={false} iconSize="h-10" />
            </Link>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-sm">
              Sistem Pengelolaan Jadwal & Perawatan AC Terpercaya oleh <strong>CV. Nara Teknindotama</strong>. Melayani cuci AC, perbaikan, isi freon, dan instalasi di area Jabodetabek.
            </p>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-bold text-sm text-slate-900 tracking-wider uppercase">Menu Utama</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <button onClick={() => scrollTo('home')} className="hover:text-blue-600 transition-colors cursor-pointer">
                  Beranda
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('layanan')} className="hover:text-blue-600 transition-colors cursor-pointer">
                  Katalog Layanan
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('keunggulan')} className="hover:text-blue-600 transition-colors cursor-pointer">
                  Keunggulan
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('cara-kerja')} className="hover:text-blue-600 transition-colors cursor-pointer">
                  Cara Kerja
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('galeri')} className="hover:text-blue-600 transition-colors cursor-pointer">
                  Dokumentasi
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('faq')} className="hover:text-blue-600 transition-colors cursor-pointer">
                  FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* Legalitas & Area */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-bold text-sm text-slate-900 tracking-wider uppercase">Informasi Usaha</h4>
            <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <li>
                <strong className="text-slate-900">Badan Usaha:</strong><br />
                CV. Nara Teknindotama (Resmi Mei 2025)
              </li>
              <li>
                <strong className="text-slate-900">Workshop & Kantor:</strong><br />
                Jl. Teluk Langsa RT.002 RW.016, Ciangsana, Kec. Gunung Putri, Kab. Bogor
              </li>
              <li>
                <strong className="text-slate-900">Cakupan Wilayah:</strong><br />
                Ciangsana, Kota Wisata, Cibubur, Cikeas, Depok, dan Jakarta Timur
              </li>
            </ul>
          </div>

          {/* Contact & Socials */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-bold text-sm text-slate-900 tracking-wider uppercase">Kontak Resmi</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <a href="https://wa.me/6281385293137" target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors">
                  0813-8529-3137 (WhatsApp)
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                <a href="mailto:narateknindotama@gmail.com" className="hover:text-blue-600 transition-colors">
                  narateknindotama@gmail.com
                </a>
              </li>
              <li className="pt-2 text-xs text-slate-500">
                <span>Instagram: @narateknindotamaserviceac</span><br />
                <span>TikTok: Nara Theknik</span>
              </li>
              <li className="pt-2">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold text-xs">
                  <span>Portal Staf & Teknisi</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} CV. Nara Teknindotama. All rights reserved.</p>
          <p className="text-slate-500">
            Sistem Informasi & Manajemen Layanan Servis AC Jabodetabek
          </p>
        </div>
      </footer>

      {/* Floating Bottom Booking Action Pill */}
      <StickyBottomBooking />

    </div>
  );
}
