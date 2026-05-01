'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

// Iris / aperture mark — circle outline + centered dot
export function OracleMark({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  const inner = size > 18 ? 4 : 3;
  return (
    <span style={{
      width: size,
      height: size,
      border: `1.5px solid ${color}`,
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      position: 'relative',
    }}>
      <span style={{
        position: 'absolute',
        inset: inner,
        background: color,
        borderRadius: '50%',
      }} />
    </span>
  );
}

const NAV_LINKS = [
  { label: 'Overview',      href: '/#hero' },
  { label: 'How it works',  href: '/#how' },
  { label: 'File Claim',    href: '/claim' },
  { label: 'Dashboard',     href: '/my-claims' },
];

export function SiteNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const { profile, logout } = useAuthStore();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Hide on ops dashboard
  if (pathname === '/dashboard') return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    // Apply current theme choice to DOM — persists across all page navigations.
    // No page ever auto-forces a different theme; the user's toggle is the only control.
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 32px',
      background: 'var(--bg)',
      transition: 'background 0.3s',
    }}>
      {/* Logo */}
      <Link href="/" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        textDecoration: 'none',
        color: 'var(--ink)',
      }}>
        <OracleMark size={16} />
        <span style={{
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>Oracle</span>
      </Link>

      {/* Center links */}
      <div className="nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        {NAV_LINKS.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: pathname === href ? 'var(--ink)' : 'var(--ink-3)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = pathname === href ? 'var(--ink)' : 'var(--ink-3)')}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Right group */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            border: '1px solid var(--line)',
            background: 'transparent',
            color: 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
        >
          {theme === 'light' ? (
            // Sun — currently light mode
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          ) : (
            // Moon — currently dark mode
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
            </svg>
          )}
        </button>

        {profile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--bg)', fontFamily: 'var(--font-mono)' }}>
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-sans)' }}>{profile.name.split(' ')[0]}</span>
            </div>
            <button
              onClick={() => { logout(); router.push('/'); }}
              style={{ fontSize: 12, padding: '6px 12px', borderRadius: 999, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            style={{ fontSize: 12, fontWeight: 400, padding: '6px 14px', borderRadius: 999, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink)', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'border-color 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; }}
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}

export { OracleMark as default };
