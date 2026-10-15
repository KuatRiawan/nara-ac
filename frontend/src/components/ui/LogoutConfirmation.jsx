import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Focus trap utility - keep focus within the dialog
 */
const FOCUSABLE_SELECTORS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function useFocusTrap(ref, isOpen) {
  useEffect(() => {
    if (!isOpen || !ref.current) return;
    
    const focusableElements = ref.current.querySelectorAll(FOCUSABLE_SELECTORS);
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    const handleFocusIn = (e) => {
      // If focus goes outside the dialog
      if (ref.current && !ref.current.contains(e.target)) {
        firstElement.focus();
      }
    };
    
    const dialog = ref.current;
    dialog.addEventListener('keydown', handleTabKey);
    document.addEventListener('focusin', handleFocusIn);
    
    // Focus first element on open
    firstElement.focus();
    
    return () => {
      dialog.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [isOpen]);
}

/**
 * LogoutConfirmationDialog Component
 * - Menampilkan dialog konfirmasi sebelum logout
 * - Dapat dioperasikan dengan keyboard (Escape untuk batal, Enter untuk logout)
 * - Memiliki focus management yang baik
 * - Mencegah double-click
 */
export default function LogoutConfirmationDialog({ isOpen, onConfirm, onCancel, message = 'Apakah Anda yakin ingin mengakhiri sesi sekarang?' }) {
  const [isLoading, setIsLoading] = useState(false);
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // Focus trap untuk memastikan focus tetap di dalam dialog
  useFocusTrap(dialogRef, isOpen);

  // Focus management saat dialog dibuka (fallback)
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      // Focus ke tombol confirm setelah dialog terbuka
      setTimeout(() => {
        if (confirmButtonRef.current) {
          confirmButtonRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    } else if (e.key === 'Enter' && isOpen && !isLoading) {
      e.preventDefault();
      e.stopPropagation();
      onConfirm();
    }
  }, [isOpen, isLoading, onCancel, onConfirm]);

  // Setup keyboard listener and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const handleConfirm = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
      aria-describedby="logout-message"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in zoom-in-95 duration-200"
        role="document"
        tabIndex={-1}
        onKeyDown={(e) => {
          // Tangani Escape dan Enter
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          } else if (e.key === 'Enter' && !isLoading) {
            e.preventDefault();
            handleConfirm();
          }
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2
                id="logout-title"
                className="text-lg font-black text-slate-900 tracking-tight"
              >
                Keluar dari akun?
              </h2>
            </div>
          </div>
          {/* Close button */}
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Tutup dialog"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p
            id="logout-message"
            className="text-sm text-slate-600 leading-relaxed"
          >
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            Batal
          </button>
          <button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              "px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed",
              isLoading
                ? "bg-red-500 cursor-wait"
                : "bg-red-600 hover:bg-red-700"
            )}
            type="button"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Memproses...
              </span>
            ) : (
              'Ya, Keluar'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
