import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const easeOutCubic = [0.16, 1, 0.3, 1];

export default function FAQAccordion({ question, answer, index }) {
  const [open, setOpen] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: easeOutCubic }}
      className={`rounded-2xl border transition-all duration-300 ${
        open 
          ? 'bg-blue-50/40 border-blue-200 shadow-sm' 
          : 'bg-white border-slate-100 hover:border-slate-200 shadow-2xs'
      }`}
    >
      <button 
        type="button"
        onClick={() => setOpen(!open)} 
        className="w-full text-left px-5 sm:px-6 py-4 sm:py-5 flex justify-between items-center gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl group"
        aria-expanded={open}
        aria-controls={`faq-answer-${index}`}
        id={`faq-btn-${index}`}
      >
        <span className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
          {question}
        </span>
        <div 
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
            open ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'
          }`}
        >
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>
      
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`faq-answer-${index}`}
            role="region"
            aria-labelledby={`faq-btn-${index}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: easeOutCubic }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-6 pb-5 pt-1 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-blue-100/60 mt-1">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
