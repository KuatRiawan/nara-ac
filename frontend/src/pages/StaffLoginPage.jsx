import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContext } from '../AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import CompanyLogo from '../components/CompanyLogo';
import { useBusinessProfile, buildWhatsAppUrl } from '../hooks/useBusinessProfile';
import {
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  Sparkles,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Star,
  Zap,
  PhoneCall,
  Briefcase,
  Wrench,
  ChevronRight,
  User,
} from 'lucide-react';

export default function StaffLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { whatsappNumber } = useBusinessProfile();

  const { staffLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Email dan kata sandi staf wajib diisi.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await staffLogin(email.trim(), password);
      setTimeout(() => {
        if (res.user.role === 'technician') {
          navigate('/technician/dashboard');
        } else if (res.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/admin');
        }
      }, 350);
    } catch (err) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.error?.message ||
        err?.message ||
        'Email atau kata sandi staf tidak sesuai. Silakan hubungi tim Admin IT.';
      setError(errMsg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/70 via-slate-50 to-white font-sans flex flex-col text-slate-800 relative selection:bg-blue-600 selection:text-white">
      {/* Ambient background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl" />
        <div className="absolute -top-12 right-1/4 w-80 h-80 bg-sky-100/40 rounded-full blur-3xl" />
      </div>

      {/* ============================================================== */}
      {/* 1. TOP NAVBAR (KONSISTEN DENGAN SELURUH SISTEM NARA AC)        */}
      {/* ============================================================== */}
      <header className="bg-white/90 backdrop-blur-md border-b border-sky-100/80 sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex justify-between items-center">
          {/* Logo Brand Resmi */}
          <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
            <CompanyLogo iconSize="h-8 sm:h-9" />
          </Link>

          {/* Action Links */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/80">
              <Shield className="w-3.5 h-3.5 text-blue-600" /> Akses Khusus Staf Internal
            </span>

            <Link to="/">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ke Beranda</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN SPLIT CONTENT (KONSISTEN 12-KOLOM DENGAN LOGIN ASLI)   */}
      {/* ============================================================== */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full items-center">
          
          {/* SISI KIRI: PENJELASAN SISTEM OPERASIONAL STAF NARA AC */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Badge Status Sistem */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/80 border border-blue-200 text-blue-700 text-xs font-bold shadow-2xs">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Workspace Operasional CV. Nara Teknindotama</span>
            </div>

            {/* Headline Utama */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Sistem Manajemen Servis &amp; Penugasan Teknisi
              </h1>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
                Platform terpusat bagi Admin, Customer Service, Finance, dan Teknisi Lapangan untuk mengelola tiket servis AC secara real-time.
              </p>
            </div>

            {/* 3 Pillar Cards (Sesuai Gaya Asli Nara AC) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              
              <div className="p-4 rounded-2xl bg-white border border-sky-100/80 shadow-xs hover:border-blue-200 transition-all">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                  <Zap className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black text-slate-800 mb-1">Smart Dispatching</h2>
                <p className="text-xs text-slate-500 leading-normal">
                  Penugasan tiket teknisi otomatis berbasis zona operasional &amp; kapasitas.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-sky-100/80 shadow-xs hover:border-blue-200 transition-all">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
                  <Wrench className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black text-slate-800 mb-1">SOP 7 Langkah</h2>
                <p className="text-xs text-slate-500 leading-normal">
                  Checklist digital, foto bukti pengerjaan, dan pencatatan spare part.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-sky-100/80 shadow-xs hover:border-blue-200 transition-all">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2.5">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black text-slate-800 mb-1">E-Invoice &amp; Garansi</h2>
                <p className="text-xs text-slate-500 leading-normal">
                  Rekonsiliasi tagihan otomatis dan verifikasi klaim garansi pelanggan.
                </p>
              </div>

            </div>

            {/* Mini Trust Stats Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-600 border-t border-slate-200/70">
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span className="font-black text-slate-900">Admin &amp; CS</span>
                <span className="text-slate-500">Panel Manajemen</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-emerald-600" />
                <span className="font-black text-slate-900">Teknisi</span>
                <span className="text-slate-500">Portal Lapangan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span className="font-black text-slate-900">TLS 1.3</span>
                <span className="text-slate-500">Terenkripsi</span>
              </div>
            </div>

          </div>

          {/* SISI KANAN: KARTU FORM LOGIN STAF ELEGAN (KONSISTEN DENGAN LOGIN ASLI) */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-sky-100 relative overflow-hidden"
            >
              {/* Subtle card glow */}
              <div className="absolute -top-16 -right-16 w-40 h-40 bg-blue-50 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-sky-50 rounded-full blur-2xl pointer-events-none" />

              {/* Form Title */}
              <div className="mb-5 relative z-10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
                    Workspace Staf Internal
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    Staf &amp; Teknisi
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Masuk ke Workspace
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Gunakan email kredensial resmi CV. Nara Teknindotama.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 shadow-xs relative z-10"
                >
                  <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-rose-900">Akses Ditolak</p>
                    <p className="text-2xs text-rose-800 mt-0.5">{error}</p>
                    {error.includes('khusus untuk staf') && (
                      <div className="mt-2">
                        <Link
                          to="/login"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-2xs hover:bg-blue-700"
                        >
                          <User className="w-3 h-3" />
                          <span>Masuk ke Portal Pelanggan</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Staff Login Form */}
              <form onSubmit={handleStaffLogin} className="space-y-4 relative z-10">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label htmlFor="staff-login-email" className="text-xs font-bold text-slate-700 block">
                    Email Akun Staf
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="staff-login-email"
                      type="email"
                      placeholder="admin@nara-ac.local atau teknisi@..."
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 pl-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="staff-login-password" className="text-xs font-bold text-slate-700">
                      Kata Sandi
                    </label>
                    <a
                      href={buildWhatsAppUrl(whatsappNumber, 'Halo Admin IT Nara AC, saya staf/teknisi membutuhkan bantuan reset password akun internal')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Bantuan IT?
                      <span className="sr-only"> (buka di tab baru)</span>
                    </a>
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="staff-login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pl-10 pr-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono tracking-wider"
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 text-xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi Akun Staf...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Panel Kerja</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Tautan kembali ke Portal Pelanggan */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-2 relative z-10">
                <p className="text-xs text-slate-600">
                  Bukan staf atau teknisi Nara AC?{' '}
                  <Link to="/login" className="font-bold text-blue-600 hover:underline">
                    Masuk ke Portal Pelanggan
                  </Link>
                </p>
                <div className="flex items-center justify-center gap-1.5 text-2xs text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sistem terlindungi enkripsi end-to-end</span>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. FOOTER RESMI (KONSISTEN DENGAN SELURUH SISTEM NARA AC)      */}
      {/* ============================================================== */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="font-medium text-slate-600">&copy; {new Date().getFullYear()} CV. Nara Teknindotama. Seluruh hak cipta dilindungi.</p>
          <div className="flex items-center gap-3 font-medium">
            <Link to="/terms" className="hover:text-blue-600 transition-colors">
              Syarat &amp; Ketentuan
            </Link>
            <span className="text-slate-300">&bull;</span>
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">
              Kebijakan Privasi
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
