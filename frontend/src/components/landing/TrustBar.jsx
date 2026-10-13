import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle2, Wrench, Clock, Award, MapPin } from 'lucide-react';

export default function TrustBar() {
  const trustItems = [
    { icon: ShieldCheck, text: 'Badan Hukum Resmi CV. Nara Teknindotama' },
    { icon: CheckCircle2, text: 'Standar SOP 7 Langkah Pengerjaan' },
    { icon: Wrench, text: 'Peralatan Teknis Bertekanan & Higienis' },
    { icon: Award, text: 'Garansi Pekerjaan Nyata' },
    { icon: MapPin, text: 'Cakupan Layanan Jabodetabek & Sekitarnya' },
    { icon: Clock, text: 'Pelacakan Status Digital Transparan' },
  ];

  return (
    <section className="py-4.5 bg-sky-50/70 border-y border-sky-100 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-y-3 gap-x-6 sm:gap-x-10 text-xs sm:text-sm font-semibold text-slate-700">
          {trustItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 group hover:text-blue-600 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-white border border-sky-200 text-blue-600 flex items-center justify-center shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span>{item.text}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
