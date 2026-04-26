import { NextRequest, NextResponse } from 'next/server';
import { geminiTranscribeAudio, geminiSynthesizeSpeech } from '@/lib/integrations/gemini-tts';
import { geminiConverse, ConverseTurn } from '@/lib/integrations/gemini-converse';

// Generous timeout — user wants reliable demo, credits are not a concern.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms),
    ),
  ]);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as Blob | null;
    const historyRaw = (formData.get('history') as string) || '[]';
    const clientTranscript = (formData.get('clientTranscript') as string) || '';
    const clientLanguage = (formData.get('language') as string) || '';

    const history: ConverseTurn[] = JSON.parse(historyRaw);
    const isOpening = !audio || (audio as Blob).size === 0;

    let transcript = '';
    let detectedLanguage = clientLanguage || 'en';

    if (!isOpening) {
      // Gemini STT — 20 s cap (generous for long narrations)
      try {
        const stt = await withTimeout(
          geminiTranscribeAudio(audio as Blob, clientLanguage || undefined),
          20_000,
        );
        transcript = stt.transcript;
        if (stt.language) detectedLanguage = stt.language;
      } catch (sttErr) {
        console.warn('[gemini-converse] STT failed, using client transcript:', sttErr);
      }

      // Fall back to Web Speech API transcript if Gemini STT failed
      if (!transcript && clientTranscript) {
        transcript = clientTranscript;
      }
    }

    // Gemini conversation + extraction — 15 s cap
    const converse = await withTimeout(
      geminiConverse(history, transcript, 0.5, isOpening, detectedLanguage),
      15_000,
    );

    const confirmedLanguage = converse.detectedLanguage || detectedLanguage;

    // Gemini TTS — 30 s cap; fallback to empty so client uses Web Speech API
    let tts = { audioBase64: '', mimeType: 'audio/wav' };
    try {
      tts = await withTimeout(
        geminiSynthesizeSpeech(converse.response, confirmedLanguage),
        30_000,
      );
    } catch (ttsErr) {
      console.warn('[gemini-converse] TTS failed, client will use Web Speech API:', ttsErr);
    }

    return NextResponse.json({
      transcript,
      stressScore: 0.5,
      acousticSentiment: 'neutral',
      response: converse.response,
      done: converse.done,
      extracted: converse.extracted,
      detectedLanguage: confirmedLanguage,
      audioBase64: tts.audioBase64,
      audioMime: tts.mimeType,
    });
  } catch (err) {
    console.error('[gemini-converse] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
