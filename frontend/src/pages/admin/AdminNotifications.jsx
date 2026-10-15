import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { CheckCircle2, AlertTriangle, Info, Clock, Check, Calendar, Wrench, Receipt, ExternalLink, RefreshCw, Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/ui/toast';
import { Button } from '../../components/ui/button';

export default function AdminNotifications({ isDrawer = false, onClose, onRefreshCount }) {
  const { error: showError, success: showSuccess } = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [markingAll, setMarkingAll] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'unread' ? '/admin/notifications?unread=true&limit=50' : '/admin/notifications?limit=50';
      const res = await api.get(url);
      const raw = res?.data?.data || res?.data || [];
      const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
      setNotifications(list);
    } catch (err) {
      showError('Gagal memuat notifikasi: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, [filter, showError]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/admin/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      onRefreshCount?.();
    } catch (err) {
      showError('Gagal menandai notifikasi: ' + (err.response?.data?.error?.message || err.message));
    }
  }, [showError, onRefreshCount]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      await api.patch('/admin/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showSuccess('Semua notifikasi ditandai telah dibaca.');
      onRefreshCount?.();
    } catch (err) {
      showError('Gagal menandai semua notifikasi: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setMarkingAll(false);
    }
  }, [showSuccess, showError, onRefreshCount]);

  // Handle click on notification card
  const handleNotificationClick = (item) => {
    if (!item.is_read) {
      markAsRead(item.id);
    }
    if (item.tautan) {
      navigate(item.tautan);
      if (onClose) {
        onClose();
      }
    }
  };

  // Unread items count
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);

  // Format relative time helper in Indonesian
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now - date) / 1000);
      if (diffSec < 60) return 'Baru saja';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} mnt lalu`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} jam lalu`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 7) return `${diffDay} hari lalu`;
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  // Get icon by notification type & title
  const getNotificationIcon = (n) => {
    const type = n.type?.toLowerCase() || '';
    const title = n.title?.toLowerCase() || '';

    if (type === 'alert' || type === 'warning' || title.includes('batal') || title.includes('gagal')) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
      );
    }
    if (type === 'success' || title.includes('selesai') || title.includes('lunas') || title.includes('sukses')) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      );
    }
    if (type === 'booking' || title.includes('booking') || title.includes('jadwal')) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5" />
        </div>
      );
    }
    if (type === 'technician' || title.includes('teknisi')) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
          <Wrench className="w-5 h-5" />
        </div>
      );
    }
    if (type === 'invoice' || title.includes('invoice') || title.includes('bayar')) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center shrink-0">
          <Receipt className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
        <Info className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className={cn(
      isDrawer 
        ? "w-full flex flex-col space-y-4" 
        : "flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 relative min-w-0 font-sans"
    )}>
      
      {/* Standalone Header (only visible on direct page view, not in drawer) */}
      {!isDrawer && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Pusat Notifikasi Sistem</span>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                  {unreadCount} Baru
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Pantau seluruh aktivitas pemesanan, penugasan teknisi, dan status sistem secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-2">

            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                disabled={markingAll}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Check className="w-4 h-4" />
                <span>Tandai Semua Dibaca</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Filter Tabs & Quick Action Bar */}
      <div className="flex items-center justify-between gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              filter === 'all'
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
            )}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              filter === 'unread'
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
            )}
          >
            <span>Belum Dibaca</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs font-black bg-rose-500 text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={markingAll}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer flex items-center gap-1"
            title="Tandai semua telah dibaca"
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tandai Semua Dibaca</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200/80 flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mb-2" />
            <p className="text-xs font-medium">Memuat notifikasi sistem...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200/80 flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-3 border border-slate-100">
              <Inbox className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">
              {filter === 'unread' ? 'Tidak Ada Notifikasi Baru' : 'Belum Ada Notifikasi'}
            </h4>
            <p className="text-xs text-slate-500 max-w-xs">
              {filter === 'unread'
                ? 'Semua notifikasi telah Anda baca. Sistem terpantau aman dan terkendali.'
                : 'Pemberitahuan booking baru dan penugasan teknisi akan muncul di sini.'}
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const hasLink = Boolean(n.tautan);
            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 relative group",
                  hasLink && "cursor-pointer",
                  !n.is_read
                    ? "bg-blue-50/40 border-blue-200 shadow-2xs hover:bg-blue-50/70 hover:border-blue-300"
                    : "bg-white border-slate-200/70 hover:bg-slate-50/70 hover:border-slate-300"
                )}
              >
                {/* Visual Icon */}
                {getNotificationIcon(n)}

                {/* Content */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className={cn("text-xs font-bold leading-tight", !n.is_read ? "text-slate-900" : "text-slate-700")}>
                        {n.title}
                      </h4>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 inline-block" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-500 whitespace-nowrap flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatTimeAgo(n.created_at)}
                    </span>
                  </div>

                  <p className={cn("text-xs mt-1 leading-relaxed", !n.is_read ? "text-slate-700 font-medium" : "text-slate-500 font-normal")}>
                    {n.message}
                  </p>

                  {/* Optional action link */}
                  {hasLink && (
                    <div className="mt-2.5 flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:text-blue-700">
                      <span>Buka detail</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Mark as read button (for unread items) */}
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={(e) => markAsRead(n.id, e)}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-100/60 transition-colors shrink-0 cursor-pointer"
                    title="Tandai telah dibaca"
                    aria-label="Tandai telah dibaca"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
