'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ClaimIncident } from '@/types/claim';

// ─── Types ──────────────────────────────────────────────────────────────────

type ConvState =
  | 'init'        // first server call in flight
  | 'responding'  // AI audio playing
  | 'listening'   // mic open, waiting for speech
  | 'recording'   // speech detected
  | 'processing'  // audio sent, waiting for server
  | 'done';       // conversation complete

interface Message { role: 'user' | 'ai'; text: string; }
interface HistoryTurn { role: 'user' | 'model'; content: string; }

interface Props {
  onDone: (blob: Blob, incident?: Partial<ClaimIncident>) => void;
  /** API route to hit for each conversation turn. Defaults to /api/claims/converse. */
  apiRoute?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', ''];
  for (const t of types) if (!t || MediaRecorder.isTypeSupported(t)) return t;
  return '';
}

// Tiny silent WAV — played on the first user gesture to unlock <Audio> autoplay
// on mobile browsers (iOS Safari, Chrome Android). Once any audio has been played
// inside a user-gesture handler, subsequent `audio.play()` calls on the same page
// are allowed without a gesture.
const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

function speakFallback(text: string, lang = 'en'): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    // Set BCP-47 locale so the OS picks a matching voice (German vs English)
    utt.lang = lang === 'de' ? 'de-DE' : 'en-US';
    utt.rate = 1.05;
    // Safety net: speechSynthesis on mobile Safari sometimes never fires onend.
    // Estimate reading time (avg 140 wpm ≈ 11 chars/s) + 3 s buffer.
    const timeoutMs = Math.max(4000, Math.ceil(text.length / 11) * 1000 + 3000);
    const t = setTimeout(resolve, timeoutMs);
    utt.onend = () => { clearTimeout(t); resolve(); };
    utt.onerror = () => { clearTimeout(t); resolve(); };
    window.speechSynthesis.speak(utt);
  });
}

async function playAudio(base64: string, mime: string, text: string, lang = 'en'): Promise<void> {
  if (base64) {
    try {
      const bytes = atob(base64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      // Safety net: if onended/onerror never fire (locked audio context on mobile),
      // resolve after a generous timeout so state always progresses.
      const estimatedMs = Math.max(8000, Math.ceil(text.length / 11) * 1000 + 4000);
      await Promise.race([
        new Promise<void>((res, rej) => {
          audio.onended = () => res();
          // Media decode/format errors are non-fatal: resolve and skip this blob.
          audio.onerror = () => res();
          // Permission/gesture errors (NotAllowedError on iOS) must REJECT so the
          // outer catch falls through to speakFallback. Previously this called
          // res() which swallowed the error and left the user in silence.
          audio.play().catch(rej);
        }),
        new Promise<void>((res) => setTimeout(res, estimatedMs)),
      ]);
      URL.revokeObjectURL(url);
      return;
    } catch { /* audio.play() was blocked (no gesture) — fall through to speakFallback */ }
  }
  await speakFallback(text, lang);
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function ConversationStep({ onDone, apiRoute = '/api/claims/converse' }: Props) {
  const [convState, setConvState] = useState<ConvState>('init');
  const [messages, setMessages] = useState<Message[]>([]);
  const [liveText, setLiveText] = useState('');
  const [error, setError] = useState('');
  const [waveform, setWaveform] = useState<number[]>(() => Array.from({ length: 36 }, () => 0.5));
  const [duration, setDuration] = useState(0);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persistent refs — survive re-renders without stale closures
  const audioUnlockedRef   = useRef(false); // true once silent audio has been played in a gesture
  // Stores audio that couldn't play yet because no user gesture had occurred.
  // Consumed and played inside startListening() on the first tap.
  const pendingAudioRef = useRef<{ base64: string; mime: string; text: string; lang: string } | null>(null);
  const stateRef        = useRef<ConvState>('init');
  const historyRef      = useRef<HistoryTurn[]>([]);
  const allChunksRef    = useRef<BlobPart[]>([]);
  const mimeRef         = useRef('');
  const recorderRef     = useRef<MediaRecorder | null>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const audioCtxRef        = useRef<AudioContext | null>(null);
  const rawStreamRef        = useRef<MediaStream | null>(null); // raw mic stream, for track cleanup
  const detectedLangRef     = useRef<string>('');              // language confirmed by server
  const maxRecordTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef  = useRef<any>(null);
  const extractedRef        = useRef<Partial<ClaimIncident>>({});
  const donePayloadRef       = useRef<{ blob: Blob; incident: Partial<ClaimIncident> } | null>(null);
  const messagesEndRef       = useRef<HTMLDivElement | null>(null);
  const webSpeechTranscript  = useRef(''); // last captured Web Speech API text, fallback for Gradium STT

  function setState(s: ConvState) {
    stateRef.current = s;
    setConvState(s);
  }

  function addMsg(role: 'user' | 'ai', text: string) {
    setMessages((prev) => [...prev, { role, text }]);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Web Audio pre-processing pipeline ──────────────────────────────────
  // Builds: raw mic -> HPF (wind/rumble) -> LPF (rain/hiss) -> compressor (AGC)
  //         -> [analyser for VAD] + [MediaStreamDestination for recording]
  // Returns the processed MediaStream for MediaRecorder and the AnalyserNode for VAD.
  // Falls back to the raw stream if Web Audio is unavailable.

  function createAudioPipeline(rawStream: MediaStream): {
    recordingStream: MediaStream;
    analyserNode: AnalyserNode;
  } {
    try {
      const ctx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(rawStream);

      // High-pass at 80 Hz: removes engine rumble, wind, road vibration
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = 80;
      hpf.Q.value = 0.7;

      // Low-pass at 8 kHz: removes rain hiss, high-frequency noise
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 8000;
      lpf.Q.value = 0.7;

      // Dynamics compressor: automatic gain control — normalises quiet/loud voices
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      // Analyser for VAD and waveform visualisation
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 512;

      // Recording destination — produces a clean processed MediaStream
      const dest = ctx.createMediaStreamDestination();

      // Chain: source -> hpf -> lpf -> compressor -> [analyserNode, dest]
      source.connect(hpf);
      hpf.connect(lpf);
      lpf.connect(compressor);
      compressor.connect(analyserNode); // monitor
      compressor.connect(dest);         // record

      return { recordingStream: dest.stream, analyserNode };
    } catch {
      // Web Audio not available (unlikely but possible in some WebViews)
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(rawStream);
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 512;
      source.connect(analyserNode);
      return { recordingStream: rawStream, analyserNode };
    }
  }

  // ── Silence detection ──────────────────────────────────────────────────

  function startSilenceDetection(analyserNode: AnalyserNode) {
    try {
      const analyser = analyserNode;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      let silenceMs = 0;
      let lastTick = Date.now();
      let hasSpokeOnce = false; // don't auto-stop until user has actually spoken

      const tick = () => {
        if (stateRef.current !== 'recording') return;
        // Guard against accessing a closed AudioContext on a queued animation frame.
        if (audioCtxRef.current?.state === 'closed') return;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        const now = Date.now();
        const dt = now - lastTick;
        lastTick = now;

        if (rms > 0.018) {
          hasSpokeOnce = true;
          silenceMs = 0;
        } else if (hasSpokeOnce) {
          silenceMs += dt;
          // Semantic VAD: don't cut off mid-address, mid-plate, mid-number, or
          // trailing conjunctions/prepositions that signal the user isn't done.
          const lastWords = webSpeechTranscript.current.trim();
          // Also catch German incomplete-sentence endings
          const incompleteEnd = /\b(and|but|then|or|near|at|on|around|i think|the|my|is|it|so|a|an|und|aber|dann|oder|auf|an|in|ich|es|das|die|der|ein|eine)\s*$/i.test(lastWords);
          const silenceLimit = (!lastWords || incompleteEnd) ? 2400 : 1100;
          if (silenceMs > silenceLimit) {
            stopRecording();
            return;
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch { /* analyser unavailable */ }
  }

  // ── Live transcript display (Web Speech API, display-only) ────────────

  function startLiveDisplay() {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: { resultIndex: number; results: { [i: number]: { [j: number]: { transcript: string } }; length: number } }) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        interim += e.results[i][0].transcript;
      }
      setLiveText(interim);
      webSpeechTranscript.current = interim; // always keep the latest accumulated text
    };
    rec.onerror = () => {};
    try { rec.start(); } catch { /* already started */ }
    recognitionRef.current = rec;
  }

  function stopLiveDisplay() {
    // webSpeechTranscript.current is intentionally NOT cleared here — sendTurn reads it
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
    setLiveText('');
  }

  // ── Stop recording ──────────────────────────────────────────────────

  function stopRecording() {
    if (maxRecordTimerRef.current) { clearTimeout(maxRecordTimerRef.current); maxRecordTimerRef.current = null; }
    stopLiveDisplay();
    recorderRef.current?.stop();
    // Stop both the processed stream's tracks and the raw mic stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    rawStreamRef.current?.getTracks().forEach((t) => t.stop());
    try { audioCtxRef.current?.close(); } catch { /* ignore */ }
  }

  // ── Send a turn to the server ───────────────────────────────────────

  const sendTurn = useCallback(
    async (turnBlob: Blob | null) => {
      setState('processing');
      setError('');

      try {
        const fd = new FormData();
        if (turnBlob && turnBlob.size > 0) fd.append('audio', turnBlob, 'turn.webm');
        fd.append('history', JSON.stringify(historyRef.current));
        // Pass confirmed language so server uses it as STT hint and TTS voice selector
        if (detectedLangRef.current) fd.append('language', detectedLangRef.current);
        // Send Web Speech API transcript as fallback in case Gradium STT is unavailable
        if (webSpeechTranscript.current) {
          fd.append('clientTranscript', webSpeechTranscript.current);
          webSpeechTranscript.current = ''; // consume it
        }

        const res = await fetch(apiRoute, { method: 'POST', body: fd });
        if (!res.ok) throw new Error(`Server ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Add user transcript to UI + history
        if (data.transcript) {
          addMsg('user', data.transcript);
          historyRef.current = [
            ...historyRef.current,
            { role: 'user', content: data.transcript },
          ];
        }

        // Store confirmed language for subsequent turns
        if (data.detectedLanguage) detectedLangRef.current = data.detectedLanguage;

        // Merge extracted incident fields (including new FNOL fields)
        const ex = data.extracted ?? {};
        extractedRef.current = {
          ...extractedRef.current,
          ...(ex.incident_type      && { incident_type:       ex.incident_type }),
          ...(ex.description        && { description:         ex.description }),
          ...(ex.timestamp          && { timestamp:           ex.timestamp }),
          ...(ex.vehicles_involved  && { vehicles_involved:   ex.vehicles_involved }),
          ...(ex.people_count != null && { people_count:      ex.people_count }),
          ...(ex.at_fault           && { at_fault:            ex.at_fault }),
          ...(ex.injuries_reported != null && { injuries_reported: ex.injuries_reported }),
          ...(ex.police_involved != null   && { police_involved:   ex.police_involved }),
          ...(ex.damage_severity    && { damage_severity:     ex.damage_severity }),
          ...(ex.location && {
            location: { ...ex.location, lat: 0, lng: 0, country: 'US' },
          }),
        };

        // Add AI response to UI + history
        addMsg('ai', data.response);
        historyRef.current = [
          ...historyRef.current,
          { role: 'model', content: data.response },
        ];

        // Play AI audio
        setState('responding');
        const audioLang = data.detectedLanguage ?? detectedLangRef.current ?? 'en';

        if (!audioUnlockedRef.current) {
          // The opening question fires before any user gesture, so audio.play() would
          // be blocked by the browser. Store it and play it on the first tap instead.
          // The user can read the AI text in the transcript list in the meantime.
          pendingAudioRef.current = {
            base64: data.audioBase64 ?? '',
            mime:   data.audioMime   ?? 'audio/mp3',
            text:   data.response,
            lang:   audioLang,
          };
        } else {
          setState('responding');
          await playAudio(data.audioBase64 ?? '', data.audioMime ?? 'audio/mp3', data.response, audioLang);
        }

        if (data.done) {
          setState('done');
          const combined = new Blob(allChunksRef.current, { type: mimeRef.current || 'audio/webm' });
          // Store payload — user taps "Continue" to proceed, preventing abrupt auto-transition.
          donePayloadRef.current = { blob: combined, incident: extractedRef.current };
        } else {
          // Show "tap to speak" — don't auto-call getUserMedia, mobile requires a user gesture
          setState('listening');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setState('listening');
      }
    },
    [onDone] // eslint-disable-line
  );

  // ── Start listening ───────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    // Called only from a tap — guarantees user gesture for getUserMedia on mobile
    setLiveText('');
    setError('');

    // Unlock <Audio> autoplay on mobile. We play a 0-byte silent WAV right here,
    // inside the user-gesture handler, so the browser marks this page as
    // "audio permitted". Subsequent audio.play() calls (even after async awaits)
    // will succeed without a new gesture.
    if (!audioUnlockedRef.current) {
      try {
        const unlock = new Audio(SILENT_WAV);
        await unlock.play();
        audioUnlockedRef.current = true;
      } catch { /* ignore — unlock is best-effort */ }
    }

    // If the opening question's audio was deferred (no gesture at mount time),
    // play it now — we're inside a tap handler so audio is permitted.
    if (pendingAudioRef.current) {
      const p = pendingAudioRef.current;
      pendingAudioRef.current = null;
      setState('responding');
      await playAudio(p.base64, p.mime, p.text, p.lang);
      setState('listening');
    }

    try {
      // Request mic with browser-native noise suppression, echo cancellation,
      // and AGC as a first pass before our Web Audio pipeline refines further.
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: { ideal: 16000 },
        },
        video: false,
      });
      rawStreamRef.current = rawStream;

      // Build the Web Audio pipeline: HPF + LPF + compressor.
      // recordingStream is the processed output we feed to MediaRecorder.
      const { recordingStream, analyserNode } = createAudioPipeline(rawStream);
      streamRef.current = recordingStream;

      const mime = getMime();
      mimeRef.current = mime || 'audio/webm';
      const recorder = new MediaRecorder(recordingStream, mime ? { mimeType: mime } : {});
      const turnChunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) {
          turnChunks.push(e.data);
          allChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        rawStream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(turnChunks, { type: mime || 'audio/webm' });
        sendTurn(blob);
      };

      recorder.start(250);
      recorderRef.current = recorder;
      setState('recording'); // mic is live, show recording state immediately

      // Safety net: auto-stop after 90 s to prevent runaway recordings
      maxRecordTimerRef.current = setTimeout(() => stopRecording(), 90_000);

      startSilenceDetection(analyserNode);
      startLiveDisplay();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes('NotAllowed') || msg.includes('denied')
          ? 'Microphone access denied. Allow it in browser settings.'
          : msg
      );
      setState('listening'); // stay tappable so user can retry
    }
  }, [sendTurn]); // eslint-disable-line

  // ── Boot: fire opening AI turn ────────────────────────────────────────

  useEffect(() => {
    sendTurn(null);
  }, []); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      window.speechSynthesis?.cancel();
    };
  }, []); // eslint-disable-line

  // Animated waveform bars
  useEffect(() => {
    const active = convState === 'recording' || convState === 'responding';
    if (!active) return;
    const iv = setInterval(() => {
      setWaveform(Array.from({ length: 36 }, () => 0.15 + Math.random() * 0.85));
    }, 110);
    return () => clearInterval(iv);
  }, [convState]);

  // Recording duration timer
  useEffect(() => {
    const recording = convState === 'recording';
    if (recording) {
      setDuration(0);
      durationTimerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
    return () => { if (durationTimerRef.current) clearInterval(durationTimerRef.current); };
  }, [convState]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Derived display values ────────────────────────────────────────────

  const isRecording   = convState === 'recording';
  const isListening   = convState === 'listening';
  const isProcessing  = convState === 'processing' || convState === 'init';
  const isResponding  = convState === 'responding';
  const isDone        = convState === 'done';

  const orbGlow = isRecording ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)';

  const orbAnim = isProcessing
    ? 'none'
    : isResponding
    ? 'breathe 0.75s ease-in-out infinite'
    : isRecording
    ? 'breathe 1.1s ease-in-out infinite'
    : 'breathe 3s ease-in-out infinite';

  const statusLabel = isProcessing
    ? 'Processing…'
    : isResponding
    ? 'Oracle speaking'
    : isListening
    ? 'Your turn'
    : isRecording
    ? 'Tap orb when done'
    : isDone
    ? 'Complete'
    : '';

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      padding: '12px 16px max(env(safe-area-inset-bottom,0px),16px)',
      gap: 12,
      minHeight: 0,
      overflow: 'hidden',
    }}>

      {/* ─ Big dark card — voice surface ─────────────────────── */}
      <div style={{
        position: 'relative',
        background: 'var(--dark-card)',
        borderRadius: 24,
        padding: 'clamp(22px,4vw,36px)',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        {/* Gradient sheen */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 24, background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0) 55%)', pointerEvents: 'none' }} />

        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dark-ink-2)' }}>
            Describe your incident
          </span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: isRecording ? 'var(--dark-ink)' : 'var(--dark-ink-2)' }}>
            {isRecording ? `● ${fmt(duration)}` : isProcessing ? 'Processing…' : isResponding ? 'Speaking' : isDone ? 'Done ✓' : 'Ready'}
          </span>
        </div>

        {/* Headline + subhead */}
        <h1 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1.1, margin: '0 0 6px', color: 'var(--dark-ink)' }}>
          Describe the accident
        </h1>
        <p style={{ fontSize: 13, color: 'var(--dark-ink-2)', margin: '0 0 24px', fontWeight: 300, lineHeight: 1.5 }}>
          One recording. Cover what happened, where, who was involved, injuries, and damage. Oracle may ask up to two follow-ups.
        </p>

        {/* Waveform + Mic row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 14 }}>
          {/* Left bars */}
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', opacity: isRecording || isResponding ? 1 : 0.25, transition: 'opacity 0.4s' }}>
            {waveform.slice(0, 18).map((v, i) => {
              const fade = Math.min(1, i / 5) * Math.min(1, (18 - i) / 4);
              return <div key={i} style={{ width: 2, borderRadius: 2, background: 'rgba(255,255,255,0.75)', height: `${Math.max(3, (4 + v * 38) * fade)}px`, transition: isRecording || isResponding ? 'height 0.12s' : 'none' }} />;
            })}
          </div>

          {/* Mic button */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {isRecording && (
              <>
                <div className="animate-pulse-ring" style={{ position: 'absolute', width: 96, height: 96, top: -8, left: -8, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.35)', opacity: 0.5, pointerEvents: 'none' }} />
                <div className="animate-pulse-ring" style={{ position: 'absolute', width: 96, height: 96, top: -8, left: -8, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.18)', opacity: 0.3, animationDelay: '0.65s', pointerEvents: 'none' }} />
              </>
            )}
            <button
              onClick={() => {
                if (isRecording) stopRecording();
                else if (isListening) startListening();
              }}
              style={{
                width: 80, height: 80, borderRadius: '50%', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: isRecording || isListening ? 'pointer' : 'default',
                background: isRecording ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
                boxShadow: isRecording ? '0 0 32px rgba(255,255,255,0.2)' : 'none',
                animation: orbAnim,
                transition: 'background 0.25s, box-shadow 0.25s',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                outline: 'none',
              }}
            >
              {isProcessing && (
                <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.6)', animation: 'oracle-spin 0.9s linear infinite' }} />
              )}
              {isResponding && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" fill="rgba(255,255,255,0.7)" />
                  <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
              {(isListening || isRecording) && (
                <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 22 }}>
                  {[0.5, 0.9, 0.6, 1.0, 0.7].map((h, i) => (
                    <div key={i} style={{
                      width: 3, height: `${h * 18}px`, borderRadius: 2,
                      background: isRecording ? 'rgba(26,26,26,0.75)' : 'rgba(255,255,255,0.25)',
                      animation: isRecording ? `breathe ${0.5 + i * 0.12}s ease-in-out infinite` : 'none',
                    }} />
                  ))}
                </div>
              )}
              {isDone && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#2A7E4A" strokeWidth="1.5" />
                  <path d="M8 12l3 3 5-5" stroke="#2A7E4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>

          {/* Right bars */}
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', opacity: isRecording || isResponding ? 1 : 0.25, transition: 'opacity 0.4s' }}>
            {waveform.slice(18, 36).map((v, i) => {
              const fade = Math.min(1, i / 4) * Math.min(1, (18 - i) / 5);
              return <div key={i} style={{ width: 2, borderRadius: 2, background: 'rgba(255,255,255,0.75)', height: `${Math.max(3, (4 + v * 38) * fade)}px`, transition: isRecording || isResponding ? 'height 0.12s' : 'none' }} />;
            })}
          </div>
        </div>

        {/* Status label */}
        <p style={{ textAlign: 'center', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--dark-ink-2)', margin: 0 }}>
          {isProcessing && 'Processing your words'}
          {isResponding && 'Oracle speaking'}
          {isListening && 'Your turn — tap the orb'}
          {isRecording && 'Listening — tap to stop'}
          {isDone && 'Conversation complete'}
          {convState === 'init' && ''}
        </p>

        {/* Error */}
        {error && (
          <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#fca5a5', textAlign: 'center', lineHeight: 1.5 }}>
            {error}
          </div>
        )}
      </div>

      {/* ─ Live transcript card ──────────────────────────────────── */}
      <div style={{ flex: 1, background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Live Transcript</span>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>{messages.length} {messages.length === 1 ? 'turn' : 'turns'}</span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && isProcessing && (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--line)', borderTopColor: 'var(--ink-3)', animation: 'oracle-spin 0.9s linear infinite', margin: '0 auto 10px' }} />
            <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>Starting…</span>
          </div>
        )}
        {messages.length === 0 && !isProcessing && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-4)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Tap the orb to begin.</div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-end',
            gap: 8,
            animation: 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
          }}>
            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: msg.role === 'user' ? 'var(--bg-soft)' : 'var(--dark-card)',
              color: msg.role === 'user' ? 'var(--ink)' : 'var(--dark-ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 500,
            }}>
              {msg.role === 'user' ? 'You' : (
                <span style={{ width: 10, height: 10, border: '1.5px solid currentColor', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: 3, height: 3, background: 'currentColor', borderRadius: '50%' }} />
                </span>
              )}
            </div>
            <div style={{
              maxWidth: '78%',
              padding: '10px 14px',
              borderRadius: 14,
              background: msg.role === 'ai' ? 'var(--bg-soft)' : 'var(--dark-card)',
              fontSize: 14,
              lineHeight: 1.5,
              color: msg.role === 'ai' ? 'var(--ink)' : 'var(--dark-ink)',
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* Live interim transcript */}
        {liveText && (
          <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8, animation: 'fade-up 0.2s ease both' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'var(--bg-soft)' }} />
            <div style={{
              maxWidth: '78%', padding: '10px 14px', borderRadius: 14,
              background: 'var(--bg-soft)',
              fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic',
              border: '1px solid var(--line)',
            }}>
              {liveText}…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ─ Continue button ──────────────────────────────────────────────── */}
      {isDone && donePayloadRef.current && (
        <button
          onClick={() => {
            const p = donePayloadRef.current!;
            onDone(p.blob, p.incident);
          }}
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: 999,
            background: 'var(--dark-card)',
            color: 'var(--dark-ink)',
            border: 'none',
            fontSize: 15,
            fontWeight: 400,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            flexShrink: 0,
            animation: 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          Continue to photos
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <style>{`
        @keyframes oracle-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
