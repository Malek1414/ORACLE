# ORACLE — Master Design & Implementation Reference

> **Purpose:** This is the single document needed to implement the full ORACLE site from scratch. It contains the complete design system (merged from two sources), every page's visual spec, all existing functionality that must be preserved, and the exact implementation plan. Paste this into a new conversation to execute.

---

## 0. What We Are Building

A single Next.js 15 site that combines two previously separate codebases:

1. **The Framer design export** (`Oracle.zip`) — a polished consumer-facing product website with landing page, elevated claim flow UI, and consumer claims dashboard. Pure UI, mock data, no backend.
2. **The existing Next.js app** — a functional AI-powered claims platform with working mobile claim flow (6 real API integrations) and a real-time ops dashboard (Supabase Realtime, Pioneer fraud scoring, confidence reveal).

The goal is one unified site where the Framer UI is the visual layer and the existing backend/functionality is the data layer.

---

## 1. Full Site Structure

```
/                  Landing page           — Framer design, static marketing content
/claim             Mobile claim filing    — Existing functionality, Framer styling applied
/my-claims         Consumer dashboard     — Framer UI, wired to real Supabase data
/dashboard         Ops dashboard          — Existing functionality, minimal styling update
```

### Navigation Between Surfaces

- Landing page CTA buttons → `/claim` ("Start a claim") and `/my-claims` ("Open dashboard")
- After claim submitted → redirect to `/my-claims`
- Nav "Dashboard" link → `/my-claims` (consumer) 
- Nav "Live Demo" link → `/claim`
- Ops dashboard at `/dashboard` is internal — no nav link from landing page
- The floating pill Nav renders on `/`, `/claim`, `/my-claims` — NOT on `/dashboard`

---

## 2. Source A — Framer Design Export (Oracle.zip)

These are the exact JSX files extracted from the zip. They define the visual target.

### `src/app.jsx` — App Root

```jsx
// Three screens: landing | claim | dashboard
// Theme: dark | light (data-theme on <body>)
// Accent hue: adjustable oklch — default hue 212 (blue)

function App() {
  const [theme, setThemeState] = useState("dark");
  const [activeScreen, setActiveScreen] = useState("landing");

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  // Accent from hue
  useEffect(() => {
    const hue = 212;
    const accent = `oklch(0.64 0.19 ${hue})`;
    const accent2 = `oklch(0.62 0.22 ${(hue + 40) % 360})`;
    const glow = `oklch(0.64 0.19 ${hue} / 0.35)`;
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent-2", accent2);
    document.documentElement.style.setProperty("--accent-glow", glow);
  }, []);

  return (
    <>
      <Nav theme={theme} setTheme={setTheme} activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
      {activeScreen === "landing" && <> <Hero /> <StatContrast /> <HowItWorks /> <Logos /> <Features /> <Testimonial /> <Pricing /> <CTAFooter /> <Footer /> </>}
      {activeScreen === "claim" && <ClaimFlow setActiveScreen={setActiveScreen} />}
      {activeScreen === "dashboard" && <Dashboard setActiveScreen={setActiveScreen} />}
    </>
  );
}
```

### `src/nav.jsx` — Floating Pill Navbar

```jsx
function Nav({ theme, setTheme, activeScreen, setActiveScreen }) {
  const [scrolled, setScrolled] = useState(false);
  // scrolled state adds shadow

  // Nav items: Product (scroll to #hero), Live Demo → /claim, Dashboard → /my-claims, How it works (scroll), Pricing (scroll)

  return (
    <nav style={{
      position: "fixed",
      top: 12,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 8px 8px 20px",
      background: "var(--glass)",
      backdropFilter: "blur(24px) saturate(1.6)",
      WebkitBackdropFilter: "blur(24px) saturate(1.6)",
      border: "1px solid var(--glass-border)",
      borderRadius: 999,
      boxShadow: scrolled ? "var(--shadow-md)" : "var(--shadow-sm)",
      transition: "box-shadow 0.3s ease, background 0.3s",
      width: "min(92vw, 860px)",
    }}>
      {/* Left: OracleMark SVG + "Oracle" wordmark */}
      {/* Center: nav links with hover background + color change */}
      {/* Right: theme toggle (sun/moon icon) + "Try it free" accent button */}
    </nav>
  );
}

// OracleMark SVG: 3 concentric circles with gradient (accent → accent-2)
// outer circle: r=14, opacity=0.35
// mid circle: r=9, opacity=0.55
// inner dot: r=4, filled
function OracleMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="orc-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)"/>
          <stop offset="1" stopColor="var(--accent-2)"/>
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" stroke="url(#orc-g)" strokeWidth="1.2" opacity="0.35"/>
      <circle cx="16" cy="16" r="9" stroke="url(#orc-g)" strokeWidth="1.2" opacity="0.55"/>
      <circle cx="16" cy="16" r="4" fill="url(#orc-g)"/>
    </svg>
  );
}
```

**Nav link styles:**
```css
/* Each nav link */
padding: 8px 14px;
borderRadius: 999;
fontSize: 13.5px;
color: var(--ink-2);
fontWeight: 450;
letterSpacing: -0.005em;
transition: color 0.2s, background 0.2s;

/* Hover */
color: var(--ink);
background: var(--line-2);
```

**Theme toggle button:**
```css
width: 36px; height: 36px; borderRadius: 999;
border: 1px solid var(--line);
background: transparent;
color: var(--ink);
/* Hover: background: var(--line-2) */
```

**"Try it free" CTA:**
- `variant="accent"`, `size="sm"`, pill shape, accent background, white text, glow shadow

**Mobile:** Nav links hidden at `max-width: 720px`

---

### `src/primitives.jsx` — Shared UI Primitives

#### `Button` component
```jsx
// Variants:
primary: { background: "var(--ink)", color: "var(--bg)", boxShadow: "0 1px 2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.12)" }
accent:  { background: "var(--accent)", color: "white", boxShadow: "0 8px 24px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.18)" }
ghost:   { background: "transparent", color: "var(--ink)", border: "1px solid var(--line)" }
glass:   { background: "var(--glass)", color: "var(--ink)", backdropFilter: "blur(20px) saturate(1.4)", border: "1px solid var(--glass-border)" }

// Sizes:
sm: { padding: "8px 14px", fontSize: 13 }
md: { padding: "12px 22px", fontSize: 14 }
lg: { padding: "16px 28px", fontSize: 15 }

// All buttons:
borderRadius: 999;  // always pill
fontWeight: 500;
letterSpacing: -0.01em;
transition: transform 0.2s, background 0.25s, box-shadow 0.3s;
```

#### `Chip` component
```css
display: inline-flex; alignItems: center; gap: 8;
padding: 6px 12px;
borderRadius: 999;
background: var(--glass);
backdropFilter: blur(14px) saturate(1.4);
border: 1px solid var(--glass-border);
fontSize: 12px;
fontFamily: var(--font-mono);
letterSpacing: 0.04em;
textTransform: uppercase;
color: var(--ink-2);
/* Optional dot: 6x6px circle with color + glow */
```

#### `GlassCard` component
```css
background: var(--bg-elev);
border: 1px solid var(--line);
borderRadius: 20px;
padding: 28px;
/* Hover: translateY(-2px), shadow increases */
transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s;
```

#### `Magnetic` wrapper
- Subtle cursor-pull effect: `strength=0.25`, `transform: translate(x,y)`, `transition: 0.4s cubic-bezier(0.16,1,0.3,1)`
- Used around hero CTA buttons and CTA footer buttons

#### `Reveal` scroll animation
- `IntersectionObserver` adds `.visible` class at `threshold: 0.12`
- CSS: `opacity: 0, translateY(20px)` → `opacity: 1, translateY(0)` on `.visible`
- `delay-1` through `delay-4` add staggered animation delays

#### `CountUp` component
- Counts from 0 to `to` value using `requestAnimationFrame`, eased cubic
- Triggered by IntersectionObserver when scrolled into view
- `duration: 1800ms` default

#### Icon set (inline SVG, all `stroke="currentColor" strokeWidth="1.6-1.8"`):
`Arrow, Mic, Check, Bolt, Shield, Sparkle, Waveform, Sun, Moon, Plus, Car, Home, Heart, Briefcase`

---

### `src/hero.jsx` — Hero Section

**Layout:**
```
Section: minHeight 100vh, paddingTop 120px
  Aurora backdrop (grid + two gradient blobs, mouse parallax)
  Chip: "Live · 2:44 avg claim" with accent dot
  H1: clamp(44px → 112px), fontWeight 500, letterSpacing -0.04em, lineHeight 0.98
    Last two words: italic serif, gradient text (accent → accent-2)
  P: clamp(16px → 20px), color var(--ink-2), max-width 560px
  Two CTA buttons (Magnetic wrapped):
    "Start a claim" — variant=accent, size=lg → /claim
    "See how it works" — variant=glass, size=lg → scroll to #how
  VoiceOrb centerpiece
  Trust line: "SOC 2 Type II · HIPAA compliant · Backed by 40+ carriers · $2.4B claims processed"
    font-mono, 12px, uppercase, letterSpacing 0.08em, color var(--ink-3)
```

**Default headline:** `"Three weeks of paperwork.\nNow two minutes flat."`

**Aurora backdrop:**
```css
/* Grid pattern */
backgroundImage: linear-gradient(var(--line) 1px, transparent 1px),
                 linear-gradient(90deg, var(--line) 1px, transparent 1px);
backgroundSize: 72px 72px;
maskImage: radial-gradient(ellipse 80% 60% at 50% 40%, black 0%, transparent 80%);
opacity: 0.5;

/* Blob 1: accent color, top-left area, 600x600, blur 80px, opacity 0.25 */
/* Blob 2: accent-2 color, bottom-right area, 500x500, blur 80px, opacity 0.18 */
/* Both blobs move with mouse: top/left offset ±10% of mouse position */
/* Transition: top 0.6s, left/right 0.6s */
```

**VoiceOrb:**
```jsx
// 3 concentric rings (when listening): pulse-ring animation, 1s delay each
// 24 animated waveform bars: height varies 0.2-1.0, fade at edges, gap in center for orb
// Central orb button: 128x128px circle
//   Idle: gradient(135deg, accent→accent-2), glow box-shadow
//   Listening: same + breathe animation + stronger glow: "0 0 60px var(--accent-glow), 0 0 120px var(--accent-glow)"
//   radial-gradient highlight: circle at 30% 25%, rgba(255,255,255,0.4)
// Caption below orb: green dot + "Listening · tap to speak" or "Tap to start"
//   font-mono, 11px, uppercase, letterSpacing 0.1em
```

---

### `src/sections.jsx` — Landing Page Sections

#### StatContrast
```
Section: padding 160px 24px 120px
  Label: "The math" — mono, 12px, uppercase, ink-3
  H2: clamp(36→72px), fontWeight 500, letterSpacing -0.035em
    "The industry average is [italic serif ink-2]twenty one days[/italic]."
    "Oracle ships in [italic serif gradient]under three minutes[/italic]."
  3-col stat grid (border+gap=1px dividers, borderRadius 24, overflow hidden):
    Col 1: "2:44" CountUp — accent color, 88px mono
    Col 2: "142K" CountUp — ink color
    Col 3: "94.2%" CountUp — ink color
    Each cell: padding 48px 36px, label(11px mono uppercase ink-3), value, suffix(13px ink-2)
```

#### HowItWorks
```
Section id="how": padding 120px 24px, background var(--bg-soft)
  Chip: "How it works"
  H2: "Three steps. No forms." clamp(32→56px)
  P: "From 'something happened' to 'money in your account' — without a single PDF."
  3-col GlassCard grid:
    Card 1: Step1Visual (mic orb + pulse rings + speech bubble chip) + "01 / You describe it"
    Card 2: Step2Visual (stacked document cards with FILED label) + "02 / Oracle files it"
    Card 3: Step3Visual ($4,280 number + Deposited badge + claim number) + "03 / You get paid"
    Each card: top section 220px bg-soft with visual, bottom padding 28px with number/title/body
    Number: font-mono, 12px, accent color
    Title: 24px, fontWeight 500
    Body: 15px, lineHeight 1.55, ink-2
```

#### Features
```
Section: padding 120px 24px
  Chip + H2: "Everything insurance should be, finally."
  3x2 grid (border 1px line, borderRadius 24, overflow hidden, 0-gap with internal borders):
    Items: Voice-native, Direct carrier APIs, SOC 2·HIPAA, AI adjuster, First-pass approval, Live tracking
    Each cell: padding 40px 32px, background var(--bg), hover → var(--bg-soft)
    Icon box: 40x40px, borderRadius 12, bg-soft, border line, color accent
    Title: 18px, fontWeight 500
    Body: 14px, lineHeight 1.55, ink-2
```

#### Logos
```
Section: padding 80px 0, borderTop/Bottom 1px line, bg var(--bg)
  Label: "Integrated with your carrier — and 39 others" — mono 11px uppercase ink-3
  Marquee: 10 carrier names, font-sans 28px fontWeight 500 ink-3 letterSpacing -0.02em
    animation: marquee 40s linear infinite (translate -50%)
    doubled array for seamless loop
```

#### Testimonial
```
Section: padding 140px 24px, textAlign center
  Blockquote: clamp(28→48px), fontFamily serif, fontStyle italic, fontWeight 400, lineHeight 1.2
    "I totaled my car on a Tuesday. Oracle had the check in my account by Thursday morning.
     My last claim, in 2022, took seventy-two days."
  Attribution:
    Avatar: 44x44px circle, gradient accent→accent-2, initials "MR" white 14px
    Name: 14px fontWeight 500
    Meta: 12px ink-3 font-mono — "Oakland, CA · Geico policyholder"
```

#### Pricing
```
Section id="pricing": padding 120px 24px, bg-soft
  Chip + H2: "Only pay when you get paid."
  3-col GlassCard grid, gap 16px:

    Personal (free):
      background: bg-elev
      Price: "$0" — no suffix
      Desc: "Pay per successful claim. No subscription."
      Features: [Voice-first claim filing, Direct carrier submission, Live adjuster tracking, 5% of recovered amount]
      CTA: "Start free" — ghost button

    Unlimited ($19/mo): [POPULAR badge — accent pill top-right]
      background: var(--ink) — INVERTED card
      color: var(--bg)
      Price: "$19" suffix "/mo"
      Desc: "For households with multiple policies."
      Features: [Everything in Personal, Unlimited claims, 0% success fee, Priority AI adjuster, Household member accounts]
      CTA: "Start trial" — accent button

    Fleet (Custom):
      background: bg-elev
      Price: "Custom" — no $ prefix
      Desc: "For businesses, agents, brokers, and carriers."
      Features: [White-label deployment, API access, SOC 2 + BAA, Dedicated success manager]
      CTA: "Talk to sales" — ghost button

  Price display: $ sign 32px opacity 0.6 + value 56px fontWeight 500 tabular-nums + suffix 16px opacity 0.6
  Feature list items: Check icon (accent) + 14px text, gap 10px
  "Popular" badge: absolute top-16 right-16, padding 4px 10px, borderRadius 999, bg accent, white, 11px mono uppercase
```

#### CTAFooter
```
Section: padding 140px 24px, textAlign center
  Radial glow blob: accent color, 900x900, blur 100px, opacity 0.12, centered absolute
  H2: clamp(40→88px), fontWeight 500, letterSpacing -0.04em
    "Something happened." (regular)
    "Let's fix it." (italic serif gradient)
  Two Magnetic-wrapped buttons:
    "Start a claim" — accent lg → /claim
    "Open dashboard" — glass lg → /my-claims
```

#### Footer
```
Section: padding 80px 24px 40px, borderTop 1px line, bg var(--bg)
  Grid: 2fr + 4x1fr, gap 40px, maxWidth 1200
  Left col:
    OracleMark + "Oracle" 18px fontWeight 600
    Tagline: 14px ink-2 lineHeight 1.55
    "Made in San Francisco" — 11px mono ink-3 uppercase
  4 link columns (Product, Company, Legal, Resources):
    Col label: 11px mono ink-3 uppercase letterSpacing 0.08em
    Links: 14px ink-2, hover → ink
  Bottom bar (borderTop):
    Left: "© 2026 Oracle Claims, Inc."
    Right: "SOC 2 Type II · HIPAA · v4.2.1"
    Both: 12px ink-3 font-mono
```

---

### `src/claim-flow.jsx` — Elevated Claim Flow UI

**This is the design target for `/claim`. The existing mobile flow functionality is preserved — this is only the visual layer.**

```
Page: minHeight 100vh, paddingTop 96px
Ambient backdrop: accent radial gradient, 800x800, blur 120px, opacity 0.08→0.18 when listening

Breadcrumb: Back / New claim / OR-8821
  Back: transparent button, ink-3, 13px
  Claim ID: font-mono, ink

Stepper (glass pill container):
  padding: 16px 20px
  background: var(--glass)
  backdropFilter: blur(20px) saturate(1.4)
  border: 1px solid var(--glass-border)
  borderRadius: 999
  Steps: [Describe, Details, Evidence, File]
  Active step: background var(--ink), color var(--bg), circle → accent bg
  Done step: circle → accent bg + check icon, color accent
  Inactive: ink-3
  Connecting lines: flex:1, height:1, background var(--line)

Headline section (centered):
  Chip with recording dot + timer
  H1: clamp(34→56px), fontWeight 500, letterSpacing -0.035em
    "Describe what [italic serif gradient]happened[/italic]."
  P: 16px ink-2 "Speak freely. We'll ask follow-ups."

Waveform strip:
  height: 120px, 40 bars
  Each bar: 3px wide, gradient(180deg, accent→accent-2), borderRadius 2
  Edge fade, height animated 0.1s ease-out
  opacity: 0.4 idle → 1.0 listening

Mic/stop button: 96x96px circle
  Idle: gradient(135deg, accent→accent-2), mic icon, glow
  Recording: gradient red→orange, stop square (22x22 white rounded), stronger red glow
  animation: breathe 2.2s ease-in-out infinite when listening

Live transcript panel (GlassCard):
  Header: green/grey dot + "Live transcript" + "N / 12 turns"
  Message bubbles:
    Oracle: left-aligned, avatar=OracleMark gradient circle, bubble bg-soft with border line
    User: right-aligned, avatar="You" bg-soft, bubble accent background white text
    borderRadius: 14px
    fontSize: 14px, lineHeight 1.5
  Enter animation: fade-up 0.5s cubic-bezier(0.16,1,0.3,1)

Extracted fields grid (appears after 4+ transcript lines):
  4-col grid, gap 12px
  Each: borderRadius 14, bg-elev, border line
    Label: 10px mono uppercase ink-3
    Value: 14px fontWeight 500 + green check icon
  fade-up animation with staggered delay

Bottom actions:
  Left: "Save & exit" ghost button
  Right: "Continue to details" accent button + Arrow icon
```

---

### `src/dashboard.jsx` — Consumer Dashboard UI

**This is the design target for `/my-claims`. Wire to Supabase — query claims by submitter email.**

```
Page: minHeight 100vh, paddingTop 96px, maxWidth 1400

Page header:
  Greeting: "Good afternoon, [name]" — 13px mono ink-3 uppercase letterSpacing 0.05em
  H1: "Your claims" — clamp(32→48px), fontWeight 500, letterSpacing -0.03em
  Actions: "Policies" ghost button + "New claim" accent button (→ /claim)

Stats row (4-col grid, gap=1px with line bg = divider effect):
  border: 1px solid var(--line)
  borderRadius: 20px
  overflow: hidden
  Each cell: bg-elev, padding 24px 28px
    Label: 11px mono uppercase ink-3
    Delta badge: 11px mono, padding 2px 8px, borderRadius 999, green bg/text
    Value: 36px fontWeight 500 tabular-nums font-mono lineHeight 1
    Sparkline SVG: absolute bottom-right, 80x20px, opacity 0.5, accent stroke
  Stats: [Active claims, Recovered YTD, Avg. resolution, Approval rate]

Main grid: gridTemplateColumns: 380px 1fr, gap 16px

  LEFT — Claims list (GlassCard, padding 0):
    Header: "Claims" label + count badge + "All ▾" filter button
    Each claim row (button):
      Selected: bg-soft, border line
      Hover: bg-soft
      borderRadius: 12px, padding 14px
      Row 1: claim ID (11px mono ink-3) + status badge (10px mono uppercase, color per status, bg = color+22)
      Row 2: title (14px fontWeight 500)
      Row 3: amount (12px mono) + date·carrier (12px ink-3)
    Status colors: filing=accent, approved=#10B981, review=#F59E0B, paid=#10B981

  RIGHT — Detail panel (flex col, gap 16px):

    Big claim card (GlassCard, padding 0):
      Top section (padding 28px 32px, borderBottom):
        Left: Chip with status dot + claim ID + H2 title (28px fontWeight 500 letterSpacing -0.025em)
        Right: "Amount" label + value in accent color (36px fontWeight 500 font-mono)
      Progress section (padding 22px 32px, borderBottom):
        Label + percentage right-aligned
        Track: height 6px, bg-soft, borderRadius 999
        Fill: gradient(90deg, accent→accent-2), width = progress%, transition 1s cubic
        Milestones: Filed / Adjuster / Approved / Paid — 11px mono uppercase, color accent if reached
      Timeline section (padding 24px 32px):
        Label: "Timeline" 12px mono uppercase ink-3
        Events: timestamp(52px mono ink-3) + dot + label+desc
          Dot: 10px circle, done=green, live=accent with outline glow, pending=line
          Connector line: 2px, position absolute left:4 top:14 bottom:-26
          Live dot: breathe animation
          Title: 14px fontWeight 500
          Desc: 13px ink-2 lineHeight 1.45

    Adjuster call transcript (GlassCard, padding 0):
      Header: Waveform icon + "Adjuster call transcript" + "1:42 · 4 min ago"
      Conversation rows:
        Speaker name: 100px wide, 11px mono, color = accent (Oracle) or ink-2 (Adjuster)
        Text: 14px ink lineHeight 1.55
      Speakers: Sarah (Geico) and Oracle
```

---

## 3. Source B — Existing Next.js Codebase

Full inventory of what exists and must be preserved.

### Existing Routes
- `src/app/page.tsx` → mobile claim filing (MOVING to `/claim`)
- `src/app/dashboard/page.tsx` → ops dashboard (STAYING at `/dashboard`)

### Key Files
```
src/types/claim.ts              — ClaimObject central data model
src/lib/claim-processor.ts      — orchestrates all 6 API integrations
src/lib/demo-data.ts            — client-side demo seed
src/lib/utils.ts                — CONFIDENCE_THRESHOLD = 72
src/lib/integrations/
  gradium.ts                    — speech-to-text
  ai-coustics.ts                — audio enhancement
  gemini.ts                     — photo analysis (Gemini 2.0 Flash)
  tavily.ts                     — weather + market data
  pioneer.ts                    — fraud scoring
  entire.ts                     — FNOL escalation (GitHub issue)
src/components/mobile/
  ClaimFilingFlow.tsx            — 5-step shell
  RecordStep.tsx                 — audio recording
  CameraStep.tsx                 — camera + photo gallery
  PolicyStep.tsx                 — policy form
  ProcessingView.tsx             — AI processing progress
  ResultView.tsx                 — result + ScoreRing
src/components/dashboard/
  LiveClaimFeed.tsx              — real-time claim list
  EscalationQueue.tsx            — escalation queue
  AnalyticsPanel.tsx             — KPIs + trend chart
  ClaimDetail.tsx                — cinematic claim inspector
supabase/migrations/001_claims_table.sql
```

### Supabase Schema (from migration)
```sql
create table claims (
  id text primary key,                    -- e.g. "OR-8821"
  created_at timestamptz default now(),
  status text,                            -- 'pending' | 'processing' | 'approved' | 'escalated'
  submitter_name text,
  submitter_email text,                   -- KEY for consumer dashboard filter
  policy_number text,
  insurance_provider text,
  incident_description text,
  transcript text,
  audio_url text,
  photo_urls text[],
  location_lat float,
  location_lng float,
  location_address text,
  damage_analysis jsonb,                  -- from Gemini
  weather_data jsonb,                     -- from Tavily
  market_pricing jsonb,                   -- from Tavily
  assessment jsonb,                       -- from Pioneer: { confidence_score, reasoning[], decision }
  fnol_url text,                          -- GitHub issue URL if escalated
  estimated_value numeric,
  confidence_score int,
  decision text                           -- 'approved' | 'escalated'
);
```

### Existing Design Tokens (in `src/app/globals.css`)
```css
:root {
  --navy:           #080e1a;
  --navy-surface:   #0d1f38;
  --navy-border:    #1e3660;
  --navy-muted:     #233d6b;
  --electric:       #2563eb;
  --electric-bright:#3b82f6;
  --electric-glow:  rgba(59, 130, 246, 0.18);
  --amber:          #f59e0b;
  --amber-glow:     rgba(245, 158, 11, 0.18);
  --green:          #10b981;
  --red:            #ef4444;
  --text-primary:   #f0f4f8;
  --text-secondary: #a8bdd4;
  --text-muted:     #6b87a8;
}
```

### Existing Keyframes (in `src/app/globals.css`)
```css
@keyframes pulse-ring   { 0%: scale(1) opacity(0.8) → 100%: scale(2.2) opacity(0) }
@keyframes live-pulse   { 0%,100%: opacity(1) → 50%: opacity(0.25) }
@keyframes field-in     { 0%: translateX(-6px) opacity(0) → 100%: translateX(0) opacity(1) }
@keyframes count-up     { 0%: translateY(6px) → 100%: translateY(0) }
@keyframes shimmer      { background-position: -200% → 200% }
```

### Existing Mobile Flow — Visual Spec (already shipped)

**Step Indicator:** 3 circles + connecting lines. Done=checkmark+electric+0.6 opacity. Active=number+electric+1.0. Inactive=navy-surface+border+text-muted. Lines: 32px × 1px, navy-border → electric.

**RecordStep:** Mic button 96px circle (idle=electric glow, recording=red glow+pulse rings, done=green glow). Timer: 20px mono electric-bright. Next button: full-width electric, borderRadius 16.

**CameraStep:** Camera active = fixed fullscreen black, video fill. Gallery = dashed upload area + 3-col photo grid. Next button same CTA style.

**PolicyStep:** 4 form fields (label: 11px mono uppercase + input: navy-surface border). Location badge: green live-pulse dot + address. Submit: electric CTA.

**ProcessingView:** 7 steps staggered (delay i*0.06). Done=green bg/border/icon. Active=electric glow bg+border+spinner. Pending=navy-surface. Transcript panel fades in.

**ResultView:** ScoreRing SVG animates stroke. Hero card: approved=green, escalated=amber. 2-col stats grid. Reasoning list with numbered badges.

### Existing Ops Dashboard — Visual Spec (already shipped)

**Grid:** `gridTemplateColumns: 300px 1fr`, `gridTemplateRows: auto 1fr`, `height: calc(100dvh - 61px)`, `gap: 16px`, `padding: 16px`.

**DashboardHeader:** 61px. Live green dot. Load Demo button.

**LiveClaimFeed:** Left col, flex 1, scrollable. Claim rows with status dots. Selected row: electric tint.

**EscalationQueue:** Left col, flexShrink 0. Amber header. 3px amber left accent bar on items.

**AnalyticsPanel:** Right top. 4-col KPI grid. Recharts AreaChart with electric gradient fill.

**ClaimDetail:** Right bottom. Cinematic 3-phase reveal: AnimatedNumber (useSpring stiffness:60 damping:20) → reasoning lines (1.6s + i*0.28s delay) → decision badge spring (stiffness:200).

---

## 4. Merged Design System

### CSS Variables — Full Set

Add ALL of these to `src/app/globals.css`. The new Framer tokens and existing tokens coexist. `data-theme="dark"` is default (existing behavior). Light mode support is a later phase.

```css
/* ── Framer design tokens ─────────────────────────────────────────── */
:root {
  /* Accent (hue-based, blue default) */
  --accent:         oklch(0.64 0.19 212);
  --accent-2:       oklch(0.62 0.22 252);
  --accent-glow:    oklch(0.64 0.19 212 / 0.35);

  /* Font families */
  --font-sans:      var(--font-geist-sans), system-ui, sans-serif;
  --font-mono:      var(--font-geist-mono), ui-monospace, monospace;
  --font-serif:     'Instrument Serif', Georgia, serif;  /* ADD THIS FONT */

  /* Shadows */
  --shadow-sm:      0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
  --shadow-md:      0 4px 16px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.3);
  --shadow-lg:      0 16px 48px rgba(0,0,0,0.5), 0 6px 16px rgba(0,0,0,0.3);
}

/* ── Dark theme (default) ─────────────────────────────────────────── */
[data-theme="dark"], :root {
  --bg:             #080e1a;       /* = --navy */
  --bg-elev:        #0d1f38;       /* = --navy-surface */
  --bg-soft:        #0a1628;
  --line:           #1e3660;       /* = --navy-border */
  --line-2:         rgba(30,54,96,0.5);
  --ink:            #f0f4f8;       /* = --text-primary */
  --ink-2:          #a8bdd4;       /* = --text-secondary */
  --ink-3:          #6b87a8;       /* = --text-muted */
  --ink-4:          #3d5a7a;
  --glass:          rgba(13,31,56,0.7);
  --glass-border:   rgba(30,54,96,0.8);
}

/* ── Light theme ──────────────────────────────────────────────────── */
[data-theme="light"] {
  --bg:             #ffffff;
  --bg-elev:        #f8fafc;
  --bg-soft:        #f1f5f9;
  --line:           #e2e8f0;
  --line-2:         rgba(226,232,240,0.5);
  --ink:            #0f172a;
  --ink-2:          #475569;
  --ink-3:          #94a3b8;
  --ink-4:          #cbd5e1;
  --glass:          rgba(255,255,255,0.7);
  --glass-border:   rgba(226,232,240,0.8);
}

/* ── Existing tokens preserved as aliases ─────────────────────────── */
:root {
  --navy:            var(--bg);
  --navy-surface:    var(--bg-elev);
  --navy-border:     var(--line);
  --navy-muted:      #233d6b;
  --electric:        var(--accent);
  --electric-bright: var(--accent-2);
  --electric-glow:   var(--accent-glow);
  --amber:           #f59e0b;
  --amber-glow:      rgba(245, 158, 11, 0.18);
  --green:           #10b981;
  --red:             #ef4444;
  --text-primary:    var(--ink);
  --text-secondary:  var(--ink-2);
  --text-muted:      var(--ink-3);
}
```

### New Keyframes to Add

```css
/* Breathing pulse for orb and live dots */
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}

/* Fade up for transcript lines and extracted fields */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Marquee for logo strip */
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

/* Scroll reveal */
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
}
.reveal.visible { opacity: 1; transform: translateY(0); }
.reveal.delay-1 { transition-delay: 0.1s; }
.reveal.delay-2 { transition-delay: 0.2s; }
.reveal.delay-3 { transition-delay: 0.3s; }
.reveal.delay-4 { transition-delay: 0.4s; }
```

### Typography — Full Set

| Font | Variable | Usage |
|------|----------|-------|
| Geist Sans | `--font-sans` | All body, UI, headings |
| Geist Mono | `--font-mono` | Labels, metadata, numbers, code |
| Instrument Serif | `--font-serif` | Italic accent words in hero headlines only |

Instrument Serif must be added to `src/app/layout.tsx` via `next/font/google`.

### Border Radius

| Value | Usage |
|-------|-------|
| `999px` (pill) | Nav, chips, buttons, badges, step indicators, all rounded-full elements |
| `20px` | GlassCard, major section containers, pricing cards |
| `16px` | Primary CTA buttons (existing mobile flow) |
| `14px` | Dashboard list items, claim rows, transcript bubbles |
| `12px` | Input fields, processing steps, small cards, KPI boxes |
| `8px` | Small tags, delta badges |

### Shadows — Full Set

```css
/* Framer design shadows */
--shadow-sm:  0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)
--shadow-md:  0 4px 16px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.3)
--shadow-lg:  0 16px 48px rgba(0,0,0,0.5), 0 6px 16px rgba(0,0,0,0.3)

/* Glow shadows (existing, kept) */
electric glow: 0 0 24px var(--accent-glow), 0 0 80px rgba(37,99,235,0.04)
mic idle:      0 0 32px var(--accent-glow)
mic recording: 0 0 32px rgba(239,68,68,0.4)
mic done:      0 0 32px rgba(16,185,129,0.4)
amber glow:    0 0 24px var(--amber-glow)
orb listening: 0 0 60px var(--accent-glow), 0 0 120px var(--accent-glow), inset 0 2px 20px rgba(255,255,255,0.25)
```

---

## 5. Implementation Plan — Page by Page

### Step 1: Foundation

1. **`src/app/globals.css`** — Add all Framer tokens, new keyframes, `.reveal` classes, scrollbar styles
2. **`src/app/layout.tsx`** — Add `Instrument Serif` via `next/font/google`, set `data-theme="dark"` on `<body>`, conditionally render `<Nav>` (not on `/dashboard`)
3. **New component: `src/components/Nav.tsx`** — Floating pill navbar from `nav.jsx`. Use `next/navigation` `usePathname` to determine active screen. Links go to Next.js routes (not screen state).

### Step 2: Move Existing Claim Flow

1. **Create `src/app/claim/page.tsx`** — Move `<ClaimFilingFlow />` here. Zero functional changes.
2. **Update `src/app/page.tsx`** — This becomes the landing page.
3. After claim is submitted (in `ClaimFilingFlow`), `router.push('/my-claims')` instead of showing ResultView inline.
   - OR: keep ResultView as last step, add "View in dashboard" link to `/my-claims`.

### Step 3: Landing Page (`/`)

Create `src/app/page.tsx` with all landing sections ported from Framer JSX:
```
Hero → StatContrast → HowItWorks → Logos → Features → Testimonial → Pricing → CTAFooter → Footer
```
- All sections are self-contained React components
- No backend calls needed — pure UI
- `"Start a claim"` → `router.push('/claim')`
- `"Open dashboard"` → `router.push('/my-claims')`

### Step 4: Consumer Dashboard (`/my-claims`)

**File:** `src/app/my-claims/page.tsx`

**Supabase query:**
```typescript
// Get email from URL param or localStorage (set during claim submission)
const email = searchParams.get('email') || localStorage.getItem('submitter_email');

const { data: claims } = await supabase
  .from('claims')
  .select('*')
  .eq('submitter_email', email)
  .order('created_at', { ascending: false });
```

**Data mapping from ClaimObject to Framer UI:**
```typescript
// Framer claim row fields → ClaimObject fields
id:          claim.id
title:       claim.incident_description (truncated to ~40 chars)
status:      claim.status
statusLabel: { pending: 'Filing now', processing: 'Processing', approved: 'Approved', escalated: 'Under review' }[claim.status]
amount:      claim.estimated_value → formatted as "$X,XXX"
date:        claim.created_at → relative or formatted date
carrier:     claim.insurance_provider
progress:    { pending:15, processing:55, approved:100, escalated:75 }[claim.status]
```

**Stats row** — compute from claims array:
- Active claims: `claims.filter(c => c.status === 'pending' || c.status === 'processing').length`
- Recovered YTD: `claims.filter(c => c.status === 'approved').reduce((sum,c) => sum + c.estimated_value, 0)`
- Avg resolution: mock or compute from created_at → decision time
- Approval rate: `(approved / total) * 100`

**Timeline** — derive from claim status + timestamps

**Adjuster transcript** — use `claim.transcript` from Supabase (already stored by claim processor)

**Realtime updates:** Subscribe to `claims` table filtered by email for live status changes

### Step 5: Restyle Existing Mobile Claim Flow

Apply Framer visual patterns to existing components **without touching any logic**:

- Replace step indicator with stepper from `claim-flow.jsx` (glass pill container)
- Update color references: `var(--electric)` → already aliased to `var(--accent)`, no-op
- Add `breathe` animation to mic button when recording (replace `animate-pulse-ring` rings or keep both)
- Update heading typography: last word/phrase of step headings gets serif italic treatment
- Add waveform bar strip above mic button (port from `claim-flow.jsx`)
- Add ambient backdrop radial glow (accent color, 800x800, blur 120px)
- Wrap CTA buttons with `Magnetic` component
- Update nav: floating pill Nav replaces top badge

### Step 6: Ops Dashboard (`/dashboard`) — Minimal

- No functional changes
- CSS variable aliases ensure existing styles still render correctly
- Optionally add the `OracleMark` logo to the existing header
- Do NOT add the floating pill Nav to this route

---

## 6. Component Architecture

### New Components to Create

```
src/components/Nav.tsx                   — Floating pill nav (from nav.jsx)
src/components/OracleMark.tsx            — SVG logo mark (from nav.jsx)
src/components/ui/Button.tsx             — Unified Button (from primitives.jsx)
src/components/ui/Chip.tsx               — Chip (from primitives.jsx)
src/components/ui/GlassCard.tsx          — GlassCard (from primitives.jsx)
src/components/ui/Magnetic.tsx           — Magnetic cursor wrapper (from primitives.jsx)
src/components/ui/Reveal.tsx             — Scroll reveal wrapper (from primitives.jsx)
src/components/ui/CountUp.tsx            — Animated counter (from primitives.jsx)
src/components/landing/Hero.tsx          — Hero section
src/components/landing/StatContrast.tsx  — Stat section
src/components/landing/HowItWorks.tsx    — How it works
src/components/landing/Features.tsx      — Feature grid
src/components/landing/Logos.tsx         — Carrier marquee
src/components/landing/Testimonial.tsx   — Quote section
src/components/landing/Pricing.tsx       — Pricing tiers
src/components/landing/CTAFooter.tsx     — Bottom CTA
src/components/landing/Footer.tsx        — Site footer
src/components/consumer/ClaimRow.tsx     — Consumer claim list item
src/components/consumer/StatsRow.tsx     — Consumer 4-col stats
src/components/consumer/ClaimTimeline.tsx — Claim timeline
src/components/consumer/TranscriptPanel.tsx — Adjuster transcript
```

### Existing Components — Untouched

```
src/components/mobile/*                  — All mobile claim steps (NO CHANGES)
src/components/dashboard/*               — All ops dashboard components (NO CHANGES)
src/lib/*                                — All integrations and utilities (NO CHANGES)
```

---

## 7. Functionality Preservation Rules

**Non-negotiable — these must survive any styling changes:**

1. Audio recording via native MediaRecorder API in `RecordStep.tsx` — touch-action, native DOM listeners, iOS Safari `.play()` workaround must stay
2. Camera via `getUserMedia` in `CameraStep.tsx` — `autoPlay playsInline muted` on video element must stay
3. All 6 API integration calls in `claim-processor.ts` — called in exact sequence
4. Supabase Realtime subscription in ops dashboard — layout changes must not unmount the subscription component
5. `CONFIDENCE_THRESHOLD = 72` in `utils.ts` — do not change
6. The 3-phase cinematic reveal in `ClaimDetail.tsx` — AnimatedNumber spring + reasoning stagger + decision badge — must stay exactly as coded
7. Demo data fallback — the "Load Demo" button in ops dashboard header must keep working without Supabase

---

## 8. What the Old Sites Looked Like

### Old Site A — Existing Next.js App (before this redesign)

**`/`** (mobile claim flow):
- Full dark navy background (`#080e1a`) everywhere
- Fixed electric dot badge + "ORACLE CLAIMS" monospace label at top of each step
- Step indicator: 3 circles with connecting lines, hidden during processing/result
- No navigation bar — just the step indicator
- 5 steps in sequence: RecordStep → CameraStep → PolicyStep → ProcessingView → ResultView
- All styling inline with CSS custom property tokens
- No serif font, no glassmorphism, no scroll animations
- Mobile-first, `minHeight: 100dvh`

**`/dashboard`** (ops dashboard):
- Same dark navy background
- Inline header bar (61px height) with live dot, Load Demo button
- 2-column CSS grid: 300px left (LiveClaimFeed + EscalationQueue) + 1fr right (AnalyticsPanel top, ClaimDetail bottom)
- Recharts AreaChart with electric gradient fill
- Cinematic confidence reveal on claim selection
- Full Supabase Realtime integration
- No navigation bar visible

### Old Site B — Framer Design Export (Oracle.zip — consumer product website)

**Screen: landing**:
- oklch-based accent color system with dark/light mode toggle
- Floating pill glass navbar fixed at top
- Hero with giant responsive headline (clamp 44px→112px), animated VoiceOrb, aurora backdrop with mouse parallax
- Marketing sections with scroll-reveal animations, CountUp stats
- Pricing tiers, testimonial, marquee logos
- CTA footer with radial glow
- No real backend — all mock/static

**Screen: claim** (Framer's elevated claim flow):
- Desktop-first layout, maxWidth 880px
- Glass pill stepper (4 steps: Describe, Details, Evidence, File)
- Animated waveform bars (40 bars)
- Live transcript chat bubbles (Oracle vs User)
- Extracted fields grid appears after 4 turns
- Ambient backdrop glow
- All mock data — scripted conversation lines

**Screen: dashboard** (Framer's consumer dashboard):
- maxWidth 1400px
- Stats row with sparklines
- 380px claims list sidebar + detail panel
- Progress bar with milestones (Filed → Adjuster → Approved → Paid)
- Timeline with animated live dot
- Adjuster call transcript panel
- All mock data — 5 hardcoded Maya claims

---

## 9. Environment & Setup

```bash
# Working directory
/Users/malekhassan/Desktop/ORACLE

# Dev server
npm run dev

# Environment variables (in .env.local)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GRADIUM_API_KEY=
AI_COUSTICS_API_KEY=
GEMINI_API_KEY=
TAVILY_API_KEY=
PIONEER_API_KEY=
GITHUB_TOKEN=          # for FNOL escalation issues

# All integrations fall back to simulation when keys not set
```

```
Tech stack: Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Framer Motion · Recharts · Zustand · Supabase (PostgreSQL + Realtime) · Lucide React
```

---

## 10. Implementation Sequence

Execute in this exact order to avoid breaking existing functionality:

```
1. globals.css       — Add Framer tokens + keyframes (aliases preserve existing components)
2. layout.tsx        — Add Instrument Serif font, data-theme body attr, conditional Nav
3. Nav.tsx           — Floating pill nav component
4. /claim route      — Move existing ClaimFilingFlow here (copy page.tsx → claim/page.tsx)
5. Landing sections  — Port all Framer components to src/components/landing/
6. / (page.tsx)      — Assemble landing page
7. /my-claims        — Consumer dashboard with Supabase data wiring
8. Restyle /claim    — Apply Framer visual patterns to existing mobile steps (NO logic changes)
9. Verify /dashboard — Confirm ops dashboard still works (should be automatic via aliases)
10. Test full flow    — Landing → claim → processing → /my-claims showing real data
```
