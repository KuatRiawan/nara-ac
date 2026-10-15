import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';
import { 
  Package, 
  Search, 
  Plus, 
  ArrowRightLeft, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  X, 
  Layers, 
  Droplet, 
  Zap, 
  Wrench, 
  Check, 
  Loader2, 
  SlidersHorizontal,
  ChevronRight,
  TrendingDown,
  TrendingUp
} from 'lucide-react';

export default function AdminInventory() {
  const { error: showError, success: showSuccess } = useToast();
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | ok | warning
  const [categoryFilter, setCategoryFilter] = useState('all'); // all | freon | pipa | kabel | komponen
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Modals state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Movements state
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Forms state
  const [adjustForm, setAdjustForm] = useState({ jenis: 'in', jumlah: '', catatan: '' });
  const [addForm, setAddForm] = useState({
    nama: '',
    kategori: 'freon',
    stok: '',
    satuan: 'kg',
    min_stok: '5'
  });
  const [submitting, setSubmitting] = useState(false);
  const [adding, setAdding] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAdjustModal(false);
        setShowAddModal(false);
        setShowHistoryModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close modals when route changes
  useEffect(() => {
    setShowAdjustModal(false);
    setShowAddModal(false);
    setShowHistoryModal(false);
    setSelectedItem(null);
  }, [location.pathname]);

  // Fetch inventory data
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/inventory');
      const raw = res?.data?.data || res?.data || res;
      const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
      setItems(list);
    } catch (err) {
      showError('Gagal memuat data inventori: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Fetch movements log
  const fetchMovements = useCallback(async (itemId = null) => {
    setLoadingMovements(true);
    try {
      const params = itemId ? { item_id: itemId, limit: 50 } : { limit: 50 };
      const res = await api.get('/admin/inventory/movements', { params });
      const raw = res?.data?.data || res?.data || res;
      const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
      setMovements(list);
    } catch (err) {
      showError('Gagal memuat riwayat mutasi: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setLoadingMovements(false);
    }
  }, [showError]);

  // KPIs Calculation
  const kpis = useMemo(() => {
    const totalCount = items.length;
    let okCount = 0;
    let lowCount = 0;
    let outCount = 0;
    const catSet = new Set();

    items.forEach(it => {
      if (it.kategori) catSet.add(it.kategori);
      const s = it.status_stok || (Number(it.stok) <= 0 ? 'out' : Number(it.stok) <= Number(it.min_stok) ? 'low' : 'ok');
      if (s === 'ok') okCount++;
      else if (s === 'low') lowCount++;
      else if (s === 'out') outCount++;
    });

    return {
      totalCount,
      okCount,
      lowCount,
      outCount,
      warningCount: lowCount + outCount,
      categoryCount: catSet.size || 4
    };
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const q = search.toLowerCase();
      const matchSearch = 
        it.nama.toLowerCase().includes(q) ||
        it.kategori.toLowerCase().includes(q) ||
        String(it.id).includes(q);

      if (!matchSearch) return false;

      // Status filter
      const s = it.status_stok || (Number(it.stok) <= 0 ? 'out' : Number(it.stok) <= Number(it.min_stok) ? 'low' : 'ok');
      if (statusFilter === 'ok' && s !== 'ok') return false;
      if (statusFilter === 'warning' && s === 'ok') return false;

      // Category filter
      if (categoryFilter !== 'all' && it.kategori !== categoryFilter) return false;

      return true;
    });
  }, [items, search, statusFilter, categoryFilter]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, categoryFilter]);

  // Paginated items
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  // Helper icon by category
  const getCategoryIcon = (kat) => {
    switch (kat) {
      case 'freon':
        return <Droplet className="w-3.5 h-3.5 text-sky-600" />;
      case 'kabel':
        return <Zap className="w-3.5 h-3.5 text-amber-600" />;
      case 'komponen':
        return <Wrench className="w-3.5 h-3.5 text-purple-600" />;
      case 'pipa':
      default:
        return <Package className="w-3.5 h-3.5 text-teal-600" />;
    }
  };

  // Helper badge color by category
  const getCategoryBadgeClass = (kat) => {
    switch (kat) {
      case 'freon':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'kabel':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'komponen':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'pipa':
      default:
        return 'bg-teal-50 text-teal-700 border-teal-200';
    }
  };

  // Open adjust modal
  const openAdjust = (item) => {
    setSelectedItem(item);
    setAdjustForm({ jenis: 'in', jumlah: '', catatan: '' });
    setShowAdjustModal(true);
  };

  // Open history modal
  const openHistory = (item = null) => {
    setSelectedItem(item);
    setShowHistoryModal(true);
    fetchMovements(item ? item.id : null);
  };

  // Handle adjust stock submit
  const handleAdjust = async (e) => {
    e.preventDefault();
    const qty = parseFloat(adjustForm.jumlah);
    if (isNaN(qty) || qty <= 0) {
      showError('Jumlah penyesuaian harus lebih dari 0.');
      return;
    }
    if (!adjustForm.catatan?.trim() || adjustForm.catatan.trim().length < 3) {
      showError('Catatan alasan mutasi wajib diisi minimal 3 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/admin/inventory/${selectedItem.id}/adjust`, {
        jenis: adjustForm.jenis,
        jumlah: qty,
        catatan: adjustForm.catatan.trim()
      });
      showSuccess(`Stok ${selectedItem.nama} berhasil diperbarui.`);
      setShowAdjustModal(false);
      fetchInventory();
    } catch (err) {
      showError(err.response?.data?.error?.message || err.message || 'Gagal mengubah stok.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle add item submit
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.nama?.trim()) {
      showError('Nama barang wajib diisi.');
      return;
    }
    const initStok = parseFloat(addForm.stok);
    const minStok = parseFloat(addForm.min_stok);
    if (isNaN(initStok) || initStok < 0) {
      showError('Stok awal harus berupa angka valid (minimal 0).');
      return;
    }
    if (isNaN(minStok) || minStok < 0) {
      showError('Batas stok minimal harus berupa angka valid (minimal 0).');
      return;
    }

    setAdding(true);
    try {
      await api.post('/admin/inventory', {
        nama: addForm.nama.trim(),
        kategori: addForm.kategori,
        stok: initStok,
        satuan: addForm.satuan.trim(),
        min_stok: minStok
      });
      showSuccess(`Barang "${addForm.nama}" berhasil ditambahkan ke inventaris.`);
      setShowAddModal(false);
      setAddForm({ nama: '', kategori: 'freon', stok: '', satuan: 'kg', min_stok: '5' });
      fetchInventory();
    } catch (err) {
      showError(err.response?.data?.error?.message || err.message || 'Gagal menambahkan barang.');
    } finally {
      setAdding(false);
    }
  };

  // Projected stock preview for adjust modal
  const previewStock = useMemo(() => {
    if (!selectedItem) return null;
    const current = Number(selectedItem.stok);
    const val = parseFloat(adjustForm.jumlah);
    if (isNaN(val)) return current;
    if (adjustForm.jenis === 'in') return current + val;
    if (adjustForm.jenis === 'out') return Math.max(0, current - val);
    if (adjustForm.jenis === 'adjustment') return val;
    return current;
  }, [selectedItem, adjustForm]);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 relative min-w-0">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Inventaris Logistik & Sparepart
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitoring stok suku cadang, freon teknisi, log mutasi keluar-masuk, dan peringatan batas minimum.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => openHistory(null)}
            variant="outline"
            className="rounded-xl border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Riwayat Mutasi</span>
          </Button>

          <Button
            onClick={() => {
              setAddForm({ nama: '', kategori: 'freon', stok: '', satuan: 'kg', min_stok: '5' });
              setShowAddModal(true);
            }}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Barang Baru</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards (Clean White Style consistent with other pages) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Item Barang */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Item Terdaftar</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              {kpis.totalCount} <span className="text-xs font-semibold text-slate-500">Jenis</span>
            </p>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Suku cadang & bahan operasional
            </p>
          </div>
        </div>

        {/* Stok Aman */}
        <div className="p-5 rounded-3xl bg-white border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Stok Normal & Aman</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-700">
              {kpis.okCount} <span className="text-xs font-semibold text-emerald-600/70">Item</span>
            </p>
            <p className="text-xs font-medium text-emerald-600/80 mt-1">
              Di atas batas minimum restock
            </p>
          </div>
        </div>

        {/* Stok Menipis / Perlu Restock */}
        <div className="p-5 rounded-3xl bg-white border border-amber-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Perlu Restock</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-700">
              {kpis.warningCount} <span className="text-xs font-semibold text-amber-600/70">Item</span>
            </p>
            <p className="text-xs font-medium text-amber-600/80 mt-1">
              {kpis.outCount > 0 ? `${kpis.outCount} item habis total` : 'Mendekati batas minimum'}
            </p>
          </div>
        </div>

        {/* Ragam Kategori */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Kategori Logistik</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              {kpis.categoryCount} <span className="text-xs font-semibold text-slate-500">Kategori</span>
            </p>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Freon, Pipa, Kabel & Komponen
            </p>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            placeholder="Cari nama barang atau kategori..."
            aria-label="Cari inventaris"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
          {/* Status Filter Buttons */}
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'border-slate-200 text-slate-600'}`}
          >
            Semua ({kpis.totalCount})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'ok' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('ok')}
            className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${statusFilter === 'ok' ? 'bg-emerald-600 text-white' : 'border-slate-200 text-slate-600'}`}
          >
            Stok Aman ({kpis.okCount})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'warning' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('warning')}
            className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${statusFilter === 'warning' ? 'bg-amber-600 text-white' : 'border-slate-200 text-slate-600'}`}
          >
            Perlu Restock ({kpis.warningCount})
          </Button>

          {/* Category Dropdown */}
          <div className="border-l border-slate-200 pl-2 ml-1">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Semua Kategori</option>
              <option value="freon">Freon</option>
              <option value="pipa">Pipa</option>
              <option value="kabel">Kabel</option>
              <option value="komponen">Komponen</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-5">Kode & Barang</th>
                <th className="py-3.5 px-5">Kategori</th>
                <th className="py-3.5 px-5">Stok Saat Ini</th>
                <th className="py-3.5 px-5">Batas Minimum</th>
                <th className="py-3.5 px-5">Konsumsi (30 Hari)</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Memuat data inventori...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    Tidak ada barang inventori yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const s = item.status_stok || (Number(item.stok) <= 0 ? 'out' : Number(item.stok) <= Number(item.min_stok) ? 'low' : 'ok');
                  const isLow = s === 'low';
                  const isOut = s === 'out';
                  const isOk = s === 'ok';
                  const code = item.kode_barang || `INV-${String(item.id).padStart(3, '0')}`;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0">
                            {getCategoryIcon(item.kategori)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs sm:text-sm">{item.nama}</p>
                            <span className="font-mono text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 inline-block mt-0.5">
                              {code}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${getCategoryBadgeClass(item.kategori)}`}>
                          {item.kategori}
                        </span>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-1.5">
                            <span className={`text-base font-black font-mono ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                              {Number(item.stok).toLocaleString('id-ID')}
                            </span>
                            <span className="text-xs font-bold text-slate-500">{item.satuan}</span>
                          </div>

                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-2.5 h-2.5" /> Stok Habis
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="w-2.5 h-2.5" /> Perlu Restock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Normal
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <p className="font-mono font-bold text-slate-700">
                          {Number(item.min_stok).toLocaleString('id-ID')} <span className="text-xs text-slate-500 font-sans">{item.satuan}</span>
                        </p>
                        <p className="text-xs text-slate-500">Batas restock</p>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <span className="font-mono font-bold">
                            {Number(item.pemakaian_30_hari || 0).toLocaleString('id-ID')}
                          </span>
                          <span className="text-xs text-slate-500">{item.satuan}</span>
                        </div>
                        <p className="text-xs text-slate-500">Dipakai teknisi</p>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openHistory(item)}
                            className="rounded-xl text-xs font-bold h-8 px-2.5 border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="Lihat riwayat mutasi barang ini"
                          >
                            <History className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openAdjust(item)}
                            className="rounded-xl text-xs font-bold h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Sesuaikan</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION TOOLBAR */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div>
            Menampilkan <strong className="text-slate-900">{filteredItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> - <strong className="text-slate-900">{Math.min(filteredItems.length, currentPage * itemsPerPage)}</strong> dari <strong className="text-slate-900">{filteredItems.length}</strong> barang inventori
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
      </div>

      {/* ============================================================== */}
      {/* 1. MODAL PENYESUAIAN STOK (ADJUST STOCK)                      */}
      {/* ============================================================== */}
      {showAdjustModal && selectedItem && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdjustModal(false); }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex justify-center items-start p-3 sm:p-6 lg:p-8 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-8 animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/30 text-sky-400 rounded-xl border border-blue-500/30">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    Penyesuaian Stok Barang
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Update mutasi stok masuk, keluar, atau stock opname aktual
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAdjust} className="p-5 sm:p-6 space-y-4">
              
              {/* Item Info Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Barang Dipilih</span>
                  <p className="font-black text-sm text-slate-900">{selectedItem.nama}</p>
                  <span className="text-xs text-slate-500 capitalize">Kategori: {selectedItem.kategori}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Stok Saat Ini</span>
                  <p className="font-mono font-black text-lg text-blue-600">
                    {Number(selectedItem.stok).toLocaleString('id-ID')} <span className="text-xs text-slate-500 font-sans">{selectedItem.satuan}</span>
                  </p>
                </div>
              </div>

              {/* Jenis Penyesuaian */}
              <div>
                <label id="inventory-adjust-type-label" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Jenis Penyesuaian *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, jenis: 'in' })}
                    className={`p-2.5 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      adjustForm.jenis === 'in' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Masuk (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, jenis: 'out' })}
                    className={`p-2.5 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      adjustForm.jenis === 'out' 
                        ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                    <span>Keluar (-)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, jenis: 'adjustment' })}
                    className={`p-2.5 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      adjustForm.jenis === 'adjustment' 
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                    <span>Opname (=)</span>
                  </button>
                </div>
              </div>

              {/* Jumlah Penyesuaian */}
              <div>
                <label htmlFor="admin-inventory-f1" className="block text-xs font-bold text-slate-700 mb-1">
                  Jumlah {adjustForm.jenis === 'adjustment' ? 'Stok Fisik Baru' : 'Unit'} ({selectedItem.satuan}) *
                </label>
                <div className="relative">
                  <Input
                    id="admin-inventory-f1"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Contoh: 10"
                    value={adjustForm.jumlah}
                    onChange={(e) => setAdjustForm({ ...adjustForm, jumlah: e.target.value })}
                    className="h-10 text-xs font-mono font-bold rounded-xl pr-14 bg-white border-slate-200"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    {selectedItem.satuan}
                  </span>
                </div>
              </div>

              {/* Preview Perubahan Stok */}
              {adjustForm.jumlah && (
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs flex items-center justify-between text-blue-900 font-semibold">
                  <span>Proyeksi Stok Akhir:</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500">{Number(selectedItem.stok)}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-blue-700 font-bold text-sm">
                      {previewStock} {selectedItem.satuan}
                    </span>
                  </div>
                </div>
              )}

              {/* Alasan / Catatan Mutasi */}
              <div>
                <label htmlFor="admin-inventory-f2" className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Alasan Mutasi *
                </label>
                <textarea
                  id="admin-inventory-f2"
                  rows={2}
                  placeholder="Contoh: Pembelian supplier baru, barang retur, selisih stock opname bulanan..."
                  value={adjustForm.catatan}
                  onChange={(e) => setAdjustForm({ ...adjustForm, catatan: e.target.value })}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 resize-none"
                  required
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdjustModal(false)}
                  disabled={submitting}
                  className="rounded-xl text-xs font-bold text-slate-600 border-slate-200 hover:bg-slate-50 h-9 px-4 cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-9 px-5 flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MODAL TAMBAH BARANG BARU (ADD ITEM)                        */}
      {/* ============================================================== */}
      {showAddModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex justify-center items-start p-3 sm:p-6 lg:p-8 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-8 animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/30 text-sky-400 rounded-xl border border-blue-500/30">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    Tambah Barang Inventaris Baru
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Daftarkan suku cadang atau bahan logistik ke master inventaris
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAdd} className="p-5 sm:p-6 space-y-4">
              
              <div>
                <label htmlFor="admin-inventory-f3" className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Barang *
                </label>
                <Input
                  id="admin-inventory-f3"
                  placeholder="Contoh: Freon R410A Murni, Pipa AC 1/4 + 3/8..."
                  value={addForm.nama}
                  onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })}
                  className="h-10 text-xs font-semibold rounded-xl bg-white border-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="admin-inventory-f4" className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Logistik *
                  </label>
                  <select
                    id="admin-inventory-f4"
                    value={addForm.kategori}
                    onChange={(e) => setAddForm({ ...addForm, kategori: e.target.value })}
                    className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    <option value="freon">Freon</option>
                    <option value="pipa">Pipa AC</option>
                    <option value="kabel">Kabel Listrik</option>
                    <option value="komponen">Komponen & Sparepart</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="admin-inventory-f5" className="block text-xs font-bold text-slate-700 mb-1">
                    Satuan *
                  </label>
                  <Input
                    id="admin-inventory-f5"
                    placeholder="Contoh: kg, meter, roll, pcs, set"
                    value={addForm.satuan}
                    onChange={(e) => setAddForm({ ...addForm, satuan: e.target.value })}
                    className="h-10 text-xs font-semibold rounded-xl bg-white border-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="admin-inventory-f6" className="block text-xs font-bold text-slate-700 mb-1">
                    Stok Awal Masuk *
                  </label>
                  <Input
                    id="admin-inventory-f6"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Contoh: 50"
                    value={addForm.stok}
                    onChange={(e) => setAddForm({ ...addForm, stok: e.target.value })}
                    className="h-10 text-xs font-mono font-bold rounded-xl bg-white border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="admin-inventory-f7" className="block text-xs font-bold text-slate-700 mb-1">
                    Batas Minimal Restock *
                  </label>
                  <Input
                    id="admin-inventory-f7"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Contoh: 10"
                    value={addForm.min_stok}
                    onChange={(e) => setAddForm({ ...addForm, min_stok: e.target.value })}
                    className="h-10 text-xs font-mono font-bold rounded-xl bg-white border-slate-200"
                    required
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={adding}
                  className="rounded-xl text-xs font-bold text-slate-600 border-slate-200 hover:bg-slate-50 h-9 px-4 cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={adding}
                  className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-9 px-5 flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  {adding ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menambahkan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tambah Barang</span>
                    </>
                  )}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MODAL RIWAYAT MUTASI LOGISTIK (MOVEMENTS HISTORY)          */}
      {/* ============================================================== */}
      {showHistoryModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowHistoryModal(false); }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex justify-center items-start p-3 sm:p-6 lg:p-8 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-8 animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/30 text-sky-400 rounded-xl border border-blue-500/30">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    Riwayat Mutasi & Perubahan Stok
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {selectedItem ? `Log mutasi untuk "${selectedItem.nama}"` : 'Log seluruh mutasi keluar masuk sparepart'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Table */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Total <strong>{movements.length}</strong> transaksi mutasi tercatat</span>
                {selectedItem && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedItem(null);
                      fetchMovements(null);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 h-7 px-2 font-bold cursor-pointer"
                  >
                    Tampilkan Semua Barang
                  </Button>
                )}
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[55vh] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3.5">Waktu</th>
                      <th className="py-2.5 px-3.5">Barang</th>
                      <th className="py-2.5 px-3.5">Jenis Mutasi</th>
                      <th className="py-2.5 px-3.5">Perubahan Stok</th>
                      <th className="py-2.5 px-3.5">Oleh & Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {loadingMovements ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-500">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                          Memuat mutasi...
                        </td>
                      </tr>
                    ) : movements.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-500">
                          Belum ada catatan mutasi stok.
                        </td>
                      </tr>
                    ) : (
                      movements.map((mov) => {
                        const dateFormatted = new Date(mov.created_at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <tr key={mov.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3.5 text-slate-500 whitespace-nowrap text-xs">
                              {dateFormatted}
                            </td>
                            <td className="py-2.5 px-3.5 font-bold text-slate-900">
                              {mov.nama}
                            </td>
                            <td className="py-2.5 px-3.5">
                              {mov.jenis === 'in' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <TrendingUp className="w-2.5 h-2.5" /> Masuk (+{mov.jumlah})
                                </span>
                              ) : mov.jenis === 'out' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <TrendingDown className="w-2.5 h-2.5" /> Keluar (-{mov.jumlah})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <SlidersHorizontal className="w-2.5 h-2.5" /> Opname ({mov.jumlah})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-xs">
                              <span className="text-slate-500">{mov.stok_sebelum}</span>
                              <span className="mx-1 text-slate-300">→</span>
                              <span className="font-bold text-slate-900">{mov.stok_sesudah} {mov.satuan}</span>
                            </td>
                            <td className="py-2.5 px-3.5">
                              <p className="font-bold text-slate-900 text-xs">{mov.oleh || 'Sistem'}</p>
                              <p className="text-xs text-slate-500 italic truncate max-w-xs">{mov.catatan}</p>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => setShowHistoryModal(false)}
                  variant="outline"
                  className="rounded-xl text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer h-9 px-4"
                >
                  Tutup
                </Button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
