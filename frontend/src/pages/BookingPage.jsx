import { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import CompanyLogo from '../components/CompanyLogo';
import AddressSelector from '../components/booking/AddressSelector';
import OfficialInvoicePaper from '../components/OfficialInvoicePaper';
import ScrollToTopButton from '../components/ui/ScrollToTopButton';
import { cn } from '../lib/utils';
import { useBusinessProfile, buildWhatsAppUrl } from '../hooks/useBusinessProfile';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Clock, ArrowLeft, ArrowRight, Wrench, ShieldCheck, CheckCircle2, Loader2, Sparkles, User, Phone, Check, Copy, Wind, FileText, MessageSquare, AlertCircle, HelpCircle, Percent, CalendarOff, Sun, Sunset, Printer, X, History, Plus, Trash2, Layers, Ticket } from 'lucide-react';

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { whatsappNumber } = useBusinessProfile();
  const { user } = useContext(AuthContext);

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Wizard state: 1: Layanan, 2: Jadwal, 3: Data Diri, 4: Konfirmasi, 5: Sukses
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const idempotencyKeyRef = useRef(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [copiedTicket, setCopiedTicket] = useState(false);
  const invoiceModalRef = useRef(null);
  
  // Focus trap untuk modal invoice
  useFocusTrap(invoiceModalRef, isInvoiceModalOpen, () => setIsInvoiceModalOpen(false));

  // Real-time availability state from backend
  const [availability, setAvailability] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityRetry, setAvailabilityRetry] = useState(0);

  // Form state
  const [form, setForm] = useState({
    layanan_id: '',
    nama: '',
    kontak: '',
    alamat: '',
    keluhan: '',
    tanggal: '',
    jam: '',
    jumlah_unit: 1,
    extra_items: [],
  });
  
  // State untuk tracking unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showRestoreDraft, setShowRestoreDraft] = useState(false);
  const [userHasInteracted, setUserHasInteracted] = useState(false);

  // Helper for checking if date string (YYYY-MM-DD) is Sunday (libur)
  const isSunday = (dateStr) => {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getDay() === 0;
  };

  // Helper for consistent local date string YYYY-MM-DD
  const getLocalDateStr = (daysAhead = 0) => {
    const d = new Date();
    if (daysAhead) d.setDate(d.getDate() + daysAhead);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date to Indonesian human readable (e.g., "Selasa, 13 Okt 2026")
  const formatIndoDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Quick date status badge
  const getQuickDateBadge = (daysAhead) => {
    const dStr = getLocalDateStr(daysAhead);
    if (isSunday(dStr)) {
      return { label: 'Libur (Minggu)', status: 'closed' };
    }
    if (daysAhead === 0) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour >= 16) {
        return { label: 'Slot Habis Hari Ini', status: 'closed' };
      }
      return { label: 'Slot Tersedia', status: 'available' };
    }
    if (daysAhead === 1) {
      return { label: 'Rekomendasi', status: 'recommended' };
    }
    return { label: 'Slot Lengkap', status: 'available' };
  };

  // Load draft from localStorage and check for unsaved changes
  useEffect(() => {
    // Cek apakah ada draft tersimpan
    try {
      const savedDraft = localStorage.getItem('bookingFormDraft');
      if (savedDraft && !userHasInteracted) {
        const draft = JSON.parse(savedDraft);
        // Draft valid selama 24 jam
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (Date.now() - (draft.timestamp || 0) < ONE_DAY) {
          setShowRestoreDraft(true);
        } else {
          localStorage.removeItem('bookingFormDraft');
        }
      }
    } catch (err) {
      console.error('Gagal memuat draft booking:', err);
    }
    
    // Setup beforeunload warning
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Anda memiliki data booking yang belum disimpan. Apakah Anda yakin ingin meninggalkan halaman ini?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, userHasInteracted]);

  // Fetch Services from API and parse query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preselectedLayanan = params.get('layanan');
    const preselectedPaket = params.get('paket') || params.get('service');
    const preselectedUnits = parseInt(params.get('units') || params.get('jumlah') || '1', 10);

    // Default dates: jika besok hari Minggu, defaultkan ke lusa (H+2)
    const defaultDate = isSunday(getLocalDateStr(1)) ? getLocalDateStr(2) : getLocalDateStr(1);

    api.get('/services')
      .then(res => {
        const sList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.data?.data || []));
        setServices(sList);

        // Find service matching query parameters
        let matchedService = null;
        if (preselectedPaket) {
          const p = preselectedPaket.toLowerCase();
          if (p.includes('core_freon') || p.includes('freon_core') || p === 'freon') {
            matchedService = sList.find(s => s.kode === 'SRV-CUCI-FREON' || s.nama_layanan.toLowerCase().includes('freon') && s.nama_layanan.toLowerCase().includes('core'));
          } else if (p.includes('core')) {
            matchedService = sList.find(s => s.kode === 'SRV-CUCI-CORE' || s.nama_layanan.toLowerCase().includes('core'));
          } else if (p.includes('standard') || p.includes('standar')) {
            matchedService = sList.find(s => s.kode === 'SRV-CUCI-01' || s.nama_layanan.toLowerCase().includes('standard'));
          }
        }

        if (!matchedService && preselectedLayanan) {
          matchedService = sList.find(s => String(s.id) === String(preselectedLayanan) || s.kode === preselectedLayanan);
        }

        // Fallback default: select Core (Deep Clean) if available or first service
        const defaultService = matchedService || sList.find(s => s.kode === 'SRV-CUCI-CORE') || sList[0];

        setForm(prev => ({
          ...prev,
          layanan_id: defaultService ? String(defaultService.id) : '',
          jumlah_unit: preselectedUnits > 0 ? preselectedUnits : 1,
          tanggal: prev.tanggal || defaultDate,
          jam: prev.jam || '', // Slot jam akan diisi otomatis berdasarkan ketersediaan aktif
          keluhan: preselectedPaket === 'core' 
            ? 'Request Paket Cuci Core / Deep Clean' 
            : preselectedPaket === 'core_freon' 
              ? 'Request Paket Core + Pengisian Freon' 
              : prev.keluhan
        }));
      })
      .catch(() => setError('Gagal memuat layanan. Pastikan koneksi internet stabil.'))
      .finally(() => setLoading(false));
  }, []);

  const totalUnits = useMemo(() => {
    const primary = Number(form.jumlah_unit) || 1;
    const extra = (form.extra_items || []).reduce((acc, it) => acc + (Number(it.jumlah_unit) || 1), 0);
    return primary + extra;
  }, [form.jumlah_unit, form.extra_items]);

  // Fetch real-time availability whenever tanggal, layanan_id, or totalUnits changes
  useEffect(() => {
    if (!form.tanggal || !form.layanan_id) return;
    let isMounted = true;
    setLoadingAvailability(true);
    setAvailabilityError('');

    api.get('/availability', {
      params: {
        tanggal: form.tanggal,
        layanan_id: form.layanan_id,
        jumlah_unit: totalUnits
      }
    })
      .then(res => {
        if (!isMounted) return;
        // The API returns { tanggal, buka, jam_operasional, slot }
        // Axios interceptor returns response.data, so res might be the object directly
        const data = (res && typeof res === 'object' && res.slot !== undefined)
          ? res
          : (res?.data || res);

        if (!data || typeof data !== 'object') {
          throw new Error('Format data ketersediaan tidak valid dari server.');
        }

        setAvailability(data);

        if (!data.buka) {
          // Toko libur pada hari yang dipilih
          setForm(prev => ({ ...prev, jam: '' }));
        } else {
          // Toko buka: periksa apakah jam yang sedang dipilih masih valid & tersedia
          setForm(prev => {
            const currentSlotValid = Array.isArray(data.slot) && data.slot.some(s => s.jam === prev.jam && s.tersedia);
            if (!currentSlotValid) {
              const firstAvailable = Array.isArray(data.slot) ? data.slot.find(s => s.tersedia) : null;
              return { ...prev, jam: firstAvailable ? firstAvailable.jam : '' };
            }
            return prev;
          });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Ketersediaan jadwal error:', err);
        setAvailability(null);
        setAvailabilityError('Gagal memverifikasi ketersediaan jadwal. Silakan periksa koneksi internet.');
      })
      .finally(() => {
        if (isMounted) setLoadingAvailability(false);
      });

    return () => {
      isMounted = false;
    };
  }, [form.tanggal, form.layanan_id, totalUnits, availabilityRetry]);

  // Restore draft dari localStorage
  const restoreDraft = () => {
    try {
      const savedDraft = localStorage.getItem('bookingFormDraft');
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        delete draft.timestamp;
        setForm({ ...form, ...draft });
        setShowRestoreDraft(false);
        // Hapus draft setelah direstore
        localStorage.removeItem('bookingFormDraft');
        setHasUnsavedChanges(false);
        setUserHasInteracted(true); // User is now interacting with restored data
      }
    } catch (err) {
      console.error('Gagal memulihkan draft booking:', err);
    }
  };
  
  // Hapus draft
  const discardDraft = () => {
    try {
      localStorage.removeItem('bookingFormDraft');
      setShowRestoreDraft(false);
      setHasUnsavedChanges(false);
      setUserHasInteracted(false); // User chose to start fresh
    } catch (err) {
      console.error('Gagal menghapus draft booking:', err);
    }
  };
  
  // Auto-save saat step berubah
  useEffect(() => {
    if (step > 1 && step < 5) {
      try {
        localStorage.setItem('bookingFormDraft', JSON.stringify({
          ...form,
          timestamp: Date.now(),
          currentStep: step
        }));
      } catch (err) {
        console.error('Gagal menyimpan draft booking:', err);
      }
    }
  }, [step, form]);
  
  const handleChange = (e) => {
    const newForm = { ...form, [e.target.name]: e.target.value };
    setForm(newForm);
    if (!userHasInteracted) setUserHasInteracted(true);
    // Auto-save ke localStorage
    try {
      localStorage.setItem('bookingFormDraft', JSON.stringify({
        ...newForm,
        timestamp: Date.now()
      }));
      if (userHasInteracted) setHasUnsavedChanges(true);
    } catch (err) {
      console.error('Gagal menyimpan draft booking:', err);
    }
  };

  // Currently selected service object
  const selectedService = useMemo(() => {
    return services.find(s => String(s.id) === String(form.layanan_id)) || null;
  }, [services, form.layanan_id]);

  // Preview estimate only — final pricing is calculated by backend (bookingService.calculateInvoice)
  // This client-side calculation is for UX preview during the wizard and may differ from the final invoice.
  const calculation = useMemo(() => {
    if (!selectedService) {
      return { basePrice: 0, subtotal: 0, discount: 0, total: 0, estDuration: 60, warranty: '14 Hari', totalUnits: 1, items: [] };
    }
    const primaryPrice = selectedService.harga || 0;
    const primaryUnits = Number(form.jumlah_unit) || 1;
    let subtotal = primaryPrice * primaryUnits;
    let units = primaryUnits;

    const itemsSummary = [{
      layanan_id: selectedService.id,
      nama: selectedService.nama_layanan,
      units: primaryUnits,
      hargaSatuan: primaryPrice,
      subtotal: primaryPrice * primaryUnits,
    }];

    if (Array.isArray(form.extra_items)) {
      for (const extra of form.extra_items) {
        const extraSvc = services.find((s) => s.id === Number(extra.layanan_id));
        if (extraSvc) {
          const eUnits = Number(extra.jumlah_unit) || 1;
          const ePrice = Number(extraSvc.harga) || 0;
          const eSubtotal = ePrice * eUnits;
          subtotal += eSubtotal;
          units += eUnits;
          itemsSummary.push({
            layanan_id: extraSvc.id,
            nama: extraSvc.nama_layanan,
            units: eUnits,
            hargaSatuan: ePrice,
            subtotal: eSubtotal,
            catatan: extra.catatan || '',
          });
        }
      }
    }

    // Diskon khusus eksklusif untuk Member (10% Biaya Jasa). Non-member: 0%
    let discount = 0;
    let discountLabel = '';
    const isMember = Boolean(user && user.role === 'customer');

    if (isMember) {
      discount = Math.round(subtotal * 0.1);
      discountLabel = 'Diskon Membership (10% Biaya Jasa)';
    }

    const total = subtotal - discount;

    // Estimate duration & warranty based on service tier
    let estDuration = (selectedService.durasi_menit || 60) * primaryUnits;
    if (Array.isArray(form.extra_items)) {
      for (const extra of form.extra_items) {
        const extraSvc = services.find((s) => s.id === Number(extra.layanan_id));
        if (extraSvc) {
          estDuration += (extraSvc.durasi_menit || 60) * (Number(extra.jumlah_unit) || 1);
        }
      }
    }
    if (units > 1) {
      estDuration = Math.round(estDuration * 0.85); // concurrency efficiency
    }

    let warranty = '14 Hari';
    const allNames = itemsSummary.map(i => (i.nama || '').toLowerCase()).join(' ');
    if (allNames.includes('freon') && allNames.includes('core')) {
      warranty = '45 Hari Penuh';
    } else if (allNames.includes('core')) {
      warranty = '30 Hari Penuh';
    } else if (allNames.includes('bongkar')) {
      warranty = '30 Hari';
    }

    return { basePrice: primaryPrice, subtotal, discount, discountLabel, isMember, total, estDuration, warranty, totalUnits: units, items: itemsSummary };
  }, [selectedService, form.jumlah_unit, form.extra_items, services, user]);

  // Validation handlers
  const handleNext = () => {
    if (step === 1) {
      if (!form.layanan_id) {
        setError('Silakan pilih salah satu paket layanan terlebih dahulu.');
        return;
      }
      if (!form.jumlah_unit || form.jumlah_unit < 1) {
        setError('Jumlah unit minimal 1.');
        return;
      }
    }
    if (step === 2) {
      if (!form.tanggal) {
        setError('Silakan tentukan tanggal kunjungan teknisi.');
        return;
      }
      if (availability && !availability.buka) {
        setError(availability.alasan || 'CV. Nara Teknindotama libur operasional pada tanggal ini. Silakan pilih hari kerja (Senin - Sabtu).');
        return;
      }
      if (!form.jam) {
        setError('Silakan pilih jam kedatangan teknisi yang masih tersedia.');
        return;
      }
      const selectedSlot = availability?.slot?.find(s => s.jam === form.jam);
      if (selectedSlot && !selectedSlot.tersedia) {
        setError(`Slot jam ${form.jam} WIB tidak dapat dipilih: ${selectedSlot.alasan || 'Sudah lewat atau penuh'}. Silakan pilih slot jam lain.`);
        return;
      }
    }
    if (step === 3) {
      if (!form.nama.trim()) {
        setError('Nama lengkap pemesan wajib diisi.');
        return;
      }
      if (!form.kontak.trim()) {
        setError('Nomor WhatsApp aktif wajib diisi untuk notifikasi tiket.');
        return;
      }
      if (!form.alamat.trim() || form.alamat.trim().length < 8) {
        setError('Harap lengkapi alamat lokasi (pilih Kota, Kecamatan, dan masukkan Nama Jalan / Nomor Rumah).');
        return;
      }
      // Generate idempotency key saat melangkah ke Step 4 (Konfirmasi) jika belum ada
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = `idem-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      }
    }
    setError('');
    setStep(prev => prev + 1);
    setHasUnsavedChanges(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    setError('');
    setStep(prev => prev - 1);
    setHasUnsavedChanges(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submission handler with synchronous ref lock & idempotency key
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmittingRef.current) return; // Mencegah double submit paralel
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError('');

    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = `idem-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      }

      const hasExtra = Array.isArray(form.extra_items) && form.extra_items.length > 0;
      const allItems = hasExtra ? [
        {
          layanan_id: parseInt(form.layanan_id, 10),
          jumlah_unit: parseInt(form.jumlah_unit, 10) || 1,
          catatan: form.keluhan.trim(),
        },
        ...form.extra_items.map((it) => ({
          layanan_id: parseInt(it.layanan_id, 10),
          jumlah_unit: parseInt(it.jumlah_unit, 10) || 1,
          catatan: (it.catatan || '').trim(),
        })),
      ] : null;

      const payload = {
        layanan_id: parseInt(form.layanan_id, 10),
        nama: form.nama.trim(),
        kontak: form.kontak.trim(),
        alamat: form.alamat.trim(),
        jadwal_mulai: `${form.tanggal}T${form.jam}:00+07:00`,
        keluhan: form.keluhan.trim(),
        jumlah_unit: allItems ? allItems.reduce((acc, it) => acc + it.jumlah_unit, 0) : (parseInt(form.jumlah_unit, 10) || 1),
        idempotency_key: idempotencyKeyRef.current,
        ...(allItems ? { items: allItems } : {}),
      };

      const res = await api.post('/bookings', payload);
      const bookingResult = res?.kode_booking ? res : (res?.data || res);
      setSuccessData(bookingResult);
      idempotencyKeyRef.current = null; // Reset setelah sukses
      setStep(5); // Success step
      setHasUnsavedChanges(false);
      setUserHasInteracted(false);
      // Hapus draft setelah booking sukses
      try {
        localStorage.removeItem('bookingFormDraft');
      } catch (err) {
        console.error('Gagal menghapus draft:', err);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg = err?.error?.message || 
                  err?.message || 
                  err?.response?.data?.error?.message || 
                  err?.pesan || 
                  'Terjadi kesalahan saat memproses booking. Silakan coba lagi.';
      setError(msg);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const copyBookingCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 2500);
  };

  // Helper date buttons
  const setQuickDate = (daysAhead) => {
    setForm(prev => ({ ...prev, tanggal: getLocalDateStr(daysAhead) }));
  };

  // Quick complaint tags
  const complaintTags = [
    'AC Bocor Air Menetes',
    'AC Kurang Dingin',
    'Bau Apek & Berdebu',
    'Hembusan Angin Pelan',
    'Perawatan Servis Rutin'
  ];

  const handleAddComplaint = (tag) => {
    if (!form.keluhan) {
      setForm(prev => ({ ...prev, keluhan: tag }));
    } else if (!form.keluhan.includes(tag)) {
      setForm(prev => ({ ...prev, keluhan: `${prev.keluhan}, ${tag}` }));
    }
  };

  // Step names
  const steps = [
    { num: 1, title: 'Paket & Unit' },
    { num: 2, title: 'Jadwal Servis' },
    { num: 3, title: 'Data & Alamat' },
    { num: 4, title: 'Konfirmasi' }
  ];

  // Lock body scroll and set print classes when invoice modal is opened
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
          }
        }
      `}</style>
      
      {/* ============================================================== */}
      {/* 1. TOP NAVBAR                                                 */}
      {/* ============================================================== */}
      <header className="bg-white/90 backdrop-blur-md border-b border-sky-100/80 sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex justify-between items-center">
          <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
            <CompanyLogo iconSize="h-8" />
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              to="/status" 
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors py-2 px-3 rounded-xl hover:bg-sky-50"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Cek Status Tiket</span>
            </Link>

            <Link to="/">
              <Button 
                variant="outline" 
                size="sm"
                className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ke Beranda</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN CONTAINER & WIZARD                                     */}
      {/* ============================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Progress Bar (Hidden on success step) */}
        {step < 5 && (
          <div className="max-w-3xl mx-auto mb-10 sm:mb-12">
            {/* Progress text untuk mobile */}
            <div className="flex justify-between text-xs text-slate-500 mb-3 sm:hidden">
              <span>Langkah {step} dari {steps.length}</span>
              <span>{steps[step - 1]?.title}</span>
            </div>
            <div className="flex items-center justify-between relative px-4 sm:px-8">
              {/* Background Line */}
              <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-slate-200 rounded-full z-0" />
              {/* Active Animated Progress Line */}
              <motion.div 
                className="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-blue-600 to-sky-500 rounded-full z-0"
                initial={false}
                animate={{ width: `calc(${((step - 1) / (steps.length - 1)) * 100}% - 16px)` }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />

              {steps.map((s) => {
                const isPassed = step > s.num;
                const isCurrent = step === s.num;

                return (
                  <div key={s.num} className="relative z-10 flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all duration-300 shadow-sm",
                      isPassed 
                        ? "bg-blue-600 text-white shadow-blue-500/25" 
                        : isCurrent 
                          ? "bg-white text-blue-600 border-2 border-blue-600 ring-4 ring-blue-500/15 shadow-md" 
                          : "bg-white text-slate-500 border border-slate-200"
                    )}>
                      {isPassed ? <Check className="w-5 h-5 stroke-[2.5]" /> : s.num}
                    </div>
                    <span className={cn(
                      "mt-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap",
                      isCurrent ? "text-blue-600 font-black" : isPassed ? "text-slate-700" : "text-slate-500"
                    )}>
                      {s.title}
                    </span>
                    {/* Label untuk mobile */}
                    {isCurrent && (
                      <span className="sm:hidden absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 whitespace-nowrap">
                        {s.title}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-3 shadow-xs"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="flex-1">{error}</span>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/* STEP 5: SUCCESS STATE (FULL SCREEN HERO TICKET)                */}
        {/* ============================================================== */}
        {step === 5 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto py-6 sm:py-10 text-center"
          >
            {/* Success Ring */}
            <div className="w-20 h-20 bg-emerald-100 border border-emerald-200 rounded-3xl flex items-center justify-center mx-auto mb-6 relative shadow-lg shadow-emerald-500/10">
              <div className="absolute inset-0 bg-emerald-400/20 rounded-3xl animate-ping opacity-60" />
              <CheckCircle2 className="w-10 h-10 text-emerald-600 relative z-10" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
              Booking Berhasil Dibuat!
            </h1>
            <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto mb-8">
              Terima kasih! Jadwal servis Anda telah terdaftar di sistem NARA AC. Teknisi kami akan mengonfirmasi via WhatsApp sebelum kunjungan.
            </p>

            {/* Digital Ticket Card */}
            {(() => {
              const bCode = successData?.kode_booking || successData?.data?.kode_booking || 'AC-XXXX';
              return (
                <div className="bg-white rounded-3xl border border-sky-100 shadow-2xl shadow-blue-950/10 p-6 sm:p-8 mb-8 text-left relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500" />
                  
                  {/* Ticket Header & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                        KODE TIKET LAYANAN
                      </span>
                    </div>

                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Status: Terjadwal (Scheduled)
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
                        {bCode}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyBookingCode(bCode)}
                      className="shrink-0 w-full sm:w-auto py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
                      title="Salin Kode Tiket"
                    >
                      {copiedTicket ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedTicket ? 'Kode Tersalin!' : 'Salin Kode'}</span>
                    </button>
                  </div>

                  {/* Summary Rows */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block mb-1">Paket & Volume:</span>
                      <p className="font-bold text-slate-900 text-sm">{selectedService?.nama_layanan || 'Service AC'}</p>
                      <p className="text-slate-600 font-semibold mt-0.5">{form.jumlah_unit} Unit AC</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block mb-1">Waktu Pengerjaan:</span>
                      <p className="font-bold text-slate-900 text-sm">{form.tanggal}</p>
                      <p className="text-slate-600 font-semibold mt-0.5">Pukul {form.jam} WIB</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block mb-1">Pemesan & Kontak:</span>
                      <p className="font-bold text-slate-900">{form.nama}</p>
                      <p className="text-slate-600 font-mono mt-0.5">{form.kontak}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block mb-1">Estimasi Biaya Jasa:</span>
                      <p className="font-black text-blue-600 text-base font-mono">Rp {calculation.total.toLocaleString('id-ID')}</p>
                      <p className="text-slate-500 text-xs">Pembayaran selesai setelah pengerjaan</p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Garansi pengerjaan <strong>{calculation.warranty}</strong> aktif otomatis setelah teknisi menyelesaikan servis.</span>
                  </div>
                </div>
              );
            })()}

            {/* CTA Buttons */}
            <div className="max-w-xl mx-auto space-y-4">
              {/* Primary Actions (2-Column Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Link to={`/status/${successData?.kode_booking || ''}`} className="w-full">
                  <Button className="w-full h-12 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2 transition-all">
                    <FileText className="w-4 h-4" />
                    <span>Pantau Status Tiket</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </Button>
                </Link>

                <Button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="w-full h-12 px-5 rounded-2xl bg-white hover:bg-emerald-50 border-2 border-emerald-600 text-emerald-700 font-bold text-sm shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all"
                >
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <span>Lihat & Cetak E-Invoice</span>
                </Button>
              </div>

              {/* Secondary Utility Action (WhatsApp) */}
              <div className="flex items-center justify-center pt-1">
                <a 
                  href={buildWhatsAppUrl(whatsappNumber, `Halo Admin Nara AC, saya sudah membuat booking dengan kode ${successData?.kode_booking || ''}`)}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto h-10 px-6 rounded-xl border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/70 text-slate-700 hover:text-emerald-700 font-semibold text-xs cursor-pointer flex items-center justify-center gap-2 transition-all shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Konfirmasi via WhatsApp</span>
                    <span className="sr-only"> (buka di tab baru)</span>
                  </Button>
                </a>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/* STEPS 1 - 4: DUAL COLUMN WIZARD + STICKY PRICE SUMMARY          */}
        {/* ============================================================== */}
        {step < 5 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: THE ACTIVE STEP FORM */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-sky-100/90 shadow-xl shadow-blue-900/5 p-6 sm:p-8 relative">
              <AnimatePresence mode="wait">

                {/* ---------------- STEP 1: PILIH PAKET & UNIT ---------------- */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                        Langkah 1 dari 4
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2.5">
                        Pilih Paket Servis AC
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Sesuaikan dengan kebutuhan dan kondisi unit AC Anda saat ini.
                      </p>
                    </div>

                    {/* Services Cards Grid */}
                    {loading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {services.map((svc) => {
                          const isSelected = String(form.layanan_id) === String(svc.id);
                          const sName = (svc.nama_layanan || '').toLowerCase();
                          const isPopular = sName.includes('core') && !sName.includes('freon');
                          const isFreon = sName.includes('freon');

                          return (
                            <div
                              key={svc.id}
                              onClick={() => setForm({ ...form, layanan_id: String(svc.id) })}
                              className={cn(
                                "p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer relative group flex items-start justify-between gap-4",
                                isSelected
                                  ? "border-blue-600 bg-blue-50/60 shadow-md shadow-blue-600/10 ring-1 ring-blue-500"
                                  : "border-slate-100 hover:border-sky-300 bg-white hover:bg-sky-50/30"
                              )}
                            >
                              <div className="flex items-start gap-3.5 min-w-0">
                                <div className={cn(
                                  "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors mt-0.5",
                                  isSelected 
                                    ? "bg-blue-600 text-white" 
                                    : "bg-sky-100/70 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                                )}>
                                  {isFreon ? (
                                    <Wind className="w-5 h-5" />
                                  ) : isPopular ? (
                                    <Sparkles className="w-5 h-5" />
                                  ) : (
                                    <Wrench className="w-5 h-5" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                                      {svc.nama_layanan}
                                    </h3>
                                    {isPopular && (
                                      <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 to-sky-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                                        ⭐ Best Value
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                    {svc.deskripsi}
                                  </p>

                                  <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-500">
                                    <span className="flex items-center gap-1 text-slate-600">
                                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                                      ± {svc.durasi_menit} Menit
                                    </span>
                                    <span>•</span>
                                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                                      {isPopular ? 'Garansi 30 Hari' : isFreon ? 'Garansi 45 Hari' : 'Garansi 14 Hari'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0 flex flex-col items-end justify-between self-stretch">
                                <div className={cn(
                                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                  isSelected 
                                    ? "bg-blue-600 border-blue-600 text-white" 
                                    : "border-slate-300 bg-white"
                                )}>
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>

                                <div className="mt-4">
                                  <span className="text-base sm:text-lg font-black text-blue-700 font-mono">
                                    Rp {(svc.harga || 0).toLocaleString('id-ID')}
                                  </span>
                                  <span className="text-xs text-slate-500 block font-semibold">/ unit</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Unit Selector Component */}
                    <div className="pt-6 border-t border-slate-100">
                      <div role="group" aria-labelledby="booking-unit-count-label" className="flex items-center justify-between mb-3">
                        <div>
                          <label id="booking-unit-count-label" className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                            Jumlah Unit AC yang Diservis
                          </label>
                          <p className="text-xs text-slate-500">
                            {Boolean(user && user.role === 'customer') ? 'Diskon 10% membership aktif otomatis' : 'Daftar / Masuk Member untuk hemat 10%'}
                          </p>
                        </div>
                        <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                          {form.jumlah_unit} Unit Terpilih
                        </span>
                      </div>

                      {/* Quick Unit Pills */}
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {[1, 2, 3, 4].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, jumlah_unit: num }))}
                            className={cn(
                              "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center",
                              form.jumlah_unit === num
                                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                                : "bg-slate-50/80 text-slate-700 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            <span>{num} {num === 4 ? 'Unit+' : 'Unit'}</span>
                            {num === 2 && <span className="text-[9px] text-emerald-300 font-normal">Diskon 5%</span>}
                            {num >= 3 && <span className="text-[9px] text-emerald-300 font-normal">Diskon 10%</span>}
                          </button>
                        ))}
                      </div>

                      {/* Stepper Controls */}
                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <span className="text-xs font-semibold text-slate-600">Sesuaikan jumlah persis:</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, jumlah_unit: Math.max(1, f.jumlah_unit - 1) }))}
                            aria-label="Kurangi jumlah unit"
                            className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-black text-slate-700 flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-black text-slate-900 font-mono text-base">
                            {form.jumlah_unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, jumlah_unit: Math.min(20, f.jumlah_unit + 1) }))}
                            aria-label="Tambah jumlah unit"
                            className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-black text-slate-700 flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Multi-Service: Tambah Layanan Berbeda dalam 1 Booking */}
                      <div className="mt-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100/80">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Layers className="w-4 h-4 text-blue-600" />
                              Layanan Berbeda untuk Unit Lain?
                            </span>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Butuh kombinasi layanan (mis. cuci standar + isi freon)? Tambahkan langsung di sini tanpa booking berulang.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const otherServices = services.filter(s => s.id !== Number(form.layanan_id));
                              const nextSvc = otherServices[0] || services[0];
                              if (!nextSvc) return;
                              setForm(f => ({
                                ...f,
                                extra_items: [...(f.extra_items || []), { layanan_id: nextSvc.id, jumlah_unit: 1, catatan: '' }]
                              }));
                            }}
                            className="shrink-0 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Layanan</span>
                          </button>
                        </div>

                        {/* List of Extra Items */}
                        {form.extra_items && form.extra_items.length > 0 && (
                          <div className="mt-3 space-y-2.5 pt-3 border-t border-blue-100">
                            {form.extra_items.map((extra, idx) => (
                              <div key={idx} className="bg-white p-3 rounded-xl border border-blue-100/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Layanan Tambahan #{idx + 1}
                                  </label>
                                  <select
                                    value={extra.layanan_id}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setForm(f => ({
                                        ...f,
                                        extra_items: f.extra_items.map((it, i) => i === idx ? { ...it, layanan_id: val } : it)
                                      }));
                                    }}
                                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none"
                                  >
                                    {services.map(s => (
                                      <option key={s.id} value={s.id}>
                                        {s.nama_layanan} — Rp {Number(s.harga).toLocaleString('id-ID')}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-center">
                                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setForm(f => ({
                                          ...f,
                                          extra_items: f.extra_items.map((it, i) => i === idx ? { ...it, jumlah_unit: Math.max(1, it.jumlah_unit - 1) } : it)
                                        }));
                                      }}
                                      aria-label={`Kurangi unit layanan tambahan ${idx + 1}`}
                                      className="w-6 h-6 rounded bg-white text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer border border-slate-200"
                                    >
                                      -
                                    </button>
                                    <span className="w-6 text-center font-mono font-bold text-xs text-slate-900">
                                      {extra.jumlah_unit}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setForm(f => ({
                                          ...f,
                                          extra_items: f.extra_items.map((it, i) => i === idx ? { ...it, jumlah_unit: Math.min(10, it.jumlah_unit + 1) } : it)
                                        }));
                                      }}
                                      aria-label={`Tambah unit layanan tambahan ${idx + 1}`}
                                      className="w-6 h-6 rounded bg-white text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer border border-slate-200"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setForm(f => ({
                                        ...f,
                                        extra_items: f.extra_items.filter((_, i) => i !== idx)
                                      }));
                                    }}
                                    aria-label={`Hapus layanan tambahan ${idx + 1}`}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Step Navigation */}
                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                      <Button
                        type="button"
                        onClick={handleNext}
                        className="h-12 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <span>Pilih Jadwal Kedatangan</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* ---------------- STEP 2: JADWAL KEDATANGAN ---------------- */}
                {step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                        Langkah 2 dari 4
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2.5">
                        Tentukan Tanggal & Jam Servis
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Pilih slot waktu yang paling nyaman bagi Anda untuk menerima teknisi.
                      </p>
                    </div>

                    {/* Date Selection */}
                    <div>
                      <div role="group" aria-labelledby="booking-date-label" className="flex items-center justify-between mb-2">
                        <label id="booking-date-label" className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          Tanggal Kedatangan Teknisi
                        </label>
                        {form.tanggal && (
                          <span className="text-xs font-semibold text-blue-600">
                            {formatIndoDate(form.tanggal)}
                          </span>
                        )}
                      </div>
                      
                      {/* Quick Date Shortcuts */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          { days: 0, label: 'Hari Ini' },
                          { days: 1, label: 'Besok' },
                          { days: 2, label: 'Lusa' }
                        ].map(({ days, label }) => {
                          const targetDate = getLocalDateStr(days);
                          const isSelected = form.tanggal === targetDate;
                          const badge = getQuickDateBadge(days);

                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => setQuickDate(days)}
                              className={cn(
                                "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center text-center",
                                isSelected
                                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              )}
                            >
                              <span>{label}</span>
                              <span className={cn(
                                "text-xs font-semibold mt-0.5",
                                isSelected
                                  ? "text-sky-200"
                                  : badge.status === 'closed'
                                    ? "text-rose-500"
                                    : badge.status === 'recommended'
                                      ? "text-blue-600"
                                      : "text-emerald-600"
                              )}>
                                {badge.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Date Picker Input */}
                      <div className="relative">
                        <Input
                          type="date"
                          name="tanggal"
                          value={form.tanggal}
                          min={getLocalDateStr(0)}
                          onChange={handleChange}
                          className="h-12 rounded-xl text-sm font-semibold border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Time Slot Selection */}
                    <div>
                      <div role="group" aria-labelledby="booking-time-label" className="flex items-center justify-between mb-2">
                        <label id="booking-time-label" className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          Pilihan Jam Kedatangan
                        </label>
                        {form.jam && availability?.buka && (
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                            Pukul {form.jam} WIB
                          </span>
                        )}
                      </div>

                      {/* State 1: Loading Availability */}
                      {loadingAvailability && (
                        <div className="p-6 rounded-2xl bg-sky-50/60 border border-sky-100 flex items-center justify-center gap-3 text-slate-600 text-xs font-semibold animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          <span>Memeriksa ketersediaan teknisi untuk {formatIndoDate(form.tanggal)}...</span>
                        </div>
                      )}

                      {/* State 2: Availability Error */}
                      {!loadingAvailability && availabilityError && (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                            <span>{availabilityError}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAvailabilityRetry(prev => prev + 1);
                            }}
                            className="text-xs font-bold text-rose-700 underline hover:no-underline cursor-pointer"
                          >
                            Coba Lagi
                          </button>
                        </div>
                      )}

                      {/* State 3: Hari Libur (e.g. Hari Minggu) */}
                      {!loadingAvailability && availability && !availability.buka && (
                        <div className="p-5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950">
                          <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0 text-amber-700">
                              <CalendarOff className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-amber-950">
                                {availability.alasan || 'Libur Operasional Servis'}
                              </h4>
                              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                CV. Nara Teknindotama melayani operasional Senin s/d Sabtu (08:00 – 17:00 WIB). Pada hari {formatIndoDate(form.tanggal)}, seluruh tim teknisi kami libur operasional.
                              </p>
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setQuickDate(isSunday(getLocalDateStr(1)) ? 2 : 1)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                                >
                                  <span>Pilih Hari Kerja Berikutnya</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* State 4: Toko Buka - Render Slots */}
                      {!loadingAvailability && availability && availability.buka && (
                        <div className="space-y-4">
                          {(() => {
                            const slots = availability.slot || [];
                            const availableCount = slots.filter(s => s.tersedia).length;
                            const morningSlots = slots.filter(s => parseInt(s.jam.split(':')[0], 10) < 12);
                            const afternoonSlots = slots.filter(s => parseInt(s.jam.split(':')[0], 10) >= 12);

                            if (availableCount === 0) {
                              return (
                                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-bold text-amber-950">Seluruh slot waktu untuk hari ini sudah terisi atau lewat jam operasional.</p>
                                    <p className="text-amber-800 mt-1">
                                      Pemesanan memerlukan minimal 60 menit sebelum jadwal pengerjaan. Silakan pilih tanggal besok atau hari kerja berikutnya.
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => setQuickDate(1)}
                                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                                    >
                                      <span>Lihat Slot Waktu Besok</span>
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <>
                                {/* Morning Slots */}
                                {morningSlots.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Slot Pagi (08:00 – 11:00)
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
                                      {morningSlots.map((s) => {
                                        const isSelected = form.jam === s.jam;
                                        return (
                                          <button
                                            key={s.jam}
                                            type="button"
                                            disabled={!s.tersedia}
                                            onClick={() => s.tersedia && setForm({ ...form, jam: s.jam })}
                                            className={cn(
                                              "py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center relative",
                                              !s.tersedia
                                                ? "bg-slate-100/70 text-slate-500 border-slate-200 cursor-not-allowed opacity-50"
                                                : isSelected
                                                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 cursor-pointer"
                                                  : "bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 cursor-pointer"
                                            )}
                                          >
                                            <span className={cn(!s.tersedia && "line-through decoration-slate-400/60")}>
                                              {s.jam} WIB
                                            </span>
                                            {!s.tersedia ? (
                                              <span className="text-[9px] text-slate-500 font-normal mt-0.5">
                                                {s.alasan?.includes('lewat') || s.alasan?.includes('minimal') ? 'Lewat' : 'Penuh'}
                                              </span>
                                            ) : isSelected ? (
                                              <span className="text-[9px] text-sky-200 font-semibold mt-0.5">Terpilih</span>
                                            ) : (
                                              <span className="text-[9px] text-emerald-600 font-semibold mt-0.5">Tersedia</span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Afternoon Slots */}
                                {afternoonSlots.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <Sunset className="w-3.5 h-3.5 text-blue-500" />
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Slot Siang & Sore (12:00 – 16:00)
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                      {afternoonSlots.map((s) => {
                                        const isSelected = form.jam === s.jam;
                                        return (
                                          <button
                                            key={s.jam}
                                            type="button"
                                            disabled={!s.tersedia}
                                            onClick={() => s.tersedia && setForm({ ...form, jam: s.jam })}
                                            className={cn(
                                              "py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center relative",
                                              !s.tersedia
                                                ? "bg-slate-100/70 text-slate-500 border-slate-200 cursor-not-allowed opacity-50"
                                                : isSelected
                                                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 cursor-pointer"
                                                  : "bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 cursor-pointer"
                                            )}
                                          >
                                            <span className={cn(!s.tersedia && "line-through decoration-slate-400/60")}>
                                              {s.jam} WIB
                                            </span>
                                            {!s.tersedia ? (
                                              <span className="text-[9px] text-slate-500 font-normal mt-0.5">
                                                {s.alasan?.includes('lewat') || s.alasan?.includes('minimal') ? 'Lewat' : 'Penuh'}
                                              </span>
                                            ) : isSelected ? (
                                              <span className="text-[9px] text-sky-200 font-semibold mt-0.5">Terpilih</span>
                                            ) : (
                                              <span className="text-[9px] text-emerald-600 font-semibold mt-0.5">Tersedia</span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}

                      <div className="mt-4 p-3 bg-sky-50/80 rounded-xl border border-sky-100 flex items-center gap-2.5 text-xs text-slate-600">
                        <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span>Estimasi kedatangan tepat waktu dengan toleransi rentang ±15 menit dari jam yang dipilih.</span>
                      </div>
                    </div>

                    {/* Step Navigation */}
                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrev}
                        className="h-12 px-6 rounded-2xl border-slate-300 text-slate-700 font-bold text-sm cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        <span>Kembali</span>
                      </Button>

                      <Button
                        type="button"
                        onClick={handleNext}
                        className="h-12 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <span>Lanjut Isi Alamat</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* ---------------- STEP 3: DATA DIRI & ALAMAT ---------------- */}
                {step === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                        Langkah 3 dari 4
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2.5">
                        Data Pemesan & Lokasi
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Informasi ini digunakan teknisi untuk navigasi dan konfirmasi pengerjaan.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Nama Lengkap */}
                      <div>
                        <label htmlFor="booking-nama" className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                          Nama Lengkap Pemesan *
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <Input
                            id="booking-nama"
                            name="nama"
                            value={form.nama}
                            onChange={handleChange}
                            placeholder="Contoh: Budi Santoso"
                            className="h-12 pl-10 rounded-xl text-sm border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                            autoComplete="name"
                          />
                        </div>
                      </div>

                      {/* No. WhatsApp */}
                      <div>
                        <label htmlFor="booking-kontak" className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                          Nomor WhatsApp Aktif *
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <Input
                            id="booking-kontak"
                            name="kontak"
                            value={form.kontak}
                            onChange={handleChange}
                            placeholder="Contoh: 081234567890"
                            type="tel"
                            className="h-12 pl-10 rounded-xl text-sm border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                            autoComplete="tel"
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Notifikasi tiket digital dan kontak teknisi akan dikirim via WhatsApp.
                        </p>
                      </div>

                      {/* Alamat Lengkap Terstruktur Berjenjang */}
                      <AddressSelector
                        value={form.alamat}
                        onChange={(assembled) => {
                          setForm(prev => ({ ...prev, alamat: assembled }));
                          if (assembled.trim() && error.includes('Alamat')) {
                            setError('');
                          }
                        }}
                        required={true}
                      />

                      {/* Catatan / Keluhan */}
                      <div>
                        <label htmlFor="booking-keluhan" className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                          Catatan Keluhan AC (Opsional)
                        </label>
                        <textarea
                          id="booking-keluhan"
                          name="keluhan"
                          value={form.keluhan}
                          onChange={handleChange}
                          rows={2}
                          placeholder="Jelaskan kendala AC Anda agar teknisi dapat menyiapkan peralatan spesifik..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y"
                        />

                        {/* Quick Symptoms Chips */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {complaintTags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleAddComplaint(tag)}
                              className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 px-2.5 py-1 rounded-lg border border-slate-200/80 transition-colors cursor-pointer"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Step Navigation */}
                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrev}
                        className="h-12 px-6 rounded-2xl border-slate-300 text-slate-700 font-bold text-sm cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        <span>Kembali</span>
                      </Button>

                      <Button
                        type="button"
                        onClick={handleNext}
                        className="h-12 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <span>Cek Ringkasan Pesanan</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* ---------------- STEP 4: REVIEW & KONFIRMASI ---------------- */}
                {step === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                        Langkah Terakhir (4 dari 4)
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2.5">
                        Konfirmasi Pesanan
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Pastikan seluruh data jadwal dan lokasi sudah akurat sebelum mengirim tiket booking.
                      </p>
                    </div>

                    {/* Order Details Recap Card */}
                    <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-5 space-y-4">
                      
                      <div className="pb-3 border-b border-sky-100">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Paket Layanan Dipilih:</span>
                        <div className="space-y-1.5">
                          {calculation.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-900">{it.nama}</span>
                              <span className="font-mono text-slate-600 font-semibold">{it.units} Unit × Rp {it.hargaSatuan.toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                          <div className="text-right pt-1">
                            <span className="text-xs text-blue-600 font-bold font-mono">Total {calculation.totalUnits} Unit AC</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pb-3 border-b border-sky-100">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jadwal Servis:</span>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 text-sm block">{formatIndoDate(form.tanggal)}</span>
                          <span className="text-xs text-slate-500 font-semibold">Pukul {form.jam} WIB</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pb-3 border-b border-sky-100">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pemesan & WA:</span>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 text-sm block">{form.nama}</span>
                          <span className="text-xs text-slate-500 font-mono">{form.kontak}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Alamat Tujuan:</span>
                        <p className="text-xs font-semibold text-slate-800 leading-relaxed bg-white p-3 rounded-xl border border-sky-100">
                          {form.alamat}
                        </p>
                      </div>

                      {form.keluhan && (
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Keluhan / Catatan:</span>
                          <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-sky-100">
                            {form.keluhan}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Guarantee & Quality Assurances */}
                    <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>SOP 7 Langkah Pengerjaan Standar Industri CV. Nara Teknindotama</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span>Garansi Pengerjaan Nyata <strong>{calculation.warranty}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-sky-600 flex-shrink-0" />
                        <span>Pembayaran aman di tempat (COD/Transfer) setelah pengerjaan selesai dicek</span>
                      </div>
                    </div>

                    {/* Step Navigation & Submission */}
                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrev}
                        disabled={isSubmitting}
                        className="h-12 px-6 rounded-2xl border-slate-300 text-slate-700 font-bold text-sm cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        <span>Ubah Data</span>
                      </Button>

                      <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="h-12 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/25 transition-all cursor-pointer flex items-center gap-2 group"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Memproses Booking...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Konfirmasi & Buat Pesanan</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="text-center text-xs text-slate-500 mt-4">
                      Dengan membuat pesanan, Anda menyetujui{' '}
                      <a href="/terms" target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-700">
                        Syarat &amp; Ketentuan Layanan
                      </a>{' '}
                      serta{' '}
                      <a href="/privacy" target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-700">
                        Kebijakan Privasi
                      </a>{' '}
                      NARA AC.
                    </p>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* RIGHT COLUMN: STICKY LIVE ORDER SUMMARY SIDEBAR */}
            <div className="lg:col-span-5 sticky top-24">
              <div className="bg-white rounded-3xl border border-sky-100 shadow-xl shadow-blue-900/5 p-6 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 to-sky-500" />

                <h3 className="font-extrabold text-slate-900 text-base mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Ringkasan Estimasi Biaya</span>
                </h3>

                {selectedService ? (
                  <div className="space-y-4">
                    {/* Selected Service Cardlet */}
                    <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 space-y-2">
                      {calculation.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">
                              {it.nama}
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              Rp {it.hargaSatuan.toLocaleString('id-ID')} × {it.units} Unit
                            </p>
                          </div>
                          <span className="text-xs font-bold text-blue-700 font-mono">
                            Rp {it.subtotal.toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Transparent Price Breakdown */}
                    <div className="space-y-2.5 text-xs pt-2">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal Jasa ({calculation.totalUnits} Unit):</span>
                        <span className="font-semibold font-mono text-slate-900">
                          Rp {calculation.subtotal.toLocaleString('id-ID')}
                        </span>
                      </div>

                      {calculation.discount > 0 ? (
                        <div className="flex justify-between text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <span className="font-bold flex items-center gap-1">
                            <Percent className="w-3.5 h-3.5" />
                            {calculation.discountLabel || 'Diskon Membership (10%):'}
                          </span>
                          <span className="font-bold font-mono">
                            -Rp {calculation.discount.toLocaleString('id-ID')}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 flex items-center justify-between bg-blue-50/60 border border-blue-100 px-2.5 py-1.5 rounded-lg">
                          <span className="flex items-center gap-1.5 text-blue-700 font-medium">
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            Hemat 10% dengan Akun Member
                          </span>
                          <Link to="/login" className="text-blue-700 underline font-bold hover:text-blue-800">
                            Masuk
                          </Link>
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block">
                            Total Estimasi
                          </span>
                          <span className="text-xs text-slate-500">Termasuk SOP & Peralatan</span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-blue-700 font-mono tracking-tight">
                            Rp {calculation.total.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Highlights */}
                    <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          Estimasi Durasi:
                        </span>
                        <span className="font-bold text-slate-800">± {calculation.estDuration} Menit</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          Garansi Resmi:
                        </span>
                        <span className="font-bold text-emerald-700">{calculation.warranty}</span>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Pilih paket layanan pada kolom kiri untuk melihat rincian biaya.
                  </div>
                )}

                {/* Micro Support Strip */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Teknisi Internal CV. Nara
                  </span>
                  <a
                    href={buildWhatsAppUrl(whatsappNumber, 'Halo NARA AC, saya butuh bantuan booking')}
                    target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <span>Bantuan CS</span>
<span className="sr-only"> (buka di tab baru)</span>
                  </a>
                </div>

              </div>
            </div>

          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* 3. FOOTER COPYRIGHT                                            */}
      {/* ============================================================== */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-slate-500 mt-auto">
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

      {/* ============================================================== */}
      {/* 4. MODAL E-INVOICE RESMI CV. NARA TEKNINDOTAMA                 */}
      {/* ============================================================== */}
      <>
        {isInvoiceModalOpen && successData && typeof document !== 'undefined' && createPortal(
          <div 
            id="invoice-print-portal"
            className="invoice-modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full print:h-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setIsInvoiceModalOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="invoice-modal-card bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] print:max-w-none print:w-full print:rounded-none print:shadow-none print:border-none print:max-h-none print:h-auto print:overflow-visible print:block print:transform-none"
              ref={invoiceModalRef}
              tabIndex={-1}
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
                    onClick={() => {
                      const origTitle = document.title;
                      document.title = `Invoice_${successData?.kode_booking || successData?.data?.kode_booking || 'NARA'}_CV_Nara_Teknindotama`;
                      window.print();
                      setTimeout(() => { document.title = origTitle; }, 1000);
                    }}
                    className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak / Unduh PDF</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => setIsInvoiceModalOpen(false)}
                    className="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Tutup modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* PRINTABLE INVOICE PAPER */}
              <OfficialInvoicePaper 
                booking={{
                  ...successData,
                  id: successData?.id || successData?.data?.id,
                  kode_booking: successData?.kode_booking || successData?.data?.kode_booking || 'AC-XXXX',
                  items: successData?.items || calculation.items,
                  layanan: selectedService?.nama_layanan || successData?.layanan?.nama || successData?.layanan || 'Cuci AC Standard',
                  customer_nama: form.nama,
                  kontak: form.kontak,
                  alamat: form.alamat,
                  keluhan: form.keluhan,
                  jadwal_mulai: `${form.tanggal}T${form.jam}:00+07:00`,
                  harga: calculation.basePrice,
                  jumlah_unit: calculation.totalUnits || form.jumlah_unit,
                  total: calculation.total,
                  discount: calculation.discount
                }} 
              />
            </motion.div>
          </div>,
          document.body
        )}
      </>
      
      {/* ============================================================== */}
      {/* MODAL RESTORE DRAFT AUTO-SAVE                                */}
      {/* ============================================================== */}
      <AnimatePresence>
        {showRestoreDraft && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-slate-900/20"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">Data Tersimpan</h3>
                  <p className="text-sm text-slate-600">
                    Kami menemukan data booking yang disimpan sementara. Apakah Anda ingin melanjutkan dari data tersebut?
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={discardDraft}
                  className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold"
                >
                  Buang & Mulai Baru
                </Button>
                <Button
                  onClick={restoreDraft}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Lanjutkan Draft
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Tombol Kembali ke Atas */}
      <ScrollToTopButton />

    </div>
  );
}
