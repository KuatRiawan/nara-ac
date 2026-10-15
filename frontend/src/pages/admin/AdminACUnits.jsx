import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Search, Plus, AirVent, User, History, ArrowUpRight, MessageSquare, MapPin, CheckCircle2, X, Wrench, RefreshCw } from 'lucide-react';
import { useToast } from '../../components/ui/toast';
import { getErrorMessage } from '../../utils/errors';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

export default function AdminACUnits() {
  const { error: showError, success: showSuccess } = useToast();
  const navigate = useNavigate();

  // State List
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPk, setSelectedPk] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Quick View Detail State
  const [quickViewUnit, setQuickViewUnit] = useState(null);
  const [loadingQuickView, setLoadingQuickView] = useState(false);

  // Add AC Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [customersList, setCustomersList] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [submittingAC, setSubmittingAC] = useState(false);
  const [addForm, setAddForm] = useState({
    customer_id: '',
    brand: 'Daikin',
    model: '',
    tipe: 'Split Wall',
    kapasitas_pk: '1',
    lokasi: '',
    nomor_seri: '',
    tanggal_pasang: '',
    catatan: ''
  });

  // Copied indicator
  const [copiedId, setCopiedId] = useState(null);

  // WhatsApp Helper
  const getWhatsAppLink = (rawPhone, customerName, unitName) => {
    if (!rawPhone) return null;
    let clean = String(rawPhone).replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    else if (clean.startsWith('8')) clean = '628' + clean.slice(1);
    const text = encodeURIComponent(`Halo Bpk/Ibu ${customerName || ''}, kami dari CV. Nara Teknindotama. Mengenai unit AC ${unitName || ''} Anda, apakah memerlukan jadwal cuci atau perawatan berkala?`);
    return `https://wa.me/${clean}?text=${text}`;
  };

  // Fetch Units
  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/ac-units?q=${encodeURIComponent(search.trim())}&limit=100`);
      const raw = res?.data?.data || res?.data || res;
      const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
      setUnits(list);
    } catch (err) {
      showError('Gagal memuat katalog unit AC: ' + getErrorMessage(err, 'Terjadi kesalahan'));
    } finally {
      setLoading(false);
    }
  }, [search, showError]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // Fetch customers for Add AC dropdown
  const loadCustomersForDropdown = async () => {
    if (customersList.length > 0) return;
    setLoadingCustomers(true);
    try {
      const res = await api.get('/admin/customers?limit=100');
      const raw = res?.data?.data || res?.data || res;
      const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
      setCustomersList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleOpenAddModal = () => {
    loadCustomersForDropdown();
    setAddForm({
      customer_id: '',
      brand: 'Daikin',
      model: '',
      tipe: 'Split Wall',
      kapasitas_pk: '1',
      lokasi: '',
      nomor_seri: '',
      tanggal_pasang: '',
      catatan: ''
    });
    setShowAddModal(true);
  };

  const handleSaveNewAC = async (e) => {
    e.preventDefault();
    if (!addForm.customer_id) {
      showError('Silakan pilih pemilik pelanggan untuk unit AC ini.');
      return;
    }
    if (!addForm.brand.trim()) {
      showError('Brand AC wajib diisi.');
      return;
    }
    if (!addForm.lokasi.trim()) {
      showError('Lokasi penempatan AC wajib diisi.');
      return;
    }

    setSubmittingAC(true);
    try {
      const payload = {
        customer_id: Number(addForm.customer_id),
        brand: addForm.brand.trim(),
        model: addForm.model.trim() || undefined,
        tipe: addForm.tipe || 'Split Wall',
        kapasitas_pk: addForm.kapasitas_pk || '1',
        lokasi: addForm.lokasi.trim(),
        nomor_seri: addForm.nomor_seri.trim() || undefined,
        tanggal_pasang: addForm.tanggal_pasang || undefined,
        catatan: addForm.catatan.trim() || undefined
      };

      await api.post('/admin/ac-units', payload);
      showSuccess('Unit AC berhasil didaftarkan ke katalog!');
      setShowAddModal(false);
      fetchUnits();
    } catch (err) {
      showError('Gagal menambahkan unit AC: ' + getErrorMessage(err, 'Terjadi kesalahan'));
    } finally {
      setSubmittingAC(false);
    }
  };

  // Quick view detail AC with history
  const viewUnit = async (id) => {
    setLoadingQuickView(true);
    try {
      const res = await api.get(`/admin/ac-units/${id}`);
      const data = res?.data?.data || res?.data || res;
      setQuickViewUnit(data);
    } catch (err) {
      showError('Gagal memuat detail AC: ' + getErrorMessage(err, 'Terjadi kesalahan'));
    } finally {
      setLoadingQuickView(false);
    }
  };

  // Filtered units
  const filteredUnits = useMemo(() => {
    return units.filter(u => {
      if (selectedType !== 'all') {
        const uType = (u.tipe || '').toLowerCase();
        if (!uType.includes(selectedType.toLowerCase())) return false;
      }
      if (selectedPk !== 'all') {
        const uPk = String(u.kapasitas_pk || '').trim();
        if (selectedPk === 'other') {
          if (['0.5', '1', '1.5', '2'].includes(uPk)) return false;
        } else {
          if (uPk !== selectedPk) return false;
        }
      }
      return true;
    });
  }, [units, selectedType, selectedPk]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedType, selectedPk]);

  // Paginated units
  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / itemsPerPage));
  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUnits.slice(start, start + itemsPerPage);
  }, [filteredUnits, currentPage, itemsPerPage]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = units.length;
    const active = units.filter(u => u.aktif !== false).length;
    const withHistory = units.filter(u => u.servis_terakhir).length;
    return { total, active, withHistory };
  }, [units]);

  // Copy text helper
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 relative min-w-0 font-sans">
      {/* HEADER: Standard Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Database & Unit AC Pelanggan</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Katalog master seluruh unit AC terpasang. Terintegrasi langsung dengan profil dan detail masing-masing pelanggan.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/customers')}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold h-10 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>Kelola di Pelanggan</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl h-10 px-4 cursor-pointer shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all hover:shadow active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Daftarkan Unit AC Baru</span>
          </Button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Unit Terdaftar</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{metrics.total} Unit</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Seluruh unit terpasang</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
            <AirVent className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-600 font-bold">Unit Status Aktif</p>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{metrics.active} Unit</h3>
            <p className="text-xs text-emerald-700/80 mt-1 font-medium">Dalam perawatan rutin</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-600 font-bold">Riwayat Servis Tercatat</p>
            <h3 className="text-2xl sm:text-3xl font-black text-indigo-600 mt-1">{metrics.withHistory} Unit</h3>
            <p className="text-xs text-indigo-700/80 mt-1 font-medium">Pernah diservis teknisi</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
            <History className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari brand, model, nama pelanggan, no. seri, atau lokasi kamar..."
              aria-label="Cari unit AC"
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

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipe:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 cursor-pointer"
              >
                <option value="all">Semua Tipe AC</option>
                <option value="Split Wall">Split Wall</option>
                <option value="Cassette">Cassette</option>
                <option value="Standing Floor">Standing Floor</option>
                <option value="Central">Central / Ducting</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kapasitas:</span>
              <select
                value={selectedPk}
                onChange={(e) => setSelectedPk(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 cursor-pointer"
              >
                <option value="all">Semua PK</option>
                <option value="0.5">0.5 PK</option>
                <option value="1">1 PK</option>
                <option value="1.5">1.5 PK</option>
                <option value="2">2 PK</option>
                <option value="other">Lainnya</option>
              </select>
            </div>

          </div>
        </div>
      </div>

      {/* UNIT AC GRID / LIST */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-slate-600 font-semibold text-sm">Memuat katalog seluruh unit AC...</p>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="p-16 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <AirVent className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Unit AC Tidak Ditemukan</h3>
            <p className="text-slate-500 text-sm">
              {search || selectedType !== 'all' || selectedPk !== 'all'
                ? 'Tidak ada unit AC yang cocok dengan kata kunci atau filter pencarian Anda.'
                : 'Belum ada unit AC yang terdaftar di database.'}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              {(search || selectedType !== 'all' || selectedPk !== 'all') ? (
                <Button 
                  onClick={() => { setSearch(''); setSelectedType('all'); setSelectedPk('all'); setCurrentPage(1); }}
                  variant="outline"
                  className="rounded-xl text-xs font-bold"
                >
                  Reset Filter
                </Button>
              ) : (
                <Button 
                  onClick={handleOpenAddModal}
                  className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah AC Pertama</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                  <th className="py-4 px-6">Unit AC (Spesifikasi)</th>
                  <th className="py-4 px-6">Pelanggan & Kontak</th>
                  <th className="py-4 px-6">Lokasi Pemasangan</th>
                  <th className="py-4 px-6">Servis Terakhir</th>
                  <th className="py-4 px-6 text-right">Aksi Terintegrasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedUnits.map((u) => {
                  const waLink = getWhatsAppLink(u.kontak_customer, u.nama_customer, `${u.brand} (${u.lokasi})`);
                  return (
                    <tr key={u.id} className="hover:bg-blue-50/30 transition-colors group">
                      {/* Spesifikasi Unit */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                            <AirVent className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              <span>{u.brand}</span>
                              {u.model && <span className="text-slate-500 font-medium text-xs">({u.model})</span>}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80 whitespace-nowrap">
                                {u.kapasitas_pk != null ? `${u.kapasitas_pk} PK` : '1 PK'}
                              </span>
                              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">• {u.tipe || 'Split Wall'}</span>
                            </div>
                            {u.nomor_seri && (
                              <div className="text-xs text-slate-500 font-mono mt-0.5">
                                SN: {u.nomor_seri}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Pelanggan */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{u.nama_customer}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono">{u.kontak_customer || '-'}</span>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors border border-emerald-200/50"
                                title="Chat WhatsApp Pelanggan"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WA</span>
<span className="sr-only"> (buka di tab baru)</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Lokasi Pemasangan */}
                      <td className="py-4 px-5">
                        <div className="flex items-start gap-1.5 text-xs text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <span className="max-w-xs">{u.lokasi || '-'}</span>
                        </div>
                        {u.tanggal_pasang && (
                          <div className="text-xs text-slate-500 mt-0.5 pl-5">
                            Pasang: {new Date(u.tanggal_pasang).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </td>

                      {/* Servis Terakhir */}
                      <td className="py-4 px-5">
                        {u.servis_terakhir ? (
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-slate-800">
                              {new Date(u.servis_terakhir).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-xs text-blue-600 font-medium">
                              {u.layanan_terakhir || 'Servis AC'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Belum ada catatan</span>
                        )}
                      </td>

                      {/* Aksi Terintegrasi */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => viewUnit(u.id)}
                            className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            title="Quick View Riwayat Servis AC"
                          >
                            <History className="w-3.5 h-3.5 text-slate-500" />
                            <span>Riwayat</span>
                          </button>

                          <button
                            onClick={() => navigate(`/admin/customers?viewId=${u.customer_id}&tab=units`)}
                            className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-blue-200/60 shadow-2xs"
                            title="Buka dan kelola unit ini di Detail Pelanggan"
                          >
                            <span>Kelola di Profil Pelanggan</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION TOOLBAR */}
          <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <div>
              Menampilkan <strong className="text-slate-900">{filteredUnits.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> - <strong className="text-slate-900">{Math.min(filteredUnits.length, currentPage * itemsPerPage)}</strong> dari <strong className="text-slate-900">{filteredUnits.length}</strong> unit AC
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition-all"
                >
                  Sebelumnya
                </button>
                <div className="px-3 py-1 font-bold text-slate-800">
                  Hal {currentPage} / {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition-all"
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </div>
        </>
      )}
      </div>

      {/* MODAL QUICK VIEW RIWAYAT UNIT AC */}
      {quickViewUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex justify-between items-start shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <AirVent className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    {quickViewUnit.brand} {quickViewUnit.model && `(${quickViewUnit.model})`}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5 font-medium">
                    {quickViewUnit.tipe || 'Split Wall'} • {quickViewUnit.kapasitas_pk || '1'} PK • {quickViewUnit.lokasi}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setQuickViewUnit(null)}
                className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Info Pelanggan & Lokasi */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block uppercase tracking-wider text-xs">Pemilik Pelanggan:</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{quickViewUnit.nama_customer}</span>
                  <span className="text-slate-600 font-mono mt-0.5 block">{quickViewUnit.kontak_customer}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase tracking-wider text-xs">Lokasi Ruangan:</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{quickViewUnit.lokasi}</span>
                  {quickViewUnit.nomor_seri && (
                    <span className="text-slate-500 font-mono mt-0.5 block">SN: {quickViewUnit.nomor_seri}</span>
                  )}
                </div>
              </div>

              {/* Riwayat Servis */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    <span>Catatan Servis Unit Ini ({quickViewUnit.history?.length || 0})</span>
                  </h4>
                </div>

                {(!quickViewUnit.history || quickViewUnit.history.length === 0) ? (
                  <div className="p-8 text-center text-slate-500 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-xs font-medium">
                    Belum ada riwayat pengerjaan servis untuk unit AC ini.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-slate-200 rounded-xl overflow-hidden">
                    {quickViewUnit.history.map((h) => (
                      <div key={h.id} className="p-4 bg-white hover:bg-slate-50/60 transition-colors text-xs space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">{h.nama_layanan || 'Service AC'}</span>
                            <span className="text-slate-500 mt-0.5 block">
                              {new Date(h.jadwal_mulai).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs font-bold uppercase",
                                h.status === 'done' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                h.status === 'cancelled' ? "bg-rose-50 text-rose-700 border-rose-200" :
                                "bg-blue-50 text-blue-700 border-blue-200"
                              )}
                            >
                              {h.status}
                            </Badge>
                            <span className="font-mono text-xs text-slate-500 block mt-1">{h.kode_booking}</span>
                          </div>
                        </div>

                        {h.teknisi && (
                          <div className="text-slate-600 font-medium flex items-center gap-1.5 pt-1 border-t border-slate-100">
                            <Wrench className="w-3.5 h-3.5 text-slate-500" />
                            <span>Teknisi Bertugas: <strong>{h.teknisi}</strong></span>
                          </div>
                        )}

                        {h.diagnosis && (
                          <div className="bg-blue-50/50 p-2.5 rounded-lg text-slate-700 text-xs">
                            <strong className="text-blue-900">Diagnosis Teknisi:</strong> {h.diagnosis}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <Button
                variant="outline"
                onClick={() => setQuickViewUnit(null)}
                className="text-xs font-bold rounded-xl"
              >
                Tutup
              </Button>
              <Button
                onClick={() => {
                  const custId = quickViewUnit.customer_id;
                  setQuickViewUnit(null);
                  navigate(`/admin/customers?viewId=${custId}&tab=units`);
                }}
                className="text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
              >
                <span>Buka Lengkap di Detail Pelanggan</span>
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH UNIT AC CEPAT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <AirVent className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-lg text-white">Daftarkan Unit AC Baru</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewAC} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label htmlFor="admin-a-c-units-f1" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pilih Pelanggan Pemilik <span className="text-rose-500">*</span>
                </label>
                {loadingCustomers ? (
                  <div className="text-xs text-slate-500 py-2">Memuat daftar pelanggan...</div>
                ) : (
                  <select
                    id="admin-a-c-units-f1"
                    required
                    value={addForm.customer_id}
                    onChange={(e) => setAddForm({ ...addForm, customer_id: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  >
                    <option value="">-- Pilih Pelanggan --</option>
                    {customersList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama} ({c.kontak || 'Tanpa Kontak'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="admin-a-c-units-f2" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Brand AC <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="admin-a-c-units-f2"
                    type="text"
                    required
                    placeholder="Contoh: Daikin, Panasonic"
                    value={addForm.brand}
                    onChange={(e) => setAddForm({ ...addForm, brand: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="admin-a-c-units-f3" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Model / Seri
                  </label>
                  <input
                    id="admin-a-c-units-f3"
                    type="text"
                    placeholder="Contoh: Inverter FTKC"
                    value={addForm.model}
                    onChange={(e) => setAddForm({ ...addForm, model: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="admin-a-c-units-f4" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tipe AC
                  </label>
                  <select
                    id="admin-a-c-units-f4"
                    value={addForm.tipe}
                    onChange={(e) => setAddForm({ ...addForm, tipe: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  >
                    <option value="Split Wall">Split Wall</option>
                    <option value="Cassette">Cassette</option>
                    <option value="Standing Floor">Standing Floor</option>
                    <option value="Central">Central / Ducting</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="admin-a-c-units-f5" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kapasitas (PK)
                  </label>
                  <select
                    id="admin-a-c-units-f5"
                    value={addForm.kapasitas_pk}
                    onChange={(e) => setAddForm({ ...addForm, kapasitas_pk: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  >
                    <option value="0.5">0.5 PK</option>
                    <option value="0.75">0.75 PK</option>
                    <option value="1">1 PK</option>
                    <option value="1.5">1.5 PK</option>
                    <option value="2">2 PK</option>
                    <option value="2.5">2.5 PK</option>
                    <option value="3">3 PK</option>
                    <option value="5">5 PK</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="admin-a-c-units-f6" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Lokasi Penempatan Ruangan <span className="text-rose-500">*</span>
                </label>
                <input
                  id="admin-a-c-units-f6"
                  type="text"
                  required
                  placeholder="Contoh: Kamar Utama Lt. 2, Ruang Tamu, Kantor Depan"
                  value={addForm.lokasi}
                  onChange={(e) => setAddForm({ ...addForm, lokasi: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="admin-a-c-units-f7" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nomor Seri (Barcode)
                  </label>
                  <input
                    id="admin-a-c-units-f7"
                    type="text"
                    placeholder="Opsional"
                    value={addForm.nomor_seri}
                    onChange={(e) => setAddForm({ ...addForm, nomor_seri: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="admin-a-c-units-f8" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tanggal Pasang
                  </label>
                  <input
                    id="admin-a-c-units-f8"
                    type="date"
                    value={addForm.tanggal_pasang}
                    onChange={(e) => setAddForm({ ...addForm, tanggal_pasang: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-a-c-units-f9" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Catatan Unit AC
                </label>
                <textarea
                  id="admin-a-c-units-f9"
                  rows={2}
                  placeholder="Keterangan tambahan (misal: pipa tanam, garansi servis hingga 2027)..."
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
                  disabled={submittingAC}
                  className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submittingAC ? 'Menyimpan...' : 'Simpan ke Katalog'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
