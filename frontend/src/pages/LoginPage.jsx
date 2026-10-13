import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import CompanyLogo from '../components/CompanyLogo';
import { cn } from '../lib/utils';
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  ShieldCheck, 
  ArrowLeft, 
  ArrowRight,
  Mail, 
  Lock, 
  UserCheck, 
  Wrench, 
  User, 
  Sparkles, 
  Shield, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  FileText,
  Star,
  Zap,
  PhoneCall
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@nara-ac.local');
  const [password, setPassword] = useState('Admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('admin');

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Role quick presets (Hanya untuk kemudahan demonstrasi & pengujian)
  const roles = [
    {
      id: 'admin',
      label: 'Admin',
      sublabel: 'Pusat Dispatcher',
      icon: UserCheck,
      email: 'admin@nara-ac.local',
      password: 'Admin123',
      dest: 'Dashboard Pusat & Penugasan'
    },
    {
      id: 'technician',
      label: 'Teknisi',
      sublabel: 'Budi Santoso',
      icon: Wrench,
      email: 'budi@nara-ac.local',
      password: 'Admin123',
      dest: 'Jadwal & SOP Lapangan'
    },
    {
      id: 'customer',
      label: 'Pelanggan',
      sublabel: 'Citra Lestari',
      icon: User,
      email: 'customer@nara-ac.local',
      password: 'Admin123',
      dest: 'Portal Riwayat Servis'
    }
  ];

  const handleRoleSelect = (r) => {
    setSelectedRole(r.id);
    setEmail(r.email);
    setPassword(r.password);
    setError('');
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

  const activeRoleObj = roles.find((r) => r.id === selectedRole);

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
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200/80">
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
                <p className="text-[11px] text-slate-500 leading-normal">
                  Penugasan tiket teknisi otomatis berbasis zona & jam kerja.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-sky-100/80 shadow-xs hover:border-blue-200 transition-all">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black text-slate-800 mb-1">SOP 7 Langkah</h2>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Protokol uji tekanan freon, ampere, dan cuci kimiawi steril.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-sky-100/80 shadow-xs hover:border-blue-200 transition-all">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2.5">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-black text-slate-800 mb-1">E-Invoice Resmi</h2>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Kop surat legalitas resmi dengan garansi servis s.d 45 hari.
                </p>
              </div>

            </div>

            {/* Mini Trust Stats Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-600 border-t border-slate-200/70">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span className="font-black text-slate-900">4.9/5.0</span>
                <span className="text-slate-400">Kepuasan Konsumen</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span className="font-black text-slate-900">2.500+</span>
                <span className="text-slate-400">Unit Servis Ditangani</span>
              </div>
              <div className="flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-emerald-600" />
                <span className="font-black text-slate-900">24 Jam</span>
                <span className="text-slate-400">Siaga Operasional</span>
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
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
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

              {/* Role Switcher Tabs (Kemudahan Pengujian Sementara) */}
              <div className="relative z-10 mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Pilih Akun Uji Coba:
                  </label>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Mode Demo
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/70">
                  {roles.map((r) => {
                    const Icon = r.icon;
                    const isSelected = selectedRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleRoleSelect(r)}
                        className={cn(
                          "py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer",
                          isSelected
                            ? "bg-white text-blue-700 shadow-xs shadow-slate-300 font-black border border-slate-200/80"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-blue-600" : "text-slate-400")} />
                          <span>{r.label}</span>
                        </div>
                        <span className={cn("text-[9px] font-normal truncate max-w-[80px]", isSelected ? "text-blue-600" : "text-slate-400")}>
                          {r.sublabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Destination Hint */}
                {activeRoleObj && (
                  <div className="mt-2 px-3 py-1.5 rounded-xl bg-sky-50/70 border border-sky-100 text-[11px] text-blue-900 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Tujuan:</span>
                    <span className="font-bold text-blue-700">
                      {activeRoleObj.dest}
                    </span>
                  </div>
                )}
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Email Pengguna
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input 
                      type="email" 
                      placeholder="nama@nara-ac.local"
                      value={email} 
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setSelectedRole('');
                      }} 
                      className="h-11 pl-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                      required 
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Kata Sandi
                    </label>
                    <a
                      href="https://wa.me/6281385293137?text=Halo%20Admin%20NARA%20AC,%20saya%20butuh%20bantuan%20reset%20password%20akun"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      Bantuan CS?
                    </a>
                  </div>
                  
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••"
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="h-11 pl-10 pr-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono tracking-wider"
                      required 
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
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
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] text-slate-400 relative z-10">
                <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Otentikasi Berbasis Peran & Enkripsi Sesi JWT</span>
              </div>

            </motion.div>

          </div>

        </div>
      </main>

      {/* ============================================================== */}
      {/* 3. FOOTER RESMI (KONSISTEN DENGAN SELURUH SISTEM NARA AC)      */}
      {/* ============================================================== */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium text-slate-600">&copy; {new Date().getFullYear()} CV. Nara Teknindotama. Seluruh hak cipta dilindungi.</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Jalan Teluk Langsa RT. 002 RW. 016, Ciangsana, Gunung Putri, Kab. Bogor, Jawa Barat • WhatsApp: 0813-8529-3137
          </p>
        </div>
      </footer>

    </div>
  );
}


