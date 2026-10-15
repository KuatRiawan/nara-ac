/**
 * useFocusTrap - Custom hook untuk focus trap
 * Memastikan focus tetap di dalam elemen dialog/modal
 * WCAG 2.1 compliant untuk aksesibilitas keyboard
 */
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(ref, isOpen, onEscape) {
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !ref.current) return;

    // Temukan semua elemen yang bisa di-focus
    const focusableElements = Array.from(ref.current.querySelectorAll(FOCUSABLE_SELECTORS));
    
    if (focusableElements.length === 0) return;

    // Simpan referensi
    firstFocusableRef.current = focusableElements[0];
    lastFocusableRef.current = focusableElements[focusableElements.length - 1];

    // Focus ke elemen pertama saat modal terbuka
    firstFocusableRef.current.focus();

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab: jika di elemen pertama, pindah ke elemen terakhir
        if (document.activeElement === firstFocusableRef.current) {
          e.preventDefault();
          lastFocusableRef.current.focus();
        }
      } else {
        // Tab: jika di elemen terakhir, pindah ke elemen pertama
        if (document.activeElement === lastFocusableRef.current) {
          e.preventDefault();
          firstFocusableRef.current.focus();
        }
      }
    };

    const handleKeyDown = (e) => {
      // Handle Escape key
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
      }
    };

    const handleFocusIn = (e) => {
      // Jika focus keluar dari modal, kembalikan ke elemen pertama
      if (ref.current && !ref.current.contains(e.target)) {
        firstFocusableRef.current.focus();
      }
    };

    const dialog = ref.current;
    dialog.addEventListener('keydown', handleTabKey);
    dialog.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      dialog.removeEventListener('keydown', handleTabKey);
      dialog.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [isOpen, onEscape]);
}

export default useFocusTrap;
