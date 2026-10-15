import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api';
import { Search, Plus, Wrench, Calendar, Activity, Trash2, Phone, MessageSquare, Mail, Star, CheckCircle2, Clock, X, RefreshCw, UserCheck, UserX, Edit2, Award } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/ui/toast';
import { getErrorMessage } from '../../utils/errors';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

export default function AdminTechnicians() {
  const { error: showError, success: showSuccess } = useToast();
  const location = useLocation();

  // List State
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all | active | inactive

  // Detail Modal State
  const [selectedTech, setSelectedTech] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule'); // schedule | jobs | performance

  // Availability Form State inside Detail
  const [availForm, setAvailForm] = useState({ 
    tanggal: new Date().toISOString().split('T')[0], 
    status: 'available', 
    catatan: '' 
  });
  const [submittingAvail, setSubmittingAvail] = useState(false);

  // Add Technician Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ 
    nama: '', 
    kontak: '', 
    email: '', 
    password: '', 
    catatan: '', 
    telegram_chat_id: '' 
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Confirmation Modal State (replaces window.confirm for destructive actions)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false, onConfirm: null }));

  // Edit Technician Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ 
    id: null, 
    nama: '', 
    kontak: '', 
    catatan: '', 
    telegram_chat_id: '', 
    aktif: true 
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Close modals on route change
  useEffect(() => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedTech(null);
  }, [location.pathname]);

  // WhatsApp Link Helper
  const getWhatsAppLink = (rawPhone, techName) => {
    if (!rawPhone) return null;
    let clean = String(rawPhone).replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    else if (clean.startsWith('8')) clean = '628' + clean.slice(1);
    const text = encodeURIComponent(`Halo Mas ${techName || 'Teknisi'}, kami dari Admin NARA AC. Mohon update terkait jadwal dan status penugasan servis.`);
    return `https://wa.me/${clean}?text=${text}`;
  };

  // Fetch Technicians List
  const fetchTechnicians = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/technicians?q=${encodeURIComponent(search.trim())}&limit=100`);
      let list = [];
      const raw = res?.data?.data || res?.data || res;
      if (Array.isArray(raw)) list = raw;
      else if (raw?.rows && Array.isArray(raw.rows)) list = raw.rows;
      else if (raw?.data && Array.isArray(raw.data)) list = raw.data;
      setTechnicians(list);
    } catch (err) {
      showError('Gagal memuat daftar teknisi: ' + getErrorMessage(err, 'Terjadi kesalahan'));
    } finally {
      setLoading(false);
    }
  }, [search, showError]);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  // Fetch Full Detail & Workload
  const viewTechnician = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/admin/technicians/${id}`);
      const data = res?.data?.data || res?.data || res;
      setSelectedTech(data);
      setActiveTab('schedule');
      setAvailForm({
        tanggal: new Date().toISOString().split('T')[0],
        status: 'available',
        catatan: ''
      });
    } catch (err) {
      showError('Gagal memuat detail teknisi: ' + getErrorMessage(err, 'Terjadi kesalahan'));
    } finally {
      setLoadingDetail(false);
    }
  };

  // Refresh current technician detail
  const refreshCurrentTech = async () => {
    if (!selectedTech?.id) return;
    try {
      const res = await api.get(`/admin/technicians/${selectedTech.id}`);
      const data = res?.data?.data || res?.data || res;
      setSelectedTech(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Add Technician
  const handleAddTech = async (e) => {
    e.preventDefault();
    if (!addForm.nama.trim() || !addForm.kontak.trim()) {
      showError('Nama teknisi dan nomor kontak wajib diisi.');
      return;
    }

    setSubmittingAdd(true);
    try {
      const payload = {
        nama: addForm.nama.trim(),
        kontak: addForm.kontak.trim(),
        catatan: addForm.catatan.trim() || undefined,
        telegram_chat_id: addForm.telegram_chat_id.trim() || undefined
      };
      if (addForm.email.trim()) payload.email = addForm.email.trim();
      if (addForm.password.trim()) payload.password = addForm.password.trim();

      await api.post('/technicians', payload);
      showSuccess(`Teknisi "${addForm.nama}" berhasil ditambahkan.`);
      setShowAddModal(false);
      setAddForm({ nama: '', kontak: '', email: '', password: '', catatan: '', telegram_chat_id: '' });
      fetchTechnicians();
    } catch (err) {
      showError('Gagal menambahkan teknisi: ' + getErrorMessage(err, 'Terjadi kesalahan'));
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (t) => {
    setEditForm({
      id: t.id,
      nama: t.nama || '',
      kontak: t.kontak || '',
      catatan: t.catatan || '',
      telegram_chat_id: t.telegram_chat_id || '',
      aktif: t.aktif !== false
    });
    setShowEditModal(true);
  };

  // Handle Edit Technician
  const handleEditTech = async (e) => {
    e.preventDefault();
    setSubmittingEdit(true);
    try {
      const payload = {
        nama: editForm.nama.trim(),
        kontak: editForm.kontak.trim(),
        catatan: editForm.catatan.trim() || null,
        telegram_chat_id: editForm.telegram_chat_id.trim() || null,
        aktif: editForm.aktif
      };

      await api.patch(`/technicians/${editForm.id}`, payload);
      showSuccess(`Data teknisi "${editForm.nama}" berhasil diperbarui.`);
      setShowEditModal(false);
      fetchTechnicians();
      if (selectedTech?.id === editForm.id) {
        refreshCurrentTech();
      }
    } catch (err) {
      showError('Gagal memperbarui data teknisi: ' + getErrorMessage(err, 'Terjadi kesalahan'));
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Handle Toggle Active/Inactive Quick
  const handleToggleAktif = (t) => {
    const newStatus = !t.aktif;
    const confirmMsg = newStatus 
      ? `Aktifkan kembali teknisi "${t.nama}" agar dapat ditugaskan pada pesanan?` 
      : `Nonaktifkan teknisi "${t.nama}"? Pastikan tidak ada pesanan aktif yang sedang ditangani.`;

    setConfirmModal({
      isOpen: true,
      title: newStatus ? 'Aktifkan Teknisi' : 'Nonaktifkan Teknisi',
      message: confirmMsg,
      onConfirm: async () => {
        try {
          await api.patch(`/technicians/${t.id}`, { aktif: newStatus });
          showSuccess(`Status teknisi "${t.nama}" berhasil diubah menjadi ${newStatus ? 'Aktif' : 'Non-Aktif'}.`);
          fetchTechnicians();
          if (selectedTech?.id === t.id) {
            refreshCurrentTech();
          }
        } catch (err) {
          showError('Gagal mengubah status: ' + getErrorMessage(err, 'Terjadi kesalahan'));
        } finally {
          closeConfirmModal();
        }
      }
    });
  };

  // Handle Delete Technician
  const handleDeleteTech = (t) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Teknisi',
      message: `Hapus permanen teknisi "${t.nama}"? Semua relasi pesanan lama akan dialihkan dan akun login akan dihapus.`,
      onConfirm: async () => {
        try {
          await api.delete(`/technicians/${t.id}`);
          showSuccess(`Teknisi "${t.nama}" berhasil dihapus.`);
          if (selectedTech?.id === t.id) {
            setSelectedTech(null);
          }
          fetchTechnicians();
        } catch (err) {
          showError('Gagal menghapus teknisi: ' + getErrorMessage(err, 'Terjadi kesalahan'));
        } finally {
          closeConfirmModal();
        }
      }
    });
  };

  // Handle Save Availability
  const handleSetAvailability = async (e) => {
    e.preventDefault();
    if (!availForm.tanggal) {
      showError('Silakan pilih tanggal.');
      return;
    }

    setSubmittingAvail(true);
    try {
      await api.post(`/admin/technicians/${selectedTech.id}/availability`, {
        tanggal: availForm.tanggal,
        status: availForm.status,
        catatan: availForm.catatan.trim() || undefined
      });
      showSuccess(`Ketersediaan tanggal ${availForm.tanggal} berhasil diatur ke [${availForm.status.toUpperCase()}].`);
      refreshCurrentTech();
      setAvailForm(prev => ({ ...prev, catatan: '' }));
    } catch (err) {
      showError('Gagal menyimpan ketersediaan: ' + getErrorMessage(err, 'Terjadi kesalahan'));
    } finally {
      setSubmittingAvail(false);
    }
  };

  // Filtered List
  const filteredTechnicians = useMemo(() => {
    return technicians.filter(t => {
      if (filterStatus === 'active') return t.aktif !== false;
      if (filterStatus === 'inactive') return t.aktif === false;
      return true;
    });
  }, [technicians, filterStatus]);

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const total = technicians.length;
    const active = technicians.filter(t => t.aktif !== false).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [technicians]);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 relative min-w-0 font-sans">
      {/* HEADER: Standard Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Manajemen Teknisi Lapangan</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola jadwal shift harian, beban kerja pekerjaan servis, catatan ketersediaan libur/izin, serta evaluasi rating kinerja.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            onClick={() => {
              setAddForm({ nama: '', kontak: '', email: '', password: '', catatan: '', telegram_chat_id: '' });
              setShowAddModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl h-10 px-4 cursor-pointer shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all hover:shadow active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Teknisi Baru</span>
          </Button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Tim Teknisi</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{metrics.total} Orang</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Terdaftar di sistem NARA AC</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-600 font-bold">Teknisi Aktif (Siap Tugas)</p>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{metrics.active} Orang</h3>
            <p className="text-xs text-emerald-700/80 mt-1 font-medium">Bisa menerima dispatch pesanan</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Status Non-Aktif / Off</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-500 mt-1">{metrics.inactive} Orang</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Tidak ditugaskan sementara</p>
          </div>
          <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center font-bold">
            <UserX className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari nama teknisi atau nomor telepon..."
              aria-label="Cari teknisi"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 text-xs font-semibold"
              >
                Hapus
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
              <button
                onClick={() => setFilterStatus('all')}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  filterStatus === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Semua ({metrics.total})
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  filterStatus === 'active' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Aktif ({metrics.active})
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  filterStatus === 'inactive' ? "bg-slate-800 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Non-Aktif ({metrics.inactive})
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* TECHNICIANS GRID */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-16 text-center space-y-3 shadow-sm">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-slate-600 font-semibold text-sm">Memuat daftar teknisi...</p>
          </div>
        ) : filteredTechnicians.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-16 text-center space-y-4 shadow-sm max-w-md mx-auto">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <Wrench className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Teknisi Tidak Ditemukan</h3>
            <p className="text-slate-500 text-sm">
              {search || filterStatus !== 'all' 
                ? 'Tidak ada teknisi yang sesuai dengan kriteria pencarian Anda.' 
                : 'Belum ada teknisi yang terdaftar di sistem.'}
            </p>
            <div className="pt-2">
              <Button 
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Teknisi Baru</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTechnicians.map((t) => {
              const waLink = getWhatsAppLink(t.kontak, t.nama);
              const isAktif = t.aktif !== false;

              return (
                <div 
                  key={t.id} 
                  className={cn(
                    "bg-white rounded-3xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden group",
                    isAktif ? "border-slate-200/80 hover:border-blue-300" : "border-slate-200 bg-slate-50/40 opacity-80"
                  )}
                >
                  {/* Card Header & Profile */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 transition-transform group-hover:scale-105",
                          isAktif 
                            ? "bg-blue-50 text-blue-700 border border-blue-200/80" 
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        )}>
                          {t.nama ? t.nama.slice(0, 2).toUpperCase() : 'TK'}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                            <span>{t.nama}</span>
                          </h3>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">ID: #{t.id}</p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                          isAktif 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-slate-100 text-slate-600 border-slate-300"
                        )}
                      >
                        {isAktif ? 'Aktif' : 'Non-Aktif'}
                      </Badge>
                    </div>

                    {/* Contact & Info */}
                    <div className="space-y-2 pt-1 border-t border-slate-100 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-2 font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono">{t.kontak || '-'}</span>
                        </span>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>WA</span>
<span className="sr-only"> (buka di tab baru)</span>
                          </a>
                        )}
                      </div>

                      {t.catatan && (
                        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg line-clamp-2">
                          {t.catatan}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
                      title="Edit Data Teknisi"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleAktif(t)}
                      className={cn(
                        "text-xs font-bold px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer",
                        isAktif 
                          ? "text-rose-600 hover:bg-rose-50" 
                          : "text-emerald-600 hover:bg-emerald-50"
                      )}
                      title={isAktif ? "Nonaktifkan Teknisi" : "Aktifkan Teknisi"}
                    >
                      {isAktif ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>

                    <Button
                      onClick={() => viewTechnician(t.id)}
                      className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm ml-auto cursor-pointer"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Jadwal & Kinerja</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 360° DETAIL TEKNISI */}
      {selectedTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center font-black text-xl text-white shadow-inner">
                  {selectedTech.nama ? selectedTech.nama.slice(0, 2).toUpperCase() : 'TK'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white">{selectedTech.nama}</h2>
                    <Badge 
                      variant="outline"
                      className={cn(
                        "text-xs font-bold uppercase",
                        selectedTech.aktif ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40" : "bg-rose-500/20 text-rose-300 border-rose-400/40"
                      )}
                    >
                      {selectedTech.aktif ? 'Aktif' : 'Non-Aktif'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200 mt-1 font-medium">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-blue-300" />
                      <span>{selectedTech.kontak}</span>
                    </span>
                    {selectedTech.akun?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-blue-300" />
                        <span>{selectedTech.akun.email}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => openEditModal(selectedTech)}
                  className="p-2 text-blue-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  title="Edit Data Teknisi"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteTech(selectedTech)}
                  className="p-2 text-rose-300 hover:text-rose-100 rounded-xl hover:bg-rose-500/20 transition-colors cursor-pointer"
                  title="Hapus Teknisi"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setSelectedTech(null)}
                  className="p-2 text-blue-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="bg-blue-50/60 border-b border-blue-100 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center shrink-0">
              <div className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-2xs">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-bold block">Total Servis</span>
                <span className="text-lg font-black text-slate-900 block mt-0.5">{selectedTech.performa?.total || 0}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-2xs">
                <span className="text-xs uppercase tracking-wider text-emerald-600 font-bold block">Selesai</span>
                <span className="text-lg font-black text-emerald-600 block mt-0.5">{selectedTech.performa?.selesai || 0}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-2xs">
                <span className="text-xs uppercase tracking-wider text-amber-600 font-bold block">Tertunda</span>
                <span className="text-lg font-black text-amber-600 block mt-0.5">{selectedTech.performa?.tertunda || 0}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-2xs">
                <span className="text-xs uppercase tracking-wider text-blue-600 font-bold block">Rating Kepuasan</span>
                <span className="text-lg font-black text-blue-600 block mt-0.5 flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400 inline" />
                  <span>{selectedTech.rating?.rata ? Number(selectedTech.rating.rata).toFixed(1) : '5.0'}</span>
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 shrink-0 gap-6">
              <button
                onClick={() => setActiveTab('schedule')}
                className={cn(
                  "py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
                  activeTab === 'schedule' 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                <Calendar className="w-4 h-4" />
                <span>Ketersediaan & Jadwal Harian</span>
              </button>

              <button
                onClick={() => setActiveTab('jobs')}
                className={cn(
                  "py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
                  activeTab === 'jobs' 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                <Activity className="w-4 h-4" />
                <span>Pekerjaan Hari Ini & Berjalan</span>
                {(selectedTech.today_jobs?.length || 0) > 0 && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    {selectedTech.today_jobs.length}
                  </Badge>
                )}
              </button>

              <button
                onClick={() => setActiveTab('performance')}
                className={cn(
                  "py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
                  activeTab === 'performance' 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                <Award className="w-4 h-4" />
                <span>Evaluasi Kinerja & Riwayat</span>
              </button>
            </div>

            {/* Modal Body with Active Tab */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* TAB 1: KETERSEDIAAN & JADWAL */}
              {activeTab === 'schedule' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Form Atur Ketersediaan */}
                  <div className="md:col-span-5 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/90 space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span>Atur Ketersediaan Tanggal</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Tentukan status teknisi (Tersedia, Sibuk, Libur/Cuti) untuk tanggal tertentu.
                      </p>
                    </div>

                    <form onSubmit={handleSetAvailability} className="space-y-3.5">
                      <div>
                        <label htmlFor="admin-technicians-f1" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Pilih Tanggal <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="admin-technicians-f1" 
                          type="date"
                          required
                          value={availForm.tanggal}
                          onChange={(e) => setAvailForm({ ...availForm, tanggal: e.target.value })}
                          className="w-full text-sm px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                        />
                      </div>

                      <div>
                        <label htmlFor="admin-technicians-f1" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Status Ketersediaan <span className="text-rose-500">*</span>
                        </label>
                        <select
                          id="admin-technicians-f1"
                          value={availForm.status}
                          onChange={(e) => setAvailForm({ ...availForm, status: e.target.value })}
                          className="w-full text-sm px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 cursor-pointer"
                        >
                          <option value="available">🟢 Available (Siap Bertugas)</option>
                          <option value="busy">🟡 Busy (Penuh / Sedang Padat)</option>
                          <option value="off">🔴 Off (Libur / Izin / Cuti)</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="admin-technicians-f2" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Catatan / Alasan
                        </label>
                        <input
                          id="admin-technicians-f2" 
                          type="text"
                          placeholder="Misal: Cuti keluarga, Servis luar kota..."
                          value={availForm.catatan}
                          onChange={(e) => setAvailForm({ ...availForm, catatan: e.target.value })}
                          className="w-full text-sm px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={submittingAvail}
                        className="w-full text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5 mt-2 cursor-pointer"
                      >
                        {submittingAvail ? 'Menyimpan...' : 'Simpan Status Tanggal'}
                      </Button>
                    </form>
                  </div>

                  {/* Kalender / List Ketersediaan 30 Hari */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>Ketersediaan 30 Hari Mendatang</span>
                      </h4>
                      <span className="text-xs text-slate-500 font-medium">
                        Default: Tersedia
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[360px] overflow-y-auto divide-y divide-gray-100 bg-white">
                      {(!selectedTech.availability || selectedTech.availability.length === 0) ? (
                        <div className="p-8 text-center text-slate-500 text-xs font-medium bg-slate-50/50">
                          Belum ada tanggal ketersediaan khusus yang diatur. Teknisi dianggap siap bertugas setiap hari kerja normal.
                        </div>
                      ) : (
                        selectedTech.availability.map((a, idx) => (
                          <div key={idx} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                            <div>
                              <div className="font-bold text-slate-900 text-xs">
                                {new Date(a.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                              </div>
                              {a.catatan && (
                                <div className="text-xs text-slate-500 mt-0.5">{a.catatan}</div>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-bold uppercase",
                                a.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                a.status === 'busy' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-rose-50 text-rose-700 border-rose-200'
                              )}
                            >
                              {a.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TUGAS HARI INI & BERJALAN */}
              {activeTab === 'jobs' && (
                <div className="space-y-6">
                  {/* Tugas Hari Ini */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>Jadwal Tugas Hari Ini ({selectedTech.today_jobs?.length || 0})</span>
                    </h4>

                    {(!selectedTech.today_jobs || selectedTech.today_jobs.length === 0) ? (
                      <div className="p-8 text-center text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs font-medium">
                        Tidak ada jadwal servis yang ditugaskan untuk hari ini.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        {selectedTech.today_jobs.map((job) => (
                          <div key={job.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-slate-50/50 transition-colors">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{job.nama_layanan || 'Servis AC'}</span>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs font-bold uppercase",
                                    job.status === 'on process' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                    job.status === 'done' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    "bg-amber-50 text-amber-700 border-amber-200"
                                  )}
                                >
                                  {job.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-slate-600 mt-1">
                                Pelanggan: <strong>{job.customer}</strong> • Jam: {new Date(job.jadwal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                              </div>
                            </div>
                            <span className="font-mono text-xs text-slate-500">{job.kode_booking}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tugas Sedang Berjalan (On Process / Delayed) */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-600" />
                      <span>Tugas Aktif Berjalan / Tertunda ({selectedTech.pekerjaan_berjalan?.length || 0})</span>
                    </h4>

                    {(!selectedTech.pekerjaan_berjalan || selectedTech.pekerjaan_berjalan.length === 0) ? (
                      <div className="p-8 text-center text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs font-medium">
                        Tidak ada pekerjaan yang sedang berlangsung atau tertunda saat ini.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        {selectedTech.pekerjaan_berjalan.map((job) => (
                          <div key={job.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-slate-50/50 transition-colors">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{job.customer}</span>
                                <Badge variant="outline" className="text-xs font-bold uppercase bg-amber-50 text-amber-700 border-amber-200">
                                  {job.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Jadwal: {new Date(job.jadwal_mulai).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                              </div>
                            </div>
                            <span className="font-mono text-xs text-slate-500">{job.kode_booking}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: EVALUASI KINERJA & RIWAYAT SELESAI */}
              {activeTab === 'performance' && (
                <div className="space-y-6">
                  {/* Performance Bento */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                      <span className="text-xs uppercase tracking-wider text-slate-500 font-bold block">Rata-Rata Waktu Servis</span>
                      <span className="text-xl font-black text-slate-900 mt-1 block">
                        {selectedTech.performa?.rata_durasi_menit ? `${selectedTech.performa.rata_durasi_menit} Menit` : 'Standar (60 mnt)'}
                      </span>
                      <span className="text-xs text-slate-500 mt-1 block">Durasi mulai hingga selesai</span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                      <span className="text-xs uppercase tracking-wider text-slate-500 font-bold block">Tingkat Keberhasilan</span>
                      <span className="text-xl font-black text-emerald-600 mt-1 block">
                        {selectedTech.performa?.total 
                          ? `${Math.round(((selectedTech.performa.selesai || 0) / selectedTech.performa.total) * 100)}%` 
                          : '100%'}
                      </span>
                      <span className="text-xs text-emerald-700 mt-1 block">Rasio pesanan selesai tepat</span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                      <span className="text-xs uppercase tracking-wider text-slate-500 font-bold block">Ulasan Konsumen</span>
                      <span className="text-xl font-black text-amber-600 mt-1 block">
                        {selectedTech.rating?.jumlah || 0} Review
                      </span>
                      <span className="text-xs text-amber-700 mt-1 block">Rating rata-rata ⭐ {selectedTech.rating?.rata || '5.0'}</span>
                    </div>
                  </div>

                  {/* Riwayat 10 Pekerjaan Terakhir Selesai */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>10 Servis Terakhir yang Telah Selesai</span>
                    </h4>

                    {(!selectedTech.pekerjaan_selesai || selectedTech.pekerjaan_selesai.length === 0) ? (
                      <div className="p-8 text-center text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs font-medium">
                        Belum ada riwayat servis yang diselesaikan oleh teknisi ini.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        {selectedTech.pekerjaan_selesai.map((job) => (
                          <div key={job.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-slate-50/50 transition-colors">
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{job.nama_layanan || 'Servis AC'}</div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                Pelanggan: <strong>{job.customer}</strong> • {new Date(job.jadwal_mulai).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                            <span className="font-mono text-xs text-slate-500">{job.kode_booking}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <Button
                variant="outline"
                onClick={() => setSelectedTech(null)}
                className="text-xs font-bold rounded-xl"
              >
                Tutup
              </Button>
              <div className="flex items-center gap-2">
                {getWhatsAppLink(selectedTech.kontak, selectedTech.nama) && (
                  <a
                    href={getWhatsAppLink(selectedTech.kontak, selectedTech.nama)}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat WhatsApp Teknisi</span>
<span className="sr-only"> (buka di tab baru)</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH TEKNISI */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Wrench className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-lg text-white">Tambah Teknisi Baru</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTech} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label htmlFor="admin-technicians-f3" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  id="admin-technicians-f3" 
                  type="text"
                  required
                  placeholder="Contoh: Rian Pratama"
                  value={addForm.nama}
                  onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="admin-technicians-f4" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nomor HP / WhatsApp <span className="text-rose-500">*</span>
                </label>
                <input
                  id="admin-technicians-f4" 
                  type="text"
                  required
                  placeholder="Contoh: 081234567890"
                  value={addForm.kontak}
                  onChange={(e) => setAddForm({ ...addForm, kontak: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 font-mono"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">
                  Akun Login Aplikasi Teknisi (Opsional)
                </p>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="admin-technicians-f5" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Login
                    </label>
                    <input
                      id="admin-technicians-f5" 
                      type="email"
                      placeholder="teknisi@nara.com"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                    />
                  </div>

                  <div>
                    <label htmlFor="admin-technicians-f6" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password Login
                    </label>
                    <input
                      id="admin-technicians-f6" 
                      type="password"
                      placeholder="Minimal 8 karakter"
                      minLength={8}
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="admin-technicians-f7" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Catatan / Spesialisasi Keahlian
                </label>
                <textarea
                  id="admin-technicians-f7" 
                  rows={2}
                  placeholder="Contoh: Spesialis AC Cassette & VRV, pengalaman 5 tahun..."
                  value={addForm.catatan}
                  onChange={(e) => setAddForm({ ...addForm, catatan: e.target.value })}
                  className="w-full text-sm px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submittingAdd}
                  className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submittingAdd ? 'Menyimpan...' : 'Simpan Teknisi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA TEKNISI */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Edit2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-lg text-white">Edit Profil Teknisi</h3>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTech} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label htmlFor="admin-technicians-f8" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  id="admin-technicians-f8" 
                  type="text"
                  required
                  value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="admin-technicians-f9" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nomor HP / WhatsApp <span className="text-rose-500">*</span>
                </label>
                <input
                  id="admin-technicians-f9" 
                  type="text"
                  required
                  value={editForm.kontak}
                  onChange={(e) => setEditForm({ ...editForm, kontak: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 font-mono"
                />
              </div>

              <div>
                <label htmlFor="admin-technicians-f2" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status Operasional
                </label>
                <select
                  id="admin-technicians-f2"
                  value={editForm.aktif ? 'true' : 'false'}
                  onChange={(e) => setEditForm({ ...editForm, aktif: e.target.value === 'true' })}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 cursor-pointer"
                >
                  <option value="true">🟢 Aktif (Siap Menerima Tugas Servis)</option>
                  <option value="false">🔴 Non-Aktif (Istirahat / Tidak Ditugaskan)</option>
                </select>
              </div>

              <div>
                <label htmlFor="admin-technicians-f10" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Catatan / Spesialisasi
                </label>
                <textarea
                  id="admin-technicians-f10" 
                  rows={2}
                  value={editForm.catatan}
                  onChange={(e) => setEditForm({ ...editForm, catatan: e.target.value })}
                  className="w-full text-sm px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submittingEdit}
                  className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submittingEdit ? 'Menyimpan...' : 'Perbarui Profil'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal (replaces window.confirm) */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Ya, Lanjutkan"
        cancelText="Batal"
        variant="danger"
        onConfirm={confirmModal.onConfirm || (() => {})}
        onCancel={closeConfirmModal}
      />
    </div>
  );
}
