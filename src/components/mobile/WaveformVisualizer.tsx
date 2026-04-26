'use client';

import { useEffect, useRef } from 'react';

interface Props {
  analyser: AnalyserNode | null;
}

export function WaveformVisualizer({ analyser }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    const BARS = 48;
    const BAR_W = 3;
    const BAR_GAP = 3;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      if (!analyser) {
        // Idle animation
        const t = Date.now() / 400;
        for (let i = 0; i < BARS; i++) {
          const h = 4 + Math.sin(t + i * 0.4) * 4;
          const x = i * (BAR_W + BAR_GAP);
          const y = (H - h) / 2;
          ctx.fillStyle = 'rgba(59,130,246,0.3)';
          ctx.beginPath();
          ctx.roundRect(x, y, BAR_W, h, 1.5);
          ctx.fill();
        }
      } else {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const step = Math.floor(data.length / BARS);

        for (let i = 0; i < BARS; i++) {
          const val = data[i * step] / 255;
          const h = Math.max(4, val * H * 0.85);
          const x = i * (BAR_W + BAR_GAP);
          const y = (H - h) / 2;
          const alpha = 0.4 + val * 0.6;
          ctx.fillStyle = `rgba(59,130,246,${alpha})`;
          ctx.beginPath();
          ctx.roundRect(x, y, BAR_W, h, 1.5);
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser]);

  const W = 48 * (3 + 3);
  return <canvas ref={canvasRef} width={W} height={64} style={{ display: 'block' }} />;
}
