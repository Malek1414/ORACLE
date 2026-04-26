'use client';

import { PoliceReport } from '@/types/claim';

interface Props {
  value: PoliceReport;
  onChange: (v: PoliceReport) => void;
}

export const EMPTY_POLICE_REPORT: PoliceReport = { filed: false, report_number: '', officer_name: '', station: '' };

export function PoliceReportBlock({ value, onChange }: Props) {
  const set = (k: keyof PoliceReport) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: k === 'filed' ? (e.target as HTMLInputElement).checked : e.target.value });

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle */}
      <button
        onClick={() => onChange({ ...value, filed: !value.filed })}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 16px', borderRadius: 14, background: 'var(--bg-elev)', border: '1px solid var(--line)', cursor: 'pointer' }}
      >
        <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink)' }}>Police report filed?</span>
        <div
          style={{ width: 44, height: 24, borderRadius: 999, transition: 'background 0.2s', background: value.filed ? '#2A7E4A' : 'var(--line)', position: 'relative', flexShrink: 0 }}
        >
          <div
            className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
            style={{ left: value.filed ? '28px' : '4px' }}
          />
        </div>
      </button>

      {value.filed && (
        <>
          {([
            { key: 'report_number' as const, label: 'Report number',  placeholder: 'RPT-2024-0001' },
            { key: 'officer_name'  as const, label: 'Officer name',   placeholder: 'Officer Smith' },
            { key: 'station'       as const, label: 'Police station', placeholder: '14th Precinct' },
          ]).map(({ key, label, placeholder }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, color: 'var(--ink-3)' }}>{label}</label>
              <input
                type="text"
                value={value[key]}
                onChange={set(key)}
                placeholder={placeholder}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 12, fontSize: 14, background: 'var(--bg-elev)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'var(--font-sans)' }}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
