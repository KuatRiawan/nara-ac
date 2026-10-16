/**
 * Navigation Configuration for NARA AC
 * Defines menu items for Admin and Technician roles
 * Used by both BottomNavigation (mobile) and Sidebar (desktop)
 */

import { LayoutDashboard, Calendar as CalendarIcon, CalendarCheck, User, Users, Wrench, Settings, MoreHorizontal, ClipboardList, History, Package, Bot, AirVent, Receipt, Star, Tag, ShieldCheck } from 'lucide-react';

// Admin Navigation Items
export const adminNavItems = [
  {
    name: 'Dashboard',
    shortName: 'Beranda',
    path: '/admin',
    icon: LayoutDashboard,
    priority: 'primary',
    group: 'Utama'
  },
  {
    name: 'Booking',
    shortName: 'Booking',
    path: '/admin/bookings',
    icon: CalendarCheck,
    priority: 'primary',
    group: 'Utama'
  },
  {
    name: 'Jadwal Servis',
    shortName: 'Jadwal',
    path: '/admin/schedule',
    icon: CalendarIcon,
    priority: 'primary',
    group: 'Utama'
  },
  {
    name: 'Pelanggan',
    shortName: 'Pelanggan',
    path: '/admin/customers',
    icon: Users,
    priority: 'primary',
    group: 'Data & Aset'
  },
  {
    name: 'Unit AC Pelanggan',
    shortName: 'Unit AC',
    path: '/admin/ac-units',
    icon: AirVent,
    priority: 'secondary',
    group: 'Data & Aset'
  },
  {
    name: 'Teknisi Lapangan',
    shortName: 'Teknisi',
    path: '/admin/technicians',
    icon: Wrench,
    priority: 'secondary',
    group: 'Data & Aset'
  },
  {
    name: 'E-Invoice & Bayar',
    shortName: 'E-Invoice',
    path: '/admin/invoices',
    icon: Receipt,
    priority: 'secondary',
    group: 'Keuangan & Layanan'
  },
  {
    name: 'Klaim Garansi',
    shortName: 'Garansi',
    path: '/admin/claims',
    icon: ShieldCheck,
    priority: 'secondary',
    group: 'Keuangan & Layanan'
  },
  {
    name: 'Katalog Layanan',
    shortName: 'Katalog',
    path: '/admin/services',
    icon: Tag,
    priority: 'secondary',
    group: 'Keuangan & Layanan'
  },
  {
    name: 'Feedback & Ulasan',
    shortName: 'Ulasan',
    path: '/admin/feedback',
    icon: Star,
    priority: 'secondary',
    group: 'Keuangan & Layanan'
  },
  {
    name: 'Inventory Sparepart',
    shortName: 'Inventory',
    path: '/admin/inventory',
    icon: Package,
    priority: 'secondary',
    group: 'Logistik'
  },
  {
    name: 'Log Aktivitas',
    shortName: 'Aktivitas',
    path: '/admin/reports',
    icon: History,
    priority: 'secondary',
    group: 'Analitik'
  },
  {
    name: 'AI Analitik',
    shortName: 'AI Analitik',
    path: '/admin/analytics',
    icon: Bot,
    priority: 'secondary',
    group: 'Analitik'
  },
  {
    name: 'Pengaturan & Profil',
    shortName: 'Pengaturan',
    path: '/admin/settings',
    icon: Settings,
    priority: 'secondary',
    group: 'Sistem'
  }
];

// Technician Navigation Items - All 5 primary items directly on mobile bottom bar
export const technicianNavItems = [
  {
    name: 'Dashboard',
    shortName: 'Beranda',
    path: '/technician/dashboard',
    icon: LayoutDashboard,
    priority: 'primary'
  },
  {
    name: 'Tugas',
    shortName: 'Tugas',
    path: '/technician/jobs',
    icon: ClipboardList,
    priority: 'primary'
  },
  {
    name: 'Jadwal',
    shortName: 'Jadwal',
    path: '/technician/schedule',
    icon: CalendarIcon,
    priority: 'primary'
  },
  {
    name: 'Riwayat',
    shortName: 'Riwayat',
    path: '/technician/history',
    icon: History,
    priority: 'primary'
  },
  {
    name: 'Profil',
    shortName: 'Profil',
    path: '/technician/profile',
    icon: User,
    priority: 'primary'
  }
];

// Get items for Bottom Navigation (mobile) - returns exactly 5 items
export const getMobileNavItems = (role) => {
  const items = role === 'admin' ? adminNavItems : technicianNavItems;
  const primaryItems = items.filter(item => item.priority === 'primary');
  const secondaryItems = items.filter(item => item.priority === 'secondary');
  
  // Add "Lainnya" menu if there are secondary items
  if (secondaryItems.length > 0) {
    return [
      ...primaryItems,
      {
        name: 'Lainnya',
        shortName: 'Lainnya',
        path: null,
        icon: MoreHorizontal,
        priority: 'primary',
        children: secondaryItems
      }
    ];
  }
  
  return primaryItems;
};

// Get all items for Sidebar (desktop)
export const getSidebarNavItems = (role) => {
  return role === 'admin' ? adminNavItems : technicianNavItems;
};

// Check if path is active (handles nested routes)
export const isActivePath = (currentPath, targetPath) => {
  if (targetPath === '/admin' || targetPath === '/admin/') {
    return currentPath === '/admin' || currentPath === '/admin/';
  }
  if (targetPath === '/technician/dashboard') {
    return currentPath === '/technician/dashboard' || currentPath === '/technician/dashboard/';
  }
  return currentPath.startsWith(targetPath);
};

// Breadcrumb configuration - maps paths to breadcrumb items
export const getBreadcrumbItems = (pathname, role) => {
  const items = [];
  
  // Helper to find nav item by path
  const findNavItem = (path) => {
    const navItems = role === 'admin' ? adminNavItems : technicianNavItems;
    return navItems.find(item => {
      if (item.path === path) return true;
      if (path.startsWith(item.path + '/')) return true;
      return false;
    });
  };
  
  // Helper to check if path is a direct child
  const isChildPath = (parentPath, childPath) => {
    if (!childPath.startsWith(parentPath)) return false;
    const remaining = childPath.slice(parentPath.length);
    return remaining === '' || remaining.startsWith('/');
  };
  
  // Build breadcrumb trail
  const parts = pathname.split('/').filter(p => p && p !== 'admin' && p !== 'technician');
  
  // Always start with dashboard/beranda
  const basePath = role === 'admin' ? '/admin' : '/technician';
  const baseItem = role === 'admin' ? adminNavItems[0] : technicianNavItems[0];
  
  if (pathname === basePath || pathname === `${basePath}/`) {
    return [{ label: baseItem.name, to: basePath }];
  }
  
  // Start with home
  items.push({ label: 'Beranda', to: basePath });
  
  // Add path segments
  let currentPath = basePath;
  for (let i = 0; i < parts.length; i++) {
    currentPath += '/' + parts[i];
    const navItem = findNavItem(currentPath);
    if (navItem) {
      items.push({ label: navItem.name, to: currentPath });
    } else {
      // Try to find a matching nav item
      const matchingItem = role === 'admin' ? adminNavItems : technicianNavItems;
      const exactMatch = matchingItem.find(item => item.path === currentPath);
      if (exactMatch) {
        items.push({ label: exactMatch.name, to: currentPath });
      } else {
        // Use the path segment as label
        items.push({ label: parts[i].replace(/-/g, ' '), to: currentPath });
      }
    }
  }
  
  // Special cases for admin paths
  if (role === 'admin') {
    if (pathname.startsWith('/admin/bookings')) {
      return [
        { label: 'Beranda', to: '/admin' },
        { label: 'Booking', to: '/admin/bookings' }
      ];
    }
    if (pathname.startsWith('/admin/schedule')) {
      return [
        { label: 'Beranda', to: '/admin' },
        { label: 'Jadwal Servis', to: '/admin/schedule' }
      ];
    }
    if (pathname.startsWith('/admin/customers')) {
      return [
        { label: 'Beranda', to: '/admin' },
        { label: 'Pelanggan', to: '/admin/customers' }
      ];
    }
    if (pathname.startsWith('/admin/ac-units')) {
      return [
        { label: 'Beranda', to: '/admin' },
        { label: 'Unit AC Pelanggan', to: '/admin/ac-units' }
      ];
    }
    if (pathname.startsWith('/admin/technicians')) {
      return [
        { label: 'Beranda', to: '/admin' },
        { label: 'Teknisi Lapangan', to: '/admin/technicians' }
      ];
    }
    if (pathname.startsWith('/admin/invoices')) {
      return [
        { label: 'Beranda', to: '/admin' },
        { label: 'E-Invoice & Bayar', to: '/admin/invoices' }
      ];
    }
    if (pathname.startsWith('/admin/services')) {
      return [
        { label: 'Beranda', to: '/admin' },
        { label: 'Katalog Layanan', to: '/admin/services' }
      ];
    }
    if (pathname.startsWith('/admin/feedback')) {
      return [
        { label: 'Beranda', to: '/admin' },
        { label: 'Feedback & Ulasan', to: '/admin/feedback' }
      ];
    }
    if (pathname.startsWith('/admin/inventory')) {
      return [
        { label: 'Beranda', to: '/admin' },
        { label: 'Inventory Sparepart', to: '/admin/inventory' }
      ];
    }
    if (pathname.startsWith('/admin/reports')) {
      return [
        { label: 'Beranda', to: '/admin' },
        { label: 'Log Aktivitas', to: '/admin/reports' }
      ];
    }
    if (pathname.startsWith('/admin/analytics')) {
      return [
        { label: 'Beranda', to: '/admin' },
        { label: 'AI Analitik', to: '/admin/analytics' }
      ];
    }
    if (pathname.startsWith('/admin/settings') || pathname.startsWith('/admin/profile')) {
      return [
        { label: 'Beranda', to: '/admin' },
        { label: 'Pengaturan & Profil', to: '/admin/settings' }
      ];
    }
    if (pathname.startsWith('/admin/notifications')) {
      return [
        { label: 'Beranda', to: '/admin' },
        { label: 'Pusat Notifikasi', to: '/admin/notifications' }
      ];
    }
  }
  
  // Special cases for technician paths
  if (role === 'technician') {
    if (pathname.startsWith('/technician/dashboard')) {
      return [{ label: 'Beranda', to: '/technician' }];
    }
    if (pathname.startsWith('/technician/jobs')) {
      return [
        { label: 'Beranda', to: '/technician/dashboard' },
        { label: 'Tugas', to: '/technician/jobs' }
      ];
    }
    if (pathname.startsWith('/technician/schedule')) {
      return [
        { label: 'Beranda', to: '/technician/dashboard' },
        { label: 'Jadwal', to: '/technician/schedule' }
      ];
    }
    if (pathname.startsWith('/technician/history')) {
      return [
        { label: 'Beranda', to: '/technician/dashboard' },
        { label: 'Riwayat', to: '/technician/history' }
      ];
    }
    if (pathname.startsWith('/technician/profile')) {
      return [
        { label: 'Beranda', to: '/technician/dashboard' },
        { label: 'Profil', to: '/technician/profile' }
      ];
    }
  }
  
  return items.length > 0 ? items : [{ label: 'Beranda', to: basePath }];
};
