import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

import { useToast } from '../../components/ui/toast';
import OfficialInvoicePaper from '../../components/OfficialInvoicePaper';
import { Receipt, Search, Printer, CheckCircle2, Clock, CreditCard, Building2, X, Check, Edit3, Plus, Trash2, Loader2 } from 'lucide-react';

export default function AdminInvoices() {
  const { error: showError, success: showSuccess } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | lunas | pending
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paidStatusMap, setPaidStatusMap] = useState({});
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null);

  // Escape key to close invoice modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

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

  const printAreaRef = useRef(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setIsBankModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const res = await api.get('/bookings');
        const raw = res?.data?.data || res?.data || res;
        const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
        setBookings(list);

        // Initialize paid status map from API data (status_pembayaran field from database)
        const statusMapFromAPI = {};
        list.forEach(b => {
          if (b.status_pembayaran) {
            statusMapFromAPI[b.id] = b.status_pembayaran === 'paid';
          } else {
            statusMapFromAPI[b.id] = b.status === 'done';
          }
        });
        setPaidStatusMap(statusMapFromAPI);
      } catch (err) {
        showError('Gagal memuat data faktur: ' + (err?.error?.message || err?.response?.data?.error?.message || err?.message));
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [showError]);

  const togglePaidStatus = async (bookingId) => {
    const currentStatus = paidStatusMap[bookingId] !== undefined ? paidStatusMap[bookingId] : false;
    const newStatus = !currentStatus; // true = paid, false = pending

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

        showSuccess(`Status pembayaran #${bookingId} berhasil diperbarui menjadi ${newStatus ? 'Lunas' : 'Pending'}.`);
      } else {
        throw new Error('Gagal memperbarui status pembayaran');
      }
    } catch (err) {
      showError('Gagal memperbarui status pembayaran: ' + (err?.error?.message || err?.response?.data?.error?.message || err?.message));
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  // Helper calculations
  const invoicesData = useMemo(() => {
    return bookings.map(b => {
      const unit = b.jumlah_unit || 1;
      const basePrice = b.layanan?.harga || 75000;
      const subtotal = basePrice * unit;
      const discount = unit === 2 ? Math.round(subtotal * 0.05) : unit >= 3 ? Math.round(subtotal * 0.1) : 0;
      const total = b.total_biaya || (subtotal - discount);
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

    invoicesData.forEach(item => {
      totalOmzet += item.total;
      if (item.isPaid) {
        totalLunas += item.total;
        countLunas++;
      } else {
        totalPending += item.total;
        countPending++;
      }
    });

    return { totalOmzet, totalLunas, totalPending, countLunas, countPending, totalCount: invoicesData.length };
  }, [invoicesData]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoicesData.filter(inv => {
      const q = search.toLowerCase();
      const matchSearch = 
        inv.invNo.toLowerCase().includes(q) ||
        (inv.kode_booking && inv.kode_booking.toLowerCase().includes(q)) ||
        (inv.customer?.nama && inv.customer.nama.toLowerCase().includes(q)) ||
        (inv.layanan?.nama && inv.layanan.nama.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (statusFilter === 'lunas') return inv.isPaid;
      if (statusFilter === 'pending') return !inv.isPaid;
      return true;
    });
  }, [invoicesData, search, statusFilter]);

  // Handle body class for printing
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
    
    // Validasi kelengkapan data
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
        // Silently skip if localStorage fails
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
            E-Invoice & Kas Pembayaran
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekap faktur digital resmi CV. Nara Teknindotama, mutasi transfer, dan verifikasi tanda lunas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={openEditBankModal}
            variant="outline"
            className="rounded-xl border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Ubah Rekening Bank</span>
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

        {/* Menunggu Pembayaran */}
        <div className="p-5 rounded-3xl bg-white border border-amber-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Menunggu Pembayaran</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-700">
              Rp {kpis.totalPending.toLocaleString('id-ID')}
            </p>
            <p className="text-xs font-medium text-amber-600/80 mt-1">
              {kpis.countPending} invoice menunggu transfer
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
            className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'border-slate-200 text-slate-600'}`}
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
                <th className="py-3.5 px-5">No. Invoice & Tiket</th>
                <th className="py-3.5 px-5">Pelanggan</th>
                <th className="py-3.5 px-5">Layanan & Unit</th>
                <th className="py-3.5 px-5">Total Biaya</th>
                <th className="py-3.5 px-5">Status Bayar</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
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
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5">
                      <p className="font-mono font-black text-slate-900">{inv.invNo}</p>
                      <p className="font-mono text-xs text-blue-600 mt-0.5">{inv.kode_booking || `BK-${inv.id}`}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900">{inv.customer?.nama || inv.nama_customer || 'Pelanggan NARA'}</p>
                      <p className="text-xs text-slate-500">{inv.customer?.kontak || inv.kontak || '-'}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-800">{inv.layanan?.nama || 'Cuci AC Standard'}</p>
                      <p className="text-xs text-slate-500">{inv.unit} Unit AC</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900">
                        Rp {inv.total.toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-slate-500">@ Rp {inv.basePrice.toLocaleString('id-ID')}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      {inv.isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Lunas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Menunggu Transfer
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
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
                            <>
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              <span>Memproses...</span>
                            </>
                          ) : (
                            <>{inv.isPaid ? 'Batal Lunas' : 'Tandai Lunas'}</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openInvoiceModal(inv)}
                          className="rounded-xl text-xs font-bold h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak Invoice</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

          /* Saat modal invoice aktif, sembunyikan seluruh kontainer dashboard #root */
          body.invoice-modal-open #root,
          body:has(#invoice-print-portal) #root {
            display: none !important;
          }

          /* Sembunyikan navigasi, header, sidebar, dan kontrol tombol print */
          header, footer, aside, nav, .print\\:hidden, [data-print-hide="true"] {
            display: none !important;
          }

          /* Portal invoice modal ditampilkan penuh sebagai blok normal */
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

      {/* MODAL E-INVOICE RESMI STANDAR CETAK A4 (PORTALED TO BODY FOR CLEAN PRINTING) */}
      {isModalOpen && selectedInvoice && typeof document !== 'undefined' && createPortal(
        <div 
          id="invoice-print-portal"
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex justify-center items-start p-3 sm:p-6 lg:p-8 invoice-modal-backdrop print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full print:h-auto"
        >
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-2 sm:my-4 animate-in fade-in zoom-in-95 duration-200 invoice-modal-card relative flex flex-col print:overflow-visible print:max-w-none print:w-full print:border-none print:shadow-none print:my-0 print:rounded-none">
            
            {/* Modal Header Actions - STICKY AT TOP SO IT NEVER DISAPPEARS */}
            <div className="sticky top-0 z-20 p-3 sm:p-4 bg-slate-900 text-white flex items-center justify-between shadow-md print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-sky-400" />
                <span className="font-black text-xs sm:text-sm text-white truncate">
                  E-Invoice & SPK Resmi • CV. Nara Teknindotama
                </span>
              </div>
              <div className="flex items-center gap-2">
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

      {/* MODAL UBAH REKENING BANK PEMBAYARAN INVOICE */}
      {isBankModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsBankModalOpen(false); }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex justify-center items-start p-3 sm:p-6 lg:p-8 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-8 animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Modal Header */}
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
                    Otomatis tercetak pada E-Invoice & lembar SPK resmi pelanggan
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

            {/* Modal Body / Form */}
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
                          {/* Quick Bank Chips */}
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

              {/* Modal Footer Actions */}
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
                      <span>Simpan & Terapkan ke Invoice</span>
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
