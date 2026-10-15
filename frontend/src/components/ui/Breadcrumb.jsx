/**
 * Breadcrumb Navigation Component
 * Menampilkan jejak navigasi untuk membantu pengguna tahu posisi mereka
 */
import { Link } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';


export default function Breadcrumb({ items = [] }) {
  if (items.length === 0) return null;

  return (
    <nav 
      className="flex items-center gap-2 text-xs text-slate-500 mb-4 sm:mb-6"
      aria-label="Breadcrumb"
    >
      <Link 
        to="/"
        className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Beranda</span>
      </Link>
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={item.label} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-slate-400" />
            {isLast ? (
              <span className="text-slate-700 font-semibold truncate max-w-[200px]" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link 
                to={item.to}
                className="hover:text-blue-600 transition-colors truncate max-w-[150px]"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
