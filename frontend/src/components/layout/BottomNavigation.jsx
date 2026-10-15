import { useState, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { getMobileNavItems, isActivePath } from './navConfig';
import { AuthContext } from '../../AuthContext';
import { X, Layers } from 'lucide-react';

/**
 * Bottom Navigation Bar for Mobile (Gold-Standard 5 Tabs)
 * - Visible ONLY on mobile (< 768px via md:hidden)
 * - Fixed at bottom of viewport
 * - Respects iOS & Android safe area insets
 * - Touch-friendly (min 44x44 pixels)
 * - 5 equal tabs with high clarity
 * - Full-fidelity Mobile Bottom Sheet for "Lainnya"
 */
export default function BottomNavigation() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [isLainnyaOpen, setIsLainnyaOpen] = useState(false);

  const role = user?.role || 'admin';
  const navItems = getMobileNavItems(role);
  const lainnyaItem = navItems.find(i => i.name === 'Lainnya');
  const lainnyaChildren = lainnyaItem?.children || [];

  // Close dropdown when route changes
  useEffect(() => {
    setIsLainnyaOpen(false);
  }, [location.pathname]);

  const handleLainnyaToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLainnyaOpen(prev => !prev);
  };

  const handleLainnyaItemClick = (path) => {
    setIsLainnyaOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* ============================================================== */}
      {/* MOBILE BOTTOM SHEET FOR "LAINNYA" (< 768px)                   */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isLainnyaOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs cursor-pointer"
              onClick={() => setIsLainnyaOpen(false)}
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className={cn(
                "absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200/90",
                "max-h-[82dvh] flex flex-col overflow-hidden",
                "pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle Indicator */}
              <div className="w-12 h-1.5 bg-slate-300/80 rounded-full mx-auto mt-3 mb-1 shrink-0" />

              {/* Sheet Header */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      Semua Menu & Fitur
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Akses cepat modul sistem NARA AC
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsLainnyaOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Tutup Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sheet Content: Clean App Grid */}
              <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {lainnyaChildren.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = isActivePath(location.pathname, child.path);

                    return (
                      <button
                        key={child.path}
                        onClick={() => handleLainnyaItemClick(child.path)}
                        className={cn(
                          "flex flex-col items-center text-center p-3 rounded-2xl transition-all cursor-pointer relative group",
                          isChildActive
                            ? "bg-blue-50/80 border-2 border-blue-500 shadow-xs"
                            : "bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/70"
                        )}
                      >
                        <div className={cn(
                          "w-11 h-11 rounded-2xl flex items-center justify-center transition-all mb-2",
                          isChildActive
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105"
                            : "bg-white text-slate-700 shadow-2xs group-hover:scale-105 group-hover:text-blue-600"
                        )}>
                          <ChildIcon className="w-5 h-5 shrink-0" />
                        </div>

                        <span className={cn(
                          "text-xs font-bold leading-tight line-clamp-2",
                          isChildActive ? "text-blue-700 font-black" : "text-slate-800"
                        )}>
                          {child.shortName || child.name}
                        </span>

                        {child.group && (
                          <span className="text-[9px] font-semibold text-slate-500 mt-0.5 truncate max-w-full">
                            {child.group}
                          </span>
                        )}

                        {isChildActive && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* BOTTOM NAVIGATION BAR - 5 EQUAL TABS (< 768px ONLY)           */}
      {/* ============================================================== */}
      <nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 md:hidden",
          "shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        )}
        style={{ paddingBottom: 'calc(0.35rem + env(safe-area-inset-bottom, 0px))' }}
        role="navigation"
        aria-label="Navigasi Utama"
      >
        <div className="max-w-md mx-auto w-full px-1 pt-1.5">
          <div className="grid grid-cols-5 items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isLainnyaChildActive = item.name === 'Lainnya' && item.children?.some(c => isActivePath(location.pathname, c.path));
              const isActive = item.name === 'Lainnya' 
                ? (isLainnyaOpen || isLainnyaChildActive)
                : isActivePath(location.pathname, item.path);

              const activeChild = isLainnyaChildActive ? item.children?.find(c => isActivePath(location.pathname, c.path)) : null;

              if (item.name === 'Lainnya') {
                return (
                  <button
                    key="Lainnya"
                    onClick={handleLainnyaToggle}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl transition-all cursor-pointer min-h-[46px] w-full",
                      isActive 
                        ? "text-blue-600 font-bold" 
                        : "text-slate-500 hover:text-slate-800 font-medium"
                    )}
                    aria-label="Lainnya"
                    aria-expanded={isLainnyaOpen}
                  >
                    <div className={cn(
                      "p-1.5 rounded-xl transition-all relative",
                      isActive ? "bg-blue-50 text-blue-600 scale-105" : "text-slate-500"
                    )}>
                      <Icon className="w-5 h-5 shrink-0" />
                      {isLainnyaChildActive && (
                        <span className="absolute 0 top-0.5 right-0.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
                      )}
                    </div>
                    <span className="text-xs leading-tight tracking-tight truncate max-w-full text-center">
                      {activeChild ? (activeChild.shortName || activeChild.name) : (item.shortName || item.name)}
                    </span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsLainnyaOpen(false)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl transition-all min-h-[46px] w-full",
                    isActive 
                      ? "text-blue-600 font-bold" 
                      : "text-slate-500 hover:text-slate-800 font-medium"
                  )}
                  aria-label={item.name}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className={cn(
                    "p-1.5 rounded-xl transition-all relative",
                    isActive ? "bg-blue-50 text-blue-600 scale-105" : "text-slate-500"
                  )}>
                    <Icon className="w-5 h-5 shrink-0" />
                  </div>
                  <span className="text-xs leading-tight tracking-tight truncate max-w-full text-center">
                    {item.shortName || item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
