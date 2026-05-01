'use client';

import { useState } from 'react';
import { OtherDriver } from '@/types/claim';
import { Search, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

interface Props {
  value: OtherDriver;
  onChange: (v: OtherDriver) => void;
}

const EMPTY: OtherDriver = { name: '', licence: '', insurer: '', policy_number: '', phone: '', vehicle: '' };
export const EMPTY_OTHER_DRIVER = EMPTY;

export function OtherDriverBlock({ value, onChange }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const [lookupUsername, setLookupUsername] = useState('');
  const [looking, setLooking]   = useState(false);
  const [lookupMsg, setLookupMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const set = (k: keyof OtherDriver) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });

  const handleLookup = async () => {
    if (!lookupUsername.trim()) return;
    setLooking(true);
    setLookupMsg(null);
    try {
      const caller = profile?.username ?? profile?.name ?? 'A driver';
      const res = await fetch(`/api/users/lookup?username=${encodeURIComponent(lookupUsername.trim())}&caller=${encodeURIComponent(caller)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Not found');
      const p = data.profile;
      onChange({
        name:          p.name          ?? '',
        licence:       p.licence_plate ?? '',
        insurer:       p.insurer       ?? '',
        policy_number: p.policy_number ?? '',
        phone:         p.phone         ?? '',
        vehicle:       [p.vehicle_year, p.vehicle_make, p.vehicle_model].filter(Boolean).join(' '),
      });
      setLookupMsg({ text: `✓ ${p.name} found — details loaded. They have been notified.`, ok: true });
    } catch (e) {
      setLookupMsg({ text: e instanceof Error ? e.message : 'User not found', ok: false });
    } finally {
      setLooking(false);
    }
  };

  const fields: { key: keyof OtherDriver; label: string; placeholder: string; type?: string }[] = [
    { key: 'name',          label: 'Full name',         placeholder: 'John Doe' },
    { key: 'licence',       label: 'Licence / plate',   placeholder: 'D1234567' },
    { key: 'phone',         label: 'Phone',             placeholder: '+1 555 000 0000', type: 'tel' },
    { key: 'insurer',       label: 'Insurance company', placeholder: 'State Farm' },
    { key: 'policy_number', label: 'Policy number',     placeholder: 'POL-XXXXXX' },
    { key: 'vehicle',       label: 'Vehicle',           placeholder: '2019 Honda Civic' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Username lookup */}
      <div style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
        <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-3)', margin: '0 0 10px' }}>Find by ORACLE username</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={lookupUsername}
            onChange={(e) => setLookupUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            placeholder="e.g. sarah"
            style={{ flex: 1, padding: '10px 13px', borderRadius: 10, fontSize: 13, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none', fontFamily: 'var(--font-sans)' }}
          />
          <button
            onClick={handleLookup}
            disabled={looking || !lookupUsername.trim()}
            style={{ padding: '10px 16px', borderRadius: 10, background: looking ? 'var(--bg-elev)' : 'var(--ink)', color: looking ? 'var(--ink-4)' : 'var(--bg)', border: 'none', cursor: looking ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'var(--font-sans)' }}
          >
            {looking ? <Loader2 size={14} style={{ animation: 'spin 0.9s linear infinite' }} /> : <Search size={14} />}
            {looking ? '' : 'Look up'}
          </button>
        </div>
        {lookupMsg && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            {lookupMsg.ok && <CheckCircle2 size={13} style={{ color: '#2A7E4A', flexShrink: 0, marginTop: 1 }} />}
            <p style={{ fontSize: 12, color: lookupMsg.ok ? '#2A7E4A' : '#fca5a5', margin: 0, lineHeight: 1.5 }}>{lookupMsg.text}</p>
          </div>
        )}
      </div>

      {/* Manual fields (pre-filled if lookup succeeded) */}
      <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-4)', margin: 0 }}>Or enter manually</p>
      {fields.map(({ key, label, placeholder, type }) => (
        <div key={key}>
          <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, color: 'var(--ink-3)' }}>{label}</label>
          <input
            type={type ?? 'text'}
            value={value[key]}
            onChange={set(key)}
            placeholder={placeholder}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 12, fontSize: 14, background: 'var(--bg-elev)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'var(--font-sans)' }}
          />
        </div>
      ))}
    </div>
  );
}
