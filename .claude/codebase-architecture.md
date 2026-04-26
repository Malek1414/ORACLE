# ORACLE Codebase Architecture

This file explains what each technology does in the current ORACLE codebase.

## App Summary

ORACLE is a Next.js insurance claims demo. A policyholder talks to a voice agent, uploads damage photos, submits personal details, and receives a claim result. The app then guides them through an FNOL form, generates a PDF, and submits it by email.

## Framework

### Next.js 16.2.4

Role:

- App router pages.
- API routes.
- Server-side integration calls.
- Static and dynamic route rendering.

Important files:

```text
src/app/page.tsx
src/app/claim/page.tsx
src/app/dashboard/page.tsx
src/app/my-claims/page.tsx
src/app/fnol/[claimId]/page.tsx
src/app/api/**/route.ts
```

Important rule:

- Read `node_modules/next/dist/docs/` before changing Next.js behavior. `AGENTS.md` says this Next version may not match older assumptions.

## State And UI

### React 19

Role:

- Client components.
- Mobile claim flow.
- Dashboard.
- FNOL wizard.

### Zustand

Role:

- Shared client state for active claim, dashboard claim list, selected claim, live transcript, and saved user.

File:

```text
src/store/claim-store.ts
```

### Framer Motion

Role:

- Screen transitions.
- Processing steps.
- Dashboard animations.

### Tailwind CSS 4 And CSS Variables

Role:

- Styling utility classes.
- Theme variables in `globals.css`.

## Main User Flow

### Mobile Claim Filing

Files:

```text
src/components/mobile/ClaimFilingFlow.tsx
src/components/mobile/ConversationStep.tsx
src/components/mobile/CameraStep.tsx
src/components/mobile/PersonalInfoStep.tsx
src/components/mobile/ProcessingView.tsx
src/components/mobile/RoadsideResultScreen.tsx
```

Flow:

```text
record/conversation
  -> camera
  -> personal info
  -> processing
  -> roadside result
  -> FNOL wizard
```

### FNOL Wizard

Files:

```text
src/app/fnol/[claimId]/page.tsx
src/components/fnol/OtherDriverBlock.tsx
src/components/fnol/WitnessesBlock.tsx
src/components/fnol/PoliceReportBlock.tsx
src/components/fnol/FNOLSummary.tsx
src/components/fnol/SignaturePad.tsx
```

Flow:

```text
other driver
  -> witnesses
  -> police report
  -> summary
  -> signature
  -> PDF preview
  -> submit
```

## Database And Realtime

### Supabase

Role:

- PostgreSQL claims table.
- Realtime dashboard updates.
- Storage for FNOL PDFs.

Files:

```text
src/lib/supabase.ts
supabase/migrations/001_claims_table.sql
supabase/migrations/002_fnol_fields.sql
supabase/schema.sql
```

Current clients:

- `supabase`: public anon client proxy.
- `createServerClient()`: server-side client that can use `SUPABASE_SERVICE_KEY`.

Risk:

- Current RLS policy is open for demo use.
- Some server routes import the public proxy instead of the server client.
- Direct client writes can fail if RLS is later tightened.

## Voice And Conversation

### Gradium

Role:

- Speech-to-text.
- Text-to-speech.
- Should become the streaming voice layer for the Inca track.

File:

```text
src/lib/integrations/gradium.ts
```

Current state:

- Uses blob-based transcription.
- Has simulated transcript fallback.
- TTS returns base64 audio or falls back to browser speech.

Needed upgrade:

- Streaming STT.
- Semantic VAD.
- Streaming TTS.
- Latency instrumentation.

### ai-coustics

Role:

- Audio enhancement.
- Stress score.
- Acoustic sentiment.
- Audio quality score.

File:

```text
src/lib/integrations/ai-coustics.ts
```

Best use:

- Run in parallel with STT for stress metadata.
- Use enhanced audio for final transcript quality.
- Do not block live conversation on enhancement.

### OpenAI Dialogue Model

Role:

- Decides the next question in claim intake.
- Returns structured JSON with response, done flag, and extracted incident.

File:

```text
src/lib/integrations/openai-converse.ts
```

Current model:

```text
gpt-4o-mini
```

Needed improvement:

- Feed it validated fields and missing-field state.
- Add deterministic extraction before the model.

### Gemini Converse

Role:

- Older or alternate conversation agent implementation.

File:

```text
src/lib/integrations/gemini-converse.ts
```

Current app route uses OpenAI converse instead.

## Claim Processing AI

### Claim Processor

Role:

- Orchestrates the post-submission claim pipeline.

File:

```text
src/lib/claim-processor.ts
```

Pipeline:

```text
ai-coustics
  -> Gradium STT
  -> Gemini damage analysis
  -> Tavily environmental data
  -> Tavily market pricing
  -> Pioneer fraud/confidence score
  -> approval or escalation
```

### Gemini Damage Analysis

Role:

- Reads transcript and vehicle photos.
- Returns damage location, severity, cost range, consistency, affected parts.

File:

```text
src/lib/integrations/gemini.ts
```

### Tavily

Role:

- Weather and road context.
- Repair market pricing context.

File:

```text
src/lib/integrations/tavily.ts
```

### Pioneer

Role:

- Confidence and fraud scoring.
- Produces score, risk, reasoning, flags.

File:

```text
src/lib/integrations/pioneer.ts
```

### GitHub Issues Escalation

Role:

- Creates a human-review issue when confidence is below threshold.

File:

```text
src/lib/integrations/github-issues.ts
```

Note:

- README still references Entire in places, but current code uses GitHub Issues for escalation.

## PDF And Email

### pdf-lib

Role:

- Builds the FNOL PDF.
- Embeds template page.
- Draws text and signature.

File:

```text
src/lib/pdf/generate-fnol-pdf.ts
```

Needed improvement:

- Fill template fields if available.
- Add damage sketch and impact arrow.
- Improve coordinate tests.

### Resend

Role:

- Sends FNOL email with PDF attachment.

Files:

```text
src/lib/integrations/resend.ts
src/app/api/fnol/submit/route.ts
```

## Dashboard

Files:

```text
src/app/dashboard/page.tsx
src/components/dashboard/LiveClaimFeed.tsx
src/components/dashboard/ClaimDetail.tsx
src/components/dashboard/AnalyticsPanel.tsx
src/components/dashboard/EscalationQueue.tsx
src/components/dashboard/SeedButton.tsx
```

Role:

- Shows live claim intake and processing status.
- Shows Pioneer confidence reasoning.
- Shows escalation queue.
- Provides seed demo button.

## Demo Data

Files:

```text
src/lib/demo-data.ts
src/lib/demo-seed.ts
src/app/api/demo/seed/route.ts
```

Route:

```text
POST /api/demo/seed
```

Role:

- Creates realistic approved and escalated demo claims.

## High Priority Improvements

1. Replace committed example secrets with placeholders and rotate exposed keys.
2. Fix Supabase URL docs and `.env.local.example` format.
3. Fix lint errors so CI is clean.
4. Move all sensitive writes to server routes.
5. Replace open RLS before production.
6. Upgrade voice loop to streaming STT and semantic VAD.
7. Add exact field extraction and validators.
8. Add PDF impact sketch and arrow.
9. Add benchmark harness.

