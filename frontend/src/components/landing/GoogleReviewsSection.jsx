import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ExternalLink, CheckCircle2, MessageSquare, Quote, ArrowRight } from 'lucide-react';

const GOOGLE_MAPS_URL = 'https://www.google.com/maps/place/Service+AC+Nara+Teknindotama/@-6.3587548,106.9460659,927m/data=!3m1!1e3!4m8!3m7!1s0x2e69932ab723295b:0xeca4e9694a09a439!8m2!3d-6.3587548!4d106.9509368!9m1!1b1!16s%2Fg%2F11xfrqt1p8?entry=ttu';

const easeOutCubic = [0.16, 1, 0.3, 1];

const GoogleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

const reviewsData = [
  {
    id: 1,
    name: 'Alas Nuwoyo',
    badge: 'Local Guide · 52 ulasan',
    avatar: '/images/reviews/alas-nuwoyo.png',
    rating: 5,
    date: 'Setahun lalu',
    comment: 'Pilihan terbaik untuk servis AC! Tim teknisi yang sangat berpengalaman dan profesional, harga yang kompetitif, dan pelayanan yang sangat baik. Pak Yusuf sebagai pemiliknya juga sangat responsif dan peduli dengan kebutuhan pelanggan. Puas banget dengan hasil servis AC di Narateknindotama dan akan rekomendasiin kepada siapa aja yang butuh servis AC yang andal dan berkualitas. Mantap!'
  },
  {
    id: 2,
    name: 'Vita Chotimah Pasha',
    badge: '2 ulasan',
    avatar: '/images/reviews/vita-chotimah.png',
    rating: 5,
    date: 'Setahun lalu',
    comment: 'Pelayanannya super cepat, pengerjaannya juga oke banget, rapih, bersih, harga juga bersahabat, bakalan pake lagi sih kalo service nya bagus gini👍🏻'
  },
  {
    id: 3,
    name: 'Ririani',
    badge: '6 ulasan',
    avatar: '/images/reviews/ririani.png',
    rating: 5,
    date: '4 bulan lalu',
    comment: 'Fast respon, good service.. Untuk harga affordable👍'
  },
  {
    id: 4,
    name: 'hendrik fendi',
    badge: '1 ulasan',
    avatar: '/images/reviews/hendrik-fendi.png',
    rating: 5,
    date: 'Setahun lalu',
    comment: 'Saya sangat puas dengan layanan servis AC di Narateknindotama! Tim teknisi mereka sangat ramah dan berpengalaman, menjelaskan setiap langkah servis dengan detail. Pak Yusuf sebagai pemiliknya juga sangat responsif dan peduli dengan kebutuhan pelanggan. Harga yang ditawarkan juga sangat kompetitif. Saya akan merekomendasikan Narateknindotama kepada siapa saja yang membutuhkan servis AC yang andal dan berkualitas.'
  },
  {
    id: 5,
    name: 'Jala Sukma',
    badge: '1 ulasan',
    avatar: '/images/reviews/jala-sukma.png',
    rating: 5,
    date: 'Setahun lalu',
    comment: 'Ini servis yang kedua kalinya menggunakan jasa Nara Teknindotama utk pembersihan AC. Teknisinya informatif dan cekatan. Thank you ya 🙂'
  }
];

export default function GoogleReviewsSection() {
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (id) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  return (
    <section id="ulasan" className="py-24 bg-gradient-to-b from-white via-sky-50/30 to-white relative border-t border-sky-100/60 overflow-hidden">
      {/* Background soft glow accents */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-100/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 -right-20 w-96 h-96 bg-amber-100/30 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header with Google Rating Badge */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: easeOutCubic }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-xs mb-4"
          >
            <GoogleIcon className="w-4 h-4" />
            <span className="text-xs font-bold text-slate-800 tracking-wide">Ulasan Resmi Google Maps</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-extrabold text-emerald-700">100% Puas</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.6, ease: easeOutCubic }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4"
          >
            Kata Mereka tentang <span className="text-blue-600">NARA AC</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.6, ease: easeOutCubic }}
            className="text-slate-600 text-base sm:text-lg leading-relaxed"
          >
            Ulasan nyata dan terverifikasi langsung dari pelanggan hunian residensial serta perkantoran di Google Maps.
          </motion.p>

          {/* Rating Summary Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5, ease: easeOutCubic }}
            className="mt-8 p-4 sm:p-5 rounded-2xl bg-white border border-sky-100 shadow-lg shadow-blue-900/5 max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center shrink-0">
                <span className="font-mono text-xl font-black text-amber-700 leading-none">5.0</span>
                <div className="flex text-amber-500 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>

              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-slate-900">Rating Sempurna Google</h4>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Berdasarkan seluruh ulasan publik di Google Business
                </p>
              </div>
            </div>

            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-blue-200 shrink-0 cursor-pointer"
            >
              <GoogleIcon className="w-3.5 h-3.5" />
              <span>Lihat di Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </motion.div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviewsData.map((rev, index) => (
            <motion.div
              key={rev.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: index * 0.08, duration: 0.55, ease: easeOutCubic }}
              whileHover={{ y: -6, transition: { duration: 0.25, ease: easeOutCubic } }}
              className={`relative bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 hover:border-blue-300 hover:shadow-xl shadow-blue-900/5 transition-all duration-300 flex flex-col justify-between ${index === 0 ? 'md:col-span-2 lg:col-span-1 border-blue-100 bg-gradient-to-b from-sky-50/40 via-white to-white' : ''
                }`}
            >
              {/* Quote watermark */}
              <Quote className="absolute top-5 right-5 w-8 h-8 text-sky-100 -rotate-12 pointer-events-none" />

              <div>
                {/* Author Info Header */}
                <div className="flex items-center gap-3.5 mb-4 relative z-10">
                  {rev.avatar && !imageErrors[rev.id] ? (
                    <img
                      src={rev.avatar}
                      alt={rev.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => handleImageError(rev.id)}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                      {rev.name.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{rev.name}</h4>
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" title="Reviewer Terverifikasi" />
                    </div>
                    {rev.badge && (
                      <span className="text-[11px] font-medium text-slate-500 block truncate">
                        {rev.badge}
                      </span>
                    )}
                  </div>

                  <GoogleIcon className="w-4 h-4 shrink-0 opacity-80" />
                </div>

                {/* Stars and Relative Date */}
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <div className="flex items-center gap-0.5">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    {rev.date}
                  </span>
                </div>

                {/* Comment Text */}
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                  "{rev.comment}"
                </p>
              </div>

              {/* Bottom footer badge */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ulasan Terverifikasi
                </span>
                <span>Google Maps</span>
              </div>
            </motion.div>
          ))}

          {/* Interactive Card: Write a Review / View All */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: 0.4, duration: 0.55, ease: easeOutCubic }}
            className="bg-gradient-to-br from-blue-600 via-sky-600 to-blue-700 rounded-3xl p-6 sm:p-7 text-white flex flex-col justify-between shadow-xl shadow-blue-600/20"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-4 border border-white/20">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-xl font-black tracking-tight mb-2">Pernah Menggunakan Servis NARA AC?</h4>
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                Kepuasan Anda adalah prioritas utama kami. Bagikan pengalaman servis AC Anda dan bantu pelanggan lain memilih layanan terbaik.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/15 space-y-2.5">
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-sky-50 text-blue-700 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <span>Beri Ulasan di Google</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Lihat Seluruh Ulasan di Maps</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
