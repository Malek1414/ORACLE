'use client';

import { OtherDriver, Witness, PoliceReport } from '@/types/claim';

interface Props {
  otherDriver: OtherDriver;
  witnesses: Witness[];
  policeReport: PoliceReport;
}

function Row({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, textAlign: 'right', color: 'var(--ink)' }}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 16, padding: 16, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
      <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', margin: '0 0 12px' }}>{title}</p>
      {children}
    </div>
  );
}

export function FNOLSummary({ otherDriver, witnesses, policeReport }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Section title="Other Driver">
        <Row label="Name" value={otherDriver.name || '—'} />
        <Row label="Licence" value={otherDriver.licence} />
        <Row label="Phone" value={otherDriver.phone} />
        <Row label="Insurer" value={otherDriver.insurer} />
        <Row label="Policy" value={otherDriver.policy_number} />
        <Row label="Vehicle" value={otherDriver.vehicle} />
      </Section>

      <Section title="Witnesses">
        {witnesses.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>None</p>
        ) : witnesses.map((w, i) => (
          <div key={i} className="mb-3 last:mb-0">
            <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px', color: 'var(--ink)' }}>{w.name || `Witness ${i + 1}`}</p>
            {w.phone && <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>{w.phone}</p>}
            {w.statement && <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: '4px 0 0' }}>&ldquo;{w.statement}&rdquo;</p>}
          </div>
        ))}
      </Section>

      <Section title="Police Report">
        <Row label="Filed" value={policeReport.filed ? 'Yes' : 'No'} />
        {policeReport.filed && (
          <>
            <Row label="Report #" value={policeReport.report_number} />
            <Row label="Officer" value={policeReport.officer_name} />
            <Row label="Station" value={policeReport.station} />
          </>
        )}
      </Section>
    </div>
  );
}
