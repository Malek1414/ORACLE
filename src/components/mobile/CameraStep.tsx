'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Check, ChevronRight, ImagePlus } from 'lucide-react';

interface Props {
  onDone: (photos: string[], pending?: boolean) => void;
}

export function CameraStep({ onDone }: Props) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);    // library — no capture
  const cameraInputRef = useRef<HTMLInputElement>(null);  // native camera fallback

  const openCamera = useCallback(async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      // Browser doesn't support getUserMedia — use native camera input
      cameraInputRef.current?.click();
      return;
    }
    try {
      // Use ideal (not exact) so desktop / front-camera-only devices don't throw.
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      setStream(s);
      setCameraActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('notallowed')) {
        setCameraError('Camera access denied. Allow it in your browser settings, or upload from library.');
      } else {
        // Any other failure — open native camera via file input
        cameraInputRef.current?.click();
      }
    }
  }, []);

  // Assign stream to video element after it mounts (cameraActive = true triggers render).
  // Also calls .play() explicitly — required on iOS Safari even with autoPlay attribute.
  // muted is required on iOS for autoplay to work at all.
  useEffect(() => {
    if (!cameraActive || !stream || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = stream;
    video.play().catch(() => {/* autoplay policy — user must tap */});
  }, [cameraActive, stream]);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhotos((p) => [...p, dataUrl]);
  }, []);

  const closeCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraActive(false);
  }, [stream]);

  const removePhoto = useCallback((idx: number) => {
    setPhotos((p) => p.filter((_, i) => i !== idx));
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotos((p) => [...p, ev.target!.result as string]);
      reader.readAsDataURL(file);
    });
  }, []);

  if (cameraActive) {
    return (
      <div className="fixed inset-0 z-50" style={{ background: '#000' }}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around pb-12 pt-6" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
          <button onClick={closeCamera} className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <X size={20} color="white" />
          </button>
          <button onClick={capture} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <div className="w-14 h-14 rounded-full bg-white" />
          </button>
          {photos.length > 0 ? (
            <button onClick={closeCamera} style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2A7E4A', border: 'none', cursor: 'pointer' }}>
              <Check size={20} color="white" />
            </button>
          ) : (
            <div className="w-12" />
          )}
        </div>
        {/* Photo count */}
        {photos.length > 0 && (
          <div style={{ position: 'absolute', top: 24, right: 24, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, background: 'var(--ink)', color: 'var(--bg)' }}>
            {photos.length}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 24px max(env(safe-area-inset-bottom,0px),24px)', background: 'var(--bg)' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {/* Library picker — no capture attr so it opens Photos/Files, not camera */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileInput} />
      {/* Native camera fallback for browsers that block getUserMedia */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileInput} />

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <div className="animate-live-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live-dot)' }} />
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Oracle Claims</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Photograph the damage</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: 0 }}>Capture all visible damage from multiple angles</p>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <motion.div className="grid grid-cols-3 gap-2 mb-6" layout>
          {photos.map((photo, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative aspect-square rounded-xl overflow-hidden">
              <img src={photo} alt={`Damage ${i + 1}`} className="w-full h-full object-cover" />
              <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                <X size={12} color="white" />
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Camera error */}
      {cameraError && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, color: '#ef4444', lineHeight: 1.5 }}>
          {cameraError}
        </div>
      )}

      {/* Primary action row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        {/* Take Photo — opens in-app viewfinder or native camera */}
        <button
          onClick={openCamera}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '28px 16px', borderRadius: 20,
            border: '1.5px solid var(--line)', background: 'var(--bg-elev)', cursor: 'pointer',
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dark-card)', color: 'var(--dark-ink)' }}>
            <Camera size={22} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px', color: 'var(--ink)' }}>Take Photo</p>
            <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0 }}>Open camera</p>
          </div>
        </button>

        {/* Upload — opens Photos app + Files */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '28px 16px', borderRadius: 20,
            border: '1.5px solid var(--line)', background: 'var(--bg-elev)', cursor: 'pointer',
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-soft)', color: 'var(--ink-2)' }}>
            <ImagePlus size={22} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px', color: 'var(--ink)' }}>Upload</p>
            <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0 }}>Photos &amp; Files</p>
          </div>
        </button>
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-3">
        {photos.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onDone(photos)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 22px', borderRadius: 999,
              background: 'var(--ink)', color: 'var(--bg)',
              border: 'none', fontSize: 14, fontWeight: 400, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Next: Your details <ChevronRight size={16} />
          </motion.button>
        )}
        <button
          onClick={() => onDone([], true)}
          className="text-center py-3 text-sm"
          style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
        >
          I don&#39;t have photos right now
        </button>
      </div>
    </div>
  );
}
