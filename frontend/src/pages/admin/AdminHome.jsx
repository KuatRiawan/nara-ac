import { useState, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../AuthContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, Legend 
} from 'recharts';
import { 
  LayoutDashboard, Wrench, Calendar as CalendarIcon, User, 
  Bell, AlertTriangle, CheckCircle, CheckCircle2, Clock, ArrowRight, X,
  Receipt, Tag, Star, CreditCard, TrendingUp, Users, Sparkles,
  ShieldCheck, ArrowUpRight, Search, Filter, Check, Phone, MapPin,
  ExternalLink, ChevronRight, Activity, CalendarDays, RefreshCw, Plus
} from 'lucide-react';
import AdminCreateBookingModal from '../../components/admin/AdminCreateBookingModal';

export default function AdminHome({ bookings = [], technicians = [], loading = false, handleStatus, handleAssign, isAdmin, onBookingCreated }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Search & Filter state for Today's Operations
  const [searchToday, setSearchToday] = useState('');
  const [filterTodayStatus, setFilterTodayStatus] = useState('all'); // all | scheduled | on process | done | unassigned
  const [assigningId, setAssigningId] = useState(null);
  const [selectedTechForAssign, setSelectedTechForAssign] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const getLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => getLocalDateStr(), []);
  
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  // Helper fleksibel untuk mengecek & mendapatkan data teknisi yang ditugaskan
  const getAssignedTechnician = (b) => {
    if (!b) return null;
    if (b.teknisi && typeof b.teknisi === 'object' && b.teknisi.nama) {
      return { id: b.teknisi.id || b.teknisi_id, nama: b.teknisi.nama };
    }
    const techId = b.teknisi_id || (b.teknisi && typeof b.teknisi === 'object' ? b.teknisi.id : null);
    if (techId) {
      const found = technicians.find(t => t.id === Number(techId));
      if (found) return { id: found.id, nama: found.nama };
      return { id: techId, nama: b.teknisi_nama || `Teknisi #${techId}` };
    }
    if (typeof b.teknisi === 'string' && b.teknisi.trim() !== '') {
      return { id: null, nama: b.teknisi };
    }
    if (b.teknisi_nama) {
      return { id: null, nama: b.teknisi_nama };
    }
    return null;
  };

  const todayBookings = useMemo(() => {
    return bookings.filter(b => b.jadwal_mulai && b.jadwal_mulai.startsWith(todayStr));
  }, [bookings, todayStr]);

  const actionRequired = useMemo(() => {
    return bookings.filter(b => 
      (!getAssignedTechnician(b) && b.status === 'scheduled') || b.status === 'delayed'
    ).slice(0, 6);
  }, [bookings, technicians]);

  // Derived KPI and status stats
  const bookingStats = useMemo(() => {
    const counts = { scheduled: 0, 'on process': 0, done: 0, cancelled: 0, delayed: 0, rescheduled: 0 };
    let todayBookingsCount = 0;
    let doneTodayCount = 0;
    let pendingAssignCount = 0;
    let todayOmzet = 0;
    
    bookings.forEach(b => {
      if (counts[b.status] !== undefined) counts[b.status]++;
      
      // Count for today
      if (b.jadwal_mulai && b.jadwal_mulai.startsWith(todayStr)) {
        todayBookingsCount++;
        if (b.status === 'done') doneTodayCount++;
        if ((!getAssignedTechnician(b) && b.status === 'scheduled') || b.status === 'delayed') {
          pendingAssignCount++;
        }

        // Calculate revenue for today
        const unit = b.jumlah_unit || 1;
        const basePrice = b.layanan?.harga || b.harga || 75000;
        const subtotal = basePrice * unit;
        const discount = unit === 2 ? Math.round(subtotal * 0.05) : unit >= 3 ? Math.round(subtotal * 0.1) : 0;
        todayOmzet += (subtotal - discount);
      }
    });
    
    const allOnProcess = bookings.filter(b => b.status === 'on process').length;
    
    return {
      todayBookings: todayBookingsCount,
      onProcess: allOnProcess,
      doneToday: doneTodayCount,
      pendingAssign: pendingAssignCount,
      todayOmzet,
      counts
    };
  }, [bookings, todayStr, technicians]);

  // Filtered Today Bookings
  const filteredTodayBookings = useMemo(() => {
    return todayBookings.filter(b => {
      const q = searchToday.toLowerCase();
      const matchSearch = 
        !searchToday ||
        (b.kode_booking && b.kode_booking.toLowerCase().includes(q)) ||
        (b.customer?.nama && b.customer.nama.toLowerCase().includes(q)) ||
        (b.nama && b.nama.toLowerCase().includes(q)) ||
        (b.teknisi?.nama && b.teknisi.nama.toLowerCase().includes(q)) ||
        (b.layanan?.nama_layanan && b.layanan.nama_layanan.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterTodayStatus === 'unassigned') {
        return !getAssignedTechnician(b) && b.status !== 'cancelled';
      }
      if (filterTodayStatus !== 'all') {
        return b.status === filterTodayStatus;
      }
      return true;
    });
  }, [todayBookings, searchToday, filterTodayStatus, technicians]);

  // Derived charts data
  const statusData = useMemo(() => {
    const counts = bookingStats.counts;
    return [
      { name: 'Selesai', value: counts['done'], color: '#10b981' },       // emerald-500
      { name: 'On Process', value: counts['on process'], color: '#2563eb' }, // blue-600
      { name: 'Terjadwal', value: counts['scheduled'], color: '#f59e0b' },   // amber-500
      { name: 'Tertunda', value: counts['delayed'] + counts['rescheduled'], color: '#f97316' }, // orange-500
      { name: 'Batal', value: counts['cancelled'], color: '#ef4444' },       // red-500
    ].filter(d => d.value > 0);
  }, [bookingStats]);

  const trendData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateStr(d);
      const dayBookings = bookings.filter(b => b.jadwal_mulai && b.jadwal_mulai.startsWith(dateStr));
      data.push({
        date: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        total: dayBookings.length,
        selesai: dayBookings.filter(b => b.status === 'done').length
      });
    }
    return data;
  }, [bookings]);

  const techWorkload = useMemo(() => {
    const workload = {};
    technicians.forEach(t => {
      workload[t.id] = {
        id: t.id,
        name: t.nama || 'Teknisi',
        shortName: (t.nama || '').split(' ')[0] || 'Teknisi',
        jobs: 0,
        maxJobs: 4 // Kapasitas optimal harian per teknisi
      };
    });

    todayBookings.forEach(b => {
      const assigned = getAssignedTechnician(b);
      if (assigned && assigned.id && workload[assigned.id]) {
        workload[assigned.id].jobs++;
      }
    });

    return Object.values(workload).sort((a, b) => b.jobs - a.jobs);
  }, [todayBookings, technicians]);

  const handleQuickAssignSubmit = async (bookingId) => {
    if (!selectedTechForAssign) return;
    await handleAssign(bookingId, Number(selectedTechForAssign));
    setAssigningId(null);
    setSelectedTechForAssign('');
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/60 relative min-w-0 font-sans">
      
      {/* ============================================================== */}
      {/* 1. CLEAN OPERATIONAL HEADER & FAST ACTIONS                     */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Dashboard Operasional
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantauan jadwal servis, performa operasional, dan alokasi teknisi: <strong className="text-slate-700 font-bold">{todayFormatted}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => setIsBookingModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl h-10 px-4 cursor-pointer shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all hover:shadow active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Booking Baru</span>
          </Button>

          <Button
            onClick={() => navigate('/admin/invoices')}
            variant="outline"
            className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-bold text-xs sm:text-sm rounded-xl h-10 px-4 cursor-pointer flex items-center gap-2 transition-all shadow-2xs whitespace-nowrap"
          >
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>E-Invoice</span>
          </Button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. 5-CARD HIGH IMPACT METRICS GRID                             */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Booking Hari Ini */}
        <div 
          onClick={() => navigate('/admin/schedule')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Booking Hari Ini</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {bookingStats.todayBookings} <span className="text-xs font-semibold text-slate-400">Tiket</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Jadwal servis terdaftar
            </p>
          </div>
        </div>

        {/* Card 2: On Process */}
        <div 
          onClick={() => navigate('/admin/bookings')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">On Process</span>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-sky-600 tracking-tight">
              {bookingStats.onProcess} <span className="text-xs font-semibold text-slate-400">Tiket</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Sedang dikerjakan teknisi
            </p>
          </div>
        </div>

        {/* Card 3: Selesai Hari Ini */}
        <div 
          onClick={() => navigate('/admin/bookings')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Selesai Hari Ini</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {bookingStats.doneToday} <span className="text-xs font-semibold text-slate-400">Tiket</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Pengerjaan tuntas & beres
            </p>
          </div>
        </div>

        {/* Card 4: Perlu Tindakan / Unassigned */}
        <div 
          onClick={() => setFilterTodayStatus('unassigned')}
          className={cn(
            "p-5 rounded-3xl border shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between bg-white",
            bookingStats.pendingAssign > 0 
              ? "border-rose-300 ring-1 ring-rose-200" 
              : "border-slate-200/80"
          )}
        >
          <div className="flex justify-between items-start mb-3">
            <span className={cn(
              "text-[11px] font-bold uppercase tracking-wider",
              bookingStats.pendingAssign > 0 ? "text-rose-600" : "text-slate-400"
            )}>
              Belum Ditugaskan
            </span>
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center font-bold transition-colors",
              bookingStats.pendingAssign > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"
            )}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className={cn(
              "text-2xl sm:text-3xl font-black tracking-tight",
              bookingStats.pendingAssign > 0 ? "text-rose-600" : "text-slate-900"
            )}>
              {bookingStats.pendingAssign} <span className="text-xs font-semibold text-slate-400">Tiket</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {bookingStats.pendingAssign > 0 ? "Memerlukan alokasi!" : "Semua tiket bertugas"}
            </p>
          </div>
        </div>

        {/* Card 5: Estimasi Omzet Hari Ini */}
        <div 
          onClick={() => navigate('/admin/invoices')}
          className="col-span-2 md:col-span-1 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Estimasi Nilai Servis</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
              Rp {bookingStats.todayOmzet.toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Akumulasi tiket hari ini
            </p>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 4. ANALYTICS & EXECUTIVE INSIGHTS GRID                         */}
      {/* ============================================================== */}
      {/* ============================================================== */}
      {/* 3. OPERASIONAL & KAPASITAS TEKNISI                             */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0 items-stretch">
        
        {/* Main Area Chart: 7 Days Trend (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-w-0">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Tren Kunjungan Servis & Penyelesaian
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Performa operasional 7 hari kalender terakhir
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span>Total Masuk</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Selesai (Done)</span>
                </span>
              </div>
            </div>

            <div className="h-[250px] sm:h-[270px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="naraTotalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="naraDoneGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                    dx={-10} 
                  />
                  <RTooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                      padding: '12px',
                      fontSize: '12px',
                      fontWeight: 700
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    name="Total Booking" 
                    dataKey="total" 
                    stroke="#2563eb" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#naraTotalGrad)" 
                    dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 6 }} 
                  />
                  <Area 
                    type="monotone" 
                    name="Selesai" 
                    dataKey="selesai" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#naraDoneGrad)" 
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Technician Workload Card (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Kapasitas Teknisi Hari Ini
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Beban alokasi tugas per teknisi
                </p>
              </div>
              <Button 
                size="sm"
                variant="ghost"
                onClick={() => navigate('/admin/technicians')}
                className="text-xs text-blue-600 font-bold hover:bg-blue-50 rounded-xl h-8 px-2.5 cursor-pointer"
              >
                Lihat Semua
              </Button>
            </div>

            {/* Progress Bars for Technicians */}
            <div className="space-y-3 overflow-y-auto max-h-[210px] pr-1">
              {techWorkload.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-semibold">
                  Belum ada data teknisi terdaftar.
                </div>
              ) : (
                techWorkload.slice(0, 5).map(tech => {
                  const pct = Math.min(100, Math.round((tech.jobs / tech.maxJobs) * 100));
                  return (
                    <div key={tech.id} className="space-y-1.5 p-2 rounded-2xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 font-black text-[11px] flex items-center justify-center shrink-0 border border-blue-100">
                            {tech.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-800">{tech.name}</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-600">
                          {tech.jobs} / {tech.maxJobs} Job
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            tech.jobs === 0 ? "bg-slate-300" :
                            tech.jobs >= tech.maxJobs ? "bg-rose-500" :
                            tech.jobs >= 2 ? "bg-blue-600" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between mt-3">
            <span>Standar kuota: Maks. 4 job/hari</span>
            <span className="text-blue-600 font-bold">SOP NARA</span>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 4. DISTRIBUSI STATUS & PUSAT TINDAKAN                          */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0 items-stretch">
        
        {/* Status Donut Distribution (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-w-0">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Status Distribusi Tiket
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Proporsi seluruh pengerjaan aktif
            </p>
          </div>

          <div className="h-[210px] w-full relative flex items-center justify-center my-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={statusData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={58} 
                  outerRadius={82} 
                  paddingAngle={4} 
                  dataKey="value" 
                  cornerRadius={6}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RTooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                    fontWeight: 700 
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Stats */}
            <div className="absolute text-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 leading-none block">
                {bookings.length}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Total
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center pt-3 border-t border-slate-100">
            {statusData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] font-bold text-slate-700">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span>{d.name}</span>
                <span className="text-slate-400 font-mono">({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Center Card (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "p-2 rounded-xl",
                  actionRequired.length > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                )}>
                  {actionRequired.length > 0 ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Pusat Tindakan & Perhatian</h3>
                  <p className="text-[11px] text-slate-400">Status alokasi penugasan dan antrian prioritas</p>
                </div>
              </div>
              <Badge className={cn(
                "text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border",
                actionRequired.length > 0 
                  ? "bg-rose-50 text-rose-700 border-rose-200" 
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}>
                {actionRequired.length > 0 ? `${actionRequired.length} Perlu Alokasi` : 'Terkendali'}
              </Badge>
            </div>

            {actionRequired.length === 0 ? (
              <div className="py-9 px-6 text-center bg-slate-50/60 rounded-2xl border border-slate-100 flex flex-col items-center justify-center my-auto">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Seluruh Jadwal Terkendali</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
                  Tidak ada tiket tertunda atau tanpa teknisi. Seluruh jadwal servis hari ini telah dialokasikan dengan optimal sesuai standar SOP CV. Nara.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700">
                    ✓ 100% Terdistribusi
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700">
                    ✓ 0 Tertunda
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[260px] pr-1">
                {actionRequired.map(b => (
                  <div key={b.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-200 transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-100">
                        {b.kode_booking}
                      </span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold",
                        b.status === 'delayed' ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                      )}>
                        {b.status === 'delayed' ? 'Tertunda' : 'Belum Ditugaskan'}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {b.customer?.nama || b.nama || 'Pelanggan'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {b.layanan?.nama_layanan || b.nama_layanan || 'Servis AC'} • {b.jumlah_unit || 1} Unit
                      </p>
                    </div>

                    {/* Quick Assign Inline Action */}
                    {assigningId === b.id ? (
                      <div className="mt-1 flex items-center gap-1.5 animate-in fade-in">
                        <select
                          value={selectedTechForAssign}
                          onChange={(e) => setSelectedTechForAssign(e.target.value)}
                          className="flex-1 rounded-xl border border-blue-200 bg-white h-8 text-[11px] px-2 font-medium"
                        >
                          <option value="">Pilih Teknisi...</option>
                          {technicians.map(t => (
                            <option key={t.id} value={t.id}>{t.nama}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          onClick={() => handleQuickAssignSubmit(b.id)}
                          disabled={!selectedTechForAssign}
                          className="h-8 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold cursor-pointer"
                        >
                          OK
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAssigningId(null)}
                          className="h-8 px-2 text-slate-400 hover:text-slate-700 rounded-xl"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                        <button
                          type="button"
                          onClick={() => setAssigningId(b.id)}
                          className="text-[11px] text-blue-600 font-bold hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Wrench className="w-3 h-3" />
                          <span>Tugaskan Sekarang</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/admin/schedule')}
                          className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
                        >
                          <span>Jadwal</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between mt-3">
            <span>Prioritas pengerjaan otomatis</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/schedule')}
              className="h-6 px-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
            >
              Buka Kalender Jadwal →
            </Button>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 5. OPERASI HARI INI: TABLE & REAL-TIME SEARCH                  */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        
        {/* Table Header & Search Controls */}
        <div className="p-5 sm:p-7 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Operasi Hari Ini ({todayBookings.length} Tiket)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {todayFormatted}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Jadwal kunjungan teknisi lapangan yang diagendakan pada hari ini
            </p>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={searchToday}
                onChange={(e) => setSearchToday(e.target.value)}
                placeholder="Cari tiket, pelanggan, layanan..."
                className="h-9 pl-8 text-xs rounded-xl border-slate-200 bg-white w-48 sm:w-60 font-medium"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setFilterTodayStatus('all')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  filterTodayStatus === 'all' ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterTodayStatus('scheduled')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  filterTodayStatus === 'scheduled' ? "bg-amber-500 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                Jadwal
              </button>
              <button
                type="button"
                onClick={() => setFilterTodayStatus('on process')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  filterTodayStatus === 'on process' ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                Proses
              </button>
              <button
                type="button"
                onClick={() => setFilterTodayStatus('done')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  filterTodayStatus === 'done' ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                Selesai
              </button>
              <button
                type="button"
                onClick={() => setFilterTodayStatus('unassigned')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  filterTodayStatus === 'unassigned' ? "bg-rose-600 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                Belum Ditugaskan
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold flex flex-col items-center gap-2">
            <Clock className="w-7 h-7 animate-spin text-blue-600" />
            <span>Memperbarui data operasi...</span>
          </div>
        ) : filteredTodayBookings.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Tidak ada operasi yang sesuai filter.</p>
            <p className="text-xs text-slate-400 mt-0.5">Semua data hari ini telah ditampilkan atau filter belum menemukan hasil.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-white text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-6">Waktu Kunjungan</th>
                  <th className="py-3 px-6">Kode Tiket</th>
                  <th className="py-3 px-6">Pelanggan & Lokasi</th>
                  <th className="py-3 px-6">Paket Servis</th>
                  <th className="py-3 px-6">Status Pengerjaan</th>
                  <th className="py-3 px-6">Teknisi Bertugas</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredTodayBookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Waktu */}
                    <td className="py-3.5 px-6 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>
                          {b.jadwal_mulai ? new Date(b.jadwal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-'}
                        </span>
                      </div>
                    </td>

                    {/* Kode */}
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                        {b.kode_booking}
                      </span>
                    </td>

                    {/* Pelanggan */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {(b.customer?.nama || b.nama || 'P').charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{b.customer?.nama || b.nama || 'Pelanggan'}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">{b.alamat || '-'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Layanan */}
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <p className="font-bold text-slate-900 text-xs">
                        {b.layanan?.nama || b.layanan?.nama_layanan || b.nama_layanan || 'Cuci AC Standard'}
                      </p>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {b.jumlah_unit || 1} Unit
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border",
                        b.status === 'scheduled' ? "bg-amber-50 text-amber-700 border-amber-200" :
                        b.status === 'on process' ? "bg-blue-50 text-blue-700 border-blue-200" :
                        b.status === 'done' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        b.status === 'delayed' ? "bg-orange-50 text-orange-700 border-orange-200" :
                        b.status === 'cancelled' ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700"
                      )}>
                        {b.status}
                      </span>
                    </td>

                    {/* Teknisi */}
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      {(() => {
                        const assignedTech = getAssignedTechnician(b);
                        if (assignedTech) {
                          return (
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <Wrench className="w-3.5 h-3.5 text-blue-500" />
                              <span>{assignedTech.nama}</span>
                            </div>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                            <AlertTriangle className="w-3 h-3" /> Belum Ditugaskan
                          </span>
                        );
                      })()}
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/admin/invoices`)}
                          className="rounded-xl text-[11px] font-bold h-8 px-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate('/admin/bookings')}
                          className="rounded-xl text-[11px] font-bold h-8 px-2.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Detail
                        </Button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Internal Admin Booking Modal for WhatsApp / Phone Bookings */}
      <AdminCreateBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        technicians={technicians}
        onBookingSuccess={(newBooking) => {
          if (onBookingCreated) {
            onBookingCreated(newBooking);
          }
        }}
      />

    </div>
  );
}
