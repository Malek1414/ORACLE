'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { ClaimObject } from '@/types/claim';
import { formatCurrency, formatDuration, formatTimestamp, CONFIDENCE_THRESHOLD } from '@/lib/utils';
import { CheckCircle, AlertTriangle, Zap, Mic, Camera, Cloud, DollarSign, ShieldCheck, Clock } from 'lucide-react';

interface Props {
  claim: ClaimObject | null;
}

// ─── Animated number counter
function AnimatedNumber({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));
  const [displayed, setDisplayed] = useState('0');

  useEffect(() => { spring.set(value); }, [value, spring]);
  useEffect(() => display.on('change', setDisplayed), [display]);

  return <>{displayed}{suffix}</>;
}

// ─── A single populating data field
function DataField({ label, value, accent = false, mono = false }: { label: string; value: string | null | undefined; accent?: boolean; mono?: boolean }) {
  const [visible, setVisible] = useState(false);
  const prevValue = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (value && value !== prevValue.current) {
      prevValue.current = value;
      setVisible(false);
      const t = setTimeout(() => setVisible(true), 30);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--ink-3)' }}>{label}</p>
      <AnimatePresence mode="wait">
        {value && visible ? (
          <motion.p
            key={value}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className={`text-sm ${mono ? 'font-mono' : ''}`}
            style={{ color: accent ? 'var(--accent)' : 'var(--ink)' }}
          >
            {value}
          </motion.p>
        ) : (
          <motion.div key="empty" className="h-4 rounded" style={{ background: 'var(--bg-soft)', width: value ? '100%' : '60%', opacity: 0.7 }} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Section header
function SectionHeader({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; color?: string }> ; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '1px solid var(--line)' }}>
      <Icon size={12} color="var(--accent)" />
      <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--ink-2)' }}>{label}</span>
    </div>
  );
}

// ─── THE CINEMATIC CONFIDENCE SEQUENCE
function ConfidenceReveal({ assessment, claimId }: { assessment: NonNullable<ClaimObject['fraud_assessment']>; claimId: string }) {
  const [phase, setPhase] = useState<'counting' | 'reasoning' | 'decision'>('counting');
  const [visibleReasons, setVisibleReasons] = useState(0);
  const approved = assessment.confidence_score >= CONFIDENCE_THRESHOLD;

  // Re-run cinematic sequence whenever a different claim is selected
  useEffect(() => {
    setPhase('counting');
    setVisibleReasons(0);
    const t1 = setTimeout(() => setPhase('reasoning'), 1600);
    return () => clearTimeout(t1);
  }, [claimId]);

  useEffect(() => {
    if (phase !== 'reasoning') return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleReasons(i);
      if (i >= assessment.reasoning.length) {
        clearInterval(interval);
        setTimeout(() => setPhase('decision'), 500);
      }
    }, 280);
    return () => clearInterval(interval);
  }, [phase, assessment.reasoning.length]);

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-soft)', border: `1px solid ${approved ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--ink-3)' }}>Pioneer Confidence Score</p>
          <div className="text-6xl font-bold font-mono" style={{ color: approved ? 'var(--green)' : 'var(--amber)', lineHeight: 1 }}>
            <AnimatedNumber value={assessment.confidence_score} />
            <span className="text-2xl" style={{ color: 'var(--ink-3)' }}>/100</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono" style={{ color: 'var(--ink-3)' }}>v{assessment.model_version}</p>
          <p className="text-xs font-mono" style={{ color: 'var(--accent)' }}>{assessment.claims_trained_on.toLocaleString()} trained</p>
          <div className="mt-2 px-2 py-1 rounded text-xs font-mono uppercase" style={{ background: assessment.fraud_risk === 'low' ? 'rgba(16,185,129,0.1)' : assessment.fraud_risk === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: assessment.fraud_risk === 'low' ? 'var(--green)' : assessment.fraud_risk === 'medium' ? 'var(--amber)' : 'var(--red)' }}>
            {assessment.fraud_risk} risk
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="h-1 rounded-full mb-5" style={{ background: 'var(--bg-soft)' }}>
        <motion.div
          className="h-1 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${assessment.confidence_score}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ background: approved ? 'var(--green)' : 'var(--amber)' }}
        />
      </div>

      {/* Reasoning lines */}
      <div className="flex flex-col gap-2 mb-4">
        {assessment.reasoning.map((reason, i) => (
          <AnimatePresence key={i}>
            {i < visibleReasons && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2"
              >
                <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--accent)' }} />
                <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{reason}</p>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {/* THE DECISION — cinematic reveal */}
      <AnimatePresence>
        {phase === 'decision' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
            className="flex items-center justify-center gap-3 py-4 rounded-xl"
            style={{
              background: approved ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
              border: `1px solid ${approved ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
            }}
          >
            {approved
              ? <CheckCircle size={22} style={{ color: 'var(--green)' }} />
              : <AlertTriangle size={22} style={{ color: 'var(--amber)' }} />
            }
            <span className="text-xl font-bold" style={{ color: approved ? 'var(--green)' : 'var(--amber)' }}>
              {approved ? 'AUTO-APPROVED' : 'ESCALATED TO ADJUSTER'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const LIVE_STATUSES = new Set(['recording', 'enhancing', 'transcribing', 'analyzing', 'fetching_context', 'scoring']);

function LiveProcessingBanner({ status }: { status: string }) {
  const labels: Record<string, string> = {
    recording: 'Waiting for voice recording…',
    enhancing: 'ai-coustics — enhancing audio quality…',
    transcribing: 'Gradium STT — streaming transcript…',
    analyzing: 'Gemini — analysing damage photos…',
    fetching_context: 'Tavily — fetching weather & pricing data…',
    scoring: 'Pioneer — computing fraud score…',
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
      style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid var(--accent)' }}
    >
      <div className="w-2 h-2 rounded-full flex-shrink-0 animate-live-pulse" style={{ background: 'var(--accent)' }} />
      <p className="text-sm font-mono" style={{ color: 'var(--accent)' }}>
        {labels[status] || 'Processing…'}
      </p>
    </motion.div>
  );
}

export function ClaimDetail({ claim }: Props) {
  if (!claim) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 rounded-xl" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', opacity: 1 }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-soft)' }}>
          <ShieldCheck size={20} style={{ color: 'var(--ink-3)' }} />
        </div>
        <p className="text-sm font-mono" style={{ color: 'var(--ink-3)' }}>Select a claim to inspect</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto rounded-xl" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
      {/* Claim header */}
      <div className="sticky top-0 flex items-center justify-between px-5 py-3.5 border-b z-10" style={{ background: 'var(--bg-elev)', borderColor: 'var(--line)' }}>
        <div>
          <p className="text-xs font-mono" style={{ color: 'var(--ink-3)' }}>CLAIM ID</p>
          <p className="font-mono text-sm font-bold" style={{ color: 'var(--accent)' }}>#{claim.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono" style={{ color: 'var(--ink-3)' }}>{formatTimestamp(claim.created_at)}</p>
          {claim.resolution?.resolution_time_seconds && (
            <div className="flex items-center gap-1 justify-end">
              <Clock size={10} style={{ color: 'var(--green)' }} />
              <p className="text-xs font-mono" style={{ color: 'var(--green)' }}>{formatDuration(claim.resolution.resolution_time_seconds)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* Live processing banner */}
        {LIVE_STATUSES.has(claim.status) && <LiveProcessingBanner status={claim.status} />}

        {/* Processing steps */}
        <ProcessingStepsBar steps={claim.processing_steps} />

        {/* Incident */}
        <div className="grid grid-cols-2 gap-3">
          <SectionHeader icon={Zap} label="Incident" />
          <div /> {/* spacer */}
          <DataField label="Policyholder" value={claim.user?.name} accent />
          <DataField label="Policy" value={claim.user?.policy_number} mono />
          <DataField label="Insurer" value={claim.user?.insurer} />
          <DataField label="Incident Type" value={claim.incident?.incident_type?.replace('_', ' ')} />
          <div className="col-span-2">
            <DataField label="Location" value={claim.incident?.location?.address} />
          </div>
        </div>

        {/* Voice */}
        {claim.voice && (
          <div>
            <SectionHeader icon={Mic} label="Voice Analysis" />
            <div className="grid grid-cols-3 gap-3 mb-3">
              <DataField label="Stress Score" value={claim.voice.stress_score != null ? claim.voice.stress_score.toFixed(2) : null} mono />
              <DataField label="Sentiment" value={claim.voice.acoustic_sentiment} />
              <DataField label="Duration" value={claim.voice.duration_seconds ? `${claim.voice.duration_seconds}s` : null} mono />
            </div>
            {claim.voice.transcript && (
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--ink-3)' }}>Transcript</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>{claim.voice.transcript}</p>
              </div>
            )}
          </div>
        )}

        {/* Photos */}
        {claim.photos && (
          <div>
            <SectionHeader icon={Camera} label="Photos" />
            <p className="text-sm font-mono" style={{ color: 'var(--ink-2)' }}>{claim.photos.count} image{claim.photos.count !== 1 ? 's' : ''} captured</p>
          </div>
        )}

        {/* Damage analysis */}
        {claim.damage_analysis && (
          <div>
            <SectionHeader icon={Camera} label="Damage Analysis — Gemini" />
            <div className="grid grid-cols-2 gap-3">
              <DataField label="Severity" value={claim.damage_analysis.severity} accent />
              <DataField label="Location" value={claim.damage_analysis.damage_location} />
              <DataField label="Est. Min" value={formatCurrency(claim.damage_analysis.estimated_repair_cost.min)} mono />
              <DataField label="Est. Max" value={formatCurrency(claim.damage_analysis.estimated_repair_cost.max)} mono />
              <div className="col-span-2">
                <DataField label="Consistent with description" value={claim.damage_analysis.damage_consistent_with_description ? '✓ Yes' : '⚠️ No — inconsistency detected'} />
              </div>
            </div>
            {claim.damage_analysis.damage_details.length > 0 && (
              <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                {claim.damage_analysis.damage_details.map((d, i) => (
                  <motion.p key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="text-xs mb-1" style={{ color: 'var(--ink-2)' }}>• {d}</motion.p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Environmental */}
        {claim.environmental && (
          <div>
            <SectionHeader icon={Cloud} label="Environmental — Tavily" />
            <div className="grid grid-cols-2 gap-3">
              <DataField label="Weather" value={claim.environmental.weather_condition} />
              <DataField label="Temperature" value={`${claim.environmental.temperature_celsius}°C`} mono />
              <DataField label="Road" value={claim.environmental.road_conditions} />
              <DataField label="Visibility" value={claim.environmental.visibility} />
              <DataField label="Precipitation" value={claim.environmental.precipitation} />
              <DataField label="Wind" value={`${claim.environmental.wind_speed_kmh} km/h`} mono />
            </div>
          </div>
        )}

        {/* Market data */}
        {claim.market_data && (
          <div>
            <SectionHeader icon={DollarSign} label="Market Pricing — Tavily" />
            <div className="grid grid-cols-3 gap-3">
              <DataField label="Avg Market Cost" value={formatCurrency(claim.market_data.average_repair_cost_usd)} mono accent />
              <DataField label="Range Min" value={formatCurrency(claim.market_data.cost_range.min)} mono />
              <DataField label="Range Max" value={formatCurrency(claim.market_data.cost_range.max)} mono />
            </div>
          </div>
        )}

        {/* FRAUD ASSESSMENT — the cinematic centrepiece */}
        {claim.fraud_assessment && (
          <div>
            <SectionHeader icon={ShieldCheck} label="Fraud Assessment — Pioneer" />
            <ConfidenceReveal assessment={claim.fraud_assessment} claimId={claim.id} />
          </div>
        )}
      </div>
    </div>
  );
}

function ProcessingStepsBar({ steps }: { steps: ClaimObject['processing_steps'] }) {
  const stepDefs = [
    { key: 'audio_enhanced', label: 'Audio' },
    { key: 'transcript_ready', label: 'STT' },
    { key: 'photos_analyzed', label: 'Vision' },
    { key: 'weather_fetched', label: 'Weather' },
    { key: 'pricing_fetched', label: 'Pricing' },
    { key: 'fraud_scored', label: 'Pioneer' },
    { key: 'report_delivered', label: 'FNOL' },
  ] as const;

  return (
    <div className="flex items-center gap-1">
      {stepDefs.map(({ key, label }, i) => {
        const done = steps[key];
        return (
          <div key={key} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className="h-1 w-full rounded-full"
                style={{ background: done ? 'var(--accent)' : 'var(--bg-soft)' }}
              />
              <span className="text-[9px] font-mono mt-1" style={{ color: done ? 'var(--accent)' : 'var(--ink-3)' }}>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
