import { XCircle } from 'lucide-react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/ui/toast';
import OfficialInvoicePaper from '../../components/OfficialInvoicePaper';
import { 
  Receipt, Search, Printer, CheckCircle2, Clock, CreditCard, Building2, X, Check, Edit3, 
  Plus, Trash2, Loader2, RefreshCw, Upload, Send, DollarSign, ShieldAlert, AlertTriangle, Eye, ExternalLink
} from 'lucide-react';

export default function AdminInvoices({ bookings: propBookings, onBookingUpdated }) {
  const { error: showError, success: showSuccess } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | lunas | pending | verify
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paidStatusMap, setPaidStatusMap] = useState({});
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null);

  // BR-37: Verification Modal State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedVerifyBooking, setSelectedVerifyBooking] = useState(null);
  const [verifyNominal, setVerifyNominal] = useState('');
  const [verifyCatatan, setVerifyCatatan] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // BR-41: Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedRefundBooking, setSelectedRefundBooking] = useState(null);
  const [refundNominal, setRefundNominal] = useState('');
  const [refundCatatan, setRefundCatatan] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  // BR-42 & BR-43: WhatsApp Invoice Sending States
  const [sendingWaBookingId, setSendingWaBookingId] = useState(null);
  const [isRetryingWhatsApp, setIsRetryingWhatsApp] = useState(false);

  // Escape key to close invoice modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isModalOpen) setIsModalOpen(false);
        if (isVerifyModalOpen) setIsVerifyModalOpen(false);
        if (isRefundModalOpen) setIsRefundModalOpen(false);
        if (isBankModalOpen) setIsBankModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isVerifyModalOpen, isRefundModalOpen]);

  // Payment settings state (Bank accounts for invoice)
  const [paymentSettings, setPaymentSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('nara_payment_accounts');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback silently if localStorage is restricted
    }
    return {
      accounts: [
        { id: '1', bank_name: 'BCA', account_number: '8720-9182-33', account_holder: 'CV NARA TEKNINDOTAMA' },
        { id: '2', bank_name: 'Mandiri', account_number: '137-00-9821-4451', account_holder: 'CV NARA TEKNINDOTAMA' }
      ],
      instruction_note: '*Tersedia juga opsi pembayaran tunai / QRIS langsung kepada teknisi setelah pekerjaan selesai di lokasi.'
    };
  });
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankFormData, setBankFormData] = useState({ accounts: [], instruction_note: '' });
  const [isSavingBank, setIsSavingBank] = useState(false);

  // Fetch payment settings from backend
  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const res = await api.get('/settings/payment-accounts');
        const data = (res && Array.isArray(res.accounts)) ? res : (res?.data?.accounts ? res.data : (res?.data?.data?.accounts ? res.data.data : null));
        if (data && Array.isArray(data.accounts)) {
          setPaymentSettings(data);
          try {
            localStorage.setItem('nara_payment_accounts', JSON.stringify(data));
          } catch {
            // Ignore storage quota error
          }
        }
      } catch {
        // Fallback to initial state
      }
    };
    fetchPaymentSettings();
  }, []);

  // Fetch bookings data
  const fetchInvoices = useCallback(async (searchQuery = '') => {
    setLoading(true);
    try {
      const params = { limit: 200, urut: 'terbaru' };
      if (searchQuery && searchQuery.trim()) {
        params.q = searchQuery.trim();
      }
      const res = await api.get('/bookings', { params });
      const raw = res?.data?.data || res?.data || res;
      const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
      setBookings(list);

      const statusMapFromAPI = {};
      list.forEach(b => {
        if (b.status_pembayaran) {
          statusMapFromAPI[b.id] = b.status_pembayaran === 'paid';
        } else {
          statusMapFromAPI[b.id] = b.status === 'done';
        }
      });
      setPaidStatusMap(prev => ({ ...statusMapFromAPI, ...prev }));
    } catch (err) {
      showError('Gagal memuat data faktur: ' + (err?.error?.message || err?.response?.data?.error?.message || err?.message));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    if (propBookings && Array.isArray(propBookings) && propBookings.length > 0) {
      setBookings(propBookings);
      setPaidStatusMap(prev => {
        const next = { ...prev };
        propBookings.forEach(b => {
          if (next[b.id] === undefined) {
            next[b.id] = b.status_pembayaran ? b.status_pembayaran === 'paid' : b.status === 'done';
          }
        });
        return next;
      });
      setLoading(false);
    }
  }, [propBookings]);

  // Toggle paid status manually
  const togglePaidStatus = async (bookingId) => {
    const currentStatus = paidStatusMap[bookingId] !== undefined ? paidStatusMap[bookingId] : false;
    const newStatus = !currentStatus;

    setUpdatingPaymentId(bookingId);
    try {
      const res = await api.patch(`/bookings/${bookingId}/payment-status`, {
        status_pembayaran: newStatus ? 'paid' : 'pending'
      });

      if (res && (res.status_pembayaran || res.id || res.status === 200)) {
        setPaidStatusMap(prev => ({
          ...prev,
          [bookingId]: newStatus
        }));

        setBookings(prev => prev.map(b => (
          b.id === bookingId ? { ...b, status_pembayaran: newStatus ? 'paid' : 'pending' } : b
        )));

        if (onBookingUpdated) onBookingUpdated();
        showSuccess(`Status pembayaran #${bookingId} berhasil diperbarui menjadi ${newStatus ? 'Lunas' : 'Pending'}.`);
      }
    } catch (err) {
      showError('Gagal memperbarui status pembayaran: ' + (err?.error?.message || err?.response?.data?.error?.message || err?.message));
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  // Helper calculations with Strict BR-02/BR-03 discount adherence
  const invoicesData = useMemo(() => {
    return bookings.map(b => {
      const unit = b.jumlah_unit || 1;
      const basePrice = b.layanan?.harga || 75000;
      const subtotal = basePrice * unit;
      
      // If backend provided discount / total_biaya, use it as single source of truth
      let discount = 0;
      if (b.diskon !== undefined && b.diskon !== null) {
        discount = Number(b.diskon);
      } else {
        discount = unit === 2 ? Math.round(subtotal * 0.05) : unit >= 3 ? Math.round(subtotal * 0.1) : 0;
      }
      
      const total = b.total_biaya !== undefined && b.total_biaya !== null 
        ? Number(b.total_biaya) 
        : (subtotal - discount);

      const isPaid = paidStatusMap[b.id] !== undefined 
        ? paidStatusMap[b.id] 
        : (b.status === 'done');
      
      const invNo = `INV/NARA/${new Date().getFullYear()}/${String(b.id).padStart(4, '0')}`;
      
      return {
        ...b,
        invNo,
        unit,
        basePrice,
        subtotal,
        discount,
        total,
        isPaid
      };
    });
  }, [bookings, paidStatusMap]);

  // Financial KPIs
  const kpis = useMemo(() => {
    let totalOmzet = 0;
    let totalLunas = 0;
    let totalPending = 0;
    let countLunas = 0;
    let countPending = 0;
    let countVerify = 0;

    invoicesData.forEach(item => {
      totalOmzet += item.total;
      if (item.isPaid) {
        totalLunas += item.total;
        countLunas++;
      } else {
        totalPending += item.total;
        countPending++;
      }
      if (item.status_verifikasi_pembayaran === 'menunggu_verifikasi' || (item.bukti_pembayaran_url && !item.isPaid)) {
        countVerify++;
      }
    });

    return { 
      totalOmzet, totalLunas, totalPending, countLunas, countPending, countVerify, 
      totalCount: invoicesData.length 
    };
  }, [invoicesData]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoicesData.filter(inv => {
      if (!q) {
        if (statusFilter === 'lunas') return inv.isPaid;
        if (statusFilter === 'pending') return !inv.isPaid;
        if (statusFilter === 'verify') return inv.status_verifikasi_pembayaran === 'menunggu_verifikasi' || (inv.bukti_pembayaran_url && !inv.isPaid);
        return true;
      }
      const matchSearch = 
        (inv.invNo && inv.invNo.toLowerCase().includes(q)) ||
        (inv.kode_booking && inv.kode_booking.toLowerCase().includes(q)) ||
        (inv.customer?.nama && inv.customer.nama.toLowerCase().includes(q)) ||
        (inv.customer_nama && inv.customer_nama.toLowerCase().includes(q)) ||
        (inv.customer?.kontak && inv.customer.kontak.toLowerCase().includes(q)) ||
        (inv.kontak && inv.kontak.toLowerCase().includes(q)) ||
        (inv.layanan?.nama && inv.layanan.nama.toLowerCase().includes(q)) ||
        (inv.nama_layanan && inv.nama_layanan.toLowerCase().includes(q)) ||
        String(inv.id).includes(q);

      if (!matchSearch) return false;

      if (statusFilter === 'lunas') return inv.isPaid;
      if (statusFilter === 'pending') return !inv.isPaid;
      if (statusFilter === 'verify') return inv.status_verifikasi_pembayaran === 'menunggu_verifikasi' || (inv.bukti_pembayaran_url && !inv.isPaid);
      return true;
    });
  }, [invoicesData, search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add('invoice-modal-open');
    } else {
      document.body.classList.remove('invoice-modal-open');
    }
    return () => {
      document.body.classList.remove('invoice-modal-open');
    };
  }, [isModalOpen]);

  const openInvoiceModal = (inv) => {
    setSelectedInvoice(inv);
    setIsModalOpen(true);
  };

  const handlePrint = () => {
    const origTitle = document.title;
    document.title = `Invoice_${selectedInvoice?.kode_booking || selectedInvoice?.id || 'NARA'}_CV_Nara_Teknindotama`;
    window.print();
    setTimeout(() => {
      document.title = origTitle;
    }, 1000);
  };

  // BR-37: Open & submit verify payment proof
  const openVerifyModal = (booking) => {
    setSelectedVerifyBooking(booking);
    setVerifyNominal(booking.total || booking.total_biaya || '');
    setVerifyCatatan('');
    setIsVerifyModalOpen(true);
  };

  const handleVerifyProofAction = async (disetujui) => {
    if (!selectedVerifyBooking) return;
    if (!disetujui && (!verifyCatatan.trim() || verifyCatatan.trim().length < 5)) {
      showError('Alasan penolakan bukti bayar wajib diisi minimal 5 karakter.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await api.patch(`/payments/bookings/${selectedVerifyBooking.id}/verify`, {
        disetujui,
        nominal_disetujui: disetujui ? Number(verifyNominal || selectedVerifyBooking.total) : 0,
        catatan: verifyCatatan.trim(),
      });
      showSuccess(res.data?.message || `Bukti bayar berhasil ${disetujui ? 'diverifikasi & ditandai lunas' : 'ditolak'}.`);
      setIsVerifyModalOpen(false);
      fetchInvoices(search);
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      showError('Gagal memverifikasi bukti bayar: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setIsVerifying(false);
    }
  };

  // Open & submit refund
  const openRefundModal = (booking) => {
    setSelectedRefundBooking(booking);
    setRefundNominal(booking.refund_nominal || Math.max(0, (booking.total_dibayar || 0) - (booking.total || 0)));
    setRefundCatatan('');
    setIsRefundModalOpen(true);
  };

  const handleProcessRefundSubmit = async (e) => {
    e.preventDefault();
    const num = Number(refundNominal);
    if (!num || num <= 0) {
      showError('Nominal refund harus berupa angka positif.');
      return;
    }

    setIsRefunding(true);
    try {
      const res = await api.post(`/payments/bookings/${selectedRefundBooking.id}/refund`, {
        nominal_refund: num,
        catatan: refundCatatan.trim() || 'Kelebihan pembayaran servis AC',
      });
      showSuccess(res.data?.message || 'Pengembalian dana (refund) berhasil dicatat & diproses.');
      setIsRefundModalOpen(false);
      fetchInvoices(search);
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      showError('Gagal memproses refund: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setIsRefunding(false);
    }
  };

  // Kirim Invoice via WhatsApp
  const handleSendWhatsAppInvoice = async (bookingId) => {
    setSendingWaBookingId(bookingId);
    try {
      const res = await api.post(`/payments/bookings/${bookingId}/send-whatsapp`, {
        tipe_invoice: 'auto',
      });
      if (!res.success) { showError(res.message || 'Gateway belum berhasil mengirim invoice.'); return; }
      showSuccess(res.message || 'Salinan E-Invoice resmi berhasil dikirim ke nomor WhatsApp pemesan.');
    } catch (err) {
      showError('Gagal mengirim WhatsApp invoice: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setSendingWaBookingId(null);
    }
  };

  // Retry Failed WhatsApp Invoices
  const handleRetryFailedWhatsApp = async () => {
    setIsRetryingWhatsApp(true);
    try {
      const res = await api.post('/payments/retry-whatsapp', { limit: 20 });
      showSuccess(res.data?.message || 'Pengiriman ulang WhatsApp invoice berhasil diproses.');
      fetchInvoices(search);
    } catch (err) {
      showError('Gagal memproses retry: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setIsRetryingWhatsApp(false);
    }
  };

  // Open & manage edit bank modal
  const openEditBankModal = () => {
    setBankFormData({
      accounts: (paymentSettings.accounts || []).map((a, i) => ({
        id: a.id || String(i + 1),
        bank_name: a.bank_name || '',
        account_number: a.account_number || '',
        account_holder: a.account_holder || ''
      })),
      instruction_note: paymentSettings.instruction_note || ''
    });
    setIsBankModalOpen(true);
  };

  const handleAddAccountRow = () => {
    setBankFormData(prev => ({
      ...prev,
      accounts: [
        ...prev.accounts,
        {
          id: String(Date.now()),
          bank_name: 'BCA',
          account_number: '',
          account_holder: prev.accounts[0]?.account_holder || 'CV NARA TEKNINDOTAMA'
        }
      ]
    }));
  };

  const handleRemoveAccountRow = (indexToRemove) => {
    if (bankFormData.accounts.length <= 1) {
      showError('Minimal harus ada 1 rekening bank untuk invoice.');
      return;
    }
    setBankFormData(prev => ({
      ...prev,
      accounts: prev.accounts.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleAccountChange = (index, field, value) => {
    setBankFormData(prev => {
      const updated = [...prev.accounts];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, accounts: updated };
    });
  };

  const handleSavePaymentSettings = async (e) => {
    if (e) e.preventDefault();
    for (let i = 0; i < bankFormData.accounts.length; i++) {
      const acc = bankFormData.accounts[i];
      if (!acc.bank_name?.trim() || !acc.account_number?.trim() || !acc.account_holder?.trim()) {
        showError(`Lengkapi Nama Bank, Nomor Rekening, dan Atas Nama pada rekening #${i + 1}`);
        return;
      }
    }

    setIsSavingBank(true);
    try {
      const payload = {
        accounts: bankFormData.accounts.map(a => ({
          id: a.id || String(Date.now()),
          bank_name: a.bank_name.trim(),
          account_number: a.account_number.trim(),
          account_holder: a.account_holder.trim()
        })),
        instruction_note: bankFormData.instruction_note?.trim() || ''
      };
      const res = await api.put('/settings/payment-accounts', payload);
      const savedData = res?.data?.data || res?.data || payload;
      
      setPaymentSettings(savedData);
      try {
        localStorage.setItem('nara_payment_accounts', JSON.stringify(savedData));
      } catch {
        // Silently skip
      }

      showSuccess('Rekening bank berhasil disimpan dan otomatis masuk ke semua invoice!');
      setIsBankModalOpen(false);
    } catch (err) {
      showError('Gagal menyimpan rekening: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setIsSavingBank(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 relative min-w-0">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            E-Invoice &amp; Kas Pembayaran
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekap faktur digital, verifikasi bukti transfer, proses refund, dan pengiriman invoice WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={openEditBankModal}
            variant="outline"
            className="rounded-xl border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Ubah Rekening Bank</span>
          </Button>

          {/* Retry WhatsApp Invoices */}
          <Button
            onClick={handleRetryFailedWhatsApp}
            disabled={isRetryingWhatsApp}
            variant="outline"
            className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Coba kirim ulang pesan invoice WhatsApp yang tertunda / gagal"
          >
            <Send className="w-4 h-4 text-emerald-600" />
            <span>{isRetryingWhatsApp ? 'Memproses...' : 'Retry WhatsApp'}</span>
          </Button>

          <Button
            onClick={() => {
              fetchInvoices(search);
              if (onBookingUpdated) onBookingUpdated();
              showSuccess('Data faktur dan kas pembayaran berhasil diperbarui.');
            }}
            variant="outline"
            className="rounded-xl border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Segarkan Data Invoice"
          >
            <RefreshCw className={cn("w-4 h-4 text-slate-600", loading && "animate-spin text-blue-600")} />
            <span>Segarkan</span>
          </Button>

          <Button
            onClick={() => window.print()}
            variant="outline"
            className="rounded-xl border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Cetak Rekap</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Omzet */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Omzet Servis</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              Rp {kpis.totalOmzet.toLocaleString('id-ID')}
            </p>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Dari {kpis.totalCount} tiket faktur tercatat
            </p>
          </div>
        </div>

        {/* Lunas */}
        <div className="p-5 rounded-3xl bg-white border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Pembayaran Lunas</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-700">
              Rp {kpis.totalLunas.toLocaleString('id-ID')}
            </p>
            <p className="text-xs font-medium text-emerald-600/80 mt-1">
              {kpis.countLunas} transaksi terverifikasi
            </p>
          </div>
        </div>

        {/* Perlu Verifikasi Bukti Transfer */}
        <div className="p-5 rounded-3xl bg-white border border-amber-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Perlu Verifikasi Bukti</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Upload className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-800">
              {kpis.countVerify}
            </p>
            <p className="text-xs font-medium text-amber-600/80 mt-1">
              Bukti transfer pelanggan menunggu approval
            </p>
          </div>
        </div>

        {/* Rekening Resmi Invoice */}
        <div className="p-5 rounded-3xl bg-white border border-sky-100 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-all">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block">Rekening Resmi Invoice</span>
              <p className="text-xs text-slate-500">Tercetak pada lembar faktur</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={openEditBankModal}
              className="h-7 px-2.5 rounded-lg text-xs font-bold border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <Edit3 className="w-3 h-3" />
              <span>Ubah</span>
            </Button>
          </div>
          <div className="space-y-1.5 text-xs mt-1">
            {paymentSettings.accounts?.map((acc, idx) => (
              <div key={acc.id || idx} className="flex justify-between items-baseline font-mono text-slate-800">
                <span className="font-bold text-slate-700">{acc.bank_name}</span>
                <span className="font-bold text-blue-600">{acc.account_number}</span>
              </div>
            ))}
            <p className="text-xs text-slate-500 pt-0.5 truncate">
              a.n {paymentSettings.accounts?.[0]?.account_holder || 'CV NARA TEKNINDOTAMA'}
            </p>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            placeholder="Cari no invoice, tiket, nama..."
            aria-label="Cari invoice"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'border-slate-200 text-slate-600'}`}
          >
            Semua ({kpis.totalCount})
          </Button>

          <Button
            size="sm"
            variant={statusFilter === 'verify' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('verify')}
            className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${statusFilter === 'verify' ? 'bg-amber-600 text-white' : 'border-slate-200 text-slate-600'}`}
          >
            Perlu Verifikasi ({kpis.countVerify})
          </Button>

          <Button
            size="sm"
            variant={statusFilter === 'lunas' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('lunas')}
            className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${statusFilter === 'lunas' ? 'bg-emerald-600 text-white' : 'border-slate-200 text-slate-600'}`}
          >
            Lunas ({kpis.countLunas})
          </Button>

          <Button
            size="sm"
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('pending')}
            className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${statusFilter === 'pending' ? 'bg-slate-800 text-white' : 'border-slate-200 text-slate-600'}`}
          >
            Pending ({kpis.countPending})
          </Button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-5">No. Invoice &amp; Tiket</th>
                <th className="py-3.5 px-5">Pelanggan</th>
                <th className="py-3.5 px-5">Layanan &amp; Unit</th>
                <th className="py-3.5 px-5">Total Biaya (Diskon Member)</th>
                <th className="py-3.5 px-5">Status Bayar &amp; Verifikasi</th>
                <th className="py-3.5 px-5 text-right">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    Memuat data invoice...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    Tidak ada faktur invoice yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Invoice & Tiket */}
                    <td className="py-3.5 px-5">
                      <p className="font-mono font-black text-slate-900">{inv.invNo}</p>
                      <p className="font-mono text-xs text-blue-600 mt-0.5">{inv.kode_booking || `BK-${inv.id}`}</p>
                      <span className="text-[10px] text-slate-500 block uppercase">
                        Skema: {inv.skema_pembayaran === 'full_upfront' ? 'Bayar Lunas Depan' : inv.skema_pembayaran === 'dp_50' ? 'DP 50%' : 'Bayar Akhir'}
                      </span>
                    </td>

                    {/* Pelanggan */}
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900">{inv.customer?.nama || inv.nama_customer || 'Pelanggan NARA'}</p>
                      <p className="text-xs text-slate-500">{inv.customer?.kontak || inv.kontak || '-'}</p>
                    </td>

                    {/* Layanan & Unit */}
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-800">{inv.layanan?.nama || inv.nama_layanan || 'Cuci AC Standard'}</p>
                      <p className="text-xs text-slate-500">{inv.unit} Unit AC</p>
                    </td>

                    {/* Total Biaya & Diskon */}
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900 text-sm">
                        Rp {inv.total.toLocaleString('id-ID')}
                      </p>
                      {inv.discount > 0 && (
                        <p className="text-[11px] text-emerald-600 font-bold">
                          Hemat Rp {inv.discount.toLocaleString('id-ID')} (Diskon Member)
                        </p>
                      )}
                      {(Number(inv.refund_nominal || 0) > 0 || inv.refund_status === 'processed') && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200 block mt-0.5 w-fit">
                          Refund Rp {Number(inv.refund_nominal || 0).toLocaleString('id-ID')}
                        </span>
                      )}
                    </td>

                    {/* Status Bayar & Verifikasi */}
                    <td className="py-3.5 px-5">
                      <div className="space-y-1">
                        {inv.isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Lunas
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Menunggu Bayar
                          </span>
                        )}

                        {/* Indikator Bukti Bayar */}
                        {inv.status_verifikasi_pembayaran === 'menunggu_verifikasi' ? (
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> Perlu Verifikasi Bukti
                            </span>
                          </div>
                        ) : inv.status_verifikasi_pembayaran === 'diverifikasi' ? (
                          <span className="text-[10px] text-emerald-700 font-bold block">
                            ✓ Bukti Diverifikasi Admin
                          </span>
                        ) : inv.status_verifikasi_pembayaran === 'ditolak' ? (
                          <span className="text-[10px] text-rose-700 font-bold block">
                            ✕ Bukti Ditolak
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        
                        {/* Tombol Verifikasi Bukti Bayar */}
                        {(inv.status_verifikasi_pembayaran === 'menunggu_verifikasi' || inv.bukti_pembayaran_url) && (
                          <Button
                            size="sm"
                            onClick={() => openVerifyModal(inv)}
                            className="rounded-xl text-xs font-bold h-8 px-2.5 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Verifikasi Bukti Transfer Bank"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Verifikasi Bukti</span>
                          </Button>
                        )}

                        {/* Tombol Catat/Proses Refund */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRefundModal(inv)}
                          className="rounded-xl text-xs font-bold h-8 px-2 border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center gap-1"
                          title="Proses Pengembalian Kelebihan Bayar"
                        >
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Refund</span>
                        </Button>

                        {/* Tombol Kirim E-Invoice ke WhatsApp */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendWhatsAppInvoice(inv.id)}
                          disabled={sendingWaBookingId === inv.id}
                          className="rounded-xl text-xs font-bold h-8 px-2 border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer flex items-center gap-1"
                          title="Kirim Salinan E-Invoice Resmi ke WhatsApp Pelanggan"
                        >
                          {sendingWaBookingId === inv.id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                          ) : (
                            <Send className="w-3 h-3 text-emerald-600" />
                          )}
                          <span>WA</span>
                        </Button>

                        {/* Toggle Manual Lunas */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePaidStatus(inv.id)}
                          disabled={updatingPaymentId === inv.id}
                          className={`rounded-xl text-xs font-bold h-8 px-2.5 cursor-pointer ${
                            inv.isPaid ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          } ${updatingPaymentId === inv.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {updatingPaymentId === inv.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>{inv.isPaid ? 'Batal Lunas' : 'Tandai Lunas'}</>
                          )}
                        </Button>

                        {/* Cetak Invoice */}
                        <Button
                          size="sm"
                          onClick={() => openInvoiceModal(inv)}
                          className="rounded-xl text-xs font-bold h-8 px-2.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak</span>
                        </Button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION TOOLBAR */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div>
            Menampilkan <strong className="text-slate-900">{filteredInvoices.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> - <strong className="text-slate-900">{Math.min(filteredInvoices.length, currentPage * itemsPerPage)}</strong> dari <strong className="text-slate-900">{filteredInvoices.length}</strong> faktur invoice
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition-all"
              >
                Sebelumnya
              </button>
              <div className="px-3 py-1 font-bold text-slate-800">
                Hal {currentPage} / {totalPages}
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition-all"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </div>
      </div>

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

          #invoice-print-portal,
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
            width: 100% !important;
            max-width: 100% !important;
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

      {/* MODAL E-INVOICE RESMI STANDAR CETAK A4 */}
      {isModalOpen && selectedInvoice && typeof document !== 'undefined' && createPortal(
        <div 
          id="invoice-print-portal"
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex justify-center items-start p-3 sm:p-6 lg:p-8 invoice-modal-backdrop print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full print:h-auto"
        >
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-2 sm:my-4 animate-in fade-in zoom-in-95 duration-200 invoice-modal-card relative flex flex-col print:overflow-visible print:max-w-none print:w-full print:border-none print:shadow-none print:my-0 print:rounded-none">
            
            {/* Modal Header Actions */}
            <div className="sticky top-0 z-20 p-3 sm:p-4 bg-slate-900 text-white flex items-center justify-between shadow-md print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-sky-400" />
                <span className="font-black text-xs sm:text-sm text-white truncate">
                  E-Invoice &amp; SPK Resmi • CV. Nara Teknindotama
                </span>
              </div>
              <div className="flex items-center gap-2">
                
                {/* Kirim Salinan ke WhatsApp Pemesan Langsung */}
                <Button
                  size="sm"
                  onClick={() => handleSendWhatsAppInvoice(selectedInvoice.id)}
                  disabled={sendingWaBookingId === selectedInvoice.id}
                  className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer h-8 sm:h-9"
                  title="Kirim Salinan E-Invoice Resmi ke WhatsApp Pemesan"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim ke WA</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handlePrint}
                  className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20 h-8 sm:h-9"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Cetak / Download PDF</span>
                  <span className="sm:hidden">Cetak</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
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
                booking={selectedInvoice} 
                isPaidOverride={selectedInvoice.isPaid} 
                paymentSettings={paymentSettings}
              />
            </div>

            {/* Modal Bottom Bar for convenience */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print:hidden">
              <span className="truncate pr-2">Gunakan tombol <strong>Cetak / Download PDF</strong> untuk menyimpan dokumen faktur resmi.</span>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ============================================================== */}
      {/* MODAL VERIFIKASI BUKTI BAYAR TRANSFER BANK                     */}
      {/* ============================================================== */}
      {isVerifyModalOpen && selectedVerifyBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Verifikasi Bukti Transfer</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedVerifyBooking.kode_booking || `#${selectedVerifyBooking.id}`}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsVerifyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Bukti Bayar */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-700 block">Gambar / Lampiran Bukti Transfer:</span>
              {selectedVerifyBooking.bukti_pembayaran_url ? (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center">
                  {selectedVerifyBooking.bukti_pembayaran_url.startsWith('http') || selectedVerifyBooking.bukti_pembayaran_url.startsWith('/uploads') ? (
                    <img 
                      src={selectedVerifyBooking.bukti_pembayaran_url} 
                      alt="Bukti Transfer" 
                      className="max-h-60 rounded-xl object-contain shadow-xs" 
                    />
                  ) : (
                    <div className="p-4 text-center font-mono text-slate-700 bg-white rounded-xl border border-slate-200 w-full break-all">
                      {selectedVerifyBooking.bukti_pembayaran_url}
                    </div>
                  )}
                  <a 
                    href={selectedVerifyBooking.bukti_pembayaran_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-2xs font-bold text-blue-600 hover:underline mt-2 flex items-center gap-1"
                  >
                    <span>Buka Tautan Lampiran Penuh</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">Pelanggan belum mengunggah URL lampiran bukti transfer.</p>
              )}
            </div>

            {/* Rincian Tagihan */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl text-xs">
              <div>
                <span className="text-slate-500 block text-2xs uppercase">Pemesan:</span>
                <span className="font-bold text-slate-800">{selectedVerifyBooking.customer?.nama || selectedVerifyBooking.customer_nama}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-2xs uppercase">Total Tagihan Booking:</span>
                <span className="font-bold text-blue-700 font-mono">Rp {(selectedVerifyBooking.total || selectedVerifyBooking.total_biaya || 0).toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Input Nominal Disetujui */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nominal yang Dikonfirmasi Masuk (Rp):</label>
                <Input
                  type="number"
                  value={verifyNominal}
                  onChange={(e) => setVerifyNominal(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs font-mono font-bold"
                  placeholder="Contoh: 150000"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan / Alasan Penolakan (Jika ditolak):</label>
                <Input
                  type="text"
                  value={verifyCatatan}
                  onChange={(e) => setVerifyCatatan(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs"
                  placeholder="Contoh: Mutasi rekening belum masuk, silakan unggah ulang..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                disabled={isVerifying}
                onClick={() => handleVerifyProofAction(false)}
                className="border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                <span>Tolak Bukti</span>
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Tutup
                </Button>
                <Button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleVerifyProofAction(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-600/20"
                >
                  {isVerifying ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                  <span>Terima &amp; Tandai Lunas</span>
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL PROSES PENGEMBALIAN DANA / REFUND                        */}
      {/* ============================================================== */}
      {isRefundModalOpen && selectedRefundBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Proses Refund / Kelebihan Bayar</h3>
                  <p className="text-xs text-slate-500 font-mono">Pengembalian Kelebihan Pembayaran</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRefundModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Kelebihan pembayaran (akibat revisi unit, pembatalan SOP, atau transfer berlebih) dicatat dan dikembalikan ke rekening pelanggan secara transparan.
            </p>

            <form onSubmit={handleProcessRefundSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nominal Refund (Rp):</label>
                <Input
                  type="number"
                  value={refundNominal}
                  onChange={(e) => setRefundNominal(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs font-mono font-bold"
                  placeholder="Contoh: 50000"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Pengembalian Dana:</label>
                <textarea
                  rows={2}
                  value={refundCatatan}
                  onChange={(e) => setRefundCatatan(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Pengembalian kelebihan transfer 1 unit AC batal cuci ke Rekening BCA..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRefundModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isRefunding}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  {isRefunding ? 'Memproses...' : 'Konfirmasi Refund'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UBAH REKENING BANK PEMBAYARAN INVOICE */}
      {isBankModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsBankModalOpen(false); }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex justify-center items-start p-3 sm:p-6 lg:p-8 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-8 animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/30 text-sky-400 rounded-xl border border-blue-500/30">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    Ubah Rekening Pembayaran Invoice
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Otomatis tercetak pada E-Invoice &amp; lembar SPK resmi pelanggan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentSettings} className="p-5 sm:p-6 space-y-5">
              <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Daftar Rekening Bank ({bankFormData.accounts.length})
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddAccountRow}
                    className="h-8 px-2.5 rounded-xl text-xs font-bold border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Rekening</span>
                  </Button>
                </div>

                {bankFormData.accounts.map((acc, index) => (
                  <div 
                    key={acc.id || index}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                        Rekening #{index + 1}
                      </span>
                      {bankFormData.accounts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAccountRow(index)}
                          className="p-1 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus rekening ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="admin-invoices-f1" className="block text-xs font-bold text-slate-700 mb-1">
                          Nama Bank *
                        </label>
                        <div className="flex flex-col gap-1.5">
                          <Input
                            id="admin-invoices-f1"
                            placeholder="Contoh: BCA, Mandiri, BRI..."
                            value={acc.bank_name}
                            onChange={(e) => handleAccountChange(index, 'bank_name', e.target.value)}
                            className="h-9 text-xs font-semibold rounded-xl bg-white border-slate-200"
                            required
                          />
                          <div className="flex flex-wrap gap-1">
                            {['BCA', 'Mandiri', 'BRI', 'BNI', 'BSI'].map(bName => (
                              <button
                                key={bName}
                                type="button"
                                onClick={() => handleAccountChange(index, 'bank_name', bName)}
                                className={`text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                  acc.bank_name === bName 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {bName}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="admin-invoices-f2" className="block text-xs font-bold text-slate-700 mb-1">
                          Nomor Rekening *
                        </label>
                        <Input
                          id="admin-invoices-f2"
                          placeholder="Contoh: 8720-9182-33"
                          value={acc.account_number}
                          onChange={(e) => handleAccountChange(index, 'account_number', e.target.value)}
                          className="h-9 text-xs font-mono font-bold rounded-xl bg-white border-slate-200"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="admin-invoices-f3" className="block text-xs font-bold text-slate-700 mb-1">
                        Atas Nama (Pemilik Rekening) *
                      </label>
                      <Input
                        id="admin-invoices-f3"
                        placeholder="Contoh: CV NARA TEKNINDOTAMA"
                        value={acc.account_holder}
                        onChange={(e) => handleAccountChange(index, 'account_holder', e.target.value)}
                        className="h-9 text-xs font-semibold rounded-xl bg-white border-slate-200 uppercase"
                        required
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-2">
                  <label htmlFor="admin-invoices-f4" className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Instruksi Pembayaran (Opsional)
                  </label>
                  <textarea
                    id="admin-invoices-f4"
                    rows={2}
                    placeholder="Contoh: *Tersedia juga opsi pembayaran tunai / QRIS langsung kepada teknisi setelah pekerjaan selesai di lokasi."
                    value={bankFormData.instruction_note}
                    onChange={(e) => setBankFormData(prev => ({ ...prev, instruction_note: e.target.value }))}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 resize-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Catatan ini akan dicetak di bagian bawah kotak rekening pada lembar invoice.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBankModalOpen(false)}
                  disabled={isSavingBank}
                  className="rounded-xl text-xs font-bold text-slate-600 border-slate-200 hover:bg-slate-50 h-9 px-4 cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingBank}
                  className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-9 px-5 flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  {isSavingBank ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan &amp; Terapkan ke Invoice</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
