import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CalendarCheck, User, X, ArrowRight } from 'lucide-react';
import CompanyLogo from '../CompanyLogo';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const easeOutCubic = [0.16, 1, 0.3, 1];

export default function MobileNav({ isOpen, onClose, scrollTo }) {
  const navLinks = [
    { name: 'Beranda', id: 'home' },
    { name: 'Layanan AC', id: 'layanan' },
    { name: 'Keunggulan', id: 'keunggulan' },
    { name: 'Cara Kerja', id: 'cara-kerja' },
    { name: 'Dokumentasi', id: 'galeri' },
    { name: 'Ulasan Google', id: 'ulasan' },
    { name: 'Profil & Legalitas', id: 'profil' },
    { name: 'FAQ', id: 'faq' },
  ];
  
  const drawerRef = useRef(null);
  
  // Focus trap untuk aksesibilitas
  useFocusTrap(drawerRef, isOpen, onClose);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 lg:hidden"
            aria-hidden="true"
          />

          {/* Drawer / Sheet */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.3, ease: easeOutCubic }}
            className="fixed top-0 inset-x-0 z-50 bg-white rounded-b-3xl shadow-2xl border-b border-slate-100 max-h-[90vh] overflow-y-auto lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu Navigasi Mobile"
            tabIndex={-1}
            ref={drawerRef}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center pb-5 border-b border-slate-100">
                <CompanyLogo dark={false} iconSize="h-8" />
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Tutup menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="py-4 space-y-1">
                {navLinks.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      scrollTo(item.id);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-3 text-base font-bold text-slate-800 hover:text-blue-600 hover:bg-blue-50/60 rounded-xl transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span>{item.name}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-blue-600" />
                  </button>
                ))}
              </nav>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <Link
                  to="/booking"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all text-center"
                >
                  <CalendarCheck className="w-4 h-4" />
                  Booking Service Sekarang
                </Link>

                <Link
                  to="/status"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 w-full py-3 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all"
                >
                  <Search className="w-4 h-4 text-blue-600" />
                  Cek Status Booking
                </Link>

                <div className="pt-2 flex flex-col items-center gap-2 text-center">
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Masuk Portal Member Pelanggan</span>
                  </Link>
                  <Link
                    to="/staff/login"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <span>Portal Staf &amp; Teknisi</span>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
