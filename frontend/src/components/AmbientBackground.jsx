import { motion } from 'framer-motion';

/**
 * AmbientBackground — 3 slow-moving organic blobs that create a
 * living green/teal atmosphere behind major content areas.
 * Clearly visible motion, but calm and healthcare-appropriate.
 */
export default function AmbientBackground({ intensity = 1 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Blob A — top-left, large soft teal */}
      <motion.div
        animate={{
          x: [0, 28, -10, 0],
          y: [0, -18, 14, 0],
          scale: [1, 1.10, 0.96, 1],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror' }}
        style={{
          position: 'absolute',
          top: '-12%',
          left: '-10%',
          width: '52vw',
          height: '52vw',
          maxWidth: 640,
          maxHeight: 640,
          borderRadius: '60% 40% 70% 30% / 55% 65% 35% 45%',
          background: 'radial-gradient(ellipse at center, rgba(8,127,115,0.13) 0%, transparent 70%)',
          filter: 'blur(48px)',
          opacity: intensity,
        }}
      />

      {/* Blob B — bottom-right, medium mint */}
      <motion.div
        animate={{
          x: [0, -22, 12, 0],
          y: [0, 14, -20, 0],
          scale: [1, 1.07, 1.12, 1],
        }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1.5, repeatType: 'mirror' }}
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-12%',
          width: '60vw',
          height: '60vw',
          maxWidth: 700,
          maxHeight: 700,
          borderRadius: '40% 60% 30% 70% / 65% 35% 65% 35%',
          background: 'radial-gradient(ellipse at center, rgba(11,154,143,0.10) 0%, transparent 70%)',
          filter: 'blur(56px)',
          opacity: intensity,
        }}
      />

      {/* Blob C — center, breathing opacity */}
      <motion.div
        animate={{
          opacity: [0.06, 0.15, 0.06],
          scale: [1, 1.14, 1],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.8, repeatType: 'mirror' }}
        style={{
          position: 'absolute',
          top: '30%',
          left: '35%',
          width: '45vw',
          height: '45vw',
          maxWidth: 500,
          maxHeight: 500,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(8,127,115,1) 0%, transparent 65%)',
          filter: 'blur(80px)',
        }}
      />
    </div>
  );
}
