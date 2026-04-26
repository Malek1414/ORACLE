'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { OracleMark } from '@/components/Nav';

// ── Primitives ──────────────────────────────────────────────────────────────

function Reveal({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add('visible'); obs.disconnect(); }
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal${delay ? ` delay-${delay}` : ''}`} style={style}>
      {children}
    </div>
  );
}

function CountUp({ to, decimals = 0, suffix = '', format }: { to: number; decimals?: number; suffix?: string; format?: (v: number) => string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const fired = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !fired.current) {
        fired.current = true;
        const start = performance.now();
        const dur = 1800;
        const tick = (now: number) => {
          const p = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setVal(to * ease);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to]);
  const display = format ? format(val) : val.toFixed(decimals) + suffix;
  return <span ref={ref}>{display}</span>;
}

function Btn({
  variant = 'outline', size = 'md', href, onClick, children,
}: {
  variant?: 'dark' | 'outline' | 'outline-inv' | 'soft' | 'light';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const pad = { sm: '6px 14px', md: '9px 18px', lg: '12px 22px' }[size];
  const fs  = { sm: 12, md: 13, lg: 14 }[size];
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: pad, fontSize: fs, fontWeight: 400, fontFamily: 'var(--font-sans)',
    borderRadius: 999, textDecoration: 'none', cursor: 'pointer',
    border: 'none', transition: 'background 0.2s, border-color 0.2s, color 0.2s',
    whiteSpace: 'nowrap',
  };
  const styles: Record<string, React.CSSProperties> = {
    dark:        { background: 'var(--dark-card)', color: 'var(--dark-ink)' },
    outline:     { background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)' },
    'outline-inv': { background: 'transparent', color: 'var(--dark-ink)', border: '1px solid rgba(255,255,255,0.25)' },
    soft:        { background: 'var(--bg-soft)', color: 'var(--ink)' },
    light:       { background: 'var(--bg)', color: 'var(--ink)' },
  };
  const s = { ...base, ...styles[variant] };
  if (href) return <a href={href} style={s}>{children}</a>;
  return <button style={s} onClick={onClick}>{children}</button>;
}

function SectionHeader({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      borderBottom: '1px solid var(--line)', paddingBottom: 12, marginBottom: 32,
    }}>
      <h2 style={{ fontSize: 18, fontWeight: 400, margin: 0 }}>{title}</h2>
      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>{eyebrow}</span>
    </div>
  );
}

// Inline icons
const Icons = {
  arrow:     <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  waveform:  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M4 12v0M8 8v8M12 5v14M16 9v6M20 12v0"/></svg>,
  bolt:      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/></svg>,
  shield:    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z"/></svg>,
  sparkle:   <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>,
  check:     <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  arrowUpRight: <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>,
};

// ── Waveform (mini, for hero dark card) ─────────────────────────────────

function MiniWaveform({ bars = 28, barHeight = 48, color = 'rgba(255,255,255,0.7)' }: { bars?: number; barHeight?: number; color?: string }) {
  const [vals, setVals] = useState(() => Array(bars).fill(0.3).map((_, i) => {
    const edge = Math.min(1, i / 4) * Math.min(1, (bars - i) / 4);
    return 0.15 + 0.25 * edge; // static initial value — avoids SSR/client hydration mismatch
  }));
  useEffect(() => {
    const id = setInterval(() => {
      setVals(Array.from({ length: bars }, (_, i) => {
        const edge = Math.min(1, i / 4) * Math.min(1, (bars - i) / 4);
        return 0.15 + Math.random() * edge;
      }));
    }, 120);
    return () => clearInterval(id);
  }, [bars]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: barHeight }}>
      {vals.map((v, i) => (
        <span key={i} style={{
          width: 2,
          height: `${Math.max(4, v * barHeight)}px`,
          background: color,
          borderRadius: 2,
          transition: 'height 0.11s ease-out',
          display: 'block',
        }} />
      ))}
    </div>
  );
}

// ── HERO ───────────────────────────────────────────────────────────────────
export function Hero() {
  const router = useRouter();
  return (
    <section id="hero" style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 32px 48px' }}>
      {/* Top tagline row */}
      <Reveal>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
            Voice-first insurance &middot; Live in 50 states
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 12px', borderRadius: 999,
            background: 'var(--bg-elev)', border: '1px solid var(--line)',
            fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-2)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2A7E4A', boxShadow: '0 0 6px #2A7E4A', flexShrink: 0 }} />
            Avg claim &middot; 2:44
          </span>
        </div>
      </Reveal>

      {/* Big dark card */}
      <Reveal delay={1}>
        <div style={{
          background: 'var(--dark-card)',
          borderRadius: 24,
          padding: 'clamp(40px, 5vw, 72px)',
          minHeight: 520,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: 'var(--dark-ink)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle gradient overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 50%)', pointerEvents: 'none' }} />

          {/* Top label row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7DB892', boxShadow: '0 0 6px #7DB892', flexShrink: 0 }} />
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dark-ink-2)' }}>Listening &middot; 2:44 average claim</span>
            </div>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dark-ink-2)' }}>Oracle 4.2</span>
          </div>

          {/* Headline */}
          <div style={{ padding: '60px 0', position: 'relative' }}>
            <h1 style={{
              fontSize: 'clamp(36px, 5.4vw, 76px)',
              lineHeight: 1.04,
              fontWeight: 300,
              letterSpacing: '-0.025em',
              textWrap: 'balance',
              maxWidth: '16ch',
              margin: '0 0 24px',
            }}>
              <span style={{ display: 'block' }}>Three weeks of paperwork.</span>
              <span style={{ display: 'block' }}>Now two minutes flat.</span>
            </h1>
            <p style={{
              fontSize: 'clamp(15px, 1.2vw, 17px)',
              color: 'var(--dark-ink-2)',
              maxWidth: 480,
              fontWeight: 300,
              lineHeight: 1.6,
              margin: 0,
            }}>
              A voice-first insurance agent. Describe what happened &mdash; Oracle handles the paperwork, the adjusters, the follow-ups. You get paid.
            </p>
          </div>

          {/* Bottom row: buttons + waveform */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24, position: 'relative' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Btn variant="light" size="md" onClick={() => router.push('/claim')}>
                Start a claim {Icons.arrow}
              </Btn>
              <Btn variant="outline-inv" size="md" href="/#how">
                See how it works
              </Btn>
            </div>
            <MiniWaveform bars={28} barHeight={48} />
          </div>
        </div>
      </Reveal>

      {/* 3 quiet stat sub-cards */}
      <Reveal delay={2}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginTop: 16,
        }} className="stat-grid">
          {[
            { label: 'Avg. resolution', value: '2:44', unit: 'minutes' },
            { label: 'Approval rate',   value: '94.2%', unit: 'first-pass' },
            { label: 'Claims this month', value: '142K', unit: 'and counting' },
          ].map(({ label, value, unit }) => (
            <div key={label} style={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              borderRadius: 16,
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 96,
            }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>{label}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{value}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

// ── STAT CONTRAST ─────────────────────────────────────────────────────────
export function StatContrast() {
  return (
    <section style={{ padding: '80px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <Reveal><SectionHeader title="The math" eyebrow="Industry vs. Oracle" /></Reveal>

      <Reveal delay={1}>
        <p style={{
          fontSize: 'clamp(24px, 2.6vw, 36px)',
          fontWeight: 300,
          lineHeight: 1.25,
          color: 'var(--ink-2)',
          maxWidth: '26ch',
          marginBottom: 40,
        }}>
          The industry average is twenty-one days.{' '}
          <span style={{ color: 'var(--ink)' }}>Oracle ships in under three minutes.</span>
        </p>
      </Reveal>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="stat-grid">
        {[
          { label: 'Avg. resolution time', value: '2:44',    suffix: 'minutes',    countTo: null },
          { label: 'Claims resolved',      value: null,       suffix: 'this month', countTo: 142.4 },
          { label: 'Approval rate',        value: null,       suffix: 'first-pass', countTo: 94.2, decimals: 1, pct: true },
        ].map(({ label, value, suffix, countTo, decimals, pct }) => (
          <Reveal key={label} delay={1}>
            <div style={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              borderRadius: 24,
              padding: '32px 28px',
              minHeight: 180,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>{label}</span>
              <div>
                <div style={{ fontSize: 56, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {countTo != null
                    ? <CountUp to={countTo} decimals={decimals ?? 0} suffix={pct ? '%' : 'K'} />
                    : value
                  }
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>{suffix}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ── HOW IT WORKS ──────────────────────────────────────────────────────────
export function HowItWorks() {
  const steps = [
    { n: '01', title: 'You describe it',  body: 'Speak naturally. Oracle listens, asks the right follow-ups, and extracts every detail.' },
    { n: '02', title: 'Oracle files it',  body: 'We generate the full claim packet and submit directly to your carrier — no forms.' },
    { n: '03', title: 'You get paid',     body: 'Track every adjuster interaction live. We negotiate on your behalf for first-pass approval.' },
  ];
  return (
    <section id="how" style={{ padding: '80px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <Reveal><SectionHeader title="How it works" eyebrow="Three steps · No forms" /></Reveal>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="how-grid">
        {steps.map((s, i) => (
          <Reveal key={i} delay={(i + 1) as 1|2|3}>
            <div style={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              borderRadius: 24,
              padding: 28,
              minHeight: 220,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>{s.n}</span>
              <div>
                <h3 style={{ fontSize: 22, fontWeight: 400, letterSpacing: '-0.015em', margin: '0 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>{s.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ── LOGOS ────────────────────────────────────────────────────────────────────
export function Logos() {
  const carriers = ['Lemonade','Progressive','Geico','State Farm','Allstate','Nationwide','Travelers','Liberty Mutual','Farmers','AIG'];
  const doubled = [...carriers, ...carriers];
  return (
    <section style={{ margin: '0 32px', padding: '32px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', overflow: 'hidden' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>Integrated with 40+ carriers</span>
      </div>
      <div style={{ display: 'flex', gap: 56, animation: 'marquee 40s linear infinite', width: 'max-content' }}>
        {doubled.map((name, i) => (
          <span key={i} style={{ fontSize: 22, fontWeight: 400, color: 'var(--ink-3)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{name}</span>
        ))}
      </div>
    </section>
  );
}

// ── FEATURES ────────────────────────────────────────────────────────────────
export function Features() {
  const items = [
    { icon: Icons.waveform, title: 'Voice-native',        body: 'No forms. Just talk. Parses 14 languages and noisy environments.' },
    { icon: Icons.bolt,     title: 'Direct carrier APIs', body: 'Integrated with 40+ insurers. Packets land in seconds.' },
    { icon: Icons.shield,   title: 'SOC 2 · HIPAA',       body: 'Zero-retention audio. End-to-end encrypted. Never trains a model.' },
    { icon: Icons.sparkle,  title: 'AI adjuster',          body: 'Negotiates settlements, flags lowballs, escalates when humans drag.' },
    { icon: Icons.check,    title: 'First-pass approval',  body: '94.2% of Oracle claims approve on first submission.' },
    { icon: Icons.arrow,    title: 'Live tracking',         body: 'Every call, email, and adjuster interaction — searchable.' },
  ];
  return (
    <section style={{ padding: '80px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <Reveal><SectionHeader title="What’s inside" eyebrow="" /></Reveal>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="f-grid">
        {items.map((it, i) => (
          <Reveal key={i} delay={((i % 3) + 1) as 1|2|3}>
            <div style={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              borderRadius: 20,
              padding: 24,
              minHeight: 160,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>
                {it.icon}
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 500, margin: '0 0 4px', letterSpacing: '-0.01em' }}>{it.title}</p>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>{it.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ── TESTIMONIAL ──────────────────────────────────────────────────────────
export function Testimonial() {
  return (
    <section style={{ padding: '80px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <Reveal>
        <blockquote style={{
          fontSize: 'clamp(22px, 2.4vw, 32px)',
          fontWeight: 300,
          lineHeight: 1.35,
          letterSpacing: '-0.015em',
          color: 'var(--ink)',
          margin: '0 0 32px',
        }}>
          &ldquo;I totaled my car on a Tuesday. Oracle had the check in my account by Thursday morning. My last claim, in 2022, took seventy-two days.&rdquo;
        </blockquote>
      </Reveal>
      <Reveal delay={1}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--dark-card)',
            color: 'var(--dark-ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 400, flexShrink: 0,
          }}>MR</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 2px' }}>Maya Reyes</p>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>Oakland, CA &middot; Geico policyholder</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ── CTA FOOTER ───────────────────────────────────────────────────────────
export function CTAFooter() {
  const router = useRouter();
  return (
    <section style={{ padding: '32px 32px 64px', maxWidth: 1400, margin: '0 auto' }}>
      <Reveal>
        <div style={{
          background: 'var(--dark-card)',
          borderRadius: 24,
          padding: 'clamp(40px, 5vw, 72px)',
          color: 'var(--dark-ink)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 32,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0) 50%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <h2 style={{
              fontSize: 'clamp(28px, 3.6vw, 48px)',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              maxWidth: '16ch',
              margin: '0 0 16px',
            }}>
              Something happened.<br />Let&rsquo;s fix it.
            </h2>
            <p style={{ fontSize: 15, color: 'var(--dark-ink-2)', fontWeight: 300, maxWidth: '44ch', lineHeight: 1.55, margin: 0 }}>
              Oracle handles the rest. From &ldquo;I just had an accident&rdquo; to &ldquo;money in your account&rdquo; in minutes.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative' }}>
            <Btn variant="light" size="md" onClick={() => router.push('/claim')}>Start a claim {Icons.arrow}</Btn>
            <Btn variant="outline-inv" size="md" onClick={() => router.push('/my-claims')}>Open dashboard</Btn>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ── FOOTER ─────────────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--line)', padding: '48px 32px 32px' }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 24,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink)' }}>
          <OracleMark size={16} />
          <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Oracle</span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {['Privacy','Terms','Trust','Contact','Status'].map(link => (
            <a key={link} href="#" style={{
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em',
              color: 'var(--ink-3)', textDecoration: 'none',
            }}>{link}</a>
          ))}
        </nav>

        {/* Copyright */}
        <span style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
          &copy; 2026 Oracle Claims
        </span>
      </div>
    </footer>
  );
}

// Legacy export kept for any remaining imports
export { Reveal, CountUp };
