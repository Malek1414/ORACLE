'use client';

import { motion } from 'framer-motion';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { useClaimStore } from '@/store/claim-store';
import { formatCurrency, formatDuration } from '@/lib/utils';

interface Props {
  onReset: () => void;
}

// Circular score ring drawn with SVG — no external deps
function ScoreRing({ score }: { score: number }) {
  const size = 148;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color =
    score >= 72 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--line)" strokeWidth={stroke} />
        {/* Fill */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - filled }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      {/* Label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, color }}
        >
          {score}
        </motion.span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>out of 100</span>
      </div>
    </div>
  );
}

export function ResultView({ onReset }: Props) {
  const { activeClaim } = useClaimStore();
  if (!activeClaim) return null;

  const approved = activeClaim.status === 'approved';
  const fa = activeClaim.fraud_assessment;
  const da = activeClaim.damage_analysis;
  const res = activeClaim.resolution;
  const score = fa?.confidence_score ?? 0;

  // Map fraud risk to user-friendly label
  const riskLabel =
    fa?.fraud_risk === 'low' ? 'Low Risk'
    : fa?.fraud_risk === 'medium' ? 'Moderate Risk'
    : 'High Risk';

  // Formal label for the decision
  const decisionLabel = approved ? 'Claim Approved' : 'Claim Referred for Review';
  const decisionSub = approved
    ? 'Your FNOL report has been submitted to your insurer. Expect contact within 1–2 business days.'
    : 'Your claim requires manual review by a licensed adjuster. All supporting documentation has been pre-packaged and forwarded.';

  // Section header style
  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--ink-3)',
    marginBottom: 10,
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 24px max(env(safe-area-inset-bottom,0px),24px)',
      background: 'var(--bg)',
      overflowY: 'auto',
      gap: 20,
    }}>

      {/* ── Decision header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          borderRadius: 20,
          padding: '24px 20px',
          background: approved ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)',
          border: `1px solid ${approved ? 'rgba(16,185,129,0.18)' : 'rgba(245,158,11,0.18)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <ScoreRing score={score} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={sectionLabel}>Assessment Score</p>
          <h1 style={{
            fontSize: 20,
            fontWeight: 700,
            color: approved ? 'var(--green)' : 'var(--amber)',
            margin: '0 0 6px',
            lineHeight: 1.2,
          }}>
            {decisionLabel}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>
            {decisionSub}
          </p>
          {res?.resolution_time_seconds && (
            <div style={{
              display: 'inline-flex', marginTop: 10,
              padding: '3px 10px', borderRadius: 20,
              background: 'var(--bg-soft)',
              fontSize: 10, fontFamily: 'monospace',
              color: 'var(--ink-3)',
            }}>
              Assessed in {formatDuration(res.resolution_time_seconds)}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Quick stats ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
      >
        {fa && (
          <div style={{ borderRadius: 14, padding: '14px 16px', background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
            <p style={sectionLabel}>Risk Level</p>
            <p style={{
              fontSize: 18, fontWeight: 700, margin: 0,
              color: fa.fraud_risk === 'low' ? 'var(--green)' : fa.fraud_risk === 'medium' ? 'var(--amber)' : 'var(--red)',
            }}>{riskLabel}</p>
          </div>
        )}
        {da && (
          <div style={{ borderRadius: 14, padding: '14px 16px', background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
            <p style={sectionLabel}>Damage Severity</p>
            <p style={{ fontSize: 18, fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>
              {da.severity.replace('_', ' ')}
            </p>
          </div>
        )}
        {da && (
          <div style={{ borderRadius: 14, padding: '14px 16px', background: 'var(--bg-elev)', border: '1px solid var(--line)', gridColumn: 'span 2' }}>
            <p style={sectionLabel}>Estimated Repair Cost</p>
            <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              {formatCurrency(da.estimated_repair_cost.min)} &ndash; {formatCurrency(da.estimated_repair_cost.max)}
            </p>
          </div>
        )}
      </motion.div>

      {/* ── Formal reasoning ── */}
      {fa?.reasoning && fa.reasoning.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <p style={sectionLabel}>
            {approved ? 'Basis for approval' : 'Basis for referral'}
          </p>
          <div style={{
            borderRadius: 14,
            border: `1px solid ${approved ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}`,
            overflow: 'hidden',
          }}>
            {fa.reasoning.map((reason, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '13px 16px',
                borderBottom: i < fa.reasoning.length - 1 ? '1px solid var(--line)' : 'none',
                background: i % 2 === 0 ? 'var(--bg-elev)' : 'transparent',
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, marginTop: 1,
                  background: approved ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                  color: approved ? 'var(--green)' : 'var(--amber)',
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                  {reason}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Flags ── */}
      {fa?.flags && fa.flags.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <p style={sectionLabel}>Indicators detected</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {fa.flags.map((flag) => (
              <span key={flag} style={{
                fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.05em',
                padding: '5px 10px', borderRadius: 8,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.22)',
                color: '#fca5a5',
              }}>
                {flag.replace(/_/g, '\u2009')}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Adjuster link ── */}
      {res?.entire_task_url && (
        <a href={res.entire_task_url} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderRadius: 14, textDecoration: 'none',
            background: 'var(--amber-glow)', border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          <span style={{ fontSize: 14, color: 'var(--amber)' }}>View adjuster case file</span>
          <ExternalLink size={14} color="var(--amber)" />
        </a>
      )}

      {/* ── Reset ── */}
      <button
        onClick={onReset}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '16px 0', borderRadius: 16, border: '1px solid var(--line)',
          background: 'var(--bg-elev)', color: 'var(--ink-2)',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
        }}
      >
        <RefreshCw size={15} /> File Another Claim
      </button>
    </div>
  );
}
