'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useClaimStore } from '@/store/claim-store';
import { ClaimObject } from '@/types/claim';
import { LiveClaimFeed } from '@/components/dashboard/LiveClaimFeed';
import { ClaimDetail } from '@/components/dashboard/ClaimDetail';
import { AnalyticsPanel } from '@/components/dashboard/AnalyticsPanel';
import { EscalationQueue } from '@/components/dashboard/EscalationQueue';
import { OracleLogo } from '@/components/ui/OracleLogo';
import { ModelBadge } from '@/components/ui/ModelBadge';
import { SeedButton } from '@/components/dashboard/SeedButton';

export default function DashboardPage() {
  const { claims, setClaims, upsertClaim, selectedClaimId, setModelStats } = useClaimStore();
  const [connected, setConnected] = useState(false);

  // Initial load
  useEffect(() => {
    fetch('/api/claims')
      .then((r) => r.json())
      .then(({ claims: c }) => { if (c && c.length > 0) setClaims(c); })
      .catch(console.error);
  }, [setClaims]);

  // Real-time subscription
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel('claims-dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' },
          (payload) => {
            const claim = (payload.new || payload.old) as ClaimObject;
            if (claim) {
              upsertClaim(claim);
              if (claim.fraud_assessment) {
                setModelStats(claim.fraud_assessment.model_version, claim.fraud_assessment.claims_trained_on);
              }
            }
          }
        )
        .subscribe((status) => setConnected(status === 'SUBSCRIBED'));
    } catch {
      // Supabase not configured — demo mode
      setConnected(false);
    }

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [upsertClaim, setModelStats]);

  const selected = claims.find((c) => c.id === selectedClaimId) || claims[0] || null;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--line)', background: 'var(--bg-elev)', boxShadow: '0 1px 0 rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-4">
          <OracleLogo />
          <div className="w-px h-6" style={{ background: 'var(--line)' }} />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>Operations Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <SeedButton />
          <ModelBadge />
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: connected ? 'var(--green)' : 'var(--amber)', animation: connected ? 'live-pulse 1.4s ease-in-out infinite' : 'none' }}
            />
            <span className="text-xs font-mono" style={{ color: connected ? 'var(--green)' : 'var(--amber)' }}>
              {connected ? 'LIVE' : 'CONNECTING'}
            </span>
          </div>
        </div>
      </header>

      {/* Dashboard grid */}
      <div className="flex-1 p-4 gap-4 overflow-hidden" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gridTemplateRows: 'auto 1fr', minHeight: 0, height: 'calc(100dvh - 61px)' }}>
        {/* Left: feed + escalations stacked */}
        <div className="flex flex-col gap-4 overflow-hidden" style={{ gridRow: '1 / 3' }}>
          <LiveClaimFeed />
          <EscalationQueue />
        </div>

        {/* Right top: analytics */}
        <div style={{ gridColumn: 2, gridRow: 1 }}>
          <AnalyticsPanel />
        </div>

        {/* Right bottom: claim detail — takes remaining height */}
        <div style={{ gridColumn: 2, gridRow: 2, overflow: 'hidden', minHeight: 0 }}>
          <ClaimDetail claim={selected} />
        </div>
      </div>
    </div>
  );
}
