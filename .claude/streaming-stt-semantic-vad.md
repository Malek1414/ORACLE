# Streaming STT And Semantic VAD Upgrade

This file is the technical instruction set for making the ORACLE voice agent responsive enough for the Inca track.

The current system is a good prototype, but it is not yet a true low-latency voice agent. It records a turn, uploads the blob, waits for transcription, waits for the LLM, then waits for TTS. For the benchmark, change the voice loop to stream audio and respond as soon as the user is semantically done.

## Principle

Responsiveness beats sentiment theater.

Sentiment should shape tone, not block the conversation. The user should feel heard because the agent responds quickly, asks the right next question, and does not ramble.

## Current Files

- Voice UI: `src/components/mobile/ConversationStep.tsx`
- Conversation route: `src/app/api/claims/converse/route.ts`
- Gradium wrapper: `src/lib/integrations/gradium.ts`
- Dialogue model: `src/lib/integrations/openai-converse.ts`
- ai-coustics wrapper: `src/lib/integrations/ai-coustics.ts`

## Target Architecture

```text
Browser microphone
  -> AudioWorklet or MediaRecorder chunking
  -> server relay
  -> Gradium streaming STT
  -> partial transcript buffer
  -> semantic VAD turn detector
  -> dialogue model
  -> Gradium streaming TTS
  -> browser audio playback
```

Do not expose `GRADIUM_API_KEY` to the browser. Use a server relay.

## Audio Input

Preferred audio format for Gradium STT:

- 24 kHz
- mono
- 16-bit signed PCM
- 80 ms chunks
- 1920 samples per chunk

Browser capture should request:

```ts
{
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1
  }
}
```

If browser-native resampling is not enough, add an `AudioWorklet` that converts float samples to 24 kHz PCM16. Keep chunk size stable.

## Gradium STT Settings

Use streaming STT with:

- `model_name: "default"`
- `input_format: "pcm"`
- `json_config.language: "en"` for English demo, or `"de"` if demoing German
- `json_config.delay_in_frames` adaptive by noise level

Suggested delay settings:

```text
Clean audio: 7 or 8
Normal room: 10 or 12
Hackathon hall: 14 or 16
Very noisy audio: 20
```

Higher delay improves accuracy but adds latency. For the Inca track, start at `10`, then adapt upward only when confidence drops or partial text is unstable.

Use temperature conservatively:

```text
Default exact mode: 0
Fallback under no-text/noisy audio: 0.1 to 0.2
```

## Semantic VAD

Do not rely only on silence. Detect end of turn using both audio VAD and language state.

Inputs:

- Gradium VAD inactivity probability.
- Time since last speech frame.
- Last stable transcript.
- Whether the transcript is syntactically complete.
- Whether the user is in the middle of an address, phone number, plate number, policy number, or date.

End the turn when:

```text
inactivity_prob is high
AND no speech for 350-600 ms
AND transcript has not changed for 250-400 ms
AND semantic parser says the answer is complete enough
```

Do not end the turn when:

- Last token is a conjunction like "and", "but", "then".
- User is spelling a plate or policy number.
- User is in the middle of a phone number.
- User says "near", "at", "on", "around" and location is incomplete.
- User says "I think" and no concrete answer follows.

When a turn is detected, call Gradium `send_flush()` so buffered audio is processed immediately.

## Partial Transcript Handling

Maintain three transcript buffers:

```text
partialTranscript: newest text from STT
stableTranscript: text unchanged for a short stability window
finalTranscript: transcript accepted for the user turn
```

Show partial text in the UI, but send only `stableTranscript` or `finalTranscript` to the dialogue model.

For exact parsing, preserve:

- numbers
- plate spellings
- policy IDs
- addresses
- dates
- times

Do not aggressively normalize before storing the raw transcript. Store both:

```ts
{
  raw: string,
  normalized: string,
  confidence: number,
  spans: [...]
}
```

## Exact Field Extraction

Add a deterministic extraction layer after STT and before the dialogue model updates state.

Fields:

- incident type
- description
- location address
- city
- timestamp
- vehicles involved
- people count
- direction of travel
- other driver's action
- visible damage
- injuries
- policy number
- licence plate
- phone

Use validators:

- policy number pattern
- phone pattern
- plate pattern
- date/time parser
- location completeness
- damage side vocabulary

Each field should have:

```ts
{
  value: unknown,
  sourceText: string,
  confidence: number,
  needsConfirmation: boolean
}
```

If confidence is low, ask a short confirmation. Example:

```text
Was the plate B-OR-2046?
```

## Dialogue Model Behavior

Keep the existing strict one-question structure from `openai-converse.ts`, but feed it better state:

- `transcript`
- `extractedFields`
- `missingFields`
- `lowConfidenceFields`
- `stressScore`
- `acousticSentiment`
- `latencyBudgetMs`

Rules:

- Ask one thing at a time.
- Keep high-stress responses to one sentence.
- Never apologize repeatedly.
- Never explain the system.
- If the parser already has a high-confidence answer, do not ask for it again.
- If transcript confidence is poor, ask the user to repeat only the missing value.

## Sentiment Handling

Inputs:

- `stressScore` from ai-coustics.
- `acousticSentiment` from ai-coustics.
- Speech rate and interruption behavior if available.

Behavior:

```text
High stress:
  one sentence
  direct
  short words
  slower TTS

Medium stress:
  direct
  one or two sentences

Low stress:
  slightly warmer
  still concise
```

Do not wait for sentiment if STT is ready. If sentiment arrives late, apply it to the next turn.

## Audio Enhancement Strategy

Do not block live conversation on audio enhancement.

Use two lanes:

1. Live lane:
   - raw microphone audio to Gradium streaming STT.
   - optimized for latency.

2. Official transcript lane:
   - enhanced audio through ai-coustics.
   - Gradium second-pass transcription.
   - optimized for final claim record quality.

The live lane drives conversation. The official lane updates the final claim object.

## TTS Streaming

Use Gradium streaming TTS instead of waiting for a full audio file.

Guidelines:

- Start TTS as soon as the first sentence is ready.
- Use `<flush>` after short first responses.
- Split text on whitespace.
- Never split in the middle of a word.
- Keep punctuation attached to the previous word.
- Use `rewrite_rules: "en"` or `"de"` for better pronunciation of phone numbers, dates, and policy IDs.
- Use lower temperature for consistent voice.
- Use `padding_bonus` slightly negative if speech is too slow.

## Latency Budget

Track these metrics per user turn:

```text
t0: user starts speaking
t1: first STT partial
t2: VAD/semantic end of turn
t3: final transcript ready
t4: dialogue model request sent
t5: first model token or full response
t6: first TTS audio chunk
t7: playback starts
```

Targets:

```text
First partial transcript: under 500 ms
End-of-turn delay: 350-700 ms after user stops
First spoken response: under 1200 ms after user stops
Full short response: under 2200 ms after user stops
```

## Implementation Plan

1. Add a server-side Gradium streaming relay.
2. Add browser audio chunking with stable 80 ms chunks.
3. Add transcript buffer state in `ConversationStep`.
4. Add semantic VAD utility.
5. Add field extraction and validators.
6. Stream TTS back to the client.
7. Add telemetry logging for all latency timestamps.
8. Add benchmark fixtures from `benchmark-plan.md`.

## Acceptance Criteria

The upgrade is ready when:

- The agent starts displaying partial transcript before the user finishes speaking.
- The agent responds without waiting for a full uploaded blob.
- The agent does not cut users off mid-address, mid-phone-number, or mid-plate.
- Exact fields are confirmed when uncertain.
- Stress changes response length and voice tone, but does not block the next turn.
- Harsh audio tests still produce either correct fields or targeted clarification questions.

