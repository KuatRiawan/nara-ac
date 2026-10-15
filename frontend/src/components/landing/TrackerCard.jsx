/**
 * TrackerCard Component
 * Lacak Status Tiket Booking untuk pelanggan
 * Memungkinkan pengguna untuk memantau status pengerjaan servis AC
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

export default function TrackerCard() {
  const navigate = useNavigate();
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingError, setTrackingError] = useState('');

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative"
    >
      {/* Ambient Pulsing Backing Glow */}
      <motion.div
        animate={{
          opacity: [0.3, 0.55, 0.3],
          scale: [0.98, 1.02, 0.98],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -inset-2 bg-gradient-to-r from-sky-400/40 via-cyan-300/40 to-blue-400/40 rounded-3xl blur-2xl pointer-events-none"
      />

      <div className="relative bg-white/95 backdrop-blur-2xl p-6 sm:p-7 rounded-3xl border border-sky-100 shadow-2xl shadow-blue-900/10 text-left">
        
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Lacak Status Tiket</h3>
            <p className="text-xs text-slate-500 mt-0.5">Portal Publik - Cek status pengerjaan</p>
          </div>
        </div>

        <form onSubmit={handleTrackSubmit} className="space-y-4">
          <div>
            <label htmlFor="tracker-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Kode Booking Layanan
            </label>
            <input
              id="tracker-input"
              type="text"
              value={trackingInput}
              onChange={(e) => {
                setTrackingInput(e.target.value);
                if (trackingError) setTrackingError('');
              }}
              placeholder="Contoh: AC-WXYZ atau BK-20261014-0001"
              className="w-full bg-sky-50/60 border border-sky-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
              aria-describedby={trackingError ? 'tracker-input-error' : undefined}
              required
            />
            {trackingError && (
              <p id="tracker-input-error" role="alert" className="text-xs text-rose-600 font-medium mt-1.5 flex items-start gap-1">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{trackingError}</span>
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold h-11 rounded-xl text-sm shadow-md shadow-sky-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>Cek Status Sekarang</span>
          </Button>
        </form>

        {/* Sample Ticket Mini Simulation */}
        <div className="pt-4 border-t border-sky-100">
          <div className="bg-sky-50/80 rounded-xl p-3 border border-sky-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <p className="text-xs font-mono font-bold text-slate-900">BK-AC-STANDARD</p>
                <p className="text-xs text-slate-500">Status: Selesai Pengerjaan</p>
              </div>
            </div>
            <Link to="/status" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <span>Cek Demo</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="pt-4 border-t border-sky-100">
          <p className="text-xs text-slate-500 text-center">
            Masukkan kode tiket booking resmi NARA AC untuk memantau status servis teknisi secara langsung
          </p>
        </div>
      </div>
    </motion.div>
  );
}
