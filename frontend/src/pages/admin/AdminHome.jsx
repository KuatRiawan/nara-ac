import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Plus, Receipt, RefreshCw, Wrench } from 'lucide-react';
import api from '../../api';
import AdminCreateBookingModal from '../../components/admin/AdminCreateBookingModal';
import { Button } from '../../components/ui/button';

const COLORS = { blue: '#2563eb', cyan: '#0891b2', emerald: '#059669', amber: '#d97706' };
const rupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
const shortRupiah = (value) => {
  const amount = Number(value || 0);
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)} M`;
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)} Jt`;
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)} Rb`;
  return `Rp ${amount}`;
};
const monthLabel = (value) => {
  if (!value) return '-';
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
};

function ReportCard({ title, subtitle, children }) {
  return (
    <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-100">
        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">{title}</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

function EmptyChart({ loading }) {
  return <div style={{ height: 280 }} className="flex items-center justify-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-sm text-slate-500">{loading ? 'Memuat data laporan...' : 'Belum ada data pada periode ini.'}</div>;
}

function ReportFilters({ idPrefix, services, customers, serviceId, customerId, onServiceChange, onCustomerChange }) {
  return (
    <div className="mb-5 flex flex-col sm:flex-row gap-2 sm:justify-end" aria-label="Filter laporan">
      <label className="sr-only" htmlFor={`${idPrefix}-service`}>Filter layanan</label>
      <select id={`${idPrefix}-service`} value={serviceId} onChange={(event) => onServiceChange(event.target.value)} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="">Semua Layanan</option>
        {services.map((service) => <option key={service.id} value={service.id}>{service.nama}</option>)}
      </select>
      <label className="sr-only" htmlFor={`${idPrefix}-customer`}>Filter customer</label>
      <select id={`${idPrefix}-customer`} value={customerId} onChange={(event) => onCustomerChange(event.target.value)} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="">Semua Customer</option>
        {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.nama}</option>)}
      </select>
    </div>
  );
}

export default function AdminHome({ bookings = [], technicians = [], onBookingCreated }) {
  const navigate = useNavigate();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [months, setMonths] = useState(12);
  const [technicianServiceId, setTechnicianServiceId] = useState('');
  const [technicianCustomerId, setTechnicianCustomerId] = useState('');
  const [bookingServiceId, setBookingServiceId] = useState('');
  const [bookingCustomerId, setBookingCustomerId] = useState('');
  const [reports, setReports] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportError, setReportError] = useState('');

  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);
  const todayFormatted = useMemo(() => new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), []);

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    setReportError('');
    try {
      setReports(await api.get('/admin/dashboard/reports', {
        params: {
          months,
          technician_service_id: technicianServiceId || undefined,
          technician_customer_id: technicianCustomerId || undefined,
          booking_service_id: bookingServiceId || undefined,
          booking_customer_id: bookingCustomerId || undefined,
        },
      }));
    } catch (error) {
      setReportError(error?.error?.message || error?.message || 'Gagal memuat laporan dashboard.');
    } finally {
      setLoadingReports(false);
    }
  }, [months, technicianServiceId, technicianCustomerId, bookingServiceId, bookingCustomerId]);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  useEffect(() => {
    const refresh = () => fetchReports();
    window.addEventListener('nara-booking-updated', refresh);
    return () => window.removeEventListener('nara-booking-updated', refresh);
  }, [fetchReports]);

  const todayBookings = useMemo(() => bookings.filter((booking) => {
    const date = new Date(booking.jadwal_mulai);
    if (!booking.jadwal_mulai || Number.isNaN(date.getTime())) return false;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return key === todayKey;
  }), [bookings, todayKey]);

  const stats = useMemo(() => todayBookings.reduce((result, booking) => {
    const active = ['scheduled', 'rescheduled', 'delayed', 'on process'].includes(booking.status);
    if (booking.status !== 'cancelled') result.total += 1;
    if (booking.status === 'on process') result.process += 1;
    if (booking.status === 'done') result.done += 1;
    if (!booking.teknisi_id && active) result.unassigned += 1;
    if (booking.status !== 'cancelled') result.estimate += Number(booking.jumlah_unit || 1) * Number(booking.layanan?.harga || booking.harga || 0);
    return result;
  }, { total: 0, process: 0, done: 0, unassigned: 0, estimate: 0 }), [todayBookings]);

  const topCustomers = reports?.topCustomers || [];
  const topServices = reports?.topServices || [];
  const topTechnicians = reports?.topTechnicians || [];
  const revenueMonthly = reports?.revenueMonthly || [];
  const scheduledMonthly = reports?.scheduledBookingsMonthly || [];
  const serviceOptions = reports?.filterOptions?.services || [];
  const customerOptions = reports?.filterOptions?.customers || [];

  const cards = [
    ['Booking Hari Ini', stats.total, 'Tiket', 'Jadwal servis terdaftar', CalendarDays, 'bg-blue-50 text-blue-600', '/admin/schedule'],
    ['On Process', stats.process, 'Tiket', 'Sedang dikerjakan teknisi', Clock3, 'bg-amber-50 text-amber-600', '/admin/bookings'],
    ['Selesai Hari Ini', stats.done, 'Tiket', 'Pengerjaan tuntas', CheckCircle2, 'bg-emerald-50 text-emerald-600', '/admin/bookings'],
    ['Belum Ditugaskan', stats.unassigned, 'Tiket', 'Memerlukan alokasi', AlertTriangle, 'bg-rose-50 text-rose-600', '/admin/schedule'],
    ['Estimasi Nilai Servis', shortRupiah(stats.estimate), '', 'Akumulasi jadwal hari ini', Receipt, 'bg-violet-50 text-violet-600', '/admin/invoices'],
  ];

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50/60 min-w-0 font-sans">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Dashboard Operasional</h1>
          <p className="text-sm text-slate-500 mt-1">Ringkasan operasional dan laporan bisnis dari MySQL · <strong className="text-slate-700">{todayFormatted}</strong></p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button onClick={() => setIsBookingModalOpen(true)} className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"><Plus className="w-4 h-4" /> Buat Booking Baru</Button>
          <Button onClick={() => navigate('/admin/invoices')} variant="outline" className="h-11 px-4 rounded-xl border-slate-200 bg-white font-bold cursor-pointer"><Receipt className="w-4 h-4 text-blue-600" /> E-Invoice</Button>
        </div>
      </header>

      <div className="overflow-x-auto pb-1 custom-scrollbar">
        <section aria-label="Ringkasan operasional hari ini" className="grid gap-4" style={{ gridTemplateColumns: 'repeat(5, minmax(180px, 1fr))', minWidth: 1000 }}>
          {cards.map(([label, value, suffix, note, Icon, tone, link]) => (
            <button type="button" key={label} onClick={() => navigate(link)} className="group min-h-40 text-left bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all cursor-pointer">
              <div className="flex justify-between items-start gap-3 mb-4"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span><span className={`w-10 h-10 rounded-2xl flex items-center justify-center ${tone}`}><Icon className="w-5 h-5" aria-hidden="true" /></span></div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">{value} {suffix && <span className="text-xs font-semibold text-slate-500">{suffix}</span>}</p>
              <p className="text-xs text-slate-500 mt-1">{note}</p>
            </button>
          ))}
        </section>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-5 flex justify-end">
        <div className="flex flex-wrap items-center justify-end gap-2" aria-label="Filter periode laporan">
          {[3, 6, 12].map((value) => <button type="button" key={value} onClick={() => setMonths(value)} className={`min-h-10 px-4 rounded-xl text-xs font-bold border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${months === value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{value} Bulan</button>)}
          <button type="button" onClick={fetchReports} disabled={loadingReports} aria-label="Muat ulang laporan" className="min-h-10 min-w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center cursor-pointer"><RefreshCw className={`w-4 h-4 ${loadingReports ? 'animate-spin' : ''}`} /></button>
        </div>
      </section>

      {reportError && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{reportError}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ReportCard title="Top 10 Customer dengan Transaksi Terbanyak" subtitle="Pelanggan dengan frekuensi booking tertinggi pada periode terpilih.">
          {loadingReports || !topCustomers.length ? <EmptyChart loading={loadingReports} /> : <div style={{ height: 340 }} role="img" aria-label="Grafik sepuluh customer dengan transaksi terbanyak"><ResponsiveContainer width="100%" height="100%"><BarChart data={topCustomers} layout="vertical" margin={{ left: 12, right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="nama" width={118} tick={{ fontSize: 11 }} tickLine={false} /><Tooltip /><Bar dataKey="jumlah_transaksi" name="Transaksi" fill={COLORS.blue} radius={[0, 8, 8, 0]}><LabelList dataKey="jumlah_transaksi" position="insideRight" fill="#ffffff" fontSize={11} fontWeight={800} /></Bar></BarChart></ResponsiveContainer></div>}
        </ReportCard>
        <ReportCard title="Top 10 Service Terbanyak" subtitle="Layanan yang paling sering dipesan oleh pelanggan.">
          {loadingReports || !topServices.length ? <EmptyChart loading={loadingReports} /> : <><div style={{ height: 340 }} role="img" aria-label="Grafik sepuluh layanan yang paling sering dipesan"><ResponsiveContainer width="100%" height="100%"><BarChart data={topServices} layout="vertical" margin={{ left: 12, right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="nama" width={138} tick={{ fontSize: 11 }} tickLine={false} /><Tooltip /><Legend /><Bar dataKey="jumlah_booking" name="Booking" fill={COLORS.cyan} radius={[0, 6, 6, 0]}><LabelList dataKey="jumlah_booking" position="insideRight" fill="#ffffff" fontSize={10} fontWeight={800} /></Bar><Bar dataKey="jumlah_unit" name="Unit" fill={COLORS.blue} radius={[0, 6, 6, 0]}><LabelList dataKey="jumlah_unit" position="insideRight" fill="#ffffff" fontSize={10} fontWeight={800} /></Bar></BarChart></ResponsiveContainer></div><p className="mt-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-600"><strong className="text-cyan-700">Booking</strong> adalah jumlah pesanan atau kunjungan servis. <strong className="text-blue-700">Unit</strong> adalah total unit AC yang dikerjakan. Satu booking dapat mencakup lebih dari satu unit AC.</p></>}
        </ReportCard>
      </div>

      <ReportCard title="Revenue per Bulan" subtitle="Nilai transaksi yang terealisasi dari pekerjaan berstatus selesai.">
        {loadingReports ? <EmptyChart loading /> : <div style={{ height: 320 }} role="img" aria-label="Grafik revenue bulanan"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueMonthly} margin={{ left: 8, right: 12 }}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="bulan" tickFormatter={monthLabel} tick={{ fontSize: 11 }} /><YAxis tickFormatter={shortRupiah} tick={{ fontSize: 11 }} width={72} /><Tooltip labelFormatter={monthLabel} formatter={(value) => [rupiah(value), 'Revenue']} /><Area type="monotone" dataKey="revenue" name="Revenue" stroke={COLORS.emerald} strokeWidth={3} fill="url(#revenueFill)" /></AreaChart></ResponsiveContainer></div>}
      </ReportCard>

      <ReportCard title="Top 10 Teknisi dengan Pengerjaan Terbanyak" subtitle="Ranking penugasan teknisi beserta pekerjaan selesai, aktif, dan tertunda.">
        <ReportFilters idPrefix="technician" services={serviceOptions} customers={customerOptions} serviceId={technicianServiceId} customerId={technicianCustomerId} onServiceChange={setTechnicianServiceId} onCustomerChange={setTechnicianCustomerId} />
        {loadingReports || !topTechnicians.length ? <EmptyChart loading={loadingReports} /> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500"><th scope="col" className="py-3 px-3 text-left">Peringkat</th><th scope="col" className="py-3 px-3 text-left">Teknisi</th><th scope="col" className="py-3 px-3 text-right">Total</th><th scope="col" className="py-3 px-3 text-right">Selesai</th><th scope="col" className="py-3 px-3 text-right">Aktif</th><th scope="col" className="py-3 px-3 text-right">Tertunda</th><th scope="col" className="py-3 px-3 text-left">Porsi Selesai</th></tr></thead><tbody>{topTechnicians.map((technician, index) => { const completion = technician.total_pengerjaan ? Math.round((technician.selesai / technician.total_pengerjaan) * 100) : 0; return <tr key={technician.id} className="border-b border-slate-100 last:border-0"><td className="py-3 px-3 font-black text-slate-500">#{index + 1}</td><td className="py-3 px-3 font-bold text-slate-900"><span className="inline-flex items-center gap-2"><span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center"><Wrench className="w-4 h-4" aria-hidden="true" /></span>{technician.nama}</span></td><td className="py-3 px-3 text-right font-black tabular-nums">{technician.total_pengerjaan}</td><td className="py-3 px-3 text-right text-emerald-700 font-bold tabular-nums">{technician.selesai}</td><td className="py-3 px-3 text-right text-blue-700 font-bold tabular-nums">{technician.aktif}</td><td className="py-3 px-3 text-right text-amber-700 font-bold tabular-nums">{technician.tertunda}</td><td className="py-3 px-3"><div className="flex items-center gap-2 min-w-36"><div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${completion}%` }} /></div><span className="text-xs font-bold text-slate-600">{completion}%</span></div></td></tr>; })}</tbody></table></div>}
      </ReportCard>

      <ReportCard title="Booking Terjadwal Customer per Bulan" subtitle={bookingCustomerId ? 'Jumlah booking customer terpilih berdasarkan bulan jadwal servis.' : 'Jumlah booking dan pelanggan unik berdasarkan bulan jadwal servis.'}>
        <ReportFilters idPrefix="scheduled" services={serviceOptions} customers={customerOptions} serviceId={bookingServiceId} customerId={bookingCustomerId} onServiceChange={setBookingServiceId} onCustomerChange={setBookingCustomerId} />
        {loadingReports ? <EmptyChart loading /> : <><div style={{ height: 320 }} role="img" aria-label="Grafik booking terjadwal customer per bulan"><ResponsiveContainer width="100%" height="100%"><BarChart data={scheduledMonthly} margin={{ top: 8, right: 12 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="bulan" tickFormatter={monthLabel} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip labelFormatter={monthLabel} /><Legend /><Bar dataKey="jumlah_booking" name="Booking" fill={COLORS.blue} radius={[6, 6, 0, 0]}><LabelList dataKey="jumlah_booking" position="insideTop" fill="#ffffff" fontSize={10} fontWeight={800} /></Bar>{!bookingCustomerId && <Bar dataKey="pelanggan_unik" name="Pelanggan Unik" fill={COLORS.amber} radius={[6, 6, 0, 0]}><LabelList dataKey="pelanggan_unik" position="insideTop" fill="#ffffff" fontSize={10} fontWeight={800} /></Bar>}</BarChart></ResponsiveContainer></div>{bookingCustomerId ? <p className="mt-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-600">Grafik menampilkan jumlah booking milik customer terpilih. Seri Pelanggan Unik disembunyikan karena hanya satu customer yang dianalisis.</p> : <p className="mt-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-600"><strong className="text-blue-700">Booking</strong> adalah jumlah jadwal servis yang dibuat. <strong className="text-amber-700">Pelanggan Unik</strong> adalah jumlah customer berbeda yang membuat booking. Satu customer dapat membuat beberapa booking dalam bulan yang sama.</p>}</>}
      </ReportCard>

      <AdminCreateBookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} technicians={technicians} onBookingSuccess={(newBooking) => { onBookingCreated?.(newBooking); fetchReports(); }} />
    </main>
  );
}
