import { useState, useContext, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AuthContext } from '../../AuthContext';
import {
  User,
  Settings,
  Lock,
  ShieldCheck,
  Bell,
  Mail,
  Phone,
  MapPin,
  Save,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  Check,
  Smartphone,
  Shield,
  HelpCircle
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import api from '../../api';
import { useToast } from '../../components/ui/toast';

export default function CustomerProfile() {
  const { user, updateUser } = useContext(AuthContext);
  const { error: showError, success: showSuccess } = useToast();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'security', 'preferences', 'benefits'

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    nama: user?.nama || user?.name || '',
    email: user?.email || '',
    kontak: user?.kontak || '',
    alamat: ''
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Preferences toggles (saved locally / simulated)
  const [preferences, setPreferences] = useState({
    waReminders: true,
    waTechnicianStatus: true,
    waInvoice: true,
    emailPromo: false
  });

  // Fetch complete customer profile (including address) from API
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get('/customer/profile');
        const data = res.data?.data || res.data || {};
        const u = data.user || user || {};
        const c = data.customer || {};
        setProfileForm({
          nama: u.nama || u.name || '',
          email: u.email || '',
          kontak: u.kontak || c.kontak || '',
          alamat: c.alamat || ''
        });
      } catch {
        // Fallback to AuthContext user
        setProfileForm({
          nama: user?.nama || user?.name || '',
          email: user?.email || '',
          kontak: user?.kontak || '',
          alamat: ''
        });
      } finally {
        setLoadingProfile(false);
      }
    }
    fetchProfile();
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.patch('/customer/profile', profileForm);
      const updatedUser = res.data?.data?.user || res.data?.user || {
        nama: profileForm.nama,
        email: profileForm.email,
        kontak: profileForm.kontak
      };
      updateUser(updatedUser);
      showSuccess('Profil Anda berhasil diperbarui.');
    } catch (err) {
      showError('Gagal memperbarui profil: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      return showError('Konfirmasi password baru tidak cocok.');
    }
    if (passwordForm.new_password.length < 8) {
      return showError('Password baru minimal 8 karakter.');
    }

    setSavingPassword(true);
    try {
      await api.patch('/auth/password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      showSuccess('Password Anda berhasil diperbarui.');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      showError('Gagal mengubah password: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setSavingPassword(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profil Saya', icon: User },
    { id: 'security', label: 'Keamanan & Sandi', icon: Lock },
    { id: 'preferences', label: 'Notifikasi & WhatsApp', icon: Bell },
    { id: 'benefits', label: 'Keanggotaan Member', icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. HEADER SECTION                                              */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Pengaturan Akun &amp; Profil
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola data identitas, keamanan sandi, alamat utama servis, dan preferensi notifikasi Anda.
          </p>
        </div>

        {/* Member Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200/80 px-3.5 py-1.5 rounded-2xl shadow-2xs">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <div className="text-left">
            <p className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Member Aktif</p>
            <p className="text-xs font-bold text-slate-800">Diskon 10% Otomatis</p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. TAB NAVIGATION                                              */}
      {/* ============================================================== */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/80 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "bg-white text-slate-600 hover:text-blue-600 hover:bg-sky-50/60 border border-slate-200/70"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400")} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 3. TAB 1: INFORMASI PROFIL & KONTAK                            */}
      {/* ============================================================== */}
      {activeTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="grid gap-6 lg:grid-cols-3"
        >
          {/* Member Card Summary (Left Col) */}
          <div className="space-y-4">
            <Card className="rounded-3xl border-slate-200/80 shadow-xs overflow-hidden bg-white">
              <div className="p-6 bg-gradient-to-br from-slate-900 to-blue-950 text-white relative">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-600/40 mb-3">
                  {(profileForm.nama || 'P').charAt(0).toUpperCase()}
                </div>
                <h3 className="font-black text-lg text-white leading-tight">{profileForm.nama || 'Pelanggan'}</h3>
                <p className="text-xs text-sky-300 font-medium mt-0.5">{profileForm.email || 'Email belum diatur'}</p>

                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-300">ID Member</span>
                  <span className="font-mono font-bold text-sky-300">#MBR-{String(user?.id || 1).padStart(4, '0')}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-slate-300">Status Akun</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Terverifikasi
                  </span>
                </div>
              </div>
              <CardContent className="p-5 text-xs text-slate-600 space-y-3 bg-slate-50/50">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p>Data profil digunakan teknisi untuk konfirmasi kunjungan servis &amp; penerbitan faktur.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>Nomor WhatsApp digunakan untuk pengiriman OTP login cepat &amp; info status servis real-time.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form Edit Profile (Right Col - Span 2) */}
          <div className="lg:col-span-2">
            <Card className="rounded-3xl border-slate-200/80 shadow-xs overflow-hidden bg-white">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-sm tracking-tight">Data Pribadi &amp; Kontak Utama</h2>
                </div>
              </div>

              <CardContent className="p-6">
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  {/* Nama Lengkap */}
                  <div>
                    <label htmlFor="customer-nama" className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Lengkap *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="customer-nama"
                        type="text"
                        required
                        value={profileForm.nama}
                        onChange={(e) => setProfileForm({ ...profileForm, nama: e.target.value })}
                        placeholder="Contoh: Kuat Riawan"
                        className="block w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                  </div>

                  {/* Email & Kontak WhatsApp Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Email */}
                    <div>
                      <label htmlFor="customer-email" className="block text-xs font-bold text-slate-700 mb-1">
                        Alamat Email *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          id="customer-email"
                          type="email"
                          required
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          placeholder="nama@email.com"
                          className="block w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>
                    </div>

                    {/* WhatsApp */}
                    <div>
                      <label htmlFor="customer-kontak" className="block text-xs font-bold text-slate-700 mb-1">
                        Nomor WhatsApp / HP
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          id="customer-kontak"
                          type="text"
                          value={profileForm.kontak}
                          onChange={(e) => setProfileForm({ ...profileForm, kontak: e.target.value })}
                          placeholder="081234567890"
                          className="block w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Alamat Utama */}
                  <div>
                    <label htmlFor="customer-alamat" className="block text-xs font-bold text-slate-700 mb-1">
                      Alamat Utama Servis (Rumah / Kantor)
                    </label>
                    <div className="relative">
                      <div className="absolute top-3 left-3.5 pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <textarea
                        id="customer-alamat"
                        rows="3"
                        value={profileForm.alamat}
                        onChange={(e) => setProfileForm({ ...profileForm, alamat: e.target.value })}
                        placeholder="Contoh: Jl. Diponegoro No. 45, RT 02 / RW 05, Menteng, Jakarta Pusat (Patokan: Depan Taman)"
                        className="block w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all leading-relaxed"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Alamat ini akan otomatis terisi saat Anda membuat booking baru agar proses pemesanan lebih cepat.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <Button
                      type="submit"
                      disabled={savingProfile || loadingProfile}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl h-11 px-6 shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-2 text-xs sm:text-sm transition-all"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingProfile ? 'Menyimpan Perubahan...' : 'Simpan Perubahan Profil'}</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* ============================================================== */}
      {/* 4. TAB 2: KEAMANAN & PASSWORD                                  */}
      {/* ============================================================== */}
      {activeTab === 'security' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="max-w-2xl"
        >
          <Card className="rounded-3xl border-slate-200/80 shadow-xs overflow-hidden bg-white">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-100/80 text-sky-700 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 text-sm tracking-tight">Perbarui Password Akun</h2>
              </div>
            </div>

            <CardContent className="p-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label htmlFor="customer-current-pass" className="block text-xs font-bold text-slate-700 mb-1">
                    Password Saat Ini *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="customer-current-pass"
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      placeholder="Masukkan password Anda saat ini"
                      className="block w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="customer-new-pass" className="block text-xs font-bold text-slate-700 mb-1">
                    Password Baru * (Minimal 8 karakter)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="customer-new-pass"
                      type={showNewPass ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      placeholder="Minimal 8 karakter kombinasi huruf & angka"
                      className="block w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label htmlFor="customer-confirm-pass" className="block text-xs font-bold text-slate-700 mb-1">
                    Ulangi Password Baru *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="customer-confirm-pass"
                      type={showNewPass ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      placeholder="Ulangi password baru persis sama"
                      className="block w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Tips Keamanan Sandi:</p>
                  <p>Gunakan kombinasi huruf besar, huruf kecil, angka, dan simbol untuk melindungi akun portal Anda.</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <Button
                    type="submit"
                    disabled={savingPassword}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl h-11 px-6 shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-2 text-xs sm:text-sm transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingPassword ? 'Memperbarui Sandi...' : 'Perbarui Password'}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ============================================================== */}
      {/* 5. TAB 3: PREFERENSI & NOTIFIKASI WHATSAPP                      */}
      {/* ============================================================== */}
      {activeTab === 'preferences' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="max-w-2xl"
        >
          <Card className="rounded-3xl border-slate-200/80 shadow-xs overflow-hidden bg-white">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 text-sm tracking-tight">Preferensi Notifikasi &amp; WhatsApp Gateway</h2>
              </div>
            </div>

            <CardContent className="p-6 space-y-5">
              <p className="text-xs text-slate-500">
                Atur bagaimana Anda menerima pembaruan status servis, pengingat cuci berkala, dan nota faktur resmi.
              </p>

              {/* Setting 1: Pengingat Cuci Berkala */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <div className="space-y-0.5 max-w-md">
                  <h3 className="font-black text-xs sm:text-sm text-slate-900">Pengingat Perawatan Berkala (3-4 Bulan)</h3>
                  <p className="text-xs text-slate-500">
                    Kirim pesan WhatsApp otomatis ketika unit AC Anda sudah mendekati jadwal cuci rutin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreferences({ ...preferences, waReminders: !preferences.waReminders });
                    showSuccess('Pengaturan pengingat berhasil disimpan.');
                  }}
                  className={cn(
                    "w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0",
                    preferences.waReminders ? "bg-blue-600" : "bg-slate-300"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full bg-white transition-transform shadow-xs",
                      preferences.waReminders ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Setting 2: Update Status Teknisi */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <div className="space-y-0.5 max-w-md">
                  <h3 className="font-black text-xs sm:text-sm text-slate-900">Pemberitahuan Status Teknisi</h3>
                  <p className="text-xs text-slate-500">
                    Dapatkan kabar saat teknisi sudah ditugaskan, sedang meluncur ke lokasi, dan selesai bekerja.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreferences({ ...preferences, waTechnicianStatus: !preferences.waTechnicianStatus });
                    showSuccess('Pengaturan notifikasi teknisi berhasil disimpan.');
                  }}
                  className={cn(
                    "w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0",
                    preferences.waTechnicianStatus ? "bg-blue-600" : "bg-slate-300"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full bg-white transition-transform shadow-xs",
                      preferences.waTechnicianStatus ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Setting 3: E-Invoice Otomatis */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <div className="space-y-0.5 max-w-md">
                  <h3 className="font-black text-xs sm:text-sm text-slate-900">E-Invoice &amp; Kartu Garansi Digital</h3>
                  <p className="text-xs text-slate-500">
                    Otomatis kirimkan tautan unduh nota resmi dan sertifikat garansi servis ke WhatsApp Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreferences({ ...preferences, waInvoice: !preferences.waInvoice });
                    showSuccess('Pengaturan invoice digital berhasil disimpan.');
                  }}
                  className={cn(
                    "w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0",
                    preferences.waInvoice ? "bg-blue-600" : "bg-slate-300"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full bg-white transition-transform shadow-xs",
                      preferences.waInvoice ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ============================================================== */}
      {/* 6. TAB 4: KEUNTUNGAN MEMBER & GARANSI                          */}
      {/* ============================================================== */}
      {activeTab === 'benefits' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6 max-w-3xl"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Benefit 1: Diskon 10% */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50/80 border border-blue-200/80 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <h3 className="font-black text-base text-slate-900">Diskon 10% Otomatis</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Khusus akun member, setiap pemesanan cuci AC, perbaikan pipa, maupun pengisian freon mendapatkan potongan langsung 10% dari total jasa servis.
              </p>
              <div className="pt-2">
                <Badge variant="success" className="font-bold text-[10px]">TERAPLIKASI OTOMATIS</Badge>
              </div>
            </div>

            {/* Benefit 2: Garansi 30 Hari */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50/80 border border-emerald-200/80 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
              </div>
              <h3 className="font-black text-base text-slate-900">Garansi Purna Jual 30 Hari</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Jaminan garansi dingin 30 hari penuh. Jika AC bocor kembali atau tidak dingin, teknisi Nara AC akan melakukan kunjungan ulang gratis tanpa biaya inspeksi.
              </p>
              <div className="pt-2">
                <Badge variant="success" className="font-bold text-[10px]">PERLINDUNGAN PENUH</Badge>
              </div>
            </div>

            {/* Benefit 3: Prioritas Penugasan */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/80 border border-amber-200/80 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-black text-base text-slate-900">Prioritas Antrean Dispatcher</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Booking Anda langsung mendapatkan slot prioritas teknisi senior terdekat pada jam kerja sibuk tanpa antrean lama.
              </p>
              <div className="pt-2">
                <Badge variant="warning" className="font-bold text-[10px]">SLOT PRIORITAS</Badge>
              </div>
            </div>

            {/* Benefit 4: Database Telemetri AC */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-sky-50 to-blue-50/80 border border-sky-200/80 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-black text-base text-slate-900">Pencatatan Telemetri Unit AC</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Data tekanan freon (PSI), suhu hembusan dingin, arus ampere listrik, dan jenis kerusakan tersimpan rapi untuk histori masa pakai AC Anda.
              </p>
              <div className="pt-2">
                <Badge variant="info" className="font-bold text-[10px]">HISTORI DIGITAL</Badge>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
