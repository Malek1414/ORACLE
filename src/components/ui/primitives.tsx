'use client';

import { useEffect, useRef, useState, ReactNode, ElementType, CSSProperties } from 'react';
import Link from 'next/link';

// ── Reveal (scroll-triggered fade-up) ──────────────────────────────────────
interface RevealProps { children: ReactNode; delay?: 0|1|2|3|4; className?: string; as?: ElementType; style?: CSSProperties; }
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div', style }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { el.classList.add('visible'); io.unobserve(el); } });
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const cls = ['reveal', delay ? `delay-${delay}` : '', className].filter(Boolean).join(' ');
  return <Tag ref={ref} className={cls} style={style}>{children}</Tag>;
}

// ── Magnetic (cursor-pull wrapper) ────────────────────────────────────────
export function Magnetic({ children, strength = 0.25, style, className }: { children: ReactNode; strength?: number; style?: CSSProperties; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ x: 0, y: 0 });
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setT({ x: (e.clientX - (r.left + r.width / 2)) * strength, y: (e.clientY - (r.top + r.height / 2)) * strength });
  };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={() => setT({ x: 0, y: 0 })} className={className}
      style={{ display: 'inline-block', transform: `translate(${t.x}px,${t.y}px)`, transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)', ...style }}>
      {children}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'accent' | 'ghost' | 'glass' | 'dark' | 'outline' | 'outline-inv' | 'soft';
type ButtonSize = 'sm' | 'md' | 'lg';
interface ButtonProps {
  children: ReactNode; variant?: ButtonVariant; size?: ButtonSize;
  href?: string; onClick?: () => void; style?: CSSProperties; className?: string;
  disabled?: boolean; type?: 'button' | 'submit';
}
const SIZES: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '8px 14px',  fontSize: 13 },
  md: { padding: '12px 22px', fontSize: 14 },
  lg: { padding: '16px 28px', fontSize: 15 },
};
const VARIANTS: Record<ButtonVariant, CSSProperties> = {
  primary:     { background: 'var(--ink)', color: 'var(--bg)', boxShadow: '0 1px 2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.12)' },
  accent:      { background: 'var(--accent)', color: 'white',  boxShadow: '0 8px 24px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.18)' },
  ghost:       { background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)' },
  glass:       { background: 'var(--glass)', color: 'var(--ink)', backdropFilter: 'blur(20px) saturate(1.4)', WebkitBackdropFilter: 'blur(20px) saturate(1.4)', border: '1px solid var(--glass-border)' },
  // Luminart variants
  dark:        { background: 'var(--dark-card)', color: 'var(--dark-ink)', border: '1px solid rgba(255,255,255,0.06)' },
  outline:     { background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)', fontWeight: 400 },
  'outline-inv': { background: 'transparent', color: 'var(--dark-ink)', border: '1px solid rgba(255,255,255,0.25)', fontWeight: 400 },
  soft:        { background: 'var(--bg-soft)', color: 'var(--ink)', border: '1px solid var(--line)' },
};
export function Button({ children, variant = 'primary', size = 'md', href, onClick, style, className, disabled, type = 'button' }: ButtonProps) {
  const base: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    fontFamily: 'var(--font-sans)', fontWeight: 500, letterSpacing: '-0.01em',
    borderRadius: 999, cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1px solid transparent', textDecoration: 'none', whiteSpace: 'nowrap',
    transition: 'transform 0.2s ease, background 0.25s ease, border-color 0.25s, box-shadow 0.3s',
    opacity: disabled ? 0.5 : 1,
    ...SIZES[size], ...VARIANTS[variant], ...style,
  };
  if (href) return <Link href={href} style={base} className={className}>{children}</Link>;
  return <button type={type} onClick={onClick} disabled={disabled} style={base} className={className}>{children}</button>;
}

// ── Chip ───────────────────────────────────────────────────────────────────────────
export function Chip({ children, dot, style }: { children: ReactNode; dot?: string; style?: CSSProperties }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '6px 12px', borderRadius: 999,
      background: 'var(--glass)', backdropFilter: 'blur(14px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(14px) saturate(1.4)',
      border: '1px solid var(--glass-border)',
      fontSize: 12, fontFamily: 'var(--font-mono)',
      letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-2)',
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: dot, boxShadow: `0 0 8px ${dot}`, flexShrink: 0 }} />}
      {children}
    </span>
  );
}

// ── GlassCard ──────────────────────────────────────────────────────────────────
export function GlassCard({ children, style, hover = true, className }: { children: ReactNode; style?: CSSProperties; hover?: boolean; className?: string }) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => hover && setH(true)}
      onMouseLeave={() => hover && setH(false)}
      className={className}
      style={{
        background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 20, padding: 28,
        boxShadow: h ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        transform: h ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s',
        position: 'relative', overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── CountUp ───────────────────────────────────────────────────────────────────
interface CountUpProps { to: number; duration?: number; prefix?: string; suffix?: string; decimals?: number; format?: (v: number) => string; }
export function CountUp({ to, duration = 1800, prefix = '', suffix = '', decimals = 0, format }: CountUpProps) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setV(eased * to);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);
  const shown = format ? format(v) : `${prefix}${v.toFixed(decimals)}${suffix}`;
  return <span ref={ref}>{shown}</span>;
}

// ── Arrow icon (inline) ───────────────────────────────────────────────────────
export function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
