import { useState, useEffect } from 'react';
import api from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';
import { cn } from '../../lib/utils';
import { 
  Tag, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Plus, 
  Wrench, 
  Wind, 
  Edit3, 
  Check, 
  AlertCircle,
  HelpCircle,
  Layers,
  X,
  Loader2,
  DollarSign
} from 'lucide-react';

export default function AdminServices() {
  const { error: showError, success: showSuccess } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal edit state
  const [editingService, setEditingService] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Modal create state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    kode: '',
    nama_layanan: '',
    kategori: 'Cleaning',
    harga: 75000,
    durasi_menit: 60,
    deskripsi: ''
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Default official services CV. Nara Teknindotama metadata
  const defaultServicesMeta = [
    {
      id: 1,
      nama: 'Cuci AC Standard',
      kategori: 'Cleaning',
      badge: 'Perawatan Rutin 2-3 Bulan',
      harga: 75000,
      durasi_menit: 60,
      garansi: '14 Hari Kalender',
      deskripsi: 'Pembersihan debu permukaan untuk AC yang masih beroperasi dingin normal dan dirawat berkala.',
      scope: [
        'Cuci filter udara & cover casing unit indoor',
        'Cuci evaporator unit indoor (permukaan luar)',
        'Semprot saluran pembuangan air (drain pipe)',
        'Semprot kisi-kisi kondensor unit outdoor',
        'Pengecekan suhu dingin & arus listrik (Ampere)'
      ],
      isPopular: false
    },
    {
      id: 2,
      nama: 'Bongkar Pasang AC',
      kategori: 'Instalasi',
      badge: 'Pindah Rumah & Kantor',
      harga: 350000,
      durasi_menit: 120,
      garansi: '30 Hari Kalender',
      deskripsi: 'Pelepasan unit lama dengan pumping down freon aman dan pemasangan di lokasi baru secara presisi dan rapi.',
      scope: [
        'Pump down freon aman tanpa buang gas refrigerant',
        'Pelepasan unit indoor, outdoor, bracket & pipa',
        'Pemasangan instalasi baru presisi waterpass',
        'Vakum pipa AC sebelum buka kran freon',
        'Tes kebocoran dan uji performa dingin'
      ],
      isPopular: false
    },
    {
      id: 3,
      nama: 'Isi Freon R32',
      kategori: 'Freon',
      badge: 'Solusi AC Kurang Dingin',
      harga: 150000,
      durasi_menit: 45,
      garansi: '30 Hari Garansi Dingin',
      deskripsi: 'Pengisian ulang freon murni R32 / R410A / R22 bertekanan presisi sesuai spesifikasi pabrikan.',
      scope: [
        'Pengecekan kebocoran nepel pipa & flare joint',
        'Pengisian freon murni presisi pabrik',
        'Pengukuran tekanan manifold digital presisi',
        'Pengujian performa kompresor & stabilitas suhu',
        'Garansi dingin 30 hari kalender'
      ],
      isPopular: false
    },
    {
      id: 4,
      nama: 'Cuci AC Core (Deep Clean)',
      kategori: 'Deep Clean',
      badge: 'Rekomendasi • Tuntas Bocor & Bau',
      harga: 120000,
      durasi_menit: 90,
      garansi: '30 Hari Penuh',
      deskripsi: 'Pembersihan tuntas total dengan membongkar komponen talang air & blower. Menuntaskan AC bocor air dan bau apek.',
      scope: [
        'SEMUA cakupan Paket Cuci Standar lengkap',
        'Bongkar total rotor fan blower indoor & talang air',
        'Chemical treatment anti-jamur & pembasmi bau apek',
        'Vakum sedot kuras pipa drainase lendir anti-bocor 100%',
        'Pengecekan tekanan freon digital & arus kompresor'
      ],
      isPopular: true
    },
    {
      id: 5,
      nama: 'Paket Core + Isi Freon',
      kategori: 'Freon & Clean',
      badge: 'Overhaul + Freon Murni',
      harga: 220000,
      durasi_menit: 105,
      garansi: '45 Hari Penuh Garansi Dingin',
      deskripsi: 'Kombinasi cuci overhaul menyeluruh ditambah pengisian ulang freon bertekanan presisi sesuai spesifikasi pabrik.',
      scope: [
        'SEMUA cakupan Cuci AC Core Deep Clean',
        'Pengecekan kebocoran nepel pipa & flare joint',
        'Pengisian freon murni (R32 / R410A / R22)',
        'Pengukuran tekanan manifold digital presisi',
        'Garansi dingin maksimal 45 hari kalender'
      ],
      isPopular: false
    }
  ];

  // Helper to enrich a DB record with rich marketing & SOP scope metadata
  const enrichService = (dbSvc) => {
    const sName = (dbSvc.nama_layanan || dbSvc.nama || '').toLowerCase();
    const def = defaultServicesMeta.find(d => 
      d.id === dbSvc.id || 
      d.nama.toLowerCase() === sName ||
      (d.id === 4 && sName.includes('core') && !sName.includes('freon')) ||
      (d.id === 5 && sName.includes('core') && sName.includes('freon')) ||
      (d.id === 1 && sName.includes('stand')) ||
      (d.id === 2 && sName.includes('bongkar')) ||
      (d.id === 3 && sName.includes('freon') && !sName.includes('core'))
    );

    return {
      ...def,
      ...dbSvc,
      id: dbSvc.id,
      kode: dbSvc.kode || def?.kode || `SRV-${dbSvc.id}`,
      nama: dbSvc.nama_layanan || dbSvc.nama || def?.nama || 'Layanan Servis',
      nama_layanan: dbSvc.nama_layanan || dbSvc.nama || def?.nama || 'Layanan Servis',
      harga: Number(dbSvc.harga !== undefined ? dbSvc.harga : (def?.harga || 75000)),
      durasi_menit: Number(dbSvc.durasi_menit !== undefined ? dbSvc.durasi_menit : (def?.durasi_menit || 60)),
      kategori: dbSvc.kategori || def?.kategori || 'Servis AC',
      deskripsi: dbSvc.deskripsi || def?.deskripsi || '',
      garansi: def?.garansi || '14 Hari Kalender',
      badge: def?.badge || (dbSvc.kategori ? `Kategori: ${dbSvc.kategori}` : 'Paket Servis'),
      scope: def?.scope || [
        'Pembersihan unit berstandar SOP NARA AC',
        'Pengecekan kelistrikan & tekanan pendingin',
        'Uji fungsi dingin & garansi resmi'
      ],
      isPopular: def ? def.isPopular : false,
      aktif: dbSvc.aktif !== undefined ? dbSvc.aktif : true
    };
  };

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await api.get('/service-catalog');
      const raw = res?.data?.data || res?.data || res;
      const list = Array.isArray(raw) && raw.length > 0 ? raw : defaultServicesMeta;
      setServices(list.map(enrichService));
    } catch (err) {
      setServices(defaultServicesMeta.map(enrichService));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // Open Edit Modal
  const handleOpenEdit = (svc) => {
    setEditingService({
      id: svc.id,
      kode: svc.kode || '',
      nama_layanan: svc.nama_layanan || svc.nama || '',
      kategori: svc.kategori || 'Cleaning',
      harga: svc.harga || 75000,
      durasi_menit: svc.durasi_menit || 60,
      deskripsi: svc.deskripsi || '',
      aktif: svc.aktif !== undefined ? svc.aktif : true
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Price & Details
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingService) return;

    if (!editingService.nama_layanan.trim()) {
      showError('Nama layanan tidak boleh kosong.');
      return;
    }
    if (editingService.harga < 0) {
      showError('Tarif layanan tidak boleh bernilai negatif.');
      return;
    }
    if (editingService.durasi_menit < 15 || editingService.durasi_menit > 480) {
      showError('Durasi layanan harus antara 15 sampai 480 menit.');
      return;
    }

    setSaveLoading(true);
    try {
      const payload = {
        nama_layanan: editingService.nama_layanan.trim(),
        kategori: editingService.kategori.trim(),
        harga: Number(editingService.harga),
        durasi_menit: Number(editingService.durasi_menit),
        deskripsi: editingService.deskripsi.trim(),
        aktif: Boolean(editingService.aktif)
      };

      const res = await api.patch(`/service-catalog/${editingService.id}`, payload);
      const updatedData = res?.data?.data || res?.data || payload;

      // Update local services state
      setServices(prev => prev.map(s => {
        if (s.id === editingService.id) {
          return enrichService({ ...s, ...updatedData, id: s.id });
        }
        return s;
      }));

      showSuccess(`Tarif "${editingService.nama_layanan}" berhasil diperbarui menjadi Rp ${Number(editingService.harga).toLocaleString('id-ID')}. Perubahan langsung aktif di booking & landing page!`);
      setIsEditModalOpen(false);
      setEditingService(null);
    } catch (err) {
      showError(err.response?.data?.error?.message || err.message || 'Gagal menyimpan perubahan tarif.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Submit New Service
  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!createForm.kode.trim() || !createForm.nama_layanan.trim()) {
      showError('Kode dan nama layanan wajib diisi.');
      return;
    }

    setCreateLoading(true);
    try {
      const payload = {
        kode: createForm.kode.trim().toUpperCase(),
        nama_layanan: createForm.nama_layanan.trim(),
        kategori: createForm.kategori.trim(),
        harga: Number(createForm.harga),
        durasi_menit: Number(createForm.durasi_menit),
        deskripsi: createForm.deskripsi.trim()
      };

      const res = await api.post('/service-catalog', payload);
      const created = res?.data?.data || res?.data || payload;

      showSuccess(`Paket layanan "${payload.nama_layanan}" berhasil ditambahkan ke katalog resmi.`);
      setIsCreateModalOpen(false);
      setCreateForm({
        kode: '',
        nama_layanan: '',
        kategori: 'Cleaning',
        harga: 75000,
        durasi_menit: 60,
        deskripsi: ''
      });
      fetchCatalog();
    } catch (err) {
      showError(err.response?.data?.error?.message || err.message || 'Gagal menambahkan layanan baru.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-gray-50/50 relative min-w-0">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Katalog Layanan & Tarif Resmi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Standar paket servis CV. Nara Teknindotama. Penyesuaian tarif di sini otomatis tersinkronisasi ke Booking Page dan Landing Page pelanggan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              const nextId = services.length + 1;
              setCreateForm(prev => ({
                ...prev,
                kode: `SRV-CUSTOM-${String(nextId).padStart(2, '0')}`
              }));
              setIsCreateModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl h-10 px-4 cursor-pointer shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all hover:shadow active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Paket Servis</span>
          </Button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Total Paket Servis</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{services.length} Layanan</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">Aktif di sistem booking</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
            <Tag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-emerald-600 font-bold">Kategori Spesialis</p>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
              {new Set(services.map(s => s.kategori)).size} Kategori
            </h3>
            <p className="text-xs text-emerald-700/80 mt-1 font-medium">Cleaning, freon, & instalasi</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-indigo-600 font-bold">Sinkronisasi Tarif</p>
            <h3 className="text-2xl sm:text-3xl font-black text-indigo-600 mt-1">Real-Time</h3>
            <p className="text-xs text-indigo-700/80 mt-1 font-medium">Otomatis ke form order & web</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Synchronized Banner Info */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-700">
          <p className="font-bold text-slate-900 text-sm">Integrasi Real-Time dengan Form Booking & Landing Page</p>
          <p className="text-slate-500 mt-1 leading-relaxed">
            Setiap kali Anda menekan <strong>Ubah Tarif</strong> dan menyimpan harga baru, database pusat akan dimutakhirkan. Sistem booking online pelanggan, kalkulator estimasi total, dan penawaran di landing page otomatis mencerminkan tarif terbaru tanpa perlu restart server.
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((svc) => (
          <div
            key={svc.id}
            className={cn(
              "bg-white rounded-3xl p-6 border shadow-sm flex flex-col justify-between transition-all hover:shadow-md",
              svc.isPopular ? "border-blue-300 ring-2 ring-blue-500/20" : "border-slate-200/80"
            )}
          >
            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between mb-3">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  svc.isPopular 
                    ? "bg-blue-50 text-blue-700 border border-blue-200" 
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                )}>
                  {svc.badge || svc.kategori || 'Paket Servis'}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-400">
                  {svc.kode || `ID: #${svc.id}`}
                </span>
              </div>

              {/* Service Title */}
              <h2 className="text-lg font-black text-slate-900 leading-snug">
                {svc.nama_layanan || svc.nama}
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {svc.deskripsi}
              </p>

              {/* Price Banner */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Tarif Satuan:</span>
                  <span className="text-2xl font-black text-blue-700">
                    Rp {(svc.harga || 75000).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-slate-400 font-medium"> / unit</span>
                </div>
                <div className="text-right text-xs">
                  <div className="flex items-center gap-1 text-slate-600 font-bold justify-end">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>{svc.durasi_menit || 60} Menit</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-700 font-bold mt-1 justify-end">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{svc.garansi || '14 Hari'}</span>
                  </div>
                </div>
              </div>

              {/* Scope Checklist */}
              {svc.scope && (
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Cakupan Pengerjaan SOP:
                  </p>
                  <ul className="space-y-1.5">
                    {svc.scope.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-tight">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Card Footer Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">
                Garansi Resmi Sah
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenEdit(svc)}
                className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 flex items-center gap-1.5 cursor-pointer h-9 px-3.5 shadow-2xs transition-all"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Ubah Tarif</span>
              </Button>
            </div>

          </div>
        ))}
      </div>

      {/* ============================================================== */}
      {/* MODAL UBAH TARIF LAYANAN (BERFUNGSI 100%)                       */}
      {/* ============================================================== */}
      {isEditModalOpen && editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/30 text-sky-400 rounded-xl border border-blue-400/30">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-white">Ubah Tarif & Durasi Layanan</h2>
                  <p className="text-[11px] text-slate-400">ID: #{editingService.id} • {editingService.kode}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs font-sans">
              
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Layanan:
                </label>
                <Input
                  type="text"
                  value={editingService.nama_layanan}
                  onChange={(e) => setEditingService({ ...editingService, nama_layanan: e.target.value })}
                  placeholder="Contoh: Cuci AC Standard"
                  className="rounded-xl border-slate-200 h-10 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tarif Baru (Rp):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rp</span>
                    <Input
                      type="number"
                      step="1000"
                      min="0"
                      value={editingService.harga}
                      onChange={(e) => setEditingService({ ...editingService, harga: Number(e.target.value) })}
                      className="rounded-xl border-slate-200 pl-9 h-10 font-mono font-bold text-slate-900"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-blue-600 mt-1 font-mono font-semibold">
                    Preview: Rp {Number(editingService.harga || 0).toLocaleString('id-ID')}
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Durasi Pengerjaan:
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="15"
                      max="480"
                      step="5"
                      value={editingService.durasi_menit}
                      onChange={(e) => setEditingService({ ...editingService, durasi_menit: Number(e.target.value) })}
                      className="rounded-xl border-slate-200 pr-14 h-10 font-bold text-slate-900"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">Menit</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    SOP waktu kerja teknisi
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kategori:
                  </label>
                  <select
                    value={editingService.kategori}
                    onChange={(e) => setEditingService({ ...editingService, kategori: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white h-10 px-3 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Cleaning">Cleaning</option>
                    <option value="Deep Clean">Deep Clean</option>
                    <option value="Freon & Clean">Freon & Clean</option>
                    <option value="Freon">Freon</option>
                    <option value="Instalasi">Instalasi</option>
                    <option value="Repair">Repair</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Status Layanan:
                  </label>
                  <select
                    value={editingService.aktif ? 'aktif' : 'nonaktif'}
                    onChange={(e) => setEditingService({ ...editingService, aktif: e.target.value === 'aktif' })}
                    className="w-full rounded-xl border border-slate-200 bg-white h-10 px-3 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="aktif">Aktif (Tampil di Booking)</option>
                    <option value="nonaktif">Non-aktif (Disembunyikan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Deskripsi / Keterangan Layanan:
                </label>
                <textarea
                  rows="3"
                  value={editingService.deskripsi}
                  onChange={(e) => setEditingService({ ...editingService, deskripsi: e.target.value })}
                  placeholder="Rincian cakupan paket servis..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={saveLoading}
                  className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer h-10 px-4"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saveLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-10 px-5 cursor-pointer shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                >
                  {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Simpan Perubahan Tarif</span>
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL TAMBAH PAKET SERVIS (BERFUNGSI 100%)                      */}
      {/* ============================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/30 text-sky-400 rounded-xl border border-blue-400/30">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-white">Tambah Paket Servis Baru</h2>
                  <p className="text-[11px] text-slate-400">Daftarkan paket servis ke katalog resmi perusahaan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateService} className="p-6 space-y-4 text-xs font-sans">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kode Layanan:
                  </label>
                  <Input
                    type="text"
                    value={createForm.kode}
                    onChange={(e) => setCreateForm({ ...createForm, kode: e.target.value.toUpperCase() })}
                    placeholder="SRV-CUSTOM-01"
                    className="rounded-xl border-slate-200 h-10 font-mono font-bold uppercase text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kategori:
                  </label>
                  <select
                    value={createForm.kategori}
                    onChange={(e) => setCreateForm({ ...createForm, kategori: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white h-10 px-3 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Cleaning">Cleaning</option>
                    <option value="Deep Clean">Deep Clean</option>
                    <option value="Freon & Clean">Freon & Clean</option>
                    <option value="Freon">Freon</option>
                    <option value="Instalasi">Instalasi</option>
                    <option value="Repair">Repair</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Layanan:
                </label>
                <Input
                  type="text"
                  value={createForm.nama_layanan}
                  onChange={(e) => setCreateForm({ ...createForm, nama_layanan: e.target.value })}
                  placeholder="Contoh: Paket Servis AC Kantor"
                  className="rounded-xl border-slate-200 h-10 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tarif Satuan (Rp):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rp</span>
                    <Input
                      type="number"
                      step="1000"
                      min="0"
                      value={createForm.harga}
                      onChange={(e) => setCreateForm({ ...createForm, harga: Number(e.target.value) })}
                      className="rounded-xl border-slate-200 pl-9 h-10 font-mono font-bold text-slate-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Durasi (Menit):
                  </label>
                  <Input
                    type="number"
                    min="15"
                    max="480"
                    step="5"
                    value={createForm.durasi_menit}
                    onChange={(e) => setCreateForm({ ...createForm, durasi_menit: Number(e.target.value) })}
                    className="rounded-xl border-slate-200 h-10 font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Deskripsi / Keterangan SOP:
                </label>
                <textarea
                  rows="3"
                  value={createForm.deskripsi}
                  onChange={(e) => setCreateForm({ ...createForm, deskripsi: e.target.value })}
                  placeholder="Penjelasan tahapan servis..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={createLoading}
                  className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer h-10 px-4"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={createLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-10 px-5 cursor-pointer shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                >
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Simpan Paket Baru</span>
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
