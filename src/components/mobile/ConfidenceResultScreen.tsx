'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldX, ChevronRight } from 'lucide-react';
import { useClaimStore } from '@/store/claim-store';

interface Props {
  onContinue: () => void;
}

const RISK_CONFIG = {
  low:    { label: 'Low Risk',    color: '#2A7E4A', bg: 'rgba(42,126,74,0.10)',  border: 'rgba(42,126,74,0.25)',  Icon: ShieldCheck },
  medium: { label: 'Medium Risk', color: '#B45309', bg: 'rgba(180,83,9,0.10)',   border: 'rgba(180,83,9,0.25)',   Icon: ShieldAlert },
  high:   { label: 'High Risk',   color: '#B91C1C', bg: 'rgba(185,28,28,0.10)',  border: 'rgba(185,28,28,0.25)',  Icon: ShieldX    },
} as const;

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

export function ConfidenceResultScreen({ onContinue }: Props) {
  const { activeClaim } = useClaimStore();

  const fa         = activeClaim?.fraud_assessment ?? null;
  const score      = fa?.confidence_score ?? 0;
  const riskKey    = (fa?.fraud_risk ?? 'medium') as 'low' | 'medium' | 'high';
  const reasoning  = fa?.reasoning ?? [];
  const decision   = activeClaim?.resolution?.decision ?? activeClaim?.status;
  const isApproved = decision === 'approved';

  const displayed = useCountUp(score);
  const [visibleBullets, setVisibleBullets] = useState(0);

  useEffect(() => {
    if (reasoning.length === 0) return;
    const delay = 1600;
    const interval = 280;
    const timers = reasoning.map((_, i) =>
      setTimeout(() => setVisibleBullets(i + 1), delay + i * interval)
    );
    return () => timers.forEach(clearTimeout);
  }, [reasoning.length]);

  const { label: riskLabel, color, bg, border, Icon: RiskIcon } = RISK_CONFIG[riskKey];

  const RADIUS = 54;
  const CIRC   = 2 * Math.PI * RADIUS;
  const dash   = (displayed / 100) * CIRC;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 24px max(env(safe-area-inset-bottom,0px),40px)',
      background: 'var(--bg)',
    }}>
      <motion.p
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', marginBottom: 32 }}
      >
        Confidence Score
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        style={{ position: 'relative', width: 140, height: 140, marginBottom: 28 }}
      >
        <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="var(--bg-elev)" strokeWidth="10" />
          <circle
            cx="70" cy="70" r={RADIUS} fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${CIRC}`}
            strokeDashoffset={CIRC - dash}
            style={{ transition: 'stroke-dashoffset 0.04s linear' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 36, fontWeight: 300, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1 }}>{displayed}</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>/100</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 999, background: bg, border: `1px solid ${border}`, marginBottom: 32 }}
      >
        <RiskIcon size={14} style={{ color }} />
        <span style={{ fontSize: 13, fontWeight: 500, color, fontFamily: 'var(--font-sans)' }}>{riskLabel}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        style={{
          width: '100%',
          padding: '18px 22px',
          borderRadius: 16,
          background: isApproved ? 'rgba(42,126,74,0.08)' : 'rgba(180,83,9,0.08)',
          border: `1px solid ${isApproved ? 'rgba(42,126,74,0.25)' : 'rgba(180,83,9,0.25)'}`,
          marginBottom: 24,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', margin: '0 0 6px' }}>
          Decision
        </p>
        <p style={{ fontSize: 16, fontWeight: 600, color: isApproved ? '#2A7E4A' : '#B45309', margin: 0, letterSpacing: '-0.01em' }}>
          {isApproved ? 'Auto-Approved' : 'Escalated to Adjuster'}
        </p>
        {!isApproved && (
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '6px 0 0', lineHeight: 1.5 }}>
            An adjuster will review your claim within 1&ndash;2 business days.
          </p>
        )}
      </motion.div>

      {reasoning.length > 0 && (
        <div style={{ width: '100%', marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', margin: '0 0 12px' }}>
            Assessment Details
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reasoning.map((point, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={i < visibleBullets ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
              >
                <span style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 4, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>—</span>
                <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>{point}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        onClick={onContinue}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px 22px', borderRadius: 999,
          background: 'var(--ink)', color: 'var(--bg)',
          border: 'none', fontSize: 14, fontWeight: 400, cursor: 'pointer',
          fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em',
        }}
      >
        Continue <ChevronRight size={16} />
      </motion.button>
    </div>
  );
}
