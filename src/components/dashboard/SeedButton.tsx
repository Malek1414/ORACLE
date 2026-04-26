'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Loader2 } from 'lucide-react';
import { useClaimStore } from '@/store/claim-store';
import { DEMO_APPROVED, DEMO_ESCALATED, DEMO_PROCESSING } from '@/lib/demo-data';

export function SeedButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { setClaims, setModelStats, setSelectedClaimId } = useClaimStore();

  const seed = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      if (!res.ok) throw new Error('no db');
    } catch {
      // No Supabase — populate store directly for demo
      setClaims([DEMO_APPROVED, DEMO_ESCALATED, DEMO_PROCESSING]);
      setModelStats('2.4.1', 847293);
      setSelectedClaimId(DEMO_APPROVED.id);
    }
    setDone(true);
    setTimeout(() => setDone(false), 3000);
    setLoading(false);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={seed}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-all"
      style={{
        background: done ? 'rgba(16,185,129,0.1)' : 'var(--bg-soft)',
        border: `1px solid ${done ? 'rgba(16,185,129,0.3)' : 'var(--line)'}`,
        color: done ? 'var(--green)' : 'var(--ink-3)',
      }}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <FlaskConical size={12} />}
      {done ? 'Demo loaded ✓' : 'Load Demo'}
    </motion.button>
  );
}
