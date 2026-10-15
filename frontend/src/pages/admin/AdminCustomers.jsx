import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import api from '../../api';
import { Search, Plus, User, MapPin, Phone, History, AirVent, ChevronRight, ChevronLeft, MessageSquare, Edit2, Trash2, Star, X, RefreshCw, ExternalLink, Layers } from 'lucide-react';
import { useToast } from '../../components/ui/toast';
import { getErrorMessage } from '../../utils/errors';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import AddressSelector from '../../components/booking/AddressSelector';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

export default function AdminCustomers() {
  const { error: showError, success: showSuccess } = useToast();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // List State
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // all | has_ac | no_ac
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Detail View State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('units'); // units | history | feedback

  // Modals State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerFormData, setCustomerFormData] = useState({ nama: '', kontak: '', alamat: '' });
  const [submittingCustomer, setSubmittingCustomer] = useState(false);

  // Confirmation Modal State (replaces confirm() for destructive actions)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false, onConfirm: null }));

  // AC Unit Modals State
  const [showAddACModal, setShowAddACModal] = useState(false);
  const [editingACUnit, setEditingACUnit] = useState(null);
  const [acFormData, setAcFormData] = useState({
    brand: 'Daikin',
    model: '',
    tipe: 'Split Wall',
    kapasitas_pk: '1',
    lokasi: '',
    nomor_seri: '',
    tanggal_pasang: '',
    catatan: ''
  });
  const [submittingAC, setSubmittingAC] = useState(false);

  // WhatsApp Helper
  const getWhatsAppLink = (rawPhone, customerName) => {
    if (!rawPhone) return null;
    let clean = String(rawPhone).replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    else if (clean.startsWith('8')) clean = '628' + clean.slice(1);
    const text = encodeURIComponent(`Halo Bpk/Ibu ${customerName || ''}, kami dari CV. Nara Teknindotama. Apakah ada kebutuhan perawatan atau servis unit AC Anda?`);
    return `https://wa.me/${clean}?text=${text}`;
  };

  // Helper to extract clean address components for smart display
  const formatAddressDisplay = (rawAddress) => {
    if (!rawAddress) return { mainText: '-', district: null, city: null, patokan: null };
    
    let addr = String(rawAddress).trim();
    let patokan = null;
    const patokanMatch = addr.match(/\(Patokan:\s*([^)]+)\)/i);
    if (patokanMatch) {
      patokan = patokanMatch[1].trim();
      addr = addr.replace(/\(Patokan:[^)]+\)/i, '').trim();
    }

    // Extract Kota/Kabupaten
    let city = null;
    const cityMatch = addr.match(/(Kota Adm\.[^,]+|Kota[^,]+|Kab\.[^,]+|Kabupaten[^,]+)/i);
    if (cityMatch) {
      city = cityMatch[1].trim();
    }

    // Extract Kecamatan
    let district = null;
    const districtMatch = addr.match(/Kec\.\s*([^,]+)/i);
    if (districtMatch) {
      district = districtMatch[1].trim();
    }

    // Main street / detail
    let mainText = addr;
    if (cityMatch || districtMatch) {
      const parts = addr.split(',');
      if (parts.length > 0 && parts[0].trim()) {
        mainText = parts[0].trim();
      }
    }

    return { mainText, district, city, patokan, full: rawAddress };
  };

  // Close modals when route changes
  useEffect(() => {
    setShowAddCustomerModal(false);
    setEditingCustomer(null);
    setShowAddACModal(false);
    setEditingACUnit(null);
    setSelectedCustomer(null);
  }, [location.pathname]);

  // Fetch Customers List
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/customers?q=${encodeURIComponent(search.trim())}`);
      const raw = res?.data?.data || res?.data || res;
      const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
      setCustomers(list);
    } catch (err) {
      showError('Gagal memuat pelanggan: ' + getErrorMessage(err, 'Terjadi kesalahan'));
    } finally {
      setLoading(false);
    }
  }, [search, showError]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Fetch Full Detail Customer (including AC units and history)
  const viewCustomer = useCallback(async (id, initialTab = 'units') => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/admin/customers/${id}`);
      const data = res?.data?.data || res?.data || res;
      setSelectedCustomer(data);
      if (initialTab) {
        setActiveTab(initialTab);
      }
    } catch (err) {
      showError('Gagal memuat detail pelanggan: ' + getErrorMessage(err, 'Terjadi kesalahan'));
    } finally {
      setLoadingDetail(false);
    }
  }, [showError]);

  // Handle URL query parameters for direct link (e.g., from AdminACUnits)
  useEffect(() => {
    const targetId = searchParams.get('viewId') || searchParams.get('id');
    const tabParam = searchParams.get('tab') || 'units';
    if (targetId) {
      viewCustomer(targetId, tabParam);
    }
  }, [searchParams, viewCustomer]);

  // Refresh current customer detail
  const refreshCurrentCustomer = async () => {
    if (!selectedCustomer?.id) return;
    try {
      const res = await api.get(`/admin/customers/${selectedCustomer.id}`);
      const data = res?.data?.data || res?.data || res;
      setSelectedCustomer(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Create / Edit Customer
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setSubmittingCustomer(true);
    try {
      const payload = {
        nama: customerFormData.nama.trim(),
        kontak: customerFormData.kontak.trim(),
        alamat: customerFormData.alamat?.trim() || ''
      };

      if (editingCustomer) {
        await api.patch(`/admin/customers/${editingCustomer.id}`, payload);
        showSuccess('Data pelanggan berhasil diperbarui');
        setEditingCustomer(null);
        if (selectedCustomer?.id === editingCustomer.id) {
          setSelectedCustomer(prev => ({ ...prev, ...payload }));
        }
      } else {
        await api.post('/admin/customers', payload);
        showSuccess('Pelanggan baru berhasil ditambahkan');
        setShowAddCustomerModal(false);
      }

      setCustomerFormData({ nama: '', kontak: '', alamat: '' });
      fetchCustomers();
    } catch (err) {
      showError(getErrorMessage(err, 'Gagal menyimpan data pelanggan'));
    } finally {
      setSubmittingCustomer(false);
    }
  };

  const openEditCustomer = (customer, e) => {
    if (e) e.stopPropagation();
    setEditingCustomer(customer);
    setCustomerFormData({
      nama: customer.nama || '',
      kontak: customer.kontak || '',
      alamat: customer.alamat || ''
    });
  };

  // AC Unit Form Handlers
  const openAddACModal = () => {
    setAcFormData({
      brand: 'Daikin',
      model: '',
      tipe: 'Split Wall',
      kapasitas_pk: '1',
      lokasi: 'Ruang Tamu',
      nomor_seri: '',
      tanggal_pasang: '',
      catatan: ''
    });
    setShowAddACModal(true);
  };

  const openEditACModal = (unit) => {
    setEditingACUnit(unit);
    setAcFormData({
      brand: unit.brand || 'Daikin',
      model: unit.model || '',
      tipe: unit.tipe || 'Split Wall',
      kapasitas_pk: unit.kapasitas_pk != null ? String(unit.kapasitas_pk) : '1',
      lokasi: unit.lokasi || '',
      nomor_seri: unit.nomor_seri || '',
      tanggal_pasang: unit.tanggal_pasang ? unit.tanggal_pasang.split('T')[0] : '',
      catatan: unit.catatan || ''
    });
  };

  const handleSaveACUnit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setSubmittingAC(true);
    try {
      const payload = {
        customer_id: Number(selectedCustomer.id),
        brand: acFormData.brand.trim(),
        model: acFormData.model.trim() || undefined,
        tipe: acFormData.tipe || 'Split Wall',
        kapasitas_pk: acFormData.kapasitas_pk ? Number(acFormData.kapasitas_pk) : undefined,
        lokasi: acFormData.lokasi.trim() || 'Ruangan Utama',
        nomor_seri: acFormData.nomor_seri.trim() || undefined,
        tanggal_pasang: acFormData.tanggal_pasang || undefined,
        catatan: acFormData.catatan.trim() || undefined
      };

      if (editingACUnit) {
        await api.patch(`/admin/ac-units/${editingACUnit.id}`, payload);
        showSuccess('Data Unit AC berhasil diperbarui');
        setEditingACUnit(null);
      } else {
        await api.post('/admin/ac-units', payload);
        showSuccess('Unit AC baru berhasil ditambahkan');
        setShowAddACModal(false);
      }

      await refreshCurrentCustomer();
      fetchCustomers();
    } catch (err) {
      showError(getErrorMessage(err, 'Gagal menyimpan unit AC'));
    } finally {
      setSubmittingAC(false);
    }
  };

  const handleDeleteACUnit = (unitId) => {
    const unit = acUnitsList.find(u => u.id === unitId);
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Unit AC',
      message: `Apakah Anda yakin ingin menonaktifkan unit AC ${unit?.brand || ''} (${unit?.lokasi || ''})? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        try {
          await api.delete(`/admin/ac-units/${unitId}`);
          showSuccess('Unit AC berhasil dinonaktifkan');
          await refreshCurrentCustomer();
          fetchCustomers();
        } catch (err) {
          showError(getErrorMessage(err, 'Gagal menghapus unit AC'));
        } finally {
          closeConfirmModal();
        }
      }
    });
  };

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    let list = [...customers];
    if (filterType === 'has_ac') {
      list = list.filter(c => Number(c.total_unit ?? c.jumlah_unit ?? c.total_ac ?? 0) > 0);
    } else if (filterType === 'no_ac') {
      list = list.filter(c => Number(c.total_unit ?? c.jumlah_unit ?? c.total_ac ?? 0) === 0);
    }
    return list;
  }, [customers, filterType]);

  // Reset pagination when search or filterType changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType]);

  // Paginated customers
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  // Quick Metrics
  const metrics = useMemo(() => {
    const totalCust = customers.length;
    let totalAC = 0;
    customers.forEach(c => {
      totalAC += Number(c.total_unit ?? c.jumlah_unit ?? c.total_ac ?? 0);
    });
    return { totalCust, totalAC };
  }, [customers]);

  // Variables for selectedCustomer
  const acUnitsList = selectedCustomer?.ac_units || [];
  const historyList = selectedCustomer?.history || [];
  const feedbackList = selectedCustomer?.feedback || [];
  const waLink = selectedCustomer ? getWhatsAppLink(selectedCustomer.kontak, selectedCustomer.nama) : null;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 relative min-w-0 font-sans">
      {selectedCustomer ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Back Button */}
          <div>
            <button 
              onClick={() => {
                setSelectedCustomer(null);
                if (searchParams.get('viewId') || searchParams.get('id')) {
                  setSearchParams({}, { replace: true });
                }
              }}
              className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> 
              <span>Kembali ke Daftar Pelanggan</span>
            </button>
          </div>

          {/* CUSTOMER PROFILE HEADER CARD */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-5 sm:p-7">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-blue-500/20 shrink-0">
                  {(selectedCustomer.nama || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {selectedCustomer.nama}
                    </h1>
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 font-mono text-xs font-bold">
                      CUST-#{selectedCustomer.id}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-2 text-xs sm:text-sm text-slate-600">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span>{selectedCustomer.kontak || '-'}</span>
                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank" rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors ml-1 inline-flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat WhatsApp</span>
<span className="sr-only"> (buka di tab baru)</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-start gap-1.5 text-slate-600 max-w-xl">
                      <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-slate-800 leading-snug">
                          {selectedCustomer.alamat || 'Alamat belum diisi'}
                        </span>
                        {(() => {
                          const parsed = formatAddressDisplay(selectedCustomer.alamat);
                          return parsed.patokan ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 font-medium w-fit">
                              <span>📍 Patokan:</span>
                              <span className="font-bold">{parsed.patokan}</span>
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditCustomer(selectedCustomer)}
                  className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold h-9 px-4 flex items-center gap-1.5 cursor-pointer shadow-sm flex-1 md:flex-none justify-center"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Profil</span>
                </Button>
              </div>
            </div>
          </div>

        {/* INTEGRATED TAB NAVIGATION */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('units')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap",
              activeTab === 'units'
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            <AirVent className="w-4 h-4" />
            <span>Unit AC Terdaftar</span>
            <span className={cn(
              "text-xs px-1.5 py-0.2 rounded-full font-bold",
              activeTab === 'units' ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700"
            )}>
              {acUnitsList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap",
              activeTab === 'history'
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Booking & Servis</span>
            <span className={cn(
              "text-xs px-1.5 py-0.2 rounded-full font-bold",
              activeTab === 'history' ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700"
            )}>
              {historyList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap",
              activeTab === 'feedback'
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Ulasan & Rating</span>
            <span className={cn(
              "text-xs px-1.5 py-0.2 rounded-full font-bold",
              activeTab === 'feedback' ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700"
            )}>
              {feedbackList.length}
            </span>
          </button>
        </div>

        {/* TAB 1: DAFTAR UNIT AC PELANGGAN (TERINTEGRASI) */}
        {activeTab === 'units' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-900 text-base">Inventaris Unit AC Pelanggan</h3>
                <p className="text-xs text-slate-500">Unit AC terdaftar yang siap dipilih saat penjadwalan servis.</p>
              </div>
              {acUnitsList.length > 0 && (
                <Button
                  size="sm"
                  onClick={openAddACModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-8 px-3.5 cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Unit AC</span>
                </Button>
              )}
            </div>

            {acUnitsList.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  <AirVent className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">Belum Ada Unit AC Terdaftar</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                  Daftarkan unit AC milik pelanggan ini untuk memudahkan teknisi mengetahui spesifikasi PK, tipe, dan riwayat perbaikannya.
                </p>
                <Button
                  onClick={openAddACModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-9 px-4 cursor-pointer shadow-sm inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Unit AC Sekarang</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {acUnitsList.map(unit => (
                  <div 
                    key={unit.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between relative overflow-hidden group"
                  >
                    <div>
                      {/* Header Unit */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <AirVent className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-base leading-tight">
                              {unit.brand}
                            </h4>
                            <span className="text-xs text-slate-500 font-medium">{unit.model || 'Standard Unit'}</span>
                          </div>
                        </div>

                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold text-xs px-2 py-0.5">
                          {unit.kapasitas_pk != null ? `${unit.kapasitas_pk} PK` : '1 PK'}
                        </Badge>
                      </div>

                      {/* Detail Spesifikasi */}
                      <div className="space-y-2 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100 my-3">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tipe AC:</span>
                          <span className="font-bold text-slate-900">{unit.tipe || 'Split Wall'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Lokasi Unit:</span>
                          <span className="font-bold text-slate-900">{unit.lokasi || '-'}</span>
                        </div>
                        {unit.nomor_seri && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">No. Seri:</span>
                            <span className="font-mono font-bold text-slate-800">{unit.nomor_seri}</span>
                          </div>
                        )}
                        {unit.tanggal_pasang && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Dipasang:</span>
                            <span className="font-semibold text-slate-800">
                              {new Date(unit.tanggal_pasang).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>

                      {unit.catatan && (
                        <p className="text-xs text-slate-500 italic line-clamp-2 mb-3">
                          "{unit.catatan}"
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 font-mono">
                        UNIT-#{unit.id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditACModal(unit)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Unit AC"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteACUnit(unit.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus / Nonaktifkan Unit AC"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RIWAYAT SERVIS & BOOKING */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-black text-slate-900 text-base">Riwayat Servis Pelanggan</h3>
              <p className="text-xs text-slate-500">Seluruh catatan tiket pekerjaan servis AC yang pernah dipesan oleh pelanggan ini.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              {historyList.length === 0 ? (
                <div className="p-16 text-center text-slate-500">
                  <History className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-900 text-sm">Belum ada riwayat servis</p>
                  <p className="text-xs text-slate-500 mt-1">Pelanggan ini belum pernah menyelesaikan tiket booking servis.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                        <th className="py-3.5 px-6">Waktu & Jadwal</th>
                        <th className="py-3.5 px-6">Kode Tiket</th>
                        <th className="py-3.5 px-6">Layanan</th>
                        <th className="py-3.5 px-6">Unit AC</th>
                        <th className="py-3.5 px-6">Teknisi</th>
                        <th className="py-3.5 px-6">Status</th>
                        <th className="py-3.5 px-6 text-right">Tautan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {historyList.map(h => (
                        <tr key={h.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3.5 px-6 font-bold text-slate-900">
                            {h.jadwal_mulai ? new Date(h.jadwal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                            <div className="text-xs font-normal text-slate-500">
                              {h.jadwal_mulai ? new Date(h.jadwal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : ''}
                            </div>
                          </td>

                          <td className="py-3.5 px-6">
                            <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                              {h.kode_booking}
                            </span>
                          </td>

                          <td className="py-3.5 px-6 font-semibold text-slate-800">
                            {h.nama_layanan || 'Service AC'}
                          </td>

                          <td className="py-3.5 px-6 text-slate-600">
                            {h.brand ? (
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">
                                {h.brand} ({h.lokasi_unit || 'Unit'})
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-6 font-medium text-slate-700">
                            {h.teknisi || 'Belum ditugaskan'}
                          </td>

                          <td className="py-3.5 px-6">
                            <Badge className={cn(
                              "text-xs font-black uppercase px-2 py-0.5",
                              h.status === 'done' ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                              h.status === 'on process' ? "bg-sky-100 text-sky-800 border-sky-200" :
                              h.status === 'scheduled' ? "bg-amber-100 text-amber-800 border-amber-200" :
                              "bg-slate-100 text-slate-700"
                            )}>
                              {h.status}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-6 text-right">
                            <a
                              href={`/status/${h.kode_booking}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Lihat</span>
<span className="sr-only"> (buka di tab baru)</span>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ULASAN & FEEDBACK */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-black text-slate-900 text-base">Ulasan & Kepuasan Pelanggan</h3>
              <p className="text-xs text-slate-500">Feedback kepuasan yang dikirimkan pelanggan setelah teknisi menyelesaikan pekerjaan.</p>
            </div>

            {feedbackList.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Star className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="font-bold text-slate-900 text-sm">Belum ada ulasan</p>
                <p className="text-xs text-slate-500 mt-1">Pelanggan belum mengirimkan ulasan rating untuk servis yang telah selesai.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {feedbackList.map((f, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(st => (
                          <Star 
                            key={st} 
                            className={cn(
                              "w-4 h-4",
                              st <= (f.rating || 5) ? "text-amber-500 fill-amber-500" : "text-slate-400"
                            )} 
                          />
                        ))}
                      </div>
                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {f.kode_booking}
                      </span>
                    </div>

                    <p className="text-sm text-slate-800 leading-relaxed font-medium">
                      "{f.komentar || 'Pelayanan memuaskan, teknisi ramah dan rapi.'}"
                    </p>

                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                      {f.waktu ? new Date(f.waktu).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    ) : (
      <>
        {/* HEADER: Standard Clean Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Data Pelanggan & Unit AC</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Direktori pelanggan CV. Nara Teknindotama terintegrasi dengan data kepemilikan unit AC dan riwayat servis.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">

            <Button
              onClick={() => {
                setEditingCustomer(null);
                setCustomerFormData({ nama: '', kontak: '', alamat: '' });
                setShowAddCustomerModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl h-10 px-4 cursor-pointer shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all hover:shadow active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pelanggan Baru</span>
            </Button>
          </div>
        </div>

        {/* QUICK KPI METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Pelanggan</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">{metrics.totalCust}</span>
              <span className="text-xs text-slate-500 font-medium mt-0.5 block">Tercatat di sistem</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <User className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">Unit AC Terdaftar</span>
              <span className="text-2xl sm:text-3xl font-black text-blue-700 mt-1 block">{metrics.totalAC} Unit</span>
              <span className="text-xs text-slate-500 font-medium mt-0.5 block">Aset terpasang aktif</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <AirVent className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">Integrasi CRM</span>
              <span className="text-base sm:text-lg font-black text-slate-900 mt-1 block">Profil & AC Terpusat</span>
              <span className="text-xs text-slate-500 font-medium mt-0.5 block">Riwayat servis terekam</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Layers className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER TOOLBAR */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama pelanggan, nomor WhatsApp, atau alamat..."
              aria-label="Cari pelanggan"
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                filterType === 'all' ? "bg-slate-900 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterType('has_ac')}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                filterType === 'has_ac' ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Punya Unit AC
            </button>
            <button
              onClick={() => setFilterType('no_ac')}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                filterType === 'no_ac' ? "bg-amber-600 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Belum Ada AC
            </button>
          </div>
        </div>

        {/* TABLE / CARDS CONTENT */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-900 font-bold text-base">Memuat Data Pelanggan...</p>
            <p className="text-xs text-slate-500 mt-1">Mengambil direktori profil dan unit AC pelanggan.</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-16 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mx-auto mb-4">
              <User className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Tidak Ada Pelanggan Ditemukan</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Tidak ada data yang cocok dengan kata kunci pencarian Anda.
            </p>
            <Button
              onClick={() => { setSearch(''); setFilterType('all'); }}
              variant="outline"
              className="rounded-xl border-slate-200 font-bold text-xs cursor-pointer"
            >
              Reset Filter
            </Button>
          </div>
        ) : (
          <>
            {/* MOBILE CARDS VIEW (< md) */}
            <div className="block md:hidden divide-y divide-gray-100">
              {paginatedCustomers.map(c => {
                const waLink = getWhatsAppLink(c.kontak, c.nama);
                const acCount = Number(c.total_unit ?? c.jumlah_unit ?? c.total_ac ?? 0);
                const parsed = formatAddressDisplay(c.alamat);

                return (
                  <div
                    key={c.id}
                    onClick={() => viewCustomer(c.id)}
                    className="p-4 space-y-3 hover:bg-blue-50/20 transition-colors cursor-pointer active:bg-blue-50/40"
                  >
                    {/* Header: Customer Name & Actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0">
                          {(c.nama || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm truncate">
                            {c.nama}
                          </h4>
                          <span className="font-mono text-xs text-slate-500 font-bold">
                            CUST-#{c.id}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank" rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 p-2 rounded-xl transition-colors inline-flex"
                            title="Chat WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
<span className="sr-only"> (buka di tab baru)</span>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => openEditCustomer(c, e)}
                          className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 h-8 w-8 p-0 rounded-xl"
                          title="Edit Pelanggan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Contact & Units Badge */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-800">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{c.kontak || '-'}</span>
                      </div>

                      <div>
                        {acCount > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-lg border border-blue-200 text-xs">
                            <AirVent className="w-3 h-3" />
                            <span>{acCount} Unit AC</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs italic">
                            Belum ada AC
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Alamat Terstruktur */}
                    <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100/90 text-xs space-y-1.5">
                      <div className="flex items-start gap-1.5 text-slate-800 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{parsed.mainText || c.alamat || '-'}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {parsed.city && (
                          <span className="text-xs font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md border border-blue-100/80">
                            {parsed.city.replace('Kota Adm. ', '')}
                          </span>
                        )}
                        {parsed.district && (
                          <span className="text-xs font-medium bg-white text-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200">
                            Kec. {parsed.district}
                          </span>
                        )}
                        {parsed.patokan && (
                          <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60 font-medium truncate max-w-[180px]">
                            📍 {parsed.patokan}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-1">
                      <Button
                        size="sm"
                        onClick={() => viewCustomer(c.id)}
                        className="w-full bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs rounded-xl h-8.5 px-3 cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>Kelola Unit AC & Riwayat</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                    <th className="py-4 px-6">Pelanggan</th>
                    <th className="py-4 px-6">Kontak & WhatsApp</th>
                    <th className="py-4 px-6">Alamat Domisili</th>
                    <th className="py-4 px-6">Unit AC Terdaftar</th>
                    <th className="py-4 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedCustomers.map(c => {
                    const waLink = getWhatsAppLink(c.kontak, c.nama);
                    const acCount = Number(c.total_unit ?? c.jumlah_unit ?? c.total_ac ?? 0);

                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => viewCustomer(c.id)}
                        className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                      >
                        {/* Pelanggan */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0 group-hover:scale-105 transition-transform">
                              {(c.nama || 'P').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                                {c.nama}
                              </div>
                              <span className="font-mono text-xs text-slate-500 font-bold">
                                ID: #{c.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Kontak */}
                        <td className="py-3.5 px-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-800">{c.kontak || '-'}</span>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank" rel="noopener noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 p-1 rounded-md transition-colors inline-flex"
                                title="Chat WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
<span className="sr-only"> (buka di tab baru)</span>
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Alamat */}
                        <td className="py-3.5 px-6 text-slate-600 max-w-xs" title={c.alamat}>
                          {(() => {
                            const parsed = formatAddressDisplay(c.alamat);
                            return (
                              <div className="flex flex-col gap-1 min-w-0 max-w-[280px]">
                                <div className="flex items-center gap-1.5 text-slate-900 font-semibold text-xs truncate">
                                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  <span className="truncate">{parsed.mainText || '-'}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1">
                                  {parsed.city && (
                                  <span className="text-xs font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md border border-blue-100/80">
                                    {parsed.city.replace('Kota Adm. ', '')}
                                  </span>
                                )}
                                {parsed.district && (
                                  <span className="text-xs font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md">
                                    Kec. {parsed.district}
                                  </span>
                                )}
                                {parsed.patokan && (
                                  <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60 font-medium truncate max-w-[130px]" title={`Patokan: ${parsed.patokan}`}>
                                    📍 {parsed.patokan}
                                  </span>
                                )}
                                {!parsed.city && !parsed.district && !parsed.patokan && c.alamat && (
                                  <span className="text-xs text-slate-500 truncate max-w-[200px]">
                                    {c.alamat}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Unit AC Terdaftar */}
                      <td className="py-3.5 px-6">
                        {acCount > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-lg border border-blue-200 text-xs">
                            <AirVent className="w-3.5 h-3.5" />
                            <span>{acCount} Unit</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs italic">
                            Belum ada AC
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => openEditCustomer(c, e)}
                            className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 h-8 w-8 p-0 rounded-lg cursor-pointer"
                            title="Edit Data Pelanggan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => viewCustomer(c.id)}
                            className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs rounded-xl h-8 px-3 cursor-pointer transition-all flex items-center gap-1"
                          >
                            <span>Detail & AC</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
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
              Menampilkan <strong className="text-slate-900">{filteredCustomers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> - <strong className="text-slate-900">{Math.min(filteredCustomers.length, currentPage * itemsPerPage)}</strong> dari <strong className="text-slate-900">{filteredCustomers.length}</strong> pelanggan
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
      </>
    )}

      {/* MODAL TAMBAH / EDIT PELANGGAN */}
      {(showAddCustomerModal || editingCustomer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <h2 className="text-base font-black text-slate-900">
                {editingCustomer ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h2>
              <button 
                onClick={() => { setShowAddCustomerModal(false); setEditingCustomer(null); }}
                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto">
              <div>
                <label htmlFor="admin-customers-f1" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap:
                </label>
                <input
                  id="admin-customers-f1" 
                  type="text" 
                  required
                  value={customerFormData.nama}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Contoh: Bpk. Bambang Wijaya"
                />
              </div>

              <div>
                <label htmlFor="admin-customers-f2" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nomor WhatsApp / Kontak:
                </label>
                <input
                  id="admin-customers-f2" 
                  type="text" 
                  required
                  value={customerFormData.kontak}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, kontak: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="081234567890"
                />
              </div>

              <div role="group" aria-labelledby="customer-alamat-label">
                <label id="customer-alamat-label" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alamat Domisili / Lokasi Unit:
                </label>
                <AddressSelector
                  value={customerFormData.alamat}
                  onChange={(assembled) => setCustomerFormData(prev => ({ ...prev, alamat: assembled }))}
                  required={false}
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => { setShowAddCustomerModal(false); setEditingCustomer(null); }}
                  className="rounded-xl border-slate-200 font-bold text-xs h-9 cursor-pointer"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={submittingCustomer}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-9 px-4 cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  {submittingCustomer && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Data</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT UNIT AC */}
      {(showAddACModal || editingACUnit) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <AirVent className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    {editingACUnit ? 'Edit Data Unit AC' : 'Tambah Unit AC Pelanggan'}
                  </h2>
                  <span className="text-xs text-slate-500 font-medium">
                    Milik: {selectedCustomer?.nama}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => { setShowAddACModal(false); setEditingACUnit(null); }}
                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveACUnit} className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                {/* Brand AC */}
                <div>
                  <label htmlFor="admin-customers-f1" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Merk / Brand:
                  </label>
                  <select
                    id="admin-customers-f1"
                    value={acFormData.brand}
                    onChange={(e) => setAcFormData({ ...acFormData, brand: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Daikin">Daikin</option>
                    <option value="Panasonic">Panasonic</option>
                    <option value="Sharp">Sharp</option>
                    <option value="LG">LG</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Gree">Gree</option>
                    <option value="Mitsubishi">Mitsubishi</option>
                    <option value="Aqua">Aqua</option>
                    <option value="Aux">Aux</option>
                    <option value="Changhong">Changhong</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                {/* Kapasitas PK */}
                <div>
                  <label htmlFor="admin-customers-f2" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kapasitas (PK):
                  </label>
                  <select
                    id="admin-customers-f2"
                    value={acFormData.kapasitas_pk}
                    onChange={(e) => setAcFormData({ ...acFormData, kapasitas_pk: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="0.5">0.5 PK (1/2 PK)</option>
                    <option value="0.75">0.75 PK (3/4 PK)</option>
                    <option value="1">1 PK</option>
                    <option value="1.5">1.5 PK</option>
                    <option value="2">2 PK</option>
                    <option value="2.5">2.5 PK</option>
                    <option value="3">3 PK</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Tipe AC */}
                <div>
                  <label htmlFor="admin-customers-f3" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tipe AC:
                  </label>
                  <select
                    id="admin-customers-f3"
                    value={acFormData.tipe}
                    onChange={(e) => setAcFormData({ ...acFormData, tipe: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Split Wall">Split Wall</option>
                    <option value="Inverter">Inverter</option>
                    <option value="Cassette">Cassette</option>
                    <option value="Standing Floor">Standing Floor</option>
                    <option value="Central">Central / VRF</option>
                  </select>
                </div>

                {/* Model / Seri */}
                <div>
                  <label htmlFor="admin-customers-f4" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Model / Seri:
                  </label>
                  <input
                    id="admin-customers-f4"
                    type="text"
                    value={acFormData.model}
                    onChange={(e) => setAcFormData({ ...acFormData, model: e.target.value })}
                    placeholder="Contoh: Flash Inverter FTKQ25"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Lokasi Penempatan Unit */}
              <div>
                <label htmlFor="admin-customers-f5" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lokasi Penempatan Unit:
                </label>
                <input
                  id="admin-customers-f5"
                  type="text"
                  required
                  value={acFormData.lokasi}
                  onChange={(e) => setAcFormData({ ...acFormData, lokasi: e.target.value })}
                  placeholder="Contoh: Kamar Tidur Utama (Lt. 2), Ruang Tamu, Kantor"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Tanggal Pasang & Catatan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="admin-customers-f6" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal Pemasangan:
                  </label>
                  <input
                    id="admin-customers-f6"
                    type="date"
                    value={acFormData.tanggal_pasang}
                    onChange={(e) => setAcFormData({ ...acFormData, tanggal_pasang: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="admin-customers-f7" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nomor Seri (Opsional):
                  </label>
                  <input
                    id="admin-customers-f7"
                    type="text"
                    value={acFormData.nomor_seri}
                    onChange={(e) => setAcFormData({ ...acFormData, nomor_seri: e.target.value })}
                    placeholder="SN12345678"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-customers-f8" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catatan Kondisi Unit:
                </label>
                <textarea
                  id="admin-customers-f8"
                  rows="2"
                  value={acFormData.catatan}
                  onChange={(e) => setAcFormData({ ...acFormData, catatan: e.target.value })}
                  placeholder="Catatan riwayat freon, kendala hembusan, dsb..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => { setShowAddACModal(false); setEditingACUnit(null); }}
                  className="rounded-xl border-slate-200 font-bold text-xs h-9 cursor-pointer"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={submittingAC}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-9 px-4 cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  {submittingAC && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingACUnit ? 'Perbarui Unit' : 'Simpan Unit AC'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
