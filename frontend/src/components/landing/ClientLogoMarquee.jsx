import React from 'react';

// Kalibrasi optical sizing per logo agar ukuran visual seimbang, proporsional & jelas terbaca
const clientLogos = [
  {
    src: '/images/clients/permata-bank.webp?v=2',
    alt: 'Permata Bank',
    // Logo horizontal panjang: berikan ruang tinggi & lebar maksimal agar teks jelas dan tegas
    className: 'max-h-11 sm:max-h-12 max-w-[170px] sm:max-w-[195px]',
  },
  {
    src: '/images/clients/resik-cemerlang.webp?v=2',
    alt: 'Resik Cemerlang',
    // Logo horizontal: diperbesar agar proporsional sejajar dengan logo lainnya
    className: 'max-h-11 sm:max-h-12 max-w-[160px] sm:max-w-[185px]',
  },
  {
    src: '/images/clients/sunat-rusunda.png?v=2',
    alt: 'Klinik Pratama Sunat Rusunda',
    className: 'max-h-10 sm:max-h-11 max-w-[125px] sm:max-w-[150px]',
  },
  {
    src: '/images/clients/vtrans.png?v=2',
    alt: 'VTrans',
    className: 'max-h-10 sm:max-h-11 max-w-[95px] sm:max-w-[115px]',
  },
  {
    src: '/images/clients/badan-gizi-nasional.png?v=2',
    alt: 'Badan Gizi Nasional',
    className: 'max-h-11 sm:max-h-12 max-w-[50px] sm:max-w-[58px]',
  },
  {
    src: '/images/clients/ana-global-solution.png?v=2',
    alt: 'Ana Global Solution',
    className: 'max-h-10 sm:max-h-11 max-w-[125px] sm:max-w-[150px]',
  },
  {
    src: '/images/clients/logicore-indo-techno.png?v=2',
    alt: 'Logicore Indo Techno',
    className: 'max-h-10 sm:max-h-11 max-w-[120px] sm:max-w-[145px]',
  },
  {
    src: '/images/clients/alana-beauty-bar.webp?v=2',
    alt: 'Alana Beauty Bar',
    className: 'max-h-10 sm:max-h-11 max-w-[120px] sm:max-w-[145px]',
  },
  {
    src: '/images/clients/bandar-aneka-teknik.png?v=2',
    alt: 'Bandar Aneka Teknik',
    className: 'max-h-11 sm:max-h-12 max-w-[50px] sm:max-w-[58px]',
  },
  {
    src: '/images/clients/farabi-ichsan-transindo.jpg?v=2',
    alt: 'Farabi Ichsan Transindo',
    className: 'max-h-10 sm:max-h-11 max-w-[160px] sm:max-w-[185px]',
  },
  {
    src: '/images/clients/asephi.webp?v=2',
    alt: 'ASEPHI',
    className: 'max-h-10 sm:max-h-11 max-w-[120px] sm:max-w-[145px]',
  },
  {
    src: '/images/clients/amrita-mahesa-prima.png?v=2',
    alt: 'Amrita Mahesa Prima',
    className: 'max-h-11 sm:max-h-12 max-w-[50px] sm:max-w-[58px]',
  },
  {
    src: '/images/clients/comeumrah.png?v=2',
    alt: 'Come Umrah',
    className: 'max-h-10 sm:max-h-11 max-w-[155px] sm:max-w-[180px]',
  },
  {
    src: '/images/clients/elektro-mini.png?v=2',
    alt: 'Elektro Mini',
    className: 'max-h-9 sm:max-h-10 max-w-[175px] sm:max-w-[205px]',
  },
];

export default function ClientLogoMarquee() {
  // Gandakan list untuk infinite seamless loop running ticker
  const displayLogos = [...clientLogos, ...clientLogos];

  return (
    <section className="py-6 sm:py-8 bg-slate-50/50 backdrop-blur-xs border-y border-slate-100 overflow-hidden relative">
      {/* Gradient mask on left and right edges for smooth fading */}
      <div className="absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-slate-50 via-slate-50/80 to-transparent z-10 pointer-events-none" />

      <div className="w-full overflow-hidden">
        <div className="animate-marquee flex items-center gap-4 sm:gap-6">
          {displayLogos.map((logo, index) => (
            <div
              key={index}
              className="flex items-center justify-center h-18 sm:h-20 w-44 sm:w-56 px-4 py-2.5 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:shadow-md hover:border-sky-300 hover:scale-102 transition-all duration-300 shrink-0 group"
            >
              <img
                src={logo.src}
                alt=""
                loading="lazy"
                className={`${logo.className} w-auto h-auto object-contain opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
