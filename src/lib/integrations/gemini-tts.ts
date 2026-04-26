// --- Gemini STT + TTS -----------------------------------------------------------
// STT: gemini-2.5-flash multimodal — audio sent as inline_data, returns transcript.
// TTS: gemini-2.5-flash-preview-tts — returns raw PCM16 24 kHz mono, wrapped here
//      into a standard WAV so the browser Audio element can decode it directly.

const GEMINI_FLASH_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_TTS_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';

const DEMO_TRANSCRIPT =
  'I was driving southbound on Route 9 when the vehicle in front braked suddenly without warning. ' +
  'I could not stop in time and my front bumper struck their rear bumper. ' +
  'Both cars are pulled over safely. There is visible damage to my front bumper and hood. ' +
  'The other driver and I have exchanged insurance information.';

// ─── PCM16 → WAV ─────────────────────────────────────────────────────────────
// Gemini TTS returns raw 16-bit PCM at 24 kHz (mimeType: "audio/pcm;rate=24000").
// Browsers cannot play raw PCM — wrap it in a 44-byte RIFF/WAV header first.
function pcm16ToWav(pcmBase64: string): string {
  const pcm = Buffer.from(pcmBase64, 'base64');
  const sampleRate = 24_000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length;

  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0, 'ascii');
  hdr.writeUInt32LE(36 + dataSize, 4);
  hdr.write('WAVE', 8, 'ascii');
  hdr.write('fmt ', 12, 'ascii');
  hdr.writeUInt32LE(16, 16);           // subchunk1 size
  hdr.writeUInt16LE(1, 20);            // PCM format
  hdr.writeUInt16LE(numChannels, 22);
  hdr.writeUInt32LE(sampleRate, 24);
  hdr.writeUInt32LE(byteRate, 28);
  hdr.writeUInt16LE(blockAlign, 32);
  hdr.writeUInt16LE(bitsPerSample, 34);
  hdr.write('data', 36, 'ascii');
  hdr.writeUInt32LE(dataSize, 40);

  return Buffer.concat([hdr, pcm]).toString('base64');
}

// ─── STT ──────────────────────────────────────────────────────────────────────

/**
 * Transcribe audio using Gemini 2.5 Flash multimodal.
 * Audio sent as base64 inline_data; returns the verbatim transcript.
 */
export async function geminiTranscribeAudio(
  audioBlob: Blob,
  languageHint?: string,
): Promise<{ transcript: string; language: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 600));
    return { transcript: DEMO_TRANSCRIPT, language: 'en' };
  }

  const buf = await audioBlob.arrayBuffer();
  const audioBase64 = Buffer.from(buf).toString('base64');
  const mimeType = audioBlob.type || 'audio/webm';
  const langNote = languageHint ? ` The speaker is using ${languageHint}.` : '';

  const body = {
    contents: [{
      role: 'user',
      parts: [
        { text: `Transcribe this audio verbatim.${langNote} Return only the transcript, no commentary.` },
        { inline_data: { mime_type: mimeType, data: audioBase64 } },
      ],
    }],
    generationConfig: { temperature: 0 },
  };

  const res = await fetch(`${GEMINI_FLASH_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini STT ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const transcript = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  return { transcript, language: languageHint || 'en' };
}

// ─── TTS ──────────────────────────────────────────────────────────────────────

/**
 * Synthesize speech using Gemini 2.5 Flash Preview TTS.
 * Returns base64-encoded WAV (PCM16, 24 kHz, mono) — playable in any browser
 * via the HTML Audio element or Web Audio API without any additional decoding.
 */
export async function geminiSynthesizeSpeech(
  text: string,
  language = 'en',
): Promise<{ audioBase64: string; mimeType: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { audioBase64: '', mimeType: 'audio/wav' };

  // Aoede: warm, natural voice — multilingual (handles EN and DE natively)
  const voiceName = 'Aoede';

  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  };

  const res = await fetch(`${GEMINI_TTS_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini TTS ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inlineData?.data) throw new Error('Gemini TTS returned no audio data');

  // PCM16 24 kHz → WAV so the browser can play it
  const audioBase64 = pcm16ToWav(inlineData.data);
  return { audioBase64, mimeType: 'audio/wav' };
}
