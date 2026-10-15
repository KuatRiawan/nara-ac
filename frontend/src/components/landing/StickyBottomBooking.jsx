import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarCheck, Phone, ArrowRight, X, Bot } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import ChatbotWidget from '../ChatbotWidget';
import { useBusinessProfile, buildWhatsAppUrl } from '../../hooks/useBusinessProfile';

export default function StickyBottomBooking() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { whatsappNumber } = useBusinessProfile();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount in case page is already scrolled
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showExpandedDock = isScrolled && !isMinimized;

  return (
    <>
      {/* 1. Chatbot Window - Controlled by this unified component */}
      <ChatbotWidget
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        hideFloatingButton={true}
      />

      {/* 2. Unified Floating Action Dock & FAB */}
      <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 pointer-events-auto">
        <AnimatePresence mode="wait">
          {showExpandedDock ? (
            /* --- Expanded Action Dock --- */
            <motion.div
              key="dock-expanded"
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className="bg-slate-900/95 hover:bg-slate-900 text-white p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border border-white/15 backdrop-blur-xl shadow-2xl shadow-blue-950/40 flex items-center justify-between gap-3 sm:gap-4 transition-all max-w-[calc(100vw-2rem)] sm:max-w-xl"
            >
              {/* Live Technician Slot Status Indicator */}
              <div className="flex items-center gap-2.5 pl-1.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute inset-0 opacity-75" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    AC Kurang Dingin?
                  </p>
                  <p className="text-xs sm:text-xs text-slate-300 truncate">
                    Slot teknisi tersedia hari ini
                  </p>
                </div>
              </div>

              {/* Action Buttons: Tanya AI, WhatsApp, Booking, Minimize */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Tanya AI Chatbot Trigger */}
                <button
                  type="button"
                  onClick={() => setIsChatOpen(prev => !prev)}
                  className={cn(
                    "h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border",
                    isChatOpen
                      ? "bg-sky-500/25 border-sky-400 text-sky-200 ring-2 ring-sky-400/30"
                      : "bg-white/10 hover:bg-white/20 border-white/15 text-sky-300 hover:text-white"
                  )}
                  title="Tanya AI Asisten Nara AC"
                >
                  <Bot className="w-4 h-4 text-sky-400" />
                  <span className="hidden xs:inline">Tanya AI</span>
                </button>

                {/* Direct WhatsApp Call */}
                <a
                  href={buildWhatsAppUrl(whatsappNumber, 'Halo NARA AC, saya ingin konsultasi jadwal servis AC')}
                  target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
                  title="Chat WhatsApp"
                >
                  <Phone className="w-4 h-4" />
<span className="sr-only"> (buka di tab baru)</span>
                </a>

                {/* Booking Service Direct Link */}
                <Link to="/booking">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 px-3 sm:px-3.5 rounded-xl text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-1 group"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Booking</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>

                {/* Minimize Pill Button */}
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="w-7 h-7 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer ml-0.5"
                  aria-label="Kecilkan bar"
                  title="Kecilkan bar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* --- Compact Floating FAB --- */
            <motion.div
              key="dock-collapsed"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="relative group"
            >
              <button
                type="button"
                onClick={() => {
                  if (isChatOpen) {
                    setIsChatOpen(false);
                  } else {
                    setIsChatOpen(true);
                    setIsMinimized(false);
                  }
                }}
                className={cn(
                  "relative w-13 h-13 sm:w-14 sm:h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 cursor-pointer border border-white/20",
                  isChatOpen
                    ? "bg-slate-800 text-white scale-95 ring-2 ring-sky-400"
                    : "bg-gradient-to-tr from-blue-600 via-sky-500 to-blue-600 text-white hover:scale-105 shadow-blue-600/40"
                )}
                aria-label={isChatOpen ? "Tutup chat asisten" : "Buka Asisten Nara AC & Booking"}
              >
                {isChatOpen ? (
                  <X className="w-6 h-6 text-white" />
                ) : (
                  <Bot className="w-6 h-6 text-white" />
                )}

                {/* Green pulsating slot status indicator */}
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
                </span>
              </button>

              {/* Tooltip on hover */}
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden sm:group-hover:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-semibold rounded-xl shadow-xl border border-white/10 whitespace-nowrap pointer-events-none">
                <span>Tanya AI & Cek Slot Teknisi</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
