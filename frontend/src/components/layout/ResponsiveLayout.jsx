import { useState, useContext } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn, useMediaQuery } from '../../lib/utils';
import { Bell, X, Menu } from 'lucide-react';
import { AuthContext } from '../../AuthContext';
import BottomNavigation from './BottomNavigation';
import CollapsibleSidebar from './CollapsibleSidebar';
import CompanyLogo from '../CompanyLogo';
import { getMobileNavItems, getSidebarNavItems } from './navConfig';

/**
 * Responsive Layout Component
 * - Mobile: Fixed bottom navigation bar
 * - Desktop: Collapsible left sidebar
 * - Handles responsive breakpoints (md: 768px)
 * - Preserves RBAC and existing routing
 */

// Custom hook to get user's navigation items
const useNavItems = (role) => {
  const mobileItems = getMobileNavItems(role);
  const sidebarItems = getSidebarNavItems(role);
  return { mobileItems, sidebarItems };
};

export default function ResponsiveLayout({ children, title }) {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  
  // Check if mobile
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  // Desktop sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const role = user?.role || 'admin';
  const { sidebarItems } = useNavItems(role);

  // Safe area insets for mobile
  const safeAreaPadding = 'env(safe-area-inset-bottom)';

  // Get page title from route
  const getPageTitle = () => {
    if (title) return title;
    
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

  // Toggle desktop sidebar
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  if (!user) return null;

  // Mobile Layout
  if (isMobile) {
    // Use the same user and logout from parent scope
    const mobileUser = user;
    const mobileLogout = logout;
    
    return (
      <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
        {/* Mobile Header - NO HAMBURGER MENU */}
        <header 
          className={cn(
            "bg-white/80 backdrop-blur-md px-4 py-4 border-b border-gray-100",
            "flex justify-between items-center shadow-sm z-20 sticky top-0"
          )}
        >
          <div className="flex items-center gap-3">
            <CompanyLogo dark={false} iconSize="h-8" />
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long' })}
              </p>
              <p className="text-sm font-black text-gray-900">
                {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={mobileLogout}
              className={cn(
                "p-2 rounded-lg hover:bg-red-50 transition-colors",
                "text-red-500 hover:text-red-600"
              )}
              aria-label="Keluar sistem"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content with padding for bottom nav */}
        <main className="flex-1 flex flex-col h-screen relative pb-[73px]" style={{ paddingBottom: safeAreaPadding }}>
          {children}
        </main>

        {/* Bottom Navigation */}
        <BottomNavigation />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex relative">
      {/* Desktop Header */}
      <header 
        className={cn(
          "bg-white/80 backdrop-blur-md px-8 py-5 border-b border-gray-100",
          "flex justify-between items-center shadow-sm z-20 sticky top-0 h-[80px]",
          isSidebarCollapsed ? 'ml-20' : 'ml-72'
        )}
        style={{ transition: 'margin-left 0.3s ease-in-out' }}
      >
        <div className="flex items-center gap-4">
          {/* Hamburger button for desktop sidebar */}
          <button
            onClick={toggleSidebar}
            className={cn(
              "p-2 rounded-lg hover:bg-gray-100 transition-colors",
              "text-gray-600 hover:text-gray-900 lg:hidden"
            )}
            aria-label={isSidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
            aria-expanded={!isSidebarCollapsed}
          >
            {isSidebarCollapsed ? <Menu className="w-6 h-6" /> : <X className="w-6 h-6" />}
          </button>
          
          <h1 className="text-2xl font-black text-gray-900 capitalize tracking-tight">
            {getPageTitle()}
          </h1>
        </div>

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

      {/* Desktop Layout with Sidebar */}
      <CollapsibleSidebar>
        {children}
      </CollapsibleSidebar>
    </div>
  );
}
