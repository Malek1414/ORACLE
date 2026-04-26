'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useClaimStore } from '@/store/claim-store';
import { formatTimestamp } from '@/lib/utils';

export function EscalationQueue() {
  const { claims } = useClaimStore();
  const escalated = claims.filter((c) => c.status === 'escalated');

  return (
    <div className="flex flex-col rounded-xl overflow-hidden" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', flex: 1, minHeight: 140 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--line)', flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={12} style={{ color: 'var(--amber)' }} />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--amber)' }}>Escalation Queue</span>
        </div>
        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: escalated.length > 0 ? 'var(--amber-glow)' : 'transparent', color: 'var(--amber)' }}>
          {escalated.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence initial={false}>
          {escalated.length === 0 ? (
            <div className="flex items-center justify-center h-16">
              <p className="text-xs font-mono" style={{ color: 'var(--ink-3)' }}>No escalations</p>
            </div>
          ) : (
            escalated.map((claim) => (
              <motion.div
                key={claim.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-3 py-2.5 rounded-lg mb-1.5"
                style={{ background: 'var(--amber-glow)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono" style={{ color: 'var(--amber)' }}>#{claim.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{claim.user?.name}</p>
                    <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{formatTimestamp(claim.created_at)}</p>
                    {claim.fraud_assessment && (
                      <p className="text-xs font-mono mt-1" style={{ color: 'var(--amber)' }}>
                        Confidence: {claim.fraud_assessment.confidence_score}% • {claim.fraud_assessment.fraud_risk.toUpperCase()} risk
                      </p>
                    )}
                  </div>
                  {claim.resolution?.entire_task_url && (
                    <a href={claim.resolution.entire_task_url} target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-lg flex flex-col items-center gap-0.5" style={{ background: 'rgba(245,158,11,0.15)' }}
                      title="Open GitHub Issue"
                    >
                      <ExternalLink size={14} style={{ color: 'var(--amber)' }} />
                      <span className="text-[9px] font-mono" style={{ color: 'var(--amber)' }}>GH</span>
                    </a>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
