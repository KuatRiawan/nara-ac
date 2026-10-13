/**
 * Navigation Configuration for NARA AC
 * Defines menu items for Admin and Technician roles
 * Used by both BottomNavigation (mobile) and Sidebar (desktop)
 */

import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  CalendarCheck,
  User,
  Users,
  Wrench,
  Settings,
  Bell,
  MoreHorizontal,
  ClipboardList,
  History,
  Package,
  BarChart3,
  Bot,
  AirVent,
  Receipt,
  Star,
  Tag
} from 'lucide-react';

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
