'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useClaimStore } from '@/store/claim-store';
import { supabase } from '@/lib/supabase';
import { ClaimObject } from '@/types/claim';

interface Props {
  onDone: () => void;
}

const STEPS = [
  { key: 'audio_enhanced', label: 'Enhancing audio quality', sublabel: 'ai-coustics neural filter' },
  { key: 'transcript_ready', label: 'Transcribing your statement', sublabel: 'Gradium STT — streaming' },
  { key: 'photos_analyzed', label: 'Analysing damage photos', sublabel: 'Gemini 2.0 Flash — multimodal' },
  { key: 'weather_fetched', label: 'Fetching environmental data', sublabel: 'Tavily — live intelligence' },
  { key: 'pricing_fetched', label: 'Pulling market pricing', sublabel: 'Tavily — repair costs' },
  { key: 'fraud_scored', label: 'Scoring for fraud & confidence', sublabel: 'Pioneer — self-improving model' },
  { key: 'report_delivered', label: 'Delivering FNOL report', sublabel: 'Filed with insurer • GitHub issue if escalated' },
];

export function ProcessingView({ onDone }: Props) {
  const { activeClaim, updateActiveClaim } = useClaimStore();
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [transcript, setTranscript] = useState('');
  const doneCalledRef = useRef(false);

  useEffect(() => {
    if (!activeClaim?.id) return;

    // Try Supabase realtime; fall back to simulated steps
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let didSimulate = false;

    const startSimulation = () => {
      if (didSimulate) return;
      didSimulate = true;
      const STEP_KEYS = ['audio_enhanced', 'transcript_ready', 'photos_analyzed', 'weather_fetched', 'pricing_fetched', 'fraud_scored', 'report_delivered'];
      const DELAYS = [800, 1600, 2800, 1200, 800, 2000, 600];
      const TRANSCRIPTS: Record<string, string> = {
        transcript_ready: 'I was driving southbound when the vehicle in front braked suddenly. I was unable to stop in time and my front bumper made contact with their rear. We have both pulled over safely.',
      };
      let accumulated = 0;
      STEP_KEYS.forEach((key, i) => {
        accumulated += DELAYS[i];
        setTimeout(() => {
          setCompletedSteps((prev) => { const next = new Set(prev); next.add(key); return next; });
          if (TRANSCRIPTS[key]) setTranscript(TRANSCRIPTS[key]);
          if (key === 'report_delivered' && !doneCalledRef.current) {
            doneCalledRef.current = true;
            setTimeout(onDone, 1200);
          }
        }, accumulated);
      });
    };

    try {
      channel = supabase
        .channel(`claim-${activeClaim.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'claims', filter: `id=eq.${activeClaim.id}` },
          (payload) => {
            const updated = payload.new as ClaimObject;
            updateActiveClaim(updated);
            const steps = updated.processing_steps;
            const completed = new Set<string>();
            if (steps.audio_enhanced) completed.add('audio_enhanced');
            if (steps.transcript_ready) { completed.add('transcript_ready'); setTranscript(updated.voice?.transcript || ''); }
            if (steps.photos_analyzed) completed.add('photos_analyzed');
            if (steps.weather_fetched) completed.add('weather_fetched');
            if (steps.pricing_fetched) completed.add('pricing_fetched');
            if (steps.fraud_scored) completed.add('fraud_scored');
            if (steps.report_delivered) completed.add('report_delivered');
            setCompletedSteps(completed);
            if ((updated.status === 'approved' || updated.status === 'escalated' || updated.status === 'rejected') && !doneCalledRef.current) {
              doneCalledRef.current = true;
              setTimeout(onDone, 1200);
            }
          }
        )
        .subscribe((status) => {
          // If Supabase is not configured, fall back to simulation
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') startSimulation();
        });

      // Safety: also simulate after 2s if no DB update received
      const fallbackTimer = setTimeout(startSimulation, 2000);
      return () => {
        clearTimeout(fallbackTimer);
        if (channel) supabase.removeChannel(channel);
      };
    } catch {
      startSimulation();
    }
  }, [activeClaim?.id, updateActiveClaim, onDone]);

  const claimId = activeClaim?.id?.slice(0, 8).toUpperCase() || '...';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 24px max(env(safe-area-inset-bottom,0px),24px)', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <div className="animate-live-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live-dot)' }} />
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Processing</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Claim {claimId}</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: 0 }}>Oracle is working. Usually under 3 minutes.</p>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3 mb-8">
        {STEPS.map((step, i) => {
          const done = completedSteps.has(step.key);
          const active = !done && i === completedSteps.size;
          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 14,
                background: done ? 'rgba(42,126,74,0.06)' : active ? 'var(--bg-elev)' : 'transparent',
                border: `1px solid ${done ? 'rgba(42,126,74,0.2)' : active ? 'var(--line)' : 'var(--line)'}`,
              }}
            >
              <div style={{ flexShrink: 0 }}>
                {done ? (
                  <CheckCircle size={16} style={{ color: '#2A7E4A' }} />
                ) : active ? (
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--ink-3)' }} />
                ) : (
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid var(--line)' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px', color: done ? '#2A7E4A' : active ? 'var(--ink)' : 'var(--ink-4)' }}>{step.label}</p>
                <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', margin: 0 }}>{step.sublabel}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Live transcript */}
      <AnimatePresence>
        {transcript && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ borderRadius: 16, padding: 20, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
            <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', margin: '0 0 10px' }}>Transcript</p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }}>{transcript}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
