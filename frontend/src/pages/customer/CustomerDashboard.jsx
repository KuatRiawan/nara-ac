import { useContext, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthContext } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';
import { Wrench, FileText, CheckCircle, Bell, CalendarCheck, ArrowRight, Plus, Wind } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
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
      <div className="space-y-6">
        <div className="h-10 bg-slate-100 animate-pulse rounded-xl w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-white animate-pulse rounded-2xl border border-slate-200/60" />
          ))}
        </div>
        <div className="h-48 bg-white animate-pulse rounded-2xl border border-slate-200/60" />
      </div>
    );
  }

  const activeBooking = data?.active_bookings?.[0];

  const stats = [
    { label: 'Total Servis', value: data?.history_count || 0, icon: CheckCircle, color: 'emerald', desc: 'Servis selesai' },
    { label: 'Unit AC', value: data?.ac_units_count || 0, icon: Wind, color: 'blue', desc: 'Unit terdaftar' },
    { label: 'Notifikasi', value: data?.unread_notifications || 0, icon: Bell, color: 'amber', desc: 'Belum dibaca' },
  ];

  const colorMap = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', value: 'text-emerald-700' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', value: 'text-blue-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', value: 'text-amber-700' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Selamat Datang, {user?.nama || user?.name || 'Pelanggan'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Kelola jadwal servis dan unit AC Anda di sini.</p>
        </div>
        <Button
          onClick={() => navigate('/booking')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11 px-5 shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Booking Service</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const c = colorMap[stat.color];
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{stat.label}</p>
                <p className={cn("text-3xl font-black mt-1", c.value)}>{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.desc}</p>
              </div>
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", c.bg, c.text)}>
                <Icon className="w-6 h-6" />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Active Booking */}
        <Card className="lg:col-span-4 rounded-2xl border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <h3 className="font-black text-slate-900 text-sm">Jadwal Mendatang & Aktif</h3>
          </div>
          <CardContent className="p-6">
            {activeBooking ? (
              <div className="flex flex-col space-y-4 border border-sky-100 rounded-2xl p-5 bg-sky-50/30">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-base text-slate-900">{activeBooking.nama_layanan || activeBooking.layanan?.nama_layanan || 'Service AC'}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">Kode: {activeBooking.kode_booking}</p>
                  </div>
                  <Badge variant="info" className="font-bold text-xs uppercase">
                    {(activeBooking.status || '').toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">Tanggal & Waktu</p>
                    <p className="font-bold text-slate-800 text-xs mt-0.5">{activeBooking.jadwal_mulai ? new Date(activeBooking.jadwal_mulai).toLocaleString('id-ID') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">Teknisi</p>
                    <p className="font-bold text-slate-800 text-xs mt-0.5">{activeBooking.teknisi_nama || 'Belum ditugaskan'}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-sky-100 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/status/${activeBooking.kode_booking}`)}
                    className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold hover:bg-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Lacak Status</span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                  <CalendarCheck className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-slate-700">Belum ada jadwal servis mendatang</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Buat booking baru untuk menjadwalkan servis AC Anda</p>
                <Button
                  onClick={() => navigate('/booking')}
                  variant="outline"
                  className="rounded-xl border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50 cursor-pointer"
                >
                  Booking Sekarang
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Access */}
        <Card className="lg:col-span-3 rounded-2xl border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <h3 className="font-black text-slate-900 text-sm">Akses Cepat</h3>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/customer/ac-units')}
                className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-50/70 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-200 transition-all cursor-pointer group text-center"
              >
                <div className="w-11 h-11 rounded-2xl bg-white text-blue-600 flex items-center justify-center mb-2.5 shadow-2xs group-hover:scale-105 transition-transform">
                  <Wind className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-800 text-xs">Unit AC Saya</h4>
                <p className="text-xs text-slate-500 mt-0.5">Kelola unit AC</p>
              </button>

              <button
                onClick={() => navigate('/customer/history')}
                className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-50/70 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-200 transition-all cursor-pointer group text-center"
              >
                <div className="w-11 h-11 rounded-2xl bg-white text-blue-600 flex items-center justify-center mb-2.5 shadow-2xs group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-800 text-xs">Riwayat</h4>
                <p className="text-xs text-slate-500 mt-0.5">Lihat servis</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
