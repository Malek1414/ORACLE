'use client';

import { useClaimStore } from '@/store/claim-store';

export function ModelBadge() {
  const { modelVersion, claimsTrainedOn } = useClaimStore();
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
      <div className="text-right">
        <p className="text-xs font-mono" style={{ color: 'var(--ink-3)' }}>Pioneer v{modelVersion}</p>
        <p className="text-xs font-mono" style={{ color: 'var(--accent)' }}>{claimsTrainedOn.toLocaleString()} claims trained</p>
      </div>
      <div className="w-px h-6" style={{ background: 'var(--line)' }} />
      <div className="text-xs font-mono" style={{ color: 'var(--ink-3)' }}>AI</div>
    </div>
  );
}
