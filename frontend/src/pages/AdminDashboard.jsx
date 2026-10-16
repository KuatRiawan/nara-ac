import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';
import api from '../api';
import { AuthContext } from '../AuthContext';


import { Bell, X } from 'lucide-react';
import { useToast } from '../components/ui/toast';
import { getErrorMessage } from '../utils/errors';
import DashboardLayout from '../components/layout/DashboardLayout';

// Admin Subpages
import AdminHome from './admin/AdminHome';
import AdminCustomers from './admin/AdminCustomers';
import AdminACUnits from './admin/AdminACUnits';
import AdminTechnicians from './admin/AdminTechnicians';
import AdminSchedule from './admin/AdminSchedule';
import AdminBookings from './admin/AdminBookings';
import AdminInventory from './admin/AdminInventory';
import AdminReports from './admin/AdminReports';
import AdminNotifications from './admin/AdminNotifications';
import AdminInvoices from './admin/AdminInvoices';
import AdminFeedback from './admin/AdminFeedback';
import AdminServices from './admin/AdminServices';
import AdminAnalytics from './admin/AdminAnalytics';
import AdminSettings from './admin/AdminSettings';
import AdminClaims from './admin/AdminClaims';


export default function AdminDashboard() {
  const { error: showError, success: showSuccess } = useToast();
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Ref to track if component is mounted and current request
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cancel pending requests on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Fetch unread notifications count for header badge
  const fetchUnreadNotifs = useCallback(async () => {
    try {
      const res = await api.get('/admin/notifications?unread=true&limit=1');
      const total = res?.meta?.total ?? res?.data?.meta?.total ?? (Array.isArray(res?.data) ? res.data.length : (Array.isArray(res) ? res.length : 0));
      setUnreadNotifs(total);
    } catch {
      // ignore
    }
  }, []);

  // Fetch bookings for auto-refresh polling
  const fetchBookings = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      // Ambil transaksi aktif periode berjalan (mulai 1 Okt 2026, hingga 1000 tiket)
      const res = await api.get('/bookings', { params: { dari: '2026-10-01', limit: 1000 } });
      const rawBookings = res?.data?.data || res?.data || res;
      const finalBookings = Array.isArray(rawBookings) ? rawBookings : (rawBookings?.data && Array.isArray(rawBookings.data) ? rawBookings.data : []);
      if (isMountedRef.current) {
        setBookings(finalBookings);
      }
    } catch (err) {
      // Silently ignore polling errors
      console.debug('Polling bookings failed:', err);
    }
  }, []);

  const refreshBookings = fetchBookings;

  const handleBookingCreated = useCallback(() => {
    fetchBookings();
    try {
      localStorage.setItem('nara_booking_sync_timestamp', Date.now().toString());
    } catch (_) { /* Storage is unavailable in private browser sessions. */ }
    window.dispatchEvent(new CustomEvent('nara-booking-updated'));
  }, [fetchBookings]);

  useEffect(() => {
    fetchUnreadNotifs();
    const notifInterval = setInterval(fetchUnreadNotifs, 15000);
    return () => clearInterval(notifInterval);
  }, [fetchUnreadNotifs]);

  useEffect(() => {
    // Initial fetch
    fetchBookings();
    // Poll for new bookings every 15 seconds
    const bookingInterval = setInterval(fetchBookings, 15000);
    return () => clearInterval(bookingInterval);
  }, [fetchBookings]);

  // Global event listener for instant synchronization across all components & tabs
  useEffect(() => {
    const handleGlobalUpdate = () => {
      fetchBookings();
      fetchUnreadNotifs();
    };
    window.addEventListener('nara-booking-updated', handleGlobalUpdate);
    const handleStorage = (e) => {
      if (e.key === 'nara_booking_sync_timestamp') {
        handleGlobalUpdate();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('nara-booking-updated', handleGlobalUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchBookings, fetchUnreadNotifs]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'admin') {
      if (user.role === 'technician') {
        navigate('/technician/dashboard');
      } else if (user.role === 'customer') {
        navigate('/customer/dashboard');
      } else {
        navigate('/login');
      }
      return;
    }

    const fetchData = async () => {
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      try {
        // Only fetch technicians here; bookings are fetched via polling
        const resTechs = await api.get('/technicians', { signal: controller.signal });
        
        const rawTechs = resTechs?.data?.data || resTechs?.data || resTechs;
        const finalTechs = Array.isArray(rawTechs) ? rawTechs : (rawTechs?.data && Array.isArray(rawTechs.data) ? rawTechs.data : []);

        if (isMountedRef.current) {
          setTechnicians(finalTechs);
        }
      } catch (err) {
        if (axios.isCancel(err) || err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          return;
        }
        if (isMountedRef.current) {
          const msg = getErrorMessage(err, 'Gagal memuat data dashboard');
          showError(`Gagal memuat data dashboard: ${msg}`);
        }
      } finally {
        if (isMountedRef.current && abortControllerRef.current === controller) {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [user, authLoading, navigate, showError, location.pathname]);

  const handleAssign = useCallback(async (id, teknisi_id) => {
    try {
      const res = await api.patch(`/admin/bookings/${id}/assign`, { teknisi_id }); 
      const tech = technicians.find(t => t.id === teknisi_id);
      const updatedBooking = res?.data || res;
      if (isMountedRef.current) {
        setBookings(prev => prev.map(b => b.id === id ? { 
          ...b, 
          ...(updatedBooking && updatedBooking.id ? updatedBooking : {}),
          teknisi_id: teknisi_id, 
          teknisi: tech ? { id: tech.id, nama: tech.nama } : (updatedBooking?.teknisi || null) 
        } : b));
      }
      showSuccess(`Teknisi ${tech?.nama || 'terpilih'} berhasil ditugaskan.`);
      // Refresh background data secara sinkron
      refreshBookings();
      fetchUnreadNotifs();
      window.dispatchEvent(new CustomEvent('nara-booking-updated'));
      localStorage.setItem('nara_booking_sync_timestamp', Date.now().toString());
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal menugaskan teknisi');
      showError(msg);
    }
  }, [technicians, showError, showSuccess, refreshBookings, fetchUnreadNotifs]);

  const handleStatus = useCallback(async (id, status) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status, catatan: 'Diupdate via dashboard' });
      if (isMountedRef.current) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      }
      refreshBookings();
      window.dispatchEvent(new CustomEvent('nara-booking-updated'));
      localStorage.setItem('nara_booking_sync_timestamp', Date.now().toString());
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal mengubah status');
      showError(msg);
    }
  }, [showError, refreshBookings]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold">Memuat sesi...</div>;
  if (!user || user.role !== 'admin') return null;

  const isAdmin = user.role === 'admin';

  return (
    <DashboardLayout role="admin" onOpenNotif={() => setIsNotifOpen(true)} unreadCount={unreadNotifs}>
      <div className="flex-1 flex flex-col min-w-0">
        <Routes>
          <Route path="/" element={<AdminHome bookings={bookings} technicians={technicians} loading={loading} handleStatus={handleStatus} handleAssign={handleAssign} isAdmin={isAdmin} onBookingCreated={handleBookingCreated} />} />
          <Route path="/bookings" element={<AdminBookings bookings={bookings} technicians={technicians} loading={loading} handleStatus={handleStatus} handleAssign={handleAssign} isAdmin={isAdmin} onBookingCreated={handleBookingCreated} />} />
          <Route path="/customers/*" element={<AdminCustomers />} />
          <Route path="/ac-units" element={<AdminACUnits />} />
          <Route path="/technicians/*" element={<AdminTechnicians />} />
          <Route path="/invoices" element={<AdminInvoices bookings={bookings} onBookingUpdated={handleBookingCreated} />} />
          <Route path="/claims" element={<AdminClaims />} />
          <Route path="/whatsapp-cs" element={<Navigate to="/admin" replace />} />
          <Route path="/services" element={<AdminServices />} />
          <Route path="/feedback" element={<AdminFeedback />} />
          <Route path="/inventory" element={<AdminInventory />} />
          <Route path="/schedule" element={<AdminSchedule onBookingAssigned={handleBookingCreated} />} />
          <Route path="/reports" element={<AdminReports />} />
          <Route path="/analytics" element={<AdminAnalytics />} />
          <Route path="/settings" element={<AdminSettings />} />
          <Route path="/profile" element={<AdminSettings />} />
          <Route path="/notifications" element={<AdminNotifications onRefreshCount={fetchUnreadNotifs} />} />
        </Routes>
      </div>

      {/* Notifications Drawer */}
      {isNotifOpen && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-200" 
            onClick={() => setIsNotifOpen(false)} 
          />
          <div 
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200"
            onKeyDown={(e) => { if (e.key === 'Escape') setIsNotifOpen(false); }}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Pusat Notifikasi"
          >
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200/60">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <span>Pusat Notifikasi</span>
                    {unreadNotifs > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                        {unreadNotifs} Baru
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">Pemberitahuan aktivitas & operasional</p>
                </div>
              </div>
              <button 
                onClick={() => setIsNotifOpen(false)} 
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-slate-500 hover:text-slate-700"
                aria-label="Tutup Pusat Notifikasi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
              <AdminNotifications 
                isDrawer={true} 
                onClose={() => setIsNotifOpen(false)} 
                onRefreshCount={fetchUnreadNotifs} 
              />
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
