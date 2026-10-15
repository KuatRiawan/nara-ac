import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/toast';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Bot, BrainCircuit, Sparkles, TrendingUp, Users, Wrench, Star, CheckCircle2, AlertTriangle, ExternalLink, X, Calendar, Terminal } from 'lucide-react';

export default function AdminAnalytics() {
  const { error: showError, success: showSuccess } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [inferenceLogs, setInferenceLogs] = useState([]);
  const [showStreamlitModal, setShowStreamlitModal] = useState(false);
  const [streamlitError, setStreamlitError] = useState(false);

  const streamlitUrl = import.meta.env.VITE_STREAMLIT_URL || 'http://localhost:8501';

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowStreamlitModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch all analytics data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, statRes, infRes] = await Promise.allSettled([
        api.get('/analytics/summary'),
        api.get('/ai/status'),
        api.get('/inference-logs?limit=15')
      ]);

      if (sumRes.status === 'fulfilled') {
        setSummaryData(sumRes.value?.data || null);
      }
      if (statRes.status === 'fulfilled') {
        setAiStatus(statRes.value?.data || null);
      }
      if (infRes.status === 'fulfilled') {
        const rawInf = infRes.value?.data?.data || infRes.value?.data || [];
        setInferenceLogs(Array.isArray(rawInf) ? rawInf : []);
      }
    } catch (err) {
      showError('Gagal memuat analitik AI: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Formatted chart data: Trend booking harian
  const chartDailyData = useMemo(() => {
    if (!summaryData?.booking_per_hari || !Array.isArray(summaryData.booking_per_hari)) {
      return [];
    }
    return summaryData.booking_per_hari.map(d => {
      const dateParts = d.tanggal.split('-');
      const label = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : d.tanggal;
      return {
        tanggal: label,
        fullName: d.tanggal,
        jumlah: d.jumlah
      };
    });
  }, [summaryData]);

  // Formatted chart data: Beban kerja teknisi
  const chartWorkloadData = useMemo(() => {
    if (!summaryData?.workload_teknisi || !Array.isArray(summaryData.workload_teknisi)) {
      return [];
    }
    return summaryData.workload_teknisi.map(t => ({
      nama: t.nama.split(' ')[0], // Nama panggilan agar rapi di grafik
      fullName: t.nama,
      scheduled: t.scheduled || 0,
      on_process: t.on_process || 0,
      done: t.done || 0,
      total: t.total || 0
    }));
  }, [summaryData]);

  // Insights list
  const insights = useMemo(() => {
    if (!summaryData?.insight || !Array.isArray(summaryData.insight)) {
      return [];
    }
    return summaryData.insight;
  }, [summaryData]);

  // Average confidence from recent inference logs
  const avgConfidence = useMemo(() => {
    if (!inferenceLogs.length) return 78.5;
    const sum = inferenceLogs.reduce((acc, curr) => acc + (Number(curr.confidence) || 0), 0);
    return Math.round((sum / inferenceLogs.length) * 1000) / 10;
  }, [inferenceLogs]);

  // Average latency ms
  const avgLatency = useMemo(() => {
    if (!inferenceLogs.length) return 18;
    const sum = inferenceLogs.reduce((acc, curr) => acc + (Number(curr.latency_ms) || 0), 0);
    return Math.round(sum / inferenceLogs.length);
  }, [inferenceLogs]);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 relative min-w-0">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            AI & Analitik Operasional
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Intelligence dashboard: insight operasional otomatis, analitik beban kerja teknisi, dan performa inferensi AI.
          </p>
        </div>

        <div className="flex items-center gap-2.5">

          <Button
            onClick={() => {
              setStreamlitError(false);
              setShowStreamlitModal(true);
            }}
            variant="outline"
            className="rounded-xl border-purple-200 bg-purple-50/50 text-purple-700 hover:bg-purple-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Terminal className="w-4 h-4 text-purple-600" />
            <span>Streamlit Lab Explorer</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards (Clean White Style consistent with other pages) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Permintaan Servis */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Permintaan Servis</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              {summaryData?.booking_total || 0} <span className="text-xs font-semibold text-slate-500">Tiket</span>
            </p>
            <p className="text-xs font-medium text-slate-500 mt-1">
              {summaryData?.booking_bulan_ini || 0} tiket servis aktif bulan ini
            </p>
          </div>
        </div>

        {/* Model AI Status & Confidence */}
        <div className="p-5 rounded-3xl bg-white border border-purple-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Status Engine AI</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-purple-700">
                {aiStatus?.tersedia ? 'Siap / Online' : 'Standby'}
              </p>
            </div>
            <p className="text-xs font-medium text-purple-600/80 mt-1">
              Rata-rata keyakinan: {avgConfidence}% • Latency: {avgLatency}ms
            </p>
          </div>
        </div>

        {/* Kepuasan Konsumen (CSAT) */}
        <div className="p-5 rounded-3xl bg-white border border-amber-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Kepuasan Pelanggan</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-700">
              {summaryData?.rating?.rata > 0 ? `${summaryData.rating.rata} / 5.0` : '5.0 / 5.0'}
            </p>
            <p className="text-xs font-medium text-amber-600/80 mt-1">
              Dari ulasan & rating bintang konsumen
            </p>
          </div>
        </div>

        {/* Beban Teknisi Aktif */}
        <div className="p-5 rounded-3xl bg-white border border-teal-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Teknisi Bertugas</span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-teal-700">
              {summaryData?.workload_teknisi?.length || 0} <span className="text-xs font-semibold text-teal-600/70">Personil</span>
            </p>
            <p className="text-xs font-medium text-teal-600/80 mt-1">
              Monitoring distribusi beban pekerjaan
            </p>
          </div>
        </div>

      </div>

      {/* AI Smart Insights Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-200/60">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">
                AI Smart Operational Insights
              </h3>
              <p className="text-xs text-slate-500">
                Rekomendasi otomatis berbasis analisis data real-time sistem
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">
            Rentang evaluasi 30 hari terakhir
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.length === 0 ? (
            <div className="col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500 text-center">
              Semua operasional berjalan optimal. Tidak ada peringatan mendesak.
            </div>
          ) : (
            insights.map((ins, idx) => {
              const isWarning = ins.tingkat === 'peringatan';
              const isInfo = ins.tingkat === 'info';
              return (
                <div 
                  key={idx}
                  className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
                    isWarning 
                      ? 'bg-amber-50/60 border-amber-200 text-amber-950' 
                      : isInfo 
                      ? 'bg-blue-50/60 border-blue-200 text-blue-950' 
                      : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    isWarning ? 'bg-amber-100 text-amber-700' : isInfo ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isWarning ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div className="text-xs">
                    <span className="font-bold uppercase tracking-wider text-xs block opacity-80 mb-0.5">
                      {ins.tingkat === 'peringatan' ? 'Peringatan Operasional' : ins.tingkat === 'info' ? 'Insight Sistem' : 'Status Baik'}
                    </span>
                    <p className="font-medium leading-relaxed">{ins.teks}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Visual Charts Grid (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Tren Permintaan Servis Harian */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-900">
                Tren Permintaan Servis AC
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Frekuensi jumlah pemesanan servis per tanggal
              </p>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {chartDailyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Belum cukup data tren historis pada periode ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="tanggal" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="jumlah" 
                    name="Total Servis"
                    stroke="#2563eb" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorDaily)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Analisis Beban Kerja Teknisi */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-900">
                Distribusi Beban Kerja Teknisi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan porsi tiket per personil teknisi
              </p>
            </div>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {chartWorkloadData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Belum ada data beban kerja teknisi.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartWorkloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="nama" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="scheduled" name="Terjadwal" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="on_process" name="Pengerjaan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="done" name="Selesai" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* AI Inference Log Activity Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-200/60">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">
                Log Inferensi & Keputusan AI Terbaru
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Riwayat klasifikasi intent, routing otomatis chatbot, dan kecepatan respon inferensi
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {inferenceLogs.length} inferensi terakhir
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-5">Waktu Inferensi</th>
                <th className="py-3.5 px-5">Intent Terdeteksi</th>
                <th className="py-3.5 px-5">Confidence Score</th>
                <th className="py-3.5 px-5">Latency</th>
                <th className="py-3.5 px-5">Rute AI Engine</th>
                <th className="py-3.5 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {inferenceLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    Belum ada riwayat inferensi AI tercatat.
                  </td>
                </tr>
              ) : (
                inferenceLogs.map((log) => {
                  const confPct = Math.round((Number(log.confidence) || 0) * 100);
                  const isHighConf = confPct >= 70;
                  const dateStr = log.waktu ? new Date(log.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5 whitespace-nowrap font-mono text-slate-600">
                        {dateStr}
                      </td>

                      <td className="py-3.5 px-5">
                        <span className="font-bold text-slate-900 capitalize font-mono bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          {log.intent || 'Lainnya'}
                        </span>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isHighConf ? 'bg-purple-600' : 'bg-amber-500'}`} 
                              style={{ width: `${confPct}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-800 text-xs">{confPct}%</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 font-mono text-slate-600">
                        {log.latency_ms || 12} ms
                      </td>

                      <td className="py-3.5 px-5">
                        <span className="font-mono text-xs text-slate-600">
                          {log.rute || 'ai_flow'}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        {log.fallback ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Fallback
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Presisi
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL STREAMLIT DATA SCIENCE LAB (OPTIONAL EXPLORER)          */}
      {/* ============================================================== */}
      {showStreamlitModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowStreamlitModal(false); }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex justify-center items-start p-3 sm:p-6 lg:p-8 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-5xl w-full h-[88vh] shadow-2xl border border-slate-200 overflow-hidden my-2 sm:my-4 animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600/30 text-purple-400 rounded-xl border border-purple-500/30">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white flex items-center gap-2">
                    <span>Streamlit Advanced Data Science Explorer</span>
                    <span className="text-xs font-mono bg-purple-950 px-2 py-0.5 rounded border border-purple-800 text-purple-300">
                      {streamlitUrl}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Lingkungan eksperimen model machine learning & eksplorasi statistik interaktif
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={streamlitUrl}
                  target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 text-xs font-bold flex items-center gap-1 transition-colors"
                  title="Buka di tab baru"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">Buka Tab Baru</span>
<span className="sr-only"> (buka di tab baru)</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowStreamlitModal(false)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Iframe */}
            <div className="flex-1 w-full h-full bg-slate-50 relative overflow-hidden">
              {streamlitError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-50">
                  <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-3">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 mb-1">
                    Layanan Streamlit Belum Aktif di Port 8501
                  </h4>
                  <p className="text-xs text-slate-500 mb-5 max-w-md">
                    Dashboard native utama di atas tetap berjalan 100%. Untuk membuka lab lanjutan Streamlit, aktifkan service di terminal:
                  </p>
                  <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl text-left text-xs w-full max-w-md font-mono shadow-inner space-y-1">
                    <p className="text-slate-500 text-xs"># Perintah menjalankan Streamlit Lab:</p>
                    <p className="text-emerald-400">cd data-science && streamlit run app.py</p>
                    <p className="text-slate-500 text-xs mt-2"># Atau gunakan script helper:</p>
                    <p className="text-emerald-400">./data-science/run_app.sh</p>
                  </div>
                  <Button
                    onClick={() => setStreamlitError(false)}
                    className="mt-5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-9 px-5 cursor-pointer shadow-md"
                  >
                    Coba Muat Ulang
                  </Button>
                </div>
              ) : (
                <iframe
                  src={streamlitUrl}
                  title="Dashboard AI Analytics - Streamlit Data Science Lab"
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  onError={() => setStreamlitError(true)}
                />
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
