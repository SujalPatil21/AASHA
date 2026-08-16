import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, AlertTriangle, RefreshCcw, Search, TrendingUp,
  CheckCircle2, Clock, Activity, ArrowRight, HeartPulse, Filter
} from 'lucide-react';
import { patientRepository } from '../repository/patientRepository';
import { verifyConnectivity } from '../utils/connectivity';
import { AnimatedCounter, RiskBar } from '../components/AnimatedCounter';
import AmbientBackground from '../components/AmbientBackground';
import HealthWave from '../components/HealthWave';

/* ── Helper ── */
function getRiskColor(level) {
  const l = (level || '').toLowerCase();
  if (l.includes('high') || l.includes('critical')) return { color: '#D64545', bg: '#FEE2E2', border: '#D64545' };
  if (l.includes('medium'))                           return { color: '#D98A00', bg: '#FEF9C3', border: '#D98A00' };
  return                                               { color: '#168A57', bg: '#DCFCE7', border: '#168A57' };
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  return `${Math.floor(diff/3600)}h ago`;
}

/* ── Animation variants ── */
const page = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22,1,0.36,1], staggerChildren: 0.08 } }
};
const sec = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
};
const card = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: 'easeOut' } }
};

export default function DashboardPage() {
  const [records, setRecords] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [filterRisk, setFilterRisk] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await patientRepository.searchPatients('');
      setRecords(data);
      const online = await verifyConnectivity();
      setIsOnline(online);
      setLoading(false);
    };
    load();
    const iv = setInterval(async () => {
      const online = await verifyConnectivity();
      setIsOnline(online);
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  /* ── Derived data ── */
  const total = records.length;
  const highRisk = records.filter(r => (r.riskLevel||'').toLowerCase().includes('high') || (r.riskLevel||'').toLowerCase().includes('critical'));
  const medRisk  = records.filter(r => (r.riskLevel||'').toLowerCase().includes('medium'));
  const lowRisk  = records.filter(r => !['high','medium','critical'].some(k => (r.riskLevel||'').toLowerCase().includes(k)));
  const pending  = records.filter(r => r.syncStatus === 'pending' || r.syncStatus === 'pending-delete');

  const filtered = records.filter(r => {
    const matchRisk = filterRisk === 'all' || (r.riskLevel||'').toLowerCase().includes(filterRisk);
    const matchSearch = !search || (r.patientName||'').toLowerCase().includes(search.toLowerCase());
    return matchRisk && matchSearch;
  });

  /* ── Risk distribution % ── */
  const toPercent = (n) => total ? Math.round((n/total) * 100) : 0;

  /* ── Fake activity log from records ── */
  const activity = [...records]
    .sort((a, b) => new Date(b.createdAt || b.id) - new Date(a.createdAt || a.id))
    .slice(0, 5)
    .map(r => ({
      text: `Visit recorded`,
      sub: r.patientName,
      time: timeAgo(r.createdAt || parseInt(r.id)),
      risk: r.riskLevel,
      icon: <HeartPulse size={14} />,
    }));

  const inp = {
    background: '#fff', border: '1.5px solid var(--c-border)', borderRadius: 'var(--r-sm)',
    padding: '11px 14px', fontSize: 14, color: 'var(--c-dark)', outline: 'none',
    fontFamily: '"Inter", sans-serif', transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: 'var(--c-bg)' }}>
      <AmbientBackground />

      <motion.div
        variants={page} initial="hidden" animate="show"
        style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: 'clamp(16px,3vw,32px)' }}
      >

        {/* ═══════════════════════════════
            HERO
        ═══════════════════════════════ */}
        <motion.div
          variants={sec}
          style={{
            background: 'linear-gradient(135deg, var(--c-primary-dark, #065E56) 0%, var(--c-primary) 60%, var(--c-primary-alt) 100%)',
            borderRadius: 'var(--r-xl)', padding: 'clamp(24px,4vw,40px)',
            marginBottom: 28, position: 'relative', overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(8,127,115,0.28)',
          }}
        >
          {/* Ambient glow */}
          <motion.div
            animate={{ scale: [1,1.2,1], opacity: [0.08,0.18,0.08] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', right: -80, bottom: -80, width: 360, height: 360, borderRadius: '50%', background: 'rgba(255,255,255,1)', pointerEvents: 'none', filter: 'blur(40px)' }}
          />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: 0.15 }}>
            <HealthWave width={1200} height={50} color="#fff" opacity={1} />
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.18)', borderRadius: 999, padding: '5px 12px', marginBottom: 14 }}>
              <Users size={13} color="#fff" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>PHC / ANM Dashboard</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <h1 style={{ color: '#fff', marginBottom: 8, fontSize: 'clamp(22px,3.5vw,32px)' }}>Community Health Monitor</h1>
                <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 15, maxWidth: 520, margin: 0 }}>
                  Track patient visits, identify priority follow-ups and monitor community health across your catchment area.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--r-md)', padding: '10px 14px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOnline ? '#4ADE80' : '#FCD34D' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{isOnline ? 'Connected' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════
            KPI METRICS — ASYMMETRIC
        ═══════════════════════════════ */}
        <motion.div variants={sec} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
          {/* Primary — Total Records */}
          <motion.div
            whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)' }}
            style={{ gridColumn: 'span 1', background: 'var(--c-primary)', borderRadius: 'var(--r-xl)', padding: '24px 20px', boxShadow: 'var(--shadow-primary)', display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} color="#fff" />
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#fff', fontFamily: '"Plus Jakarta Sans",sans-serif', lineHeight: 1 }}>
              <AnimatedCounter value={total} />
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>Total Records</div>
          </motion.div>


          {/* ── HIGH RISK — calm health monitor ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: 'easeOut', delay: 0.06 }}
            whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(18,59,58,0.10)' }}
            style={{
              background: highRisk.length === 0
                ? 'var(--c-surface)'
                : 'var(--c-surface)',
              borderRadius: 'var(--r-xl)',
              padding: '20px 18px',
              border: highRisk.length === 0
                ? '1px solid var(--c-border)'
                : '1.5px solid rgba(214,69,69,0.3)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex', flexDirection: 'column', gap: 0,
              position: 'relative', overflow: 'hidden',
              transition: 'border-color 0.4s ease, box-shadow 0.25s ease',
            }}
          >
            {/* Tinted background — green when safe, faint red when at risk */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 'inherit',
              background: highRisk.length === 0
                ? 'linear-gradient(135deg, var(--c-mint-light) 0%, var(--c-surface) 60%)'
                : 'linear-gradient(135deg, rgba(214,69,69,0.04) 0%, var(--c-surface) 60%)',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1,
                textTransform: 'uppercase', color: 'var(--c-muted)',
                margin: '0 0 10px 0',
              }}>High-Risk Cases</p>

              {/* Number — dominant */}
              <div style={{
                fontFamily: '"Plus Jakarta Sans",sans-serif',
                fontSize: 34, fontWeight: 700, lineHeight: 1,
                color: highRisk.length === 0 ? 'var(--c-primary)' : '#D64545',
                marginBottom: 4,
                transition: 'color 0.4s ease',
              }}>
                <AnimatedCounter value={highRisk.length} />
              </div>

              <p style={{
                fontSize: 12, margin: '0 0 14px 0', lineHeight: 1.4,
                color: highRisk.length === 0 ? 'var(--c-success)' : '#D64545',
                fontWeight: 500,
                transition: 'color 0.4s ease',
              }}>
                {highRisk.length === 0 ? 'No high-risk cases' : `${highRisk.length} require follow-up`}
              </p>

              {/* Mini health status waveform */}
              <svg width="100%" height="22" viewBox="0 0 120 22" fill="none" aria-hidden="true" preserveAspectRatio="none">
                <motion.path
                  d={highRisk.length === 0
                    ? 'M0,11 C10,11 15,6 25,6 C35,6 40,16 50,16 C60,16 65,6 75,6 C85,6 90,14 100,14 C110,14 115,10 120,10'
                    : 'M0,11 C8,11 12,3 20,3 C28,3 32,19 40,19 C48,19 52,3 60,3 C68,3 72,17 80,17 C88,17 92,6 100,6 C108,6 114,13 120,13'
                  }
                  stroke={highRisk.length === 0 ? 'var(--c-primary)' : '#D64545'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: highRisk.length === 0 ? 4 : 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </svg>

              {/* Status dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: highRisk.length === 0 ? 4 : 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: highRisk.length === 0 ? 'var(--c-success)' : '#D64545',
                    transition: 'background 0.4s ease',
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>
                  {highRisk.length === 0 ? 'Community healthy' : 'Action needed'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── PENDING SYNC — device→cloud visualization ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: 'easeOut', delay: 0.12 }}
            whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(18,59,58,0.10)' }}
            style={{
              background: 'var(--c-surface)',
              borderRadius: 'var(--r-xl)',
              padding: '20px 18px',
              border: pending.length > 0 ? '1.5px solid rgba(217,138,0,0.3)' : '1px solid var(--c-border)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex', flexDirection: 'column', gap: 0,
              position: 'relative', overflow: 'hidden',
              transition: 'border-color 0.4s ease, box-shadow 0.25s ease',
            }}
          >
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 'inherit',
              background: pending.length === 0
                ? 'linear-gradient(135deg, var(--c-mint-light) 0%, var(--c-surface) 60%)'
                : 'linear-gradient(135deg, rgba(217,138,0,0.05) 0%, var(--c-surface) 60%)',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--c-muted)', margin: '0 0 10px 0' }}>
                Pending Sync
              </p>

              <div style={{
                fontFamily: '"Plus Jakarta Sans",sans-serif',
                fontSize: 34, fontWeight: 700, lineHeight: 1, marginBottom: 4,
                color: pending.length === 0 ? 'var(--c-success)' : '#D98A00',
                transition: 'color 0.4s ease',
              }}>
                <AnimatedCounter value={pending.length} />
              </div>

              <p style={{
                fontSize: 12, margin: '0 0 14px 0', color: 'var(--c-body)',
                fontWeight: 500,
              }}>
                {pending.length === 0 ? 'All records synced' : `${pending.length} waiting to upload`}
              </p>

              {/* Device → Cloud SVG */}
              <svg width="96" height="26" viewBox="0 0 96 26" fill="none" aria-hidden="true">
                {/* Field device */}
                <rect x="1" y="4" width="14" height="18" rx="2.5"
                  stroke={pending.length > 0 ? '#D98A00' : 'var(--c-primary)'}
                  strokeWidth="1.5" fill="none" />
                <rect x="3" y="6" width="10" height="12" rx="1"
                  fill={pending.length > 0 ? 'rgba(217,138,0,0.10)' : 'var(--c-mint)'} />
                <circle cx="8" cy="21" r="1.2"
                  fill={pending.length > 0 ? '#D98A00' : 'var(--c-primary)'} />

                {/* Data path */}
                <line x1="15" y1="13" x2="58" y2="13"
                  stroke={pending.length > 0 ? '#D98A00' : 'var(--c-primary)'}
                  strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6" />

                {/* Animated data packet — only when pending > 0 */}
                {pending.length > 0 && (
                  <motion.circle
                    cy="13" r="3" fill="#D98A00"
                    animate={{ cx: [15, 58] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
                  />
                )}

                {/* Cloud shape */}
                <path d="M74,22 Q67,22 67,16 Q67,10 73,10 Q73,7 77,7 Q83,7 83,12 Q86,12 86,15 Q86,22 81,22Z"
                  stroke={pending.length > 0 ? '#D98A00' : 'var(--c-primary)'}
                  strokeWidth="1.4" fill={pending.length > 0 ? 'rgba(217,138,0,0.08)' : 'var(--c-mint)'} />

                {/* Check on cloud when all synced */}
                {pending.length === 0 && (
                  <motion.path
                    d="M71,15 L74,18 L80,11"
                    stroke="var(--c-success)" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                )}
              </svg>

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10 }}>
                <motion.div
                  animate={{ opacity: pending.length > 0 ? [1, 0.4, 1] : [1, 0.6, 1] }}
                  transition={{ duration: pending.length > 0 ? 1.2 : 4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: pending.length === 0 ? 'var(--c-success)' : '#D98A00',
                    transition: 'background 0.4s ease',
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>
                  {isOnline ? (pending.length > 0 ? 'Syncing…' : 'Up to date') : 'Offline — queued'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── MEDIUM RISK — segmented health indicator ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: 'easeOut', delay: 0.18 }}
            whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(18,59,58,0.10)' }}
            style={{
              background: 'var(--c-surface)',
              borderRadius: 'var(--r-xl)',
              padding: '20px 18px',
              border: medRisk.length > 0 ? '1.5px solid rgba(217,138,0,0.2)' : '1px solid var(--c-border)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex', flexDirection: 'column', gap: 0,
              position: 'relative', overflow: 'hidden',
              transition: 'border-color 0.4s ease, box-shadow 0.25s ease',
            }}
          >
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 'inherit',
              background: 'linear-gradient(135deg, var(--c-mint-light) 0%, var(--c-surface) 60%)',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--c-muted)', margin: '0 0 10px 0' }}>
                Medium-Risk Cases
              </p>

              <div style={{
                fontFamily: '"Plus Jakarta Sans",sans-serif',
                fontSize: 34, fontWeight: 700, lineHeight: 1, marginBottom: 4,
                color: medRisk.length === 0 ? 'var(--c-primary)' : '#D98A00',
                transition: 'color 0.4s ease',
              }}>
                <AnimatedCounter value={medRisk.length} />
              </div>

              <p style={{ fontSize: 12, margin: '0 0 14px 0', color: 'var(--c-body)', fontWeight: 500 }}>
                {medRisk.length === 0 ? 'No medium-risk cases' : `${medRisk.length} to monitor`}
              </p>

              {/* Segmented risk bar */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 12 }}>
                {Array.from({ length: 8 }).map((_, i) => {
                  const filled = medRisk.length > 0 && i < Math.min(Math.ceil(medRisk.length / Math.max(total, 1) * 8), 8);
                  return (
                    <motion.div
                      key={i}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 + i * 0.04, ease: 'easeOut' }}
                      style={{
                        flex: 1, height: 16, borderRadius: 3,
                        background: filled ? '#D98A00' : 'var(--c-mint)',
                        opacity: filled ? (0.5 + i * 0.07) : 0.6,
                        transformOrigin: 'bottom',
                        transition: 'background 0.4s ease',
                      }}
                    />
                  );
                })}
              </div>

              {/* Subtle waveform */}
              <svg width="100%" height="14" viewBox="0 0 120 14" fill="none" aria-hidden="true" preserveAspectRatio="none">
                <motion.path
                  d="M0,7 C15,7 20,3 30,3 C40,3 45,11 55,11 C65,11 70,4 80,4 C90,4 95,9 105,9 C115,9 118,7 120,7"
                  stroke={medRisk.length === 0 ? 'var(--c-primary)' : '#D98A00'}
                  strokeWidth="1.8" strokeLinecap="round" fill="none"
                  animate={{ opacity: [0.4, 0.85, 0.4] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
              </svg>

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: medRisk.length === 0 ? 'var(--c-success)' : '#D98A00',
                  transition: 'background 0.4s ease',
                }} />
                <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>
                  {medRisk.length === 0 ? 'All clear' : 'Monitoring active'}
                </span>
              </div>
            </div>
          </motion.div>

        </motion.div>

        {/* ═══════════════════════════════
            TWO-COLUMN: RISK + ACTIVITY
        ═══════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,320px), 1fr))', gap: 20, marginBottom: 28 }}>

          {/* Community Risk Overview */}
          <motion.div variants={sec} style={{ background: 'var(--c-surface)', borderRadius: 'var(--r-xl)', padding: '24px', border: '1px solid var(--c-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--c-mint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={18} color="var(--c-primary)" />
              </div>
              <h3 style={{ margin: 0 }}>Community Risk Overview</h3>
            </div>

            {total === 0 ? (
              <p style={{ color: 'var(--c-muted)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No data yet</p>
            ) : (
              <>
                <RiskBar percent={toPercent(highRisk.length)} color="#D64545" label="High Risk" count={highRisk.length} />
                <RiskBar percent={toPercent(medRisk.length)}  color="#D98A00" label="Medium Risk" count={medRisk.length} />
                <RiskBar percent={toPercent(lowRisk.length)}  color="#168A57" label="Low Risk" count={lowRisk.length} />
              </>
            )}

            {/* Priority cases */}
            {highRisk.length > 0 && (
              <div style={{ marginTop: 20, padding: '14px', background: '#FEF9F9', borderRadius: 'var(--r-md)', border: '1px solid #FCD3D3' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#D64545', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Priority Follow-ups
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {highRisk.slice(0, 3).map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid #FCD3D3' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-dark)' }}>{r.patientName}</span>
                        <span style={{ fontSize: 11, color: '#D64545', marginLeft: 8, textTransform: 'capitalize' }}>{r.riskLevel}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--c-muted)', textTransform: 'capitalize' }}>{r.patientType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Recent Activity Timeline */}
          <motion.div variants={sec} style={{ background: 'var(--c-surface)', borderRadius: 'var(--r-xl)', padding: '24px', border: '1px solid var(--c-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--c-mint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={18} color="var(--c-primary)" />
              </div>
              <h3 style={{ margin: 0 }}>Recent Activity</h3>
            </div>

            {activity.length === 0 ? (
              <motion.div
                animate={{ y: [0,-6,0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ textAlign: 'center', padding: '32px 0', color: 'var(--c-muted)' }}
              >
                <Clock size={32} strokeWidth={1.5} />
                <p style={{ marginTop: 10, fontSize: 13 }}>No recent activity yet.</p>
              </motion.div>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
                style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}
              >
                {/* Vertical line */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: '100%' }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                  style={{ position: 'absolute', left: 16, top: 16, width: 2, background: 'var(--c-border)', borderRadius: 1 }}
                />

                {activity.map((item, i) => {
                  const rc = getRiskColor(item.risk);
                  return (
                    <motion.div
                      key={i}
                      variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.25 } } }}
                      style={{ display: 'flex', gap: 14, paddingBottom: 16, position: 'relative' }}
                    >
                      {/* Node */}
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: rc.bg, border: `2px solid ${rc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: rc.color, zIndex: 1 }}>
                        {item.icon}
                      </div>
                      <div style={{ paddingTop: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-dark)' }}>{item.text}</div>
                        <div style={{ fontSize: 12, color: 'var(--c-body)', marginTop: 1 }}>{item.sub}</div>
                        <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2 }}>{item.time}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* ═══════════════════════════════
            ALL RECORDS TABLE
        ═══════════════════════════════ */}
        <motion.div variants={sec} style={{ background: 'var(--c-surface)', borderRadius: 'var(--r-xl)', border: '1px solid var(--c-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--c-border)', background: 'var(--c-mint-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={18} color="#fff" />
              </div>
              <h3 style={{ margin: 0 }}>All Records</h3>
              <span style={{ fontSize: 12, background: 'var(--c-mint)', color: 'var(--c-primary)', padding: '3px 10px', borderRadius: 999, fontWeight: 600 }}>{filtered.length}</span>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="var(--c-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  style={{ ...inp, paddingLeft: 30, width: 180 }}
                  placeholder="Search name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Filter size={14} color="var(--c-muted)" />
                <select style={{ ...inp, paddingLeft: 8 }} value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
                  <option value="all">All Risk Levels</option>
                  <option value="high">High Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="low">Low Risk</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--c-muted)' }}
            >
              <motion.div animate={{ y: [0,-8,0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                <Users size={40} strokeWidth={1.5} />
              </motion.div>
              <p style={{ marginTop: 14, fontSize: 15 }}>No records found.</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Records added by AASHA Workers will appear here.</p>
            </motion.div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--c-mint-light)' }}>
                    {['Patient', 'Age / Type', 'Risk', 'Visit Type', 'Recorded', 'Sync'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--c-border)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <motion.tbody
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                  initial="hidden"
                  animate="show"
                >
                  {filtered.map((r, i) => {
                    const rc = getRiskColor(r.riskLevel);
                    const alt = i % 2 === 1;
                    return (
                      <motion.tr
                        key={r.id}
                        variants={card}
                        whileHover={{ backgroundColor: 'var(--c-mint-light)' }}
                        style={{ background: alt ? 'var(--c-mint-light)' : 'var(--c-surface)', transition: 'background 0.15s', borderBottom: '1px solid var(--c-border)' }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-dark)' }}>{r.patientName}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: 13, color: 'var(--c-body)' }}>{r.age}y · <span style={{ textTransform: 'capitalize' }}>{r.patientType}</span></div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: rc.bg, color: rc.color, fontSize: 12, fontWeight: 700 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: rc.color }} />
                            {r.riskLevel || 'Low'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 13, color: 'var(--c-body)', textTransform: 'capitalize' }}>{r.visitType || 'routine'}</span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 12, color: 'var(--c-muted)' }}>
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : timeAgo(parseInt(r.id))}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: r.syncStatus === 'synced' ? 'var(--c-success)' : '#D98A00' }}>
                            {r.syncStatus === 'synced' ? 'Synced' : 'Pending'}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          )}
        </motion.div>

      </motion.div>
    </div>
  );
}
