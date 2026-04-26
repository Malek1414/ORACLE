'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, ChevronRight } from 'lucide-react';

type RecState = 'idle' | 'requesting' | 'recording' | 'done' | 'error';

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  // iOS Safari supports mp4, most others support webm
  const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', ''];
  for (const type of types) {
    if (!type || MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export function RecordStep({ onDone }: { onDone: (blob: Blob) => void }) {
  const [recState, setRecState] = useState<RecState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState('');

  // All mutable control state lives in refs so native event handlers
  // always read current values — zero stale-closure risk.
  const recStateRef = useRef<RecState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function sync(s: RecState) {
    recStateRef.current = s;
    setRecState(s);
  }

  async function startRecording() {
    if (!navigator?.mediaDevices?.getUserMedia) {
      const msg =
        typeof window !== 'undefined' &&
        window.location.protocol === 'http:' &&
        window.location.hostname !== 'localhost'
          ? 'HTTPS required. Open https://' + window.location.hostname + ':3000 on your phone.'
          : 'Microphone not supported in this browser. Try Chrome or Safari.';
      setError(msg);
      sync('error');
      return;
    }

    setError('');
    sync('requesting'); // immediate visual feedback — user knows tap registered

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        setAudioBlob(blob);
        sync('done');
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setDuration(0);
      sync('recording');
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes('NotAllowed') || msg.includes('Permission') || msg.includes('denied')
          ? 'Microphone access denied. Allow the microphone in your browser settings, then tap again.'
          : msg.includes('NotFound') || msg.includes('DevicesNotFound')
          ? 'No microphone found on this device.'
          : 'Microphone error: ' + msg,
      );
      sync('error');
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  // Attach a native DOM click listener — bypasses React's synthetic event
  // system entirely, which eliminates mobile-browser quirks around touch
  // event ordering, preventDefault side-effects, and 300ms delay handling.
  // The button also has touchAction:manipulation (CSS) which kills the
  // double-tap-zoom delay so onClick fires immediately on mobile.
  useEffect(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const handle = () => {
      const s = recStateRef.current;
      if (s === 'idle' || s === 'error') startRecording();
      else if (s === 'recording') stopRecording();
    };
    btn.addEventListener('click', handle);
    return () => btn.removeEventListener('click', handle);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const isIdle = recState === 'idle' || recState === 'error';
  const isRequesting = recState === 'requesting';
  const isRecording = recState === 'recording';
  const isDone = recState === 'done';

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 24px max(env(safe-area-inset-bottom, 0px), 24px)',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />
          <span style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-2)' }}>
            ORACLE CLAIMS
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', margin: 0 }}>
          Describe what happened
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8 }}>
          Speak freely. We’ll handle the rest.
        </p>
      </div>

      {/* Centre section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>

        {/* Status label */}
        <p style={{
          fontSize: isRecording ? 20 : 13,
          color: isRecording ? 'var(--accent)' : 'var(--ink-3)',
          fontFamily: isRecording ? 'monospace' : undefined,
          margin: 0,
          minHeight: 24,
          textAlign: 'center',
          transition: 'color 0.2s',
        }}>
          {isIdle && !error && 'Tap the button to begin'}
          {isRequesting && 'Requesting microphone…'}
          {isRecording && fmt(duration)}
          {isDone && `✓  ${fmt(duration)} recorded`}
        </p>

        {/* Error banner */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 13,
            color: '#fca5a5',
            textAlign: 'center',
            lineHeight: 1.5,
            width: '100%',
          }}>
            {error}
            <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>Tap the button to try again</div>
          </div>
        )}

        {/* Mic button */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isRecording && (
            <>
              <div className="animate-pulse-ring" style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', border: '2px solid var(--accent)', opacity: 0.35, pointerEvents: 'none' }} />
              <div className="animate-pulse-ring" style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', border: '2px solid var(--accent)', opacity: 0.15, animationDelay: '0.6s', pointerEvents: 'none' }} />
            </>
          )}
          <button
            ref={buttonRef}
            disabled={isDone || isRequesting}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isDone || isRequesting ? 'default' : 'pointer',
              // touchAction:manipulation disables double-tap-zoom so the
              // browser fires click immediately — no 300ms delay on iOS/Android
              touchAction: 'manipulation',
              background: isRecording
                ? 'var(--red)'
                : isDone
                ? 'var(--green)'
                : isRequesting
                ? 'var(--bg-soft)'
                : 'var(--accent)',
              boxShadow: isRecording
                ? '0 0 32px rgba(239,68,68,0.4)'
                : isDone
                ? '0 0 32px rgba(16,185,129,0.4)'
                : '0 0 32px rgba(99,102,241,0.4)',
              transition: 'background 0.2s, box-shadow 0.2s',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none',
            }}
          >
            {isRecording
              ? <Square size={32} fill="white" color="white" />
              : <Mic size={36} color="white" />}
          </button>
        </div>
      </div>

      {/* Next button */}
      <div style={{ width: '100%' }}>
        {isDone && audioBlob && (
          <button
            onClick={() => onDone(audioBlob)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '16px 0',
              borderRadius: 16,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 17,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 0 24px rgba(99,102,241,0.4)',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            Next: Capture Photos <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
