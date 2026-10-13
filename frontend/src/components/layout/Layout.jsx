/**
 * Main Layout Component for NARA AC
 * Provides responsive navigation:
 * - Mobile: Fixed bottom navigation bar
 * - Desktop: Collapsible left sidebar
 * 
 * Usage:
 * <Layout role="admin|technician">
 *   <YourPageContent />
 * </Layout>
 */

import { useState, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { 
  LayoutDashboard, Calendar as CalendarIcon, User, Wrench, 
  Settings, Bell, MoreHorizontal, ChevronLeft, 
  ChevronRight, Menu, X, ClipboardList, History, Package, BarChart3, Bot
} from 'lucide-react';
import { AuthContext } from '../../AuthContext';
import CompanyLogo from '../CompanyLogo';

// Navigation configuration
const getNavConfig = (role) => {
  const adminNav = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, priority: 'primary' },
    { name: 'Booking', path: '/admin/bookings', icon: CalendarIcon, priority: 'primary' },
    { name: 'Jadwal', path: '/admin/schedule', icon: CalendarIcon, priority: 'primary' },
    { name: 'Pelanggan', path: '/admin/customers', icon: User, priority: 'secondary' },
    { name: 'Teknisi', path: '/admin/technicians', icon: Wrench, priority: 'secondary' },
    { name: 'Inventory', path: '/admin/inventory', icon: Package, priority: 'secondary' },
    { name: 'Reports', path: '/admin/reports', icon: BarChart3, priority: 'secondary' },
    { name: 'AI Analytics', path: '/admin/analytics', icon: Bot, priority: 'secondary' },
    { name: 'Notifikasi', path: '/admin/notifications', icon: Bell, priority: 'secondary' },
  ];

  const technicianNav = [
    { name: 'Dashboard', path: '/technician/dashboard', icon: LayoutDashboard, priority: 'primary' },
    { name: 'Tugas', path: '/technician/jobs', icon: ClipboardList, priority: 'primary' },
    { name: 'Jadwal', path: '/technician/schedule', icon: CalendarIcon, priority: 'primary' },
    { name: 'Riwayat', path: '/technician/history', icon: History, priority: 'secondary' },
    { name: 'Profil', path: '/technician/profile', icon: Settings, priority: 'secondary' },
  ];

  return role === 'admin' ? adminNav : technicianNav;
};

/**
 * Bottom Navigation Component for Mobile
 */
function BottomNavigation({ role, currentPath }) {
  const navItems = getNavConfig(role);
  const primaryItems = navItems.filter(i => i.priority === 'primary');
  const secondaryItems = navItems.filter(i => i.priority === 'secondary');
  const [isLainnyaOpen, setIsLainnyaOpen] = useState(false);
  
  const safeAreaPadding = 'env(safe-area-inset-bottom)';

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: safeAreaPadding }}
      >
        <div className="max-w-md mx-auto w-full">
          <div className="grid grid-cols-5 items-center py-1.5 px-1">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/') || 
                             (item.path === '/admin' && (currentPath === '/admin' || currentPath === '/admin/'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl transition-all min-h-[46px]",
                    isActive ? "text-blue-600 bg-blue-50 font-bold" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 font-medium"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-[10px] tracking-tight truncate max-w-full text-center leading-tight">
                    {item.shortName || item.name}
                  </span>
                </Link>
              );
            })}
            {secondaryItems.length > 0 && (
              <button
                onClick={() => setIsLainnyaOpen(!isLainnyaOpen)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl transition-all min-h-[46px] cursor-pointer",
                  isLainnyaOpen ? "text-blue-600 bg-blue-50 font-bold" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 font-medium"
                )}
              >
                <MoreHorizontal className="w-5 h-5 shrink-0" />
                <span className="text-[10px] tracking-tight truncate max-w-full text-center leading-tight">
                  Lainnya
                </span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isLainnyaOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn("fixed bottom-[73px] left-1/2 -translate-x-1/2 z-50 bg-white shadow-2xl border border-gray-200 rounded-2xl py-3 min-w-[200px] max-w-[300px] w-[90vw]")}
            style={{ marginBottom: safeAreaPadding }}
          >
            <div className="overflow-y-auto max-h-[70vh]">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsLainnyaOpen(false)}
                    className={cn("w-full flex items-center gap-4 px-5 py-3 transition-all text-left hover:bg-gray-50", 
                              isActive ? "text-blue-600 bg-blue-50/50" : "text-gray-700")}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="font-medium text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Sidebar Component for Desktop
 */
function Sidebar({ role, currentPath, isCollapsed, onToggle, user, onLogout }) {
  const navItems = getNavConfig(role);

  return (
    <motion.aside
      className={cn(
        "bg-slate-900 text-white flex flex-col shadow-2xl z-20 shrink-0 relative",
        isCollapsed ? "w-20" : "w-72"
      )}
      initial={false}
      animate={{ width: isCollapsed ? 80 : 288 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      
      <div className="p-6 flex items-center justify-between border-b border-white/10 relative z-10">
        <CompanyLogo dark={true} iconSize="h-8" />
        <button
          onClick={onToggle}
          className={cn("p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white")}
          aria-label={isCollapsed ? "Buka sidebar" : "Tutup sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="space-y-1.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/') ||
                           (item.path === '/admin' && (currentPath === '/admin' || currentPath === '/admin/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all font-bold text-sm group",
                  isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                {!isCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-white/10 relative z-10 bg-slate-950/30">
        <div className="flex items-center gap-3 px-2 py-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-white/10">
            <User className="w-5 h-5 text-slate-300" />
          </div>
          {!isCollapsed && (
            <div>
              <p className="text-sm font-bold text-white truncate">{user?.nama || 'User'}</p>
              <p className="text-xs font-medium text-slate-400 truncate">{user?.email || user?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-colors font-bold text-sm"
        >
          <X className="w-4 h-4" />
          {!isCollapsed && 'Keluar'}
        </button>
      </div>
    </motion.aside>
  );
}

/**
 * Main Layout Component
 */
export default function Layout({ children, role = 'admin' }) {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check screen size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  // Load sidebar state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role) {
      const savedState = localStorage.getItem(`nara_ac_sidebar_${user.role}_collapsed`);
      if (savedState !== null) {
        setIsSidebarCollapsed(savedState === 'true');
      }
    }
  }, [user?.role]);

  // Save sidebar state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.role) {
      localStorage.setItem(`nara_ac_sidebar_${user.role}_collapsed`, isSidebarCollapsed.toString());
    }
  }, [isSidebarCollapsed, user?.role]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const actualRole = role || user?.role || 'admin';

  // Get page title from route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/') return 'Dashboard Overview';
    if (path.startsWith('/admin/')) {
      const segment = path.split('/').pop();
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
    if (path === '/technician/dashboard') return 'Dashboard';
    if (path.startsWith('/technician/')) {
      const segment = path.split('/').pop();
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
    return 'NARA AC';
  };

  if (!user) return null;

  // Mobile Layout
  if (isMobile) {
    const menuItems = getNavConfig(actualRole);

    return (
      <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
        {/* Mobile Header */}
        <header className="bg-white/80 backdrop-blur-md px-4 py-4 border-b border-gray-100 flex justify-between items-center shadow-sm z-20 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-6 h-6" />
            </button>
            <CompanyLogo dark={false} iconSize="h-8" />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-500 hover:text-red-600"
              aria-label="Keluar sistem"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Hamburger Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 bg-white/95 backdrop-blur-lg flex flex-col"
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <CompanyLogo dark={false} iconSize="h-8" />
                <button
                  onClick={closeMobileMenu}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                  aria-label="Tutup menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path || 
                                    (item.path && location.pathname.startsWith(item.path));
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={closeMobileMenu}
                        className={cn(
                          "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-base",
                          isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <Icon className={cn("w-6 h-6", isActive ? "text-white" : "text-gray-500")} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-600 font-bold text-lg">{(user.nama || 'U').charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{user.nama || 'User'}</p>
                    <p className="text-xs text-gray-500">{user.email || user.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => { logout(); closeMobileMenu(); }}
                  className="w-full text-red-500 bg-red-50 hover:bg-red-100 rounded-2xl transition-colors font-bold text-sm py-3.5"
                >
                  Keluar Sistem
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content with padding for bottom nav */}
        <main className="flex-1 flex flex-col relative pb-[73px]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {children}
        </main>

        {/* Bottom Navigation */}
        <BottomNavigation role={actualRole} currentPath={location.pathname} />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex">
      <Sidebar
        role={actualRole}
        currentPath={location.pathname}
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        user={user}
        onLogout={logout}
      />

      <main className={cn(
        "flex-1 overflow-x-hidden flex flex-col min-h-screen",
        isSidebarCollapsed ? "ml-20" : "ml-72"
      )}>
        <header className="bg-white/80 backdrop-blur-md px-8 py-5 border-b border-gray-100 flex justify-between items-center shadow-sm z-10 sticky top-0 h-[80px]">
          <h1 className="text-2xl font-black text-gray-900 capitalize tracking-tight">
            {getPageTitle()}
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer">
              <Bell className="w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors" />
              <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long' })}
              </p>
              <p className="text-sm font-black text-gray-900">
                {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </header>
        
        {children}
      </main>
    </div>
  );
}
