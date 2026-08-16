import { motion } from 'framer-motion';

/**
 * HealthWave — Animated SVG healthcare waveform.
 * Slowly animates from left to right.
 * Used in hero areas as the AASHA signature visual element.
 */
export default function HealthWave({ width = 320, height = 48, color = '#087F73', opacity = 0.35 }) {
  const path = `M0,24 C20,24 30,8 50,8 C70,8 80,40 100,40 C120,40 130,4 150,4 C170,4 180,36 200,36 C220,36 230,16 250,16 C270,16 280,32 300,32 C320,32 330,12 350,12 L${width},24`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <motion.path
        d={path}
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
        strokeDasharray="1000"
        initial={{ strokeDashoffset: 1000, opacity: 0 }}
        animate={{ strokeDashoffset: 0, opacity }}
        transition={{ duration: 2, ease: 'easeOut', delay: 0.5 }}
      />
      {/* Slow scroll repeat */}
      <motion.path
        d={path}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={opacity * 0.5}
        strokeDasharray="60 20"
        animate={{ strokeDashoffset: [0, -80] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  );
}
