import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, X, CheckCircle2, Sparkles, Camera } from 'lucide-react';

const easeOutCubic = [0.16, 1, 0.3, 1];

export default function GallerySection() {
  const [activePhoto, setActivePhoto] = useState(null);

  const galleryItems = useMemo(() => [
    {
      id: 1,
      src: '/images/gallery/1.jpg',
      title: 'Proteksi & Cuci Indoor Evaporator',
      tag: 'SOP Evaporator',
      desc: 'Pemasangan plastik terpal pelindung dinding untuk mencegah cipratan air saat evaporator dicuci bersih.'
    },
    {
      id: 2,
      src: '/images/gallery/2.jpg',
      title: 'Pembersihan Filter Udara Mendalam',
      tag: 'Filter Udara',
      desc: 'Pencucian filter indoor hingga bebas debu mikro dan jamur agar sirkulasi udara kembali higienis.'
    },
    {
      id: 3,
      src: '/images/gallery/3.jpg',
      title: 'Pengukuran Tekanan Freon Digital / Manifold',
      tag: 'Cek Refrigeran',
      desc: 'Pengecekan akurat tekanan freon R32/R410A untuk mendeteksi dini kebocoran atau kekurangan sirkulasi.'
    },
    {
      id: 4,
      src: '/images/gallery/4.jpg',
      title: 'Pembersihan Unit Kondensor Outdoor',
      tag: 'Unit Outdoor',
      desc: 'Semprotan air bertekanan terkontrol pada kisi-kisi kondensor luar guna membuang panas kompresor optimal.'
    },
    {
      id: 5,
      src: '/images/gallery/5.jpg',
      title: 'Perakitan & Penguncian Cover Presisi',
      tag: 'Finishing Unit',
      desc: 'Pemasangan kembali cover indoor dengan teliti, memastikan sensor receiver dan swing motor berfungsi normal.'
    },
    {
      id: 6,
      src: '/images/gallery/6.jpg',
      title: 'Running Test & Verifikasi Suhu Dingin',
      tag: 'Quality Control',
      desc: 'Pengujian performa pendinginan pasca-servis untuk menjamin hembusan udara sejuk dan debit air lancar.'
    }
  ], []);

  return (
    <section id="galeri" className="py-24 bg-sky-50/40 text-slate-900 relative overflow-hidden border-t border-sky-100/60">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-sky-200/30 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOutCubic }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-widest mb-4">
            <Camera className="w-3.5 h-3.5" /> Dokumentasi Nyata
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 mb-5">
            Bukti Nyata Pengerjaan <span className="bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 bg-clip-text text-transparent">Teknisi NARA AC</span>
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed font-normal">
            Setiap pengerjaan dilakukan langsung oleh teknisi internal dengan seragam resmi, peralatan khusus pendingin, dan SOP proteksi area kerja.
          </p>
        </motion.div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {galleryItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.6, ease: easeOutCubic }}
              viewport={{ once: true, margin: '-50px' }}
              onClick={() => setActivePhoto(item)}
              className="group relative bg-white rounded-3xl overflow-hidden border border-sky-100 hover:border-blue-300 shadow-md hover:shadow-xl shadow-blue-500/5 transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <img
                  src={item.src}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-40 group-hover:opacity-20 transition-opacity" />
                
                <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-md text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-sky-100 shadow-md">
                  <Sparkles className="w-3 h-3 text-blue-500" /> {item.tag}
                </span>

                <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md">
                  <Eye className="w-4 h-4" />
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-sky-100 flex items-center gap-2 text-xs text-blue-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Standar Dokumentasi Foto NARA AC
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Modal Lightbox */}
        <AnimatePresence>
          {activePhoto && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePhoto(null)}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative"
              >
                <button
                  onClick={() => setActivePhoto(null)}
                  className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-slate-950/80 text-white hover:bg-white hover:text-slate-900 transition-colors flex items-center justify-center cursor-pointer shadow-lg"
                  aria-label="Tutup preview"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="relative aspect-[16/10] bg-black">
                  <img
                    src={activePhoto.src}
                    alt={activePhoto.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-6 bg-slate-900">
                  <span className="inline-block text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
                    {activePhoto.tag}
                  </span>
                  <h3 className="text-xl font-bold text-white mb-2">{activePhoto.title}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{activePhoto.desc}</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
