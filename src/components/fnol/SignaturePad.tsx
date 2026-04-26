'use client';

import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

export interface SignaturePadRef {
  getDataURL: () => string | null;
  isEmpty: () => boolean;
}

interface Props {
  width?: number;
  height?: number;
}

export const SignaturePad = forwardRef<SignaturePadRef, Props>(function SignaturePad({ height = 180 }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  useImperativeHandle(ref, () => ({
    getDataURL: () => canvasRef.current?.toDataURL('image/png') ?? null,
    isEmpty: () => !hasStrokes,
  }));

  const getPoint = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      drawing.current = true;
      const { x, y } = getPoint(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const move = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!drawing.current) return;
      const { x, y } = getPoint(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasStrokes(true);
    };
    const end = () => { drawing.current = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
    };
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--dark-card)' }}>
        <canvas
          ref={canvasRef}
          width={640}
          height={height * 2}
          style={{ width: '100%', height, display: 'block', touchAction: 'none', cursor: 'crosshair' }}
        />
        {!hasStrokes && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <p style={{ fontSize: 13, color: 'var(--dark-ink-2)', margin: 0 }}>Sign here</p>
          </div>
        )}
      </div>
      <button
        onClick={clear}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}
      >
        <Trash2 size={13} /> Clear
      </button>
    </div>
  );
});
