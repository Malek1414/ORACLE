# ORACLE — Claims Intelligence Platform

> AI-powered insurance claims processing. Voice to FNOL in under 3 minutes.

---

## Architecture

```
Mobile (policyholder)          Backend (Next.js API routes)       Dashboard (ops team)
┌─────────────────┐           ┌─────────────────────┐          ┌─────────────────┐
│  Record voice       │  POST /api/claims          │  │  Live claim feed  │
│  Capture photos     │  POST /api/claims/[id]/    │  │  Claim detail     │
│  Submit claim       │    process (SSE)           │  │  Analytics        │
└─────────────────┘           └─────────────────────┘          │  Escalation queue │
                                   │                             └─────────────────┘
                                   │ API Integrations:
                                   ├─ ai-coustics (audio enhance + stress)
                                   ├─ Gradium     (speech-to-text, streaming)
                                   ├─ Gemini      (multimodal damage analysis) │
                                   ├─ Tavily      (weather + pricing) ├─ parallel┘
                                   ├─ Pioneer     (fraud scoring + confidence)
                                   └─ Entire      (human escalation tasks)
```

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com). Run the migration:

```sql
-- Copy contents of supabase/migrations/001_claims_table.sql
-- Paste into Supabase SQL editor and run
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
# Fill in your API keys
```

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings |
| `SUPABASE_SERVICE_KEY` | Supabase project settings |
| `GRADIUM_API_KEY` | Gradium dashboard |
| `AI_COUSTICS_API_KEY` | ai-coustics dashboard |
| `GEMINI_API_KEY` | Google AI Studio |
| `TAVILY_API_KEY` | Tavily dashboard |
| `PIONEER_API_KEY` | Pioneer dashboard |
| `ENTIRE_API_KEY` | Entire dashboard |

### 3. Run

```bash
npm run dev
```

- **Mobile filing**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard

### 4. Seed demo data

For demos without live claim submission:

```bash
curl -X POST http://localhost:3000/api/demo/seed
```

Or click the **Seed Demo** button in the dashboard header. This creates two realistic claims (one approved, one escalated) that showcase the full ClaimObject and the Pioneer confidence reveal.

---

## API Integration Details

### Processing Flow

```
[Audio] → ai-coustics (enhance) → Gradium (STT, streaming)
                                        │
                              ┌────────┤ parallel
                              │         │
                          Gemini     Tavily×2
                         (damage)  (weather+price)
                              │         │
                              └────────┤
                                        │
                                    Pioneer
                                   (scoring)
                                        │
                              ┌────────┤
                              │         │
                          Approve    Entire
                           (FNOL)  (escalate)
```

### Confidence Threshold

Default: **72/100**. Adjust in `src/lib/utils.ts`.

- ≥ 72 → Auto-approved, FNOL delivered to insurer
- < 72 → Escalated to Entire with full context pre-packaged

---

## Security (Aikido)

Run Aikido scanner against the codebase:

```bash
npm install -g @aikido-security/cli
aikido scan
```

The clean report demonstrates enterprise security posture for the demo.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime (WebSocket) |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion |
| State | Zustand |
| Charts | Recharts |
