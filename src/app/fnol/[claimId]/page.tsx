'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import { OtherDriver, Witness, PoliceReport } from '@/types/claim';
import { supabase } from '@/lib/supabase';
import { OtherDriverBlock, EMPTY_OTHER_DRIVER } from '@/components/fnol/OtherDriverBlock';
import { WitnessesBlock } from '@/components/fnol/WitnessesBlock';
import { PoliceReportBlock, EMPTY_POLICE_REPORT } from '@/components/fnol/PoliceReportBlock';
import { FNOLSummary } from '@/components/fnol/FNOLSummary';
import { SignaturePad, SignaturePadRef } from '@/components/fnol/SignaturePad';

type WizardScreen = 'other_driver' | 'witnesses' | 'police_report' | 'summary' | 'signature' | 'preview';
type Screen = WizardScreen | 'submitted';

const SCREENS: Screen[] = ['other_driver', 'witnesses', 'police_report', 'summary', 'signature', 'preview', 'submitted'];
const SCREEN_LABELS: Partial<Record<Screen, string>> = {
  other_driver: 'Other Driver',
  witnesses: 'Witnesses',
  police_report: 'Police Report',
  summary: 'Review',
  signature: 'Sign',
  preview: 'Preview',
  submitted: 'Done',
};

function ProgressBar({ screen }: { screen: Screen }) {
  if (screen === 'submitted') return null;
  const idx = SCREENS.indexOf(screen);
  const pct = Math.round(((idx + 1) / (SCREENS.length - 1)) * 100);
  return (
    <div style={{ padding: '12px 24px 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
          {SCREEN_LABELS[screen]}
        </span>
        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{idx + 1} / {SCREENS.length - 1}</span>
      </div>
      <div style={{ height: 3, borderRadius: 999, background: 'var(--line)' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: 'var(--ink)', transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
    </div>
  );
}

export default function FNOLPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('other_driver');
  const [otherDriver, setOtherDriver] = useState<OtherDriver>({ ...EMPTY_OTHER_DRIVER });
  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [policeReport, setPoliceReport] = useState<PoliceReport>({ ...EMPTY_POLICE_REPORT });
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sigRef = useRef<SignaturePadRef>(null);

  // Save incremental FNOL data to Supabase on screen transition (non-blocking)
  const persistData = async () => {
    if (!claimId) return;
    await supabase.from('claims').update({
      other_driver: otherDriver,
      witnesses,
      police_report: policeReport,
    }).eq('id', claimId);
  };

  const goNext = async () => {
    const idx = SCREENS.indexOf(screen);
    if (screen === 'signature') {
      const sig = sigRef.current;
      if (!sig || sig.isEmpty()) { setError('Please sign before continuing.'); return; }
      setSignatureDataUrl(sig.getDataURL());
    }
    if (screen === 'summary') await persistData();
    if (idx < SCREENS.length - 1) {
      setError(null);
      if (screen === 'signature') {
        // Generate PDF preview
        const sig = sigRef.current?.getDataURL() ?? signatureDataUrl;
        await handleGeneratePreview(sig);
      } else {
        setScreen(SCREENS[idx + 1]);
      }
    }
  };

  const goBack = () => {
    const idx = SCREENS.indexOf(screen);
    if (idx > 0) setScreen(SCREENS[idx - 1]);
    else router.back();
  };

  const handleGeneratePreview = async (sig: string | null) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/fnol/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, signatureDataUrl: sig }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setScreen('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate PDF');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/fnol/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, signatureDataUrl }),
      });
      if (!res.ok) throw new Error(await res.text());
      setScreen('submitted');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const screenTitle: Record<Screen, string> = {
    other_driver: 'Other Driver Details',
    witnesses: 'Witnesses',
    police_report: 'Police Report',
    summary: 'Review Your Information',
    signature: 'Sign the FNOL',
    preview: 'PDF Preview',
    submitted: 'Submitted',
  };

  if (screen === 'submitted') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: 'var(--bg)', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', background: 'rgba(42,126,74,0.1)', border: '1px solid rgba(42,126,74,0.3)' }}>
          <CheckCircle2 size={36} style={{ color: '#2A7E4A' }} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 8px' }}>FNOL Submitted</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 32px', maxWidth: 320, lineHeight: 1.55 }}>Your completed Allianz FNOL form has been sent to the claims team.</p>
        <button
          onClick={() => router.push('/my-claims')}
          style={{ padding: '13px 28px', borderRadius: 999, background: 'var(--ink)', color: 'var(--bg)', border: 'none', fontSize: 14, fontWeight: 400, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
        >
          View My Claims
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 16px', borderBottom: '1px solid var(--line)' }}>
        <button onClick={goBack} style={{ padding: 8, borderRadius: 10, background: 'var(--bg-elev)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} style={{ color: 'var(--ink)' }} />
        </button>
        <div>
          <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', margin: 0 }}>FNOL Form</p>
          <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink)', margin: 0 }}>{screenTitle[screen]}</p>
        </div>
      </div>

      <ProgressBar screen={screen} />

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px max(env(safe-area-inset-bottom,0px),24px)' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            {screen === 'other_driver' && (
              <OtherDriverBlock value={otherDriver} onChange={setOtherDriver} />
            )}
            {screen === 'witnesses' && (
              <WitnessesBlock value={witnesses} onChange={setWitnesses} />
            )}
            {screen === 'police_report' && (
              <PoliceReportBlock value={policeReport} onChange={setPoliceReport} />
            )}
            {screen === 'summary' && (
              <FNOLSummary otherDriver={otherDriver} witnesses={witnesses} policeReport={policeReport} />
            )}
            {screen === 'signature' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0, lineHeight: 1.55 }}>Draw your signature below to authorise this First Notice of Loss.</p>
                <SignaturePad ref={sigRef} height={200} />
              </div>
            )}
            {screen === 'preview' && pdfUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0 }}>Review the completed FNOL before submission.</p>
                <div style={{ height: '60vh', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
                  <iframe src={pdfUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="FNOL PDF Preview" />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <div style={{ marginTop: 16, background: 'rgba(208,64,64,0.08)', border: '1px solid rgba(208,64,64,0.25)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#e57373', lineHeight: 1.5 }}>
            {error}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      {(screen as string) !== 'submitted' && (
        <div style={{ padding: '16px 24px max(env(safe-area-inset-bottom,0px),16px)', borderTop: '1px solid var(--line)' }}>
          {screen === 'preview' ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 22px', borderRadius: 999,
                background: submitting ? 'var(--bg-elev)' : 'var(--ink)',
                color: submitting ? 'var(--ink-4)' : 'var(--bg)',
                border: '1px solid var(--line)', fontSize: 14, fontWeight: 400, cursor: submitting ? 'default' : 'pointer',
                fontFamily: 'var(--font-sans)', transition: 'background 0.2s',
              }}
            >
              {submitting ? <Loader2 size={16} style={{ animation: 'spin-slow 0.9s linear infinite' }} /> : <CheckCircle2 size={16} />}
              {submitting ? 'Submitting…' : 'Submit to Allianz'}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={submitting}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 22px', borderRadius: 999,
                background: submitting ? 'var(--bg-elev)' : 'var(--ink)',
                color: submitting ? 'var(--ink-4)' : 'var(--bg)',
                border: '1px solid var(--line)', fontSize: 14, fontWeight: 400, cursor: submitting ? 'default' : 'pointer',
                fontFamily: 'var(--font-sans)', transition: 'background 0.2s',
              }}
            >
              {submitting && <Loader2 size={16} style={{ animation: 'spin-slow 0.9s linear infinite' }} />}
              {submitting ? 'Generating PDF…' : 'Continue'}
              {!submitting && <ChevronRight size={16} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
