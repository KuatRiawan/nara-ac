import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import CompanyLogo from '../components/CompanyLogo';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/toast';
import OfficialInvoicePaper from '../components/OfficialInvoicePaper';
import { 
  Search, 
  Clock, 
  Calendar, 
  Wrench, 
  CheckCircle2, 
  User, 
  ArrowLeft, 
  Loader2, 
  ArrowRight, 
  Printer, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  FileText, 
  Check, 
  Copy, 
  X, 
  AlertTriangle, 
  MessageSquare,
  Sparkles,
  Percent,
  Download,
  Share2,
  CalendarDays
} from 'lucide-react';

export default function StatusPage() {
  const { kode } = useParams();
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useToast();

  const [kodeInput, setKodeInput] = useState(kode || '');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(!!kode);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Modals state
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form for cancel/reschedule verification
  const [verifyKontak, setVerifyKontak] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('09:00');

  const fetchStatus = async (searchKode) => {
    if (!searchKode) return;
    setLoading(true);
    setError('');
    setBooking(null);
    try {
      const res = await api.get(`/public/bookings/${encodeURIComponent(searchKode.trim().toUpperCase())}`);
      const data = res.data || res;
      setBooking(data);
      if (data.kontak) {
        setVerifyKontak(data.kontak);
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.error?.message || err?.message || 'Kode booking tidak ditemukan. Pastikan kode tiket sudah benar (contoh: AC-XXXX).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (kode) {
      setKodeInput(kode.toUpperCase());
      fetchStatus(kode);
    }
  }, [kode]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (kodeInput.trim()) {
      navigate(`/status/${kodeInput.trim().toUpperCase()}`);
      fetchStatus(kodeInput.trim());
    }
  };

  const copyBookingCode = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Status index mapping: 0 = scheduled, 1 = scheduled assigned, 2 = on process, 3 = done
  const statusInfo = useMemo(() => {
    const s = (booking?.status || '').toLowerCase();
    if (s === 'done') {
      return { label: 'Selesai & Bergaransi', color: 'bg-emerald-500 text-white', step: 3, border: 'border-emerald-500' };
    }
    if (s === 'on process') {
      return { label: 'Sedang Dikerjakan di Lokasi', color: 'bg-blue-600 text-white', step: 2, border: 'border-blue-500' };
    }
    if (s === 'rescheduled') {
      return { label: 'Jadwal Diubah', color: 'bg-amber-500 text-white', step: 1, border: 'border-amber-500' };
    }
    if (s === 'delayed') {
      return { label: 'Kedatangan Tertunda', color: 'bg-orange-500 text-white', step: 1, border: 'border-orange-500' };
    }
    if (s === 'cancelled') {
      return { label: 'Dibatalkan', color: 'bg-rose-500 text-white', step: 0, border: 'border-rose-500' };
    }
    return { label: 'Terjadwal (Scheduled)', color: 'bg-sky-600 text-white', step: booking?.teknisi ? 1 : 0, border: 'border-sky-500' };
  }, [booking]);

  // Pricing calculation for invoice
  const invoiceCalc = useMemo(() => {
    if (!booking) return { basePrice: 0, units: 1, subtotal: 0, discount: 0, total: 0, warrantyText: '14 Hari' };
    
    // Base unit price
    let basePrice = booking.harga || 75000;
    const units = booking.jumlah_unit || 1;
    const subtotal = basePrice * units;

    let discount = 0;
    if (units === 2) discount = Math.round(subtotal * 0.05);
    else if (units >= 3) discount = Math.round(subtotal * 0.1);

    const total = subtotal - discount;

    let warrantyText = '14 Hari Kalender';
    const sName = (booking.layanan || '').toLowerCase();
    if (sName.includes('freon') && sName.includes('core')) {
      warrantyText = '45 Hari Penuh Garansi Dingin';
    } else if (sName.includes('core')) {
      warrantyText = '30 Hari Penuh Garansi Pengerjaan';
    }

    return { basePrice, units, subtotal, discount, total, warrantyText };
  }, [booking]);

  // Handle Cancel Action
  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!verifyKontak.trim()) {
      showError('Harap masukkan nomor WhatsApp yang didaftarkan saat booking.');
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/public/bookings/${booking.kode_booking}/cancel`, {
        kontak: verifyKontak.trim(),
        alasan: cancelReason.trim() || 'Dibatalkan oleh pelanggan'
      });
      showSuccess('Jadwal servis berhasil dibatalkan.');
      setIsCancelModalOpen(false);
      fetchStatus(booking.kode_booking);
    } catch (err) {
      showError(err.response?.data?.error?.message || err?.message || 'Gagal membatalkan jadwal. Pastikan nomor kontak sesuai.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reschedule Action
  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!newDate) {
      showError('Silakan pilih tanggal baru.');
      return;
    }
    if (!verifyKontak.trim()) {
      showError('Harap masukkan nomor WhatsApp yang didaftarkan saat booking.');
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/public/bookings/${booking.kode_booking}/reschedule`, {
        jadwal_mulai: `${newDate}T${newTime}:00+07:00`,
        kontak: verifyKontak.trim()
      });
      showSuccess('Jadwal kunjungan teknisi berhasil diperbarui.');
      setIsRescheduleModalOpen(false);
      fetchStatus(booking.kode_booking);
    } catch (err) {
      showError(err.response?.data?.error?.message || err?.message || 'Gagal mengubah jadwal. Pastikan nomor kontak sesuai.');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (isInvoiceOpen) {
      document.body.classList.add('invoice-modal-open');
    } else {
      document.body.classList.remove('invoice-modal-open');
    }
    return () => {
      document.body.classList.remove('invoice-modal-open');
    };
  }, [isInvoiceOpen]);

  const handlePrintInvoice = () => {
    const origTitle = document.title;
    document.title = `Invoice_${booking?.kode_booking || 'NARA'}_CV_Nara_Teknindotama`;
    window.print();
    setTimeout(() => {
      document.title = origTitle;
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-slate-50 to-white font-sans flex flex-col text-slate-800 print:bg-white print:min-h-0 print:block">
      
      {/* SCOPED PRINT STYLES FOR FLAWLESS A4 PRINTING */}
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
            overflow: visible !important;
            color: #0f172a !important;
          }
          .avoid-page-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ============================================================== */}
      {/* 1. TOP NAVBAR                                                 */}
      {/* ============================================================== */}
      <header className="bg-white/90 backdrop-blur-md border-b border-sky-100/80 sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex justify-between items-center">
          <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
            <CompanyLogo iconSize="h-8" />
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/booking">
              <Button 
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Booking Baru</span>
              </Button>
            </Link>

            <Link to="/">
              <Button 
                variant="outline" 
                size="sm"
                className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Beranda</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN TRACKING CONTENT                                       */}
      {/* ============================================================== */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 print:hidden">
        
        {/* Search Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider border border-blue-200 mb-3">
            <FileText className="w-3.5 h-3.5" /> Pelacakan Tiket Digital
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Lacak Status Servis AC
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Pantau tahapan pengerjaan teknisi dan unduh invoice resmi secara transparan.
          </p>

          {/* Quick Search Input */}
          <form onSubmit={handleSearch} className="mt-6 flex items-center gap-2 max-w-md mx-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={kodeInput}
                onChange={(e) => setKodeInput(e.target.value.toUpperCase())}
                placeholder="Contoh: AC-XXXX"
                className="h-12 pl-10 uppercase font-mono font-bold tracking-wider rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !kodeInput.trim()}
              className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Lacak</span>
            </Button>
          </form>
        </div>

        {/* Global Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-3 shadow-xs"
          >
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="flex-1">{error}</span>
          </motion.div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="bg-white rounded-3xl p-8 border border-sky-100 shadow-xl space-y-6 animate-pulse">
            <div className="h-12 bg-slate-100 rounded-2xl w-2/3" />
            <div className="h-28 bg-slate-100 rounded-2xl" />
            <div className="h-40 bg-slate-100 rounded-2xl" />
          </div>
        )}

        {/* ============================================================== */}
        {/* TICKET DETAIL CARD (IF LOADED)                                 */}
        {/* ============================================================== */}
        {booking && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Top Ticket Strip */}
            <div className="bg-white rounded-3xl border border-sky-100 shadow-xl shadow-blue-900/5 p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    KODE TIKET SERVIS
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl font-black text-blue-600 font-mono tracking-wider">
                      {booking.kode_booking}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyBookingCode(booking.kode_booking)}
                      className="py-1 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-blue-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-sky-100"
                      title="Salin Kode Tiket"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                {/* Status Badge & Actions */}
                <div className="flex flex-col sm:items-end gap-2">
                  <span className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 w-fit",
                    statusInfo.color
                  )}>
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    {statusInfo.label}
                  </span>

                  <span className="text-xs text-slate-400 font-semibold">
                    Dibuat pada: {booking.created_at ? new Date(booking.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </span>
                </div>
              </div>

              {/* Step Progress Tracker (SOP Flow) */}
              <div className="py-8 border-b border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
                  
                  {/* Step 1: Booking Diterima */}
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-xs transition-all",
                      statusInfo.step >= 0 ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-slate-100 text-slate-400"
                    )}>
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 leading-tight">Booking Diterima</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Tiket terdaftar di sistem</p>
                    </div>
                  </div>

                  {/* Step 2: Teknisi Ditugaskan */}
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-xs transition-all",
                      statusInfo.step >= 1 ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-slate-100 text-slate-400"
                    )}>
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 leading-tight">Teknisi Ditugaskan</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {booking.teknisi ? `Teknisi: ${booking.teknisi}` : 'Menunggu jadwal'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Pengerjaan di Lokasi */}
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-xs transition-all",
                      statusInfo.step >= 2 ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-slate-100 text-slate-400"
                    )}>
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 leading-tight">SOP Pengerjaan</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Proses cuci & cek keluhan</p>
                    </div>
                  </div>

                  {/* Step 4: Selesai & Garansi */}
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-xs transition-all",
                      statusInfo.step >= 3 ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" : "bg-slate-100 text-slate-400"
                    )}>
                      4
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 leading-tight">Selesai & Garansi</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Garansi resmi aktif</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Service & Customer Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
                
                {/* Info 1: Layanan */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Paket Layanan:
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {booking.layanan || 'Cuci AC'}
                  </p>
                  <p className="text-xs font-bold text-blue-600 mt-0.5 font-mono">
                    {invoiceCalc.units} Unit AC
                  </p>
                </div>

                {/* Info 2: Waktu Kunjungan */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Jadwal Kedatangan:
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {booking.jadwal_mulai ? new Date(booking.jadwal_mulai).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                  </p>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    Pukul {booking.jadwal_mulai ? new Date(booking.jadwal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
                  </p>
                </div>

                {/* Info 3: Teknisi Bertugas */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Teknisi Bertugas:
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {booking.teknisi_lengkap || booking.teknisi || 'Teknisi NARA AC'}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
                    <ShieldCheck className="w-3 h-3" /> Teknisi Terverifikasi SOP
                  </span>
                </div>

                {/* Info 4: Lokasi / Alamat */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 sm:col-span-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Alamat Pengerjaan:
                  </span>
                  <p className="font-semibold text-slate-800 text-xs leading-relaxed">
                    {booking.alamat || '-'}
                  </p>
                  {booking.customer_nama && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Pemesan: <strong>{booking.customer_nama}</strong> {booking.kontak ? `(${booking.kontak})` : ''}
                    </p>
                  )}
                </div>

                {/* Info 5: Total Biaya */}
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Total Estimasi Biaya:
                    </span>
                    <p className="text-2xl font-black text-blue-700 font-mono tracking-tight">
                      Rp {invoiceCalc.total.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium mt-1">
                    {booking.status === 'done' ? 'Pembayaran Selesai' : 'Bayar setelah selesai pengerjaan'}
                  </span>
                </div>

              </div>

              {/* Action Toolbar: Print Invoice & Contact WA */}
              <div className="pt-6 mt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                
                {/* Secondary Actions (Cancel / Reschedule if not done) */}
                <div className="flex items-center gap-2">
                  {booking.status === 'scheduled' && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsRescheduleModalOpen(true)}
                        className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                      >
                        Ubah Jadwal
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCancelModalOpen(true)}
                        className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                      >
                        Batalkan
                      </Button>
                    </>
                  )}

                  {booking.status === 'done' && (
                    <Link to={`/feedback/${booking.kode_booking}`}>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Beri Ulasan Servis</span>
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Primary Actions: Print Invoice & WA Share */}
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/6281385293137?text=Halo%20Admin%20NARA%20AC,%20saya%20ingin%20konfirmasi%20tiket%20servis%20${encodeURIComponent(booking.kode_booking)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Chat CS WhatsApp</span>
                    </Button>
                  </a>

                  {/* Tombol Buka & Cetak Invoice Resmi */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsInvoiceOpen(true)}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Cetak Invoice Resmi</span>
                  </Button>
                </div>

              </div>

            </div>
          </motion.div>
        )}

      </main>

      {/* ============================================================== */}
      {/* 3. MODAL E-INVOICE RESMI DENGAN KOP SURAT CV. NARA TEKNINDOTAMA */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isInvoiceOpen && booking && typeof document !== 'undefined' && createPortal(
          <div 
            id="invoice-print-portal"
            className="invoice-modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full print:h-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="invoice-modal-card bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] print:max-w-none print:w-full print:rounded-none print:shadow-none print:border-none print:max-h-none print:h-auto print:overflow-visible print:block print:transform-none"
            >
              {/* Modal Top Actions (Non-printable) */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-sky-400" />
                  Pratinjau E-Invoice Resmi CV. Nara Teknindotama
                </span>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handlePrintInvoice}
                    className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak / Unduh PDF</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => setIsInvoiceOpen(false)}
                    className="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Tutup modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* PRINTABLE INVOICE PAPER AREA (IDENTIK DENGAN ADMIN) */}
              <OfficialInvoicePaper booking={booking} />
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 4. MODAL VERIFIKASI RESCHEDULE JADWAL                          */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isRescheduleModalOpen && booking && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>Ubah Jadwal Kunjungan</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmReschedule} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Kunjungan Baru *</label>
                  <Input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="h-11 rounded-xl text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jam Kedatangan Baru *</label>
                  <select
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 text-xs font-semibold bg-white"
                  >
                    <option value="08:00">08:00 WIB (Pagi)</option>
                    <option value="09:00">09:00 WIB (Pagi)</option>
                    <option value="10:00">10:00 WIB (Pagi)</option>
                    <option value="11:00">11:00 WIB (Pagi)</option>
                    <option value="13:00">13:00 WIB (Siang)</option>
                    <option value="14:00">14:00 WIB (Siang)</option>
                    <option value="15:00">15:00 WIB (Sore)</option>
                    <option value="16:00">16:00 WIB (Sore)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Verifikasi No. WhatsApp Pemesan *</label>
                  <Input
                    type="tel"
                    value={verifyKontak}
                    onChange={(e) => setVerifyKontak(e.target.value)}
                    placeholder="Masukkan no WhatsApp saat booking"
                    className="h-11 rounded-xl text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Verifikasi keamanan kepemilikan tiket booking.
                  </p>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRescheduleModalOpen(false)}
                    className="h-10 px-4 rounded-xl text-xs font-bold"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Jadwal Baru'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 5. MODAL VERIFIKASI PEMBATALAN JADWAL                          */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isCancelModalOpen && booking && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg text-rose-600 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>Batalkan Jadwal Servis</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmCancel} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Verifikasi No. WhatsApp Pemesan *</label>
                  <Input
                    type="tel"
                    value={verifyKontak}
                    onChange={(e) => setVerifyKontak(e.target.value)}
                    placeholder="Masukkan no WhatsApp saat booking"
                    className="h-11 rounded-xl text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Alasan Pembatalan (Opsional)</label>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Contoh: AC sudah normal / ada keperluan mendadak..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs bg-slate-50 focus:bg-white resize-y"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCancelModalOpen(false)}
                    className="h-10 px-4 rounded-xl text-xs font-bold"
                  >
                    Kembali
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ya, Batalkan Jadwal'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 6. FOOTER COPYRIGHT                                            */}
      {/* ============================================================== */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-400 mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} CV. Nara Teknindotama. Seluruh hak cipta dilindungi.</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Sistem Informasi Pelacakan Tiket Digital & Garansi Servis AC
          </p>
        </div>
      </footer>

    </div>
  );
}
