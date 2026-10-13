import { motion } from 'framer-motion';

const easeInOutExpo = [0.87, 0, 0.13, 1];

export default function FloatingOrb({ size = 'w-32 h-32', bg = 'bg-blue-500/10', blur = 'blur-3xl', delay = 0, position = {} }) {
  return (
    <motion.div
      className={`absolute rounded-full ${bg} ${blur} ${size}`}
      style={{ ...position }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        y: [-20, 20, -20]
      }}
      transition={{ 
        duration: 1.5,
        delay,
        ease: easeInOutExpo,
        y: { duration: 6, ease: 'easeInOut', repeat: Infinity }
      }}
    />
  );
}
