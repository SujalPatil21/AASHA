import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HeartPulse, ArrowRight, Users } from 'lucide-react';
import AmbientBackground from '../components/AmbientBackground';
import HealthWave from '../components/HealthWave';

/* ── Original AASHA Worker SVG Illustration ── */
function AshaIllustration() {
  return (
    <svg viewBox="0 0 340 380" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: '100%', maxWidth: 340 }}>
      {/* Ambient circle */}
      <circle cx="170" cy="200" r="140" fill="rgba(8,127,115,0.06)" />
      <circle cx="170" cy="200" r="105" fill="rgba(8,127,115,0.05)" />

      {/* Community connection nodes */}
      <motion.circle animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 3, repeat: Infinity }} cx="80" cy="100" r="10" fill="#0B9A8F" opacity="0.5" />
      <motion.circle animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 4, repeat: Infinity, delay: 0.5 }} cx="270" cy="120" r="8" fill="#087F73" opacity="0.4" />
      <motion.circle animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3.5, repeat: Infinity, delay: 1 }} cx="60" cy="270" r="12" fill="#0B9A8F" opacity="0.35" />
      <motion.circle animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 5, repeat: Infinity, delay: 0.3 }} cx="290" cy="280" r="9" fill="#168A57" opacity="0.4" />

      {/* Connection lines from worker to community */}
      <motion.line animate={{ opacity: [0.1, 0.35, 0.1] }} transition={{ duration: 4, repeat: Infinity }} x1="150" y1="165" x2="80" y2="100" stroke="#087F73" strokeWidth="1.5" strokeDasharray="4 4" />
      <motion.line animate={{ opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }} x1="190" y1="165" x2="270" y2="120" stroke="#087F73" strokeWidth="1.5" strokeDasharray="4 4" />
      <motion.line animate={{ opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 5, repeat: Infinity, delay: 0.5 }} x1="150" y1="210" x2="60" y2="270" stroke="#087F73" strokeWidth="1.5" strokeDasharray="4 4" />
      <motion.line animate={{ opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 4, repeat: Infinity, delay: 1.5 }} x1="195" y1="210" x2="290" y2="280" stroke="#087F73" strokeWidth="1.5" strokeDasharray="4 4" />

      {/* ASHA Worker body */}
      <motion.g
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Torso / clothing — green kurta */}
        <rect x="130" y="185" width="80" height="95" rx="18" fill="#087F73" />
        {/* Collar detail */}
        <path d="M165,185 L170,200 L175,185" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />
        {/* Arms */}
        <rect x="100" y="190" width="34" height="18" rx="9" fill="#087F73" />
        <rect x="206" y="190" width="34" height="18" rx="9" fill="#087F73" />
        {/* Hands */}
        <circle cx="100" cy="199" r="10" fill="#C8A882" />
        <circle cx="240" cy="199" r="10" fill="#C8A882" />

        {/* Tablet / phone in right hand */}
        <rect x="224" y="185" width="32" height="50" rx="5" fill="#1E293B" />
        <rect x="227" y="189" width="26" height="38" rx="3" fill="#E7F5F1" />
        {/* Screen health chart */}
        <polyline points="230,215 235,208 240,218 245,203 250,210" stroke="#087F73" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <circle cx="250" cy="210" r="2" fill="#D64545" />

        {/* Head */}
        <circle cx="170" cy="165" r="32" fill="#C8A882" />
        {/* Hair */}
        <path d="M140,158 Q145,135 170,133 Q195,133 200,158 Q195,145 170,143 Q145,145 140,158Z" fill="#3D2B1F" />
        {/* Dupatta */}
        <path d="M138,173 Q130,160 125,155 Q135,158 142,165" fill="#0B9A8F" opacity="0.7" />
        {/* Face */}
        <circle cx="160" cy="168" r="3" fill="#3D2B1F" />
        <circle cx="180" cy="168" r="3" fill="#3D2B1F" />
        <path d="M162,178 Q170,184 178,178" stroke="#3D2B1F" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* AASHA badge on uniform */}
        <rect x="148" y="210" width="44" height="20" rx="4" fill="rgba(255,255,255,0.2)" />
        <text x="170" y="224" textAnchor="middle" fontSize="8" fill="white" fontFamily="Inter" fontWeight="600">AASHA</text>
      </motion.g>

      {/* Floating health cross */}
      <motion.g
        animate={{ y: [0, -12, 0], rotate: [0, 3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        style={{ transformOrigin: '85px 60px' }}
      >
        <rect x="79" y="50" width="12" height="32" rx="3" fill="#087F73" opacity="0.7" />
        <rect x="70" y="59" width="30" height="12" rx="3" fill="#087F73" opacity="0.7" />
      </motion.g>

      {/* Floating leaf */}
      <motion.g
        animate={{ y: [0, -10, 0], rotate: [0, -4, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        style={{ transformOrigin: '280px 75px' }}
      >
        <path d="M270,75 Q280,55 295,65 Q285,80 270,75Z" fill="#168A57" opacity="0.5" />
        <line x1="270" y1="75" x2="290" y2="62" stroke="#168A57" strokeWidth="1" opacity="0.4" />
      </motion.g>

      {/* Health wave below */}
      <g transform="translate(40,315)">
        <HealthWave width={260} height={40} color="#087F73" opacity={0.3} />
      </g>
    </svg>
  );
}

/* ── Animation Variants ── */
const page = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.10, delayChildren: 0.05 } }
};
const up = (delay = 0) => ({
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay } }
});
const scaleIn = {
  hidden: { opacity: 0, scale: 0.93 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }
};

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <AmbientBackground />

      <motion.div
        variants={page}
        initial="hidden"
        animate="show"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 1100,
          margin: '0 auto',
          padding: 'clamp(24px, 5vw, 64px) clamp(20px, 4vw, 48px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
          gap: 'clamp(32px, 5vw, 64px)',
          alignItems: 'center',
        }}
      >
        {/* ── Left: Branding + CTAs ── */}
        <div>
          {/* Logo mark */}
          <motion.div variants={up(0.05)} style={{ marginBottom: 28 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              background: 'var(--c-surface)', borderRadius: 14,
              padding: '10px 16px', boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--c-border)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'var(--c-primary)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-primary)',
              }}>
                <HeartPulse size={22} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--c-dark)' }}>
                AASHA
              </span>
            </div>
          </motion.div>

          {/* Tagline */}
          <motion.h1 variants={up(0.1)} style={{ marginBottom: 16, lineHeight: 1.18 }}>
            Your field companion for{' '}
            <span style={{ color: 'var(--c-primary)' }}>safer community healthcare.</span>
          </motion.h1>

          <motion.p variants={up(0.16)} style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--c-body)', marginBottom: 36 }}>
            Record patient visits, capture voice observations and keep working safely — even when the network is unavailable.
          </motion.p>

          {/* Health wave */}
          <motion.div variants={up(0.2)} style={{ marginBottom: 36, opacity: 0.8 }}>
            <HealthWave width={280} height={40} color="var(--c-primary)" opacity={0.5} />
          </motion.div>

          {/* CTA Buttons */}
          <motion.div variants={up(0.22)} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
            {/* Worker CTA */}
            <motion.button
              whileHover={{ y: -4, boxShadow: '0 10px 32px rgba(8,127,115,0.28)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/asha')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, background: 'var(--c-primary)', color: '#fff',
                border: 'none', borderRadius: 'var(--r-md)', padding: '18px 22px',
                cursor: 'pointer', width: '100%',
                boxShadow: 'var(--shadow-primary)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HeartPulse size={20} color="#fff" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: '"Plus Jakarta Sans"', fontWeight: 700, fontSize: 16 }}>AASHA Worker</div>
                  <div style={{ fontSize: 13, opacity: 0.85, marginTop: 1 }}>Record visits &amp; observations</div>
                </div>
              </div>
              <ArrowRight size={20} color="rgba(255,255,255,0.8)" />
            </motion.button>

            {/* PHC CTA */}
            <motion.button
              whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/anm')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, background: 'var(--c-surface)', color: 'var(--c-dark)',
                border: '1.5px solid var(--c-border)', borderRadius: 'var(--r-md)', padding: '18px 22px',
                cursor: 'pointer', width: '100%',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--c-mint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} color="var(--c-primary)" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: '"Plus Jakarta Sans"', fontWeight: 700, fontSize: 16, color: 'var(--c-dark)' }}>PHC / ANM Staff</div>
                  <div style={{ fontSize: 13, color: 'var(--c-body)', marginTop: 1 }}>Monitor &amp; review community records</div>
                </div>
              </div>
              <ArrowRight size={20} color="var(--c-muted)" />
            </motion.button>
          </motion.div>

          {/* Trust tagline */}
          <motion.div variants={up(0.28)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--c-success)' }} />
            <span style={{ fontSize: 13, color: 'var(--c-muted)' }}>Works offline · Secure local storage · Auto-syncs</span>
          </motion.div>
        </div>

        {/* ── Right: Illustration ── */}
        <motion.div
          variants={scaleIn}
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}
        >
          {/* Soft green backdrop circle */}
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', width: '80%', height: '80%',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at center, rgba(8,127,115,0.10) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />
          <AshaIllustration />
        </motion.div>
      </motion.div>
    </div>
  );
}
