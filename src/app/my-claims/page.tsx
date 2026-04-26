'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useClaimStore } from '@/store/claim-store';
import { ClaimObject, ClaimStatus } from '@/types/claim';
import { OracleMark } from '@/components/Nav';

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  idle: 'Draft', recording: 'Recording', enhancing: 'Enhancing',
  transcribing: 'Transcribing', analyzing: 'Analyzing',
  fetching_context: 'Gathering', scoring: 'Scoring',
  approved: 'Approved', escalated: 'Review', rejected: 'Rejected',
};

const STATUS_COLOR: Record<string, string> = {
  idle: 'var(--status-filing)', recording: 'var(--status-filing)',
  enhancing: 'var(--status-filing)', transcribing: 'var(--status-filing)',
  analyzing: 'var(--status-filing)', fetching_context: 'var(--status-filing)',
  scoring: 'var(--status-review)', approved: 'var(--status-approved)',
  escalated: 'var(--status-review)', rejected: '#D04040',
};

function sLabel(s: ClaimStatus) { return STATUS_LABEL[s] ?? s; }
function sColor(s: ClaimStatus) { return STATUS_COLOR[s] ?? 'var(--ink-3)'; }

function progressPct(claim: ClaimObject): number {
  const keys: (keyof typeof claim.processing_steps)[] = [
    'audio_received','audio_enhanced','transcript_ready','photos_analyzed',
    'weather_fetched','pricing_fetched','fraud_scored','report_delivered',
  ];
  return Math.round(keys.filter(k => claim.processing_steps[k]).length / keys.length * 100);
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  // Do not compare against new Date() here — server and client clocks diverge
  // causing a hydration mismatch. Always return a locale string; "Today" is
  // shown only client-side via suppressHydrationWarning on the element.
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function claimTitle(c: ClaimObject) {
  return c.incident?.incident_type
    ? `${c.incident.incident_type} · ${c.incident.location?.city ?? ''}`.trim().replace(/ ·\s*$/, '')
    : `Claim #${c.id.slice(0, 6).toUpperCase()}`;
}

// ── CountUp ─────────────────────────────────────────────────────────────────

function CountUp({ to, format }: { to: number; format?: (v: number) => string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1800;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(to * ease);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [to]);
  return <>{format ? format(val) : Math.floor(val)}</>;
}

// ── Claims list row ──────────────────────────────────────────────────────────

function ClaimRow({ claim, idx, selected, onClick }: { claim: ClaimObject; idx: number; selected: boolean; onClick: () => void }) {
  const payout = claim.damage_analysis?.estimated_repair_cost;
  const amount = payout ? fmt((payout.min + payout.max) / 2) : '—';
  return (
    <button onClick={onClick} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      padding: '16px 20px',
      textAlign: 'left',
      background: selected ? 'var(--bg-soft)' : 'transparent',
      border: 'none',
      borderBottom: '1px solid var(--line)',
      cursor: 'pointer',
      transition: 'background 0.15s',
    }}>
      <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 300, width: 28, flexShrink: 0 }}>
        {String(idx + 1).padStart(2, '0')}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {claimTitle(claim)}
        </span>
        <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
          {amount} &middot; {fmtDate(claim.created_at)}
        </span>
      </span>
      <span style={{
        fontSize: 10,
        padding: '2px 8px',
        borderRadius: 999,
        background: 'var(--bg)',
        color: sColor(claim.status),
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        flexShrink: 0,
        border: `1px solid ${sColor(claim.status)}30`,
      }}>
        {sLabel(claim.status)}
      </span>
    </button>
  );
}

// ── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({ claim }: { claim: ClaimObject }) {
  const router = useRouter();
  const pct = progressPct(claim);
  const payout = claim.damage_analysis?.estimated_repair_cost;
  const title = claimTitle(claim);
  const amount = payout ? fmt((payout.min + payout.max) / 2) : '—';

  const STEP_KEYS: (keyof typeof claim.processing_steps)[] = [
    'audio_received','audio_enhanced','transcript_ready','photos_analyzed',
    'weather_fetched','pricing_fetched','fraud_scored','report_delivered',
  ];

  // Build timeline events from processing steps
  const STEP_META: { key: keyof typeof claim.processing_steps; title: string; desc: string }[] = [
    { key: 'audio_received',   title: 'Claim started',       desc: 'You began describing the incident.' },
    { key: 'transcript_ready', title: 'Details extracted',   desc: 'Location, injuries, photos verified.' },
    { key: 'fraud_scored',     title: 'Carrier submitted',   desc: 'Packet sent via direct API.' },
    { key: 'report_delivered', title: 'Report delivered',    desc: 'Claim packet ready for adjuster.' },
  ];

  const lastDoneIdx = STEP_META.reduce((acc, s, i) => claim.processing_steps[s.key] ? i : acc, -1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Detail card */}
      <div style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        borderRadius: 24,
        overflow: 'hidden',
      }}>
        {/* Top section */}
        <div style={{
          padding: '28px 32px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999,
                background: 'var(--bg-soft)', border: '1px solid var(--line)',
                fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-2)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: sColor(claim.status), boxShadow: `0 0 5px ${sColor(claim.status)}` }} />
                {sLabel(claim.status)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{claim.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 400, letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 4 }}>Amount</div>
            <div style={{ fontSize: 32, fontWeight: 300, letterSpacing: '-0.02em' }}>{amount}</div>
          </div>
        </div>

        {/* Progress section */}
        <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>Progress</span>
            <span style={{ fontSize: 11, color: 'var(--ink)' }}>{pct}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: 'var(--bg-soft)', overflow: 'hidden', marginBottom: 10 }}>
            <div style={{
              height: '100%', width: `${pct}%`, borderRadius: 999,
              background: 'var(--dark-card)',
              transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {['Filed','Adjuster','Approved','Paid'].map((label, i) => (
              <span key={label} style={{
                fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em',
                color: pct >= (i + 1) * 25 ? 'var(--ink)' : 'var(--ink-4)',
              }}>{label}</span>
            ))}
          </div>
        </div>

        {/* Timeline section */}
        <div style={{ padding: '24px 32px' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 16 }}>Timeline</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {STEP_META.map((s, i) => {
              const done = !!claim.processing_steps[s.key];
              const isLive = !done && i === lastDoneIdx + 1;
              const pending = !done && !isLive;
              return (
                <div key={s.key} style={{ display: 'flex', gap: 12 }}>
                  {/* Time + dot column */}
                  <div style={{ width: 44, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{done || isLive ? `${i}:${String(i * 37 + 11).padStart(2,'0')}` : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 3 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: done ? '#2A7E4A' : isLive ? 'var(--dark-card)' : 'var(--line)',
                      outline: isLive ? '3px solid var(--bg-soft)' : 'none',
                      outlineOffset: 1,
                    }} />
                    {i < STEP_META.length - 1 && (
                      <div style={{ width: 2, height: 26, background: 'var(--line)', margin: '2px 0' }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: i < STEP_META.length - 1 ? 8 : 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: pending ? 'var(--ink-4)' : 'var(--ink)', lineHeight: 1.3 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{s.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FNOL CTA if not submitted */}
      {!claim.fnol_submitted && claim.id && (
        <div style={{
          background: 'var(--dark-card)',
          borderRadius: 16,
          padding: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          color: 'var(--dark-ink)',
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--dark-ink-2)', marginBottom: 4 }}>Complete your filing</div>
            <div style={{ fontSize: 18, fontWeight: 300 }}>FNOL form · 3 min</div>
          </div>
          <button
            onClick={() => router.push(`/fnol/${claim.id}`)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 999,
              color: 'var(--dark-ink)',
              fontSize: 13,
              padding: '8px 16px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>
            Start now &rarr;
          </button>
        </div>
      )}

      {/* Help card */}
      <div style={{
        background: 'var(--dark-card)',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        color: 'var(--dark-ink)',
      }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--dark-ink-2)', marginBottom: 4 }}>Need to talk to a human?</div>
          <div style={{ fontSize: 18, fontWeight: 300 }}>Oracle support &middot; 24/7</div>
        </div>
        <a
          href="tel:18005550199"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 999,
            color: 'var(--dark-ink)',
            fontSize: 13,
            padding: '8px 16px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}>
          1-800-555-0199
        </a>
      </div>
    </div>
  );
}

// ── Email gate ───────────────────────────────────────────────────────────────

function EmailGate({ onSubmit }: { onSubmit: (email: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        borderRadius: 24,
        padding: 40,
        textAlign: 'center',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--bg-soft)', border: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <OracleMark size={20} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 400, letterSpacing: '-0.015em', margin: '0 0 8px' }}>View your claims</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 28px', lineHeight: 1.6 }}>
          Enter the email address you used when filing your claim.
        </p>
        <form onSubmit={e => { e.preventDefault(); if (value.trim()) onSubmit(value.trim()); }}>
          <input
            type="email" value={value} onChange={e => setValue(e.target.value)}
            placeholder="you@example.com" required
            style={{
              width: '100%', padding: '11px 16px', borderRadius: 12,
              border: '1px solid var(--line)', background: 'var(--bg)',
              color: 'var(--ink)', fontSize: 14, outline: 'none',
              boxSizing: 'border-box', marginBottom: 12,
              fontFamily: 'var(--font-sans)',
            }}
          />
          <button type="submit" style={{
            width: '100%', padding: '11px 18px', borderRadius: 999,
            background: 'var(--dark-card)', color: 'var(--dark-ink)',
            border: 'none', fontSize: 14, fontWeight: 400, cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}>
            Look up claims
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MyClaimsPage() {
  const router = useRouter();
  const savedUser = useClaimStore(s => s.savedUser);
  const [email, setEmail] = useState<string | null>(null);
  const [claims, setClaims] = useState<ClaimObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (savedUser?.email && !email) setEmail(savedUser.email);
  }, [savedUser, email]);

  const loadClaims = useCallback(async (userEmail: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('claims').select('*')
        .eq('user->>email', userEmail)
        .order('created_at', { ascending: false });
      const list = (data ?? []) as ClaimObject[];
      setClaims(list);
      if (list.length > 0) setSelectedId(list[0].id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (email) loadClaims(email); }, [email, loadClaims]);

  useEffect(() => {
    if (!email) return;
    const ch = supabase.channel('my-claims-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, payload => {
        const updated = (payload.new || payload.old) as ClaimObject;
        if (!updated || updated.user?.email !== email) return;
        setClaims(prev => {
          const idx = prev.findIndex(c => c.id === updated.id);
          if (idx >= 0) { const n = [...prev]; n[idx] = updated; return n; }
          return [updated, ...prev];
        });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [email]);

  if (!email) return <EmailGate onSubmit={setEmail} />;

  const selected = claims.find(c => c.id === selectedId) ?? null;
  const activeClaims = claims.filter(c => !['approved','rejected'].includes(c.status)).length;
  const totalPayout = claims.reduce((sum, c) => {
    const p = c.damage_analysis?.estimated_repair_cost;
    return sum + (p ? (p.min + p.max) / 2 : 0);
  }, 0);
  const approvalRate = claims.length
    ? Math.round(claims.filter(c => c.status === 'approved').length / claims.length * 100)
    : 0;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingTop: 64 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 32px 64px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 6 }}>
              Welcome back
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 300, letterSpacing: '-0.025em', margin: 0 }}>Your claims</h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => router.push('/claim')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 999,
                background: 'var(--dark-card)', color: 'var(--dark-ink)',
                border: 'none', fontSize: 13, fontWeight: 400, cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}>
              + New claim
            </button>
            <button
              onClick={() => { setEmail(null); setClaims([]); }}
              style={{
                padding: '8px 16px', borderRadius: 999,
                background: 'transparent', color: 'var(--ink-3)',
                border: '1px solid var(--line)', fontSize: 13, cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}>
              Switch account
            </button>
          </div>
        </div>

        {/* Premium summary dark card */}
        <div style={{
          background: 'var(--dark-card)', borderRadius: 24,
          padding: 'clamp(32px, 4vw, 48px)',
          color: 'var(--dark-ink)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          flexWrap: 'wrap', gap: 24, marginBottom: 16,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0) 50%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 12, color: 'var(--dark-ink-2)', marginBottom: 8 }}>Recovered year-to-date</div>
            <div style={{ fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1 }}>
              <CountUp to={totalPayout || 28009} format={v => '$' + Math.floor(v).toLocaleString()} />
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 10, fontSize: 13, color: 'var(--dark-ink-2)', flexWrap: 'wrap' }}>
              <span>{activeClaims} active claim{activeClaims !== 1 ? 's' : ''}</span>
              <span>2:44 avg resolution</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/claim')}
            style={{
              position: 'relative',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 999, color: 'var(--dark-ink)',
              fontSize: 13, padding: '8px 16px', cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
            View statement
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 16 }} className="dash-stats">
          {[
            { label: 'Active claims',   value: String(activeClaims) },
            { label: 'Avg. resolution', value: '2:44' },
            { label: 'Approval rate',   value: `${approvalRate}%` },
            { label: 'Lifetime saved',  value: totalPayout > 0 ? fmt(totalPayout) : '$28K' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'var(--bg-elev)', border: '1px solid var(--line)',
              borderRadius: 16, padding: '20px 24px',
            }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-3)', fontSize: 14 }}>Loading...</div>
        ) : claims.length === 0 ? (
          <div style={{
            background: 'var(--bg-elev)', border: '1px solid var(--line)',
            borderRadius: 24, padding: 60, textAlign: 'center',
          }}>
            <div style={{ fontSize: 15, color: 'var(--ink-3)', marginBottom: 20 }}>No claims found for this email address.</div>
            <button onClick={() => router.push('/claim')} style={{
              padding: '10px 20px', borderRadius: 999,
              background: 'var(--dark-card)', color: 'var(--dark-ink)',
              border: 'none', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>File a claim</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }} className="dash-grid">
            {/* Claims list */}
            <div style={{
              background: 'var(--bg-elev)', border: '1px solid var(--line)',
              borderRadius: 24, overflow: 'hidden',
            }}>
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--line)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 14, fontWeight: 400 }}>Your claims</span>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>All</span>
              </div>
              {claims.map((c, i) => (
                <ClaimRow key={c.id} claim={c} idx={i} selected={c.id === selectedId} onClick={() => setSelectedId(c.id)} />
              ))}
            </div>

            {/* Detail */}
            {selected && <DetailPanel claim={selected} />}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .dash-stats { grid-template-columns: repeat(2,1fr) !important; }
          .dash-grid  { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px) {
          .dash-stats { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
