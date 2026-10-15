import { useState, useEffect } from 'react';
import api from '../../api';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Clock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/toast';

export default function CustomerHistory() {
  const { error: showError } = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/customer/history');
        setHistory(res.data || []);
      } catch (e) {
        showError('Gagal memuat riwayat: ' + (e.response?.data?.error?.message || e.message));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showError]);

  if (loading) return <div className="p-8 text-center">Memuat riwayat servis...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Riwayat Servis</h2>
      </div>

      <div className="space-y-4">
        {history.map(b => (
          <Card key={b.id} className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm hover:shadow-md transition-all">
            <div className={`h-2 ${b.status === 'done' ? 'bg-emerald-500' : b.status === 'cancelled' ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{b.nama_layanan || b.layanan?.nama_layanan || 'Service AC'}</h3>
                    <Badge variant={b.status === 'done' ? 'success' : b.status === 'cancelled' ? 'danger' : 'info'}>
                      {(b.status || '').toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">Kode: <span className="font-mono text-slate-700">{b.kode_booking}</span></p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm mt-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="h-4 w-4" />
                      <span>{b.jadwal_mulai ? new Date(b.jadwal_mulai).toLocaleString('id-ID') : '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="h-4 w-4" />
                      <span>Teknisi: {b.teknisi_nama || 'Belum ada'}</span>
                    </div>
                    {b.brand && (
                      <div className="col-span-1 sm:col-span-2 text-slate-600">
                        Unit: <strong>{b.brand}</strong> ({b.lokasi})
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 justify-center">
                  <Button variant="outline" onClick={() => navigate(`/invoice/${b.kode_booking}`)} className="rounded-xl">
                    E-Invoice
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/status/${b.kode_booking}`)} className="rounded-xl">
                    Lihat Detail
                  </Button>
                  {b.status === 'done' && (
                    <Button onClick={() => navigate(`/feedback/${b.kode_booking}`)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                      Beri Ulasan
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {history.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed rounded-2xl text-slate-500 bg-white border-slate-200/80">
            Belum ada riwayat servis.
          </div>
        )}
      </div>
    </div>
  );
}
