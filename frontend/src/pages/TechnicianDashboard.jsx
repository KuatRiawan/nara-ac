import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  MapPin, Clock, ArrowRight, User, 
  CheckCircle, History, ClipboardList, ChevronRight,
  Phone, Search, ShieldCheck
} from 'lucide-react';
import { useToast } from '../components/ui/toast';
import { cn } from '../lib/utils';
import DashboardLayout from '../components/layout/DashboardLayout';

export default function TechnicianDashboard() {
  const { user, loading: authLoading, logout } = useContext(AuthContext);
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'technician') {
      navigate('/login');
      return;
    }

    const fetchJobs = async () => {
      try {
        setLoading(true);
        const res = await api.get('/technician/jobs');
        setJobs(res.data || []);
      } catch (err) {
        showError('Gagal memuat pekerjaan: ' + (err.response?.data?.error?.message || err.message));
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [user, authLoading, navigate, showError]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-gray-500 font-bold">Memuat sesi...</div>;
  if (!user) return null;

  // Split jobs
  const todayJobs = jobs.filter(job => {
    if (!job.jadwal_mulai) return false;
    const jobDate = new Date(job.jadwal_mulai).toDateString();
    const today = new Date().toDateString();
    return jobDate === today;
  });

  const upcomingJobs = jobs.filter(job => {
    if (!job.jadwal_mulai) return false;
    const jobDate = new Date(job.jadwal_mulai).getTime();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return jobDate > todayEnd.getTime();
  });

  const completedJobs = jobs.filter(job => job.status?.toLowerCase() === 'done');
  const inProgressJobs = jobs.filter(job => job.status?.toLowerCase() === 'on process');

  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'scheduled': 
        return <Badge className="bg-amber-100 text-amber-800 font-bold border-amber-200">TERJADWAL</Badge>;
      case 'on process': 
        return <Badge className="bg-blue-100 text-blue-800 font-bold border-blue-200 animate-pulse">DIPROSES</Badge>;
      case 'done': 
        return <Badge className="bg-emerald-100 text-emerald-800 font-bold border-emerald-200">SELESAI</Badge>;
      default: 
        return <Badge className="bg-gray-100 text-gray-800 font-bold border-gray-200">{(status || '').toUpperCase()}</Badge>;
    }
  };

  const renderJobCard = (job) => (
    <Card key={job.id} className="shadow-sm hover:shadow-md border border-gray-100 rounded-2xl overflow-hidden transition-all bg-white">
      <div className="p-4 sm:p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {getStatusBadge(job.status)}
            <span className="text-xs font-mono font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
              {job.kode_booking}
            </span>
          </div>
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {job.jadwal_mulai ? new Date(job.jadwal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-'}
          </span>
        </div>

        <h3 className="font-bold text-lg text-gray-900 mb-1">{job.nama_layanan || 'Servis AC'}</h3>

        <div className="mt-3 space-y-2 text-sm text-gray-600 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100/80">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="font-semibold text-gray-900">{job.nama_customer || job.nama || 'Pelanggan'}</span>
            {job.telepon && (
              <a 
                href={`tel:${job.telepon}`} 
                className="ml-auto inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                onClick={e => e.stopPropagation()}
              >
                <Phone className="w-3.5 h-3.5" /> Hubungi
              </a>
            )}
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2 text-xs sm:text-sm text-gray-600">{job.alamat || 'Alamat tidak dicantumkan'}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            {job.jadwal_mulai ? new Date(job.jadwal_mulai).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
          </div>
          <Link 
            to={`/technician/jobs/${job.id}`} 
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-sm transition-all"
          >
            {job.status === 'scheduled' ? 'Mulai Kerja' : job.status === 'on process' ? 'Lanjutkan' : 'Detail'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </Card>
  );

  // Subviews based on pathname
  const currentPath = location.pathname.replace(/\/$/, '');

  const renderContent = () => {
    // 1. JOBS LIST TAB (/technician/jobs)
    if (currentPath === '/technician/jobs') {
      const filteredJobs = jobs.filter(job => {
        const matchesStatus = statusFilter === 'all' || job.status?.toLowerCase() === statusFilter.toLowerCase();
        const matchesSearch = !searchQuery || 
          job.kode_booking?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.nama_customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.nama_layanan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.alamat?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      });

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Semua Tugas</h2>
              <p className="text-xs sm:text-sm text-gray-500">Kelola dan update status tiket pekerjaan Anda</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari kode, nama, alamat..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Semua', count: jobs.length },
              { id: 'scheduled', label: 'Terjadwal', count: jobs.filter(j => j.status?.toLowerCase() === 'scheduled').length },
              { id: 'on process', label: 'Diproses', count: inProgressJobs.length },
              { id: 'done', label: 'Selesai', count: completedJobs.length }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border",
                  statusFilter === f.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                )}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          {filteredJobs.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-gray-100">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-700">Tidak ada pekerjaan yang cocok</p>
              <p className="text-xs text-gray-400 mt-1">Coba ganti filter atau kata kunci pencarian</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredJobs.map(renderJobCard)}
            </div>
          )}
        </div>
      );
    }

    // 2. SCHEDULE TAB (/technician/schedule)
    if (currentPath === '/technician/schedule') {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Jadwal Tugas</h2>
            <p className="text-xs sm:text-sm text-gray-500">Daftar agenda pekerjaan servis AC Anda</p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Hari Ini
              </h3>
              {todayJobs.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-2xl border border-gray-100 text-sm text-gray-500">
                  Tidak ada jadwal pekerjaan untuk hari ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todayJobs.map(renderJobCard)}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Mendatang
              </h3>
              {upcomingJobs.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-2xl border border-gray-100 text-sm text-gray-500">
                  Tidak ada jadwal mendatang yang tercatat.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingJobs.map(renderJobCard)}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 3. HISTORY TAB (/technician/history)
    if (currentPath === '/technician/history') {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Riwayat Pekerjaan Selesai</h2>
            <p className="text-xs sm:text-sm text-gray-500">Daftar servis yang telah berhasil dikerjakan</p>
          </div>

          {completedJobs.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-gray-100">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-700">Belum ada riwayat pekerjaan selesai</p>
              <p className="text-xs text-gray-400 mt-1">Selesaikan tiket pekerjaan untuk melihat rekap riwayat di sini</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedJobs.map(renderJobCard)}
            </div>
          )}
        </div>
      );
    }

    // 4. PROFILE TAB (/technician/profile)
    if (currentPath === '/technician/profile') {
      return (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-blue-500/20">
                {(user.nama || 'T').charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">{user.nama || 'Teknisi NARA'}</h2>
                <Badge className="bg-blue-100 text-blue-700 font-bold border-blue-200 mt-1">Teknisi Lapangan</Badge>
              </div>
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-4 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Email Akun</span>
                <span className="font-semibold text-gray-900">{user.email || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Total Pekerjaan</span>
                <span className="font-semibold text-gray-900">{jobs.length} Tugas</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Tugas Selesai</span>
                <span className="font-semibold text-emerald-600">{completedJobs.length} Tiket</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500 font-medium">Status Akun</span>
                <span className="font-semibold text-blue-600 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Aktif
                </span>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100">
              <button
                onClick={logout}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                Keluar dari Akun
              </button>
            </div>
          </div>
        </div>
      );
    }

    // DEFAULT: DASHBOARD OVERVIEW (/technician/dashboard)
    return (
      <div className="space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tugas Hari Ini</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-gray-900">{todayJobs.length}</span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Tiket</span>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mendatang</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-amber-600">{upcomingJobs.length}</span>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">Jadwal</span>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sedang Proses</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-blue-600">{inProgressJobs.length}</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">Aktif</span>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Selesai</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600">{completedJobs.length}</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Sukses</span>
            </div>
          </div>
        </div>

        {/* Section: Tugas Hari Ini */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Tugas Hari Ini
            </h2>
            <Link to="/technician/jobs" className="text-xs sm:text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
              Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {todayJobs.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-gray-100">
              <CheckCircle className="w-12 h-12 text-blue-400 mx-auto mb-2" />
              <h3 className="font-bold text-base text-gray-900">Tidak Ada Tugas Hari Ini</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">Anda tidak memiliki jadwal tiket untuk hari ini. Silakan periksa bagian tugas mendatang.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayJobs.map(renderJobCard)}
            </div>
          )}
        </section>

        {/* Section: Mendatang */}
        {upcomingJobs.length > 0 && (
          <section className="space-y-4 pt-2">
            <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Jadwal Mendatang
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingJobs.map(renderJobCard)}
            </div>
          </section>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout role="technician">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="space-y-4">
            <div className="h-24 bg-gray-100 animate-pulse rounded-2xl"></div>
            <div className="h-64 bg-gray-100 animate-pulse rounded-2xl"></div>
          </div>
        ) : (
          renderContent()
        )}
      </div>
    </DashboardLayout>
  );
}
