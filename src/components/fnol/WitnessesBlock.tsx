'use client';

import { Witness } from '@/types/claim';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  value: Witness[];
  onChange: (v: Witness[]) => void;
}

const EMPTY_WITNESS: Witness = { name: '', phone: '', statement: '' };

export function WitnessesBlock({ value, onChange }: Props) {
  const add = () => onChange([...value, { ...EMPTY_WITNESS }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const set = (i: number, k: keyof Witness) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = value.map((w, idx) => idx === i ? { ...w, [k]: e.target.value } : w);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-6">
      {value.length === 0 && (
        <p style={{ fontSize: 13, textAlign: 'center', padding: '16px 0', color: 'var(--ink-3)', margin: 0 }}>No witnesses added</p>
      )}

      {value.map((w, i) => (
        <div key={i} style={{ borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>Witness {i + 1}</span>
            <button onClick={() => remove(i)} style={{ padding: 4, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}>
              <Trash2 size={16} />
            </button>
          </div>
          {(['name', 'phone'] as const).map((k) => (
            <div key={k}>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, color: 'var(--ink-3)' }}>{k === 'phone' ? 'Phone' : 'Full name'}</label>
              <input
                type={k === 'phone' ? 'tel' : 'text'}
                value={w[k]}
                onChange={set(i, k)}
                placeholder={k === 'phone' ? '+1 555 000 0000' : 'Jane Doe'}
                style={{ width: '100%', padding: '10px 13px', borderRadius: 10, fontSize: 13, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'var(--font-sans)' }}
              />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, color: 'var(--ink-3)' }}>Statement</label>
            <textarea
              value={w.statement}
              onChange={set(i, 'statement')}
              placeholder="What did they witness..."
              rows={3}
              style={{ width: '100%', padding: '10px 13px', borderRadius: 10, fontSize: 13, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none', resize: 'none' as const, boxSizing: 'border-box' as const, fontFamily: 'var(--font-sans)' }}
            />
          </div>
        </div>
      ))}

      <button
        onClick={add}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px', borderRadius: 12, fontSize: 13, border: '1.5px dashed var(--line)', background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
      >
        <Plus size={16} /> Add witness
      </button>
    </div>
  );
}
