'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, Clock } from 'lucide-react';
import { useClaimStore } from '@/store/claim-store';

interface Props {
  claimId: string;
  photosPending: boolean;
  onViewClaims: () => void;
}

export function RoadsideResultScreen({ claimId, photosPending, onViewClaims }: Props) {
  const router = useRouter();
  const { activeClaim } = useClaimStore();

  const costMin = activeClaim?.damage_analysis?.estimated_repair_cost?.min;
  const costMax = activeClaim?.damage_analysis?.estimated_repair_cost?.max;
  const currency = activeClaim?.damage_analysis?.estimated_repair_cost?.currency ?? 'USD';
  const hasCostEstimate = !photosPending && costMin != null && costMax != null;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px max(env(safe-area-inset-bottom,0px),40px)',
      background: 'var(--bg)',
      textAlign: 'center',
    }}>
      {/* Icon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{ marginBottom: 24 }}
      >
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(42,126,74,0.1)', border: '1px solid rgba(42,126,74,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
        }}>
          <CheckCircle2 size={36} style={{ color: '#2A7E4A' }} />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <h1 className="text-2xl font-semibold mb-2">Claim submitted</h1>
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>We&rsquo;ve received your report and will be in touch shortly.</p>
      </motion.div>

      {/* Cost estimate OR pending photos notice */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{ width: '100%', margin: '32px 0', padding: '24px 28px', borderRadius: 20, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}
      >
        {hasCostEstimate ? (
          <>
            <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', margin: '0 0 8px' }}>Estimated repair cost</p>
            <p style={{ fontSize: 36, fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '0 0 4px' }}>
              {currency === 'USD' ? '$' : ''}{costMin?.toLocaleString()} &ndash; {currency === 'USD' ? '$' : ''}{costMax?.toLocaleString()}
            </p>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>Based on photo damage analysis</p>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Clock size={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 2px', color: 'var(--ink)' }}>Photos pending</p>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5 }}>Cost estimate will be generated once photos are added via the FNOL form.</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="w-full flex flex-col gap-3"
      >
        <button
          onClick={() => router.push(`/fnol/${claimId}`)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 22px', borderRadius: 999,
            background: 'var(--ink)', color: 'var(--bg)',
            border: 'none', fontSize: 14, fontWeight: 400, cursor: 'pointer',
            fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em',
          }}
        >
          Complete your claim <ChevronRight size={16} />
        </button>
        <button
          onClick={onViewClaims}
          style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)', padding: '8px' }}
        >
          I&rsquo;ll do this later
        </button>
      </motion.div>
    </div>
  );
}
