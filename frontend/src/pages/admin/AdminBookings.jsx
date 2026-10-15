import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api';
import { Calendar as CalendarIcon, Clock, Wrench, Plus, Search, CheckCircle2, AlertCircle, AlertTriangle, Phone, MapPin, ExternalLink, Copy, Check, ChevronDown, RefreshCw, X, Eye, MessageSquare, UserCheck, UserPlus, ArrowUpDown, CalendarClock, Printer, Receipt } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../components/ui/toast';
import { getErrorMessage } from '../../utils/errors';
import AdminCreateBookingModal from '../../components/admin/AdminCreateBookingModal';
import OfficialInvoicePaper from '../../components/OfficialInvoicePaper';

export default function AdminBookings({
  bookings = [],
  technicians = [],
  loading = false,
  handleStatus,
  handleAssign,
  isAdmin = true,
  onBookingCreated
}) {
  const { error: showError, success: showSuccess } = useToast();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all | unassigned | scheduled | on process | done | delayed | cancelled
  const [filterTechnician, setFilterTechnician] = useState('all');
  const [sortBy, setSortBy] = useState('schedule_asc'); // schedule_asc | schedule_desc | created_desc
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Modal Invoice State
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Escape key to close invoice modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isInvoiceModalOpen) {
        setIsInvoiceModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInvoiceModalOpen]);

  // Modal Reschedule State
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [newRescheduleTime, setNewRescheduleTime] = useState('09:00');
  const [rescheduleReason, setRescheduleReason] = useState('Penyesuaian jadwal servis oleh admin');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Copy code helper
  const handleCopyCode = useCallback((code, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  // Helper fleksibel teknisi
  const getAssignedTechnician = useCallback((b) => {
    if (!b) return null;
    if (b.teknisi && typeof b.teknisi === 'object' && b.teknisi.nama) {
      return { id: b.teknisi.id || b.teknisi_id, nama: b.teknisi.nama };
    }
    const techId = b.teknisi_id || (b.teknisi && typeof b.teknisi === 'object' ? b.teknisi.id : null);
    if (techId) {
      const found = technicians.find(t => t.id === Number(techId));
      if (found) return { id: found.id, nama: found.nama };
      return { id: Number(techId), nama: b.nama_teknisi || `Teknisi #${techId}` };
    }
    return null;
  }, [technicians]);

  // Format Rupiah
  const formatRupiah = (num) => {
    if (!num && num !== 0) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Helper WA link
  const getWhatsAppLink = (rawPhone, bookingCode, customerName) => {
    if (!rawPhone) return null;
    let clean = String(rawPhone).replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    else if (clean.startsWith('8')) clean = '628' + clean.slice(1);
    const text = encodeURIComponent(`Halo Bpk/Ibu ${customerName || ''}, kami dari CV. Nara Teknindotama terkait jadwal servis AC tiket ${bookingCode}. Apakah ada kendala atau jadwal sudah sesuai?`);
    return `https://wa.me/${clean}?text=${text}`;
  };

  // Open Reschedule Modal
  const openReschedule = (booking) => {
    setRescheduleBooking(booking);
    if (booking.jadwal_mulai) {
      const d = new Date(booking.jadwal_mulai);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setNewRescheduleDate(`${yyyy}-${mm}-${dd}`);
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      setNewRescheduleTime(`${hh}:${min}`);
    } else {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setNewRescheduleDate(`${yyyy}-${mm}-${dd}`);
      setNewRescheduleTime('09:00');
    }
    setRescheduleReason('Penyesuaian jadwal servis oleh admin');
  };

  // Submit Reschedule (Ubah Tanggal)
  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleBooking) return;

    if (!newRescheduleDate) {
      showError('Silakan pilih tanggal baru.');
      return;
    }

    // Validasi hari Minggu
    const targetDateObj = new Date(newRescheduleDate + 'T00:00:00');
    if (targetDateObj.getDay() === 0) {
      showError('Hari Minggu adalah libur operasional CV. Nara Teknindotama. Silakan pilih hari Senin s/d Sabtu.');
      return;
    }

    setIsSubmittingReschedule(true);
    try {
      const isoPayload = `${newRescheduleDate}T${newRescheduleTime || '09:00'}:00+07:00`;
      await api.patch(`/admin/bookings/${rescheduleBooking.id}/reschedule`, {
        jadwal_mulai: isoPayload,
        alasan: rescheduleReason.trim() || 'Penyesuaian jadwal servis oleh admin'
      });

      showSuccess(`Jadwal tiket ${rescheduleBooking.kode_booking} berhasil diubah ke ${newRescheduleDate}.`);
      setRescheduleBooking(null);
      if (selectedBookingForDetail?.id === rescheduleBooking.id) {
        setSelectedBookingForDetail(prev => prev ? { ...prev, jadwal_mulai: isoPayload, status: 'rescheduled' } : null);
      }
      if (onBookingCreated) {
        onBookingCreated();
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal mengubah tanggal jadwal');
      showError(msg);
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  // Invoice modal handler
  const openInvoiceModal = (booking) => {
    setSelectedInvoiceBooking(booking);
    setIsInvoiceModalOpen(true);
  };

  const handlePrintInvoice = () => {
    const origTitle = document.title;
    document.title = `Invoice_${selectedInvoiceBooking?.kode_booking || selectedInvoiceBooking?.id || 'NARA'}_CV_Nara_Teknindotama`;
    window.print();
    setTimeout(() => {
      document.title = origTitle;
    }, 1000);
  };

  useEffect(() => {
    if (isInvoiceModalOpen) {
      document.body.classList.add('invoice-modal-open');
    } else {
      document.body.classList.remove('invoice-modal-open');
    }
    return () => {
      document.body.classList.remove('invoice-modal-open');
    };
  }, [isInvoiceModalOpen]);

  // Metrics KPI Cepat
  const metrics = useMemo(() => {
    let total = bookings.length;
    let unassigned = 0;
    let scheduled = 0;
    let onProcess = 0;
    let done = 0;
    let delayed = 0;
    let cancelled = 0;

    bookings.forEach(b => {
      const tech = getAssignedTechnician(b);
      if (b.status === 'scheduled' && !tech) {
        unassigned++;
      }
      if (b.status === 'scheduled') scheduled++;
      else if (b.status === 'on process') onProcess++;
      else if (b.status === 'done') done++;
      else if (b.status === 'delayed') delayed++;
      else if (b.status === 'cancelled') cancelled++;
    });

    return { total, unassigned, scheduled, onProcess, done, delayed, cancelled };
  }, [bookings, getAssignedTechnician]);

  // Filtered & Sorted Bookings
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // Status / Unassigned Filter
    if (filterStatus === 'unassigned') {
      result = result.filter(b => b.status === 'scheduled' && !getAssignedTechnician(b));
    } else if (filterStatus !== 'all') {
      result = result.filter(b => b.status === filterStatus);
    }

    // Technician Filter
    if (filterTechnician !== 'all') {
      if (filterTechnician === 'unassigned') {
        result = result.filter(b => !getAssignedTechnician(b));
      } else {
        const techIdNum = Number(filterTechnician);
        result = result.filter(b => {
          const tech = getAssignedTechnician(b);
          return tech && tech.id === techIdNum;
        });
      }
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(b => {
        const code = (b.kode_booking || '').toLowerCase();
        const custName = (b.customer?.nama || b.nama || '').toLowerCase();
        const custPhone = (b.customer?.kontak || b.kontak || '').toLowerCase();
        const addr = (b.alamat || '').toLowerCase();
        const svc = (b.layanan?.nama_layanan || b.layanan?.nama || b.nama_layanan || '').toLowerCase();
        const complaint = (b.keluhan || '').toLowerCase();
        const tech = getAssignedTechnician(b);
        const techName = (tech?.nama || '').toLowerCase();

        return code.includes(q) || custName.includes(q) || custPhone.includes(q) ||
          addr.includes(q) || svc.includes(q) || complaint.includes(q) || techName.includes(q);
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'schedule_asc') {
        return new Date(a.jadwal_mulai || 0) - new Date(b.jadwal_mulai || 0);
      }
      if (sortBy === 'schedule_desc') {
        return new Date(b.jadwal_mulai || 0) - new Date(a.jadwal_mulai || 0);
      }
      if (sortBy === 'created_desc') {
        return new Date(b.created_at || b.jadwal_mulai || 0) - new Date(a.created_at || a.jadwal_mulai || 0);
      }
      return 0;
    });

    return result;
  }, [bookings, filterStatus, filterTechnician, searchQuery, sortBy, getAssignedTechnician]);

  // Paginated bookings
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / itemsPerPage));
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(start, start + itemsPerPage);
  }, [filteredBookings, currentPage, itemsPerPage]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterTechnician('all');
    setSortBy('schedule_asc');
    setCurrentPage(1);
  };

  // Helper date badge
  const getDateLabel = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) return <span className="inline-block px-1.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded ml-1.5">Hari Ini</span>;
    if (isTomorrow) return <span className="inline-block px-1.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded ml-1.5">Besok</span>;
    return null;
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 relative min-w-0 font-sans">
      {/* HEADER: Standard Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Daftar Booking Service</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola jadwal, pantau status pengerjaan, dan atur penugasan teknisi operasional CV. Nara Teknindotama.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => setIsBookingModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl h-10 px-4 cursor-pointer shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all hover:shadow active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Input Booking Baru</span>
          </Button>
        </div>
      </div>

      {/* QUICK KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tiket */}
        <div
          onClick={() => { setFilterStatus('all'); setCurrentPage(1); }}
          className={cn(
            "p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between",
            filterStatus === 'all'
              ? "bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20 shadow-sm"
              : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tiket</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <CalendarIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.total}</span>
            <span className="text-xs text-slate-500 font-medium">semua data</span>
          </div>
        </div>

        {/* Menunggu Teknisi (Paling Kritis) */}
        <div
          onClick={() => { setFilterStatus('unassigned'); setCurrentPage(1); }}
          className={cn(
            "p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between",
            filterStatus === 'unassigned'
              ? "bg-amber-50/60 border-amber-300 ring-2 ring-amber-500/20 shadow-sm"
              : "bg-white border-slate-200/80 hover:border-amber-200 shadow-sm hover:shadow"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Perlu Teknisi</span>
              {metrics.unassigned > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </div>
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
              metrics.unassigned > 0 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"
            )}>
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={cn(
              "text-2xl sm:text-3xl font-black",
              metrics.unassigned > 0 ? "text-amber-700" : "text-slate-900"
            )}>
              {metrics.unassigned}
            </span>
            <span className="text-xs text-amber-700 font-bold bg-amber-100/80 px-2 py-0.5 rounded-lg">
              Tugaskan
            </span>
          </div>
        </div>

        {/* Sedang Dikerjakan */}
        <div
          onClick={() => { setFilterStatus('on process'); setCurrentPage(1); }}
          className={cn(
            "p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between",
            filterStatus === 'on process'
              ? "bg-sky-50/60 border-sky-300 ring-2 ring-sky-500/20 shadow-sm"
              : "bg-white border-slate-200/80 hover:border-sky-200 shadow-sm hover:shadow"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">On Process</span>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.onProcess}</span>
            <span className="text-xs text-sky-700 font-bold bg-sky-100/80 px-2 py-0.5 rounded-lg">
              Dikerjakan
            </span>
          </div>
        </div>

        {/* Selesai */}
        <div
          onClick={() => { setFilterStatus('done'); setCurrentPage(1); }}
          className={cn(
            "p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between",
            filterStatus === 'done'
              ? "bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm"
              : "bg-white border-slate-200/80 hover:border-emerald-200 shadow-sm hover:shadow"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selesai Bergaransi</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700">{metrics.done}</span>
            <span className="text-xs text-slate-500 font-medium">selesai servis</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-4">
        {/* Row 1: Search & Dropdowns */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Cari kode tiket (BK-...), pelanggan, no telepon, teknisi, atau alamat..."
              aria-label="Cari booking"
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Teknisi & Sort Dropdowns */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Filter Teknisi */}
            <div className="relative min-w-[170px] flex-1 sm:flex-none">
              <select
                value={filterTechnician}
                onChange={(e) => { setFilterTechnician(e.target.value); setCurrentPage(1); }}
                className="appearance-none w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-3 pr-8 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-sm"
              >
                <option value="all">Semua Teknisi</option>
                <option value="unassigned">⚠️ Belum Ada Teknisi</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.nama}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>

            {/* Sorting */}
            <div className="relative min-w-[160px] flex-1 sm:flex-none">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-3 pr-8 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-sm"
              >
                <option value="schedule_asc">Jadwal: Terdekat</option>
                <option value="schedule_desc">Jadwal: Terjauh</option>
                <option value="created_desc">Terbaru Diinput</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>

            {/* Reset Filter Button if active */}
            {(searchQuery || filterStatus !== 'all' || filterTechnician !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-10 px-2.5 rounded-xl font-bold cursor-pointer"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 scrollbar-none">
          <button
            onClick={() => { setFilterStatus('all'); setCurrentPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              filterStatus === 'all'
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <span>Semua</span>
            <span className={cn("text-xs px-1.5 py-0.2 rounded-full", filterStatus === 'all' ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700")}>
              {bookings.length}
            </span>
          </button>

          <button
            onClick={() => { setFilterStatus('unassigned'); setCurrentPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              filterStatus === 'unassigned'
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100"
            )}
          >
            <span>Belum Ditugaskan</span>
            <span className={cn("text-xs px-1.5 py-0.2 rounded-full", filterStatus === 'unassigned' ? "bg-amber-700 text-white" : "bg-amber-200 text-amber-900")}>
              {metrics.unassigned}
            </span>
          </button>

          <button
            onClick={() => { setFilterStatus('scheduled'); setCurrentPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              filterStatus === 'scheduled'
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <span>Scheduled</span>
            <span className={cn("text-xs px-1.5 py-0.2 rounded-full", filterStatus === 'scheduled' ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-700")}>
              {metrics.scheduled}
            </span>
          </button>

          <button
            onClick={() => { setFilterStatus('on process'); setCurrentPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              filterStatus === 'on process'
                ? "bg-sky-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <span>On Process</span>
            <span className={cn("text-xs px-1.5 py-0.2 rounded-full", filterStatus === 'on process' ? "bg-sky-700 text-white" : "bg-slate-200 text-slate-700")}>
              {metrics.onProcess}
            </span>
          </button>

          <button
            onClick={() => { setFilterStatus('done'); setCurrentPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              filterStatus === 'done'
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <span>Done</span>
            <span className={cn("text-xs px-1.5 py-0.2 rounded-full", filterStatus === 'done' ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-700")}>
              {metrics.done}
            </span>
          </button>

          <button
            onClick={() => { setFilterStatus('delayed'); setCurrentPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              filterStatus === 'delayed'
                ? "bg-orange-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <span>Delayed</span>
            <span className={cn("text-xs px-1.5 py-0.2 rounded-full", filterStatus === 'delayed' ? "bg-orange-700 text-white" : "bg-slate-200 text-slate-700")}>
              {metrics.delayed}
            </span>
          </button>

          <button
            onClick={() => { setFilterStatus('cancelled'); setCurrentPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              filterStatus === 'cancelled'
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <span>Cancelled</span>
            <span className={cn("text-xs px-1.5 py-0.2 rounded-full", filterStatus === 'cancelled' ? "bg-rose-700 text-white" : "bg-slate-200 text-slate-700")}>
              {metrics.cancelled}
            </span>
          </button>
        </div>
      </div>

      {/* DATA CONTENT (TABLE / MOBILE CARDS) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-900 font-bold text-base">Memuat Data Booking...</p>
            <p className="text-xs text-slate-500 mt-1">Mengambil jadwal dan status teknisi terkini.</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          /* EMPTY STATE */
          <div className="p-16 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Tidak Ada Tiket Booking Ditemukan</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Tidak ada data yang cocok dengan kriteria pencarian atau filter yang Anda pilih saat ini.
            </p>
            <Button
              onClick={handleResetFilters}
              variant="outline"
              className="rounded-xl border-slate-200 font-bold text-xs cursor-pointer"
            >
              Reset Semua Filter
            </Button>
          </div>
        ) : (
          <>
            {/* MOBILE CARDS VIEW (< md) */}
            <div className="block md:hidden divide-y divide-gray-100">
              {paginatedBookings.map(b => {
                const assignedTech = getAssignedTechnician(b);
                const waLink = getWhatsAppLink(b.customer?.kontak || b.kontak, b.kode_booking, b.customer?.nama || b.nama);

                return (
                  <div key={b.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                    {/* Top Row: Ticket Code & Schedule Date */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleCopyCode(b.kode_booking, e)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-slate-800 font-mono text-xs border border-slate-200 bg-slate-50 font-bold hover:bg-slate-100 cursor-pointer"
                          title="Klik untuk salin kode tiket"
                        >
                          <span>{b.kode_booking}</span>
                          {copiedCode === b.kode_booking ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500" />
                          )}
                        </button>
                        {getDateLabel(b.jadwal_mulai)}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-600 font-bold">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {b.jadwal_mulai
                            ? `${new Date(b.jadwal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
                            : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Customer & Service Info */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-snug">
                          {b.customer?.nama || b.nama || '-'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <span>{b.layanan?.nama_layanan || b.layanan?.nama || b.nama_layanan || 'Service AC'}</span>
                          {b.jumlah_unit > 1 && (
                            <span className="font-bold text-blue-600 bg-blue-50 px-1 rounded text-xs">
                              {b.jumlah_unit} Unit
                            </span>
                          )}
                        </div>
                      </div>

                      {/* WhatsApp Button if phone available */}
                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="Chat WhatsApp Pelanggan"
                        >
                          <MessageSquare className="w-4 h-4" />
<span className="sr-only"> (buka di tab baru)</span>
                        </a>
                      )}
                    </div>

                    {/* Address snippet if available */}
                    {b.alamat && (
                      <p className="text-xs text-slate-500 flex items-start gap-1 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <span>{b.alamat}</span>
                      </p>
                    )}

                    {/* Assignment & Status Controls */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      {/* Status Selector */}
                      <div>
                        <label htmlFor="admin-bookings-f1" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                        <div className="relative">
                          <select
                            id="admin-bookings-f1"
                            value={b.status}
                            onChange={(e) => handleStatus && handleStatus(b.id, e.target.value)}
                            className={cn(
                              "appearance-none w-full border rounded-xl py-1.5 pl-2.5 pr-7 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm",
                              b.status === 'scheduled' ? "bg-amber-50 text-amber-800 border-amber-200" :
                                b.status === 'on process' ? "bg-sky-50 text-sky-800 border-sky-200" :
                                  b.status === 'done' ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                                    b.status === 'cancelled' ? "bg-rose-50 text-rose-800 border-rose-200" :
                                      b.status === 'delayed' ? "bg-orange-50 text-orange-800 border-orange-200" :
                                        "bg-slate-50 text-slate-800 border-slate-200"
                            )}
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="on process">On Process</option>
                            <option value="done">Done</option>
                            <option value="delayed">Delayed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                      </div>

                      {/* Technician Assign Selector */}
                      <div>
                        <label htmlFor="admin-bookings-f2" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Teknisi</label>
                        {isAdmin ? (
                          <div className="relative">
                            <select
                              id="admin-bookings-f2"
                              value={assignedTech?.id || ''}
                              onChange={(e) => {
                                const tId = parseInt(e.target.value);
                                if (tId && handleAssign) {
                                  handleAssign(b.id, tId);
                                  if (onBookingCreated) onBookingCreated();
                                  window.dispatchEvent(new CustomEvent('nara-booking-updated'));
                                }
                              }}
                              className={cn(
                                "appearance-none w-full border rounded-xl py-1.5 pl-2.5 pr-7 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm",
                                assignedTech
                                  ? "bg-white text-slate-800 border-slate-200"
                                  : "bg-amber-50 text-amber-800 border-amber-300 font-bold"
                              )}
                            >
                              <option value="">⚠️ Tugaskan...</option>
                              {technicians.map(t => (
                                <option key={t.id} value={t.id}>{t.nama}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 py-1.5 font-bold">
                            <Wrench className="w-3.5 h-3.5 text-slate-500" />
                            <span>{assignedTech?.nama || 'Belum ditugaskan'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-2 flex justify-end gap-1.5 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openInvoiceModal(b)}
                        className="text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 h-8 px-2.5 rounded-lg flex items-center gap-1 cursor-pointer"
                        title="Lihat & Cetak E-Invoice"
                      >
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Invoice</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReschedule(b)}
                        className="text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-100 h-8 px-2 rounded-lg flex items-center gap-1 cursor-pointer"
                        title="Ubah Tanggal"
                      >
                        <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Ubah Tanggal</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedBookingForDetail(b)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2.5 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                    <th className="py-4 px-6">Waktu & Jadwal</th>
                    <th className="py-4 px-6">Kode & Layanan</th>
                    <th className="py-4 px-6">Pelanggan & Lokasi</th>
                    <th className="py-4 px-6">Teknisi Bertugas</th>
                    <th className="py-4 px-6">Status Pengerjaan</th>
                    <th className="py-4 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedBookings.map(b => {
                    const assignedTech = getAssignedTechnician(b);
                    const waLink = getWhatsAppLink(b.customer?.kontak || b.kontak, b.kode_booking, b.customer?.nama || b.nama);

                    return (
                      <tr
                        key={b.id}
                        className={cn(
                          "hover:bg-blue-50/30 transition-colors group",
                          !assignedTech && b.status === 'scheduled' && "bg-amber-50/20"
                        )}
                      >
                        {/* WAKTU & JADWAL */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {b.jadwal_mulai
                                ? new Date(b.jadwal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '-'}
                            </span>
                            {getDateLabel(b.jadwal_mulai)}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>
                              {b.jadwal_mulai
                                ? `${new Date(b.jadwal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
                                : '-'}
                            </span>
                          </div>
                        </td>

                        {/* KODE & LAYANAN */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200/90 px-2 py-0.5 rounded-md">
                              {b.kode_booking}
                            </span>
                            <button
                              onClick={(e) => handleCopyCode(b.kode_booking, e)}
                              className="text-slate-500 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
                              title="Salin Kode Tiket"
                            >
                              {copiedCode === b.kode_booking ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-bold text-xs text-slate-900">
                              {b.layanan?.nama_layanan || b.layanan?.nama || b.nama_layanan || 'Service AC'}
                            </span>
                            {b.jumlah_unit > 1 && (
                              <span className="text-xs font-black bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200/50">
                                {b.jumlah_unit} Unit
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            {formatRupiah(b.layanan?.harga || 0)}
                          </div>
                        </td>

                        {/* PELANGGAN & LOKASI */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                              {(b.customer?.nama || b.nama || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-900 leading-tight">
                                {b.customer?.nama || b.nama || '-'}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <span>{b.customer?.kontak || b.kontak || '-'}</span>
                                {waLink && (
                                  <a
                                    href={waLink}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline flex items-center gap-0.5 ml-1"
                                    title="Hubungi via WhatsApp"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    <span>WA</span>
<span className="sr-only"> (buka di tab baru)</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                          {b.alamat && (
                            <div className="text-xs text-slate-500 truncate max-w-[220px] mt-1 ml-9" title={b.alamat}>
                              {b.alamat}
                            </div>
                          )}
                        </td>

                        {/* TEKNISI */}
                        <td className="py-3.5 px-6">
                          {isAdmin ? (
                            <div className="relative inline-block w-48">
                              <select
                                value={assignedTech?.id || ''}
                                onChange={(e) => {
                                  const tId = parseInt(e.target.value);
                                  if (tId && handleAssign) {
                                    handleAssign(b.id, tId);
                                    if (onBookingCreated) onBookingCreated();
                                    window.dispatchEvent(new CustomEvent('nara-booking-updated'));
                                  }
                                }}
                                className={cn(
                                  "appearance-none w-full border rounded-xl py-2 pl-3 pr-8 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-sm transition-all",
                                  assignedTech
                                    ? "bg-white text-slate-800 border-slate-200"
                                    : "bg-amber-50 text-amber-800 border-amber-300 font-bold"
                                )}
                              >
                                <option value="">⚠️ Tugaskan Teknisi...</option>
                                {technicians.map(t => (
                                  <option key={t.id} value={t.id}>{t.nama}</option>
                                ))}
                              </select>
                              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs">
                              {assignedTech ? (
                                <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                                  <UserCheck className="w-4 h-4 text-emerald-600" />
                                  <span>{assignedTech.nama}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-1 rounded-md font-bold">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Belum Ditugaskan</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* STATUS */}
                        <td className="py-3.5 px-6">
                          <div className="relative inline-block w-38">
                            <select
                              value={b.status}
                              onChange={(e) => handleStatus && handleStatus(b.id, e.target.value)}
                              className={cn(
                                "appearance-none w-full border rounded-xl py-2 pl-3 pr-8 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm transition-all",
                                b.status === 'scheduled' ? "bg-amber-50 text-amber-800 border-amber-200" :
                                  b.status === 'on process' ? "bg-sky-50 text-sky-800 border-sky-200" :
                                    b.status === 'done' ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                                      b.status === 'cancelled' ? "bg-rose-50 text-rose-800 border-rose-200" :
                                        b.status === 'delayed' ? "bg-orange-50 text-orange-800 border-orange-200" :
                                          "bg-slate-50 text-slate-800 border-slate-200"
                              )}
                            >
                              <option value="scheduled">Scheduled</option>
                              <option value="on process">On Process</option>
                              <option value="done">Done</option>
                              <option value="delayed">Delayed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          </div>
                        </td>

                        {/* AKSI */}
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openInvoiceModal(b)}
                              className="text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 h-8 px-2.5 rounded-lg flex items-center gap-1 cursor-pointer"
                              title="Lihat & Cetak E-Invoice"
                            >
                              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Invoice</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReschedule(b)}
                              className="text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-100 h-8 px-2 rounded-lg flex items-center gap-1 cursor-pointer"
                              title="Ubah Tanggal"
                            >
                              <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                              <span>Ubah Tanggal</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedBookingForDetail(b)}
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2.5 rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINATION TOOLBAR */}
            <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
              <div>
                Menampilkan <strong className="text-slate-900">{Math.min(filteredBookings.length, (currentPage - 1) * itemsPerPage + 1)}</strong> - <strong className="text-slate-900">{Math.min(filteredBookings.length, currentPage * itemsPerPage)}</strong> dari <strong className="text-slate-900">{filteredBookings.length}</strong> tiket booking
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm transition-all"
                  >
                    Sebelumnya
                  </button>
                  <div className="px-3 py-1 font-bold text-slate-800">
                    Hal {currentPage} / {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm transition-all"
                  >
                    Selanjutnya
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL RINCIAN BOOKING (360 VIEW) */}
      {selectedBookingForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-900">
                    {selectedBookingForDetail.kode_booking}
                  </span>
                  <Badge className={cn(
                    "text-xs font-bold uppercase",
                    selectedBookingForDetail.status === 'scheduled' ? "bg-amber-100 text-amber-800" :
                      selectedBookingForDetail.status === 'on process' ? "bg-sky-100 text-sky-800" :
                        selectedBookingForDetail.status === 'done' ? "bg-emerald-100 text-emerald-800" :
                          selectedBookingForDetail.status === 'delayed' ? "bg-orange-100 text-orange-800" :
                            "bg-rose-100 text-rose-800"
                  )}>
                    {selectedBookingForDetail.status === 'done' ? <CheckCircle2 className="w-3 h-3 mr-1" /> :
                     selectedBookingForDetail.status === 'on process' ? <Wrench className="w-3 h-3 mr-1" /> :
                     selectedBookingForDetail.status === 'scheduled' ? <CalendarClock className="w-3 h-3 mr-1" /> :
                     selectedBookingForDetail.status === 'delayed' ? <AlertCircle className="w-3 h-3 mr-1" /> :
                     <AlertTriangle className="w-3 h-3 mr-1" />}
                    {selectedBookingForDetail.status.toUpperCase()}
                  </Badge>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-2">
                  Rincian Tiket Booking Servis
                </h3>
              </div>
              <button
                onClick={() => setSelectedBookingForDetail(null)}
                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              {/* Jadwal Pelaksanaan */}
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">Waktu Jadwal</span>
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                    <span>
                      {selectedBookingForDetail.jadwal_mulai
                        ? new Date(selectedBookingForDetail.jadwal_mulai).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>
                      {selectedBookingForDetail.jadwal_mulai
                        ? `${new Date(selectedBookingForDetail.jadwal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
                        : '-'}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openReschedule(selectedBookingForDetail)}
                  className="rounded-xl border-blue-200 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs h-9 px-3 flex items-center gap-1.5 shadow-sm"
                >
                  <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ubah Jadwal</span>
                </Button>
              </div>

              {/* Data Pelanggan */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">Informasi Pelanggan</h4>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Nama Pelanggan:</span>
                  <span className="font-bold text-slate-900">{selectedBookingForDetail.customer?.nama || selectedBookingForDetail.nama || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Nomor Telepon:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{selectedBookingForDetail.customer?.kontak || selectedBookingForDetail.kontak || '-'}</span>
                    {getWhatsAppLink(selectedBookingForDetail.customer?.kontak || selectedBookingForDetail.kontak, selectedBookingForDetail.kode_booking, selectedBookingForDetail.customer?.nama || selectedBookingForDetail.nama) && (
                      <a
                        href={getWhatsAppLink(selectedBookingForDetail.customer?.kontak || selectedBookingForDetail.kontak, selectedBookingForDetail.kode_booking, selectedBookingForDetail.customer?.nama || selectedBookingForDetail.nama)}
                        target="_blank" rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat WA</span>
<span className="sr-only"> (buka di tab baru)</span>
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-500 shrink-0">Alamat Servis:</span>
                  <span className="font-medium text-slate-800 text-right">{selectedBookingForDetail.alamat || '-'}</span>
                </div>
              </div>

              {/* Layanan & Unit AC */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">Layanan & Unit AC</h4>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Layanan:</span>
                  <span className="font-bold text-slate-900">{selectedBookingForDetail.layanan?.nama_layanan || selectedBookingForDetail.layanan?.nama || selectedBookingForDetail.nama_layanan || 'Service AC'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Jumlah Unit:</span>
                  <span className="font-bold text-slate-900">{selectedBookingForDetail.jumlah_unit || 1} Unit</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Estimasi Biaya Dasar:</span>
                  <span className="font-bold text-blue-600">{formatRupiah(selectedBookingForDetail.layanan?.harga || 0)}</span>
                </div>
                {selectedBookingForDetail.keluhan && (
                  <div className="pt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 block mb-1">Catatan Keluhan:</span>
                    <p className="text-slate-700 italic text-xs leading-relaxed">"{selectedBookingForDetail.keluhan}"</p>
                  </div>
                )}
              </div>

              {/* Teknisi Bertugas */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">Penugasan Teknisi</h4>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Teknisi:</span>
                  <span className="font-bold text-slate-900">
                    {getAssignedTechnician(selectedBookingForDetail)?.nama || (
                      <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">Belum Ditugaskan</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => openInvoiceModal(selectedBookingForDetail)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-4 h-9 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/20"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Cetak E-Invoice</span>
                </Button>

                <a
                  href={`/status/${selectedBookingForDetail.kode_booking}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Status Publik</span>
<span className="sr-only"> (buka di tab baru)</span>
                </a>
              </div>

              <Button
                onClick={() => setSelectedBookingForDetail(null)}
                className="bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl px-5 h-9 cursor-pointer"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UBAH TANGGAL (RESCHEDULE JADWAL) */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Ubah Tanggal Servis</h3>
                  <span className="font-mono text-xs text-slate-500 font-bold">{rescheduleBooking.kode_booking}</span>
                </div>
              </div>
              <button
                onClick={() => setRescheduleBooking(null)}
                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-xs text-blue-900">
                <span className="font-bold block">Pelanggan: {rescheduleBooking.customer?.nama || rescheduleBooking.nama}</span>
                <span className="text-blue-700">Layanan: {rescheduleBooking.layanan?.nama_layanan || rescheduleBooking.layanan?.nama || 'Service AC'}</span>
              </div>

              {/* Tanggal Baru */}
              <div>
                <label htmlFor="admin-bookings-f3" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tanggal Baru:
                </label>
                <input
                  id="admin-bookings-f3"
                  type="date"
                  required
                  value={newRescheduleDate}
                  onChange={(e) => setNewRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-xs text-slate-500 mt-1 block">
                  *Operasional: Senin - Sabtu (Minggu Libur)
                </span>
              </div>

              {/* Jam Baru */}
              <div>
                <label htmlFor="admin-bookings-f4" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Jam Kunjungan:
                </label>
                <select
                  id="admin-bookings-f4"
                  value={newRescheduleTime}
                  onChange={(e) => setNewRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="08:00">08:00 WIB</option>
                  <option value="09:00">09:00 WIB</option>
                  <option value="10:00">10:00 WIB</option>
                  <option value="11:00">11:00 WIB</option>
                  <option value="13:00">13:00 WIB</option>
                  <option value="14:00">14:00 WIB</option>
                  <option value="15:00">15:00 WIB</option>
                  <option value="16:00">16:00 WIB</option>
                </select>
              </div>

              {/* Alasan Perubahan */}
              <div>
                <label htmlFor="admin-bookings-f5" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alasan Perubahan Jadwal:
                </label>
                <textarea
                  id="admin-bookings-f5"
                  rows={2}
                  required
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Contoh: Permintaan pelanggan atau teknisi berhalangan"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRescheduleBooking(null)}
                  className="rounded-xl border-slate-200 font-bold text-xs h-9 cursor-pointer"
                >
                  Batal
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmittingReschedule}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-9 px-4 cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  {isSubmittingReschedule && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Tanggal Baru</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INPUT BOOKING MODAL */}
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

      {/* MODAL E-INVOICE RESMI (OFFICIAL INVOICE PAPER) */}
      {isInvoiceModalOpen && selectedInvoiceBooking && typeof document !== 'undefined' && createPortal(
        <div 
          id="invoice-print-portal"
          onClick={(e) => { if (e.target === e.currentTarget) setIsInvoiceModalOpen(false); }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex justify-center items-start p-3 sm:p-6 lg:p-8 invoice-modal-backdrop print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full print:h-auto"
        >
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-2 sm:my-4 animate-in fade-in zoom-in-95 duration-200 invoice-modal-card relative flex flex-col print:overflow-visible print:max-w-none print:w-full print:border-none print:shadow-none print:my-0 print:rounded-none">
            
            {/* Modal Header Actions */}
            <div className="sticky top-0 z-20 p-3 sm:p-4 bg-slate-900 text-white flex items-center justify-between shadow-md print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-sky-400" />
                <span className="font-black text-xs sm:text-sm text-white truncate">
                  E-Invoice & SPK Resmi • {selectedInvoiceBooking.kode_booking || `AC-${selectedInvoiceBooking.id}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handlePrintInvoice}
                  className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20 h-8 sm:h-9"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Cetak / Download PDF</span>
                  <span className="sm:hidden">Cetak</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="rounded-xl text-xs font-bold border-slate-700 bg-slate-800 text-slate-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center gap-1 cursor-pointer h-8 sm:h-9 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Tutup</span>
                </Button>
              </div>
            </div>

            {/* Official Printable Paper Area */}
            <div className="overflow-x-auto bg-white flex-1 print:overflow-visible print:p-0 print:w-full">
              <OfficialInvoicePaper 
                booking={selectedInvoiceBooking} 
                isPaidOverride={selectedInvoiceBooking.status === 'done'}
              />
            </div>

            {/* Modal Bottom Bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print:hidden">
              <span className="truncate pr-2">Gunakan tombol <strong>Cetak / Download PDF</strong> untuk menyimpan dokumen faktur resmi.</span>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Scoped print styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 10mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-size: 11px !important;
          }
          body.invoice-modal-open #root,
          body:has(#invoice-print-portal) #root {
            display: none !important;
          }
          header, footer, aside, nav, .print\\:hidden, [data-print-hide="true"] {
            display: none !important;
          }
          .invoice-modal-backdrop {
            position: static !important;
            inset: auto !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
          .invoice-modal-card {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
            transform: none !important;
          }
          #printable-invoice {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
        }
      `}</style>
    </div>
  );
}
