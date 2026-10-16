import { useContext, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthContext } from '../../AuthContext';
import { LogOut, Loader2, LayoutDashboard, Wrench, History, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import CompanyLogo from '../../components/CompanyLogo';
import { Button } from '../../components/ui/button';
import Breadcrumb from '../../components/ui/Breadcrumb';
import CustomerDashboard from './CustomerDashboard';
import CustomerAcUnits from './CustomerAcUnits';
import CustomerHistory from './CustomerHistory';
import CustomerProfile from './CustomerProfile';
import LogoutConfirmationDialog from '../../components/ui/LogoutConfirmation';

export default function CustomerPortal() {
  const { user, loading: authLoading, confirmLogout, cancelLogout, executeLogout, showLogoutConfirm, isLoggingOut } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle auth-logout event to redirect
  useEffect(() => {
    const handleLogout = () => {
      navigate('/login');
    };
    window.addEventListener('auth-logout', handleLogout);
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, [navigate]);

  if (authLoading) return null;

  if (!user || user.role !== 'customer') {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/customer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/customer/ac-units', label: 'Unit AC Saya', icon: Wrench },
    { path: '/customer/history', label: 'Riwayat Servis', icon: History },
    { path: '/customer/settings', label: 'Pengaturan', icon: Settings },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  // Breadcrumb items for customer pages
  const getCustomerBreadcrumbItems = () => {
    const path = location.pathname;
    if (path === '/customer/dashboard' || path === '/customer') {
      return [{ label: 'Beranda', to: '/customer/dashboard' }];
    }
    if (path.startsWith('/customer/ac-units')) {
      return [
        { label: 'Beranda', to: '/customer/dashboard' },
        { label: 'Unit AC Saya', to: '/customer/ac-units' }
      ];
    }
    if (path.startsWith('/customer/history')) {
      return [
        { label: 'Beranda', to: '/customer/dashboard' },
        { label: 'Riwayat Servis', to: '/customer/history' }
      ];
    }
    if (path.startsWith('/customer/settings') || path.startsWith('/customer/profile')) {
      return [
        { label: 'Beranda', to: '/customer/dashboard' },
        { label: 'Pengaturan Akun & Profil', to: '/customer/settings' }
      ];
    }
    return [{ label: 'Beranda', to: '/customer/dashboard' }];
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 selection:bg-blue-600 selection:text-white">
        {/* ============================================================== */}
        {/* SKIP TO MAIN CONTENT - Aksesibilitas                             */}
        {/* ============================================================== */}
        <a href="#main-content" className="sr-only focus:not-sr-only absolute top-0 left-0 z-50 p-4 bg-blue-600 text-white font-bold rounded-br-xl text-sm hover:bg-blue-700 transition-colors">
          Lewati ke Konten Utama
        </a>
        
        {/* ============================================================== */}
        {/* NAVBAR — Glassmorphism, konsisten dengan halaman publik          */}
        {/* ============================================================== */}
        <nav className="bg-white/90 backdrop-blur-md border-b border-sky-100/80 sticky top-0 z-40 transition-all animate-in slide-in-from-top-4 duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 sm:h-[72px]">
              {/* Brand */}
              <div className="flex items-center gap-6">
                <Link to="/customer/dashboard" className="flex items-center hover:opacity-90 transition-opacity">
                  <CompanyLogo iconSize="h-7 sm:h-8" />
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex md:items-center md:gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                          active
                            ? "text-blue-700 bg-blue-50 border border-blue-200 shadow-2xs"
                            : "text-slate-600 hover:text-blue-600 hover:bg-sky-50"
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className={cn("w-4 h-4", active ? "text-blue-600" : "text-slate-500")} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-3">
                <Link
                  to="/customer/settings"
                  className="hidden sm:flex items-center gap-2.5 p-1.5 pr-2.5 rounded-2xl hover:bg-slate-100/80 transition-colors group cursor-pointer"
                  title="Buka Pengaturan Akun & Profil"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs group-hover:scale-105 transition-transform">
                    {(user?.nama || user?.name || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{user?.nama || user?.name || 'Pelanggan'}</p>
                    <p className="text-xs text-slate-500 font-medium">Pengaturan Akun</p>
                  </div>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={confirmLogout}
                  disabled={isLoggingOut}
                  className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50 transition-colors"
                >
                  {isLoggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Keluar</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Nav Tabs */}
          <div className="md:hidden border-t border-sky-100/60 bg-white/80">
            <div className="max-w-7xl mx-auto px-2">
              <div className="grid grid-cols-4 gap-1 py-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl transition-all min-h-[46px]",
                        active
                          ? "text-blue-700 font-bold"
                          : "text-slate-500 hover:text-slate-800 font-medium"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <div className={cn(
                        "p-1.5 rounded-xl transition-all",
                        active ? "bg-blue-50 text-blue-600" : "text-slate-500"
                      )}>
                        <Icon className="w-5 h-5 shrink-0" />
                      </div>
                      <span className="text-xs leading-tight tracking-tight truncate max-w-full text-center">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        {/* ============================================================== */}
        {/* MAIN CONTENT                                                    */}
        {/* ============================================================== */}
        <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Breadcrumb Navigation */}
              <Breadcrumb items={getCustomerBreadcrumbItems()} />
              <Routes>
                <Route index element={<Navigate to="/customer/dashboard" replace />} />
                <Route path="dashboard" element={<CustomerDashboard />} />
                <Route path="ac-units" element={<CustomerAcUnits />} />
                <Route path="history" element={<CustomerHistory />} />
                <Route path="settings" element={<CustomerProfile />} />
                <Route path="profile" element={<Navigate to="/customer/settings" replace />} />
                <Route path="*" element={<Navigate to="/customer/dashboard" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ============================================================== */}
        {/* FOOTER                                                          */}
        {/* ============================================================== */}
        <footer className="bg-white border-t border-slate-200/80 py-5 text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <p className="font-medium text-slate-600">&copy; {new Date().getFullYear()} CV. Nara Teknindotama. Seluruh hak cipta dilindungi.</p>
            <div className="flex items-center gap-3 font-medium">
              <Link to="/terms" className="hover:text-blue-600 transition-colors">
                Syarat &amp; Ketentuan
              </Link>
              <span className="text-slate-300">&bull;</span>
              <Link to="/privacy" className="hover:text-blue-600 transition-colors">
                Kebijakan Privasi
              </Link>
            </div>
          </div>
        </footer>
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
