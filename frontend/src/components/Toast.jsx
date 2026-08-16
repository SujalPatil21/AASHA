import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Wifi, CloudOff } from 'lucide-react';

const icons = {
  success: CheckCircle2,
  error: AlertTriangle,
  online: Wifi,
  offline: CloudOff,
};

const colors = {
  success: { bg: '#DCFCE7', border: '#168A57', text: '#166534', icon: '#168A57' },
  error:   { bg: '#FEE2E2', border: '#D64545', text: '#991B1B', icon: '#D64545' },
  online:  { bg: '#E7F5F1', border: '#087F73', text: '#123B3A', icon: '#087F73' },
  offline: { bg: '#FEF9C3', border: '#D98A00', text: '#854D0E', icon: '#D98A00' },
};

let _setToasts = null;
let _id = 0;

export function showToast(message, type = 'success', duration = 3000) {
  if (!_setToasts) return;
  const id = ++_id;
  _setToasts(prev => [...prev, { id, message, type }]);
  if (duration > 0) {
    setTimeout(() => {
      _setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { _setToasts = setToasts; return () => { _setToasts = null; }; }, []);

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {toasts.map(t => {
          const c = colors[t.type] || colors.success;
          const Icon = icons[t.type] || CheckCircle2;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: c.bg, border: `1px solid ${c.border}`,
                borderRadius: 12, padding: '12px 16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                minWidth: 220, maxWidth: 320, pointerEvents: 'auto',
              }}
            >
              <Icon size={18} color={c.icon} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: c.text, flex: 1 }}>{t.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
