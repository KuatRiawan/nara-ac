import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

// Toast types with static Tailwind classes for Tailwind CSS v4 compatibility
const TOAST_TYPES = {
  success: { icon: CheckCircle, color: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', hoverBg: 'hover:bg-green-100' },
  error: { icon: XCircle, color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', hoverBg: 'hover:bg-red-100' },
  warning: { icon: AlertTriangle, color: 'bg-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', hoverBg: 'hover:bg-yellow-100' },
  info: { icon: Info, color: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', hoverBg: 'hover:bg-blue-100' },
};

// Toast context
import { createContext, useContext } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
  const warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast]);
  const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, success, error, warning, info, dismissToast }}>
      {children}
      {/* Toast container dengan aria-live untuk aksesibilitas */}
      <div 
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 sm:w-96"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Individual Toast component
function Toast({ toast, onDismiss }) {
  const Icon = TOAST_TYPES[toast.type]?.icon || Info;
  const { color, text, bg, border, hoverBg } = TOAST_TYPES[toast.type] || TOAST_TYPES.info;

  useEffect(() => {
    // Start exit animation before removing
    const timer = setTimeout(() => {
      const element = document.getElementById(`toast-${toast.id}`);
      if (element) {
        element.classList.add('animate-out', 'fade-out', 'slide-out-to-right');
      }
    }, toast.duration - 500);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration]);

  return (
    <div
      id={`toast-${toast.id}`}
      className={cn(
        "animate-in slide-in-from-right fade-in p-4 rounded-xl shadow-lg border flex items-start gap-3",
        bg,
        border,
        "w-full"
      )}
      role="alert"
    >
      <div className={cn("w-5 h-5 flex-shrink-0", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className={cn("text-sm font-medium", text)}>{toast.message}</p>
      </div>
      <button
        onClick={onDismiss}
        className={cn("p-1 rounded-lg transition-colors", hoverBg)}
        aria-label="Tutup"
      >
        <X className={cn("w-4 h-4", text)} />
      </button>
    </div>
  );
}

export default Toast;
