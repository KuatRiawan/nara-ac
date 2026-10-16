import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Calendar, Clock, User, Phone, Wrench, CheckCircle2, Copy, Check, MessageSquare, AlertCircle, Send, Building2 } from 'lucide-react';
import api from '../../api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import AddressSelector from '../booking/AddressSelector';
import { getErrorMessage } from '../../utils/errors';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export default function AdminCreateBookingModal({ 
  isOpen, 
  onClose, 
  technicians = [], 
  onBookingSuccess 
}) {
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successBooking, setSuccessBooking] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Ref untuk focus trap
  const modalRef = useRef(null);
  
  // Focus trap untuk aksesibilitas
  useFocusTrap(modalRef, isOpen, onClose);

  // Search existing customer
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [isSearchingCust, setIsSearchingCust] = useState(false);

  // Form State
  const [sumber, setSumber] = useState('WhatsApp'); // 'WhatsApp' | 'Telepon' | 'Walk-in'
  const [nama, setNama] = useState('');
  const [kontak, setKontak] = useState('');
  const [alamat, setAlamat] = useState('');
  const [layananId, setLayananId] = useState('');
  const [jumlahUnit, setJumlahUnit] = useState(1);
  const [tanggal, setTanggal] = useState('');
  const [jam, setJam] = useState('09:00');
  const [teknisiId, setTeknisiId] = useState('');
  const [keluhan, setKeluhan] = useState('');

  // Helper for reliable local date string YYYY-MM-DD
  const getLocalDate = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Default date to today in YYYY-MM-DD
  useEffect(() => {
    if (isOpen) {
      setTanggal(getLocalDate());
      setErrorMsg('');
      setSuccessBooking(null);
      setCopiedCode(false);
      setCustomerSuggestions([]);
    }
  }, [isOpen]);

  // Fetch Service Catalog
  useEffect(() => {
    if (!isOpen) return;
    const fetchServices = async () => {
      setLoadingServices(true);
      try {
        const res = await api.get('/services');
        const list = res.data?.data || res.data || [];
        setServices(list);
        if (list.length > 0 && !layananId) {
          setLayananId(String(list[0].id));
        }
      } catch (err) {
        console.error('Gagal mengambil katalog layanan:', err);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, [isOpen, layananId]);

  // Search existing customers debounce
  useEffect(() => {
    if (!kontak || kontak.length < 4 || successBooking) {
      setCustomerSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingCust(true);
        const res = await api.get(`/customers?q=${encodeURIComponent(kontak)}&limit=5`);
        const data = res.data?.data || res.data || [];
        setCustomerSuggestions(data);
      } catch (e) {
        setCustomerSuggestions([]);
      } finally {
        setIsSearchingCust(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [kontak, successBooking]);

  const selectExistingCustomer = (c) => {
    setNama(c.nama || '');
    setKontak(c.kontak || '');
    setAlamat(c.alamat || '');
    setCustomerSuggestions([]);
  };

  // Pricing calculation
  const selectedServiceObj = useMemo(() => {
    return services.find(s => String(s.id) === String(layananId));
  }, [services, layananId]);

  const calculatedCost = useMemo(() => {
    const unit = Number(jumlahUnit) || 1;
    const base = selectedServiceObj ? Number(selectedServiceObj.harga) : 75000;
    const subtotal = base * unit;
    return {
      subtotal,
      discount: 0,
      total: subtotal
    };
  }, [selectedServiceObj, jumlahUnit]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nama.trim()) {
      setErrorMsg('Nama pelanggan wajib diisi.');
      return;
    }
    if (!kontak.trim() || kontak.trim().length < 8) {
      setErrorMsg('Nomor WhatsApp / telepon tidak valid (minimal 8-10 digit).');
      return;
    }
    if (!alamat.trim() || alamat.trim().length < 5) {
      setErrorMsg('Alamat lengkap pengerjaan servis wajib diisi.');
      return;
    }
    if (!layananId) {
      setErrorMsg('Pilih jenis paket layanan.');
      return;
    }
    if (!tanggal) {
      setErrorMsg('Tentukan tanggal kunjungan servis.');
      return;
    }

    setSubmitting(true);
    try {
      const combinedKeluhan = [
        `[Pesanan Masuk: ${sumber}]`,
        keluhan.trim()
      ].filter(Boolean).join(' - ');

      const payload = {
        nama: nama.trim(),
        kontak: kontak.trim(),
        alamat: alamat.trim(),
        layanan_id: Number(layananId),
        jadwal_mulai: `${tanggal}T${jam}:00+07:00`,
        jumlah_unit: Number(jumlahUnit) || 1,
        keluhan: combinedKeluhan,
        teknisi_id: teknisiId ? Number(teknisiId) : null
      };

      const res = await api.post('/bookings', payload);
      const newBooking = res.data;
      setSuccessBooking({
        ...newBooking,
        customerName: nama.trim(),
        customerPhone: kontak.trim(),
        serviceName: selectedServiceObj?.nama_layanan || 'Servis AC',
        scheduleDate: tanggal,
        scheduleTime: jam,
        totalEstimated: calculatedCost.total
      });

      if (onBookingSuccess) {
        onBookingSuccess(newBooking);
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal membuat booking baru');
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (!successBooking?.kode_booking) return;
    navigator.clipboard.writeText(successBooking.kode_booking);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleOpenWhatsAppConfirmation = () => {
    if (!successBooking) return;
    const phone = successBooking.customerPhone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
    const message = encodeURIComponent(
      `Halo Bapak/Ibu ${successBooking.customerName},\n\n` +
      `Pesanan servis AC Anda di CV. NARA TEKNINDOTAMA telah berhasil didaftarkan!\n\n` +
      `📋 *Kode Tiket:* ${successBooking.kode_booking}\n` +
      `🛠 *Layanan:* ${successBooking.serviceName} (${jumlahUnit} Unit)\n` +
      `📅 *Jadwal:* ${successBooking.scheduleDate}, pukul ${successBooking.scheduleTime} WIB\n` +
      `💰 *Estimasi:* Rp ${successBooking.totalEstimated?.toLocaleString('id-ID')}\n\n` +
      `Lacak status teknisi & e-invoice resmi Anda kapan saja di:\n` +
      `https://nara-ac.local/status/${successBooking.kode_booking}\n\n` +
      `Terima kasih telah mempercayakan pendingin udara Anda pada NARA AC.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleResetForm = () => {
    setSuccessBooking(null);
    setNama('');
    setKontak('');
    setAlamat('');
    setKeluhan('');
    setJumlahUnit(1);
    setTeknisiId('');
    setErrorMsg('');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        tabIndex={-1}
      >
        {/* Header Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-white to-slate-50 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Input Booking Pelanggan
                <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 tracking-wider">
                  Admin Internal
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Catat pesanan masuk via WhatsApp, telepon, atau walk-in langsung ke sistem.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {successBooking ? (
          /* SUCCESS STATE VIEW */
          <div className="p-6 sm:p-8 space-y-6 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Booking Berhasil Diterbitkan!
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tiket servis telah tercatat di antrean sistem operasional NARA AC dan langsung terintegrasi dengan jadwal teknisi.
              </p>
            </div>

            {/* Ticket Card Box */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 text-left space-y-3 max-w-lg mx-auto">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                <span className="text-xs font-semibold text-slate-500">Kode Tiket Servis:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                    {successBooking.kode_booking}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors text-xs flex items-center gap-1 font-semibold"
                    title="Salin Kode"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-xs">Nama Pelanggan</span>
                  <span className="font-bold text-slate-800">{successBooking.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">No. WhatsApp</span>
                  <span className="font-bold text-slate-800">{successBooking.customerPhone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Layanan AC</span>
                  <span className="font-bold text-slate-800">{successBooking.serviceName} ({jumlahUnit} Unit)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Jadwal Kunjungan</span>
                  <span className="font-bold text-slate-800">{successBooking.scheduleDate}, {successBooking.scheduleTime} WIB</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Estimasi Biaya:</span>
                <span className="font-black font-mono text-blue-700 text-sm">
                  Rp {successBooking.totalEstimated?.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Actions for Success */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                onClick={handleOpenWhatsAppConfirmation}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl h-10 px-5 flex items-center justify-center gap-2 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Bukti Konfirmasi ke WA Pelanggan</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleResetForm}
                className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl h-10 px-4"
              >
                Input Booking Lagi
              </Button>

              <Button
                variant="ghost"
                onClick={onClose}
                className="w-full sm:w-auto text-slate-500 hover:text-slate-800 font-bold text-xs rounded-xl h-10 px-4"
              >
                Tutup
              </Button>
            </div>
          </div>
        ) : (
          /* BOOKING FORM */
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Sumber Pesanan Badges */}
            <div role="group" aria-labelledby="booking-source-label" className="space-y-1.5">
              <label id="booking-source-label" className="text-xs font-bold text-slate-700 block">
                Saluran Masuk Pesanan:
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { id: 'WhatsApp', label: 'Chat WhatsApp', icon: MessageSquare, color: 'text-emerald-600' },
                  { id: 'Telepon', label: 'Telepon Masuk', icon: Phone, color: 'text-blue-600' },
                  { id: 'Walk-in', label: 'Walk-in / Offline', icon: Building2, color: 'text-purple-600' }
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = sumber === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSumber(item.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : item.color}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 1: Data Pelanggan */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Identitas & Kontak Pelanggan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Kontak WA/Telp */}
                <div className="relative">
                  <label htmlFor="admin-create-booking-modal-f1" className="text-xs font-bold text-slate-600 block mb-1">
                    No. WhatsApp / HP <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="admin-create-booking-modal-f1"
                      type="tel"
                      value={kontak}
                      onChange={(e) => setKontak(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                      required
                    />
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Customer Autocomplete Dropdown */}
                  {customerSuggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-blue-200 rounded-xl shadow-lg p-1.5 space-y-1">
                      <div className="text-xs font-bold text-slate-500 px-2 py-0.5">
                        Ditemukan data pelanggan sebelumnya:
                      </div>
                      {customerSuggestions.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectExistingCustomer(c)}
                          className="w-full text-left p-2 rounded-lg hover:bg-blue-50 flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">{c.nama}</span>
                            <span className="text-xs text-slate-500">{c.kontak} • {c.alamat || 'Tanpa alamat'}</span>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700 text-xs">Pilih</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nama Pelanggan */}
                <div>
                  <label htmlFor="admin-create-booking-modal-f2" className="text-xs font-bold text-slate-600 block mb-1">
                    Nama Lengkap Pelanggan <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="admin-create-booking-modal-f2"
                      type="text"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Nama pemilik / pemesan"
                      className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                      required
                    />
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Alamat Lengkap Terstruktur Berjenjang */}
              <AddressSelector
                value={alamat}
                onChange={(assembled) => setAlamat(assembled)}
                required={true}
              />
            </div>

            {/* Section 2: Detail Servis & Biaya */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
                <Wrench className="w-3.5 h-3.5 text-blue-600" />
                <span>Paket Layanan & Unit AC</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Layanan Select */}
                <div className="sm:col-span-2">
                  <label htmlFor="admin-create-booking-modal-f3" className="text-xs font-bold text-slate-600 block mb-1">
                    Jenis Paket Servis <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="admin-create-booking-modal-f3"
                    value={layananId}
                    onChange={(e) => setLayananId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                    disabled={loadingServices}
                    required
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nama_layanan} — Rp {Number(s.harga).toLocaleString('id-ID')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jumlah Unit Stepper */}
                <div>
                  <label id="booking-unit-label" className="text-xs font-bold text-slate-600 block mb-1">
                    Jumlah Unit AC
                  </label>
                  <div className="flex items-center h-10 border border-slate-200 bg-white rounded-xl overflow-hidden px-1">
                    <button
                      type="button"
                      onClick={() => setJumlahUnit(Math.max(1, jumlahUnit - 1))}
                      className="w-8 h-8 flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-mono font-bold text-xs text-slate-800">
                      {jumlahUnit} Unit
                    </span>
                    <button
                      type="button"
                      onClick={() => setJumlahUnit(Math.min(20, jumlahUnit + 1))}
                      className="w-8 h-8 flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Calculation Preview */}
              <div className="p-3 bg-white rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Estimasi Tarif Resmi:</span>
                  <span className="ml-2 text-slate-400 font-medium">({jumlahUnit} unit)</span>
                </div>
                <div className="font-mono font-black text-blue-700 text-sm">
                  Rp {calculatedCost.total.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            {/* Section 3: Jadwal & Teknisi */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Penjadwalan Kunjungan & Teknisi</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tanggal */}
                <div>
                  <label htmlFor="admin-create-booking-modal-f4" className="text-xs font-bold text-slate-600 block mb-1">
                    Tanggal Servis <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="admin-create-booking-modal-f4"
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                    required
                  />
                </div>

                {/* Jam Slot */}
                <div>
                  <label htmlFor="admin-create-booking-modal-f5" className="text-xs font-bold text-slate-600 block mb-1">
                    Jam Mulai <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="admin-create-booking-modal-f5"
                    value={jam}
                    onChange={(e) => setJam(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                    required
                  >
                    {['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'].map(slot => (
                      <option key={slot} value={slot}>
                        {slot} WIB
                      </option>
                    ))}
                  </select>
                </div>

                {/* Teknisi (Opsional) */}
                <div>
                  <label htmlFor="admin-create-booking-modal-f6" className="text-xs font-bold text-slate-600 block mb-1">
                    Tugaskan Teknisi (Opsional)
                  </label>
                  <select
                    id="admin-create-booking-modal-f6"
                    value={teknisiId}
                    onChange={(e) => setTeknisiId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  >
                    <option value="">-- Tugaskan Nanti --</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: Keluhan / Catatan Khusus */}
            <div>
              <label htmlFor="admin-create-booking-modal-f7" className="text-xs font-bold text-slate-700 block mb-1">
                Keluhan / Catatan Tambahan (Opsional)
              </label>
              <textarea
                id="admin-create-booking-modal-f7"
                rows={2}
                value={keluhan}
                onChange={(e) => setKeluhan(e.target.value)}
                placeholder="Misal: AC kamar menetes air, pelanggan butuh teknisi bawa tangga tinggi, AC tidak dingin..."
                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            {/* Modal Footer Controls */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl h-10 px-4 text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl h-10 px-5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md shadow-blue-600/20 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Terbitkan Tiket Servis</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
