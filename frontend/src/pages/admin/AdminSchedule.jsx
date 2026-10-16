import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api';
import { Calendar as CalendarIcon, Clock, Wrench, AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, ChevronLeft, X, Sparkles, Phone, MapPin, RefreshCw, Copy, Check, UserCheck, UserPlus, CalendarClock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, format, isSameMonth, isSameDay, addMonths, subMonths, isSunday } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '../../components/ui/toast';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { getErrorMessage } from '../../utils/errors';

export default function AdminSchedule({ onBookingAssigned }) {
  const { error: showError, success: showSuccess } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthBookings, setMonthBookings] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningBooking, setAssigningBooking] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Modal Reschedule State
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [newRescheduleTime, setNewRescheduleTime] = useState('09:00');
  const [rescheduleReason, setRescheduleReason] = useState('Penyesuaian jadwal servis oleh admin');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);
  const [altSlots, setAltSlots] = useState([]);
  const [isReplacing, setIsReplacing] = useState(false);

  // Copy helper
  const handleCopyCode = (code, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // WhatsApp helper
  const getWhatsAppLink = (rawPhone, bookingCode, customerName) => {
    if (!rawPhone) return null;
    let clean = String(rawPhone).replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    else if (clean.startsWith('8')) clean = '628' + clean.slice(1);
    const text = encodeURIComponent(`Halo Bpk/Ibu ${customerName || ''}, kami dari CV. Nara Teknindotama terkait jadwal servis AC tiket ${bookingCode}. Apakah jadwal servis pada hari ini siap dikerjakan?`);
    return `https://wa.me/${clean}?text=${text}`;
  };

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

  // Fetch Technicians list for lookup
  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const res = await api.get('/technicians');
        const raw = res?.data?.data || res?.data || res;
        const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
        setTechnicians(list);
      } catch (err) {
        // Fallback silently if non-admin or failed
      }
    };
    fetchTechnicians();
  }, []);

  // Fetch Bookings for Current Month
  const fetchMonthSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      // Ambil seluruh jadwal bulan berjalan (hingga 500 tiket)
      const res = await api.get(`/bookings?dari=${startDate}&sampai=${endDate}&limit=500`);
      const raw = res?.data?.data || res?.data || res;
      const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
      setMonthBookings(list);
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal memuat jadwal bulanan');
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, showError]);

  useEffect(() => {
    fetchMonthSchedule();
  }, [fetchMonthSchedule]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchMonthSchedule();
    };
    const handleStorage = (e) => {
      if (e.key === 'nara_booking_sync_timestamp') {
        fetchMonthSchedule();
      }
    };
    window.addEventListener('nara-booking-updated', handleUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('nara-booking-updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchMonthSchedule]);

  // Smart Assign Recommendation
  const openAssign = useCallback(async (booking) => {
    setAssigningBooking(booking);
    setAltSlots([]);
    setLoadingRecs(true);
    try {
      const res = await api.get(`/admin/schedule/recommendation?booking_id=${booking.id}`);
      const recs = res?.data?.data || res?.data || [];
      setRecommendations(Array.isArray(recs) ? recs : []);
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal memuat rekomendasi teknisi');
      showError(msg);
    } finally {
      setLoadingRecs(false);
    }
  }, [showError]);

  const handleAssign = async (teknisi_id, force = false) => {
    if (!assigningBooking) return;
    try {
      await api.patch(`/admin/bookings/${assigningBooking.id}/assign`, { teknisi_id, force });
      showSuccess('Berhasil menugaskan teknisi');
      setAssigningBooking(null);
      setIsModalOpen(false);
      fetchMonthSchedule();
      if (onBookingAssigned) {
        onBookingAssigned();
      }
      try {
        localStorage.setItem('nara_booking_sync_timestamp', Date.now().toString());
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('nara-booking-updated'));
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal menugaskan teknisi');
      showError(msg);
    }
  };

  // BR-11 & BR-12: Penggantian Teknisi Berhalangan & Rekomendasi Slot Alternatif
  const handleReplaceTechnician = async (teknisi_baru_id = null) => {
    if (!assigningBooking) return;
    setIsReplacing(true);
    setAltSlots([]);
    try {
      const res = await api.patch(`/admin/bookings/${assigningBooking.id}/replace-technician`, {
        teknisi_baru_id,
        alasan: 'Teknisi sebelumnya berhalangan hadir'
      });
      const data = res?.data || res;
      if (data.success) {
        showSuccess(data.message || 'Teknisi pengganti berhasil ditugaskan.');
        setAssigningBooking(null);
        setAltSlots([]);
        fetchMonthSchedule();
        if (onBookingAssigned) onBookingAssigned();
        window.dispatchEvent(new CustomEvent('nara-booking-updated'));
      } else if (data.code === 'NO_REPLACEMENT_TECHNICIAN') {
        setAltSlots(data.slot_alternatif || []);
        showError(data.message || 'Tidak ada teknisi pengganti yang tersedia pada slot ini.');
      }
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.code === 'NO_REPLACEMENT_TECHNICIAN') {
        setAltSlots(resp.slot_alternatif || []);
        showError(resp.message || 'Tidak ada teknisi pengganti yang tersedia.');
      } else {
        showError(getErrorMessage(err, 'Gagal mengganti teknisi'));
      }
    } finally {
      setIsReplacing(false);
    }
  };

  const handleSelectAltSlot = async (slot) => {
    if (!assigningBooking || !slot?.mulai) return;
    try {
      await api.patch(`/admin/bookings/${assigningBooking.id}/reschedule`, {
        jadwal_mulai: slot.mulai,
        alasan: 'Penyesuaian jadwal servis karena teknisi berhalangan'
      });
      showSuccess(`Jadwal berhasil dipindahkan ke slot ${new Date(slot.mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`);
      setAssigningBooking(null);
      setAltSlots([]);
      fetchMonthSchedule();
      window.dispatchEvent(new CustomEvent('nara-booking-updated'));
    } catch (err) {
      showError(getErrorMessage(err, 'Gagal memindahkan jadwal ke slot alternatif'));
    }
  };

  // Open Reschedule Modal
  const openRescheduleModal = (booking) => {
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
      setNewRescheduleDate(format(new Date(), 'yyyy-MM-dd'));
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
      fetchMonthSchedule();
      try {
        localStorage.setItem('nara_booking_sync_timestamp', Date.now().toString());
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('nara-booking-updated'));
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal mengubah tanggal jadwal');
      showError(msg);
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  // Ringkasan Bulan Berjalan
  const monthStats = useMemo(() => {
    let total = monthBookings.length;
    let unassigned = 0;
    let onProcess = 0;
    let done = 0;

    monthBookings.forEach(b => {
      const tech = getAssignedTechnician(b);
      if (b.status === 'scheduled' && !tech) {
        unassigned++;
      } else if (b.status === 'on process') {
        onProcess++;
      } else if (b.status === 'done') {
        done++;
      }
    });

    return { total, unassigned, onProcess, done };
  }, [monthBookings, getAssignedTechnician]);

  // Selected Day Bookings
  const selectedDayBookings = useMemo(() => {
    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    return monthBookings
      .filter(b => b.jadwal_mulai?.startsWith(dayStr))
      .sort((a, b) => new Date(a.jadwal_mulai || 0) - new Date(b.jadwal_mulai || 0));
  }, [monthBookings, selectedDate]);

  // JIKA SEDANG BUKA TAMPILAN SMART ASSIGN
  if (assigningBooking) {
    return (
      <div className="p-4 sm:p-8 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
        <button 
          onClick={() => setAssigningBooking(null)}
          className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> 
          <span>Kembali ke Jadwal Bulanan</span>
        </button>

        {/* INFO TIKET BOOKING YANG SEDANG DITUGASKAN */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md">
                  {assigningBooking.kode_booking}
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Smart Penugasan Teknisi</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                {assigningBooking.customer?.nama || assigningBooking.nama || 'Pelanggan'}
              </h2>
            </div>

            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 font-bold text-xs uppercase px-3 py-1">
              Status: {assigningBooking.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="text-slate-500 text-xs uppercase font-bold block">Jadwal Servis</span>
                <span className="font-bold text-slate-900">
                  {new Date(assigningBooking.jadwal_mulai).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}, {new Date(assigningBooking.jadwal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="text-slate-500 text-xs uppercase font-bold block">Layanan & Unit</span>
                <span className="font-bold text-slate-900">
                  {assigningBooking.layanan?.nama_layanan || assigningBooking.layanan?.nama || assigningBooking.nama_layanan || 'Service AC'}
                  {assigningBooking.jumlah_unit > 1 && ` (${assigningBooking.jumlah_unit} Unit)`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="truncate">
                <span className="text-slate-500 text-xs uppercase font-bold block">Lokasi Pelanggan</span>
                <span className="font-medium text-slate-800 truncate block" title={assigningBooking.alamat}>
                  {assigningBooking.alamat || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* BR-11: Teknisi Ditugaskan & Opsi Penggantian jika Berhalangan */}
          {getAssignedTechnician(assigningBooking) && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Teknisi Saat Ini Ditugaskan</p>
                <p className="font-black text-slate-900 text-sm mt-0.5">
                  {getAssignedTechnician(assigningBooking).nama}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Jika teknisi ini berhalangan hadir, tunjuk teknisi pengganti di bawah atau cari secara otomatis.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={isReplacing}
                onClick={() => handleReplaceTechnician(null)}
                className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
              >
                {isReplacing ? 'Mencari...' : '⚡ Cari Pengganti Otomatis'}
              </Button>
            </div>
          )}

          {/* BR-12: Rekomendasi Slot Alternatif Jika Teknisi Pengganti Tidak Tersedia */}
          {altSlots.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2 text-rose-800">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <h4 className="font-black text-sm text-rose-900">Teknisi Pengganti Tidak Tersedia</h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Tidak ada teknisi pengganti yang tersedia pada slot saat ini. Sistem menawarkan opsi slot jadwal alternatif:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                {altSlots.map((slot, idx) => (
                  <div key={idx} className="bg-white border border-rose-200 rounded-lg p-3 flex justify-between items-center shadow-2xs">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">
                        {new Date(slot.mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                      <span className="text-2xs text-emerald-600 font-bold">Kapasitas Tersedia</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSelectAltSlot(slot)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-7 px-2.5 rounded-lg cursor-pointer"
                    >
                      Pilih Slot
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* DAFTAR REKOMENDASI TEKNISI */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Rekomendasi Teknisi Terbaik</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dianalisa berdasarkan jadwal, ketersediaan slot, dan beban pekerjaan hari ini.
              </p>
            </div>
          </div>

          {loadingRecs ? (
            <div className="text-center p-16 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-slate-900 font-bold text-sm">Menganalisa Jadwal Teknisi...</p>
              <p className="text-xs text-slate-500 mt-1">Mengecek ketersediaan waktu dan kapasitas operasional.</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
              <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <p className="font-bold text-slate-900 text-sm">Belum ada rekomendasi yang tersedia</p>
              <p className="text-xs text-slate-500 mt-1">Silakan tugaskan teknisi secara manual melalui daftar teknisi.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map(tech => (
                <div 
                  key={tech.id} 
                  className={cn(
                    "bg-white rounded-2xl border p-5 transition-all relative overflow-hidden flex flex-col justify-between shadow-sm",
                    tech.direkomendasikan ? "border-emerald-300 ring-2 ring-emerald-500/20 shadow-emerald-500/5" :
                    tech.assignable ? "border-slate-200 hover:border-blue-300 hover:shadow" :
                    tech.status === 'conflict' ? "border-rose-200 bg-rose-50/20" : "border-slate-200 opacity-60 bg-slate-50"
                  )}
                >
                  {/* Badge Pilihan Terbaik */}
                  {tech.direkomendasikan && (
                    <div className="absolute top-0 right-0 bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Pilihan Terbaik</span>
                    </div>
                  )}

                  <div>
                    {/* Header Card Teknisi */}
                    <div className="flex justify-between items-start mb-3 pt-1">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{tech.nama}</h4>
                        <span className="text-xs text-slate-500 font-medium">Teknisi Servis AC</span>
                      </div>

                      <Badge className={cn(
                        "text-xs font-black uppercase px-2 py-0.5",
                        tech.assignable ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                        tech.status === 'conflict' ? "bg-rose-100 text-rose-800 border-rose-200" :
                        "bg-slate-100 text-slate-700 border-slate-200"
                      )}>
                        {tech.assignable ? 'Available' : tech.status === 'conflict' ? 'Conflict' : 'Unavailable'}
                      </Badge>
                    </div>

                    {/* Status Info */}
                    <div className="space-y-2 text-xs text-slate-600 my-4 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Status Hari Ini:</span>
                        <span className="font-bold text-slate-900 capitalize">{tech.status_harian || 'Aktif'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Pekerjaan Hari Ini:</span>
                        <span className="font-bold text-slate-900">{tech.pekerjaan_hari_ini || 0} Tiket</span>
                      </div>

                      {tech.bentrok?.length > 0 && (
                        <div className="flex items-start gap-1.5 text-rose-700 text-xs font-bold mt-2 bg-rose-50 p-2 rounded-lg border border-rose-100">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Ada bentrok jadwal servis lain di jam yang berdekatan.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2">
                    {tech.assignable ? (
                      <Button
                        onClick={() => {
                          if (getAssignedTechnician(assigningBooking)) {
                            handleReplaceTechnician(tech.id);
                          } else {
                            handleAssign(tech.id, false);
                          }
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-10 shadow-sm cursor-pointer transition-all"
                      >
                        {getAssignedTechnician(assigningBooking) ? 'Tugaskan Sebagai Pengganti' : 'Tugaskan Teknisi Ini'}
                      </Button>
                    ) : tech.status === 'conflict' ? (
                      <div className="space-y-1.5">
                        <Button
                          onClick={() => handleAssign(tech.id, true)}
                          variant="outline"
                          className="w-full border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl h-9 cursor-pointer"
                        >
                          Paksa Tugaskan (Force)
                        </Button>
                        <p className="text-xs text-center text-rose-500 font-medium">Beban jadwal akan ditumpuk</p>
                      </div>
                    ) : (
                      <Button
                        disabled
                        className="w-full bg-slate-100 text-slate-500 font-bold text-xs rounded-xl h-10 cursor-not-allowed"
                      >
                        Tidak Tersedia
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // HEADER HARI-HARI KALENDER (Senin s/d Minggu)
  const renderDaysHeader = () => {
    const days = [
      { name: 'Sen', full: 'Senin', isSunday: false },
      { name: 'Sel', full: 'Selasa', isSunday: false },
      { name: 'Rab', full: 'Rabu', isSunday: false },
      { name: 'Kam', full: 'Kamis', isSunday: false },
      { name: 'Jum', full: 'Jumat', isSunday: false },
      { name: 'Sab', full: 'Sabtu', isSunday: false },
      { name: 'Min', full: 'Minggu', isSunday: true },
    ];

    return (
      <div className="grid grid-cols-7 bg-slate-50/90 border border-b-0 border-slate-200 rounded-t-2xl overflow-hidden">
        {days.map((day, i) => (
          <div 
            key={i} 
            className={cn(
              "py-3 text-center text-xs font-black uppercase tracking-wider border-r border-slate-200 last:border-r-0",
              day.isSunday ? "bg-rose-50/30 text-rose-600" : "text-slate-600"
            )}
            title={day.full}
          >
            <span>{day.name}</span>
          </div>
        ))}
      </div>
    );
  };

  // GRID KALENDER BULANAN DENGAN weekStartsOn: 1 (SENIN)
  const renderCalendarGrid = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    // KRITIS: Opsi date-fns adalah weekStartsOn: 1 (Senin sebagai awal minggu)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'd');
        const cloneDay = day;
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayBookings = monthBookings.filter(b => b.jadwal_mulai?.startsWith(dayStr));
        const dayIsSunday = isSunday(day);
        const dayIsToday = isSameDay(day, new Date());
        const dayIsSelected = isSameDay(day, selectedDate);
        const hasUnassigned = dayBookings.some(b => b.status === 'scheduled' && !getAssignedTechnician(b));

        days.push(
          <div
            key={day.toISOString()}
            onClick={() => { 
              setSelectedDate(cloneDay); 
              setIsModalOpen(true); 
            }}
            className={cn(
              "p-1.5 sm:p-2.5 border-b border-r border-slate-200 min-h-[95px] sm:min-h-[120px] cursor-pointer transition-all flex flex-col justify-between relative group select-none",
              !isSameMonth(day, monthStart) 
                ? "bg-slate-50/60 text-slate-500" 
                : dayIsSunday 
                  ? "bg-rose-50/20 text-slate-800" 
                  : "bg-white text-slate-800",
              dayIsSelected 
                ? "ring-2 ring-blue-500 ring-inset bg-blue-50/30 z-10" 
                : "hover:bg-blue-50/20"
            )}
          >
            {/* Top row of date cell */}
            <div className="flex justify-between items-start mb-1">
              <span className={cn(
                "w-7 h-7 flex items-center justify-center rounded-xl text-xs sm:text-sm font-black transition-all",
                dayIsToday 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 font-black scale-105" 
                  : dayIsSunday
                    ? "text-rose-600 font-black group-hover:text-rose-700"
                    : "text-slate-700 group-hover:text-blue-600"
              )}>
                {formattedDate}
              </span>

              {/* Counter badges */}
              <div className="flex items-center gap-1">
                {hasUnassigned && (
                  <span 
                    className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-200" 
                    title="Ada booking yang belum ditugaskan teknisi"
                  />
                )}
                {dayBookings.length > 0 && (
                  <span className="text-xs font-black bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-md">
                    {dayBookings.length}
                  </span>
                )}
              </div>
            </div>

            {/* List mini tiket di sel tanggal */}
            <div className="flex-1 space-y-1 mt-0.5 overflow-hidden">
              {dayBookings.slice(0, 3).map(b => {
                const assigned = getAssignedTechnician(b);
                const isNeedsTech = b.status === 'scheduled' && !assigned;

                return (
                  <div 
                    key={b.id} 
                    className={cn(
                      "text-xs px-1.5 py-0.8 rounded-md truncate font-semibold border transition-all",
                      isNeedsTech 
                        ? "bg-amber-50 text-amber-900 border-amber-300 font-bold" 
                        : b.status === 'scheduled' 
                          ? "bg-blue-50 text-blue-800 border-blue-200" 
                          : b.status === 'on process' 
                            ? "bg-sky-50 text-sky-800 border-sky-200" 
                            : b.status === 'done' 
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                              : "bg-slate-50 text-slate-700 border-slate-200"
                    )}
                  >
                    <span className="font-bold opacity-80 mr-1">
                      {format(new Date(b.jadwal_mulai), 'HH:mm')}
                    </span>
                    <span>
                      {(b.customer?.nama || b.nama || '').split(' ')[0] || 'Tiket'}
                    </span>
                  </div>
                );
              })}

              {dayBookings.length > 3 && (
                <div className="text-xs text-slate-500 font-bold pl-1">
                  +{dayBookings.length - 3} lainnya
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }

      rows.push(
        <div className="grid grid-cols-7 border-l border-slate-200" key={day.toISOString()}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="border-t-0 rounded-b-2xl overflow-hidden bg-white shadow-sm border border-slate-200">
        {rows}
      </div>
    );
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 relative min-w-0">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Jadwal Servis & Kalender
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantau sebaran jadwal servis harian, alokasi penugasan teknisi, dan agenda kunjungan pelanggan.
          </p>
        </div>

        {/* CONTROLS BULAN */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs w-full sm:w-auto justify-between sm:justify-start">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-600 cursor-pointer"
            title="Bulan Sebelumnya"
            aria-label="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-3 text-center font-black text-slate-900 text-xs sm:text-sm capitalize min-w-[130px]">
            {format(currentMonth, 'MMMM yyyy', { locale: id })}
          </div>

          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-600 cursor-pointer"
            title="Bulan Berikutnya"
            aria-label="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-200 mx-1"></div>

          <Button 
            variant="ghost"
            size="sm"
            onClick={() => { 
              const now = new Date();
              setCurrentMonth(now); 
              setSelectedDate(now); 
            }}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 h-8 rounded-xl cursor-pointer"
          >
            Hari Ini
          </Button>

        </div>
      </div>

      {/* 4 CLEAN KPI STATUS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Servis Bulan Ini</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{monthStats.total}</p>
            <p className="text-xs font-medium text-slate-500 mt-1">Seluruh agenda servis terdaftar</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Perlu Teknisi</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-amber-700">{monthStats.unassigned}</p>
            <p className="text-xs font-medium text-amber-600/80 mt-1">Belum dialokasikan ke teknisi</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Sedang Dikerjakan</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-sky-700">{monthStats.onProcess}</p>
            <p className="text-xs font-medium text-sky-600/80 mt-1">Teknisi aktif di lokasi konsumen</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Selesai Bergaransi</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-700">{monthStats.done}</p>
            <p className="text-xs font-medium text-emerald-600/80 mt-1">Pekerjaan tuntas & bergaransi</p>
          </div>
        </div>
      </div>

      {/* KALENDER BULANAN */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex items-center justify-center rounded-2xl">
            <div className="bg-white px-5 py-3 rounded-2xl shadow-xl border border-slate-100 font-bold text-slate-700 flex items-center gap-3 text-sm">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" /> 
              <span>Memperbarui kalender...</span>
            </div>
          </div>
        )}
        {renderDaysHeader()}
        {renderCalendarGrid()}
      </div>

      {/* MODAL AGENDA HARIAN (SAAT TANGGAL DIKLIK) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col w-full max-w-4xl max-h-[90vh]">
            {/* Header Modal */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                    <CalendarIcon className="w-4 h-4" />
                  </span>
                  <h3 className="font-black text-slate-900 text-lg">
                    Agenda: {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: id })}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold text-xs px-2.5 py-0.5">
                  {selectedDayBookings.length} Tiket
                </Badge>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Table Agenda Harian */}
            <div className="overflow-y-auto flex-1 p-0">
              {selectedDayBookings.length === 0 ? (
                <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
                    <CalendarIcon className="w-7 h-7" />
                  </div>
                  <p className="text-base font-bold text-slate-900">Tidak ada jadwal pada tanggal ini</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Belum ada tiket servis yang dijadwalkan pada tanggal ini.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                        <th className="py-3.5 px-6">Waktu</th>
                        <th className="py-3.5 px-6">Kode & Layanan</th>
                        <th className="py-3.5 px-6">Pelanggan & Kontak</th>
                        <th className="py-3.5 px-6">Teknisi</th>
                        <th className="py-3.5 px-6">Status</th>
                        <th className="py-3.5 px-6 text-right">Aksi & Penugasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                      {selectedDayBookings.map(b => {
                        const assignedTech = getAssignedTechnician(b);
                        const waLink = getWhatsAppLink(b.customer?.kontak || b.kontak, b.kode_booking, b.customer?.nama || b.nama);

                        return (
                          <tr 
                            key={b.id} 
                            className={cn(
                              "hover:bg-blue-50/30 transition-colors",
                              !assignedTech && b.status === 'scheduled' && "bg-amber-50/20"
                            )}
                          >
                            {/* Waktu */}
                            <td className="py-3.5 px-6 font-bold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span>
                                  {new Date(b.jadwal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                </span>
                              </div>
                            </td>

                            {/* Kode & Layanan */}
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                  {b.kode_booking}
                                </span>
                                <button
                                  onClick={(e) => handleCopyCode(b.kode_booking, e)}
                                  className="text-slate-500 hover:text-slate-600 p-0.5 cursor-pointer"
                                  title="Salin Kode"
                                >
                                  {copiedCode === b.kode_booking ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              <div className="font-bold text-slate-900 text-xs mt-1">
                                {b.layanan?.nama_layanan || b.layanan?.nama || b.nama_layanan || 'Service AC'}
                                {b.jumlah_unit > 1 && ` (${b.jumlah_unit} Unit)`}
                              </div>
                            </td>

                            {/* Pelanggan */}
                            <td className="py-3.5 px-6">
                              <div className="font-bold text-slate-900">{b.customer?.nama || b.nama || '-'}</div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <span>{b.customer?.kontak || b.kontak || '-'}</span>
                                {waLink && (
                                  <a
                                    href={waLink}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline ml-1"
                                    title="WhatsApp"
                                  >
                                    WA
<span className="sr-only"> (buka di tab baru)</span>
                                  </a>
                                )}
                              </div>
                            </td>

                            {/* Teknisi */}
                            <td className="py-3.5 px-6">
                              {assignedTech ? (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/50 inline-flex">
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>{assignedTech.nama}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-flex">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Belum Ditugaskan</span>
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-6">
                              <Badge className={cn(
                                "text-xs font-black uppercase px-2.5 py-0.5",
                                b.status === 'scheduled' ? "bg-amber-100 text-amber-800 border-amber-200" :
                                b.status === 'on process' ? "bg-sky-100 text-sky-800 border-sky-200" :
                                b.status === 'done' ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                                "bg-slate-100 text-slate-700"
                              )}>
                                {b.status}
                              </Badge>
                            </td>

                            {/* Aksi Ubah Tanggal & Smart Assign */}
                            <td className="py-3.5 px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {b.status !== 'done' && b.status !== 'cancelled' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openRescheduleModal(b)}
                                    className="border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl h-8 px-2.5 cursor-pointer shadow-sm flex items-center gap-1"
                                    title="Ubah Tanggal / Reschedule"
                                  >
                                    <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Ubah Tanggal</span>
                                  </Button>
                                )}

                                {b.status !== 'done' && b.status !== 'cancelled' && (
                                  <Button
                                    size="sm"
                                    onClick={() => openAssign(b)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-8 px-3 cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                                    title="Rekomendasi Teknisi AI"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Smart Assign</span>
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex justify-end">
              <Button
                onClick={() => setIsModalOpen(false)}
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
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
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-xs text-blue-900">
                <span className="font-bold block">Pelanggan: {rescheduleBooking.customer?.nama || rescheduleBooking.nama}</span>
                <span className="text-blue-700">Layanan: {rescheduleBooking.layanan?.nama_layanan || rescheduleBooking.layanan?.nama || 'Service AC'}</span>
              </div>

              {/* Tanggal Baru */}
              <div>
                <label htmlFor="admin-schedule-f1" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tanggal Baru:
                </label>
                <input
                  id="admin-schedule-f1"
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
                <label htmlFor="admin-schedule-f2" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Jam Kunjungan:
                </label>
                <select
                  id="admin-schedule-f2"
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
                <label htmlFor="admin-schedule-f3" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alasan Perubahan Jadwal:
                </label>
                <textarea
                  id="admin-schedule-f3"
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
    </div>
  );
}
