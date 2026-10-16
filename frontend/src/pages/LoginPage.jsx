import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import CompanyLogo from '../components/CompanyLogo';
import { useBusinessProfile, buildWhatsAppUrl } from '../hooks/useBusinessProfile';
import api from '../api';
import {
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  Phone,
  MessageSquare,
  Sparkles,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Star,
  Zap,
  PhoneCall,
  X,
  KeyRound,
  UserPlus,
  RefreshCw,
  Gift,
  Award,
} from 'lucide-react';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('otp'); // 'otp' | 'password'

  // WhatsApp OTP states
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState('phone'); // 'phone' | 'code'
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');
  const [otpError, setOtpError] = useState('');
  const [notRegistered, setNotRegistered] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Email/Password states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

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

  const { login, requestCustomerOtp, verifyCustomerOtp } = useContext(AuthContext);
  const navigate = useNavigate();
  const { whatsappNumber } = useBusinessProfile();

  // Resend countdown timer
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  // Request WhatsApp OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otpPhone.trim()) {
      setOtpError('Mohon masukkan nomor WhatsApp Anda.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');
    setNotRegistered(false);

    try {
      const res = await requestCustomerOtp(otpPhone.trim());
      setOtpSuccessMsg(res?.message || 'Kode OTP telah dikirimkan ke WhatsApp Anda.');
      setOtpStep('code');
      setResendTimer(60);
    } catch (err) {
      const respData = err?.response?.data;
      const errMsg = respData?.error?.message || err?.message || 'Gagal mengirimkan kode OTP WhatsApp.';
      setOtpError(errMsg);
      if (respData?.error?.code === 'NOT_FOUND' || respData?.error?.details?.not_registered) {
        setNotRegistered(true);
      }
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify WhatsApp OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setOtpError('Kode OTP harus terdiri dari 6 angka.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      await verifyCustomerOtp(otpPhone.trim(), otpCode.trim());
      setOtpSuccessMsg('Verifikasi berhasil! Mengalihkan ke dashboard...');
      setTimeout(() => {
        navigate('/customer/dashboard');
      }, 350);
    } catch (err) {
      const errMsg = err?.response?.data?.error?.message || err?.message || 'Kode OTP salah atau kedaluwarsa.';
      setOtpError(errMsg);
      setOtpLoading(false);
    }
  };

  // Login with Email & Password
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setPwdError('Email dan kata sandi wajib diisi.');
      return;
    }

    setPwdError('');
    setPwdLoading(true);

    try {
      const res = await login(email.trim(), password);
      setTimeout(() => {
        if (res.user.role === 'customer') {
          navigate('/customer/dashboard');
        } else if (res.user.role === 'technician') {
          navigate('/technician/dashboard');
        } else {
          navigate('/admin');
        }
      }, 350);
    } catch (err) {
      setPwdError(
        err?.response?.data?.error?.message ||
        err?.error?.message ||
        err?.message ||
        'Email atau kata sandi tidak cocok. Periksa kembali.'
      );
      setPwdLoading(false);
    }
  };

  // Forgot password
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
      if (res?._dev_reset_token) {
        setResetToken(res._dev_reset_token);
        setShowResetFields(true);
      }
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
        new_password: newPassword,
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
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Portal Pelanggan &amp; Member
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
      {/* 2. MAIN SPLIT CONTENT (12-KOLOM KONSISTEN)                     */}
      {/* ============================================================== */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full items-center">

          {/* SISI KIRI: BENEFIT & PENJELASAN MEMBER NARA AC */}
          <div className="lg:col-span-7 space-y-6">

            {/* Badge Status */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/80 border border-blue-200 text-blue-700 text-xs font-bold shadow-2xs">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Keanggotaan Eksklusif Nara Member Care</span>
            </div>

            {/* Headline Utama */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Perawatan AC Rumah &amp; Kantor Lebih Terencana
              </h1>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
                Masuk ke akun member untuk memantau status servis, melihat rekam riwayat unit AC, dan mengklaim garansi purna-servis secara online.
              </p>
            </div>

            {/* 3 Pillar Cards (Konsisten dengan Desain Asli) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">

              <div className="p-4 rounded-2xl bg-white border border-sky-100/80 shadow-xs hover:border-blue-200 transition-all">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black text-slate-800 mb-1">WhatsApp OTP Cepat</h2>
                <p className="text-xs text-slate-500 leading-normal">
                  Login instan menggunakan kode 6-digit WhatsApp tanpa perlu repot password.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-sky-100/80 shadow-xs hover:border-blue-200 transition-all">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                  <Gift className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black text-slate-800 mb-1">Diskon Eksklusif Member</h2>
                <p className="text-xs text-slate-500 leading-normal">
                  Diskon 10% setiap pemesanan jasa servis AC langsung dari unit pertama.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-sky-100/80 shadow-xs hover:border-blue-200 transition-all">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2.5">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black text-slate-800 mb-1">Garansi &amp; E-Invoice</h2>
                <p className="text-xs text-slate-500 leading-normal">
                  Klaim garansi pengerjaan s.d 45 hari dan unduh faktur resmi tersimpan rapi.
                </p>
              </div>

            </div>

            {/* Mini Trust Stats Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-600 border-t border-slate-200/70">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span className="font-black text-slate-900">4.9/5.0</span>
                <span className="text-slate-500">Kepuasan Pelanggan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span className="font-black text-slate-900">2.500+</span>
                <span className="text-slate-500">Unit Terdaftar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-emerald-600" />
                <span className="font-black text-slate-900">24 Jam</span>
                <span className="text-slate-500">Dukungan CS</span>
              </div>
            </div>

          </div>

          {/* SISI KANAN: KARTU FORM LOGIN PELANGGAN & MEMBER */}
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
                  Portal Autentikasi Member
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Masuk ke Akun
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih metode masuk yang paling nyaman untuk Anda.
                </p>
              </div>

              {/* Tab Switcher: WhatsApp OTP vs Password */}
              <div className="flex rounded-2xl bg-slate-100/90 p-1 mb-5 border border-slate-200/70 relative z-10">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('otp');
                    setOtpError('');
                    setPwdError('');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === 'otp'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp OTP</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('password');
                    setOtpError('');
                    setPwdError('');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === 'password'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Email &amp; Sandi</span>
                </button>
              </div>

              {/* TAB 1: WHATSAPP OTP */}
              {activeTab === 'otp' && (
                <div className="space-y-4 relative z-10">
                  {/* Error Banner */}
                  {otpError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 shadow-xs"
                    >
                      <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-rose-900">Kendala Masuk</p>
                        <p className="text-2xs text-rose-800 mt-0.5">{otpError}</p>
                        {notRegistered && (
                          <div className="mt-2.5">
                            <Link
                              to="/register"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-2xs transition-colors shadow-2xs"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Daftar Member Sekarang</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Success Banner */}
                  {otpSuccessMsg && !otpError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-2xs font-semibold">{otpSuccessMsg}</span>
                    </motion.div>
                  )}

                  {/* Step 1: Input Phone */}
                  {otpStep === 'phone' ? (
                    <form onSubmit={handleRequestOtp} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="otp-phone" className="text-xs font-bold text-slate-700 block">
                          Nomor WhatsApp Terdaftar
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            id="otp-phone"
                            type="tel"
                            required
                            value={otpPhone}
                            onChange={(e) => setOtpPhone(e.target.value)}
                            placeholder="Contoh: 081234567890"
                            className="h-11 pl-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Pastikan nomor WhatsApp Anda aktif untuk menerima kode verifikasi OTP 6-digit.
                        </p>
                      </div>

                      <Button
                        type="submit"
                        disabled={otpLoading}
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 text-xs"
                      >
                        {otpLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Mengirim Kode OTP...</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-4 h-4" />
                            <span>Kirim Kode OTP via WhatsApp</span>
                          </>
                        )}
                      </Button>
                    </form>
                  ) : (
                    /* Step 2: Input 6-Digit OTP */
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                        <div>
                          <span className="text-2xs text-slate-500 block">Kode dikirim ke WhatsApp:</span>
                          <span className="font-mono font-bold text-xs text-slate-800">{otpPhone}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpStep('phone');
                            setOtpCode('');
                            setOtpError('');
                            setOtpSuccessMsg('');
                          }}
                          className="text-2xs font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          Ubah Nomor
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="otp-code" className="text-xs font-bold text-slate-700 block text-center">
                          Masukkan 6-Digit Kode OTP
                        </label>
                        <Input
                          id="otp-code"
                          type="text"
                          maxLength={6}
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          className="h-12 text-center text-lg tracking-[0.4em] font-mono font-bold rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                        <p className="text-[11px] text-slate-500 text-center leading-normal">
                          Kode berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.
                        </p>
                      </div>

                      <Button
                        type="submit"
                        disabled={otpLoading || otpCode.length !== 6}
                        className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 text-xs"
                      >
                        {otpLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Memverifikasi Kode OTP...</span>
                          </>
                        ) : (
                          <>
                            <span>Verifikasi &amp; Masuk Dashboard</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>

                      <div className="text-center pt-1">
                        {resendTimer > 0 ? (
                          <span className="text-[11px] text-slate-500">
                            Kirim ulang kode dalam <strong className="text-blue-600">{resendTimer} detik</strong>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRequestOtp()}
                            disabled={otpLoading}
                            className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Kirim Ulang Kode OTP Sekarang</span>
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 2: EMAIL & PASSWORD */}
              {activeTab === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4 relative z-10">
                  {pwdError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 shadow-xs"
                    >
                      <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      </div>
                      <p className="flex-1">{pwdError}</p>
                    </motion.div>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="cust-email" className="text-xs font-bold text-slate-700 block">
                      Email Akun Member
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        id="cust-email"
                        type="email"
                        placeholder="nama@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 pl-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                        required
                        disabled={pwdLoading}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="cust-password" className="text-xs font-bold text-slate-700">
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
                          href={buildWhatsAppUrl(whatsappNumber, 'Halo Admin NARA AC, saya member membutuhkan bantuan pemulihan password')}
                          target="_blank"
                          rel="noopener noreferrer"
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
                        id="cust-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 pl-10 pr-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono tracking-wider"
                        required
                        disabled={pwdLoading}
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

                  <Button
                    type="submit"
                    disabled={pwdLoading}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 text-xs"
                  >
                    {pwdLoading ? (
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
                </form>
              )}

              {/* Tautan Pendaftaran & Portal Staf */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-3 relative z-10">
                <p className="text-xs text-slate-600">
                  Belum memiliki akun member?{' '}
                  <Link to="/register" className="font-bold text-blue-600 hover:underline">
                    Daftar Member
                  </Link>
                </p>

                <div className="pt-1">
                  <Link
                    to="/staff/login"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200/60 transition-colors cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>Anda staf atau teknisi Nara AC? Masuk ke Portal Staf</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MODAL FORGOT PASSWORD (KONSISTEN)                           */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isForgotOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-slate-100 relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span>Pemulihan Kata Sandi Akun</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {forgotErr && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  {forgotErr}
                </div>
              )}
              {forgotMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  {forgotMsg}
                </div>
              )}

              {!showResetFields ? (
                <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs">
                  <p className="text-slate-500">
                    Masukkan email akun member Anda untuk menerima instruksi pemulihan kata sandi.
                  </p>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email Terdaftar *</label>
                    <Input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="h-10 text-xs"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsForgotOpen(false)}
                      className="h-9 text-xs"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={forgotLoading}
                      className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                    >
                      {forgotLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Kirim Pemulihan'}
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Token Verifikasi *</label>
                    <Input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="h-10 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Password Baru *</label>
                    <Input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 8 karakter"
                      className="h-10 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Konfirmasi Password Baru *</label>
                    <Input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      className="h-10 text-xs"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button
                      type="submit"
                      disabled={forgotLoading}
                      className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                    >
                      {forgotLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Password Baru'}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 4. FOOTER RESMI (KONSISTEN)                                    */}
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
