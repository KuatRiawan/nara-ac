import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../components/ui/toast';
import { cn } from '../../lib/utils';
import { 
  ShieldCheck, Search, Clock, CheckCircle2, XCircle, Wrench, AlertTriangle, 
  Calendar, User, RefreshCw, Star, ArrowRight, MessageSquare, Plus, FileText, Check, X
} from 'lucide-react';

export default function AdminClaims() {
  const { error: showError, success: showSuccess } = useToast();
  const [claims, setClaims] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Modals state
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDecideModalOpen, setIsDecideModalOpen] = useState(false);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);

  // Form states
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [decisionType, setDecisionType] = useState('disetujui');
  const [rejectReason, setRejectReason] = useState('');
  const [inspectNotes, setInspectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch claims & technicians
  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const [claimsRes, techsRes] = await Promise.all([
        api.get('/claims/admin', { params: { limit: 100 } }),
        api.get('/technicians'),
      ]);
      const claimsData = claimsRes?.data?.data || claimsRes?.data || claimsRes;
      const techsData = techsRes?.data?.data || techsRes?.data || techsRes;
      setClaims(Array.isArray(claimsData) ? claimsData : []);
      setTechnicians(Array.isArray(techsData) ? techsData : []);
    } catch (err) {
      showError('Gagal memuat data klaim garansi: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  // KPIs Calculation
  const kpis = useMemo(() => {
    const total = claims.length;
    let diajukan = 0;
    let aktif = 0;
    let disetujui = 0;
    let ditolak = 0;

    claims.forEach(c => {
      if (c.status === 'diajukan') diajukan++;
      else if (c.status === 'dijadwalkan' || c.status === 'diperiksa') aktif++;
      else if (c.status === 'disetujui' || c.status === 'selesai') disetujui++;
      else if (c.status === 'ditolak') ditolak++;
    });

    return { total, diajukan, aktif, disetujui, ditolak };
  }, [claims]);

  // Filtered claims
  const filteredClaims = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter(c => {
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      if (!matchStatus) return false;
      if (!q) return true;

      return (
        (c.kode_klaim && c.kode_klaim.toLowerCase().includes(q)) ||
        (c.booking_kode && c.booking_kode.toLowerCase().includes(q)) ||
        (c.customer_nama && c.customer_nama.toLowerCase().includes(q)) ||
        (c.kontak && c.kontak.toLowerCase().includes(q)) ||
        (c.keluhan && c.keluhan.toLowerCase().includes(q))
      );
    });
  }, [claims, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / itemsPerPage));
  const paginatedClaims = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClaims.slice(start, start + itemsPerPage);
  }, [filteredClaims, currentPage, itemsPerPage]);

  // Open Schedule Modal (BR-26, BR-27)
  const openScheduleModal = (claim) => {
    setSelectedClaim(claim);
    setScheduleDate(new Date().toISOString().split('T')[0]);
    setScheduleTime('10:00');
    setSelectedTechnicianId(claim.teknisi_pemeriksa_id || (technicians[0]?.id ? String(technicians[0].id) : ''));
    setIsScheduleModalOpen(true);
  };

  // Submit Schedule (BR-26, BR-27)
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleDate) {
      showError('Pilih tanggal pemeriksaan.');
      return;
    }
    if (!selectedTechnicianId) {
      showError('Pilih teknisi pemeriksa.');
      return;
    }

    setActionLoading(true);
    try {
      const isoDatetime = `${scheduleDate}T${scheduleTime}:00+07:00`;
      await api.patch(`/claims/${selectedClaim.id}/schedule`, {
        jadwal_pemeriksaan: isoDatetime,
        teknisi_pemeriksa_id: Number(selectedTechnicianId),
      });
      showSuccess(`Jadwal pemeriksaan klaim ${selectedClaim.kode_klaim} berhasil ditentukan.`);
      setIsScheduleModalOpen(false);
      fetchClaims();
    } catch (err) {
      showError('Gagal menjadwalkan pemeriksaan: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Open Decide Modal
  const openDecideModal = (claim) => {
    setSelectedClaim(claim);
    setDecisionType('disetujui');
    setRejectReason('');
    setIsDecideModalOpen(true);
  };

  // Submit Decision
  const handleDecideSubmit = async (e) => {
    e.preventDefault();
    if (decisionType === 'ditolak' && (!rejectReason.trim() || rejectReason.trim().length < 5)) {
      showError('Alasan penolakan klaim wajib diisi minimal 5 karakter.');
      return;
    }

    setActionLoading(true);
    try {
      await api.patch(`/claims/${selectedClaim.id}/decide`, {
        keputusan: decisionType,
        alasan_penolakan: decisionType === 'ditolak' ? rejectReason.trim() : '',
        biaya_tambahan: 0, // 100% Bebas biaya jika disetujui
      });
      showSuccess(`Klaim ${selectedClaim.kode_klaim} berhasil diputuskan ${decisionType.toUpperCase()}.`);
      setIsDecideModalOpen(false);
      fetchClaims();
    } catch (err) {
      showError('Gagal memutuskan klaim: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Open Inspect Modal
  const openInspectModal = (claim) => {
    setSelectedClaim(claim);
    setInspectNotes(claim.catatan_pemeriksaan || '');
    setIsInspectModalOpen(true);
  };

  const handleInspectSubmit = async (e) => {
    e.preventDefault();
    if (!inspectNotes.trim() || inspectNotes.trim().length < 5) {
      showError('Catatan hasil pemeriksaan wajib diisi minimal 5 karakter.');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/claims/${selectedClaim.id}/inspect`, {
        catatan_pemeriksaan: inspectNotes.trim(),
      });
      showSuccess(`Laporan hasil pemeriksaan ${selectedClaim.kode_klaim} berhasil disimpan.`);
      setIsInspectModalOpen(false);
      fetchClaims();
    } catch (err) {
      showError('Gagal menyimpan hasil pemeriksaan: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Convert to Paid Booking
  const handleConvertToPaid = async (claim) => {
    if (!confirm(`Konversi klaim yang ditolak (${claim.kode_klaim}) menjadi order servis berbayar resmi?`)) {
      return;
    }
    try {
      const res = await api.post(`/claims/${claim.id}/convert-to-paid`, {});
      showSuccess(res.data?.message || 'Tiket booking servis berbayar baru berhasil dibuat.');
      fetchClaims();
    } catch (err) {
      showError('Gagal konversi ke servis berbayar: ' + (err?.response?.data?.error?.message || err?.message));
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 min-w-0">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Manajemen Klaim Garansi Servis
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Penetapan jadwal inspeksi, penugasan teknisi, dan verifikasi klaim garansi pelanggan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => {
              fetchClaims();
              showSuccess('Data klaim garansi berhasil diperbarui.');
            }}
            variant="outline"
            className="rounded-xl border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={cn("w-4 h-4 text-slate-600", loading && "animate-spin text-blue-600")} />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Klaim */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Klaim Terdaftar</span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{kpis.total}</p>
            <p className="text-xs font-medium text-slate-500 mt-1">Seluruh riwayat klaim garansi</p>
          </div>
        </div>

        {/* Menunggu Jadwal */}
        <div className="p-5 rounded-3xl bg-white border border-amber-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Perlu Dijadwalkan</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-800">{kpis.diajukan}</p>
            <p className="text-xs font-medium text-amber-600 mt-1">Menunggu alokasi teknisi & waktu</p>
          </div>
        </div>

        {/* Dijadwalkan / Sedang Diperiksa */}
        <div className="p-5 rounded-3xl bg-white border border-blue-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Sedang Proses Inspeksi</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-blue-800">{kpis.aktif}</p>
            <p className="text-xs font-medium text-blue-600 mt-1">Teknisi ditugaskan ke lokasi</p>
          </div>
        </div>

        {/* Disetujui (100% Gratis) */}
        <div className="p-5 rounded-3xl bg-white border border-emerald-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Klaim Disetujui</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-800">{kpis.disetujui}</p>
            <p className="text-xs font-medium text-emerald-600 mt-1">Bebas biaya pengerjaan & suku cadang</p>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            placeholder="Cari kode klaim, booking, pemesan..."
            aria-label="Cari klaim garansi"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: `Semua (${kpis.total})` },
            { id: 'diajukan', label: `Perlu Jadwal (${kpis.diajukan})` },
            { id: 'dijadwalkan', label: 'Dijadwalkan' },
            { id: 'diperiksa', label: 'Diperiksa' },
            { id: 'disetujui', label: `Disetujui (${kpis.disetujui})` },
            { id: 'ditolak', label: `Ditolak (${kpis.ditolak})` },
          ].map(tab => (
            <Button
              key={tab.id}
              size="sm"
              variant={statusFilter === tab.id ? 'default' : 'outline'}
              onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
              className={`rounded-xl text-xs font-bold cursor-pointer h-9 whitespace-nowrap ${
                statusFilter === tab.id ? 'bg-blue-600 text-white' : 'border-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-5">Kode Klaim & Tiket</th>
                <th className="py-3.5 px-5">Pelanggan & Kontak</th>
                <th className="py-3.5 px-5">Keluhan Garansi</th>
                <th className="py-3.5 px-5">Ulasan & Rating</th>
                <th className="py-3.5 px-5">Pemeriksaan / Teknisi</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Tindakan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    Memuat data klaim garansi...
                  </td>
                </tr>
              ) : paginatedClaims.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    Tidak ada permohonan klaim garansi yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Kode Klaim & Booking */}
                    <td className="py-3.5 px-5">
                      <p className="font-mono font-black text-blue-700 text-sm">{claim.kode_klaim}</p>
                      <p className="font-mono text-slate-500 mt-0.5 text-2xs">Ref: {claim.booking_kode || `#${claim.booking_id}`}</p>
                      <span className="text-2xs text-slate-500 block mt-1">
                        {claim.created_at ? new Date(claim.created_at).toLocaleDateString('id-ID') : '-'}
                      </span>
                    </td>

                    {/* Pelanggan */}
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900">{claim.customer_nama || claim.nama_customer || 'Pelanggan'}</p>
                      <p className="text-slate-500 text-2xs mt-0.5">{claim.kontak || '-'}</p>
                    </td>

                    {/* Keluhan */}
                    <td className="py-3.5 px-5 max-w-xs">
                      <p className="line-clamp-2 text-slate-800 font-semibold" title={claim.keluhan}>
                        "{claim.keluhan}"
                      </p>
                      {claim.alasan_penolakan && (
                        <p className="text-rose-600 text-2xs mt-1 font-bold">
                          Alasan Tolak: {claim.alasan_penolakan}
                        </p>
                      )}
                    </td>

                    {/* Rating & Review (BR-25) */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={cn("w-3 h-3", i < (claim.rating || 5) ? "fill-amber-400 text-amber-400" : "text-slate-300")} 
                          />
                        ))}
                        <span className="text-2xs font-bold text-slate-700 ml-1">({claim.rating || 5}/5)</span>
                      </div>
                      {claim.review_komentar && (
                        <p className="text-2xs text-slate-500 italic mt-0.5 line-clamp-1" title={claim.review_komentar}>
                          "{claim.review_komentar}"
                        </p>
                      )}
                    </td>

                    {/* Info Jadwal & Teknisi */}
                    <td className="py-3.5 px-5">
                      {claim.jadwal_pemeriksaan ? (
                        <div>
                          <p className="font-bold text-slate-800 text-2xs flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600" />
                            {new Date(claim.jadwal_pemeriksaan).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} WIB
                          </p>
                          <p className="text-slate-600 text-2xs mt-0.5">
                            Teknisi: <strong>{claim.teknisi_nama || `Teknisi #${claim.teknisi_pemeriksa_id}`}</strong>
                          </p>
                        </div>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-2xs font-bold">
                          Belum Dijadwalkan
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-5">
                      <Badge 
                        variant={
                          claim.status === 'disetujui' || claim.status === 'selesai' ? 'success' :
                          claim.status === 'ditolak' ? 'destructive' :
                          claim.status === 'diajukan' ? 'warning' : 'info'
                        }
                        className="text-2xs uppercase font-black"
                      >
                        {claim.status}
                      </Badge>
                      {claim.status === 'disetujui' && (
                        <span className="text-emerald-700 font-bold text-[10px] block mt-0.5">
                          100% Bebas Biaya
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        
                        {/* 1. Jadwalkan / Ubah Jadwal */}
                        {claim.status === 'diajukan' && (
                          <Button
                            size="sm"
                            onClick={() => openScheduleModal(claim)}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-2xs font-bold h-7 px-2.5 cursor-pointer shadow-2xs"
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>Jadwalkan Pemeriksaan</span>
                          </Button>
                        )}

                        {/* 2. Catat Hasil Inspeksi Teknisi */}
                        {(claim.status === 'dijadwalkan' || claim.status === 'diperiksa') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openInspectModal(claim)}
                            className="border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-2xs font-bold h-7 px-2 cursor-pointer"
                          >
                            <Wrench className="w-3 h-3 mr-1" />
                            <span>Hasil Inspeksi</span>
                          </Button>
                        )}

                        {/* 3. Keputusan Klaim */}
                        {(claim.status === 'dijadwalkan' || claim.status === 'diperiksa') && (
                          <Button
                            size="sm"
                            onClick={() => openDecideModal(claim)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-2xs font-bold h-7 px-2.5 cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            <span>Putuskan Klaim</span>
                          </Button>
                        )}

                        {/* 4. Konversi Klaim Ditolak ke Servis Berbayar */}
                        {claim.status === 'ditolak' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConvertToPaid(claim)}
                            className="border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-2xs font-bold h-7 px-2 cursor-pointer"
                            title="Konversi menjadi booking servis berbayar resmi"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            <span>Servis Berbayar</span>
                          </Button>
                        )}

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div>
            Menampilkan <strong className="text-slate-900">{filteredClaims.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> - <strong className="text-slate-900">{Math.min(filteredClaims.length, currentPage * itemsPerPage)}</strong> dari <strong className="text-slate-900">{filteredClaims.length}</strong> klaim garansi
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
      {/* MODAL 1: JADWALKAN PEMERIKSAAN KLAIM (BR-26, BR-27)            */}
      {/* ============================================================== */}
      {isScheduleModalOpen && selectedClaim && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Jadwalkan Pemeriksaan Garansi</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedClaim.kode_klaim}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Ketentuan Pemeriksaan Garansi:
              </p>
              <p className="text-2xs text-blue-800">
                Admin wajib menetapkan waktu pemeriksaan dan menugaskan teknisi pemeriksa. Pemeriksaan awal klaim garansi di lokasi 100% bebas biaya bagi pelanggan.
              </p>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tanggal Pemeriksaan:</label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jam Kedatangan:</label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Teknisi Pemeriksa:</label>
                <select
                  value={selectedTechnicianId}
                  onChange={(e) => setSelectedTechnicianId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-xs focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Pilih Teknisi --</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nama} {t.spesialisasi ? `(${t.spesialisasi})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  {actionLoading ? 'Menyimpan...' : 'Tetapkan Jadwal & Teknisi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: KEPUTUSAN KLAIM (BR-28, BR-29, BR-33)                 */}
      {/* ============================================================== */}
      {isDecideModalOpen && selectedClaim && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Keputusan Klaim Garansi</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedClaim.kode_klaim}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDecideModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDecideSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-2">Pilih Keputusan Akhir:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecisionType('disetujui')}
                    className={cn(
                      "p-3 rounded-2xl border text-center font-bold transition-all cursor-pointer",
                      decisionType === 'disetujui' 
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20" 
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <Check className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <span>Disetujui (100% Gratis)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionType('ditolak')}
                    className={cn(
                      "p-3 rounded-2xl border text-center font-bold transition-all cursor-pointer",
                      decisionType === 'ditolak' 
                        ? "bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20" 
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <X className="w-5 h-5 text-rose-600 mx-auto mb-1" />
                    <span>Tolak Klaim</span>
                  </button>
                </div>
              </div>

              {decisionType === 'disetujui' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                  <p className="font-bold">Ketentuan Bebas Biaya Garansi:</p>
                  <p className="text-2xs">
                    Perbaikan klaim garansi yang disetujui tidak mengenakan biaya jasa maupun komponen kepada pelanggan. Durasi garansi asli tidak direset ke nol melainkan melanjutkan sisa masa garansi.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 block">
                    Alasan Penolakan Klaim (Wajib Diisi):
                  </label>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Contoh: Kerusakan bukan akibat hasil servis sebelumnya, melainkan tegangan listrik eksternal..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500"
                    required
                  />
                  <p className="text-2xs text-slate-500">
                    Pelanggan dapat melanjutkan pengerjaan melalui booking servis berbayar.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDecideModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className={cn(
                    "rounded-xl text-xs font-bold text-white",
                    decisionType === 'disetujui' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  )}
                >
                  {actionLoading ? 'Menyimpan...' : `Konfirmasi ${decisionType === 'disetujui' ? 'Setujui' : 'Tolak'}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: CATATAN PEMERIKSAAN TEKNISI                           */}
      {/* ============================================================== */}
      {isInspectModalOpen && selectedClaim && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Hasil Pemeriksaan Teknisi</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedClaim.kode_klaim}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsInspectModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInspectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Catatan Temuan di Lapangan:
                </label>
                <textarea
                  rows={4}
                  value={inspectNotes}
                  onChange={(e) => setInspectNotes(e.target.value)}
                  placeholder="Deskripsikan kondisi pipa, tekanan freon, dan analisis penyebab keluhan..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInspectModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  {actionLoading ? 'Menyimpan...' : 'Simpan Laporan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
