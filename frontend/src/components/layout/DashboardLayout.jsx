import { useState, useEffect, useContext, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Menu, Bell, LogOut, Settings, History, ChevronLeft } from 'lucide-react';
import { AuthContext } from '../../AuthContext';
import CompanyLogo from '../CompanyLogo';
import BottomNavigation from './BottomNavigation';
import LogoutConfirmationDialog from '../ui/LogoutConfirmation';
import ScrollToTopButton from '../ui/ScrollToTopButton';
import Breadcrumb from '../ui/Breadcrumb';
import { getSidebarNavItems, isActivePath, getBreadcrumbItems } from './navConfig';

/**
 * Unified Responsive Dashboard Layout for NARA AC
 * Enforces:
 * 1. Mobile (< 768px):
 *    - Bottom Navigation ONLY
 *    - NO desktop sidebar
 *    - Header locked at top (never scrolls away)
 *    - Independent smooth scrolling content
 * 2. Desktop (>= 768px):
 *    - Prominent Hamburger Menu in header to collapse/expand sidebar
 *    - Header locked at top (never scrolls away)
 *    - Collapsible left sidebar with icon-only tooltips
 *    - Independent smooth scrolling content
 */
export default function DashboardLayout({ children, role, title, onOpenNotif, unreadCount = 0 }) {
  const { user, logout, confirmLogout, cancelLogout, executeLogout, showLogoutConfirm, isLoggingOut } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef(null);

  const currentRole = role || user?.role || 'admin';
  const sidebarNavItems = getSidebarNavItems(currentRole);

  // Mobile profile dropdown state
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);

  // Desktop sidebar collapsed state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && currentRole) {
      const saved = localStorage.getItem(`nara_ac_sidebar_${currentRole}_collapsed`);
      return saved === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && currentRole) {
      localStorage.setItem(`nara_ac_sidebar_${currentRole}_collapsed`, isSidebarCollapsed.toString());
    }
  }, [isSidebarCollapsed, currentRole]);

  // Reset scroll to top and close mobile profile when changing route
  useEffect(() => {
    setIsMobileProfileOpen(false);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // Handle auth-logout event to redirect
  useEffect(() => {
    const handleLogout = () => {
      navigate('/login');
    };
    window.addEventListener('auth-logout', handleLogout);
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, [navigate]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  // Compute Indonesian page title from path if title prop is omitted
  const getComputedTitle = () => {
    if (title) return title;
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/') return 'Dashboard Overview';
    if (path.startsWith('/admin/bookings')) return 'Daftar Booking';
    if (path.startsWith('/admin/schedule')) return 'Jadwal Service & Dispatch';
    if (path.startsWith('/admin/customers')) return 'Kelola Pelanggan';
    if (path.startsWith('/admin/ac-units')) return 'Database Unit AC Pelanggan';
    if (path.startsWith('/admin/technicians')) return 'Manajemen Teknisi Lapangan';
    if (path.startsWith('/admin/invoices')) return 'E-Invoice & Kas Pembayaran';
    if (path.startsWith('/admin/claims')) return 'Manajemen Klaim Garansi';
    if (path.startsWith('/admin/services')) return 'Katalog Layanan & Tarif Resmi';
    if (path.startsWith('/admin/feedback')) return 'Feedback & Ulasan Konsumen';
    if (path.startsWith('/admin/inventory')) return 'Inventaris Sparepart & Freon';
    if (path.startsWith('/admin/reports')) return 'Log Aktivitas Sistem';
    if (path.startsWith('/admin/analytics')) return 'AI & Analitik Operasional';
    if (path.startsWith('/admin/settings') || path.startsWith('/admin/profile')) return 'Pengaturan & Profil Akun';
    if (path.startsWith('/admin/notifications')) return 'Pusat Notifikasi Sistem';
    if (path === '/technician/dashboard' || path === '/technician/dashboard/' || path === '/technician') return 'Dashboard Teknisi';
    if (path.startsWith('/technician/jobs')) return 'Tugas Pekerjaan';
    if (path.startsWith('/technician/schedule')) return 'Jadwal Teknisi';
    if (path.startsWith('/technician/history')) return 'Riwayat Pekerjaan';
    if (path.startsWith('/technician/profile')) return 'Profil Teknisi';
    return 'NARA AC Dashboard';
  };

  const displayTitle = getComputedTitle();

  let lastGroup = null;

  return (
    <>
      {/* ============================================================== */}
      {/* SKIP TO MAIN CONTENT - Aksesibilitas                             */}
      {/* ============================================================== */}
      <a href="#main-content" className="sr-only focus:not-sr-only absolute top-0 left-0 z-50 p-4 bg-blue-600 text-white font-bold rounded-br-xl text-sm hover:bg-blue-700 transition-colors">
        Lewati ke Konten Utama
      </a>
      
      <div className="h-screen h-[100dvh] w-full bg-slate-50/60 font-sans flex text-slate-800 selection:bg-blue-100 selection:text-blue-900">
        {/* ============================================================== */}
        {/* DESKTOP SIDEBAR (>= 768px ONLY) - CONSISTENT LIGHT THEME       */}
        {/* ============================================================== */}
        <aside
          className={cn(
            "hidden md:flex flex-col shrink-0 h-full z-30 bg-white text-slate-800 shadow-md shadow-slate-200/40 border-r border-slate-200/80 relative transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[width]",
            isSidebarCollapsed ? "w-20" : "w-72"
          )}
        >
          {/* Subtle Ambient Breeze Glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-blue-100 rounded-full blur-[70px] opacity-40 pointer-events-none"></div>

          {/* Floating Border Toggle Pill Button (Glides with sidebar edge) */}
          <button
            onClick={toggleSidebar}
            className="absolute -right-3.5 top-5.5 z-40 w-7 h-7 rounded-full bg-white border border-slate-200/90 shadow-md hover:shadow-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 flex items-center justify-center transition-all duration-200 cursor-pointer group"
            title={isSidebarCollapsed ? "Perluas Sidebar" : "Perkecil Sidebar"}
            aria-label={isSidebarCollapsed ? "Perluas Sidebar" : "Perkecil Sidebar"}
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300 text-slate-600 group-hover:text-blue-600", isSidebarCollapsed && "rotate-180")} />
          </button>

          {/* Sidebar Brand Header */}
          <div className={cn(
            "h-18 lg:h-20 flex items-center border-b border-slate-100 relative z-10 shrink-0 transition-all duration-300",
            isSidebarCollapsed ? "justify-center px-2" : "px-5"
          )}>
            <Link 
              to={currentRole === 'admin' ? '/admin' : '/technician'}
              className="flex items-center group transition-transform hover:opacity-95 min-w-0 overflow-hidden"
              title="NARA AC • Sistem Layanan Service AC"
            >
              <CompanyLogo 
                dark={false} 
                iconSize="h-8" 
                iconOnly={false}
                collapsed={isSidebarCollapsed}
              />
            </Link>
          </div>

          {/* Navigation Items with Clean Grouping */}
          <div className="p-3 flex-1 overflow-y-auto overflow-x-hidden space-y-1 relative z-10 custom-scrollbar">
            {sidebarNavItems.map(item => {
              const Icon = item.icon;
              const active = isActivePath(location.pathname, item.path);
              const showGroupHeader = item.group && item.group !== lastGroup;
              if (item.group) lastGroup = item.group;

              return (
                <div key={item.path}>
                  {showGroupHeader && (
                    <div className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap",
                      isSidebarCollapsed ? "max-h-0 opacity-0 py-0" : "max-h-8 opacity-100 pt-3 pb-1"
                    )}>
                      <div className="text-xs font-black uppercase tracking-wider text-slate-400 px-3 truncate">
                        {item.group}
                      </div>
                    </div>
                  )}
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center rounded-2xl transition-all duration-200 font-bold text-xs sm:text-sm relative group",
                      isSidebarCollapsed ? "justify-center px-0 py-2.5" : "px-3.5 py-2.5 gap-3",
                      active
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-black"
                        : "text-slate-600 hover:bg-sky-50/80 hover:text-blue-600"
                    )}
                    aria-current={active ? "page" : undefined}
                    title={isSidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className={cn("w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-105", active ? "text-white" : "text-slate-500 group-hover:text-blue-600")} />
                    
                    <span className={cn(
                      "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out flex-1 flex items-center justify-between text-left",
                      isSidebarCollapsed ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[200px] opacity-100"
                    )}>
                      <span className="truncate">{item.name}</span>
                      {item.path === '/admin/notifications' && unreadCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-full bg-rose-600 text-white shrink-0">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </span>

                    {/* Collapsed dot badge for notifications */}
                    {isSidebarCollapsed && item.path === '/admin/notifications' && unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white" />
                    )}

                    {/* Floating Tooltip when collapsed */}
                    {isSidebarCollapsed && (
                      <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 border border-slate-800">
                        {item.name} {item.path === '/admin/notifications' && unreadCount > 0 ? `(${unreadCount})` : ''}
                      </div>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* User Card & Logout */}
          <div className="p-3 border-t border-slate-100 relative z-10 bg-slate-50/80 shrink-0">
            <div className={cn(
              "flex items-center rounded-2xl bg-white border border-slate-200/70 shadow-2xs transition-all duration-300",
              isSidebarCollapsed ? "flex-col p-2 gap-2" : "flex-row p-1.5 justify-between gap-2"
            )}>
              <Link
                to={currentRole === 'admin' ? '/admin/settings' : '/technician/profile'}
                className={cn(
                  "flex items-center rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer overflow-hidden",
                  isSidebarCollapsed ? "justify-center p-1 w-full" : "gap-2.5 min-w-0 flex-1 p-1"
                )}
                title="Buka Pengaturan & Profil"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/60 font-bold text-sm">
                  {(user?.nama || 'U').charAt(0).toUpperCase()}
                </div>
                <div className={cn(
                  "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
                  isSidebarCollapsed ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[140px] opacity-100 flex-1 min-w-0"
                )}>
                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    {user?.nama || (currentRole === 'admin' ? 'Admin Utama' : 'Teknisi')}
                  </p>
                  <p className="text-xs font-medium text-slate-500 truncate">
                    {user?.email || 'admin@nara-ac.local'}
                  </p>
                </div>
              </Link>

              <button
                onClick={confirmLogout}
                disabled={isLoggingOut}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-200/80 transition-colors shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs",
                  isSidebarCollapsed && "w-8 h-8"
                )}
                title="Keluar dari sistem"
                aria-label="Keluar dari sistem"
                type="button"
              >
                <LogOut className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        </aside>

        {/* ============================================================== */}
        {/* MAIN CONTAINER (DESKTOP & MOBILE)                             */}
        {/* ============================================================== */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
          {/* ------------------------------------------------------------ */}
          {/* DESKTOP HEADER (>= 768px) - LOCKED AT TOP                    */}
          {/* ------------------------------------------------------------ */}
          <header className="hidden md:flex shrink-0 z-20 h-18 lg:h-20 bg-white/95 backdrop-blur-md px-6 sm:px-8 justify-between items-center border-b border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Judul Halaman Aktif (Diperbesar) & Jejak Breadcrumb di Bawahnya */}
              <div className="min-w-0 flex flex-col justify-center">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate leading-tight">
                  {displayTitle}
                </h1>
                <div className="mt-1">
                  <Breadcrumb items={getBreadcrumbItems(location.pathname, currentRole)} currentRole={currentRole} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {/* Notifications (for Admin) */}
              {currentRole === 'admin' && onOpenNotif && (
                <button
                  onClick={onOpenNotif}
                  className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200 shadow-2xs group"
                  aria-label={unreadCount > 0 ? `Pusat Notifikasi (${unreadCount} belum dibaca)` : "Pusat Notifikasi"}
                  title={unreadCount > 0 ? `Pusat Notifikasi (${unreadCount} belum dibaca)` : "Pusat Notifikasi"}
                >
                  <Bell className="w-4.5 h-4.5 transition-transform group-hover:scale-105" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black rounded-full h-4.5 min-w-[18px] px-1 flex items-center justify-center border-2 border-white shadow-xs">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              )}

              {currentRole === 'admin' && onOpenNotif && (
                <div className="h-6 w-px bg-slate-200 hidden lg:block"></div>
              )}

              {/* Date Display */}
              <div className="text-right hidden lg:block">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long' })}
                </p>
                <p className="text-xs font-black text-slate-800">
                  {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </header>

          {/* ------------------------------------------------------------ */}
          {/* MOBILE HEADER (< 768px) - LOCKED AT TOP                      */}
          {/* Rule 1.A: NO HAMBURGER MENU ON MOBILE. Clean & minimal header*/}
          {/* ------------------------------------------------------------ */}
          <header className="flex md:hidden shrink-0 z-20 h-16 bg-white/95 backdrop-blur-md px-4 justify-between items-center border-b border-slate-100 shadow-xs relative">
            <div className="flex items-center gap-2.5">
              <CompanyLogo dark={false} iconSize="h-7" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-900 leading-tight">NARA AC</span>
                <span className="text-xs font-semibold text-slate-500">
                  {currentRole === 'admin' ? 'Sistem Manajemen' : 'Aplikasi Teknisi'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentRole === 'admin' && onOpenNotif && (
                <button
                  onClick={onOpenNotif}
                  className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors relative cursor-pointer"
                  aria-label={unreadCount > 0 ? `Notifikasi (${unreadCount} belum dibaca)` : "Notifikasi"}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border-2 border-white shadow-xs">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              )}

              {/* Profile Avatar Button on Mobile */}
              <button
                onClick={() => setIsMobileProfileOpen(prev => !prev)}
                className="flex items-center p-0.5 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/80 active:scale-95"
                aria-label="Profil Pengguna"
                aria-expanded={isMobileProfileOpen}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  {(user?.nama || (currentRole === 'admin' ? 'A' : 'T')).charAt(0).toUpperCase()}
                </div>
              </button>
            </div>
          </header>

          {/* ------------------------------------------------------------ */}
          {/* SCROLLABLE PAGE CONTENT                                      */}
          {/* Content scrolls independently; header remains fixed at top.  */}
          {/* ------------------------------------------------------------ */}
          <main
            id="main-content"
            ref={mainRef}
            className="flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden relative custom-scrollbar flex flex-col"
          >
            <div
              className="flex-1 w-full min-w-0 pb-24 md:pb-8"
              style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {children}
            </div>
          </main>

          {/* ------------------------------------------------------------ */}
          {/* MOBILE BOTTOM NAVIGATION BAR                                 */}
          {/* Rendered ONLY on mobile (< 768px via md:hidden inside)       */}
          {/* ------------------------------------------------------------ */}
          <BottomNavigation />
        </div>
      </div>

      {/* MOBILE PROFILE POPUP MENU */}
      {isMobileProfileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileProfileOpen(false)}
          />

          {/* Profile Dropdown Container */}
          <div 
            className="absolute top-16 right-3 w-[calc(100vw-1.5rem)] max-w-[280px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Profile User Info Header */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                {(user?.nama || (currentRole === 'admin' ? 'A' : 'T')).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-slate-900 text-xs truncate">
                  {user?.nama || (currentRole === 'admin' ? 'Admin Utama' : 'Teknisi Lapangan')}
                </h4>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {user?.email || (currentRole === 'admin' ? 'admin@nara-ac.local' : 'teknisi@nara-ac.local')}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                  {currentRole === 'admin' ? 'Admin Sistem' : 'Teknisi'}
                </span>
              </div>
            </div>

            {/* Menu Links */}
            <div className="p-2 space-y-1">
              <Link
                to={currentRole === 'admin' ? '/admin/settings' : '/technician/profile'}
                onClick={() => setIsMobileProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-semibold text-xs transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Pengaturan & Profil</span>
              </Link>

              {currentRole === 'admin' && (
                <Link
                  to="/admin/reports"
                  onClick={() => setIsMobileProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-semibold text-xs transition-colors"
                >
                  <History className="w-4 h-4 text-slate-500" />
                  <span>Log Aktivitas</span>
                </Link>
              )}
            </div>

            {/* Logout Action */}
            <div className="p-2 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setIsMobileProfileOpen(false);
                  confirmLogout();
                }}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION DIALOG */}
      <LogoutConfirmationDialog
        isOpen={showLogoutConfirm}
        onConfirm={executeLogout}
        onCancel={cancelLogout}
        message="Apakah Anda yakin ingin mengakhiri sesi sekarang?"
      />
      
      {/* Tombol Kembali ke Atas */}
      <ScrollToTopButton />
    </>
  );
}
