import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../AuthContext';
import api from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';
import { getErrorMessage } from '../../utils/errors';
import {
  User,
  ShieldCheck,
  Lock,
  KeyRound,
  CreditCard,
  Building2,
  Mail,
  Phone,
  MapPin,
  Clock,
  Calendar,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  LogOut,
  Plus,
  Trash2,
  Check,
  Shield,
  Sliders
} from 'lucide-react';
import { cn } from '../../lib/utils';

const DAY_OPTIONS = [
  { val: 1, label: 'Senin' },
  { val: 2, label: 'Selasa' },
  { val: 3, label: 'Rabu' },
  { val: 4, label: 'Kamis' },
  { val: 5, label: 'Jumat' },
  { val: 6, label: 'Sabtu' },
  { val: 0, label: 'Minggu' }
];

export default function AdminSettings() {
  const { user, updateUser, confirmLogout } = useContext(AuthContext);
  const { error: showError, success: showSuccess } = useToast();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'operations' | 'payment' | 'business'

  // ==========================================
  // 1. Profile State
  // ==========================================
  const [profileForm, setProfileForm] = useState(() => ({
    nama: user?.nama || '',
    email: user?.email || '',
    kontak: user?.kontak || ''
  }));
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync profileForm with fresh data from /auth/me
  useEffect(() => {
    let isMounted = true;
    api.get('/auth/me')
      .then(res => {
        const freshUser = res?.user || res?.data?.user || (res?.id ? res : null);
        if (isMounted && freshUser) {
          setProfileForm({
            nama: freshUser.nama || '',
            email: freshUser.email || '',
            kontak: freshUser.kontak || ''
          });
          updateUser(freshUser);
        }
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, [updateUser]);

  // ==========================================
  // 2. Security / Password State
  // ==========================================
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // ==========================================
  // 3. Operating Hours State
  // ==========================================
  const [opsForm, setOpsForm] = useState({
    open: '08:00',
    close: '17:00',
    days: [1, 2, 3, 4, 5, 6],
    slot_minutes: 60,
    min_lead_minutes: 60,
    max_advance_days: 60,
    reminder_hour: 8
  });
  const [loadingOps, setLoadingOps] = useState(false);
  const [savingOps, setSavingOps] = useState(false);

  // ==========================================
  // 4. Payment Accounts State
  // ==========================================
  const [paymentSettings, setPaymentSettings] = useState({
    accounts: [
      { id: '1', bank_name: 'BCA', account_number: '8720-9182-33', account_holder: 'CV NARA TEKNINDOTAMA' },
      { id: '2', bank_name: 'Mandiri', account_number: '137-00-9821-4451', account_holder: 'CV NARA TEKNINDOTAMA' }
    ],
    instruction_note: '*Tersedia juga opsi pembayaran tunai / QRIS langsung kepada teknisi setelah pekerjaan selesai di lokasi.'
  });
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // ==========================================
  // 5. Business Profile State
  // ==========================================
  const [businessForm, setBusinessForm] = useState({
    name: 'CV. NARA TEKNINDOTAMA',
    tagline: 'Spesialis Layanan Service, Maintenance & Instalasi AC Profesional',
    address: 'Jl. Raya Industri No. 45, Kawasan Sentra Bisnis',
    phone: '+62 812-3456-7890',
    hours: 'Senin - Sabtu: 08.00 - 17.00 WIB',
    guarantee: 'Garansi Pengerjaan Resmi 30 Hari'
  });
  const [loadingBusiness, setLoadingBusiness] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);

  // ==========================================
  // Fetch All Settings on Mount
  // ==========================================
  const fetchAllSettings = useCallback(async () => {
    setLoadingOps(true);
    setLoadingPayment(true);
    setLoadingBusiness(true);

    // 1. Operating Hours
    try {
      const resOps = await api.get('/settings/operating-hours');
      const opsData = (resOps && resOps.open) ? resOps : (resOps?.data?.open ? resOps.data : null);
      if (opsData) {
        setOpsForm({
          open: opsData.open || '08:00',
          close: opsData.close || '17:00',
          days: Array.isArray(opsData.days) ? opsData.days : [1, 2, 3, 4, 5, 6],
          slot_minutes: opsData.slot_minutes || 60,
          min_lead_minutes: opsData.min_lead_minutes !== undefined ? opsData.min_lead_minutes : 60,
          max_advance_days: opsData.max_advance_days !== undefined ? opsData.max_advance_days : 60,
          reminder_hour: opsData.reminder_hour !== undefined ? opsData.reminder_hour : 8
        });
      }
    } catch {
      // Keep defaults
    } finally {
      setLoadingOps(false);
    }

    // 2. Payment Accounts
    try {
      const resPay = await api.get('/settings/payment-accounts');
      const payData = (resPay && Array.isArray(resPay.accounts)) 
        ? resPay 
        : (resPay?.data?.accounts ? resPay.data : null);
      if (payData) {
        setPaymentSettings({
          accounts: Array.isArray(payData.accounts) && payData.accounts.length > 0
            ? payData.accounts
            : [{ id: '1', bank_name: 'BCA', account_number: '8720-9182-33', account_holder: 'CV NARA TEKNINDOTAMA' }],
          instruction_note: payData.instruction_note || ''
        });
      }
    } catch {
      // Keep defaults
    } finally {
      setLoadingPayment(false);
    }

    // 3. Business Profile
    try {
      const resBiz = await api.get('/settings/business-profile');
      const bizData = (resBiz && resBiz.name) ? resBiz : (resBiz?.data?.name ? resBiz.data : null);
      if (bizData) {
        setBusinessForm(bizData);
      }
    } catch {
      // Jika API gagal, biarkan form kosong — tidak perlu fallback ke localStorage (AUD-005)
    } finally {
      setLoadingBusiness(false);
    }
  }, []);

  useEffect(() => {
    fetchAllSettings();
  }, [fetchAllSettings]);

  // ==========================================
  // Handlers
  // ==========================================

  // 1. Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.nama.trim()) {
      showError('Nama lengkap wajib diisi.');
      return;
    }
    if (!profileForm.email.trim()) {
      showError('Alamat email wajib diisi.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.patch('/auth/profile', {
        nama: profileForm.nama.trim(),
        email: profileForm.email.trim(),
        kontak: profileForm.kontak?.trim() || null
      });

      const updatedUser = res?.user || res?.data?.user || (res?.id ? res : null);
      if (updatedUser) {
        updateUser(updatedUser);
      }
      showSuccess('Profil administrator berhasil diperbarui.');
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal memperbarui profil');
      showError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  // 2. Save Password
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.current_password) {
      showError('Masukkan kata sandi saat ini.');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      showError('Kata sandi baru minimal 8 karakter.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.patch('/auth/password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      showSuccess('Kata sandi akun administrator berhasil diperbarui.');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal memperbarui kata sandi');
      showError(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  // 3. Save Operating Hours
  const handleToggleDay = (dayVal) => {
    setOpsForm(prev => {
      const exists = prev.days.includes(dayVal);
      if (exists && prev.days.length <= 1) {
        showError('Minimal harus ada 1 hari operasional aktif.');
        return prev;
      }
      const newDays = exists 
        ? prev.days.filter(d => d !== dayVal)
        : [...prev.days, dayVal].sort();
      return { ...prev, days: newDays };
    });
  };

  const handleSaveOps = async (e) => {
    e.preventDefault();
    if (opsForm.open >= opsForm.close) {
      showError('Jam buka harus lebih awal dari jam tutup.');
      return;
    }
    if (!opsForm.days || opsForm.days.length === 0) {
      showError('Pilih minimal 1 hari operasional.');
      return;
    }

    setSavingOps(true);
    try {
      const payload = {
        open: opsForm.open,
        close: opsForm.close,
        days: opsForm.days,
        slot_minutes: Number(opsForm.slot_minutes),
        min_lead_minutes: Number(opsForm.min_lead_minutes),
        max_advance_days: Number(opsForm.max_advance_days),
        reminder_hour: Number(opsForm.reminder_hour)
      };
      await api.put('/settings/operating-hours', payload);
      showSuccess('Pengaturan jam & jadwal operasional servis berhasil disimpan.');
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal menyimpan jam operasional');
      showError(msg);
    } finally {
      setSavingOps(false);
    }
  };

  // 4. Payment Accounts
  const handleAddAccount = () => {
    setPaymentSettings(prev => ({
      ...prev,
      accounts: [
        ...prev.accounts,
        { id: Date.now().toString(), bank_name: '', account_number: '', account_holder: businessForm.name || 'CV NARA TEKNINDOTAMA' }
      ]
    }));
  };

  const handleRemoveAccount = (index) => {
    if (paymentSettings.accounts.length <= 1) {
      showError('Minimal harus ada 1 rekening aktif untuk invoice.');
      return;
    }
    setPaymentSettings(prev => ({
      ...prev,
      accounts: prev.accounts.filter((_, idx) => idx !== index)
    }));
  };

  const handleAccountChange = (index, field, value) => {
    setPaymentSettings(prev => {
      const next = [...prev.accounts];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, accounts: next };
    });
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    for (let i = 0; i < paymentSettings.accounts.length; i++) {
      const acc = paymentSettings.accounts[i];
      if (!acc.bank_name.trim() || !acc.account_number.trim() || !acc.account_holder.trim()) {
        showError(`Harap lengkapi semua data pada rekening #${i + 1}.`);
        return;
      }
    }

    setSavingPayment(true);
    try {
      const payload = {
        accounts: paymentSettings.accounts.map(a => ({
          id: a.id || Date.now().toString(),
          bank_name: a.bank_name.trim(),
          account_number: a.account_number.trim(),
          account_holder: a.account_holder.trim()
        })),
        instruction_note: paymentSettings.instruction_note?.trim() || ''
      };

      await api.put('/settings/payment-accounts', payload);
      
      // Data sudah tersimpan di backend via API — tidak perlu sync ke localStorage (AUD-005)
      showSuccess('Rekening pembayaran berhasil disimpan dan tersinkronisasi ke seluruh E-Invoice.');
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal menyimpan rekening pembayaran');
      showError(msg);
    } finally {
      setSavingPayment(false);
    }
  };

  // 5. Business Profile
  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    if (!businessForm.name.trim()) {
      showError('Nama usaha/perusahaan wajib diisi.');
      return;
    }

    setSavingBusiness(true);
    try {
      const payload = {
        name: businessForm.name.trim(),
        tagline: businessForm.tagline?.trim() || '',
        address: businessForm.address?.trim() || '',
        phone: businessForm.phone?.trim() || '',
        hours: businessForm.hours?.trim() || '',
        guarantee: businessForm.guarantee?.trim() || ''
      };

      await api.put('/settings/business-profile', payload);

      // Data sudah tersimpan di backend — tidak perlu cache di localStorage (AUD-005)
      showSuccess('Profil badan usaha & operasional berhasil disimpan secara permanen.');
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal menyimpan informasi usaha');
      showError(msg);
    } finally {
      setSavingBusiness(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 relative min-w-0">
      
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Pengaturan & Profil Admin
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola data akun admin, keamanan sandi, jam operasional servis, rekening pembayaran, dan identitas bisnis.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={confirmLogout}
            variant="outline"
            className="rounded-xl border-rose-200 bg-rose-50/40 text-rose-700 hover:bg-rose-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Keluar Sesi</span>
          </Button>
        </div>
      </div>

      {/* 4 Clean Top Status Cards (Consistent UI standard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Hak Akses */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hak Akses Sistem</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 capitalize">
              {user?.role === 'admin' ? 'Administrator Utama' : user?.role || 'Admin'}
            </p>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Akses penuh seluruh modul & kontrol teknisi
            </p>
          </div>
        </div>

        {/* Card 2: Keamanan Sesi */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Status Keamanan</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-emerald-700">
              Terenkripsi & Aktif
            </p>
            <p className="text-xs font-medium text-emerald-600/80 mt-1">
              Proteksi hash bcrypt & session token 8 jam
            </p>
          </div>
        </div>

        {/* Card 3: Jam Operasional Servis */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Jam Operasional</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-amber-700">
              {opsForm.open} – {opsForm.close} WIB
            </p>
            <p className="text-xs font-medium text-amber-600/80 mt-1">
              {opsForm.days.length} Hari kerja aktif per minggu
            </p>
          </div>
        </div>

        {/* Card 4: Rekening Invoice */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Rekening Resmi</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-blue-700">
              {paymentSettings.accounts.length} Rekening Aktif
            </p>
            <p className="text-xs font-medium text-blue-600/80 mt-1">
              Otomatis terhubung pada E-Invoice
            </p>
          </div>
        </div>

      </div>

      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0",
            activeTab === 'profile'
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <User className="w-4 h-4 text-blue-600" />
          <span>Profil Administrator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0",
            activeTab === 'security'
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>Kata Sandi & Keamanan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('operations')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0",
            activeTab === 'operations'
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <Sliders className="w-4 h-4 text-amber-600" />
          <span>Jam & Jadwal Operasional</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payment')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0",
            activeTab === 'payment'
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <CreditCard className="w-4 h-4 text-indigo-600" />
          <span>Rekening Kas Invoice</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('business')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0",
            activeTab === 'business'
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <Building2 className="w-4 h-4 text-purple-600" />
          <span>Informasi Bisnis & Workshop</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PROFIL ADMINISTRATOR                                   */}
      {/* ============================================================== */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Avatar & Identity Card */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-black shadow-md shadow-blue-600/20 border-4 border-white">
              {profileForm.nama ? profileForm.nama.charAt(0).toUpperCase() : (user?.nama ? user.nama.charAt(0).toUpperCase() : 'A')}
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">
                {profileForm.nama || user?.nama || 'Administrator'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {profileForm.email || user?.email || 'admin@nara-ac.local'}
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Super Administrator</span>
              </div>
            </div>

            <div className="w-full pt-4 border-t border-slate-100 text-xs space-y-2.5 text-left">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">User ID:</span>
                <span className="font-mono font-bold text-slate-700">#{user?.id || '1'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Status Akun:</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Aktif Terverifikasi
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Akses Peran:</span>
                <span className="font-bold text-slate-800 capitalize">{user?.role || 'admin'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Kontak WhatsApp:</span>
                <span className="font-mono font-bold text-slate-800">{profileForm.kontak || '-'}</span>
              </div>
            </div>
          </div>

          {/* Right: Profile Edit Form */}
          <div className="lg:col-span-2 p-6 sm:p-7 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Edit Informasi Akun Administrator
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbarui identitas profil nama, email resmi, dan nomor telepon WhatsApp admin.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="admin-settings-f1" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nama Lengkap Administrator
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="admin-settings-f1"
                    value={profileForm.nama}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, nama: e.target.value }))}
                    placeholder="Masukkan nama lengkap Anda..."
                    className="pl-10 h-11 rounded-xl border-slate-200 text-xs focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="admin-settings-f2" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Alamat Email Resmi
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      id="admin-settings-f2"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="admin@nara-ac.local"
                      className="pl-10 h-11 rounded-xl border-slate-200 text-xs focus:ring-blue-500"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Digunakan untuk login sistem administrator.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="admin-settings-f3" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nomor WhatsApp / Kontak
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      id="admin-settings-f3"
                      type="tel"
                      value={profileForm.kontak}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, kontak: e.target.value }))}
                      placeholder="Contoh: 081234567890"
                      className="pl-10 h-11 rounded-xl border-slate-200 text-xs font-mono focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Untuk komunikasi dispatch teknisi dan sistem pengingat.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-11 px-6 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {savingProfile ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Simpan Perubahan Profil</span>
                </Button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: KEAMANAN & KATA SANDI                                  */}
      {/* ============================================================== */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Security Guidance */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit border border-emerald-100">
              <Shield className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Keamanan & Proteksi Akun
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Kata sandi Anda dienkripsi secara satu arah dengan algoritma bcrypt tingkat industri. Ganti kata sandi secara berkala untuk menjaga integritas data pelanggan dan keuangan.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2 text-slate-600">
              <p className="font-bold text-slate-800">Ketentuan Kata Sandi:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-500">
                <li>Minimal 8 karakter kombinasi</li>
                <li>Gunakan huruf besar, huruf kecil & angka</li>
                <li>Hindari tanggal lahir atau pola keyboard berulang</li>
              </ul>
            </div>
          </div>

          {/* Right: Password Change Form */}
          <div className="lg:col-span-2 p-6 sm:p-7 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Perbarui Kata Sandi Akun
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pastikan Anda mengingat kata sandi baru untuk login di sesi berikutnya.
              </p>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label htmlFor="admin-settings-f4" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Kata Sandi Saat Ini
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="admin-settings-f4"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                    placeholder="Masukkan kata sandi lama Anda..."
                    className="pl-10 pr-10 h-11 rounded-xl border-slate-200 text-xs focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label htmlFor="admin-settings-f5" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="admin-settings-f5"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                    placeholder="Minimal 8 karakter baru..."
                    className="pl-10 pr-10 h-11 rounded-xl border-slate-200 text-xs focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="admin-settings-f6" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="admin-settings-f6"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                    placeholder="Ulangi kata sandi baru..."
                    className="pl-10 pr-10 h-11 rounded-xl border-slate-200 text-xs focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={savingPassword}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 px-6 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {savingPassword ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Perbarui Kata Sandi</span>
                </Button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: JAM & JADWAL OPERASIONAL                                */}
      {/* ============================================================== */}
      {activeTab === 'operations' && (
        <div className="p-6 sm:p-7 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Konfigurasi Jam & Jadwal Operasional Servis</span>
                <span className="text-xs bg-amber-50 text-amber-700 font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                  Engine Slot Otomatis
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Parameter ini secara langsung menentukan jam buka/tutup booking pelanggan, durasi slot kunjungan, dan pengingat H-1.
              </p>
            </div>

          </div>

          <form onSubmit={handleSaveOps} className="space-y-6">
            {/* Working Hours & Slots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label htmlFor="admin-settings-f7" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Jam Buka Operasional (WIB)</span>
                </label>
                <Input
                  id="admin-settings-f7"
                  type="time"
                  value={opsForm.open}
                  onChange={(e) => setOpsForm(prev => ({ ...prev, open: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200 text-xs font-mono font-bold"
                  required
                />
                <p className="text-xs text-slate-500">Jadwal kunjungan teknisi paling awal.</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-settings-f8" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Jam Tutup Operasional (WIB)</span>
                </label>
                <Input
                  id="admin-settings-f8"
                  type="time"
                  value={opsForm.close}
                  onChange={(e) => setOpsForm(prev => ({ ...prev, close: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200 text-xs font-mono font-bold"
                  required
                />
                <p className="text-xs text-slate-500">Batas akhir pekerjaan harian selesai.</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-settings-f9" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Durasi Interval Slot</span>
                </label>
                <select
                  id="admin-settings-f9"
                  value={opsForm.slot_minutes}
                  onChange={(e) => setOpsForm(prev => ({ ...prev, slot_minutes: Number(e.target.value) }))}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={30}>30 Menit (Interval Pendek)</option>
                  <option value={60}>60 Menit (Standard 1 Jam)</option>
                  <option value={90}>90 Menit (1.5 Jam)</option>
                  <option value={120}>120 Menit (2 Jam)</option>
                </select>
                <p className="text-xs text-slate-500">Satuan pembagian grid waktu kalender.</p>
              </div>
            </div>

            {/* Days Selection */}
            <div role="group" aria-labelledby="settings-days-label" className="space-y-2.5">
              <label id="settings-days-label" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Hari Layanan Aktif Mingguan</span>
              </label>
              <div className="flex flex-wrap gap-2.5">
                {DAY_OPTIONS.map(d => {
                  const active = opsForm.days.includes(d.val);
                  return (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => handleToggleDay(d.val)}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer",
                        active
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {active && <Check className="w-3.5 h-3.5 text-white" />}
                      <span>{d.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">
                Hari yang tidak dipilih akan dinonaktifkan dari pilihan kalender booking pelanggan.
              </p>
            </div>

            {/* Advance Limits & Reminder */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label htmlFor="admin-settings-f10" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Lead Time Minimal Booking
                </label>
                <div className="relative">
                  <Input
                    id="admin-settings-f10"
                    type="number"
                    min={0}
                    max={1440}
                    value={opsForm.min_lead_minutes}
                    onChange={(e) => setOpsForm(prev => ({ ...prev, min_lead_minutes: Number(e.target.value) }))}
                    className="h-11 rounded-xl border-slate-200 text-xs font-mono font-bold pr-14"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    Menit
                  </span>
                </div>
                <p className="text-xs text-slate-500">Jarak minimal order sebelum kedatangan teknisi.</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-settings-f11" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Maksimal Booking Ke Depan
                </label>
                <div className="relative">
                  <Input
                    id="admin-settings-f11"
                    type="number"
                    min={1}
                    max={365}
                    value={opsForm.max_advance_days}
                    onChange={(e) => setOpsForm(prev => ({ ...prev, max_advance_days: Number(e.target.value) }))}
                    className="h-11 rounded-xl border-slate-200 text-xs font-mono font-bold pr-14"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    Hari
                  </span>
                </div>
                <p className="text-xs text-slate-500">Batas reservasi terjauh di kalender.</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-settings-f12" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Jam Pengingat Jadwal (H-1)
                </label>
                <div className="relative">
                  <Input
                    id="admin-settings-f12"
                    type="number"
                    min={0}
                    max={23}
                    value={opsForm.reminder_hour}
                    onChange={(e) => setOpsForm(prev => ({ ...prev, reminder_hour: Number(e.target.value) }))}
                    className="h-11 rounded-xl border-slate-200 text-xs font-mono font-bold pr-14"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    :00 WIB
                  </span>
                </div>
                <p className="text-xs text-slate-500">Scheduler cron mengirim notifikasi pengingat otomatis.</p>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button
                type="submit"
                disabled={savingOps}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-11 px-7 flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {savingOps ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Simpan Jam & Jadwal Operasional</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: REKENING & KAS PEMBAYARAN                              */}
      {/* ============================================================== */}
      {activeTab === 'payment' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Daftar Rekening Bank Resmi Pembayaran</span>
                <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                  Sinkron E-Invoice & Kwitansi
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekening yang Anda daftarkan di sini otomatis tercetak pada faktur tagihan pelanggan.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleAddAccount}
              variant="outline"
              className="rounded-xl border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Rekening Baru</span>
            </Button>
          </div>

          <form onSubmit={handleSavePayment} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {paymentSettings.accounts.map((acc, idx) => (
                <div 
                  key={acc.id || idx}
                  className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                      <span>Rekening #{idx + 1}</span>
                    </span>

                    {paymentSettings.accounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAccount(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Hapus rekening ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Bank Card Visual Preview */}
                  <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 text-white space-y-3 shadow-md relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-28 h-28 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-black tracking-widest text-blue-300 uppercase">
                        {acc.bank_name || 'NAMA BANK'}
                      </span>
                      <span className="text-[9px] font-black tracking-wider px-2 py-0.5 rounded bg-white/10 text-slate-200 uppercase border border-white/10">
                        OFFICIAL VA / TRF
                      </span>
                    </div>

                    <div className="py-1">
                      <p className="font-mono text-lg font-black tracking-wider text-white">
                        {acc.account_number || '•••• •••• ••••'}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-700/60">
                      <span>ATAS NAMA:</span>
                      <span className="font-bold text-white uppercase truncate max-w-[200px]">
                        {acc.account_holder || businessForm.name || 'CV NARA TEKNINDOTAMA'}
                      </span>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <label htmlFor="admin-settings-f13" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Nama Bank / Institusi
                      </label>
                      <Input
                        id="admin-settings-f13"
                        value={acc.bank_name}
                        onChange={(e) => handleAccountChange(idx, 'bank_name', e.target.value)}
                        placeholder="Contoh: BCA / Mandiri / BRI / BNI"
                        className="h-10 rounded-xl border-slate-200 text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="admin-settings-f14" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Nomor Rekening Resmi
                      </label>
                      <Input
                        id="admin-settings-f14"
                        value={acc.account_number}
                        onChange={(e) => handleAccountChange(idx, 'account_number', e.target.value)}
                        placeholder="Contoh: 8720-9182-33"
                        className="h-10 rounded-xl border-slate-200 text-xs font-mono font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="admin-settings-f15" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Nama Pemilik Rekening
                      </label>
                      <Input
                        id="admin-settings-f15"
                        value={acc.account_holder}
                        onChange={(e) => handleAccountChange(idx, 'account_holder', e.target.value)}
                        placeholder="Contoh: CV NARA TEKNINDOTAMA"
                        className="h-10 rounded-xl border-slate-200 text-xs font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Instruction Note */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <label htmlFor="admin-settings-f16" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Catatan Petunjuk Pembayaran Invoice (Dicetak Pada Lembar Invoice)
              </label>
              <Input
                id="admin-settings-f16"
                value={paymentSettings.instruction_note}
                onChange={(e) => setPaymentSettings(prev => ({ ...prev, instruction_note: e.target.value }))}
                placeholder="Contoh: Pembayaran tunai/QRIS dapat diberikan langsung ke teknisi setelah servis selesai..."
                className="h-11 rounded-xl border-slate-200 text-xs"
              />
              <p className="text-xs text-slate-500">
                Pesan ini otomatis dicetak di bagian bawah lembar faktur resmi pelanggan.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={savingPayment}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-11 px-7 flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {savingPayment ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Simpan Rekening Pembayaran Resmi</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: INFORMASI BISNIS & WORKSHOP                             */}
      {/* ============================================================== */}
      {activeTab === 'business' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Business Summary Preview */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl w-fit border border-purple-100">
              <Building2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                {businessForm.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {businessForm.tagline}
              </p>
            </div>

            <div className="w-full pt-4 border-t border-slate-100 text-xs space-y-3 text-slate-600">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed">{businessForm.address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="font-mono text-xs font-bold text-slate-800">{businessForm.phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="text-xs font-medium">{businessForm.hours}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-700">{businessForm.guarantee}</span>
              </div>
            </div>
          </div>

          {/* Right: Business Settings Form */}
          <div className="lg:col-span-2 p-6 sm:p-7 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Identitas Badan Usaha & Operasional
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Parameter kop resmi perusahaan, alamat workshop, hotline layanan, dan syarat garansi servis.
              </p>
            </div>

            <form onSubmit={handleSaveBusiness} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="admin-settings-f17" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nama Usaha / Perusahaan
                  </label>
                  <Input
                    id="admin-settings-f17"
                    value={businessForm.name}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Contoh: CV. NARA TEKNINDOTAMA"
                    className="h-11 rounded-xl border-slate-200 text-xs font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="admin-settings-f18" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Hotline Servis / WhatsApp
                  </label>
                  <Input
                    id="admin-settings-f18"
                    value={businessForm.phone}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Contoh: +62 812-3456-7890"
                    className="h-11 rounded-xl border-slate-200 text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-settings-f19" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Slogan / Tagline Layanan
                </label>
                <Input
                  id="admin-settings-f19"
                  value={businessForm.tagline}
                  onChange={(e) => setBusinessForm(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="Contoh: Solusi Pendingin Ruangan Cerdas & Terpercaya"
                  className="h-11 rounded-xl border-slate-200 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-settings-f20" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Alamat Kantor & Workshop
                </label>
                <Input
                  id="admin-settings-f20"
                  value={businessForm.address}
                  onChange={(e) => setBusinessForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Contoh: Jl. Raya Industri No. 45, Kawasan Sentra Bisnis"
                  className="h-11 rounded-xl border-slate-200 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="admin-settings-f21" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Teks Jam Operasional Servis
                  </label>
                  <Input
                    id="admin-settings-f21"
                    value={businessForm.hours}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, hours: e.target.value }))}
                    placeholder="Contoh: Senin - Sabtu: 08.00 - 17.00 WIB"
                    className="h-11 rounded-xl border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="admin-settings-f22" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Ketentuan Garansi Layanan
                  </label>
                  <Input
                    id="admin-settings-f22"
                    value={businessForm.guarantee}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, guarantee: e.target.value }))}
                    placeholder="Contoh: Garansi Service 30 Hari Kerja"
                    className="h-11 rounded-xl border-slate-200 text-xs font-bold text-emerald-700"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={savingBusiness}
                  className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-11 px-6 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {savingBusiness ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Simpan Informasi Bisnis</span>
                </Button>
              </div>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
