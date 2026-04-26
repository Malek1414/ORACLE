# Inca Track Benchmark Plan

This file defines how to benchmark ORACLE's AI agent for exact transcription, exact parsing, harsh audio robustness, and low latency.

## Primary Goals

1. Exact parsing and transcription in harsh conditions.
2. Low enough latency for smooth conversation flow.
3. Sentiment-aware tone without slowing the agent down.

Sentiment is useful, but the first two goals matter most.

## What To Measure

### Transcription

Metrics:

- Word error rate (WER)
- Character error rate (CER)
- Numeric token accuracy
- Policy number accuracy
- Licence plate accuracy
- Address accuracy
- Timestamp accuracy

Special tokens to test:

```text
AZ-DE-482913
B-OR-2046
+49 151 2345 6789
Karl-Marx-Allee
Strausberger Platz
14/03/1992
POL-BE-2026-0418
```

### Parsing

Metrics:

- Field extraction F1
- Exact field match rate
- Confirmation rate
- Wrong-field rate
- Missing-field rate

Fields:

- incident type
- location
- timestamp
- vehicles involved
- people count
- direction
- other driver action
- damage location
- injuries
- policy number
- licence plate
- phone number

### Latency

Metrics:

- time to first partial transcript
- time to final transcript
- VAD end-of-turn delay
- time to first model response token
- time to first TTS audio
- time to playback start
- full turn duration

Recommended p95 targets:

```text
first partial transcript: under 500 ms
end-of-turn delay: under 700 ms
first spoken response after user stops: under 1200 ms
full short response: under 2200 ms
```

### Sentiment

Metrics:

- stress score captured
- response length adapts to stress
- TTS speed adapts to stress
- no repeated empathy phrases
- no excessive explanation

Sentiment should not block STT, parsing, or response generation.

## Test Conditions

Create or collect audio clips in these conditions:

1. Clean room, close mic.
2. Laptop mic with fan noise.
3. Crowded room noise.
4. Street noise.
5. Wind noise.
6. Echo/reverberant room.
7. Bluetooth headset compression.
8. Speaker has a German accent while speaking English.
9. Speaker code-switches English/German street names.
10. Speaker is stressed and speaks quickly.

Each condition should include the same semantic claim facts so extraction can be compared.

## Canonical Test Script

Use this as the ground truth:

```text
I was driving westbound on Karl-Marx-Allee near Strausberger Platz in Berlin when a silver Volkswagen Golf in front of me braked suddenly. I hit the back of their car at low speed. Two vehicles were involved. I was alone and the other driver was alone. Nobody is injured. My front-left bumper is cracked, the hood has a crease, and the grille is loose. My policy number is AZ-DE-482913 and my plate is B-OR-2046.
```

Ground truth fields:

```json
{
  "incident_type": "vehicle_collision",
  "location": "Karl-Marx-Allee near Strausberger Platz, Berlin",
  "direction": "westbound",
  "other_driver_action": "braked suddenly",
  "vehicles_involved_count": 2,
  "people_count": 2,
  "injuries": "none",
  "damage_location": "front-left bumper, hood, grille",
  "policy_number": "AZ-DE-482913",
  "licence_plate": "B-OR-2046"
}
```

## Ambiguous Test Script

Use this to verify clarification behavior:

```text
I think it was near Strausberger Platz, maybe on Karl-Marx-Allee. The other car stopped suddenly. My plate is B OR two zero four six, and the policy is AZ dash DE dash four eight two nine one three.
```

Expected behavior:

- Agent should normalize `B OR two zero four six` to `B-OR-2046`.
- Agent should normalize policy to `AZ-DE-482913`.
- Agent should ask for confirmation if confidence is low.
- Agent should ask one clarifying location question.

## Low Confidence Test Script

Use this to verify fraud/confidence handling:

```text
I hit the car from behind, but the damage is mostly on the passenger side door. I am not sure when the photos were taken. It might have been yesterday or today.
```

Expected behavior:

- The agent should still complete intake.
- Gemini/Pioneer may flag inconsistency.
- Low confidence or escalation is acceptable.
- UI should explain the result without making it look like a crash.

## Benchmark Harness

Build a local script that can run:

```bash
npm run benchmark:voice
```

Suggested fixture structure:

```text
benchmarks/
  audio/
    clean.wav
    crowd.wav
    street.wav
    wind.wav
  expected/
    clean.json
    crowd.json
    street.json
    wind.json
  results/
```

Each result should include:

```json
{
  "fixture": "crowd.wav",
  "wer": 0.0,
  "cer": 0.0,
  "fieldAccuracy": 1.0,
  "firstPartialMs": 0,
  "endOfTurnMs": 0,
  "firstAudioMs": 0,
  "notes": []
}
```

## Implementation Notes

- Add timestamps around Gradium streaming events.
- Log VAD inactivity probability per 80 ms step.
- Log parser confidence per field.
- Log whether each agent question was necessary.
- Store raw and normalized transcript separately.
- Do not let benchmark fixtures call live services unnecessarily if deterministic regression testing is needed.

## Pass Criteria

Minimum hackathon target:

```text
Clean WER: under 5 percent
Harsh WER: under 15 percent
Critical token exactness: over 95 percent
Field extraction F1: over 90 percent
p95 first response audio: under 1.5 seconds after user stops
No more than one unnecessary clarification per claim
```

Stretch target:

```text
Harsh WER: under 10 percent
Critical token exactness: 98 percent or better
Field extraction F1: 95 percent or better
p95 first response audio: under 1.2 seconds after user stops
```

## Judge Demo Guidance

If a benchmark produces low confidence, do not hide it. Say:

```text
This is the confidence layer doing its job. The agent still completed intake, but the downstream model found inconsistency and routed the claim for review.
```

That is better than forcing every claim into an approval path.

