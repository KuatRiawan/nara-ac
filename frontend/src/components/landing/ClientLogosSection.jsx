import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Building2, ShieldCheck, FileCheck, CheckCircle2 } from 'lucide-react';

const easeOutCubic = [0.16, 1, 0.3, 1];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOutCubic },
  },
};

function ClientLogosSection() {
  const clients = useMemo(() => [
    {
      id: 'permata',
      name: 'Bank Permata',
      shortName: 'Bank Permata',
      sector: 'Perbankan Nasional',
      logo: '/images/clients/bank-permata.webp',
      alt: 'Logo Bank Permata - Klien Korporat CV. Nara Teknindotama',
    },
    {
      id: 'asephi',
      name: 'PT. ASEPHI',
      shortName: 'PT. ASEPHI',
      sector: 'Asosiasi Industri & Ekspor',
      logo: '/images/clients/pt-asephi.webp',
      alt: 'Logo PT. ASEPHI - Klien Korporat CV. Nara Teknindotama',
    },
    {
      id: 'amrita',
      name: 'PT. Amrita Mahesa Prima',
      shortName: 'PT. Amrita Mahesa Prima',
      sector: 'Konstruksi & Properti',
      logo: '/images/clients/pt-amrita-mahesa-prima.avif',
      alt: 'Logo PT. Amrita Mahesa Prima - Klien Korporat CV. Nara Teknindotama',
    },
    {
      id: 'bati',
      name: 'PT. Bandar Aneka Teknik Indonesia',
      shortName: 'PT. BATI',
      sector: 'Rekayasa Teknik & Industri',
      logo: '/images/clients/pt-bandar-aneka-teknik-indonesia.png',
      alt: 'Logo PT. Bandar Aneka Teknik Indonesia (BATI) - Klien CV. Nara Teknindotama',
    },
    {
      id: 'juritsu',
      name: 'PT. Juritsu (Jiritsu)',
      shortName: 'PT. Juritsu (Jiritsu)',
      sector: 'Kontraktor & Bangunan',
      logo: '/images/clients/pt-juritsu.png',
      alt: 'Logo PT. Juritsu (Jiritsu) - Klien Korporat CV. Nara Teknindotama',
    },
    {
      id: 'resik',
      name: 'PT. Resik Cemerlang',
      shortName: 'Resik Cemerlang',
      sector: 'Facility Management',
      logo: '/images/clients/resik-cemerlang.png',
      alt: 'Logo Resik Cemerlang - Klien Korporat CV. Nara Teknindotama',
    },
  ], []);

  return (
    <section id="klien-kami" className="py-20 bg-gradient-to-b from-sky-50/60 via-white to-sky-50/30 border-y border-sky-100 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-blue-200/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-sky-200/25 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: easeOutCubic }}
          >
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest border border-blue-200 mb-3 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-blue-600" /> Klien & Mitra Korporat
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Dipercaya Perusahaan & Instansi Ternama
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Dari perbankan nasional, pengembang properti, hingga manajemen fasilitas komersial—<strong>CV. Nara Teknindotama</strong> dipercaya menjaga efisiensi sistem pendingin udara mitra bisnis kami tetap andal dan sejuk.
            </p>
          </motion.div>
        </div>

        {/* Client Logos Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 items-stretch"
        >
          {clients.map((client) => (
            <motion.div
              key={client.id}
              variants={itemVariants}
              whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2, ease: easeOutCubic } }}
              className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-400 hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between items-center text-center relative"
            >
              {/* Logo Area */}
              <div className="w-full h-20 sm:h-22 flex items-center justify-center p-2 mb-3 bg-slate-50/50 rounded-xl border border-slate-100 group-hover:bg-white group-hover:border-sky-100 transition-colors">
                <img
                  src={client.logo}
                  alt={client.alt}
                  loading="lazy"
                  className="max-h-14 sm:max-h-16 w-auto max-w-[90%] object-contain filter contrast-105 group-hover:scale-105 transition-all duration-300"
                />
              </div>

              {/* Company Info */}
              <div className="w-full">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1" title={client.name}>
                  {client.shortName}
                </h3>
                <span className="inline-block mt-1 text-[11px] font-medium text-slate-500 bg-slate-100/80 group-hover:bg-blue-50 group-hover:text-blue-700 px-2.5 py-0.5 rounded-full transition-colors truncate max-w-full">
                  {client.sector}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Corporate Collaboration Value Props Strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: easeOutCubic }}
          className="mt-12 p-5 sm:p-6 rounded-2xl bg-white border border-sky-200/80 shadow-md shadow-sky-900/5 grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-sky-100"
        >
          <div className="flex items-start gap-3.5 pt-3 md:pt-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Legalitas & Invoice Resmi</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Faktur resmi CV. Nara Teknindotama untuk pelaporan pertanggungjawaban operasional instansi.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 pt-3 md:pt-0 md:pl-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Kontrak Pemeliharaan Rutin</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Skema kontrak berkala (MoU) dengan SLA respon cepat dan rekap berkala riwayat unit AC.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 pt-3 md:pt-0 md:pl-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Standar Keselamatan & SOP</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Teknisi profesional berpakaian rapi, proteksi ruangan rapat/kantor, dan zero-mess cleanup.
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

export default memo(ClientLogosSection);
