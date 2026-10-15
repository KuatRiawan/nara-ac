import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';
import { 
  ShieldCheck, 
  Search, 
  Download, 
  FileText, 
  Sliders, 
  Wrench, 
  Users, 
  Clock, 
  Eye, 
  X, 
  Loader2,
  Code2
} from 'lucide-react';

// Human-friendly Indonesian dictionary for log snapshot fields
const FIELD_LABELS = {
  // AC Unit
  brand: 'Merek AC',
  lokasi: 'Lokasi Pemasangan',
  model: 'Model / Tipe AC',
  kapasitas_pk: 'Kapasitas (PK)',
  pk: 'Kapasitas (PK)',
  freon_type: 'Jenis Freon',
  jenis_freon: 'Jenis Freon',
  serial_number: 'Nomor Seri',
  no_seri: 'Nomor Seri',
  tahun_pemasangan: 'Tahun Pasang',
  tahun_pasang: 'Tahun Pasang',
  catatan_unit: 'Catatan Unit',

  // Customer / Booking
  customer_id: 'ID Pelanggan',
  customer_name: 'Nama Pelanggan',
  nama_pelanggan: 'Nama Pelanggan',
  nama: 'Nama Lengkap',
  kontak: 'Nomor Kontak',
  telepon: 'Nomor Telepon',
  no_hp: 'Nomor Handphone',
  alamat: 'Alamat Lengkap',
  booking_id: 'ID Booking',
  kode_booking: 'Kode Booking',
  jadwal_mulai: 'Jadwal Mulai',
  jadwal_selesai: 'Jadwal Selesai',
  layanan_id: 'ID Layanan',
  nama_layanan: 'Nama Layanan',
  keluhan: 'Keluhan / Kendala',
  jumlah_unit: 'Jumlah Unit AC',
  catatan: 'Catatan',
  keterangan: 'Keterangan',
  catatan_admin: 'Catatan Admin',

  // Teknisi & Pengerjaan
  teknisi_id: 'ID Teknisi',
  nama_teknisi: 'Nama Teknisi',
  status: 'Status',
  status_pengerjaan: 'Status Pengerjaan',
  status_pembayaran: 'Status Pembayaran',
  metode_pembayaran: 'Metode Pembayaran',
  rekening_tujuan: 'Rekening Bank Tujuan',
  nama_bank: 'Nama Bank',
  nomor_rekening: 'Nomor Rekening',
  atas_nama: 'Atas Nama Rekening',
  
  // Keuangan
  nominal: 'Nominal Pembayaran',
  total_biaya: 'Total Biaya',
  biaya: 'Biaya',
  harga: 'Harga Satuan',
  subtotal: 'Subtotal',
  diskon: 'Potongan Diskon',
  invoice_id: 'ID Invoice',
  nomor_invoice: 'Nomor Invoice',

  // Inventaris
  item_id: 'ID Barang',
  nama_barang: 'Nama Barang / Sparepart',
  kategori: 'Kategori Barang',
  stok: 'Jumlah Stok',
  stok_awal: 'Stok Awal',
  stok_akhir: 'Stok Akhir',
  perubahan: 'Selisih Perubahan',
  satuan: 'Satuan Unit',
  alasan: 'Alasan Penyesuaian',

  // Rating & Review
  rating: 'Rating Bintang',
  ulasan: 'Ulasan Pelanggan',
  komentar: 'Komentar Konsumen',

  // System
  role: 'Hak Akses (Role)',
  email: 'Alamat Email',
  user_id: 'ID Pengguna',
  ip: 'Alamat IP',
  user_agent: 'Perangkat / Browser'
};

const formatFieldLabel = (key) => {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatFieldValue = (key, val) => {
  if (val === null || val === undefined) {
    return <span className="text-slate-500 italic">Tidak ada data</span>;
  }
  if (typeof val === 'boolean') {
    return val ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Ya
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
        Tidak
      </span>
    );
  }
  if (typeof val === 'number') {
    const isCurrency = /(harga|biaya|nominal|total|subtotal|diskon)/i.test(key);
    if (isCurrency) {
      return <span className="font-bold text-slate-900 font-mono">Rp {val.toLocaleString('id-ID')}</span>;
    }
    return <span className="font-bold text-slate-900 font-mono">{val}</span>;
  }
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
      try {
        const d = new Date(val);
        return (
          <span className="font-medium text-slate-800">
            {d.toLocaleString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        );
      } catch {
        return <span className="font-medium text-slate-800">{val}</span>;
      }
    }
    if (/(status)/i.test(key)) {
      let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
      if (/aktif|done|selesai|confirmed|paid|lunas/i.test(val)) {
        badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      } else if (/on_process|proses|scheduled|terjadwal/i.test(val)) {
        badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
      } else if (/batal|cancelled|unpaid|belum_bayar/i.test(val)) {
        badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
      }
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border capitalize ${badgeClass}`}>
          {val.replace(/_/g, ' ')}
        </span>
      );
    }
    return <span className="font-bold text-slate-900">{val}</span>;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="text-slate-500 italic">Daftar kosong</span>;
    return (
      <div className="flex flex-wrap gap-1 mt-0.5">
        {val.map((item, idx) => (
          <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200">
            {typeof item === 'object' ? JSON.stringify(item) : String(item)}
          </span>
        ))}
      </div>
    );
  }
  if (typeof val === 'object') {
    return (
      <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1 text-xs">
        {Object.entries(val).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <span className="text-slate-500 font-semibold">{formatFieldLabel(k)}:</span>
            <span className="font-medium text-slate-800">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  return String(val);
};

const FormattedSnapshotViewer = ({ data, type = 'after' }) => {
  const isAfter = type === 'after';
  const isEmpty = !data || (typeof data === 'object' && Object.keys(data).length === 0);

  if (isEmpty) {
    return (
      <div className="h-full min-h-[110px] flex flex-col items-center justify-center p-4 text-center bg-white rounded-2xl border border-dashed border-slate-200">
        <span className="text-xs font-semibold text-slate-500">
          {isAfter ? '(Data Dihapus / Tidak Ada Nilai)' : '(Kosong / Data Baru Ditambahkan)'}
        </span>
      </div>
    );
  }

  const parsedData = typeof data === 'string' ? (() => {
    try { return JSON.parse(data); } catch { return data; }
  })() : data;

  if (typeof parsedData !== 'object' || parsedData === null) {
    return (
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-800 font-medium">
        {String(parsedData)}
      </div>
    );
  }

  const entries = Object.entries(parsedData);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
      {entries.map(([key, val]) => (
        <div key={key} className="p-3 sm:px-3.5 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 hover:bg-slate-50/50 transition-colors">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
            {formatFieldLabel(key)}
          </span>
          <div className="text-xs sm:text-right">
            {formatFieldValue(key, val)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function AdminReports() {
  const { error: showError, success: showSuccess, warning: showWarning } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all | admin | technician | customer
  const [entityFilter, setEntityFilter] = useState('all'); // all | booking | inventory | ac_unit | customer
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Detail modal state
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState('formatted'); // 'formatted' | 'raw'

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDetailOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit-logs?limit=100');
      const raw = res?.data?.data || res?.data || res;
      const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
      setLogs(list);
    } catch (err) {
      showError('Gagal memuat catatan audit log: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // KPIs
  const kpis = useMemo(() => {
    let adminCount = 0;
    let techCount = 0;
    let custCount = 0;
    let sysCount = 0;

    logs.forEach(l => {
      if (l.role === 'admin') adminCount++;
      else if (l.role === 'technician') techCount++;
      else if (l.role === 'customer') custCount++;
      else sysCount++;
    });

    return {
      total: logs.length,
      adminCount,
      techCount,
      custCount,
      sysCount
    };
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const q = search.toLowerCase();
      const metaStr = typeof l.metadata === 'object' ? JSON.stringify(l.metadata).toLowerCase() : '';
      const matchSearch = 
        (l.actor && l.actor.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.entity && l.entity.toLowerCase().includes(q)) ||
        String(l.entity_id || '').includes(q) ||
        metaStr.includes(q);

      if (!matchSearch) return false;

      if (roleFilter !== 'all' && l.role !== roleFilter) return false;
      if (entityFilter !== 'all' && l.entity !== entityFilter) return false;

      return true;
    });
  }, [logs, search, roleFilter, entityFilter]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, entityFilter]);

  // Paginated logs
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const getEntityLabel = (entity) => {
    switch (entity?.toLowerCase()) {
      case 'ac_unit':
        return 'Unit AC Pelanggan';
      case 'booking':
        return 'Pemesanan / Tiket Servis';
      case 'inventory':
        return 'Barang Inventaris';
      case 'customer':
        return 'Data Pelanggan';
      case 'technician':
        return 'Teknisi Lapangan';
      case 'invoice':
        return 'Faktur Tagihan';
      case 'feedback':
        return 'Feedback Konsumen';
      case 'service':
        return 'Katalog Layanan';
      case 'payment_account':
        return 'Rekening Bank';
      default:
        return (entity || 'Entitas').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  };

  // Helper dictionary label tindakan
  const getActionInfo = (action) => {
    switch (action) {
      case 'technician_assigned':
        return { label: 'Penugasan Teknisi', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'booking_created':
        return { label: 'Booking Baru Dibuat', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'booking_status_updated':
        return { label: 'Update Status Booking', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'booking_cancelled':
        return { label: 'Booking Dibatalkan', badge: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'job_started':
        return { label: 'Pekerjaan Dimulai', badge: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'photo_uploaded':
        return { label: 'Unggah Foto SOP', badge: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'checklist_updated':
        return { label: 'Checklist Servis Selesai', badge: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'inventory_created':
        return { label: 'Tambah Barang Inventaris', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'inventory_adjusted':
        return { label: 'Penyesuaian Stok', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'inventory_updated':
        return { label: 'Perubahan Data Barang', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'ac_unit_created':
        return { label: 'Unit AC Ditambahkan', badge: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'ac_unit_updated':
        return { label: 'Perubahan Unit AC', badge: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'ac_unit_deleted':
        return { label: 'Unit AC Dihapus', badge: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'customer_created':
        return { label: 'Pendaftaran Pelanggan', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'customer_updated':
        return { label: 'Perubahan Data Pelanggan', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'invoice_paid':
        return { label: 'Verifikasi Pembayaran', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'invoice_created':
        return { label: 'Invoice Baru Dibuat', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'invoice_updated':
        return { label: 'Update Data Invoice', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'payment_account_updated':
        return { label: 'Ubah Rekening Pembayaran', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'service_created':
        return { label: 'Tambah Layanan Baru', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'service_updated':
        return { label: 'Update Tarif Layanan', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'feedback_submitted':
        return { label: 'Ulasan Pelanggan Masuk', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { 
          label: (action || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), 
          badge: 'bg-slate-100 text-slate-700 border-slate-200' 
        };
    }
  };

  // Helper badge peran
  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">Admin</span>;
      case 'technician':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">Teknisi</span>;
      case 'customer':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Pelanggan</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 capitalize">{role || 'System'}</span>;
    }
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Export Bookings CSV
  const exportBookings = async () => {
    setExporting(true);
    try {
      const res = await api.get('/bookings?limit=1000');
      const raw = res?.data?.data || res?.data || res;
      const data = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
      if (!data || data.length === 0) {
        showWarning('Tidak ada data booking untuk diexport.');
        return;
      }

      const headers = ['ID', 'Kode Booking', 'Pelanggan', 'Kontak', 'Layanan', 'Jumlah Unit', 'Jadwal Mulai', 'Status', 'Teknisi', 'Total Biaya'];
      const csv = [
        headers.join(','),
        ...data.map(b => [
          b.id,
          b.kode_booking || `BK-${b.id}`,
          `"${b.customer?.nama || b.nama || ''}"`,
          `"${b.customer?.kontak || b.kontak || ''}"`,
          `"${b.layanan?.nama || b.layanan?.nama_layanan || b.nama_layanan || ''}"`,
          b.jumlah_unit || 1,
          `"${b.jadwal_mulai || ''}"`,
          b.status,
          `"${b.teknisi?.nama || ''}"`,
          b.total_biaya || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Booking_NARA_AC_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      showSuccess('Data booking berhasil diexport ke CSV.');
    } catch (err) {
      showError('Gagal export data booking: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setExporting(false);
    }
  };

  // Export Audit Logs CSV
  const exportAuditLogs = () => {
    if (filteredLogs.length === 0) {
      showWarning('Tidak ada data log audit untuk diexport.');
      return;
    }

    const headers = ['ID', 'Waktu', 'Aktor', 'Role', 'Aksi', 'Entitas', 'ID Entitas', 'Metadata', 'Snapshot Sebelum', 'Snapshot Sesudah'];
    const csv = [
      headers.join(','),
      ...filteredLogs.map(l => [
        l.id,
        `"${formatDate(l.created_at)}"`,
        `"${l.actor || ''}"`,
        l.role || '',
        l.action || '',
        l.entity || '',
        l.entity_id || '',
        `"${l.metadata ? JSON.stringify(l.metadata).replace(/"/g, '""') : ''}"`,
        `"${l.sebelum ? JSON.stringify(l.sebelum).replace(/"/g, '""') : ''}"`,
        `"${l.sesudah ? JSON.stringify(l.sesudah).replace(/"/g, '""') : ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Audit_Log_NARA_AC_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showSuccess('Log audit berhasil diexport ke CSV.');
  };

  const openLogDetail = (log) => {
    setSelectedLog(log);
    setViewMode('formatted');
    setIsDetailOpen(true);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 relative min-w-0">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Log Aktivitas Sistem
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekam jejak kronologis seluruh tindakan admin, teknisi, dan pelanggan CV. Nara Teknindotama.
          </p>
        </div>

        <div className="flex items-center gap-2.5">

          <Button
            onClick={exportAuditLogs}
            variant="outline"
            className="rounded-xl border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Export Log (CSV)</span>
          </Button>

          <Button
            onClick={exportBookings}
            disabled={exporting}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <FileText className="w-4 h-4 text-sky-400" />
            <span>Export Booking (CSV)</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards (Clean White Style consistent with other pages) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Aktivitas Audit */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Log Aktivitas</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              {kpis.total} <span className="text-xs font-semibold text-slate-500">Tindakan</span>
            </p>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Tercatat permanen di database
            </p>
          </div>
        </div>

        {/* Tindakan Admin */}
        <div className="p-5 rounded-3xl bg-white border border-indigo-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Aktivitas Admin</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sliders className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-indigo-700">
              {kpis.adminCount} <span className="text-xs font-semibold text-indigo-600/70">Aksi</span>
            </p>
            <p className="text-xs font-medium text-indigo-600/80 mt-1">
              Penugasan, inventori & jadwal
            </p>
          </div>
        </div>

        {/* Tindakan Teknisi */}
        <div className="p-5 rounded-3xl bg-white border border-teal-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Aktivitas Teknisi</span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-teal-700">
              {kpis.techCount} <span className="text-xs font-semibold text-teal-600/70">Aksi</span>
            </p>
            <p className="text-xs font-medium text-teal-600/80 mt-1">
              Update progres servis & foto SOP
            </p>
          </div>
        </div>

        {/* Aktivitas Pelanggan */}
        <div className="p-5 rounded-3xl bg-white border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Aktivitas Pelanggan</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-700">
              {kpis.custCount} <span className="text-xs font-semibold text-emerald-600/70">Aksi</span>
            </p>
            <p className="text-xs font-medium text-emerald-600/80 mt-1">
              Pemesanan servis & pembatalan
            </p>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            placeholder="Cari aktor, aksi, tiket, entitas..."
            aria-label="Cari laporan audit"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
          {/* Role Filter Buttons */}
          <Button
            size="sm"
            variant={roleFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setRoleFilter('all')}
            className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${roleFilter === 'all' ? 'bg-blue-600 text-white' : 'border-slate-200 text-slate-600'}`}
          >
            Semua ({kpis.total})
          </Button>
          <Button
            size="sm"
            variant={roleFilter === 'admin' ? 'default' : 'outline'}
            onClick={() => setRoleFilter('admin')}
            className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${roleFilter === 'admin' ? 'bg-blue-600 text-white' : 'border-slate-200 text-slate-600'}`}
          >
            Admin ({kpis.adminCount})
          </Button>
          <Button
            size="sm"
            variant={roleFilter === 'technician' ? 'default' : 'outline'}
            onClick={() => setRoleFilter('technician')}
            className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${roleFilter === 'technician' ? 'bg-teal-600 text-white' : 'border-slate-200 text-slate-600'}`}
          >
            Teknisi ({kpis.techCount})
          </Button>
          <Button
            size="sm"
            variant={roleFilter === 'customer' ? 'default' : 'outline'}
            onClick={() => setRoleFilter('customer')}
            className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${roleFilter === 'customer' ? 'bg-emerald-600 text-white' : 'border-slate-200 text-slate-600'}`}
          >
            Pelanggan ({kpis.custCount})
          </Button>

          {/* Entity Filter Dropdown */}
          <div className="border-l border-slate-200 pl-2 ml-1">
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Semua Entitas</option>
              <option value="booking">Booking Servis</option>
              <option value="inventory">Inventaris Barang</option>
              <option value="ac_unit">Unit AC</option>
              <option value="customer">Pelanggan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-5">Waktu & Tanggal</th>
                <th className="py-3.5 px-5">Pelaku (Aktor)</th>
                <th className="py-3.5 px-5">Tindakan Sistem</th>
                <th className="py-3.5 px-5">Target Entitas</th>
                <th className="py-3.5 px-5">Ringkasan Perubahan</th>
                <th className="py-3.5 px-5 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Memuat catatan log audit...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    Tidak ada catatan audit yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const act = getActionInfo(log.action);
                  
                  // Extract quick summary from metadata or snapshots
                  let summary = '-';
                  if (log.metadata && typeof log.metadata === 'object' && Object.keys(log.metadata).length > 0) {
                    if (log.metadata.teknisi) summary = `Teknisi: ${log.metadata.teknisi}`;
                    else if (log.metadata.alasan) summary = `Alasan: ${log.metadata.alasan}`;
                    else if (log.metadata.kode) summary = `Kode: ${log.metadata.kode}`;
                    else summary = Object.entries(log.metadata).map(([k, v]) => `${formatFieldLabel(k)}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ');
                  } else if (log.sesudah && typeof log.sesudah === 'object') {
                    summary = Object.entries(log.sesudah).map(([k, v]) => `${formatFieldLabel(k)}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ');
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <div>
                            <p className="font-bold text-slate-900">{formatDate(log.created_at)}</p>
                            <p className="text-xs text-slate-500">ID Log #{log.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900">{log.actor || 'System'}</p>
                          {getRoleBadge(log.role)}
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${act.badge}`}>
                            {act.label}
                          </span>
                          <p className="font-mono text-xs text-slate-500 block">{log.action}</p>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <span className="font-semibold text-slate-800 capitalize block">
                          {getEntityLabel(log.entity)}
                        </span>
                        <span className="font-mono text-xs text-blue-600">
                          #{log.entity_id}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 max-w-xs">
                        <p className="text-xs text-slate-600 truncate bg-slate-50 p-1.5 rounded-lg border border-slate-100" title={summary}>
                          {summary}
                        </p>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openLogDetail(log)}
                          className="rounded-xl text-xs font-bold h-8 px-2.5 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer"
                          title="Lihat Snapshot Lengkap"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span>Inspeksi</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION TOOLBAR */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div>
            Menampilkan <strong className="text-slate-900">{filteredLogs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> - <strong className="text-slate-900">{Math.min(filteredLogs.length, currentPage * itemsPerPage)}</strong> dari <strong className="text-slate-900">{filteredLogs.length}</strong> log aktivitas
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition-all"
              >
                Sebelumnya
              </button>
              <div className="px-3 py-1 font-bold text-slate-800">
                Hal {currentPage} / {totalPages}
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition-all"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL DETAIL INSPEKSI AUDIT LOG                               */}
      {/* ============================================================== */}
      {isDetailOpen && selectedLog && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsDetailOpen(false); }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex justify-center items-start p-3 sm:p-6 lg:p-8 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-8 animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/30 text-sky-400 rounded-xl border border-blue-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    Detail Log Aktivitas #{selectedLog.id}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Data riwayat kronologis tercatat di CV. Nara Teknindotama
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 max-h-[72vh] overflow-y-auto">
              
              {/* Event Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Waktu Kejadian</span>
                  <p className="font-bold text-slate-900 mt-0.5">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Pelaku (Aktor)</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-slate-900">{selectedLog.actor}</span>
                    {getRoleBadge(selectedLog.role)}
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Aksi Sistem</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getActionInfo(selectedLog.action).badge}`}>
                      {getActionInfo(selectedLog.action).label}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      ({selectedLog.action})
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Entitas Terkait</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-bold text-slate-800">{getEntityLabel(selectedLog.entity)}</span>
                    <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      #{selectedLog.entity_id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Before & After Comparison */}
              {(selectedLog.sebelum || selectedLog.sesudah) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Perubahan Data (Snapshot)
                    </span>
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setViewMode('formatted')}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          viewMode === 'formatted'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>Tampilan Rapi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('raw')}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          viewMode === 'raw'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Kode Raw JSON</span>
                      </button>
                    </div>
                  </div>

                  {viewMode === 'formatted' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Before */}
                      <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/80 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                            Sebelum Perubahan
                          </span>
                          {selectedLog.sebelum ? (
                            <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                              Nilai Lama
                            </span>
                          ) : (
                            <span className="text-xs bg-rose-100/70 text-rose-700 font-medium px-2 py-0.5 rounded-full">
                              Belum Ada
                            </span>
                          )}
                        </div>
                        <FormattedSnapshotViewer data={selectedLog.sebelum} type="before" />
                      </div>

                      {/* After */}
                      <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                            Sesudah Perubahan
                          </span>
                          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            Nilai Terbaru
                          </span>
                        </div>
                        <FormattedSnapshotViewer data={selectedLog.sesudah} type="after" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Before Raw */}
                      <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200">
                        <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-1.5">
                          Sebelum Perubahan (Raw JSON)
                        </span>
                        <pre className="font-mono text-xs text-slate-700 whitespace-pre-wrap bg-white p-2.5 rounded-xl border border-rose-100 overflow-x-auto">
                          {selectedLog.sebelum ? JSON.stringify(selectedLog.sebelum, null, 2) : '(Kosong / Data Baru)'}
                        </pre>
                      </div>

                      {/* After Raw */}
                      <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1.5">
                          Sesudah Perubahan (Raw JSON)
                        </span>
                        <pre className="font-mono text-xs text-slate-700 whitespace-pre-wrap bg-white p-2.5 rounded-xl border border-emerald-100 overflow-x-auto">
                          {selectedLog.sesudah ? JSON.stringify(selectedLog.sesudah, null, 2) : '(Kosong / Dihapus)'}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Metadata Tambahan
                  </span>
                  {viewMode === 'formatted' ? (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <FormattedSnapshotViewer data={selectedLog.metadata} type="metadata" />
                    </div>
                  ) : (
                    <pre className="font-mono text-xs text-slate-800 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <Button
                onClick={() => setIsDetailOpen(false)}
                className="rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white h-9 px-5 cursor-pointer shadow-sm"
              >
                Tutup Inspeksi
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
