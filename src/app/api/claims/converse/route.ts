import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio, synthesizeSpeech } from '@/lib/integrations/gradium';
import { enhanceAudio } from '@/lib/integrations/ai-coustics';
import { openaiConverse, ConverseTurn } from '@/lib/integrations/openai-converse';

// Race a promise against a deadline. Non-fatal: callers catch rejections via allSettled.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as Blob | null;
    const historyRaw = (formData.get('history') as string) || '[]';
    const clientTranscript = (formData.get('clientTranscript') as string) || '';
    // Language detected in a previous turn -- used as hint for STT and TTS.
    // Empty on the opening turn so Gradium auto-detects.
    const clientLanguage = (formData.get('language') as string) || '';

    const history: ConverseTurn[] = JSON.parse(historyRaw);
    const isOpening = !audio || (audio as Blob).size === 0;

    let transcript = '';
    let stressScore = 0.5;
    let acousticSentiment = 'neutral';
    let detectedLanguage = clientLanguage || 'en';

    if (!isOpening) {
      // Run STT and acoustic enhancement in parallel with hard timeouts so a slow
      // integration never holds up the dialogue model.
      // - Acoustic is a hint only (stress/sentiment) -- 1 s cap.
      // - STT gets 2 s before we fall back to the browser Web Speech transcript.
      // Pass the confirmed language as a hint on turns after the first so Gradium
      // does not waste compute re-detecting a language we already know.
      const [transcriptResult, acousticResult] = await Promise.allSettled([
        withTimeout(
          transcribeAudio(audio as Blob, clientLanguage || undefined),
          2000,
        ),
        withTimeout(enhanceAudio(audio as Blob), 1000),
      ]);

      if (transcriptResult.status === 'fulfilled') {
        transcript = transcriptResult.value.transcript;
        // Prefer the STT-detected language over the client hint (Gradium is authoritative).
        if (transcriptResult.value.language) {
          detectedLanguage = transcriptResult.value.language;
        }
      }
      if (acousticResult.status === 'fulfilled') {
        stressScore = acousticResult.value.stress_score;
        acousticSentiment = acousticResult.value.acoustic_sentiment;
      }

      // Fall back to Web Speech API transcript when Gradium STT is unavailable.
      if (!transcript && clientTranscript) {
        transcript = clientTranscript;
      }
    }

    // Get AI response from OpenAI GPT-4o-mini.
    // Pass detectedLanguage so the model responds in the right language and can
    // refine language detection based on the transcript content.
    const converse = await openaiConverse(
      history,
      transcript,
      stressScore,
      isOpening,
      detectedLanguage,
    );

    // The model may upgrade detectedLanguage (e.g. user mentions Berlin -> 'de').
    const confirmedLanguage = converse.detectedLanguage || detectedLanguage;

    // Generate TTS audio via Gradium in the confirmed language -- 1.5 s cap;
    // client falls back to Web Speech API SpeechSynthesis on timeout/failure.
    let tts = { audioBase64: '', mimeType: 'audio/mp3' };
    try {
      tts = await withTimeout(synthesizeSpeech(converse.response, confirmedLanguage), 1500);
    } catch {
      // TTS unavailable or timed out -- client uses Web Speech API SpeechSynthesis
    }

    return NextResponse.json({
      transcript,
      stressScore,
      acousticSentiment,
      response: converse.response,
      done: converse.done,
      extracted: converse.extracted,
      detectedLanguage: confirmedLanguage,
      audioBase64: tts.audioBase64,
      audioMime: tts.mimeType,
    });
  } catch (err) {
    console.error('[converse] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
