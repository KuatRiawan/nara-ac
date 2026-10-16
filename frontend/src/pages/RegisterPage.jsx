import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContext } from '../AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import CompanyLogo from '../components/CompanyLogo';
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
  User,
  MapPin,
  Sparkles,
  AlertTriangle,
  Gift,
  Clock,
  Award,
  Star,
  CheckCircle2,
  PhoneCall,
} from 'lucide-react';

export default function RegisterPage() {
  const [nama, setNama] = useState('');
  const [kontak, setKontak] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alamat, setAlamat] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { registerMember } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!nama.trim() || !kontak.trim() || !email.trim() || !password) {
      setError('Nama, No WhatsApp, Email, dan Kata Sandi wajib diisi.');
      return;
    }

    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter demi keamanan akun Anda.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await registerMember({
        nama: nama.trim(),
        kontak: kontak.trim(),
        email: email.trim(),
        password,
        alamat: alamat.trim() || undefined,
      });

      // Sukses mendaftar, langsung diarahkan ke customer dashboard
      navigate('/customer/dashboard');
    } catch (err) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.error?.message ||
        err?.message ||
        'Pendaftaran gagal. Periksa kembali format data yang Anda masukkan.';
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
      {/* 1. TOP NAVBAR (KONSISTEN 100% DENGAN SISTEM NARA AC)           */}
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
              <Gift className="w-3.5 h-3.5 text-blue-600" /> Registrasi Akun Member
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
          
          {/* SISI KIRI: BENEFIT & PERKS MEMBER NARA AC */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/80 border border-blue-200 text-blue-700 text-xs font-bold shadow-2xs">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Program Keanggotaan Nara Member Care</span>
            </div>

            {/* Headline Utama */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                Daftar Member &amp; Nikmati <br />
                <span className="text-blue-600">Perawatan AC Prioritas.</span>
              </h1>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
                Kelola seluruh unit AC hunian dan perkantoran Anda dalam satu portal terpadu <strong>CV. Nara Teknindotama</strong>. Dapatkan diskon 10% eksklusif member untuk semua servis, pantau riwayat perawatan, dan klaim garansi online tanpa cemas nota fisik hilang.
              </p>
            </div>

            {/* 3 Pillar Cards (Sesuai Gaya Desain Asli NARA AC) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              
              <div className="p-4 rounded-2xl bg-white border border-sky-100/80 shadow-xs hover:border-blue-200 transition-all">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
                  <Award className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black text-slate-800 mb-1">Diskon Eksklusif Member</h2>
                <p className="text-xs text-slate-500 leading-normal">
                  Diskon 10% setiap pemesanan jasa servis AC langsung dari unit pertama.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-sky-100/80 shadow-xs hover:border-blue-200 transition-all">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                  <Clock className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black text-slate-800 mb-1">Pengingat Servis Otomatis</h2>
                <p className="text-xs text-slate-500 leading-normal">
                  Notifikasi ramah via WhatsApp saat AC Anda butuh cuci rutin.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-sky-100/80 shadow-xs hover:border-blue-200 transition-all">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black text-slate-800 mb-1">Garansi Terdata Resmi</h2>
                <p className="text-xs text-slate-500 leading-normal">
                  Rekam teknisi, foto pengerjaan, dan garansi s.d 45 hari tersimpan aman.
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
                <span className="text-slate-500">Dukungan WhatsApp</span>
              </div>
            </div>

          </div>

          {/* SISI KANAN: KARTU FORM REGISTRASI ELEGAN */}
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
                  Portal Registrasi Member
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Daftar Member Baru
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Lengkapi data di bawah ini untuk mengaktifkan akun member Anda.
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

              {/* Register Form */}
              <form onSubmit={handleRegister} className="space-y-3.5 relative z-10">
                
                {/* Nama Lengkap */}
                <div className="space-y-1">
                  <label htmlFor="reg-nama" className="text-xs font-bold text-slate-700 block">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="reg-nama"
                      type="text"
                      placeholder="Contoh: Budi Santoso"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      className="h-11 pl-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                      required
                      disabled={isLoading}
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Nomor WhatsApp */}
                <div className="space-y-1">
                  <label htmlFor="reg-kontak" className="text-xs font-bold text-slate-700 block">
                    Nomor WhatsApp / HP <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="reg-kontak"
                      type="tel"
                      placeholder="Contoh: 081234567890"
                      value={kontak}
                      onChange={(e) => setKontak(e.target.value)}
                      className="h-11 pl-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono"
                      required
                      disabled={isLoading}
                      autoComplete="tel"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Digunakan untuk login cepat dengan WhatsApp OTP &amp; pengingat servis.
                  </p>
                </div>

                {/* Email Pengguna */}
                <div className="space-y-1">
                  <label htmlFor="reg-email" className="text-xs font-bold text-slate-700 block">
                    Alamat Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="nama@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 pl-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Kata Sandi */}
                <div className="space-y-1">
                  <label htmlFor="reg-password" className="text-xs font-bold text-slate-700 block">
                    Kata Sandi <span className="text-rose-500">*</span> (Min. 8 karakter)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pl-10 pr-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono tracking-wider"
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
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

                {/* Alamat Domisili */}
                <div className="space-y-1">
                  <label htmlFor="reg-alamat" className="text-xs font-bold text-slate-700 block">
                    Alamat Domisili <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                    <textarea
                      id="reg-alamat"
                      rows={2}
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                      placeholder="Contoh: Jl. Diponegoro No. 45, Semarang"
                      className="w-full pl-10 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-none text-slate-800 placeholder:text-slate-400"
                      disabled={isLoading}
                    />
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
                        <span>Mendaftarkan Akun Member...</span>
                      </>
                    ) : (
                      <>
                        <span>Daftar Akun Member Sekarang</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>

              </form>

              {/* Bottom Links */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2.5 text-center text-xs relative z-10">
                <p className="text-slate-600">
                  Sudah memiliki akun member?{' '}
                  <Link to="/login" className="text-blue-600 font-bold hover:underline cursor-pointer">
                    Masuk di Sini
                  </Link>
                </p>
                <div className="flex items-center justify-center gap-3 text-2xs text-slate-400">
                  <Link to="/booking" className="hover:text-slate-700 hover:underline">
                    Pesan Servis Tanpa Akun
                  </Link>
                  <span>&bull;</span>
                  <Link to="/staff/login" className="hover:text-slate-700 hover:underline">
                    Portal Staf &amp; Teknisi
                  </Link>
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
          <p>&copy; {new Date().getFullYear()} CV. Nara Teknindotama. Seluruh hak cipta dilindungi.</p>
          <div className="flex items-center gap-4">
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
