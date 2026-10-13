import { motion } from 'framer-motion';

export default function FloatingSparkle({ left, top, size = 'w-1.5 h-1.5', opacity = 0.4, delay = 0 }) {
  return (
    <motion.div
      className={`absolute rounded-full bg-white/40 ${size}`}
      style={{ left, top, opacity }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ 
        opacity: [0.2, 0.6, 0.2],
        scale: [0.5, 1, 0.5]
      }}
      transition={{ 
        duration: 3,
        delay,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    />
  );
}
