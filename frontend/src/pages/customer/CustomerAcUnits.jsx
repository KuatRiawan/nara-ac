import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '../../components/ui/toast';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

export default function CustomerAcUnits() {
  const { error: showError } = useToast();
  const location = useLocation();
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
      setUnits(res.data || []);
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

  if (loading) return <div className="p-8 text-center">Memuat unit AC...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manajemen Unit AC</h2>
        <Button onClick={() => { setEditingId(null); setFormData({ brand: '', model: '', tipe: '', kapasitas_pk: '', lokasi: '', tanggal_pasang: '', nomor_seri: '', catatan: '' }); setShowForm(!showForm); }} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Tambah Unit
        </Button>
      </div>

      {showForm && (
        <Card className="bg-white border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200"><CardTitle>{editingId ? 'Edit Unit AC' : 'Tambah Unit AC Baru'}</CardTitle></CardHeader>
          <CardContent className="bg-white">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label htmlFor="ac-brand" className="block text-sm font-medium text-slate-700">Merek / Brand *</label><input id="ac-brand" required value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" /></div>
              <div><label htmlFor="ac-lokasi" className="block text-sm font-medium text-slate-700">Lokasi / Ruangan *</label><input id="ac-lokasi" required value={formData.lokasi} onChange={e => setFormData({...formData, lokasi: e.target.value})} placeholder="Contoh: Kamar Utama" className="mt-1 block w-full rounded-md border-slate-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" /></div>
              <div><label htmlFor="ac-model" className="block text-sm font-medium text-slate-700">Model</label><input id="ac-model" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" /></div>
              <div><label htmlFor="ac-kapasitas" className="block text-sm font-medium text-slate-700">Kapasitas (PK)</label><input id="ac-kapasitas" type="number" step="0.5" value={formData.kapasitas_pk} onChange={e => setFormData({...formData, kapasitas_pk: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" /></div>
              <div><label htmlFor="ac-nomor-seri" className="block text-sm font-medium text-slate-700">Nomor Seri</label><input id="ac-nomor-seri" value={formData.nomor_seri} onChange={e => setFormData({...formData, nomor_seri: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" /></div>
              <div><label htmlFor="ac-tanggal-pasang" className="block text-sm font-medium text-slate-700">Tanggal Pasang</label><input id="ac-tanggal-pasang" type="date" value={formData.tanggal_pasang} onChange={e => setFormData({...formData, tanggal_pasang: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" /></div>
              <div className="md:col-span-2"><label htmlFor="ac-catatan" className="block text-sm font-medium text-slate-700">Catatan</label><textarea id="ac-catatan" value={formData.catatan} onChange={e => setFormData({...formData, catatan: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" rows="2"></textarea></div>
              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>Batal</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {units.map(u => (
          <Card key={u.id} className="rounded-2xl border-slate-200/80 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4 relative">
              <div className="absolute top-4 right-4 flex gap-1">
                <button onClick={() => { setEditingId(u.id); setFormData({ brand: u.brand||'', model: u.model||'', tipe: u.tipe||'', kapasitas_pk: u.kapasitas_pk||'', lokasi: u.lokasi||'', tanggal_pasang: u.tanggal_pasang ? u.tanggal_pasang.split('T')[0] : '', nomor_seri: u.nomor_seri||'', catatan: u.catatan||'' }); setShowForm(true); }} className="p-1 text-slate-500 hover:text-blue-600" aria-label={`Edit unit AC ${u.brand} di ${u.lokasi}`}><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(u.id)} disabled={deletingId === u.id} className="p-1 text-slate-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed" aria-label={`Hapus unit AC ${u.brand} di ${u.lokasi}`}>
                  {deletingId === u.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
              <h3 className="font-bold text-lg">{u.brand} <span className="text-sm font-normal text-slate-500">({u.kapasitas_pk ? `${u.kapasitas_pk} PK` : 'N/A'})</span></h3>
              <p className="text-slate-600 text-sm mb-2">{u.lokasi}</p>
              <div className="text-xs text-slate-500 grid grid-cols-2 gap-1">
                <div>Model: {u.model || '-'}</div>
                <div>Seri: {u.nomor_seri || '-'}</div>
                <div className="col-span-2">Catatan: {u.catatan || '-'}</div>
              </div>
            </CardContent>
          </Card>
        ))}
        {units.length === 0 && !showForm && (
          <div className="col-span-full p-8 text-center border-2 border-dashed rounded-2xl text-slate-500 bg-white border-slate-200/80">
            Anda belum mendaftarkan unit AC.
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
