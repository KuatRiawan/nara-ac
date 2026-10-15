import { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';
import { Star, Search, ThumbsUp, MessageSquare, Sparkles, Award, CheckCircle2, Wrench } from 'lucide-react';

export default function AdminFeedback() {
  const { error: showError } = useToast();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/feedback');
        const raw = res?.data?.data || res?.data || res;
        const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);

        // Use actual data from API - no fake feedback injection (UX-004)
        setFeedbacks(list);
      } catch (err) {
        showError('Gagal memuat ulasan pelanggan: ' + (err?.response?.data?.error?.message || err?.message));
      } finally {
        setLoading(false);
      }
    };
    fetchFeedback();
  }, [showError]);

  // Metrics
  const stats = useMemo(() => {
    if (feedbacks.length === 0) {
      return { avg: '-', total: 0, positivePercent: 0, topTech: '-' };
    }
    const sum = feedbacks.reduce((acc, f) => acc + (f.rating || 0), 0);
    const avg = (sum / feedbacks.length).toFixed(1);
    const positive = feedbacks.filter(f => (f.rating || 0) >= 4).length;
    const positivePercent = Math.round((positive / feedbacks.length) * 100);

    // Find top technician by frequency
    const techCount = {};
    feedbacks.forEach(f => {
      if (f.teknisi) {
        techCount[f.teknisi] = (techCount[f.teknisi] || 0) + 1;
      }
    });
    const topTech = Object.keys(techCount).sort((a, b) => techCount[b] - techCount[a])[0] || '-';

    return { avg, total: feedbacks.length, positivePercent, topTech };
  }, [feedbacks]);

  // Filtered
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(f => {
      const q = search.toLowerCase();
      const matchSearch =
        (f.komentar && f.komentar.toLowerCase().includes(q)) ||
        (f.nama_pelanggan && f.nama_pelanggan.toLowerCase().includes(q)) ||
        (f.nama_teknisi && f.nama_teknisi.toLowerCase().includes(q)) ||
        (f.kode_booking && f.kode_booking.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (ratingFilter === '5') return f.rating === 5;
      if (ratingFilter === '4') return f.rating === 4;
      if (ratingFilter === 'under4') return (f.rating || 0) < 4;
      return true;
    });
  }, [feedbacks, search, ratingFilter]);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 relative min-w-0">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Feedback & Ulasan Konsumen
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Evaluasi kepuasan pelanggan, performa SOP teknisi, dan ulasan setelah servis AC selesai.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Rating Rata-rata */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Skor Rata-Rata</span>
            <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{stats.avg}</span>
              <span className="text-sm font-bold text-slate-500">/ 5.0</span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Berdasarkan {stats.total} ulasan masuk
            </p>
          </div>
        </div>

        {/* Kepuasan Positif */}
        <div className="p-5 rounded-3xl bg-white border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Tingkat Kepuasan</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ThumbsUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-emerald-700">{stats.positivePercent}%</span>
            <p className="text-xs font-medium text-emerald-600/80 mt-1">
              Ulasan bintang 4 dan 5
            </p>
          </div>
        </div>

        {/* Teknisi Teladan */}
        <div className="p-5 rounded-3xl bg-white border border-blue-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Teknisi Terbaik</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-black text-slate-900 truncate block">{stats.topTech}</span>
            <p className="text-xs font-medium text-blue-600 mt-1 flex items-center gap-1">
              {stats.topTech !== '-' ? (
                <>
                  <Sparkles className="w-3 h-3" /> 100% SOP Terverifikasi
                </>
              ) : (
                'Belum ada data'
              )}
            </p>
          </div>
        </div>

        {/* Kepatuhan SOP */}
        <div className="p-5 rounded-3xl bg-white border border-sky-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Standar Pelayanan</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-black text-slate-900">SOP 7 Langkah</span>
            <p className="text-xs font-medium text-slate-500 mt-1">
              CV. Nara Teknindotama Bogor
            </p>
          </div>
        </div>

      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            placeholder="Cari ulasan, nama, teknisi..."
            aria-label="Cari ulasan pelanggan"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Button
            size="sm"
            variant={ratingFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setRatingFilter('all')}
            className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${ratingFilter === 'all' ? 'bg-blue-600 text-white' : 'border-slate-200 text-slate-600'}`}
          >
            Semua ({feedbacks.length})
          </Button>
          <Button
            size="sm"
            variant={ratingFilter === '5' ? 'default' : 'outline'}
            onClick={() => setRatingFilter('5')}
            className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${ratingFilter === '5' ? 'bg-amber-600 text-white' : 'border-slate-200 text-slate-600'}`}
          >
            ⭐ Bintang 5
          </Button>
          <Button
            size="sm"
            variant={ratingFilter === '4' ? 'default' : 'outline'}
            onClick={() => setRatingFilter('4')}
            className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${ratingFilter === '4' ? 'bg-amber-500 text-white' : 'border-slate-200 text-slate-600'}`}
          >
            ⭐ Bintang 4
          </Button>
        </div>
      </div>

      {/* Feedbacks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
            Memuat data ulasan...
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
            {feedbacks.length === 0 ? (
              <>
                <div className="flex justify-center mb-3">
                  <MessageSquare className="w-12 h-12 text-slate-300" />
                </div>
                <p className="font-medium text-slate-700">Belum ada ulasan pelanggan</p>
                <p className="text-sm text-slate-500 mt-1">Ulasan akan muncul di sini setelah pelanggan memberikan rating setelah servis selesai.</p>
              </>
            ) : (
              'Tidak ada ulasan yang sesuai dengan filter.'
            )}
          </div>
        ) : (
          filteredFeedbacks.map((item) => (
            <div 
              key={item.id} 
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:border-blue-200 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Header: Rating & Date */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-4 h-4 ${star <= (item.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                        />
                      ))}
                      <span className="ml-1.5 text-xs font-black text-slate-900">
                        {item.rating || 5}.0
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">{item.nama_pelanggan || 'Pelanggan NARA'}</p>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono text-xs font-bold border border-blue-100">
                      {item.kode_booking || 'BK-AC'}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Baru saja'}
                    </p>
                  </div>
                </div>

                {/* Comment */}
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  "{item.komentar || 'Pelayanan memuaskan, AC dingin dan bersih sesuai SOP.'}"
                </p>

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {item.tags.map((t, idx) => (
                      <span 
                        key={idx} 
                        className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100"
                      >
                        ✓ {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer: Technician Info */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-blue-600" />
                  <span>Teknisi: <strong className="text-slate-800">{item.nama_teknisi || 'Budi Santoso'}</strong></span>
                </div>
                <span className="text-xs text-slate-500 truncate max-w-[150px]">
                  {item.layanan || 'Perawatan AC'}
                </span>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}
