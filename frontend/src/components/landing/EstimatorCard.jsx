/**
 * EstimatorCard Component
 * Kalkulator Estimasi Harga & Waktu untuk Service AC
 * Memungkinkan pengguna untuk menghitung biaya dan waktu servis berdasarkan
 * jumlah unit AC dan paket layanan yang dipilih
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calculator, Clock, ShieldCheck, ArrowRight, Check, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

export default function EstimatorCard({ services = [] }) {
  const navigate = useNavigate();
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

  const handleBookingRedirect = () => {
    const s = serviceOptions[selectedService] || serviceOptions.core;
    navigate(`/booking?service=${selectedService}&layanan=${s.serviceId}&units=${unitCount}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative"
    >
      {/* Ambient Pulsing Backing Glow */}
      <motion.div
        animate={{
          opacity: [0.3, 0.55, 0.3],
          scale: [0.98, 1.02, 0.98],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -inset-2 bg-gradient-to-r from-blue-400/40 via-sky-300/40 to-cyan-400/40 rounded-3xl blur-2xl pointer-events-none"
      />

      <div className="relative bg-white/95 backdrop-blur-2xl p-6 sm:p-7 rounded-3xl border border-sky-100 shadow-2xl shadow-blue-900/10 text-left">
        
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Kalkulator Estimasi</h3>
            <p className="text-xs text-slate-500 mt-0.5">Hitung biaya & waktu servis AC Anda</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Jumlah Unit Selector */}
          <div>
            <div role="group" aria-labelledby="estimator-unit-count-label" className="flex items-center justify-between mb-2">
              <label id="estimator-unit-count-label" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
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
            <label id="estimator-service-label" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
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
        </div>

      </div>
    </motion.div>
  );
}
