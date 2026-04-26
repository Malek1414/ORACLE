'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useClaimStore } from '@/store/claim-store';
import { ClaimObject, ClaimStatus } from '@/types/claim';
import { formatTimestamp } from '@/lib/utils';

const STATUS_CONFIG: Record<ClaimStatus, { label: string; color: string; dot: string }> = {
  idle:             { label: 'Idle',         color: 'var(--ink-3)',   dot: 'var(--ink-3)' },
  recording:        { label: 'Recording',    color: 'var(--accent)',  dot: 'var(--accent)' },
  enhancing:        { label: 'Enhancing',    color: 'var(--accent)',  dot: 'var(--accent)' },
  transcribing:     { label: 'Transcribing', color: 'var(--accent)',  dot: 'var(--accent)' },
  analyzing:        { label: 'Analysing',    color: 'var(--accent)',  dot: 'var(--accent)' },
  fetching_context: { label: 'Fetching',     color: 'var(--accent)',  dot: 'var(--accent)' },
  scoring:          { label: 'Scoring',      color: 'var(--amber)',   dot: 'var(--amber)' },
  approved:         { label: 'Approved',     color: 'var(--green)',   dot: 'var(--green)' },
  escalated:        { label: 'Escalated',    color: 'var(--amber)',   dot: 'var(--amber)' },
  rejected:         { label: 'Rejected',     color: 'var(--red)',     dot: 'var(--red)' },
};

function ClaimRow({ claim, selected, onClick }: { claim: ClaimObject; selected: boolean; onClick: () => void }) {
  const cfg = STATUS_CONFIG[claim.status];
  const isLive = !['approved', 'escalated', 'rejected', 'idle'].includes(claim.status);

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className="w-full text-left px-3 py-3 rounded-lg cursor-pointer transition-all"
      style={{
        background: selected ? 'rgba(99,102,241,0.08)' : 'transparent',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--line)'}`,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono" style={{ color: 'var(--ink-3)' }}>
          #{claim.id.slice(0, 8).toUpperCase()}
        </span>
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: cfg.dot, animation: isLive ? 'live-pulse 1.4s ease-in-out infinite' : 'none' }}
          />
          <span className="text-xs font-mono" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
          {claim.user?.name || 'Unknown'}
        </span>
        {claim.fraud_assessment && (
          <span className="text-xs font-mono ml-2 flex-shrink-0" style={{ color: claim.fraud_assessment.confidence_score >= 72 ? 'var(--green)' : 'var(--amber)' }}>
            {claim.fraud_assessment.confidence_score}%
          </span>
        )}
      </div>
      <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
        {formatTimestamp(claim.created_at)}
      </span>
    </motion.button>
  );
}

export function LiveClaimFeed() {
  const { claims, selectedClaimId, setSelectedClaimId } = useClaimStore();

  return (
    <div className="flex flex-col rounded-xl overflow-hidden" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', height: '50%', minHeight: 240 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--line)', flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full animate-live-pulse" style={{ background: 'var(--live-dot)' }} />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>Live Claims</span>
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--ink-4)' }}>{claims.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence initial={false}>
          {claims.length === 0 ? (
            <div className="flex items-center justify-center h-24">
              <p className="text-xs font-mono" style={{ color: 'var(--ink-3)' }}>Waiting for claims…</p>
            </div>
          ) : (
            claims.map((claim) => (
              <ClaimRow
                key={claim.id}
                claim={claim}
                selected={selectedClaimId === claim.id}
                onClick={() => setSelectedClaimId(claim.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
