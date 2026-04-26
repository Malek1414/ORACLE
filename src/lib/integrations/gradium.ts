// --- Gradium STT Integration ----------------------------------------------------
// Sends audio blob to Gradium's speech-to-text API.
// Returns a transcript with word-level timing and auto-detected language.
// Language hint is optional — omitting it triggers Gradium's built-in detection.

import { GradiumTranscriptResponse } from '@/types/claim';

const GRADIUM_API_URL = 'https://api.gradium.io/v1/transcribe';

const DEMO_TRANSCRIPT = 'I was driving southbound on Route 9 when the vehicle in front of me braked suddenly without warning. I was unable to stop in time and my front bumper made contact with their rear bumper. We have both pulled over safely. There is visible damage to my front bumper and hood. The other driver and I have exchanged insurance information.';

/**
 * Transcribe audio. Pass `languageHint` to constrain detection to a known language
 * (e.g. 'de' after the first turn confirmed German); omit or pass 'auto' to let
 * Gradium detect language freely.
 */
export async function transcribeAudio(
  audioBlob: Blob,
  languageHint?: string,
  onChunk?: (chunk: string) => void,
): Promise<GradiumTranscriptResponse> {
  const apiKey = process.env.GRADIUM_API_KEY;

  // Demo simulation when no key available
  if (!apiKey) {
    const words = DEMO_TRANSCRIPT.split(' ');
    let built = '';
    for (const word of words) {
      built += (built ? ' ' : '') + word;
      onChunk?.(built);
      await new Promise((r) => setTimeout(r, 60));
    }
    return { transcript: DEMO_TRANSCRIPT, words: [], language: 'en', duration: 24 };
  }

  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  // Omitting 'language' triggers Gradium auto-detection.
  // Pass a hint only when we already confirmed the language from a previous turn.
  if (languageHint && languageHint !== 'auto') {
    formData.append('language', languageHint);
  }
  formData.append('stream', 'true');
  formData.append('word_timestamps', 'true');

  const response = await fetch(GRADIUM_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gradium STT error ${response.status}: ${err}`);
  }

  // Handle streaming response
  if (onChunk && response.headers.get('content-type')?.includes('text/event-stream')) {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullTranscript = '';
    let finalData: GradiumTranscriptResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'partial') {
              onChunk(data.text);
              fullTranscript = data.text;
            } else if (data.type === 'final') {
              finalData = data;
            }
          } catch { /* malformed SSE frame - skip */ }
        }
      }
    }

    return finalData || {
      transcript: fullTranscript,
      words: [],
      language: languageHint || 'en',
      duration: 0,
    };
  }

  return response.json();
}

// --- Gradium TTS ----------------------------------------------------------------
// Converts AI response text to speech. Returns base64 audio + mime type.
// Falls back to empty string -- client uses Web Speech API SpeechSynthesis.

const GRADIUM_TTS_URL = 'https://api.gradium.io/v1/synthesize';

/** Language code to Gradium neural voice ID. Extend as more locales are added. */
const VOICE_MAP: Record<string, string> = {
  de: 'de-DE-neural',
  en: 'en-US-neural',
};
const DEFAULT_VOICE = 'en-US-neural';

export async function synthesizeSpeech(
  text: string,
  language = 'en',
): Promise<{ audioBase64: string; mimeType: string }> {
  const apiKey = process.env.GRADIUM_API_KEY;

  if (!apiKey) {
    return { audioBase64: '', mimeType: 'audio/mp3' };
  }

  const voice = VOICE_MAP[language] ?? DEFAULT_VOICE;

  const response = await fetch(GRADIUM_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voice, speed: 1.05 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gradium TTS error ${response.status}: ${err}`);
  }

  const buffer = await response.arrayBuffer();
  const audioBase64 = Buffer.from(buffer).toString('base64');
  const mimeType = response.headers.get('content-type') || 'audio/mp3';

  return { audioBase64, mimeType };
}
