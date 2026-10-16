import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import CompanyLogo from '../components/CompanyLogo';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/toast';
import { Star, MessageSquare, CheckCircle2, ArrowLeft, Loader2, ShieldCheck, User, Wrench, Sparkles, HeartHandshake, Check, AlertCircle, FileText, Clock } from 'lucide-react';

export default function FeedbackPage() {
  const { kode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const feedbackToken = new URLSearchParams(location.search).get('token') || '';
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Form states
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState(['❄️ AC Dingin Maksimal', '👨‍🔧 Teknisi Ramah & Sopan', '🛠️ Kerja Rapi & Bersih']);
  const [komentar, setKomentar] = useState('');
  const [kontak, setKontak] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const quickTags = [
    '❄️ AC Dingin Maksimal',
    '⏱️ Tepat Waktu',
    '🛠️ Kerja Rapi & Bersih',
    '👨‍🔧 Teknisi Ramah & Sopan',
    '📋 Penjelasan Teknis Jelas',
    '💰 Biaya Sesuai & Transparan',
    '🛡️ Garansi Terjamin',
    '🧹 Area Sekitar Tetap Kering'
  ];

  // Fetch booking details on mount
  useEffect(() => {
    async function loadBookingData() {
      if (!kode) {
        setFetchError('Kode tiket tidak ditemukan.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError('');
      try {
        const res = await api.get(`/public/bookings/${encodeURIComponent(kode.trim().toUpperCase())}`);
        const data = res.data || res;
        setBooking(data);
        setKontak('');
      } catch (err) {
        setFetchError(err?.response?.data?.error?.message || err?.message || 'Kode booking tidak ditemukan.');
      } finally {
        setLoading(false);
      }
    }

    loadBookingData();
  }, [kode]);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const getRatingEmotion = (val) => {
    switch (val) {
      case 1:
        return { text: 'Sangat Mengecewakan', emoji: '😞', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' };
      case 2:
        return { text: 'Kurang Memuaskan', emoji: '🙁', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' };
      case 3:
        return { text: 'Cukup Baik & Berfungsi', emoji: '😐', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
      case 4:
        return { text: 'Memuaskan & Rapi', emoji: '🙂', color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' };
      case 5:
      default:
        return { text: 'Sangat Puas & AC Dingin Maksimal!', emoji: '🤩', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    }
  };

  const activeRating = hoverRating || rating;
  const ratingEmotion = getRatingEmotion(activeRating);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!booking) return;

    if (!rating || rating < 1) {
      setSubmitError('Silakan pilih rating bintang terlebih dahulu.');
      return;
    }

    if (!feedbackToken && (!kontak || kontak.trim().length < 6)) {
      setSubmitError('Mohon masukkan nomor WhatsApp yang sesuai saat booking untuk verifikasi kepemilikan tiket.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Format comment with selected tags
      const tagPrefix = selectedTags.length > 0 ? `[Apresiasi: ${selectedTags.join(', ')}] ` : '';
      const finalComment = `${tagPrefix}${komentar.trim()}`.trim();

      await api.post(`/bookings/${booking.id}/feedback`, {
        kode_booking: booking.kode_booking,
        feedback_token: feedbackToken || undefined,
        kontak: kontak.trim() || undefined,
        rating,
        komentar: finalComment
      });

      setIsSuccess(true);
      showSuccessToast('Terima kasih! Ulasan Anda berhasil disimpan.');
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.error?.message || err?.message || 'Gagal mengirim ulasan. Periksa kembali nomor kontak Anda.';
      setSubmitError(msg);
      showErrorToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/60 via-slate-50 to-white font-sans flex flex-col text-slate-800">
      
      {/* ============================================================== */}
      {/* 1. TOP NAVBAR                                                 */}
      {/* ============================================================== */}
      <header className="bg-white/90 backdrop-blur-md border-b border-sky-100/80 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-18 flex justify-between items-center">
          <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
            <CompanyLogo iconSize="h-8" />
          </Link>

          <div className="flex items-center gap-2.5">
            {kode && (
              <Link to={`/status/${kode}`}>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Status Tiket</span>
                </Button>
              </Link>
            )}

            <Link to="/">
              <Button 
                variant="outline" 
                size="sm"
                className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Beranda</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN CONTENT                                                */}
      {/* ============================================================== */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">

        {/* LOADING STATE */}
        {loading && (
          <div className="text-center py-20 bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-black text-slate-900">Memuat Data Tiket Servis...</h3>
            <p className="text-xs text-slate-500 mt-1">Mengambil rincian pekerjaan dan teknisi NARA AC.</p>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && fetchError && (
          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-rose-200 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Tiket Servis Tidak Ditemukan</h2>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              {fetchError}
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/status">
                <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5">
                  Lacak Tiket Lain
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold px-5">
                  Kembali ke Beranda
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ALREADY SUBMITTED FEEDBACK STATE */}
        {!loading && booking && booking.sudah_feedback && !isSuccess && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-emerald-200 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black uppercase tracking-wider mb-2 border border-emerald-200">
              Ulasan Sudah Terkirim
            </span>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Terima Kasih atas Penilaian Anda!</h2>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Ulasan Anda untuk tiket <strong>{booking.kode_booking}</strong> telah tersimpan dalam sistem evaluasi kualitas CV. Nara Teknindotama.
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs mb-6 space-y-1.5">
              <p className="text-slate-500"><strong>Layanan:</strong> {booking.layanan}</p>
              <p className="text-slate-500"><strong>Teknisi:</strong> {booking.teknisi_lengkap || booking.teknisi || '-'}</p>
              <p className="text-emerald-700 font-bold"><strong>Status Garansi:</strong> Perlindungan Garansi Dingin Aktif</p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link to={`/status/${booking.kode_booking}`}>
                <Button className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6">
                  Lihat Tiket & E-Invoice
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full sm:w-auto rounded-xl border-slate-200 text-slate-700 text-xs font-bold px-6">
                  Kembali ke Beranda
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* NOT DONE YET WARNING */}
        {!loading && booking && !booking.sudah_feedback && booking.status !== 'done' && (
          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-amber-200 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-wider mb-2">
              Servis Sedang Berjalan
            </span>
            <h2 className="text-xl font-black text-slate-900 mb-2">Pekerjaan Belum Selesai</h2>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Ulasan kepuasan baru dapat diberikan setelah teknisi menyelesaikan pekerjaan servis di lokasi (status tiket: <strong>SELESAI</strong>).
            </p>
            <div className="flex justify-center gap-3">
              <Link to={`/status/${booking.kode_booking}`}>
                <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6">
                  Pantau Status Pengerjaan
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold px-5">
                  Kembali
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* SUCCESS STATE AFTER SUBMISSION */}
        {isSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-emerald-200 text-center max-w-lg mx-auto"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-inner relative">
              <div className="absolute inset-0 rounded-full bg-emerald-200 animate-ping opacity-30" />
              <CheckCircle2 className="w-10 h-10 relative z-10" />
            </div>
            
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Ulasan Diterima
            </span>

            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              Terima Kasih Banyak!
            </h2>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Penilaian Anda sangat berharga bagi <strong>CV. Nara Teknindotama</strong> untuk terus menjaga kualitas pengerjaan dan kepuasan pelanggan.
            </p>

            {rating <= 2 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-amber-950 leading-relaxed">
                  <p className="font-bold mb-0.5">Komitmen Evaluasi Layanan (SOP NARA AC)</p>
                  <p>
                    Kami memohon maaf atas ketidaknyamanan yang dialami. Sesuai standar operasional kami, laporan ulasan ini telah diteruskan dengan prioritas tinggi ke manajemen untuk segera ditindaklanjuti dan dicarikan solusi terbaik bagi Anda.
                  </p>
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 text-left text-xs mb-8 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              <p className="text-sky-900 leading-relaxed">
                Garansi servis untuk unit AC Anda tetap aktif. Jika membutuhkan konsultasi pasca-servis, tim teknis kami siap membantu 24 Jam.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link to={`/status/${booking?.kode_booking || kode}`}>
                <Button className="w-full sm:w-auto h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer">
                  Lihat Tiket & E-Invoice
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full sm:w-auto h-11 px-6 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer">
                  Halaman Utama
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* MAIN FEEDBACK FORM */}
        {!loading && booking && !booking.sudah_feedback && booking.status === 'done' && !isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header Title */}
            <div className="text-center max-w-xl mx-auto mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider border border-blue-200 mb-3">
                <HeartHandshake className="w-3.5 h-3.5" /> Ulasan Kepuasan Servis
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
                Bagaimana Hasil Servis AC Anda?
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm">
                Bantu kami memberikan layanan pendingin udara terbaik dengan memberikan penilaian untuk tiket{' '}
                <strong className="text-blue-600 font-mono font-bold tracking-wide">{booking.kode_booking}</strong>
              </p>
            </div>

            {/* Service & Technician Context Summary Card */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-600/20 shrink-0">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                    {booking.layanan || 'Servis AC'}
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Customer: <strong>{booking.customer_nama}</strong> • {booking.alamat}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-2xl border sm:border-0 border-slate-200 w-full sm:w-auto text-left sm:text-right">
                <span className="text-xs uppercase font-bold text-slate-500 block tracking-wider">Teknisi Bertugas:</span>
                <p className="text-xs font-black text-slate-800 mt-0.5 flex items-center sm:justify-end gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>{booking.teknisi_lengkap || booking.teknisi || 'Teknisi NARA AC'}</span>
                </p>
                <span className="text-xs text-emerald-600 font-bold block mt-0.5">✓ Terverifikasi SOP 7 Langkah</span>
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200/80">
              
              {submitError && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{submitError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* 1. STAR RATING SECTION */}
                <div className="text-center py-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">
                    Beri Penilaian Bintang
                  </span>

                  <div className="flex justify-center items-center gap-2 sm:gap-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 sm:p-2 rounded-2xl hover:bg-amber-50/50 transition-all transform hover:scale-115 active:scale-95 cursor-pointer focus:outline-none"
                        aria-label={`Beri bintang ${star}`}
                      >
                        <Star
                          className={cn(
                            "w-10 h-10 sm:w-14 sm:h-14 transition-all duration-200",
                            (hoverRating || rating) >= star
                              ? "fill-amber-400 text-amber-400 drop-shadow-md scale-105"
                              : "fill-slate-100 text-slate-200 hover:text-slate-300"
                          )}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Emotion Pill Badge */}
                  <div className="h-10 mt-4 flex items-center justify-center">
                    <span className={cn(
                      "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold border transition-all duration-300 shadow-xs",
                      ratingEmotion.bg,
                      ratingEmotion.color
                    )}>
                      <span className="text-base">{ratingEmotion.emoji}</span>
                      <span>{ratingEmotion.text}</span>
                    </span>
                  </div>
                </div>

                {/* 2. QUICK APPRECIATION TAGS */}
                <div className="pt-6 border-t border-slate-100" role="group" aria-labelledby="feedback-tags-label">
                  <label id="feedback-tags-label" className="text-xs font-bold text-slate-900 block mb-2">
                    Apa yang paling memuaskan dari servis kami? (Pilih satu atau lebih):
                  </label>
                  <p className="text-xs text-slate-500 mb-3.5">
                    Klik tag untuk menandai hal-hal positif yang Anda rasakan selama pengerjaan.
                  </p>

                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {quickTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={cn(
                            "px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer",
                            isSelected
                              ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/20 scale-[1.02]"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          )}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. COMMENT TEXTAREA */}
                <div className="pt-6 border-t border-slate-100">
                  <label htmlFor="feedback-komentar" className="text-xs font-bold text-slate-900 flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      Ulasan & Catatan Tambahan (Opsional)
                    </span>
                    <span className="text-xs font-normal text-slate-500 font-mono">
                      {komentar.length}/400 Karakter
                    </span>
                  </label>
                  <textarea
                    id="feedback-komentar"
                    rows={4}
                    maxLength={400}
                    value={komentar}
                    onChange={(e) => setKomentar(e.target.value)}
                    placeholder="Ceritakan kepuasan Anda mengenai ketepatan waktu, kebersihan saat mencuci AC, keramahan teknisi, atau hasil pendinginan..."
                    className="w-full rounded-2xl border border-slate-200 p-4 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-y"
                  />
                </div>

                {/* 4. SECURITY VERIFICATION CONTACT */}
                <div className="pt-6 border-t border-slate-100">
                  {feedbackToken ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold">Tautan Resmi Terverifikasi</p>
                        <p className="text-emerald-700 text-[11px] mt-0.5">
                          Ulasan ini terhubung secara aman dengan tiket servis Anda via token kepemilikan tunggal (single-use).
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label htmlFor="feedback-kontak" className="text-xs font-bold text-slate-900 block mb-1">
                        Verifikasi Nomor WhatsApp Pelanggan *
                      </label>
                      <p className="text-xs text-slate-500 mb-2.5">
                        Pastikan nomor WhatsApp sesuai dengan nomor pemesanan tiket untuk memvalidasi keaslian ulasan.
                      </p>
                      <Input
                        id="feedback-kontak"
                        type="tel"
                        required
                        value={kontak}
                        onChange={(e) => setKontak(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        className="h-11 rounded-xl text-xs font-mono font-bold"
                      />
                    </>
                  )}
                </div>

                {/* SUBMIT BUTTON */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting || rating === 0}
                    className="w-full h-13 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Mengirimkan Ulasan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Kirim Ulasan Resmi NARA AC</span>
                      </>
                    )}
                  </Button>
                  <p className="text-center text-xs text-slate-500 mt-2.5">
                    Ulasan Anda akan dipublikasikan secara anonim demi menjaga kerahasiaan data pribadi.
                  </p>
                </div>

              </form>

            </div>

          </motion.div>
        )}

      </main>

      {/* ============================================================== */}
      {/* 3. FOOTER                                                      */}
      {/* ============================================================== */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>&copy; {new Date().getFullYear()} CV. Nara Teknindotama. Seluruh hak cipta dilindungi.</p>
          <div className="flex items-center gap-3 font-medium">
            <Link to="/terms" className="hover:text-blue-600 transition-colors">
              Syarat &amp; Ketentuan
            </Link>
            <span className="text-slate-300">&bull;</span>
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">
              Kebijakan Privasi
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
