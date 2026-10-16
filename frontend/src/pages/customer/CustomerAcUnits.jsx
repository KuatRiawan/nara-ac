import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Plus, Edit2, Trash2, RefreshCw, Calendar, ArrowRight } from 'lucide-react';
import { useToast } from '../../components/ui/toast';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { cn } from '../../lib/utils';

export default function CustomerAcUnits() {
  const { error: showError } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ brand: '', model: '', tipe: '', kapasitas_pk: '', lokasi: '', tanggal_pasang: '', nomor_seri: '', catatan: '' });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, unitId: null, unitInfo: '' });
  
  // Close form when route changes
  useEffect(() => {
    setShowForm(false);
    setEditingId(null);
  }, [location.pathname]);

  const fetchUnits = useCallback(async () => {
    try {
      const res = await api.get('/customer/ac-units');
      setUnits(res.data?.data || res.data || []);
    } catch (e) {
      showError('Gagal memuat data unit AC: ' + (e.response?.data?.error?.message || e.message));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { fetchUnits(); }, [fetchUnits]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...formData, kapasitas_pk: formData.kapasitas_pk ? parseFloat(formData.kapasitas_pk) : null, tanggal_pasang: formData.tanggal_pasang || null };
      if (editingId) {
        await api.patch(`/customer/ac-units/${editingId}`, payload);
      } else {
        await api.post('/customer/ac-units', payload);
      }
      setShowForm(false);
      fetchUnits();
    } catch (e) {
      showError('Gagal menyimpan data: ' + (e.response?.data?.error?.message || e.message));
    } finally {
      setSubmitting(false);
    }
  };

  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    const unit = units.find(u => u.id === id);
    setDeleteConfirmation({
      isOpen: true,
      unitId: id,
      unitInfo: unit ? `${unit.brand} (${unit.lokasi})` : 'Unit AC ini'
    });
  };

  const confirmDelete = async () => {
    const { unitId } = deleteConfirmation;
    setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
    setDeletingId(unitId);
    try {
      await api.delete(`/customer/ac-units/${unitId}`);
      fetchUnits();
    } catch (e) {
      showError('Gagal menghapus data: ' + (e.response?.data?.error?.message || e.message));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Memuat unit AC...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Unit AC & Perawatan</h2>
          <p className="text-xs text-slate-500 mt-0.5">Pantau riwayat servis dan jadwal perawatan berkala unit AC Anda.</p>
        </div>
        <Button onClick={() => { setEditingId(null); setFormData({ brand: '', model: '', tipe: '', kapasitas_pk: '', lokasi: '', tanggal_pasang: '', nomor_seri: '', catatan: '' }); setShowForm(!showForm); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer">
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Unit
        </Button>
      </div>

      {showForm && (
        <Card className="bg-white border-slate-200 rounded-2xl shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-2xl"><CardTitle className="text-base font-bold text-slate-900">{editingId ? 'Edit Unit AC' : 'Tambah Unit AC Baru'}</CardTitle></CardHeader>
          <CardContent className="bg-white p-5">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div><label htmlFor="ac-brand" className="block font-bold text-slate-700 mb-1">Merek / Brand *</label><input id="ac-brand" required value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="block w-full rounded-xl border-slate-200 bg-white shadow-2xs focus:border-blue-500 focus:ring-blue-500 p-2.5 border font-medium" placeholder="Contoh: Daikin, Panasonic, Sharp" /></div>
              <div><label htmlFor="ac-lokasi" className="block font-bold text-slate-700 mb-1">Lokasi / Ruangan *</label><input id="ac-lokasi" required value={formData.lokasi} onChange={e => setFormData({...formData, lokasi: e.target.value})} placeholder="Contoh: Kamar Utama, Ruang Tamu" className="block w-full rounded-xl border-slate-200 bg-white shadow-2xs focus:border-blue-500 focus:ring-blue-500 p-2.5 border font-medium" /></div>
              <div><label htmlFor="ac-model" className="block font-bold text-slate-700 mb-1">Model / Tipe</label><input id="ac-model" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="Contoh: Inverter / Standard" className="block w-full rounded-xl border-slate-200 bg-white shadow-2xs focus:border-blue-500 focus:ring-blue-500 p-2.5 border font-medium" /></div>
              <div><label htmlFor="ac-kapasitas" className="block font-bold text-slate-700 mb-1">Kapasitas (PK)</label><input id="ac-kapasitas" type="number" step="0.5" value={formData.kapasitas_pk} onChange={e => setFormData({...formData, kapasitas_pk: e.target.value})} placeholder="0.5, 1, 1.5, 2" className="block w-full rounded-xl border-slate-200 bg-white shadow-2xs focus:border-blue-500 focus:ring-blue-500 p-2.5 border font-medium" /></div>
              <div><label htmlFor="ac-nomor-seri" className="block font-bold text-slate-700 mb-1">Nomor Seri</label><input id="ac-nomor-seri" value={formData.nomor_seri} onChange={e => setFormData({...formData, nomor_seri: e.target.value})} placeholder="Opsional nomor seri unit" className="block w-full rounded-xl border-slate-200 bg-white shadow-2xs focus:border-blue-500 focus:ring-blue-500 p-2.5 border font-medium" /></div>
              <div><label htmlFor="ac-tanggal-pasang" className="block font-bold text-slate-700 mb-1">Tanggal Pasang</label><input id="ac-tanggal-pasang" type="date" value={formData.tanggal_pasang} onChange={e => setFormData({...formData, tanggal_pasang: e.target.value})} className="block w-full rounded-xl border-slate-200 bg-white shadow-2xs focus:border-blue-500 focus:ring-blue-500 p-2.5 border font-medium" /></div>
              <div className="md:col-span-2"><label htmlFor="ac-catatan" className="block font-bold text-slate-700 mb-1">Catatan Tambahan</label><textarea id="ac-catatan" value={formData.catatan} onChange={e => setFormData({...formData, catatan: e.target.value})} placeholder="Kondisi awal, riwayat perbaikan sebelumnya, dll." className="block w-full rounded-xl border-slate-200 bg-white shadow-2xs focus:border-blue-500 focus:ring-blue-500 p-2.5 border font-medium" rows="2"></textarea></div>
              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={submitting} className="rounded-xl font-bold cursor-pointer">Batal</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Unit'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {units.map(u => {
          const isDue = u.status_perawatan === 'jatuh_tempo';
          const isNeedService = u.status_perawatan === 'perlu_servis';
          const isScheduled = u.status_perawatan === 'terjadwal';

          return (
            <Card key={u.id} className="rounded-2xl border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
              <CardContent className="p-5 relative space-y-3">
                <div className="absolute top-4 right-4 flex gap-1">
                  <button onClick={() => { setEditingId(u.id); setFormData({ brand: u.brand||'', model: u.model||'', tipe: u.tipe||'', kapasitas_pk: u.kapasitas_pk||'', lokasi: u.lokasi||'', tanggal_pasang: u.tanggal_pasang ? u.tanggal_pasang.split('T')[0] : '', nomor_seri: u.nomor_seri||'', catatan: u.catatan||'' }); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label={`Edit unit AC ${u.brand} di ${u.lokasi}`}><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(u.id)} disabled={deletingId === u.id} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 disabled:opacity-50 cursor-pointer" aria-label={`Hapus unit AC ${u.brand} di ${u.lokasi}`}>
                    {deletingId === u.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-2xs font-black uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {u.brand}
                    </span>
                    <Badge variant={isDue ? 'destructive' : isNeedService ? 'warning' : isScheduled ? 'info' : 'success'} className="text-2xs font-bold uppercase">
                      {isDue ? 'Jatuh Tempo Perawatan' : isNeedService ? 'Perlu Servis Segera' : isScheduled ? 'Servis Terjadwal' : 'Kondisi Optimal'}
                    </Badge>
                  </div>
                  <h3 className="font-black text-lg text-slate-900 mt-1">{u.lokasi}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {u.model || 'Standard'} • {u.kapasitas_pk ? `${u.kapasitas_pk} PK` : 'N/A'} {u.nomor_seri && `• SN: ${u.nomor_seri}`}
                  </p>
                </div>

                {/* BR-15, BR-16: Riwayat & Prediksi Perawatan */}
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Total Servis Selesai:</span>
                    <span className="font-bold text-slate-800">{u.total_servis_selesai || 0} Kali</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Servis Terakhir:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[160px]">
                      {u.servis_terakhir?.nama_layanan ? `${u.servis_terakhir.nama_layanan} (${new Date(u.servis_terakhir.tanggal).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })})` : 'Belum ada servis'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                    <span className="text-slate-600 font-bold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>Jadwal Perawatan:</span>
                    </span>
                    <span className={cn("font-black", isDue ? "text-rose-600" : isNeedService ? "text-amber-600" : "text-emerald-700")}>
                      {u.jadwal_perawatan_berikutnya ? new Date(u.jadwal_perawatan_berikutnya).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Jadwalkan berkala'}
                    </span>
                  </div>
                </div>

                {u.catatan && (
                  <p className="text-xs text-slate-500 italic bg-white p-2 rounded border border-slate-100">
                    "{u.catatan}"
                  </p>
                )}

                <div className="pt-2">
                  <Button
                    onClick={() => navigate(`/booking?layanan=1&ac_unit_id=${u.id}`)}
                    variant={isDue || isNeedService ? "default" : "outline"}
                    className={cn(
                      "w-full text-xs font-bold rounded-xl h-9 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs",
                      (isDue || isNeedService) ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span>Booking Servis untuk Unit Ini</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {units.length === 0 && !showForm && (
          <div className="col-span-full p-12 text-center border-2 border-dashed rounded-2xl text-slate-500 bg-white border-slate-200/80">
            <p className="font-bold text-slate-800 text-sm">Belum ada unit AC yang didaftarkan</p>
            <p className="text-xs text-slate-500 mt-1">Daftarkan unit AC Anda untuk memantau riwayat servis dan jadwal perawatan otomatis.</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Delete */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, unitId: null, unitInfo: '' })}
        title="Hapus Unit AC"
        message={`Apakah Anda yakin ingin menghapus ${deleteConfirmation.unitInfo}? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
}
