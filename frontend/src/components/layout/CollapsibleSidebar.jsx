import { useState, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { X, ChevronLeft, ChevronRight, User, LogOut } from 'lucide-react';
import CompanyLogo from '../CompanyLogo';
import { getSidebarNavItems } from './navConfig';
import { AuthContext } from '../../AuthContext';
import LogoutConfirmationDialog from '../ui/LogoutConfirmation';

/**
 * Collapsible Sidebar for Desktop
 * - Collapses to icon-only mode
 * - Smooth transitions without layout flicker
 * - Active route indicator
 * - Tooltips on collapsed state
 * - Persists state across route changes
 */
export default function CollapsibleSidebar({ children }) {
  const { user, logout, confirmLogout, cancelLogout, executeLogout, showLogoutConfirm, isLoggingOut } = useContext(AuthContext);
  const location = useLocation();
  
  // Load sidebar state from localStorage (per user role)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(`nara_ac_sidebar_${user?.role}_collapsed`);
      return savedState === 'true';
    }
    return false;
  });

  const role = user?.role || 'admin';
  const navItems = getSidebarNavItems(role);

  // Persist state to localStorage when changed
  useEffect(() => {
    if (user?.role) {
      localStorage.setItem(`nara_ac_sidebar_${user.role}_collapsed`, isCollapsed.toString());
    }
  }, [isCollapsed, user?.role]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const expandSidebar = () => {
    setIsCollapsed(false);
  };

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-72';
  const contentMargin = isCollapsed ? 'ml-20' : 'ml-72';

  const SidebarItem = ({ item }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path || 
                    (item.path && location.pathname.startsWith(item.path));

    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all font-bold text-sm group",
          isActive 
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
            : "text-slate-300 hover:bg-white/10 hover:text-white"
        )}
        aria-current={isActive ? "page" : undefined}
        aria-label={item.name}
        onClick={isCollapsed ? expandSidebar : undefined}
      >
        <Icon className={cn(
          "w-5 h-5 shrink-0 transition-all",
          isActive ? "text-white" : "text-slate-400"
        )} />
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="truncate"
            >
              {item.name}
            </motion.span>
          )}
        </AnimatePresence>
        
        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full ml-3 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            {item.name}
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 font-sans flex relative">
        {/* Sidebar */}
        <motion.aside
          className={cn(
            "bg-slate-900 text-white flex flex-col shadow-2xl z-20 shrink-0 relative",
            "transition-all duration-300 ease-in-out",
            sidebarWidth
          )}
          initial={false}
          animate={{ width: isCollapsed ? 80 : 288 }}
        >
          {/* Decorative element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          {/* Logo Section */}
          <div className="p-6 flex items-center justify-between border-b border-white/10 relative z-10">
            <CompanyLogo dark={true} iconSize="h-8" />
            
            {/* Collapse Toggle Button */}
            <button
              onClick={toggleSidebar}
              className={cn(
                "p-2 rounded-lg hover:bg-white/10 transition-all",
                "text-white/70 hover:text-white",
                "flex items-center justify-center"
              )}
              aria-label={isCollapsed ? "Buka sidebar" : "Tutup sidebar"}
              aria-expanded={!isCollapsed}
            >
              <AnimatePresence mode="wait">
                {isCollapsed ? (
                  <motion.div
                    key="expand"
                    initial={{ rotate: -180 }}
                    animate={{ rotate: 0 }}
                    exit={{ rotate: -180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="collapse"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 0 }}
                    exit={{ rotate: 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Navigation Items */}
          <div className="p-4 flex-1 overflow-y-auto relative z-10 custom-scrollbar">
            <div className="space-y-1.5">
              {navItems.map(item => (
                <SidebarItem key={item.path} item={item} />
              ))}
            </div>
          </div>

          {/* User Section */}
          <div className="p-4 border-t border-white/10 relative z-10 bg-slate-950/30">
            <div className="flex items-center gap-3 px-2 py-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-white/10">
                <User className="w-5 h-5 text-slate-300" />
              </div>
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="text-sm font-bold text-white truncate">{user?.nama || 'User'}</p>
                    <p className="text-xs font-medium text-slate-400 truncate">{user?.email || user?.role}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={confirmLogout}
              disabled={isLoggingOut}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-3 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-colors font-bold text-sm border border-transparent hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              aria-label="Keluar dari sistem"
              type="button"
            >
              <LogOut className="w-4 h-4" />
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    Keluar
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main 
          className={cn(
            "flex-1 overflow-x-hidden flex flex-col h-screen relative",
            "transition-all duration-300 ease-in-out",
            contentMargin
          )}
        >
          {children}
        </main>
      </div>

      {/* LOGOUT CONFIRMATION DIALOG */}
      <LogoutConfirmationDialog
        isOpen={showLogoutConfirm}
        onConfirm={executeLogout}
        onCancel={cancelLogout}
        message="Apakah Anda yakin ingin mengakhiri sesi sekarang?"
      />
    </>
  );
}
