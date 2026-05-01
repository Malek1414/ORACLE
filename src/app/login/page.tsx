'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { OracleMark } from '@/components/Nav';

export default function LoginPage() {
  const router     = useRouter();
  const setProfile = useAuthStore((s) => s.setProfile);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username || !password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login failed');
      setProfile(data.profile);
      router.push('/claim');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', background: 'var(--bg)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 24 }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <OracleMark size={18} />
          <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink)' }}>Oracle</span>
        </div>

        <div>
          <h1 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 6px', color: 'var(--ink)' }}>Sign in</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>Your profile loads automatically when filing a claim.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[{ label: 'Username', value: username, set: setUsername, type: 'text', placeholder: 'malek' },
            { label: 'Password', value: password, set: setPassword, type: 'password', placeholder: '••••••••' }]
            .map(({ label, value, set, type, placeholder }) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-3)', marginBottom: 6 }}>{label}</label>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder={placeholder}
                  autoComplete={type === 'password' ? 'current-password' : 'username'}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 12, fontSize: 14, background: 'var(--bg-elev)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-sans)' }}
                />
              </div>
            ))}
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 13, color: '#fca5a5' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !username || !password}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '13px 22px', borderRadius: 999, fontSize: 14, fontWeight: 400,
            fontFamily: 'var(--font-sans)', cursor: loading ? 'default' : 'pointer',
            background: loading || !username || !password ? 'var(--bg-elev)' : 'var(--ink)',
            color: loading || !username || !password ? 'var(--ink-4)' : 'var(--bg)',
            border: '1px solid var(--line)', transition: 'background 0.2s',
          }}
        >
          {loading ? <Loader2 size={15} style={{ animation: 'spin 0.9s linear infinite' }} /> : <LogIn size={15} />}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p style={{ fontSize: 12, color: 'var(--ink-4)', textAlign: 'center', margin: 0 }}>
          Demo accounts  ·  <code style={{ fontSize: 11 }}>malek</code> or <code style={{ fontSize: 11 }}>sarah</code>  /  password: <code style={{ fontSize: 11 }}>oracle123</code>
        </p>
      </motion.div>
    </div>
  );
}
