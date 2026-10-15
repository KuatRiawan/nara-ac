/**
 * Breadcrumb Navigation Component
 * Menampilkan jejak navigasi untuk membantu pengguna tahu posisi mereka
 */
import { Link } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

export default function Breadcrumb({ items = [], currentRole = 'admin', className = '' }) {
  const homeTo = currentRole === 'admin' ? '/admin' : '/technician';
  const displayItems = items[0]?.label === 'Beranda' ? items.slice(1) : items;

  return (
    <nav 
      className={`flex items-center gap-1.5 text-xs text-slate-500 min-w-0 ${className}`}
      aria-label="Jejak Navigasi Breadcrumb"
    >
      <Link 
        to={homeTo}
        className="flex items-center gap-1 font-semibold text-slate-400 hover:text-blue-600 transition-colors shrink-0 group"
        title="Kembali ke Beranda Dashboard"
      >
        <Home className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
        <span className="hidden sm:inline">Beranda</span>
      </Link>
      
      {displayItems.length === 0 ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-slate-700 font-bold" aria-current="page">Dashboard</span>
        </div>
      ) : (
        displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          
          return (
            <div key={item.label} className="flex items-center gap-1.5 min-w-0">
              <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
              {isLast ? (
                <span className="text-slate-800 font-bold truncate max-w-[180px] sm:max-w-[260px]" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link 
                  to={item.to}
                  className="font-medium text-slate-400 hover:text-blue-600 transition-colors truncate max-w-[140px]"
                >
                  {item.label}
                </Link>
              )}
            </div>
          );
        })
      )}
    </nav>
  );
}
