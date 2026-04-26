export function OracleLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-7 h-7" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid currentColor' }} />
        <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', background: 'currentColor' }} />
      </div>
      <span className="font-bold text-lg tracking-widest" style={{ color: 'var(--ink)', letterSpacing: '0.15em' }}>ORACLE</span>
    </div>
  );
}
