'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface FieldEntry {
  name: string;
  page: number;
  x: number;
  y: number;
  type: 'text' | 'checkbox' | 'image';
  maxWidth?: number;
  width?: number;
  height?: number;
}

// A4 PDF dimensions in points (pdf-lib coordinate space, origin = bottom-left)
const PDF_W = 595;
const PDF_H = 842;

export default function CalibratePage() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [pdfReady, setPdfReady]   = useState(false);
  const [pageNum,  setPageNum]    = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [fields,   setFields]     = useState<FieldEntry[]>([]);
  const [pending,  setPending]    = useState<Partial<FieldEntry> | null>(null);
  const [status,   setStatus]     = useState('Loading PDF…');
  const pdfDocRef  = useRef<unknown>(null);
  const scaleRef   = useRef(1);

  // Load pdfjs dynamically (client-only)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        // pdfjs-dist 5.x worker path
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();

        const res = await fetch('/Allianz.pdf');
        if (!res.ok) throw new Error('PDF not found at /Allianz.pdf');
        const buf = await res.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buf }).promise;
        if (cancelled) return;
        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setPdfReady(true);
        setStatus('Click any field on the form to record its coordinates.');
      } catch (e) {
        if (!cancelled) setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const renderPage = useCallback(async (num: number) => {
    const doc = pdfDocRef.current as { getPage: (n: number) => Promise<unknown> } | null;
    if (!doc || !canvasRef.current) return;
    const page = await doc.getPage(num + 1) as {
      getViewport: (o: {scale: number}) => {width: number; height: number};
      render: (o: unknown) => {promise: Promise<void>};
    };
    const canvas = canvasRef.current;
    const container = canvas.parentElement!;
    const scale = container.clientWidth / PDF_W;
    scaleRef.current = scale;
    const vp = page.getViewport({ scale });
    canvas.width  = vp.width;
    canvas.height = vp.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
  }, []);

  useEffect(() => {
    if (pdfReady) renderPage(pageNum);
  }, [pdfReady, pageNum, renderPage]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const s    = scaleRef.current;
    // Convert canvas pixel -> PDF point (flip Y axis)
    const pdfX = Math.round((e.clientX - rect.left) / s);
    const pdfY = Math.round(PDF_H - (e.clientY - rect.top) / s);
    setPending({ page: pageNum, x: pdfX, y: pdfY, type: 'text' });
  };

  const saveField = () => {
    if (!pending?.name) return;
    setFields((prev) => [
      ...prev.filter((f) => f.name !== pending.name),
      pending as FieldEntry,
    ]);
    setPending(null);
  };

  const exportJSON = () => {
    const map = {
      version: '1.0.0',
      calibrated: true,
      fields: Object.fromEntries(fields.map((f) => {
        const { name, ...rest } = f;
        return [name, rest];
      })),
    };
    const blob = new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'fnol-field-map.json';
    a.click();
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'monospace' }}>
      {/* Left: PDF canvas */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', borderRight: '1px solid #1e293b' }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ display: 'block', cursor: 'crosshair', width: '100%' }}
        />
        {!pdfReady && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
            <p style={{ fontSize: 14, color: '#64748b' }}>{status}</p>
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <div style={{ width: 320, display: 'flex', flexDirection: 'column', padding: 16, gap: 12, overflowY: 'auto' }}>
        <h1 style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0 }}>FNOL Field Calibration</h1>
        <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{status}</p>

        {/* Page navigation */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setPageNum(Math.max(0, pageNum - 1))} disabled={pageNum === 0}
              style={btnStyle}>Prev</button>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Page {pageNum + 1} / {totalPages}</span>
            <button onClick={() => setPageNum(Math.min(totalPages - 1, pageNum + 1))} disabled={pageNum === totalPages - 1}
              style={btnStyle}>Next</button>
          </div>
        )}

        {/* Pending field dialog */}
        {pending && (
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Clicked: x={pending.x}, y={pending.y} (page {(pending.page ?? 0) + 1})</p>
            <input
              autoFocus
              placeholder="Field name (e.g. incidentDate)"
              value={pending.name ?? ''}
              onChange={(e) => setPending({ ...pending, name: e.target.value })}
              style={inputStyle}
            />
            <select
              value={pending.type ?? 'text'}
              onChange={(e) => setPending({ ...pending, type: e.target.value as FieldEntry['type'] })}
              style={inputStyle}
            >
              <option value="text">text</option>
              <option value="checkbox">checkbox</option>
              <option value="image">image</option>
            </select>
            {(pending.type === 'text') && (
              <input
                type="number"
                placeholder="maxWidth (pts)"
                value={pending.maxWidth ?? ''}
                onChange={(e) => setPending({ ...pending, maxWidth: Number(e.target.value) })}
                style={inputStyle}
              />
            )}
            {pending.type === 'image' && (
              <>
                <input type="number" placeholder="width (pts)"  value={pending.width ?? ''}  onChange={(e) => setPending({ ...pending, width:  Number(e.target.value) })} style={inputStyle}/>
                <input type="number" placeholder="height (pts)" value={pending.height ?? ''} onChange={(e) => setPending({ ...pending, height: Number(e.target.value) })} style={inputStyle}/>
              </>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveField} style={{ ...btnStyle, background: '#2563eb' }}>Save Field</button>
              <button onClick={() => setPending(null)} style={btnStyle}>Cancel</button>
            </div>
          </div>
        )}

        {/* Field list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px' }}>{fields.length} fields recorded</p>
          {fields.map((f) => (
            <div key={f.name} style={{ fontSize: 10, color: '#94a3b8', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#e2e8f0' }}>{f.name}</span> p{f.page + 1} ({f.x},{f.y}) {f.type}
              <button
                onClick={() => setFields((prev) => prev.filter((x) => x.name !== f.name))}
                style={{ marginLeft: 8, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 10 }}
              >✕</button>
            </div>
          ))}
        </div>

        {fields.length > 0 && (
          <button onClick={exportJSON} style={{ ...btnStyle, background: '#16a34a', padding: '10px' }}>
            Export fnol-field-map.json
          </button>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155',
  color: '#e2e8f0', cursor: 'pointer', fontSize: 11, fontFamily: 'monospace',
};
const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155',
  color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace', width: '100%', boxSizing: 'border-box',
};
