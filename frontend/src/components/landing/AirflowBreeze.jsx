import { motion, useReducedMotion } from 'framer-motion';

export default function AirflowBreeze() {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return null;
  }

  // Atmospheric flow lines representing fresh, clean air circulating
  const breezeStreams = [
    {
      id: 1,
      d: 'M -100,60 C 200,20 500,120 900,40 C 1200,-20 1500,80 1800,30',
      stroke: 'url(#breeze-gradient-1)',
      strokeWidth: 2,
      duration: 12,
      delay: 0,
      opacity: 0.45,
    },
    {
      id: 2,
      d: 'M -150,110 C 150,80 450,160 850,90 C 1150,40 1450,130 1750,70',
      stroke: 'url(#breeze-gradient-2)',
      strokeWidth: 1.5,
      duration: 15,
      delay: 2,
      opacity: 0.35,
    },
    {
      id: 3,
      d: 'M -80,160 C 250,130 550,210 950,140 C 1250,90 1550,170 1850,110',
      stroke: 'url(#breeze-gradient-1)',
      strokeWidth: 1.8,
      duration: 18,
      delay: 4,
      opacity: 0.25,
    },
  ];

  // Micro cool air floating particles
  const particles = [
    { id: 1, x: '12%', y: '25%', size: 4, delay: 0, duration: 6 },
    { id: 2, x: '28%', y: '45%', size: 3, delay: 1.5, duration: 8 },
    { id: 3, x: '45%', y: '20%', size: 5, delay: 0.8, duration: 7 },
    { id: 4, x: '65%', y: '35%', size: 3, delay: 2.2, duration: 9 },
    { id: 5, x: '82%', y: '50%', size: 4, delay: 3, duration: 7.5 },
    { id: 6, x: '92%', y: '22%', size: 3, delay: 1, duration: 6.5 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* SVG Wave Streams */}
      <svg
        className="absolute top-10 left-0 w-[200%] md:w-[130%] h-80 -translate-x-12 opacity-80"
        viewBox="0 0 1600 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="breeze-gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
            <stop offset="25%" stopColor="#38BDF8" stopOpacity="0.6" />
            <stop offset="65%" stopColor="#0EA5E9" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="breeze-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284C7" stopOpacity="0" />
            <stop offset="40%" stopColor="#38BDF8" stopOpacity="0.5" />
            <stop offset="80%" stopColor="#BAE6FD" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {breezeStreams.map((stream) => (
          <motion.path
            key={stream.id}
            d={stream.d}
            stroke={stream.stroke}
            strokeWidth={stream.strokeWidth}
            strokeDasharray="16 12"
            fill="none"
            initial={{ strokeDashoffset: 0, opacity: stream.opacity }}
            animate={{
              strokeDashoffset: [0, -500],
              opacity: [stream.opacity * 0.7, stream.opacity, stream.opacity * 0.7],
            }}
            transition={{
              strokeDashoffset: {
                duration: stream.duration,
                repeat: Infinity,
                ease: 'linear',
              },
              opacity: {
                duration: stream.duration / 2,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
          />
        ))}
      </svg>

      {/* Floating Cooling Air Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-cyan-400/50 blur-[0.5px]"
          style={{
            left: p.x,
            top: p.y,
            width: `${p.size}px`,
            height: `${p.size}px`,
          }}
          initial={{ opacity: 0, y: 0, scale: 0.8 }}
          animate={{
            opacity: [0.1, 0.75, 0.1],
            y: [-15, -45, -15],
            x: [0, 15, 0],
            scale: [0.8, 1.25, 0.8],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
