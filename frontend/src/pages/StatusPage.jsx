import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import CompanyLogo from '../components/CompanyLogo';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/toast';
import { useBusinessProfile, buildWhatsAppUrl } from '../hooks/useBusinessProfile';
import OfficialInvoicePaper from '../components/OfficialInvoicePaper';
import { Badge } from '../components/ui/badge';
import { Search, Clock, Wrench, CheckCircle2, ArrowLeft, Loader2, Printer, ShieldCheck, FileText, Check, CalendarCheck, XCircle, AlertCircle, Copy, X, AlertTriangle, MessageSquare, Sparkles, CalendarDays, Ticket, Star, CreditCard, Upload, Send, DollarSign, Wallet } from 'lucide-react';

export default function StatusPage({ initialInvoiceOpen = false }) {
  const { kode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { error: showError, success: showSuccess } = useToast();
  const { whatsappNumber } = useBusinessProfile();

  const isInvoiceRoute = location.pathname.startsWith('/invoice');
  const [kodeInput, setKodeInput] = useState(kode || '');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(!!kode);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Modals state
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(initialInvoiceOpen || isInvoiceRoute);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Payment states (BR-34 s/d BR-43)
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [proofNominal, setProofNominal] = useState('');
  const [proofCatatan, setProofCatatan] = useState('');
  const [proofKontak, setProofKontak] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState('pay_after_service');
  const [selectedMethod, setSelectedMethod] = useState('transfer');
  const [isSubmittingScheme, setIsSubmittingScheme] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // Invoice data from backend
  const [invoiceData, setInvoiceData] = useState(null);

  // Warranty and claim states (BR-23 s/d BR-33)
  const [warrantyInfo, setWarrantyInfo] = useState(null);
  const [claimKeluhan, setClaimKeluhan] = useState('');
  const [claimRating, setClaimRating] = useState(5);
  const [claimReview, setClaimReview] = useState('');
  const [claimVerifyKontak, setClaimVerifyKontak] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

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
    setInvoiceData(null);
    setWarrantyInfo(null);
    try {
      const res = await api.get(`/public/bookings/${encodeURIComponent(searchKode.trim().toUpperCase())}`);
      const data = res.data || res;
      setBooking(data);
      setVerifyKontak('');
      
      // Fetch invoice data from backend
      try {
        const invoiceRes = await api.get(`/public/bookings/${encodeURIComponent(searchKode.trim().toUpperCase())}/invoice`);
        setInvoiceData(invoiceRes.data || invoiceRes);
      } catch (invoiceErr) {
        // If invoice endpoint fails, fall back to null
        setInvoiceData(null);
      }

      // Fetch warranty and claims info (BR-23 s/d BR-33)
      if (data.id) {
        try {
          const wRes = await api.get(`/claims/warranty-info/${data.id}`);
          setWarrantyInfo(wRes.data?.data || null);
        } catch (_) {
          setWarrantyInfo(null);
        }
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

  useEffect(() => {
    if ((initialInvoiceOpen || isInvoiceRoute) && booking) {
      setIsInvoiceOpen(true);
    }
  }, [initialInvoiceOpen, isInvoiceRoute, booking]);

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
    const hasTech = Boolean(booking?.teknisi || booking?.teknisi_lengkap);
    if (s === 'done') {
      return { label: 'Selesai & Bergaransi', color: 'bg-emerald-600 text-white', step: 3, border: 'border-emerald-500', icon: CheckCircle2 };
    }
    if (s === 'on process') {
      return { label: 'Sedang Dikerjakan di Lokasi', color: 'bg-blue-600 text-white', step: 2, border: 'border-blue-500', icon: Wrench };
    }
    if (s === 'rescheduled') {
      return { label: 'Jadwal Diubah', color: 'bg-amber-500 text-white', step: 1, border: 'border-amber-500', icon: CalendarCheck };
    }
    if (s === 'delayed') {
      return { label: 'Kedatangan Tertunda', color: 'bg-orange-500 text-white', step: 1, border: 'border-orange-500', icon: AlertCircle };
    }
    if (s === 'cancelled') {
      return { label: 'Dibatalkan', color: 'bg-rose-500 text-white', step: 0, border: 'border-rose-500', icon: XCircle };
    }
    if (hasTech) {
      return { 
        label: 'Teknisi Dikonfirmasi', 
        color: 'bg-emerald-600 text-white', 
        step: 1, 
        border: 'border-emerald-500', 
        icon: Wrench 
      };
    }
    return { 
      label: 'Menunggu Alokasi Teknisi', 
      color: 'bg-sky-600 text-white', 
      step: 0, 
      border: 'border-sky-500', 
      icon: CalendarCheck 
    };
  }, [booking]);

  // Pricing data sourced exclusively from backend invoice API (single source of truth)
  const invoiceCalc = useMemo(() => {
    if (invoiceData) {
      return {
        basePrice: invoiceData.basePrice || 0,
        units: invoiceData.units || 1,
        subtotal: invoiceData.subtotal || 0,
        discount: invoiceData.discount || 0,
        total: invoiceData.total || 0,
        warrantyText: invoiceData.warrantyText || '14 Hari Kalender'
      };
    }
    // No client-side fallback — invoice data must come from backend
    return { basePrice: 0, units: booking?.jumlah_unit || 1, subtotal: 0, discount: 0, total: 0, warrantyText: '14 Hari' };
  }, [booking, invoiceData]);

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

  // Handle Submit Warranty Claim (BR-24 s/d BR-31)
  const handleConfirmClaim = async (e) => {
    e.preventDefault();
    if (!claimKeluhan.trim() || claimKeluhan.trim().length < 5) {
      showError('Keluhan klaim wajib diisi minimal 5 karakter.');
      return;
    }
    if (!claimVerifyKontak.trim() && !booking.customer_id) {
      showError('Nomor WhatsApp pemesan wajib diisi untuk verifikasi kepemilikan.');
      return;
    }
    setIsSubmittingClaim(true);
    try {
      const res = await api.post('/claims', {
        booking_id: booking.id,
        keluhan: claimKeluhan.trim(),
        rating: claimRating,
        review_komentar: claimReview.trim() || claimKeluhan.trim(),
        kontak: claimVerifyKontak.trim() || booking.kontak,
      });
      showSuccess(res.data?.message || 'Klaim garansi berhasil diajukan.');
      setIsClaimModalOpen(false);
      setClaimKeluhan('');
      setClaimReview('');
      fetchStatus(booking.kode_booking);
    } catch (err) {
      showError(err.response?.data?.error?.message || err?.message || 'Gagal mengajukan klaim garansi.');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  // Handle Unggah Bukti Pembayaran Transfer Bank (BR-37)
  const handleConfirmProof = async (e) => {
    e.preventDefault();
    if (!proofUrl.trim()) {
      showError('URL atau referensi bukti transfer wajib diisi.');
      return;
    }
    const nominalNum = Number(proofNominal);
    if (!nominalNum || nominalNum <= 0) {
      showError('Nominal pembayaran harus berupa angka positif.');
      return;
    }
    setIsSubmittingProof(true);
    try {
      const res = await api.post(`/payments/bookings/${booking.id}/proof`, {
        bukti_url: proofUrl.trim(),
        nominal: nominalNum,
        catatan: proofCatatan.trim(),
        kontak: proofKontak.trim() || booking.kontak,
      });
      showSuccess(res.data?.message || 'Bukti transfer berhasil diunggah. Menunggu verifikasi admin.');
      setIsProofModalOpen(false);
      setProofUrl('');
      setProofNominal('');
      setProofCatatan('');
      fetchStatus(booking.kode_booking);
    } catch (err) {
      showError(err.response?.data?.error?.message || err?.message || 'Gagal mengunggah bukti pembayaran.');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // Handle Pilih/Ubah Skema Pembayaran (BR-35, BR-36)
  const handleConfirmScheme = async (e) => {
    e.preventDefault();
    setIsSubmittingScheme(true);
    try {
      const res = await api.post(`/payments/bookings/${booking.id}/scheme`, {
        skema_pembayaran: selectedScheme,
        metode_pembayaran: selectedMethod,
        kontak: proofKontak.trim() || booking.kontak,
      });
      showSuccess(res.data?.message || 'Skema dan metode pembayaran berhasil diperbarui.');
      setIsSchemeModalOpen(false);
      fetchStatus(booking.kode_booking);
    } catch (err) {
      showError(err.response?.data?.error?.message || err?.message || 'Gagal memperbarui skema pembayaran.');
    } finally {
      setIsSubmittingScheme(false);
    }
  };

  // Handle Kirim Invoice ke WhatsApp (BR-42, BR-43)
  const handleSendWhatsAppInvoice = async () => {
    setIsSendingWhatsApp(true);
    try {
      const res = await api.post(`/payments/bookings/${booking.id}/send-whatsapp`, {
        tipe_invoice: booking.status === 'done' ? 'final' : 'proforma',
      });
      showSuccess(res.data?.message || 'Invoice berhasil dikirim ke WhatsApp pemesan.');
    } catch (err) {
      // Fallback: buka link WhatsApp langsung jika admin belum setup gateway
      const waUrl = buildWhatsAppUrl(whatsappNumber, `Halo Admin NARA AC, mohon kirimkan salinan invoice resmi untuk kode booking ${booking.kode_booking}. Terima kasih.`);
      window.open(waUrl, '_blank');
      showSuccess('Membuka WhatsApp untuk mengirimkan invoice resmi.');
    } finally {
      setIsSendingWhatsApp(false);
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider border border-blue-200 mb-3">
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
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <label htmlFor="status-search" className="sr-only">Masukkan kode booking untuk melacak status servis</label>
              <Input
                id="status-search"
                type="text"
                value={kodeInput}
                onChange={(e) => setKodeInput(e.target.value.toUpperCase())}
                placeholder="Contoh: AC-XXXX"
                className="h-12 pl-10 uppercase font-mono font-bold tracking-wider rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 text-sm"
                required
                aria-label="Kode booking"
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
              
              {/* Ticket Header & Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                    KODE TIKET SERVIS
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className={cn(
                    "px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-2xs flex items-center gap-1.5",
                    statusInfo.color
                  )}>
                    {statusInfo.icon && React.createElement(statusInfo.icon, { className: "w-3.5 h-3.5" })}
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    {statusInfo.label}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
                    Dibuat: {booking.created_at ? new Date(booking.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </span>
                </div>
              </div>

              {/* Highlighted Ticket Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-50/90 via-blue-50/50 to-slate-50 border border-sky-200/80 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-2xs">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Nomor Tiket Pemesanan Resmi
                  </span>
                  <div className="font-mono font-black text-blue-700 text-base sm:text-lg md:text-xl tracking-wider break-all select-all leading-snug">
                    {booking.kode_booking}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyBookingCode(booking.kode_booking)}
                  className="shrink-0 w-full sm:w-auto py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
                  title="Salin Kode Tiket"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
                </button>
              </div>

              {/* Step Progress Tracker (SOP Flow) */}
              <div className="py-8 border-b border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
                  
                  {/* Step 1: Booking Diterima */}
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-xs transition-all",
                      statusInfo.step >= 0 ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-slate-100 text-slate-500"
                    )}>
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 leading-tight">Booking Diterima</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Tiket terdaftar di sistem</p>
                    </div>
                  </div>

                  {/* Step 2: Teknisi Ditugaskan */}
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-xs transition-all",
                      booking?.teknisi || booking?.teknisi_lengkap || statusInfo.step >= 1 
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" 
                        : "bg-slate-100 text-slate-500"
                    )}>
                      {booking?.teknisi || booking?.teknisi_lengkap ? '✓' : '2'}
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                        {booking?.teknisi || booking?.teknisi_lengkap ? 'Teknisi Dikonfirmasi' : 'Penugasan Teknisi'}
                      </h4>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">
                        {booking?.teknisi_lengkap ? `Teknisi: ${booking.teknisi_lengkap}` : (booking?.teknisi ? `Teknisi: ${booking.teknisi}` : 'Menunggu alokasi tim operasional')}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Pengerjaan di Lokasi */}
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-xs transition-all",
                      statusInfo.step >= 2 ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-slate-100 text-slate-500"
                    )}>
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 leading-tight">SOP Pengerjaan</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Proses cuci & cek keluhan</p>
                    </div>
                  </div>

                  {/* Step 4: Selesai & Garansi */}
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-xs transition-all",
                      statusInfo.step >= 3 ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" : "bg-slate-100 text-slate-500"
                    )}>
                      4
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 leading-tight">Selesai & Garansi</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Garansi resmi aktif</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Technician Assignment Highlight Banner */}
              {booking?.teknisi || booking?.teknisi_lengkap ? (
                <div className="mt-6 p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between gap-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-emerald-950">Teknisi Resmi Telah Ditugaskan</h4>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Siap Meluncur
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Teknisi Resmi <strong>{booking.teknisi_lengkap || booking.teknisi}</strong> telah dialokasikan dan siap melayani servis AC Anda sesuai jadwal.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 p-4 rounded-2xl bg-sky-50 border border-sky-200/80 flex items-center gap-3.5 animate-in fade-in duration-300">
                  <div className="w-11 h-11 rounded-2xl bg-sky-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-sky-600/20">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-sky-950">Jadwal Terdaftar — Menunggu Alokasi Teknisi</h4>
                    <p className="text-xs text-sky-800 mt-0.5">
                      Tiket servis Anda sudah terdaftar di sistem. Tim operasional sedang menetapkan teknisi yang paling cocok untuk rute lokasi Anda.
                    </p>
                  </div>
                </div>
              )}

              {/* Service & Customer Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
                
                {/* Info 1: Layanan */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Paket Layanan:
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {booking.layanan || 'Cuci AC'}
                  </p>
                  <p className="text-xs font-bold text-blue-600 mt-0.5 font-mono">
                    {(invoiceData?.units || booking?.jumlah_unit || 1)} Unit AC
                  </p>
                </div>

                {/* Info 2: Waktu Kunjungan */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
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
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Teknisi Bertugas:
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {booking.teknisi_lengkap || booking.teknisi || 'Sedang Dialokasikan'}
                  </p>
                  {booking.teknisi_lengkap || booking.teknisi ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 border border-emerald-200/60">
                      <ShieldCheck className="w-3 h-3" /> Teknisi Terverifikasi SOP
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md mt-1 border border-slate-200/60">
                      <Clock className="w-3 h-3 text-slate-400" /> Menunggu Penugasan Admin
                    </span>
                  )}
                </div>

                {/* Info 4: Lokasi / Alamat */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 sm:col-span-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Alamat Pengerjaan:
                  </span>
                  <p className="font-semibold text-slate-800 text-xs leading-relaxed">
                    {booking.alamat || '-'}
                  </p>
                  {booking.customer_nama && (
                    <p className="text-xs text-slate-500 mt-1">
                      Pemesan: <strong>{booking.customer_nama}</strong> {booking.kontak ? `(${booking.kontak})` : ''}
                    </p>
                  )}
                </div>

                {/* Info 5: Total Biaya */}
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Total Estimasi Biaya:
                    </span>
                    <p className="text-2xl font-black text-blue-700 font-mono tracking-tight">
                      Rp {(invoiceCalc.total || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 font-medium mt-1">
                    {booking.status === 'done' ? 'Pembayaran Selesai' : 'Bayar setelah selesai pengerjaan'}
                  </span>
                </div>

              </div>

              {/* BR-23, BR-24, BR-28: Garansi Servis & Status Klaim */}
              {booking.status === 'done' && warrantyInfo && (
                <div className="mt-6 bg-linear-to-r from-blue-50/70 via-sky-50/50 to-emerald-50/40 rounded-2xl p-5 sm:p-6 border border-blue-100 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-blue-100/80 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="font-black text-sm text-slate-900">Garansi Pengerjaan &amp; Komponen Resmi</h4>
                        <p className="text-2xs text-slate-500 font-medium">Perlindungan resmi CV. Nara Teknindotama</p>
                      </div>
                    </div>
                    <Badge variant={warrantyInfo.is_garansi_aktif ? 'success' : 'secondary'} className="text-2xs font-bold uppercase">
                      {warrantyInfo.is_garansi_aktif ? `Garansi Aktif (${warrantyInfo.sisa_hari_garansi} Hari Lagi)` : 'Masa Garansi Berakhir'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white/80 p-3 rounded-xl border border-blue-100/60">
                      <span className="text-slate-500 font-semibold block text-2xs uppercase">Masa Berlaku</span>
                      <span className="font-bold text-slate-800">{warrantyInfo.durasi_garansi_hari} Hari Kalender</span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-blue-100/60">
                      <span className="text-slate-500 font-semibold block text-2xs uppercase">Berakhir Pada</span>
                      <span className="font-bold text-slate-800">
                        {warrantyInfo.garansi_selesai ? new Date(warrantyInfo.garansi_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                      </span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-blue-100/60">
                      <span className="text-slate-500 font-semibold block text-2xs uppercase">Biaya Pemeriksaan Klaim</span>
                      <span className="font-bold text-emerald-700">100% Bebas Biaya</span>
                    </div>
                  </div>

                  {/* Klaim Aktif Sedang Diproses */}
                  {warrantyInfo.active_claim && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-amber-900 uppercase tracking-wider text-2xs">
                          Klaim Garansi Sedang Aktif: {warrantyInfo.active_claim.kode_klaim}
                        </span>
                        <Badge variant="warning" className="font-bold text-2xs uppercase">
                          {warrantyInfo.active_claim.status}
                        </Badge>
                      </div>
                      <p className="text-slate-700 font-medium">
                        <span className="font-bold text-slate-900">Keluhan:</span> "{warrantyInfo.active_claim.keluhan}"
                      </p>
                      {warrantyInfo.active_claim.jadwal_pemeriksaan ? (
                        <p className="text-blue-800 font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Jadwal Pemeriksaan: {new Date(warrantyInfo.active_claim.jadwal_pemeriksaan).toLocaleString('id-ID')}</span>
                        </p>
                      ) : (
                        <p className="text-amber-800 italic">
                          Menunggu penetapan jadwal pemeriksaan teknisi oleh admin.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Riwayat Klaim Terakhir jika Ditolak */}
                  {warrantyInfo.riwayat_klaim?.[0]?.status === 'ditolak' && !warrantyInfo.active_claim && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-rose-900 text-2xs uppercase">
                          Klaim Sebelumnya Ditolak ({warrantyInfo.riwayat_klaim[0].kode_klaim})
                        </span>
                        <Badge variant="destructive" className="font-bold text-2xs uppercase">Ditolak</Badge>
                      </div>
                      <p className="text-rose-800">
                        <span className="font-bold">Alasan:</span> {warrantyInfo.riwayat_klaim[0].alasan_penolakan || 'Tidak memenuhi kriteria garansi resmi'}
                      </p>
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-2xs text-slate-500">Anda dapat menindaklanjuti perbaikan dengan booking servis berbayar.</span>
                        <Button
                          size="sm"
                          onClick={() => navigate('/booking')}
                          className="bg-slate-900 hover:bg-black text-white text-2xs font-bold rounded-lg h-7 px-3 cursor-pointer"
                        >
                          Booking Servis Berbayar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================== */}
              {/* BR-34 s/d BR-43: INFORMASI SKEMA, METODE PEMBAYARAN & INVOICE */}
              {/* ============================================================== */}
              <div className="mt-6 bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="font-black text-sm text-slate-900">Skema &amp; Status Pembayaran</h4>
                      <p className="text-2xs text-slate-500 font-medium">Pengaturan tagihan dan verifikasi pembayaran resmi</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={booking.status_pembayaran === 'paid' ? 'success' : 'secondary'} className="text-2xs font-bold uppercase">
                      {booking.status_pembayaran === 'paid' ? 'LUNAS (PAID)' : 'TAGIHAN AKTIF (PENDING)'}
                    </Badge>
                  </div>
                </div>

                {/* Grid Status Pembayaran & Skema */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Skema */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-500 font-semibold block text-2xs uppercase tracking-wider mb-1">
                        Skema Pembayaran
                      </span>
                      <p className="font-bold text-slate-900 text-sm">
                        {booking.skema_pembayaran === 'full_upfront' ? 'Bayar Lunas di Awal' :
                          booking.skema_pembayaran === 'dp_50' ? 'Uang Muka (DP 50%)' :
                            'Bayar Setelah Servis'}
                      </p>
                    </div>
                    {booking.status !== 'done' && booking.status_pembayaran !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedScheme(booking.skema_pembayaran || 'pay_after_service');
                          setSelectedMethod(booking.metode_pembayaran || 'transfer');
                          setProofKontak(booking.kontak || '');
                          setIsSchemeModalOpen(true);
                        }}
                        className="text-2xs font-bold text-blue-600 hover:text-blue-700 hover:underline text-left mt-2 cursor-pointer"
                      >
                        Ubah Skema Bayar &rarr;
                      </button>
                    )}
                  </div>

                  {/* Metode */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 font-semibold block text-2xs uppercase tracking-wider mb-1">
                      Metode Pembayaran
                    </span>
                    <p className="font-bold text-slate-900 text-sm">
                      {booking.metode_pembayaran === 'transfer' ? 'Transfer Bank Resmi' :
                        booking.metode_pembayaran === 'qris' ? 'QRIS Dinamis' :
                          'Tunai kepada Teknisi'}
                    </p>
                    <span className="text-2xs text-slate-500 mt-1 block">
                      {booking.metode_pembayaran === 'transfer' ? 'BCA / Mandiri CV. Nara' : 'Disediakan saat servis'}
                    </span>
                  </div>

                  {/* Verifikasi Bukti Bayar Transfer */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-500 font-semibold block text-2xs uppercase tracking-wider mb-1">
                        Status Verifikasi Pembayaran
                      </span>
                      {booking.metode_pembayaran === 'transfer' ? (
                        <div>
                          {booking.status_verifikasi_pembayaran === 'diverifikasi' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Diverifikasi Admin
                            </span>
                          ) : booking.status_verifikasi_pembayaran === 'ditolak' ? (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded text-xs border border-rose-200">
                              <XCircle className="w-3.5 h-3.5" /> Bukti Ditolak
                            </span>
                          ) : booking.bukti_pembayaran_url ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded text-xs border border-amber-200">
                              <Clock className="w-3.5 h-3.5" /> Menunggu Verifikasi
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs italic">
                              Belum mengunggah bukti
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 font-semibold text-xs">
                          Tidak memerlukan verifikasi manual
                        </span>
                      )}
                    </div>

                    {booking.metode_pembayaran === 'transfer' && booking.status_verifikasi_pembayaran !== 'diverifikasi' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setProofKontak(booking.kontak || '');
                          setProofNominal(booking.skema_pembayaran === 'dp_50' ? Math.round((invoiceCalc.total || 0) * 0.5) : (invoiceCalc.total || 0));
                          setIsProofModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-2xs font-bold h-7 px-2.5 mt-2 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>{booking.bukti_pembayaran_url ? 'Unggah Ulang Bukti' : 'Unggah Bukti Transfer'}</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Catatan Verifikasi Ditolak */}
                {booking.status_verifikasi_pembayaran === 'ditolak' && booking.catatan_verifikasi && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Alasan Penolakan Bukti Transfer:</span>
                      <p className="mt-0.5">{booking.catatan_verifikasi}</p>
                    </div>
                  </div>
                )}

                {/* Info Kelebihan Pembayaran / Refund (BR-41) */}
                {(Number(booking.refund_nominal || 0) > 0 || booking.refund_status === 'processed') && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 flex items-start gap-2.5">
                    <DollarSign className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black uppercase tracking-wider text-2xs text-emerald-800 block">
                        Pengembalian Kelebihan Pembayaran
                      </span>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        Kelebihan pembayaran sebesar <strong>Rp {Number(booking.refund_nominal || 0).toLocaleString('id-ID')}</strong> telah diproses pengembaliannya ke rekening pemesan.
                      </p>
                      {booking.refund_catatan && (
                        <p className="text-2xs text-slate-500 mt-1 italic">
                          Catatan Finance: "{booking.refund_catatan}"
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Info BR-38: Booking belum dibayar tetap aktif */}
                {booking.status_pembayaran !== 'paid' && (
                  <p className="text-2xs text-slate-500 italic">
                    *Sesuai ketentuan layanan: Booking servis tetap aktif terjadwal dan teknisi akan tetap datang sesuai waktu yang telah disepakati.
                  </p>
                )}
              </div>

              {/* Action Toolbar: Print Invoice & Contact WA */}
              <div className="pt-6 mt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                
                {/* Secondary Actions (Cancel / Reschedule / Claim if done) */}
                <div className="flex flex-wrap items-center gap-2">
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

                  {booking.status === 'done' && warrantyInfo?.is_garansi_aktif && !warrantyInfo?.active_claim && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setClaimVerifyKontak(booking.kontak || '');
                        setIsClaimModalOpen(true);
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Ajukan Klaim Garansi</span>
                    </Button>
                  )}
                </div>

                {/* Primary Actions: Print Invoice & WA Share */}
                <div className="flex items-center gap-2">
                  <a
                    href={buildWhatsAppUrl(whatsappNumber, `Halo Admin NARA AC, saya ingin konfirmasi tiket servis ${booking.kode_booking}`)}
                    target="_blank" rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Chat CS WhatsApp</span>
                    </Button>
<span className="sr-only"> (buka di tab baru)</span>
                  </a>

                  {/* Tombol Kirim Salinan Invoice ke WhatsApp (BR-42) */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSendingWhatsApp}
                    onClick={handleSendWhatsAppInvoice}
                    className="rounded-xl border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Kirim Salinan E-Invoice Resmi ke WhatsApp Pemesan"
                  >
                    {isSendingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <Send className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>Kirim Invoice ke WA</span>
                  </Button>

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
      {/* Portal harus dirender langsung (AnimatePresence tidak mendukung createPortal sebagai child) */}
      <>
        {isInvoiceOpen && booking && typeof document !== 'undefined' && createPortal(
          <div 
            id="invoice-print-portal"
            className="invoice-modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full print:h-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="invoice-modal-card bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] print:max-w-none print:w-full print:rounded-none print:shadow-none print:border-none print:max-h-none print:h-auto print:overflow-visible print:block print:transform-none"
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
                    className="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Tutup modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* PRINTABLE INVOICE PAPER AREA (IDENTIK DENGAN ADMIN) */}
              <OfficialInvoicePaper booking={{ ...booking, ...invoiceData }} />
            </motion.div>
          </div>,
          document.body
        )}
      </>

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
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmReschedule} className="space-y-4 text-xs">
                <div>
                  <label htmlFor="reschedule-date" className="font-bold text-slate-700 block mb-1">Tanggal Kunjungan Baru *</label>
                  <Input
                    id="reschedule-date"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="h-11 rounded-xl text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="reschedule-time" className="font-bold text-slate-700 block mb-1">Jam Kedatangan Baru *</label>
                  <select
                    id="reschedule-time"
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
                  <label htmlFor="reschedule-verify-kontak" className="font-bold text-slate-700 block mb-1">Verifikasi No. WhatsApp Pemesan *</label>
                  <Input
                    id="reschedule-verify-kontak"
                    type="tel"
                    value={verifyKontak}
                    onChange={(e) => setVerifyKontak(e.target.value)}
                    placeholder="Masukkan no WhatsApp saat booking"
                    className="h-11 rounded-xl text-xs font-mono"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
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
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Policy BR-08: Pembatalan minimal 24 jam sebelum jadwal */}
              {booking.jadwal_mulai && (new Date(booking.jadwal_mulai).getTime() - Date.now()) < 24 * 3600 * 1000 ? (
                <div className="p-3.5 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                  <p className="font-bold mb-1 flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    Ketentuan Pembatalan Servis
                  </p>
                  <p>
                    Jadwal kunjungan Anda tersisa <strong>kurang dari 24 jam</strong>. Pembatalan mandiri melalui website dinonaktifkan karena teknisi telah dijadwalkan secara operasional.
                  </p>
                  <p className="mt-2 font-medium">
                    Silakan hubungi customer service kami melalui WhatsApp untuk koordinasi darurat.
                  </p>
                  <div className="mt-3">
                    <a
                      href={buildWhatsAppUrl(whatsappNumber, `Halo Admin NARA AC, saya ingin membatalkan jadwal darurat untuk tiket ${booking.kode_booking}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat Admin via WhatsApp</span>
                    </a>
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleConfirmCancel} className="space-y-4 text-xs">
                <div>
                  <label htmlFor="cancel-verify-kontak" className="font-bold text-slate-700 block mb-1">Verifikasi No. WhatsApp Pemesan *</label>
                  <Input
                    id="cancel-verify-kontak"
                    type="tel"
                    value={verifyKontak}
                    onChange={(e) => setVerifyKontak(e.target.value)}
                    placeholder="Masukkan no WhatsApp saat booking"
                    className="h-11 rounded-xl text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="cancel-reason" className="font-bold text-slate-700 block mb-1">Alasan Pembatalan (Opsional)</label>
                  <textarea
                    id="cancel-reason"
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
                    disabled={actionLoading || (booking.jadwal_mulai && (new Date(booking.jadwal_mulai).getTime() - Date.now()) < 24 * 3600 * 1000)}
                    className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs"
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
      {/* 6. MODAL PENGAJUAN KLAIM GARANSI (BR-24 s/d BR-31)              */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isClaimModalOpen && booking && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <span>Pengajuan Klaim Garansi</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmClaim} className="space-y-4 text-xs">
                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 space-y-1">
                  <p className="font-bold text-blue-900">Perlindungan Garansi Servis NARA AC</p>
                  <p className="text-slate-600 leading-relaxed text-2xs">
                    Kunjungan pemeriksaan teknisi ke lokasi Anda adalah <strong>100% BEBAS BIAYA</strong>. Pengajuan klaim garansi wajib menyertakan ulasan review pekerjaan servis.
                  </p>
                </div>

                <div>
                  <label htmlFor="claim-keluhan" className="font-bold text-slate-700 block mb-1">
                    Detail Keluhan / Masalah AC *
                  </label>
                  <textarea
                    id="claim-keluhan"
                    value={claimKeluhan}
                    onChange={(e) => setClaimKeluhan(e.target.value)}
                    placeholder="Contoh: AC kembali meneteskan air di sisi kanan indoor setelah 3 hari servis..."
                    className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs bg-slate-50 focus:bg-white resize-y"
                    rows={3}
                    required
                  />
                  <p className="text-2xs text-slate-500 mt-1">Minimal 5 karakter. Jelaskan kendala yang dialami secara rinci.</p>
                </div>

                {/* Rating & Review (BR-25) */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                  <label className="font-bold text-slate-700 block">
                    Penilaian &amp; Review Servis *
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setClaimRating(star)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star className={cn("w-5 h-5", star <= claimRating ? "text-amber-400 fill-amber-400" : "text-slate-300")} />
                      </button>
                    ))}
                    <span className="font-bold text-slate-700 ml-2">{claimRating} / 5 Bintang</span>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={claimReview}
                      onChange={(e) => setClaimReview(e.target.value)}
                      placeholder="Tulis ulasan pengalaman servis Anda..."
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="claim-kontak" className="font-bold text-slate-700 block mb-1">
                    Verifikasi Nomor WhatsApp Pemesan *
                  </label>
                  <Input
                    id="claim-kontak"
                    type="tel"
                    value={claimVerifyKontak}
                    onChange={(e) => setClaimVerifyKontak(e.target.value)}
                    placeholder="08123456789"
                    className="h-10 text-xs font-mono"
                    required
                  />
                  <p className="text-2xs text-slate-500 mt-1">
                    Nomor WhatsApp yang digunakan saat memesan untuk verifikasi kepemilikan.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsClaimModalOpen(false)}
                    className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingClaim}
                    className="h-10 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/20"
                  >
                    {isSubmittingClaim ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Kirim Pengajuan Klaim'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 7. MODAL UNGGAH BUKTI TRANSFER BANK (BR-37)                     */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isProofModalOpen && booking && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span>Unggah Bukti Transfer Bank</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsProofModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmProof} className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
                  <p className="font-bold text-blue-900">Rekening Resmi CV. Nara Teknindotama:</p>
                  <p className="text-slate-700 font-mono text-2xs">
                    • <strong>BCA:</strong> 8720-9182-33 a.n CV NARA TEKNINDOTAMA<br />
                    • <strong>Mandiri:</strong> 137-00-9821-4451 a.n CV NARA TEKNINDOTAMA
                  </p>
                  <p className="text-2xs text-slate-500 mt-1">
                    *Transfer bank mewajibkan bukti pembayaran untuk diverifikasi manual oleh tim admin.
                  </p>
                </div>

                <div>
                  <label htmlFor="proof-url" className="font-bold text-slate-700 block mb-1">
                    URL / Tautan Bukti Transfer *
                  </label>
                  <Input
                    id="proof-url"
                    type="url"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="https://drive.google.com/... atau https://..."
                    className="h-10 text-xs font-mono"
                    required
                  />
                  <p className="text-2xs text-slate-500 mt-1">Tautan gambar struk / tangkapan layar m-banking.</p>
                </div>

                <div>
                  <label htmlFor="proof-nominal" className="font-bold text-slate-700 block mb-1">
                    Nominal Transfer (Rp) *
                  </label>
                  <Input
                    id="proof-nominal"
                    type="number"
                    min="1"
                    value={proofNominal}
                    onChange={(e) => setProofNominal(e.target.value)}
                    placeholder="Contoh: 150000"
                    className="h-10 text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="proof-catatan" className="font-bold text-slate-700 block mb-1">
                    Catatan Pengirim (Opsional)
                  </label>
                  <input
                    id="proof-catatan"
                    type="text"
                    value={proofCatatan}
                    onChange={(e) => setProofCatatan(e.target.value)}
                    placeholder="Contoh: Transfer via BCA atas nama Budi"
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="proof-kontak" className="font-bold text-slate-700 block mb-1">
                    Verifikasi WhatsApp Pemesan *
                  </label>
                  <Input
                    id="proof-kontak"
                    type="tel"
                    value={proofKontak}
                    onChange={(e) => setProofKontak(e.target.value)}
                    placeholder="08123456789"
                    className="h-10 text-xs font-mono"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsProofModalOpen(false)}
                    className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingProof}
                    className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    {isSubmittingProof ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Kirim Bukti Pembayaran'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 8. MODAL PILIH SKEMA & METODE PEMBAYARAN (BR-34, BR-35, BR-36) */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isSchemeModalOpen && booking && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Pilih Skema Pembayaran</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSchemeModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmScheme} className="space-y-4 text-xs">
                {/* Skema Pilihan (BR-34, BR-35) */}
                <div>
                  <label htmlFor="scheme-select" className="font-bold text-slate-700 block mb-1">
                    Skema Tagihan
                  </label>
                  <select
                    id="scheme-select"
                    value={selectedScheme}
                    onChange={(e) => setSelectedScheme(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-semibold text-slate-800"
                  >
                    <option value="pay_after_service">Bayar Setelah Selesai Pengerjaan</option>
                    <option value="dp_50">Uang Muka (DP 50% di Awal)</option>
                    <option value="full_upfront">Bayar Lunas 100% di Awal</option>
                  </select>
                </div>

                {/* Metode Pilihan (BR-36) */}
                <div>
                  <label htmlFor="method-select" className="font-bold text-slate-700 block mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    id="method-select"
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-semibold text-slate-800"
                  >
                    <option value="transfer">Transfer Bank (Wajib Bukti & Verifikasi)</option>
                    <option value="qris">QRIS (Disediakan Teknisi / Sistem)</option>
                    <option value="cash">Tunai Langsung ke Teknisi</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="scheme-kontak" className="font-bold text-slate-700 block mb-1">
                    Verifikasi No. WhatsApp Pemesan *
                  </label>
                  <Input
                    id="scheme-kontak"
                    type="tel"
                    value={proofKontak}
                    onChange={(e) => setProofKontak(e.target.value)}
                    placeholder="08123456789"
                    className="h-10 text-xs font-mono"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSchemeModalOpen(false)}
                    className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingScheme}
                    className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    {isSubmittingScheme ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Pilihan'}
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
      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-slate-500 mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>&copy; {new Date().getFullYear()} CV. Nara Teknindotama. Seluruh hak cipta dilindungi.</p>
          <div className="flex items-center gap-3 font-medium">
            <Link to="/terms" className="hover:text-blue-600 transition-colors">
              Syarat &amp; Ketentuan
            </Link>
            <span className="text-slate-300">&bull;</span>
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">
              Kebijakan Privasi
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
