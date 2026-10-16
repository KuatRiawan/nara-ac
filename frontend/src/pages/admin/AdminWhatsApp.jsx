import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../components/ui/toast';
import { getErrorMessage } from '../../utils/errors';
import { cn } from '../../lib/utils';
import { 
  MessageSquare, Search, Clock, Bot, UserCheck, Send, RefreshCw, Bell, AlertTriangle, ExternalLink, Calendar, CheckCircle2,
  Settings, Key, Wifi, WifiOff, Copy, Check, Eye, EyeOff, Sparkles, ShieldCheck, ChevronRight, HelpCircle, Smartphone
} from 'lucide-react';
import { useBusinessProfile, buildWhatsAppUrl } from '../../hooks/useBusinessProfile';

export default function AdminWhatsApp() {
  const { error: showError, success: showSuccess } = useToast();
  const { whatsappNumber } = useBusinessProfile();
  
  // Navigation tabs: 'conversations' | 'gateway'
  const [activeTab, setActiveTab] = useState('gateway');

  // Conversations state
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // all | escalated | active
  const [dispatchingReminders, setDispatchingReminders] = useState(false);
  const [reminderResult, setReminderResult] = useState(null);

  // Gateway configuration state
  const [gatewayConfig, setGatewayConfig] = useState({
    provider: 'fonnte',
    api_url: 'https://api.fonnte.com/send',
    api_token: '',
    sender_number: '081385293137',
    admin_whatsapp: '081385293137',
    enabled: true,
    auto_reminder_h1: true,
    auto_invoice: true,
    ai_bot_enabled: true,
  });
  const [loadingGateway, setLoadingGateway] = useState(false);
  const [savingGateway, setSavingGateway] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Test send state
  const [testForm, setTestForm] = useState({
    phone: '',
    message: '[NARA AC TEST] Koneksi API WhatsApp Gateway berhasil terhubung dengan Dashboard Admin CV. Nara Teknindotama.'
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Fetch Conversations
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/whatsapp/conversations');
      const data = res?.data?.data || res?.data || res;
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      showError('Gagal memuat log WhatsApp AI: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Fetch Gateway Configuration
  const fetchGatewayConfig = useCallback(async () => {
    setLoadingGateway(true);
    try {
      const res = await api.get('/whatsapp/gateway-config');
      const data = res?.data?.data || res?.data || res;
      if (data) {
        setGatewayConfig(prev => ({ ...prev, ...data }));
        if (!testForm.phone && data.admin_whatsapp) {
          setTestForm(prev => ({ ...prev, phone: data.admin_whatsapp }));
        }
      }
    } catch (err) {
      showError('Gagal memuat konfigurasi gateway: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setLoadingGateway(false);
    }
  }, [showError, testForm.phone]);

  useEffect(() => {
    fetchConversations();
    fetchGatewayConfig();
  }, [fetchConversations, fetchGatewayConfig]);

  // Handle provider selection change
  const handleProviderChange = (newProvider) => {
    let url = gatewayConfig.api_url;
    if (newProvider === 'fonnte') {
      url = 'https://api.fonnte.com/send';
    } else if (newProvider === 'wablas') {
      url = 'https://bdg.wablas.com/api/send-message';
    }
    setGatewayConfig({
      ...gatewayConfig,
      provider: newProvider,
      api_url: url
    });
  };

  // Save Gateway Configuration
  const handleSaveGateway = async (e) => {
    e.preventDefault();
    setSavingGateway(true);
    try {
      const res = await api.put('/whatsapp/gateway-config', gatewayConfig);
      const savedData = res.data?.data || gatewayConfig;
      setGatewayConfig(prev => ({ ...prev, ...savedData }));
      showSuccess('Konfigurasi Gateway WhatsApp berhasil disimpan.');
    } catch (err) {
      const errMsg = getErrorMessage(err, 'Gagal menyimpan gateway.');
      showError(errMsg);
    } finally {
      setSavingGateway(false);
    }
  };

  // Run Test Message Connection
  const handleTestSend = async (e) => {
    e.preventDefault();
    if (!testForm.phone) {
      return showError('Masukkan nomor WhatsApp tujuan uji coba.');
    }
    if (!gatewayConfig.api_token) {
      return showError('Masukkan API Token di kolom formulir terlebih dahulu.');
    }

    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await api.post('/whatsapp/test-connection', {
        phone: testForm.phone,
        message: testForm.message,
        provider: gatewayConfig.provider,
        api_url: gatewayConfig.api_url,
        api_token: gatewayConfig.api_token
      });
      setTestResult({
        success: true,
        message: res.message || res.data?.message || 'Pesan tes berhasil dikirim.',
        details: res.details || res.data?.details
      });
      // Gateway is now confirmed connected!
      setGatewayConfig(prev => ({ ...prev, enabled: true }));
      showSuccess(res.message || res.data?.message || 'Koneksi API WhatsApp berhasil terhubung!');
    } catch (err) {
      const errMsg = getErrorMessage(err, 'Koneksi ke gateway WhatsApp gagal.');
      setTestResult({
        success: false,
        message: errMsg
      });
      showError('Uji coba kirim pesan gagal: ' + errMsg);
    } finally {
      setTestingConnection(false);
    }
  };

  // Copy Webhook URL
  const handleCopyWebhook = () => {
    const webhookUrl = `${window.location.origin.replace(':5173', ':5000')}/api/v1/whatsapp/webhook`;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    showSuccess('URL Webhook disalin ke clipboard');
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  // KPIs
  const kpis = useMemo(() => {
    let escalated = 0;
    conversations.forEach(c => {
      if (c.escalated_to_admin) escalated++;
    });
    return {
      total: conversations.length,
      escalated,
      aiHandled: conversations.length - escalated,
    };
  }, [conversations]);

  // Filtered
  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter(c => {
      if (filterMode === 'escalated' && !c.escalated_to_admin) return false;
      if (filterMode === 'active' && c.escalated_to_admin) return false;
      if (!q) return true;

      return (
        (c.phone_number && c.phone_number.includes(q)) ||
        (c.last_message && c.last_message.toLowerCase().includes(q))
      );
    });
  }, [conversations, search, filterMode]);

  // Dispatch Reminders (BR-47)
  const handleDispatchReminders = async () => {
    setDispatchingReminders(true);
    setReminderResult(null);
    try {
      const res = await api.post('/whatsapp/dispatch-reminders', {});
      const data = res?.data?.data || res?.data || res;
      setReminderResult(data);
      showSuccess(res.data?.message || 'Pengingat WhatsApp H-1 dan berkala berhasil dikirim.');
    } catch (err) {
      showError('Gagal mengirimkan pengingat WhatsApp: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setDispatchingReminders(false);
    }
  };

  const isGatewayConnected = Boolean(gatewayConfig.enabled && gatewayConfig.api_token);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 min-w-0">
      
      {/* Title & Top Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Pusat Integrasi &amp; Gateway WhatsApp CS
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Command Center Admin untuk mengelola koneksi API WhatsApp, monitoring bot AI, dan broadcast pengingat servis.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1 bg-white rounded-2xl border border-slate-200/80 shadow-2xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('conversations')}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'conversations'
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Log Chat &amp; Eskalasi</span>
          </button>
          <button
            onClick={() => setActiveTab('gateway')}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'gateway'
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Settings className="w-4 h-4" />
            <span>Koneksi API &amp; Gateway</span>
            {isGatewayConnected ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-0.5" title="Gateway Terhubung" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400 ml-0.5" title="Perlu Pengaturan Token" />
            )}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: LOG PERCAKAPAN & ESKALASI CS                            */}
      {/* ============================================================== */}
      {activeTab === 'conversations' && (
        <div className="space-y-6">
          {/* Top Actions for Conversations */}
          <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2",
                isGatewayConnected ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"
              )}>
                {isGatewayConnected ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-amber-600" />}
                <span>{isGatewayConnected ? `Gateway Aktif (${gatewayConfig.provider?.toUpperCase()})` : 'Gateway Belum Diatur (Mode Simulasi)'}</span>
              </div>
              <span className="text-xs text-slate-500 hidden md:inline">
                Nomor Resmi: <strong>{gatewayConfig.sender_number || whatsappNumber}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                onClick={handleDispatchReminders}
                disabled={dispatchingReminders}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                title="Kirim pengingat servis H-1 dan perawatan berkala 3-4 bulan"
              >
                <Bell className="w-4 h-4" />
                <span>{dispatchingReminders ? 'Mengirim...' : 'Kirim Pengingat H-1 &amp; Berkala'}</span>
              </Button>

              <Button
                onClick={() => {
                  fetchConversations();
                  showSuccess('Log percakapan WhatsApp berhasil diperbarui.');
                }}
                variant="outline"
                className="rounded-xl border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={cn("w-4 h-4 text-slate-600", loading && "animate-spin text-blue-600")} />
                <span>Segarkan</span>
              </Button>
            </div>
          </div>

          {/* Reminder Result Banner */}
          {reminderResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3 text-xs animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Pengingat WhatsApp Berhasil Dikirimkan:</span>
                <p className="mt-0.5">
                  • Pengingat Servis H-1 Terkirim: <strong>{reminderResult.h_minus_1_sent || 0}</strong> pesan
                </p>
                <p>
                  • Pengingat Servis Berkala (3-4 Bulan) Terkirim: <strong>{reminderResult.periodic_reminders_sent || 0}</strong> pesan
                </p>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Percakapan */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Percakapan Tercatat</span>
                <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{kpis.total}</p>
                <p className="text-xs font-medium text-slate-500 mt-1">Interaksi via WhatsApp Gateway</p>
              </div>
            </div>

            {/* Eskalasi Admin Manusia */}
            <div className="p-5 rounded-3xl bg-white border border-rose-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Eskalasi Admin Manusia</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-rose-800">{kpis.escalated}</p>
                <p className="text-xs font-medium text-rose-600 mt-1">Memerlukan penanganan admin segera</p>
              </div>
            </div>

            {/* AI CS Handled */}
            <div className="p-5 rounded-3xl bg-white border border-emerald-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Dikelola Otomatis AI</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Bot className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-800">{kpis.aiHandled}</p>
                <p className="text-xs font-medium text-emerald-600 mt-1">Pengecekan slot &amp; panduan SOP otomatis</p>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                placeholder="Cari nomor HP, potongan pesan..."
                aria-label="Cari percakapan WhatsApp"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={filterMode === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterMode('all')}
                className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${
                  filterMode === 'all' ? 'bg-blue-600 text-white' : 'border-slate-200 text-slate-600'
                }`}
              >
                Semua ({kpis.total})
              </Button>
              <Button
                size="sm"
                variant={filterMode === 'escalated' ? 'default' : 'outline'}
                onClick={() => setFilterMode('escalated')}
                className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${
                  filterMode === 'escalated' ? 'bg-rose-600 text-white' : 'border-slate-200 text-slate-600'
                }`}
              >
                Eskalasi Admin ({kpis.escalated})
              </Button>
              <Button
                size="sm"
                variant={filterMode === 'active' ? 'default' : 'outline'}
                onClick={() => setFilterMode('active')}
                className={`rounded-xl text-xs font-bold cursor-pointer h-9 ${
                  filterMode === 'active' ? 'bg-emerald-600 text-white' : 'border-slate-200 text-slate-600'
                }`}
              >
                Otomatis AI ({kpis.aiHandled})
              </Button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3.5 px-5">Nomor WhatsApp Pelanggan</th>
                    <th className="py-3.5 px-5">Pesan Terakhir Masuk</th>
                    <th className="py-3.5 px-5">Waktu Update</th>
                    <th className="py-3.5 px-5">Penanganan (Status)</th>
                    <th className="py-3.5 px-5 text-right">Aksi Tindak Lanjut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredConversations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                        {loading ? 'Memuat data percakapan...' : 'Tidak ada percakapan WhatsApp yang cocok dengan filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredConversations.map((c) => {
                      const isEscalated = c.escalated_to_admin;
                      return (
                        <tr key={c.id || c.sender} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-5 font-mono font-bold text-slate-800">
                            {c.phone_number || c.sender}
                          </td>
                          <td className="py-4 px-5 text-slate-600 max-w-xs truncate" title={c.last_message || c.message}>
                            {c.last_message || c.message || '-'}
                          </td>
                          <td className="py-4 px-5 text-slate-400">
                            {c.last_interaction_at || c.created_at ? new Date(c.last_interaction_at || c.created_at).toLocaleString('id-ID') : '-'}
                          </td>
                          <td className="py-4 px-5">
                            {isEscalated ? (
                              <Badge variant="destructive" className="font-bold text-2xs uppercase">
                                Eskalasi ke Admin
                              </Badge>
                            ) : (
                              <Badge variant="success" className="font-bold text-2xs uppercase">
                                Ditangani AI
                              </Badge>
                            )}
                          </td>
                          <td className="py-4 px-5 text-right">
                            <a
                              href={buildWhatsAppUrl(c.phone_number || c.sender, 'Halo, ini Tim Admin Nara AC merespons pesan WhatsApp Anda.')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-2xs border border-emerald-200 transition-colors"
                            >
                              <span>Buka Chat WA</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: KONEKSI API & GATEWAY WHATSAPP (TOOLS LENGKAP)           */}
      {/* ============================================================== */}
      {activeTab === 'gateway' && (
        <div className="grid gap-6 lg:grid-cols-7">
          
          {/* Main Config Form (Span 4) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900 text-sm">Konfigurasi Gateway WhatsApp API</h2>
                    <p className="text-xs text-slate-500">Hubungkan server Nara AC dengan penyedia gateway resmi</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-white">
                  <span className={cn("w-2 h-2 rounded-full", isGatewayConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400")} />
                  <span className={isGatewayConnected ? "text-emerald-700" : "text-amber-700"}>
                    {isGatewayConnected ? "Terhubung" : "Belum Terhubung"}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveGateway} className="p-6 space-y-5">
                {/* 1. Pilih Provider */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Penyedia Layanan (Provider Gateway)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'fonnte', label: 'Fonnte', desc: 'Rekomendasi Indonesia' },
                      { id: 'wablas', label: 'Wablas', desc: 'Enterprise Server' },
                      { id: 'twilio', label: 'Twilio', desc: 'Global API' },
                      { id: 'custom', label: 'Kustom / Baileys', desc: 'Self-hosted' }
                    ].map((p) => {
                      const isSelected = gatewayConfig.provider === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleProviderChange(p.id)}
                          className={cn(
                            "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                            isSelected
                              ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-900"
                              : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100 text-slate-700"
                          )}
                        >
                          <p className="font-black text-xs">{p.label}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{p.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Endpoint API URL */}
                <div>
                  <label htmlFor="wa-api-url" className="block text-xs font-bold text-slate-700 mb-1">
                    API Endpoint URL *
                  </label>
                  <Input
                    id="wa-api-url"
                    type="url"
                    required
                    value={gatewayConfig.api_url}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, api_url: e.target.value })}
                    placeholder="https://api.fonnte.com/send"
                    className="h-10 text-xs font-mono font-medium rounded-xl border-slate-200 bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    URL endpoint pengiriman pesan yang disediakan oleh dashboard provider Anda.
                  </p>
                </div>

                {/* 3. API Token / Secret Key */}
                <div>
                  <label htmlFor="wa-api-token" className="block text-xs font-bold text-slate-700 mb-1">
                    API Token / Secret Key *
                  </label>
                  <div className="relative">
                    <Input
                      id="wa-api-token"
                      type={showToken ? 'text' : 'password'}
                      value={gatewayConfig.api_token}
                      onChange={(e) => setGatewayConfig({ ...gatewayConfig, api_token: e.target.value })}
                      placeholder="Masukkan Token API WhatsApp dari dashboard provider"
                      className="pr-10 h-10 text-xs font-mono font-medium rounded-xl border-slate-200 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Token ini disimpan terenkripsi di database settings dan digunakan untuk mengotentikasi webhook.
                  </p>
                </div>

                {/* 4. Nomor WhatsApp Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="wa-sender-number" className="block text-xs font-bold text-slate-700 mb-1">
                      Nomor WA Pengirim Resmi (Nara AC)
                    </label>
                    <Input
                      id="wa-sender-number"
                      type="text"
                      value={gatewayConfig.sender_number}
                      onChange={(e) => setGatewayConfig({ ...gatewayConfig, sender_number: e.target.value })}
                      placeholder="081385293137"
                      className="h-10 text-xs font-mono font-medium rounded-xl border-slate-200 bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="wa-admin-number" className="block text-xs font-bold text-slate-700 mb-1">
                      Nomor WA Admin Penerima Eskalasi *
                    </label>
                    <Input
                      id="wa-admin-number"
                      type="text"
                      required
                      value={gatewayConfig.admin_whatsapp}
                      onChange={(e) => setGatewayConfig({ ...gatewayConfig, admin_whatsapp: e.target.value })}
                      placeholder="081385293137"
                      className="h-10 text-xs font-mono font-medium rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                </div>

                {/* 5. Otomasi Toggles */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <p className="text-xs font-bold text-slate-800">Otomasi Alur WhatsApp Sistem:</p>

                  <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 cursor-pointer hover:bg-slate-100/60 transition-colors">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Kirim E-Invoice Otomatis ke WhatsApp</span>
                      <span className="text-[11px] text-slate-500">Kirim salinan invoice saat pembayaran diverifikasi admin.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={gatewayConfig.auto_invoice}
                      onChange={(e) => setGatewayConfig({ ...gatewayConfig, auto_invoice: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 cursor-pointer hover:bg-slate-100/60 transition-colors">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Pengingat Servis H-1 Otomatis</span>
                      <span className="text-[11px] text-slate-500">Kirim jadwal kunjungan ke pelanggan H-1 sebelum teknisi tiba.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={gatewayConfig.auto_reminder_h1}
                      onChange={(e) => setGatewayConfig({ ...gatewayConfig, auto_reminder_h1: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 cursor-pointer hover:bg-slate-100/60 transition-colors">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Asisten AI Chatbot WhatsApp Aktif</span>
                      <span className="text-[11px] text-slate-500">Merespons ketersediaan jadwal &amp; katalog servis otomatis.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={gatewayConfig.ai_bot_enabled}
                      onChange={(e) => setGatewayConfig({ ...gatewayConfig, ai_bot_enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Save Button */}
                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={savingGateway || loadingGateway}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl h-11 px-6 shadow-md shadow-blue-600/20 cursor-pointer text-xs flex items-center gap-2"
                  >
                    <span>{savingGateway ? 'Menyimpan...' : 'Simpan Konfigurasi Gateway'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Col: Webhook & Test Message Tool (Span 3) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Tool 1: Live Diagnostic Test Send Message */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-emerald-50/60 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-xs sm:text-sm">Uji Coba Kirim Pesan WhatsApp</h2>
                  <p className="text-[11px] text-slate-500">Verifikasi koneksi API secara real-time</p>
                </div>
              </div>

              <form onSubmit={handleTestSend} className="p-5 space-y-4">
                <div>
                  <label htmlFor="test-phone" className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp Tujuan Uji Coba *
                  </label>
                  <Input
                    id="test-phone"
                    type="text"
                    required
                    value={testForm.phone}
                    onChange={(e) => setTestForm({ ...testForm, phone: e.target.value })}
                    placeholder="081234567890"
                    className="h-10 text-xs font-mono font-bold rounded-xl border-slate-200 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Masukkan nomor HP aktif Anda sendiri untuk melihat pesan masuk.</p>
                </div>

                <div>
                  <label htmlFor="test-message" className="block text-xs font-bold text-slate-700 mb-1">
                    Isi Pesan Uji Coba
                  </label>
                  <textarea
                    id="test-message"
                    rows="3"
                    required
                    value={testForm.message}
                    onChange={(e) => setTestForm({ ...testForm, message: e.target.value })}
                    className="block w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={testingConnection || !gatewayConfig.api_token}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl h-10 text-xs shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testingConnection ? 'Mengirim Pesan Tes...' : 'Kirim Pesan Uji Coba Sekarang'}</span>
                </Button>

                {!gatewayConfig.api_token && (
                  <p className="text-[11px] text-amber-600 font-medium text-center">
                    ⚠️ Harap masukkan API Token di form kiri dan simpan sebelum melakukan tes.
                  </p>
                )}

                {/* Test Result Feedback */}
                {testResult && (
                  <div className={cn(
                    "p-3.5 rounded-2xl border text-xs space-y-1 animate-in fade-in",
                    testResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                      : "bg-rose-50 border-rose-200 text-rose-950"
                  )}>
                    <div className="flex items-center gap-2 font-bold">
                      {testResult.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Status: 200 OK (Terhubung)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <span>Status: Gagal Terhubung</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed">{testResult.message}</p>
                  </div>
                )}
              </form>
            </div>

            {/* Tool 2: Webhook Endpoint Integration Info */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-sky-50/60 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-xs sm:text-sm">Webhook Callback URL</h2>
                  <p className="text-[11px] text-slate-500">Untuk menerima pesan masuk WhatsApp pelanggan</p>
                </div>
              </div>

              <div className="p-5 space-y-3.5 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Salin tautan webhook ini ke menu <strong>Webhook Settings</strong> pada dashboard provider WhatsApp Anda (Fonnte / Wablas):
                </p>

                <div className="p-3 rounded-2xl bg-slate-900 text-sky-300 font-mono text-[11px] break-all flex items-center justify-between gap-2 border border-slate-800">
                  <span>{`${window.location.origin.replace(':5173', ':5000')}/api/v1/whatsapp/webhook`}</span>
                  <button
                    type="button"
                    onClick={handleCopyWebhook}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                    title="Salin Webhook URL"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500 space-y-1">
                  <p className="font-bold text-slate-800">Metode Webhook:</p>
                  <p>• HTTP Method: <strong className="text-slate-900 font-mono">POST</strong></p>
                  <p>• Content-Type: <strong className="text-slate-900 font-mono">application/json</strong></p>
                  <p>• Format Payload: <code className="text-slate-700 font-mono">{`{ "sender": "0812...", "message": "halo" }`}</code></p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
