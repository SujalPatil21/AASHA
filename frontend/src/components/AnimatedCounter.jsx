import { motion } from 'framer-motion';

/**
 * AnimatedCounter — Counts up from 0 to value when mounted.
 */
import { useEffect, useRef, useState } from 'react';

export function AnimatedCounter({ value, duration = 0.6 }) {
  const [display, setDisplay] = useState(0);
  const start = useRef(Date.now());

  useEffect(() => {
    start.current = Date.now();
    const total = duration * 1000;
    let raf;
    const tick = () => {
      const elapsed = Date.now() - start.current;
      const progress = Math.min(elapsed / total, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(ease * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span>{display}</span>;
}

/**
 * RiskBar — Animated width bar for risk distribution chart.
 */
export function RiskBar({ percent, color, label, count }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-body)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-dark)' }}>{count}</span>
      </div>
      <div style={{ height: 8, background: 'var(--c-mint)', borderRadius: 4, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.3 }}
          style={{ height: '100%', background: color, borderRadius: 4 }}
        />
      </div>
    </div>
  );
}
