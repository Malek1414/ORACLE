'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Send, ArrowLeft, CheckCircle2 } from 'lucide-react';

function ReviewContent() {
  const params  = useSearchParams();
  const router  = useRouter();
  const claimId = params.get('claimId');

  const [pdfUrl,     setPdfUrl]     = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (!claimId) { setError('No claimId provided.'); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch('/api/fnol/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claimId, signatureDataUrl: null }),
        });
        if (!res.ok) throw new Error(await res.text());
        const blob = await res.blob();
        setPdfUrl(URL.createObjectURL(blob));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate PDF');
      } finally {
        setLoading(false);
      }
    })();
  }, [claimId]);

  const handleSubmit = async () => {
    if (!claimId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/fnol/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, signatureDataUrl: null }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: 'var(--bg)', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', background: 'rgba(42,126,74,0.1)', border: '1px solid rgba(42,126,74,0.3)' }}>
          <CheckCircle2 size={36} style={{ color: '#2A7E4A' }} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 8px' }}>FNOL Submitted</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 32px', maxWidth: 320, lineHeight: 1.55 }}>Your completed Allianz FNOL form has been sent to the claims team.</p>
        <button onClick={() => router.push('/my-claims')}
          style={{ padding: '13px 28px', borderRadius: 999, background: 'var(--ink)', color: 'var(--bg)', border: 'none', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          View My Claims
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
        <button onClick={() => router.back()}
          style={{ padding: 8, borderRadius: 10, background: 'var(--bg-elev)', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft size={18} style={{ color: 'var(--ink)' }} />
        </button>
        <div>
          <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', margin: 0 }}>FNOL Review</p>
          <p style={{ fontSize: 14, color: 'var(--ink)', margin: 0 }}>Review before submission</p>
        </div>
      </div>

      {/* PDF Viewer */}
      <div style={{ flex: 1, padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: 'var(--ink-3)' }} />
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Generating PDF…</span>
          </div>
        )}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(208,64,64,0.08)', border: '1px solid rgba(208,64,64,0.25)', fontSize: 13, color: '#e57373' }}>
            {error}
          </div>
        )}
        {pdfUrl && !loading && (
          <iframe
            src={pdfUrl}
            style={{ flex: 1, minHeight: '70vh', border: '1px solid var(--line)', borderRadius: 16 }}
            title="FNOL PDF"
          />
        )}
      </div>

      {/* Submit CTA */}
      {pdfUrl && !loading && (
        <div style={{ padding: '16px 20px max(env(safe-area-inset-bottom,0px),16px)', borderTop: '1px solid var(--line)' }}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 22px', borderRadius: 999, background: submitting ? 'var(--bg-elev)' : 'var(--ink)',
              color: submitting ? 'var(--ink-4)' : 'var(--bg)', border: '1px solid var(--line)',
              fontSize: 14, cursor: submitting ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', transition: 'background 0.2s' }}
          >
            {submitting
              ? <><Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} /> Submitting…</>
              : <><Send size={16} /> Submit to Allianz</>}
          </button>
        </div>
      )}
    </div>
  );
}

export default function FNOLReviewPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--ink-3)' }} />
      </div>
    }>
      <ReviewContent />
    </Suspense>
  );
}
