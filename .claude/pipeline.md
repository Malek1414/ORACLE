# Pipeline Test Plan

This file tells Claude how to verify the ORACLE demo pipeline before a screen recording or hackathon judging session.

## Goal

Prove that a user can complete this flow:

Voice claim intake -> damage photo upload -> personal details -> AI processing -> claim result -> FNOL wizard -> signature -> PDF preview -> email submission.

## Before Testing

1. Read `AGENTS.md`.
2. Do not print `.env.local` to the terminal during a recording.
3. Run static checks:

```bash
npm run lint
npm run build
```

Known current state:

- `npm run build` should pass.
- `npm run lint` may fail until React Compiler lint issues are fixed. Do not ignore this for CI, but it does not necessarily block a local demo.

4. Start the server:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
http://localhost:3000/dashboard
http://localhost:3000/my-claims
```

## Environment Checks

Check these without exposing values:

- Supabase URL is a Supabase API URL, not a Postgres connection string. Expected shape: `https://PROJECT_REF.supabase.co`.
- Supabase anon key exists.
- Supabase service role key exists for server-side routes.
- `RESEND_API_KEY` exists if the email submit step should work.
- `OPENAI_API_KEY` exists if `/api/claims/converse` should use the real dialogue model.
- `GRADIUM_API_KEY` exists if speech-to-text and text-to-speech should use Gradium.
- `GEMINI_API_KEY`, `TAVILY_API_KEY`, `PIONEER_API_KEY`, and `AI_COUSTICS_API_KEY` exist if the full AI pipeline should use real services.

If these are not set, the app may fall back to demo behavior in some places, but not everywhere.

## Database Checks

Supabase table:

```text
public.claims
```

Expected columns include:

- `id`
- `user`
- `incident`
- `voice`
- `photos`
- `damage_analysis`
- `environmental`
- `market_data`
- `fraud_assessment`
- `status`
- `processing_steps`
- `resolution`
- `dob`
- `address`
- `phone`
- `licence_plate`
- `vehicle_make`
- `vehicle_model`
- `vehicle_year`
- `photos_pending`
- `fnol_submitted`
- `fnol_pdf_url`
- `other_driver`
- `witnesses`
- `police_report`
- `signature_data_url`

Important security note:

- The current migration has an open `allow_all` RLS policy. That is okay only for a hack demo. For production, replace it with real ownership and service-role policies.

## Route-Level Pipeline

### Claim Creation

Route:

```text
POST /api/claims
```

Expected:

- Creates a row in `claims`.
- Requires `user.policy_number` and `user.insurer`.
- Returns `{ claim }`.

Test:

```bash
curl -s -X POST http://localhost:3000/api/claims \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "id": "demo-user",
      "name": "Lena Hoffmann",
      "email": "malek.korashi@gmail.com",
      "policy_number": "AZ-DE-482913",
      "insurer": "Allianz"
    },
    "incident": {
      "description": "Low speed rear-end collision near Strausberger Platz.",
      "location": {
        "lat": 52.5186,
        "lng": 13.4312,
        "address": "Karl-Marx-Allee and Strausberger Platz, Berlin",
        "city": "Berlin",
        "country": "DE"
      },
      "timestamp": "2026-04-26T10:30:00.000Z",
      "vehicles_involved": ["claimant vehicle", "silver Volkswagen Golf"],
      "incident_type": "vehicle_collision"
    }
  }'
```

Save the returned claim id.

### Conversation

Route:

```text
POST /api/claims/converse
```

Expected:

- Accepts audio and conversation history.
- Calls Gradium STT and ai-coustics in parallel.
- Falls back to `clientTranscript` if Gradium STT fails.
- Calls OpenAI dialogue model.
- Calls Gradium TTS if available.

Known improvement:

- This route currently waits for an uploaded audio blob. It should be upgraded to streaming STT and semantic VAD for the Inca track benchmark.

### Claim Processing

Route:

```text
POST /api/claims/:id/process
```

Expected:

- Receives audio and photos.
- Updates photo count.
- Runs `processClaim`.
- Streams processing events.

Pipeline order:

1. ai-coustics audio enhancement and stress.
2. Gradium transcription.
3. Gemini damage analysis.
4. Tavily weather and market pricing.
5. Pioneer confidence/fraud scoring.
6. Approval or GitHub Issues escalation.
7. Supabase row updates.

Important demo caveat:

- The client currently fires this route without awaiting or reading the stream. If the route fails, the UI may still show simulated progress. Fix this before a serious benchmark.

### Dashboard

Route:

```text
GET /dashboard
```

Expected:

- Loads recent claims from `/api/claims`.
- Subscribes to Supabase realtime updates.
- Displays claim status and confidence.

### FNOL PDF Preview

Route:

```text
POST /api/fnol/generate-pdf
```

Expected:

- Fetches claim.
- Generates PDF bytes.
- Displays preview iframe in the FNOL wizard.

### FNOL Email Submit

Route:

```text
POST /api/fnol/submit
```

Expected:

- Fetches claim.
- Saves signature.
- Generates PDF.
- Uploads PDF to Supabase Storage bucket `fnol-pdfs` if available.
- Sends email through Resend.
- Marks `fnol_submitted` true.

Known improvement:

- This route imports the public Supabase proxy. It should use the server client for reliability once RLS is locked down.

## Pass Criteria

The demo pipeline passes when:

- A new claim appears in Supabase.
- The dashboard receives realtime or refreshed claim status.
- The transcript is stored under `voice.transcript`.
- Photo count is stored under `photos.count`.
- Gemini returns `damage_analysis` or a graceful fallback is shown.
- Pioneer returns `fraud_assessment.confidence_score`.
- Final status becomes `approved`, `escalated`, or `rejected`.
- FNOL wizard persists other driver, witnesses, police report, and signature.
- PDF preview opens.
- Submit sends email or returns a clear error explaining missing Resend/storage config.

## Failure Triage

If claim creation fails:

- Check Supabase URL format.
- Check service role key.
- Check table migrations.

If conversation feels slow:

- See `streaming-stt-semantic-vad.md`.

If processing appears complete but database is unchanged:

- Check direct client Supabase calls and RLS policy.
- Check that the client is not only showing simulated progress.

If PDF preview fails:

- Check `public/Allianz.pdf`.
- Check `src/lib/pdf/generate-fnol-pdf.ts`.

If email fails:

- Check `RESEND_API_KEY`.
- Check sender domain restrictions.
- Check hardcoded recipient in `src/app/api/fnol/submit/route.ts`.

