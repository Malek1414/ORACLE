'use client';

import { OtherDriver } from '@/types/claim';

interface Props {
  value: OtherDriver;
  onChange: (v: OtherDriver) => void;
}

const EMPTY: OtherDriver = { name: '', licence: '', insurer: '', policy_number: '', phone: '', vehicle: '' };
export const EMPTY_OTHER_DRIVER = EMPTY;

export function OtherDriverBlock({ value, onChange }: Props) {
  const set = (k: keyof OtherDriver) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });

  const fields: { key: keyof OtherDriver; label: string; placeholder: string; type?: string }[] = [
    { key: 'name',          label: 'Full name',         placeholder: 'John Doe' },
    { key: 'licence',       label: 'Licence number',    placeholder: 'D1234567' },
    { key: 'phone',         label: 'Phone',             placeholder: '+1 555 000 0000', type: 'tel' },
    { key: 'insurer',       label: 'Insurance company', placeholder: 'State Farm' },
    { key: 'policy_number', label: 'Policy number',     placeholder: 'POL-XXXXXX' },
    { key: 'vehicle',       label: 'Vehicle',           placeholder: '2019 Honda Civic Silver' },
  ];

  return (
    <div className="flex flex-col gap-4">
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
