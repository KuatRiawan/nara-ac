import { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { useToast } from '../components/ui/toast';
import { Badge } from '../components/ui/badge';
import { 
  CheckCircle2, MapPin, Phone, Camera, Package, Save, ArrowLeft, RefreshCw, User, Play, ListTodo, ClipboardEdit
} from 'lucide-react';

const STANDARD_SOP = [
  { task: 'Cuci Filter Udara (Indoor)', wajib: true },
  { task: 'Bersihkan Evaporator (Indoor)', wajib: true },
  { task: 'Cek Tekanan Freon', wajib: true },
  { task: 'Bersihkan Kondensor (Outdoor)', wajib: true },
  { task: 'Cek Arus Listrik & Kompresor', wajib: true },
  { task: 'Cek Pipa Kapiler & Sambungan', wajib: false },
  { task: 'Tes Nyala (Running Test)', wajib: true },
];

const API_ORIGIN = (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.startsWith('/')) 
  ? new URL(import.meta.env.VITE_API_URL).origin 
  : '';

export default function TechnicianJobDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useContext(AuthContext);
  const { error: showError, success: showSuccess } = useToast();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [inventory, setInventory] = useState([]);
  
  // Forms state
  const [materialId, setMaterialId] = useState('');
  const [materialQty, setMaterialQty] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [workOrder, setWorkOrder] = useState({ catatan: '' });
  const [newTask, setNewTask] = useState('');

  const fetchJob = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/technician/jobs/${id}`);
      setJob(res.data || res);
      
      // Initialize work order
      setWorkOrder({
        catatan: res.data?.catatan || res?.catatan || ''
      });
    } catch (err) {
      if (err.error?.code === 'NOT_FOUND') {
        showError('Pekerjaan tidak ditemukan.');
        navigate('/technician/dashboard');
      } else {
        showError(err.error?.message || err?.message || 'Gagal memuat detail pekerjaan.');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showError, setJob, setWorkOrder, setLoading]);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await api.get('/technician/inventory');
      setInventory(Array.isArray(res) ? res : (res?.data || []));
    } catch (err) {
      showError('Gagal memuat inventory: ' + (err.response?.data?.error?.message || err.message));
    }
  }, [setInventory, showError]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'technician') {
      navigate('/login');
      return;
    }
    fetchJob();
    fetchInventory();
  }, [id, user, authLoading, navigate, fetchJob, fetchInventory]);

  const updateStatus = async (endpoint) => {
    try {
      setUpdating(true);
      await api.patch(`/technician/jobs/${id}/${endpoint}`);
      await fetchJob();
    } catch (err) {
      const pendingList = err.response?.data?.error?.details?.checklist_pending;
      if (pendingList && pendingList.length > 0) {
        showError(`Masih ada checklist wajib yang belum selesai: ${pendingList.join(', ')}`);
      } else {
        showError(err.response?.data?.error?.message || err.error?.message || err?.message || 'Gagal mengubah status');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleChecklist = async (checklistItem) => {
    const next = checklistItem.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.patch(`/technician/jobs/${id}/checklist/${checklistItem.id}`, { status: next });
      await fetchJob();
    } catch (err) {
      showError(err.response?.data?.error?.message || err.error?.message || 'Gagal mengubah status checklist');
    }
  };

  const handleAddChecklist = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      await api.post(`/technician/jobs/${id}/checklist`, { task: newTask.trim(), wajib: false });
      setNewTask('');
      await fetchJob();
      showSuccess('Item checklist berhasil ditambahkan');
    } catch (err) {
      showError(err.response?.data?.error?.message || err.error?.message || 'Gagal menambah item checklist');
    }
  };

  const handleInitDefaultChecklist = async () => {
    try {
      setUpdating(true);
      for (const item of STANDARD_SOP) {
        await api.post(`/technician/jobs/${id}/checklist`, { task: item.task, wajib: item.wajib });
      }
      await fetchJob();
      showSuccess('SOP Standar berhasil dimuat');
    } catch (err) {
      showError(err.response?.data?.error?.message || err.error?.message || 'Gagal memuat SOP');
    } finally {
      setUpdating(false);
    }
  };

  const addPhoto = async (e, type) => {
    e.preventDefault();
    if (!photoFile) return;
    const form = e.currentTarget;
    try {
      setUpdating(true);
      const body = new FormData();
      body.append('tipe', type);
      body.append('foto', photoFile);
      await api.post(`/technician/jobs/${id}/photos`, body);
      setPhotoFile(null);
      form.reset();
      fetchJob();
    } catch (err) {
      showError(err.error?.message || err.response?.data?.error?.message || 'Gagal menambah foto');
    } finally {
      setUpdating(false);
    }
  };

  const addMaterial = async (e) => {
    e.preventDefault();
    if (!materialId || !materialQty) return;
    try {
      await api.post(`/technician/jobs/${id}/materials`, { item_id: parseInt(materialId), jumlah: parseFloat(materialQty) });
      setMaterialId('');
      setMaterialQty('');
      fetchJob();
    } catch (err) {
      showError(err.response?.data?.error?.message || err.error?.message || 'Gagal menambah material');
    }
  };

  const saveWorkOrder = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/technician/jobs/${id}/work-order`, workOrder);
      await fetchJob();
      showSuccess('Catatan tersimpan');
    } catch (err) {
      showError(err.error?.message || 'Gagal menyimpan catatan');
    }
  };

  const photoSrc = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_ORIGIN}${url}`;
  };

  if (authLoading || loading || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="animate-spin text-primary-500 w-8 h-8"><RefreshCw className="w-full h-full" /></div>
      </div>
    );
  }

  const hasBefore = job.photos?.some(p => p.tipe === 'before');
  const hasAfter = job.photos?.some(p => p.tipe === 'after');
  const pendingWajibCount = job.checklists?.filter(c => c.wajib && c.status === 'pending').length || 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-40">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link to="/technician/dashboard" className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-lg leading-tight text-slate-900">{job.kode_booking}</h1>
            <p className="text-xs text-slate-500">{job.nama_layanan || 'Service AC'}</p>
          </div>
          <Badge variant={job.status === 'scheduled' ? 'warning' : job.status === 'on process' ? 'info' : 'success'}>
            {job.status?.toUpperCase() || ''}
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-6 space-y-6">
        
        {/* Wizard Progress Indicator */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between relative mb-8">
          <div className="absolute top-1/2 left-8 right-8 h-1 bg-slate-100 -translate-y-1/2 z-0 rounded-full"></div>
          <div 
            className="absolute top-1/2 left-8 h-1 bg-blue-500 -translate-y-1/2 z-0 rounded-full transition-all duration-500 ease-in-out" 
            style={{ width: job.status === 'scheduled' ? '0%' : job.status === 'done' ? '100%' : hasBefore ? '66%' : '33%' }}
          ></div>
          
          <div className={`relative z-10 flex flex-col items-center gap-2 ${job.status !== 'scheduled' ? 'text-blue-600' : 'text-slate-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${job.status !== 'scheduled' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-200 text-slate-500'}`}>1</div>
            <span className="text-xs font-bold uppercase tracking-wider">Persiapan</span>
          </div>
          
          <div className={`relative z-10 flex flex-col items-center gap-2 ${job.status === 'on process' || job.status === 'done' ? 'text-blue-600' : 'text-slate-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${(job.status === 'on process' || job.status === 'done') ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-200 text-slate-500'}`}>2</div>
            <span className="text-xs font-bold uppercase tracking-wider">Pengerjaan</span>
          </div>
          
          <div className={`relative z-10 flex flex-col items-center gap-2 ${job.status === 'done' ? 'text-blue-600' : 'text-slate-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${job.status === 'done' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-200 text-slate-500'}`}>3</div>
            <span className="text-xs font-bold uppercase tracking-wider">Selesai</span>
          </div>
        </div>

        {/* Tampilan Scheduled */}
        {job.status === 'scheduled' && (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-sm text-slate-700">Detail Pekerjaan</h2>
            </div>
            <div className="p-4 space-y-4 text-sm text-slate-800">
              <div className="flex justify-between items-start">
                <span className="text-slate-500 w-1/3">Pelanggan</span>
                <span className="font-medium flex-1 text-right">{job.nama_customer || job.nama || '-'}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-slate-500 w-1/3">Kontak</span>
                <a href={`https://wa.me/${String(job.kontak_customer || '').replace(/\D/g,'')}`} className="font-medium text-primary-600 flex items-center gap-1 flex-1 justify-end">
                  <Phone className="w-3 h-3" /> {job.kontak_customer || '-'}
                </a>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-slate-500 w-1/3">Alamat</span>
                <span className="font-medium flex-1 text-right flex items-start justify-end gap-1">
                   <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                   {job.alamat}
                </span>
              </div>
              <div className="flex justify-between items-start pt-3 border-t border-slate-100">
                <span className="text-slate-500 w-1/3">Keluhan</span>
                <span className="font-medium flex-1 text-right text-orange-600 bg-orange-50 px-2 py-1 rounded-md">{job.keluhan || '-'}</span>
              </div>
            </div>
          </section>
        )}

        {/* Tampilan On Process: Minta Foto Sebelum jika belum ada */}
        {job.status === 'on process' && !hasBefore && (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-blue-50 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-sm text-blue-800">Langkah 1: Foto Sebelum Pengerjaan</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-6 text-center">Silakan ambil dan unggah foto kondisi AC sebelum mulai dikerjakan.</p>
              <form onSubmit={(e) => addPhoto(e, 'before')} className="space-y-4 max-w-sm mx-auto">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition">
                  <input type="file" id="before-photo" accept="image/png,image/jpeg,image/webp" onChange={e => setPhotoFile(e.target.files?.[0] || null)} className="hidden" />
                  <label htmlFor="before-photo" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                    <Camera className="w-8 h-8 text-slate-500" />
                    <span className="text-sm font-medium text-slate-600">{photoFile ? photoFile.name : 'Pilih Foto Sebelum'}</span>
                  </label>
                </div>
                <button type="submit" disabled={!photoFile || updating} className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 transition">
                  {updating ? 'Mengunggah...' : 'Unggah & Lanjut'}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* Tampilan On Process: Laporan Pekerjaan (jika sudah ada foto sebelum) */}
        {job.status === 'on process' && hasBefore && (
          <>
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-slate-500" />
                  <h2 className="font-semibold text-sm text-slate-700">Checklist SOP Pengerjaan</h2>
                </div>
                {job.checklists && job.checklists.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {job.checklists.filter(c => c.status === 'completed').length} / {job.checklists.length} Selesai
                    </span>
                    {pendingWajibCount > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        {pendingWajibCount} Wajib Belum
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="p-4">
                {(!job.checklists || job.checklists.length === 0) ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-slate-500 mb-3">Belum ada item checklist untuk pekerjaan ini.</p>
                    <button
                      type="button"
                      onClick={handleInitDefaultChecklist}
                      disabled={updating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                    >
                      Inisialisasi SOP Standar (7 Langkah)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {job.checklists.map(item => {
                      const isDone = item.status === 'completed';
                      return (
                        <label htmlFor="technician-job-detail-f1" 
                          key={item.id} 
                          className={`flex items-center gap-3 p-3 rounded-lg border transition cursor-pointer ${
                            isDone 
                              ? 'bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50/70' 
                              : item.wajib 
                                ? 'bg-white border-amber-200 hover:border-amber-300 hover:bg-amber-50/30' 
                                : 'bg-white border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            id="technician-job-detail-f1" 
                            type="checkbox" 
                            checked={isDone} 
                            onChange={() => handleToggleChecklist(item)}
                            className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                          />
                          <span className={`text-sm flex-1 ${isDone ? 'text-slate-500 line-through' : 'text-slate-800 font-medium'}`}>
                            {item.task}
                          </span>
                          {item.wajib ? (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              Wajib
                            </span>
                          ) : (
                            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              Opsional
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Form Tambah Checklist Custom */}
                <form onSubmit={handleAddChecklist} className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                  <input
                    type="text"
                    placeholder="Tambah item SOP / catatan pekerjaan lain..."
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    className="flex-1 text-xs rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 py-1.5"
                  />
                  <button
                    type="submit"
                    disabled={!newTask.trim()}
                    className="bg-slate-100 text-slate-700 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-200 text-xs transition disabled:opacity-50"
                  >
                    + Tambah
                  </button>
                </form>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-500" />
                <h2 className="font-semibold text-sm text-slate-700">Material yang Dipakai</h2>
              </div>
              <div className="p-4">
                <ul className="space-y-3 mb-4 text-sm">
                  {job.materials?.map(m => (
                    <li key={m.id} className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <span className="font-medium text-slate-800">{m.nama}</span>
                      <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-xs">{m.jumlah} {m.satuan}</span>
                    </li>
                  ))}
                  {(!job.materials || job.materials.length === 0) && (
                    <p className="text-sm text-slate-500 italic">Belum ada material ditambahkan.</p>
                  )}
                </ul>
                <form onSubmit={addMaterial} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
                  <select 
                    value={materialId} 
                    onChange={e=>setMaterialId(e.target.value)} 
                    className="flex-1 text-sm rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Pilih Material...</option>
                    {Array.isArray(inventory) && inventory.map(item => (
                      <option key={item.id} value={item.id}>{item.nama} (Stok: {item.stok} {item.satuan})</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Jml" step="0.1" value={materialQty} onChange={e=>setMaterialQty(e.target.value)} className="w-20 text-sm rounded-lg border-slate-300 focus:ring-primary-500" required />
                    <button type="submit" className="bg-primary-100 text-primary-700 font-medium px-4 py-2 rounded-lg hover:bg-primary-200 text-sm transition">
                      Tambah
                    </button>
                  </div>
                </form>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardEdit className="w-4 h-4 text-slate-500" />
                  <h2 className="font-semibold text-sm text-slate-700">Catatan Teknisi</h2>
                </div>
              </div>
              <div className="p-4">
                <form onSubmit={saveWorkOrder} className="space-y-3">
                  <textarea
                    value={workOrder.catatan}
                    onChange={e => setWorkOrder({ ...workOrder, catatan: e.target.value })}
                    placeholder="Masukkan catatan jika ada (opsional)"
                    className="w-full text-sm rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 min-h-[80px]"
                  />
                  <button type="submit" className="w-full bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 text-sm flex items-center justify-center gap-2 transition">
                    <Save className="w-4 h-4" /> Simpan Catatan
                  </button>
                </form>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-500" />
                <h2 className="font-semibold text-sm text-slate-700">Foto Sesudah Pengerjaan</h2>
              </div>
              <div className="p-4">
                {hasAfter ? (
                  <div className="mb-4">
                    {job.photos.filter(p => p.tipe === 'after').map(p => (
                      <div key={p.id} className="relative aspect-video max-w-sm mx-auto bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                        <img src={photoSrc(p.url_foto)} alt="Sesudah" className="object-cover w-full h-full" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1.5 text-center font-medium">Foto Sesudah</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={(e) => addPhoto(e, 'after')} className="space-y-4 max-w-sm mx-auto">
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition">
                      <input type="file" id="after-photo" accept="image/png,image/jpeg,image/webp" onChange={e => setPhotoFile(e.target.files?.[0] || null)} className="hidden" />
                      <label htmlFor="after-photo" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                        <Camera className="w-8 h-8 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">{photoFile ? photoFile.name : 'Pilih Foto Sesudah'}</span>
                      </label>
                    </div>
                    <button type="submit" disabled={!photoFile || updating} className="w-full bg-blue-100 text-blue-700 font-medium py-3 rounded-lg hover:bg-blue-200 text-sm disabled:opacity-50 transition">
                      {updating ? 'Mengunggah...' : 'Unggah Foto'}
                    </button>
                  </form>
                )}
              </div>
            </section>
          </>
        )}

        {/* Tampilan Done */}
        {job.status === 'done' && (
          <>
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-center p-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="font-bold text-xl text-slate-900 mb-2">Pekerjaan Selesai</h2>
              <p className="text-sm text-slate-500">Seluruh SOP pengerjaan dan dokumentasi servis telah berhasil disimpan.</p>
            </section>

            {job.checklists && job.checklists.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-emerald-600" />
                    <h2 className="font-semibold text-sm text-slate-700">Ringkasan SOP Selesai</h2>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {job.checklists.filter(c => c.status === 'completed').length} / {job.checklists.length} Terverifikasi
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  {job.checklists.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-50/30 border border-emerald-100/60 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="flex-1 font-medium text-slate-700">{item.task}</span>
                      {item.wajib ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Wajib
                        </span>
                      ) : (
                        <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          Opsional
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {job.materials && job.materials.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-500" />
                  <h2 className="font-semibold text-sm text-slate-700">Material yang Digunakan</h2>
                </div>
                <div className="p-4">
                  <ul className="space-y-2 text-sm">
                    {job.materials.map(m => (
                      <li key={m.id} className="flex justify-between items-center border-b border-slate-50 pb-2">
                        <span className="font-medium text-slate-800">{m.nama}</span>
                        <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-xs">{m.jumlah} {m.satuan}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
            
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-500" />
                <h2 className="font-semibold text-sm text-slate-700">Dokumentasi Foto</h2>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {job.photos?.map(p => (
                  <div key={p.id} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                    <img src={photoSrc(p.url_foto)} alt={p.tipe} className="object-cover w-full h-full" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center font-medium capitalize">
                      {p.tipe === 'before' ? 'Sebelum' : 'Sesudah'}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Floating Action Bar */}
      {job.status !== 'done' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <div className="max-w-3xl mx-auto flex justify-end">
            {job.status === 'scheduled' && (
              <button 
                onClick={() => updateStatus('start')} 
                disabled={updating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
              >
                {updating ? 'Memproses...' : <><Play className="w-5 h-5 fill-current" /> Mulai Pekerjaan</>}
              </button>
            )}
            
            {job.status === 'on process' && hasBefore && (
              <div className="w-full flex flex-col gap-2">
                {!hasAfter && (
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-center font-medium">
                    📸 Unggah foto sesudah pengerjaan terlebih dahulu.
                  </p>
                )}
                {pendingWajibCount > 0 && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-center font-medium">
                    ⚠️ Masih ada {pendingWajibCount} item SOP wajib yang belum dicentang.
                  </p>
                )}
                <button 
                  onClick={() => updateStatus('complete')} 
                  disabled={updating || !hasAfter || pendingWajibCount > 0}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-green-200 transition-all disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 cursor-pointer disabled:cursor-not-allowed"
                >
                  {updating ? 'Memproses...' : <><CheckCircle2 className="w-5 h-5" /> Selesaikan Pekerjaan</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
