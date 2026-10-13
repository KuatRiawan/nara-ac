import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';
import { Wrench, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import api from '../../api';
import { useToast } from '../../components/ui/toast';

export default function CustomerDashboard() {
  const { user } = useContext(AuthContext);
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/customer/dashboard');
        setData(res.data || res);
      } catch (err) {
        showError('Gagal memuat dashboard: ' + (err.response?.data?.error?.message || err.message));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showError]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-500">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

  const activeBooking = data?.active_bookings?.[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Selamat Datang, {user?.name || 'Pelanggan'}</h2>
          <p className="text-gray-500">Kelola jadwal servis dan unit AC Anda di sini.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/booking')} className="bg-blue-600 hover:bg-blue-700 text-white">
            Booking Service
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Servis</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.history_count || 0}</div>
            <p className="text-xs text-gray-500">Servis selesai</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unit AC</CardTitle>
            <Wrench className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.ac_units_count || 0}</div>
            <p className="text-xs text-gray-500">Unit terdaftar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifikasi Baru</CardTitle>
            <AlertTriangle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-lg">{data?.unread_notifications || 0}</div>
            <p className="text-xs text-gray-500">Belum dibaca</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Jadwal Mendatang & Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            {activeBooking ? (
              <div className="flex flex-col space-y-4 border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{activeBooking.nama_layanan || activeBooking.layanan?.nama_layanan || 'Service AC'}</p>
                    <p className="text-sm text-gray-500">Kode Booking: {activeBooking.kode_booking}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 uppercase">
                    {(activeBooking.status || '').toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div>
                    <p className="text-gray-500">Tanggal & Waktu</p>
                    <p className="font-medium">{activeBooking.jadwal_mulai ? new Date(activeBooking.jadwal_mulai).toLocaleString('id-ID') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Teknisi</p>
                    <p className="font-medium">{activeBooking.teknisi_nama || 'Belum ditugaskan'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t mt-2 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/status/${activeBooking.kode_booking}`)}>
                    Lacak Status
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Belum ada jadwal servis mendatang.</p>
                <Button onClick={() => navigate('/booking')} variant="outline">Booking Sekarang</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Akses Cepat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors shadow-sm" onClick={() => navigate('/customer/ac-units')}>
                <CardContent className="flex flex-col items-center justify-center p-4 text-center h-full">
                  <Wrench className="h-6 w-6 text-blue-600 mb-2" />
                  <h3 className="font-semibold text-sm">My AC</h3>
                  <p className="text-xs text-gray-500">Kelola unit AC</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-gray-50 transition-colors shadow-sm" onClick={() => navigate('/customer/history')}>
                <CardContent className="flex flex-col items-center justify-center p-4 text-center h-full">
                  <FileText className="h-6 w-6 text-blue-600 mb-2" />
                  <h3 className="font-semibold text-sm">Riwayat</h3>
                  <p className="text-xs text-gray-500">Lihat servis</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
