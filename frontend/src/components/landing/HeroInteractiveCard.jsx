import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calculator, Clock, ShieldCheck, ArrowRight, Check, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

export default function HeroInteractiveCard({ services = [] }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('estimator'); // 'estimator' | 'tracker'

  // Tracker state
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingError, setTrackingError] = useState('');

  // Estimator state
  const [unitCount, setUnitCount] = useState(2);
  const [selectedService, setSelectedService] = useState('core'); // 'standard' | 'core' | 'core_freon'

  const serviceOptions = useMemo(() => {
    const list = Array.isArray(services) ? services : [];
    const std = list.find(s => s.kode === 'SRV-CUCI-01' || (s.nama_layanan || '').toLowerCase().includes('standard') || s.id === 1);
    const cr = list.find(s => s.kode === 'SRV-CUCI-CORE' || ((s.nama_layanan || '').toLowerCase().includes('core') && !(s.nama_layanan || '').toLowerCase().includes('freon')) || s.id === 4);
    const cf = list.find(s => s.kode === 'SRV-CUCI-FREON' || ((s.nama_layanan || '').toLowerCase().includes('freon') && (s.nama_layanan || '').toLowerCase().includes('core')) || s.id === 5);

    return {
      standard: {
        id: 'standard',
        serviceId: std?.id || 1,
        name: std?.nama_layanan || 'Cuci AC Standar',
        badge: 'Rutin',
        basePrice: std?.harga !== undefined ? Number(std.harga) : 75000,
        durationPerUnit: std?.durasi_menit !== undefined ? Number(std.durasi_menit) : 60,
        warranty: '14 Hari',
        desc: 'Pembersihan filter & evaporator ringan',
      },
      core: {
        id: 'core',
        serviceId: cr?.id || 4,
        name: cr?.nama_layanan || 'Cuci AC Core (Deep Clean)',
        badge: 'Best Value',
        basePrice: cr?.harga !== undefined ? Number(cr.harga) : 120000,
        durationPerUnit: cr?.durasi_menit !== undefined ? Number(cr.durasi_menit) : 90,
        warranty: '30 Hari',
        desc: 'Bongkar blower, talang air & chemical wash',
      },
      core_freon: {
        id: 'core_freon',
        serviceId: cf?.id || 5,
        name: cf?.nama_layanan || 'Paket Core + Isi Freon',
        badge: 'Lengkap',
        basePrice: cf?.harga !== undefined ? Number(cf.harga) : 220000,
        durationPerUnit: cf?.durasi_menit !== undefined ? Number(cf.durasi_menit) : 105,
        warranty: '45 Hari',
        desc: 'Deep clean total + isi freon murni presisi',
      },
    };
  }, [services]);

  const calculation = useMemo(() => {
    const s = serviceOptions[selectedService] || serviceOptions.core;
    const subtotal = s.basePrice * unitCount;
    // Diskon eksklusif untuk Member: 10%
    const memberDiscount = Math.round(subtotal * 0.1);
    const total = subtotal;
    const estTime = Math.round((s.durationPerUnit * unitCount) * (unitCount > 1 ? 0.85 : 1));

    return {
      subtotal,
      memberDiscount,
      total,
      estTime,
      serviceName: s.name,
      warranty: s.warranty,
    };
  }, [selectedService, unitCount, serviceOptions]);

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    const trimmed = trackingInput.trim();
    if (!trimmed) {
      setTrackingError('Masukkan kode booking.');
      return;
    }
    const bookingCodePattern = /^(NARA-AC[A-Za-z0-9-]+|AC-[A-Za-z0-9-]+|BK-[A-Za-z0-9-]+)$/i;
    if (/^\d{6,15}$/.test(trimmed)) {
      setTrackingError('Pencarian publik hanya mendukung Kode Booking (contoh: AC-XXXX atau BK-...). Nomor HP tidak dapat digunakan demi perlindungan privasi data pelanggan.');
      return;
    }
    if (!bookingCodePattern.test(trimmed)) {
      setTrackingError('Format kode booking tidak valid. Gunakan format AC-XXXX atau BK-20261014-XXXX.');
      return;
    }
    setTrackingError('');
    navigate(`/status/${encodeURIComponent(trimmed.toUpperCase())}`);
  };

  const handleBookingRedirect = () => {
    const s = serviceOptions[selectedService] || serviceOptions.core;
    navigate(`/booking?service=${selectedService}&layanan=${s.serviceId}&units=${unitCount}`);
  };

  return (
    <div className="relative">
      {/* Ambient Pulsing Backing Glow */}
      <motion.div
        animate={{
          opacity: [0.3, 0.55, 0.3],
          scale: [0.98, 1.02, 0.98],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -inset-2 bg-gradient-to-r from-blue-400/40 via-sky-300/40 to-cyan-400/40 rounded-3xl blur-2xl pointer-events-none"
      />

      <div className="relative bg-white/95 backdrop-blur-2xl p-6 sm:p-7 rounded-3xl border border-sky-100 shadow-2xl shadow-blue-900/10 text-left overflow-hidden">
        
        {/* Dual Tab Switcher */}
        <div className="flex p-1.5 bg-sky-50/80 rounded-2xl border border-sky-100 mb-6 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('estimator')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'estimator'
                ? 'bg-white text-blue-700 shadow-xs border border-sky-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calculator className="w-4 h-4 text-blue-600" />
            <span>Kalkulator Estimasi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tracker')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'tracker'
                ? 'bg-white text-blue-700 shadow-xs border border-sky-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Search className="w-4 h-4 text-blue-600" />
            <span>Lacak Status Tiket</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'estimator' ? (
            /* TAB 1: KALKULATOR ESTIMASI HARGA & WAKTU */
            <motion.div
              key="estimator"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Jumlah Unit Selector */}
              <div>
                <div role="group" aria-labelledby="hero-unit-count-label" className="flex items-center justify-between mb-2">
                  <label id="hero-unit-count-label" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Jumlah Unit AC
                  </label>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {unitCount} Unit Terpilih
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setUnitCount(num)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        unitCount === num
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                          : 'bg-sky-50/60 text-slate-700 border-sky-100 hover:bg-sky-100/60'
                      }`}
                    >
                      {num} {num === 4 ? 'Unit+' : 'Unit'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paket Pilihan */}
              <div>
                <label id="hero-service-label" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Pilih Paket Servis
                </label>
                <div className="space-y-2">
                  {Object.values(serviceOptions).map((opt) => {
                    const isSelected = selectedService === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setSelectedService(opt.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 shadow-xs'
                            : 'bg-white border-sky-100 hover:border-sky-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              {opt.name}
                              <span className="text-xs font-bold text-blue-600 bg-sky-100 px-1.5 py-0.2 rounded">
                                {opt.badge}
                              </span>
                            </p>
                            <p className="text-xs text-slate-500">{opt.desc}</p>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-slate-900 font-mono">
                          Rp {(opt.basePrice / 1000).toLocaleString('id-ID')}k
                          <span className="text-xs font-normal text-slate-500">/unit</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Animated Live Summary Box */}
              <motion.div
                layout
                className="bg-gradient-to-br from-sky-50 to-blue-50/70 p-4 rounded-2xl border border-sky-200/80 mt-4 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Estimasi Pengerjaan:
                  </span>
                  <span className="font-bold text-slate-800">± {calculation.estTime} Menit</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Garansi Resmi:
                  </span>
                  <span className="font-bold text-emerald-700">{calculation.warranty} Penuh</span>
                </div>

                <div className="flex items-center justify-between text-xs text-blue-700 bg-blue-50/80 px-2.5 py-1.5 rounded-lg border border-blue-200/80">
                  <span className="font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Benefit Member:
                  </span>
                  <span className="font-bold">Hemat 10% (-Rp {calculation.memberDiscount.toLocaleString('id-ID')})</span>
                </div>

                <div className="pt-2 border-t border-sky-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                      Total Estimasi Biaya
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-blue-700 font-mono">
                      Rp {calculation.total.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <Button
                    onClick={handleBookingRedirect}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-5 rounded-xl text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-1.5 group"
                  >
                    <span>Pesan Paket Ini</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            /* TAB 2: LACAK STATUS TIKET (QUICK TRACKER) */
            <motion.div
              key="tracker"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div>
                <span className="text-xs font-bold tracking-widest uppercase text-blue-600">Portal Publik</span>
                <h4 className="text-lg font-black text-slate-900 mt-0.5">Lacak Status Pengerjaan</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Masukkan kode tiket booking resmi untuk memantau perjalanan teknisi secara langsung.
                </p>
              </div>

              <form onSubmit={handleTrackSubmit} className="space-y-3 pt-2">
                <div>
                  <label htmlFor="hero-track-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Kode Booking Layanan
                  </label>
                  <input
                    id="hero-track-input"
                    type="text"
                    value={trackingInput}
                    onChange={(e) => {
                      setTrackingInput(e.target.value);
                      if (trackingError) setTrackingError('');
                    }}
                    placeholder="Contoh: AC-WXYZ atau BK-20261014-0001"
                    className="w-full bg-sky-50/60 border border-sky-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                    aria-describedby={trackingError ? 'hero-track-error' : undefined}
                    required
                  />
                  {trackingError && (
                    <p id="hero-track-error" role="alert" className="text-xs text-rose-600 font-medium mt-1.5 flex items-start gap-1">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{trackingError}</span>
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Cek Status Sekarang</span>
                </Button>
              </form>

              {/* Sample Ticket Mini Simulation */}
              <div className="pt-3 border-t border-sky-100">
                <div className="bg-sky-50/80 rounded-xl p-3 border border-sky-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <div>
                      <p className="text-xs font-mono font-bold text-slate-900">BK-AC-STANDARD</p>
                      <p className="text-xs text-slate-500">Status: Selesai Pengerjaan</p>
                    </div>
                  </div>
                  <Link to="/status" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                    Cek Demo &rarr;
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
