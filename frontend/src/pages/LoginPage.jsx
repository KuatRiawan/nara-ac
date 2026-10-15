import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContext } from '../AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import CompanyLogo from '../components/CompanyLogo';

import { useBusinessProfile, buildWhatsAppUrl } from '../hooks/useBusinessProfile';
import api from '../api';
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft, ArrowRight, Mail, Lock, Sparkles, Shield, Clock, AlertTriangle, CheckCircle2, FileText, Star, Zap, PhoneCall, X, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { whatsappNumber } = useBusinessProfile();

  // Forgot password & reset modal states
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotErr, setForgotErr] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showResetFields, setShowResetFields] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotErr('Mohon masukkan email Anda.');
      return;
    }
    setForgotLoading(true);
    setForgotErr('');
    setForgotMsg('');
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotMsg(res?.message || 'Permintaan reset telah diproses.');
    } catch (err) {
      setForgotErr(err?.response?.data?.error?.message || err?.message || 'Gagal memproses permintaan reset.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetToken.trim() || !newPassword) {
      setForgotErr('Token dan password baru wajib diisi.');
      return;
    }
    if (newPassword.length < 8) {
      setForgotErr('Password baru minimal 8 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotErr('Konfirmasi password tidak cocok.');
      return;
    }
    setForgotLoading(true);
    setForgotErr('');
    setForgotMsg('');
    try {
      const res = await api.post('/auth/reset-password', {
        token: resetToken.trim(),
        new_password: newPassword
      });
      setForgotMsg(res?.message || 'Password berhasil diperbarui! Silakan login.');
      setTimeout(() => {
        setIsForgotOpen(false);
        setPassword('');
        setForgotMsg('');
      }, 2500);
    } catch (err) {
      setForgotErr(err?.response?.data?.error?.message || err?.message || 'Gagal mereset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const res = await login(email.trim(), password);
      setTimeout(() => {
        if (res.user.role === 'technician') {
          navigate('/technician/dashboard');
        } else if (res.user.role === 'customer') {
          navigate('/customer/dashboard');
        } else {
          navigate('/admin');
        }
      }, 350);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.error?.message || err?.message || 'Email atau password tidak sesuai. Periksa kembali.');
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
      {/* 1. TOP NAVBAR (KONSISTEN DENGAN LANDING & BOOKING PAGE)        */}
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
              <Clock className="w-3.5 h-3.5" /> 24 Hour Service
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
      {/* 2. MAIN BALANCED 2-COLUMN LAYOUT                               */}
      {/* ============================================================== */}
      <main className="flex-1 flex items-center justify-center py-8 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* SISI KIRI: BRAND VALUE & OPERATIONAL HIGHLIGHTS (LIGHT THEME) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/80 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Portal Manajemen & Operasional Terpadu</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Sistem Layanan AC <br />
              <span className="text-blue-600">Terstandar, Cepat & Sah.</span>
            </h1>

            {/* Paragraph */}
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
              Portal komprehensif <strong>CV. Nara Teknindotama</strong> untuk mengelola penugasan teknisi otomatis, pemantauan kepatuhan SOP 7 Langkah, serta pelacakan garansi digital resmi pelanggan.
            </p>

            {/* 3 Fitur Unggulan Sistem (Card Ringan & Elegan) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              
              <div className="p-4 rounded-2xl bg-white border border-sky-100/80 shadow-xs hover:border-blue-200 transition-all">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                  <Zap className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black text-slate-800 mb-1">Smart Dispatcher</h2>
                <p className="text-xs text-slate-500 leading-normal">
                  Penugasan tiket teknisi otomatis berbasis zona & jam kerja.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-sky-100/80 shadow-xs hover:border-blue-200 transition-all">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black text-slate-800 mb-1">SOP 7 Langkah</h2>
                <p className="text-xs text-slate-500 leading-normal">
                  Protokol uji tekanan freon, ampere, dan cuci kimiawi steril.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-sky-100/80 shadow-xs hover:border-blue-200 transition-all">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2.5">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black text-slate-800 mb-1">E-Invoice Resmi</h2>
                <p className="text-xs text-slate-500 leading-normal">
                  Kop surat legalitas resmi dengan garansi servis s.d 45 hari.
                </p>
              </div>

            </div>

            {/* Mini Trust Stats Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-600 border-t border-slate-200/70">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span className="font-black text-slate-900">4.9/5.0</span>
                <span className="text-slate-500">Kepuasan Konsumen</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span className="font-black text-slate-900">2.500+</span>
                <span className="text-slate-500">Unit Servis Ditangani</span>
              </div>
              <div className="flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-emerald-600" />
                <span className="font-black text-slate-900">24 Jam</span>
                <span className="text-slate-500">Siaga Operasional</span>
              </div>
            </div>

          </div>

          {/* SISI KANAN: KARTU FORM LOGIN ELEGAN */}
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
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                  Portal Autentikasi
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Masuk ke Akun
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Gunakan email dan password terdaftar Anda untuk masuk.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 shadow-xs relative z-10"
                >
                  <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <p className="flex-1">{error}</p>
                </motion.div>
              )}

              

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-xs font-bold text-slate-700 block">
                    Email Pengguna
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="nama@nara-ac.local"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                      }}
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
                    <label htmlFor="login-password" className="text-xs font-bold text-slate-700">
                      Kata Sandi
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotOpen(true);
                          setForgotEmail(email);
                          setForgotErr('');
                          setForgotMsg('');
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Lupa Password?
                      </button>
                      <span className="text-slate-300 text-xs">•</span>
                      <a
                        href={buildWhatsAppUrl(whatsappNumber, 'Halo Admin NARA AC, saya butuh bantuan reset password akun')}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Bantuan CS?
                        <span className="sr-only"> (buka di tab baru)</span>
                      </a>
                    </div>
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
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
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-11 text-xs font-black rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Memverifikasi Akun...</span>
                      </>
                    ) : (
                      <>
                        <span>Masuk ke Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>

              </form>

              {/* Security Badge */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500 relative z-10">
                <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Otentikasi Berbasis Peran & Enkripsi Sesi JWT</span>
              </div>

            </motion.div>

          </div>

        </div>

        {/* Forgot / Reset Password Modal */}
        {isForgotOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative z-50"
            >
              <button
                type="button"
                onClick={() => setIsForgotOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pemulihan Kata Sandi</h3>
                  <p className="text-xs text-slate-500">Reset password akun NARA AC</p>
                </div>
              </div>

              {forgotMsg && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p>{forgotMsg}</p>
                </div>
              )}

              {forgotErr && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <p>{forgotErr}</p>
                </div>
              )}

              {!showResetFields ? (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Masukkan email akun Anda. Jika terdaftar di sistem NARA AC, instruksi reset akan diproses dengan token aman yang berlaku 30 menit.
                  </p>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Email Terdaftar</label>
                    <Input
                      type="email"
                      required
                      placeholder="nama@nara-ac.local"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="h-10 text-xs"
                      disabled={forgotLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 text-xs rounded-xl gap-2"
                  >
                    {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Kirim Permintaan Reset
                  </Button>
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setShowResetFields(true)}
                      className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      Sudah memiliki Token Reset? Klik di sini
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Token Reset (64 karakter)</label>
                    <Input
                      type="text"
                      required
                      placeholder="Masukkan token reset"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="h-10 text-xs font-mono"
                      disabled={forgotLoading}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Kata Sandi Baru (Min. 8 karakter)</label>
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-10 text-xs"
                      disabled={forgotLoading}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Konfirmasi Kata Sandi Baru</label>
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-10 text-xs"
                      disabled={forgotLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 text-xs rounded-xl gap-2"
                  >
                    {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Simpan Kata Sandi Baru
                  </Button>
                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => setShowResetFields(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Kembali ke Permintaan Token
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* 3. FOOTER RESMI (KONSISTEN DENGAN SELURUH SISTEM NARA AC)      */}
      {/* ============================================================== */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium text-slate-600">&copy; {new Date().getFullYear()} CV. Nara Teknindotama. Seluruh hak cipta dilindungi.</p>
          <p className="mt-1 text-xs text-slate-500">
            Jalan Teluk Langsa RT. 002 RW. 016, Ciangsana, Gunung Putri, Kab. Bogor, Jawa Barat • WhatsApp: 0813-8529-3137
          </p>
        </div>
      </footer>

    </div>
  );
}


