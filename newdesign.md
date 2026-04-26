# Oracle — Design Reference

A complete, exact reference for the Oracle voice-first insurance claim app: design system, component specs, screen layouts, behaviors, and copy. Build this 1:1 — not "similar to," but exact.

---

## 1. Brand & Concept

- **Product**: Oracle — a voice-first AI insurance agent that turns a 3-week claim process into ~2:44 minutes.
- **Voice**: Calm, editorial, restrained, premium. No emojis. No bro-marketing. Sentences end with periods. Numbers use the colon format (`2:44`), not "2 min 44 sec".
- **Visual style**: "Luminart minimalist" — warm cream background + a single deep ink-black accent card per section. Inspired by editorial fashion sites + Apple's product pages. Quiet, confident, asymmetric typography.

---

## 2. Tokens

### 2.1 Color — Light theme (default)
```
--bg:        #F7F6F3   /* warm cream page background */
--bg-elev:   #FFFFFF   /* card surfaces */
--bg-soft:   #F2F1EF   /* hover / quiet fill */
--ink:       #1A1A1A   /* primary text */
--ink-2:     #4A4A4A   /* secondary text */
--ink-3:     #7A7A7A   /* tertiary / labels */
--ink-4:     #BDB9B5   /* divider-ish text / disabled */
--line:      #E8E6E1   /* hairline borders */
--line-2:    rgba(26,26,26,0.04)
--glass:     rgba(247,246,243,0.82)
--glass-border: #E8E6E1

/* The signature dark "accent card" */
--dark-card:   #423E3B   /* warm near-black, slight brown tint */
--dark-card-2: #36322F   /* hover/darker variant */
--dark-ink:    #FFFFFF   /* text on dark card */
--dark-ink-2:  #BDB9B5   /* secondary text on dark card */

--shadow-sm: 0 1px 2px rgba(0,0,0,0.03)
--shadow-md: 0 8px 24px rgba(0,0,0,0.04)
--shadow-lg: 0 20px 50px rgba(0,0,0,0.06)
--noise-opacity: 0.018
```

### 2.2 Color — Dark theme
```
--bg:        #1B1916   /* warm near-black page */
--bg-elev:   #232120
--bg-soft:   #2A2826
--ink:       #F5F3EE
--ink-2:     #BDB9B5
--ink-3:     #8A8784
--ink-4:     #4A4845
--line:      rgba(255,255,255,0.08)
--line-2:    rgba(255,255,255,0.04)
--glass:     rgba(35,33,32,0.7)
--glass-border: rgba(255,255,255,0.08)

--dark-card:   #0F0E0D   /* even-darker accent card on dark mode */
--dark-card-2: #050505
--dark-ink:    #FFFFFF
--dark-ink-2:  #BDB9B5

--shadow-sm: 0 1px 2px rgba(0,0,0,0.4)
--shadow-md: 0 8px 30px rgba(0,0,0,0.4)
--shadow-lg: 0 20px 50px rgba(0,0,0,0.5)
--noise-opacity: 0.03
```

### 2.3 Status / data colors (theme-agnostic)
```
filing   #7A6CDD   (purple)
approved #2A7E4A   (green)
review   #B8842B   (amber)
paid     #2A7E4A   (green)
live-dot #7DB892   (soft green w/ 6px glow)
```

### 2.4 Typography
- **Sans**: `Geist` weights `300, 400, 500, 600, 700, 800, 900`
- **Mono**: `Geist Mono` weights `400, 500, 600` — used for timer (`● 0:12`)
- **Serif**: `Instrument Serif` (italic available) — reserved accent (currently unused, available for emphasis)
- Body letter-spacing: `-0.01em`
- Display headlines: `font-weight: 300`, `letter-spacing: -0.025em`, `line-height: 1.04–1.1`
- Section titles (`h2`): `font-size: 18px`, `font-weight: 400`
- Eyebrow labels: `font-size: 11px`, `letter-spacing: 0.06em`, `text-transform: uppercase`, `color: --ink-3`
- Numbers (stat values): `font-weight: 300`, `letter-spacing: -0.02em`, sizes `28px`, `40–64px`
- Body: `font-size: 13–15px`, `line-height: 1.5`, `color: --ink-2`

Google Fonts URL:
```
https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap
```

### 2.5 Radii, spacing, motion
- Border-radius: **16px** (small cards / pills containers), **20px** (feature card), **24px** (large content cards & dark hero card), **999px** (pills, buttons, dots)
- Section padding: `80px 32px` vertical/horizontal on desktop; container max-width `1400px` (claim flow narrows to `980px`)
- Card padding: `24–28px` (small), `32–48px` (medium), `clamp(40px, 5vw, 72px)` (hero dark card)
- Card grid gap: `16px`
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` for everything
- Reveal duration: `0.9s`; stagger via `delay-1 (0.08s) → delay-4 (0.32s)`
- Hover transitions: `0.2–0.4s`

### 2.6 Global treatments
- **Grain overlay**: a fixed-position SVG fractal-noise layer covers the whole viewport at `opacity: var(--noise-opacity)`, `mix-blend-mode: overlay`, `z-index: 1000`, `pointer-events: none`. Snippet:
```css
body::before {
  content: "";
  position: fixed; inset: 0;
  pointer-events: none;
  z-index: 1000;
  opacity: var(--noise-opacity);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>");
  mix-blend-mode: overlay;
}
```
- **Selection**: `background: var(--accent); color: white;`
- **Scrollbar**: `10px` wide, thumb `var(--ink-4)` w/ `2px` border matching `--bg`
- **Smooth scroll**: enabled on `<html>`
- **Reduced motion**: disable all animations/transitions to `0.01ms`

### 2.7 Theme application
- Set theme via `document.body.setAttribute("data-theme", "light"|"dark")`
- All tokens come from the matching `[data-theme="…"]` block.

---

## 3. Logo / Mark

`OracleMark`: a circle outline with a centered solid dot — like an iris/aperture.
```jsx
<span style={{
  width: size, height: size,
  border: "1.5px solid currentColor",
  borderRadius: "50%",
  display: "inline-block",
  position: "relative",
}}>
  <span style={{
    position: "absolute",
    inset: size > 18 ? 4 : 3,
    background: "currentColor",
    borderRadius: "50%",
  }} />
</span>
```
Wordmark: `ORACLE` in `Geist 500`, `letter-spacing: 0.1em`, `text-transform: uppercase`, `font-size: 14px`, `gap: 10px` between mark and word.

---

## 4. Iconography (custom inline SVG, 24×24 stroke icons, `stroke-width: 1.5`)

| Name | Path |
|---|---|
| Arrow | `M5 12h14M13 5l7 7-7 7` |
| ArrowUpRight | `M7 17 17 7M9 7h8v8` |
| Mic | `<rect x=9 y=3 w=6 h=12 rx=3/> M5 11a7 7 0 0 0 14 0M12 18v3` |
| Check | `M20 6 9 17l-5-5` (stroke 1.8) |
| Bolt | `m13 2-9 12h7l-1 8 9-12h-7l1-8Z` (stroke 1.4) |
| Shield | `M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z` (1.4) |
| Sparkle | 8-pointed asterisk (1.4) |
| Waveform | `M4 12h0M8 8v8M12 5v14M16 9v6M20 12h0` (1.4) |
| Sun | circle r=4 + 8 spokes |
| Moon | `M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z` |
| Plus | `M12 5v14M5 12h14` (1.6) |
| Briefcase | `<rect x=3 y=7 w=18 h=13 rx=2/> M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18` |

All use `fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round`.

---

## 5. Primitives (component contracts)

### 5.1 `Button({ variant, size, href, onClick, icon, children })`
- Pill (`border-radius: 999`), `font-family: var(--font-sans)`, `font-weight: 400`.
- Sizes: `sm: 6px 14px / 12px`, `md: 9px 18px / 13px`, `lg: 12px 22px / 14px`.
- Variants:
  - `dark` — bg `--dark-card`, text `--dark-ink`, hover bg `--dark-card-2`
  - `outline` — transparent, text `--ink`, border `--line`, hover border `--ink`
  - `outline-inv` — transparent, text `--dark-ink`, border `rgba(255,255,255,0.25)`, hover `0.55`
  - `soft` — bg `--bg-soft`, text `--ink`, hover bg `#E5E4E2`
- Renders `<a>` if `href` given, else `<button>`.

### 5.2 `Chip({ children, dot, icon })`
- `padding: 5px 12px`, `border-radius: 999`, `bg: --bg-elev`, `border: 1px solid --line`
- `font-size: 11px`, `letter-spacing: 0.04em`, `text-transform: uppercase`, `color: --ink-2`
- If `dot` color provided: 6×6 round with `box-shadow: 0 0 6px <color>`.

### 5.3 `GlassCard`
- `bg: --bg-elev`, `border: 1px solid --line`, `border-radius: 24`, `padding: 28`
- Hover: lifts `translateY(-2px)`, shadow upgrades `--shadow-sm → --shadow-md`, transition `0.4s` w/ project easing.

### 5.4 `Reveal({ delay = 0..4, children })`
- Wraps content with `.reveal` (start `opacity: 0; translateY(24px)`) and uses an IntersectionObserver (`threshold: 0.12`) to add `.visible` (`opacity: 1; translateY(0)`).
- Stagger via `delay-1`–`delay-4` modifiers (`0.08s` increments).

### 5.5 `Magnetic({ strength = 0.18, children })`
- Tracks `mousemove`, translates child by `(cursor - center) * strength`.
- Returns to `0,0` on `mouseleave`. Transition `0.4s` w/ project easing.

### 5.6 `CountUp({ to, duration = 1800, format })`
- Cubic-out ease (`1 - (1-p)^3`), starts when `IntersectionObserver` (`threshold: 0.3`) fires, fires once.
- `format(v)` lets you stringify (e.g. `(v) => "$" + Math.floor(v).toLocaleString()`).

---

## 6. Animations / Keyframes

```css
@keyframes pulse-ring { 0% { transform: scale(0.85); opacity: 0.6; } 100% { transform: scale(1.6); opacity: 0; } }
@keyframes breathe   { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
@keyframes float-y   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes shimmer   { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes marquee   { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
@keyframes wave      { 0%,100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
@keyframes spin-slow { to { transform: rotate(360deg); } }
@keyframes fade-up   { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
```

Active mic uses `breathe 2s ease-in-out infinite`. Carrier marquee uses `marquee 40s linear infinite` on a `width: max-content` row of doubled logos. Live transcript bubbles use `fade-up 0.5s` with project easing on enter.

---

## 7. App architecture

Single-page app with three "screens" controlled by React state. No routing.

```
App
├── Nav (sticky)
├── activeScreen === "landing"
│   ├── Hero
│   ├── StatContrast
│   ├── HowItWorks
│   ├── Logos (carrier marquee)
│   ├── Features
│   ├── Testimonial
│   ├── CTAFooter
│   └── Footer
├── activeScreen === "claim"
│   └── ClaimFlow
├── activeScreen === "dashboard"
│   └── Dashboard
└── TweaksPanel (optional)
```

State:
- `theme: "light" | "dark"` (default `"light"`, persisted via tweaks if present)
- `activeScreen: "landing" | "claim" | "dashboard"` (default `"landing"`)
- `headline: string` (default `"Three weeks of paperwork.\nNow two minutes flat."`)

---

## 8. Screen specs

### 8.1 Nav (sticky, `z-index: 100`)
- Container: `padding: 16px 32px`, `bg: --bg`, no border. Flex row, items center, space-between.
- Left: `<OracleMark size={16}/>` + `ORACLE` wordmark (uppercase, `letter-spacing: 0.1em`, `font-size: 14`, `font-weight: 500`).
- Center nav links (hidden under 820px): `Overview`, `File Claim`, `Dashboard`, `How it works`. Each: `font-size: 11px`, `font-weight: 500`, `text-transform: uppercase`, `letter-spacing: 0.05em`, `color: --ink-3`, hover `--ink`. Gap `32px`.
- Right group (`gap: 12px`):
  - Theme toggle: 32×32 circle, `border: 1px solid --line`, transparent bg, swaps `Sun`/`Moon` icon based on current theme (shows the *destination* — Sun in dark mode, Moon in light).
  - `Button variant="outline" size="sm"`: **"File a Claim"** → sets `activeScreen = "claim"`.

### 8.2 Hero (landing)
Container: `max-width: 1400px`, `padding: 32px 32px 48px`, `id="hero"`.

**Top tagline row** (Reveal):
- Left eyebrow: `Voice-first insurance · Live in 50 states` (11px uppercase, `--ink-3`).
- Right Chip with green dot (`#2A7E4A`, transparent bg): `Avg claim · 2:44`.

**Big dark card** (Reveal delay-1):
- `bg: --dark-card`, `border-radius: 24`, `padding: clamp(40px, 5vw, 72px)`, `min-height: 520`, flex column, `justify-content: space-between`.
- Subtle 135° gradient overlay: `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 50%)`, `pointer-events: none`.
- **Top label row inside card**:
  - Left: `<span 6×6 round bg #7DB892 box-shadow 0 0 6px #7DB892>` + `Listening · 2:44 average claim` (uppercase 11px, `--dark-ink-2`).
  - Right: `Oracle 4.2`.
- **Headline block** (`padding: 60px 0`):
  - `<h1>` `clamp(36px, 5.4vw, 76px)`, `line-height: 1.04`, `font-weight: 300`, `letter-spacing: -0.025em`, `text-wrap: balance`, `max-width: 16ch`. Each newline split into `<span style="display:block">`.
  - Default headline (2 lines): `Three weeks of paperwork.` / `Now two minutes flat.`
  - Subhead `<p>`: `clamp(15px, 1.2vw, 17px)`, `--dark-ink-2`, `max-width: 480px`, `margin-top: 24px`, `font-weight: 300`. Copy: *"A voice-first insurance agent. Describe what happened — Oracle handles the paperwork, the adjusters, the follow-ups. You get paid."*
- **Bottom row** (flex, `justify-content: space-between`, wrap):
  - Left: two `Magnetic strength={0.12}` buttons.
    - Primary pill: bg `--bg`, color `--ink`, no border, `padding: 12px 22px`, `font-size: 14`, label `Start a claim` + Arrow icon → `setActiveScreen("claim")` + scroll top.
    - Secondary pill: transparent, color `--dark-ink`, `border: 1px solid rgba(255,255,255,0.25)`, label `See how it works`, scrolls to `#how`.
  - Right: 28-bar mini waveform, `height: 48`, `gap: 3`, bars `width: 2px`, color `rgba(255,255,255,0.7)`, randomized every 120ms with edge-fade `Math.min(1, (n - i)/4) * Math.min(1, i/4)`. Bar height = `4 + v * 38 * edgeFade`.

**Sub-row 3 quiet stats** (Reveal delay-2, `grid-template-columns: repeat(3, 1fr)`, gap 16, collapses to 1 col under 760px):
Each card: `bg: --bg-elev`, `border: 1px solid --line`, `border-radius: 16`, `padding: 20px 24px`, flex space-between bottom-aligned.
- Label (eyebrow) | Value (28px, weight 300) | Unit (12px `--ink-3`)
1. `Avg. resolution` / `2:44` / `minutes`
2. `Approval rate` / `94.2%` / `first-pass`
3. `Claims this month` / `142K` / `and counting`

### 8.3 StatContrast
- Section `padding: 80px 32px`, container `max-width: 1400`.
- Header row: bottom-border `1px solid --line`, paddingBottom 12, marginBottom 32.
  - Left `<h2>The math</h2>` (18px / 400)
  - Right eyebrow `Industry vs. Oracle` (11px uppercase `--ink-3`)
- Lede paragraph: `clamp(24px, 2.6vw, 36px)`, `font-weight: 300`, `line-height: 1.25`, `--ink-2`, `max-width: 26ch`. Text: *"The industry average is twenty-one days. Oracle ships in under three minutes."* (last sentence in `--ink`).
- 3-up grid (collapses to 1 under 760px). Each card: `bg: --bg-elev`, `border: 1px solid --line`, `border-radius: 24`, `padding: 32px 28px`, `min-height: 180`, flex column space-between.
  - Label (top) | Value (56px, weight 300) | Unit (13px `--ink-3`).
  1. `Avg. resolution time` / `2:44` / `minutes`
  2. `Claims resolved` / `<CountUp to=142.4 decimals=1 suffix="K">` / `this month`
  3. `Approval rate` / `<CountUp to=94.2 decimals=1 suffix="%">` / `first-pass`

### 8.4 HowItWorks (`id="how"`)
Same section header treatment. Right eyebrow: `Three steps · No forms`.
3-up grid (collapses under 900px). Each card: `bg: --bg-elev`, `border-radius: 24`, `padding: 28`, `min-height: 220`, flex column space-between.
- Top: step number `01` / `02` / `03` (11px `--ink-3` uppercase).
- Bottom: `<h3>` (22px / 400, `letter-spacing: -0.015em`) + 14px `--ink-2` description.

| # | Title | Body |
|---|---|---|
| 01 | You describe it | Speak naturally. Oracle listens, asks the right follow-ups, and extracts every detail. |
| 02 | Oracle files it | We generate the full claim packet and submit directly to your carrier — no forms. |
| 03 | You get paid | Track every adjuster interaction live. We negotiate on your behalf for first-pass approval. |

### 8.5 Logos (carrier marquee)
- Container: `padding: 32px 0`, top+bottom `1px solid --line`, `margin: 32px 32px`, `overflow: hidden`.
- Centered eyebrow: `Integrated with 40+ carriers`.
- Marquee: row with `width: max-content`, `gap: 56`, `animation: marquee 40s linear infinite`. List doubled.
- Logos as text: 22px / 400 / `--ink-3`, `letter-spacing: -0.01em`. Order: `Lemonade, Progressive, Geico, State Farm, Allstate, Nationwide, Travelers, Liberty Mutual, Farmers, AIG`.

### 8.6 Features ("What's inside")
Section header eyebrow optional. 3-up grid (collapses under 900px). Each card: `bg: --bg-elev`, `border-radius: 20`, `padding: 24`, `min-height: 160`, flex column gap 14.
- Icon chip: 32×32, `border-radius: 10`, `bg: --bg-soft`, `color: --ink-2`, contains the icon.
- Title 15px/500, body 13px `--ink-2`/`line-height 1.5`.

| Icon | Title | Body |
|---|---|---|
| Waveform | Voice-native | No forms. Just talk. Parses 14 languages and noisy environments. |
| Bolt | Direct carrier APIs | Integrated with 40+ insurers. Packets land in seconds. |
| Shield | SOC 2 · HIPAA | Zero-retention audio. End-to-end encrypted. Never trains a model. |
| Sparkle | AI adjuster | Negotiates settlements, flags lowballs, escalates when humans drag. |
| Check | First-pass approval | 94.2% of Oracle claims approve on first submission. |
| Arrow | Live tracking | Every call, email, and adjuster interaction — searchable. |

### 8.7 Testimonial
- Section `padding: 80px 32px`, `max-width: 1100`.
- `<blockquote>`: `clamp(22px, 2.4vw, 32px)`, `font-weight: 300`, `line-height: 1.35`, `letter-spacing: -0.015em`, color `--ink`. Text: *"I totaled my car on a Tuesday. Oracle had the check in my account by Thursday morning. My last claim, in 2022, took seventy-two days."*
- Attribution row: 36×36 round avatar bg `--dark-card`, white text `MR`, weight 400 13px. Beside: `Maya Reyes` (14/500) / `Oakland, CA · Geico policyholder` (12 `--ink-3`).

### 8.8 CTAFooter
- Section `padding: 32px 32px 64px`, container `max-width: 1400`.
- Big dark card identical to hero card style (`bg: --dark-card`, `border-radius: 24`, `padding: clamp(40px, 5vw, 72px)`, `color: --dark-ink`).
- Layout: flex space-between, wrap, gap 32.
  - Left: `<h2>` `clamp(28px, 3.6vw, 48px)` / 300 / `letter-spacing -0.02em` / `max-width 16ch`: *"Something happened. Let's fix it."* + paragraph 15px `--dark-ink-2` / 300 / `max-width 44ch`: *"Oracle handles the rest. From 'I just had an accident' to 'money in your account' in minutes."*
  - Right: two pill buttons (12 22 padding, 14px / 400):
    - `Start a claim` → `setActiveScreen("claim")` (bg `--bg`, color `--ink`).
    - `Open dashboard` → `setActiveScreen("dashboard")` (transparent, white text, `border: 1px solid rgba(255,255,255,0.25)`).

### 8.9 Footer
- `padding: 48px 32px 32px`, `border-top: 1px solid --line`.
- Inner: `max-width: 1400`, flex space-between, wrap.
  - Left: OracleMark + `ORACLE` wordmark (same as nav).
  - Center: nav `Privacy, Terms, Trust, Contact, Status` — 11px uppercase `--ink-3` `letter-spacing 0.05em`, gap 24.
  - Right: `© 2026 Oracle Claims` (11px `--ink-3` `letter-spacing 0.04em`).

---

### 8.10 ClaimFlow screen
Container: `max-width: 980`, `padding: 32px 32px 64px`.

**Breadcrumb**: `← Back` (transparent button → `landing`) / `New claim` / `OR-8821`. Separators are `/` in `--ink-4`. Labels uppercase 11–12px.

**Big dark card** (the speak surface):
- `bg: --dark-card`, `border-radius: 24`, `padding: clamp(32px, 4vw, 56px)`, color `--dark-ink`.
- Top row split: left `Step 1 of 4 · Describe`; right `● 0:12` (mono font) when listening, else `Ready`.
- `<h1>Describe what happened.</h1>` (clamp 28–44px / 300 / `-0.02em`).
- Subhead `<p>Speak freely. Oracle will ask follow-ups when needed.</p>` (15px `--dark-ink-2`).
- **Mic + waveform row** (flex center, gap 24, mb 32):
  - Left: 18 bars (slice 0..18), `width: 2`, color `rgba(255,255,255,0.7)`, fade-in from left edge: `fade = Math.min(1, i/6)`. Height = `4 + v * 56 * fade`.
  - Center: 80×80 round mic button. Inactive: `bg rgba(255,255,255,0.12)`, color white, `Mic` icon. Active: `bg #FFFFFF`, color `--dark-card`, square stop glyph (18×18 `border-radius: 4`), `animation: breathe 2s infinite`.
  - Right: 18 bars (slice 18..36), mirror fade `(18 - i)/6`.
  - Bars container `opacity: listening ? 1 : 0.3`. Heights update via `setInterval(110ms)` setting random `0.15..1.00`.
- Bottom: centered `Listening` or `Tap to start` (uppercase 11px).

**Live transcript card**:
- `bg: --bg-elev`, `border: 1px solid --line`, `border-radius: 24`.
- Header bar: `padding: 16px 24px`, bottom border. Left `LIVE TRANSCRIPT`; right `<n> turns`.
- Body: `padding: 24`, flex column gap 14, `min-height: 200`.
- Empty state (centered, 60px vertical padding): `Tap the microphone to begin.`
- Each turn: row, reverse for `user`. 28×28 round avatar:
  - User: `bg --bg-soft`, text `--ink`, label `You`.
  - Oracle: `bg --dark-card`, text `--dark-ink`, contains `<OracleMark size=12/>`.
- Bubble: `max-width: 78%`, `padding: 10px 14px`, `border-radius: 14`, font 14/`line-height 1.5`.
  - User bubble: `bg --dark-card`, text `--dark-ink`.
  - Oracle bubble: `bg --bg-soft`, text `--ink`.
- Animation: `fade-up 0.5s` w/ project easing on enter.

**Scripted conversation** (auto-types when `listening = true`, first turn after 600ms, then every 1800ms):
1. oracle: *"Hey — I'm Oracle. Take a breath. What happened?"*
2. user: *"I was rear-ended at 4th and Market around 3:15pm today."*
3. oracle: *"I'm sorry you're dealing with this. Is anyone hurt?"*
4. user: *"No, everyone's fine. Just the car."*
5. oracle: *"Did you exchange info with the other driver and take photos?"*
6. user: *"Yeah, I have photos and their insurance card."*
7. oracle: *"Perfect. Let me file this with Geico now."*

**Action row** (bottom): flex space-between.
- Left: `Button variant="outline"` → `Save & exit` → `landing`.
- Right: `Button variant="dark"` → `Continue` + Arrow icon → `dashboard`.

---

### 8.11 Dashboard screen
Container: `max-width: 1400`, `padding: 32px 32px 64px`.

**Header**:
- Eyebrow `Good afternoon, Maya` (11px uppercase `--ink-3`).
- `<h1>Your claims</h1>` (clamp 28–40px / 300 / `-0.025em`).
- Right buttons (gap 10): `outline` w/ Briefcase icon `Policies`; `dark` w/ Plus icon `New claim` → `setActiveScreen("claim")`.

**Premium summary card** (the "money" hero, mirrors hero card style):
- `bg: --dark-card`, `border-radius: 24`, `padding: clamp(32px, 4vw, 48px)`, color `--dark-ink`.
- Layout flex space-between, items end, wrap.
- Left:
  - Eyebrow `Recovered year-to-date` (12px `--dark-ink-2`).
  - Big number `clamp(40px, 5vw, 64px) / 300`: `<CountUp to=28009 format=v => "$" + Math.floor(v).toLocaleString()/>` → renders `$28,009`.
  - Meta row (13px `--dark-ink-2`, gap 24): `↑ $12,400 from Apr 19` · `4 active claims` · `2:44 avg resolution`.
- Right: pill button (transparent, `border: 1px solid rgba(255,255,255,0.25)`, 8 16, 13px): `View statement` + ArrowUpRight icon.

**Stats row** (`grid 4×1`, collapses to 2-col under 1100px and 1-col under 560px):
Each card: `bg: --bg-elev`, `border-radius: 16`, `padding: 20px 24px`, label (eyebrow) + value (28px / 300 / `-0.02em`).
1. `Active claims` / `3`
2. `Avg. resolution` / `2:44`
3. `Approval rate` / `100%`
4. `Lifetime saved` / `$28K`

**Main grid** (`grid 340px 1fr` gap 16; stacks under 1100px):

**Left — Claims list card**:
- `bg: --bg-elev`, `border: 1px solid --line`, `border-radius: 24`, `overflow: hidden`.
- Header bar: `padding: 16px 20px`, bottom border. Left `Your claims` (14/400). Right `All` (uppercase 11px `--ink-3`).
- Each row: full-width button, `padding: 16px 20px`, bottom border (except last). Background changes to `--bg-soft` when selected.
  - Numbered prefix `01..04` (11px `--ink-3`/300, width 28).
  - Title (13/500, ellipsis) + meta (`<amount> · <date>`, 11 `--ink-3`).
  - Right status pill: `padding: 2px 8px`, `border-radius: 999`, `bg: --bg`, color = status color, `font-size: 10`, uppercase `letter-spacing 0.05em`.

Claims data:
| # | id | title | status | amount | date | carrier | progress |
|---|---|---|---|---|---|---|---|
| 01 | OR-8821 | Rear collision · Market St | filing (Filing) | $4,280 | Today | Geico | 72 |
| 02 | OR-8765 | Water damage · kitchen | approved (Approved) | $12,400 | Apr 19 | Allstate | 100 |
| 03 | OR-8712 | Theft · bike stolen | review (Review) | $1,899 | Apr 14 | Lemonade | 58 |
| 04 | OR-8654 | Hail damage · roof | paid (Paid) | $8,750 | Mar 28 | State Farm | 100 |

**Right — Detail column** (flex column, gap 16):

*Detail card* (`bg: --bg-elev`, `border-radius: 24`, `overflow: hidden`):
- **Top section** (`padding: 28px 32px`, bottom border, flex space-between, wrap):
  - Left: `Chip` w/ status dot + status label, then `id` text (11 `--ink-3`). Below: `<h2>` `26/400/-0.02em` with title.
  - Right: eyebrow `Amount` + `32px/300/-0.02em` value.
- **Progress section** (`padding: 20px 32px`, bottom border):
  - Header: left `PROGRESS` (eyebrow), right `<n>%` (11 `--ink`).
  - Track: 4px `bg: --bg-soft` `border-radius: 999`. Fill: width = progress%, `bg: --dark-card`, transition `width 1s` with project easing.
  - Step labels row (10 uppercase `letter-spacing 0.04em`): `Filed | Adjuster | Approved | Paid`. Each becomes `--ink` once progress >= its threshold (25/50/75/100).
- **Timeline section** (`padding: 24px 32px`):
  - Header: `TIMELINE`.
  - Each event row: time column (44px wide, 11 `--ink-3`), dot column, content.
    - Dot 8×8 round; done = `#2A7E4A`; live = `bg --dark-card` + `outline: 3px solid --bg-soft`; pending = `bg --line`.
    - Connector: 2px wide vertical line, `26px` tall, between dots.
    - Title 13/500; description 12 `--ink-3`.
  - Events:
    1. `0:00` · Claim started — *You began describing the incident.* — done
    2. `0:48` · Details extracted — *Location, injuries, photos verified.* — done
    3. `1:32` · Carrier submitted — *Packet sent to Geico via direct API.* — done
    4. `1:58` · Adjuster assigned — *Sarah L. · reviewing now.* — done + live
    5. `—` · Settlement offer — *Expected within the hour.* — pending

*Help card* (mirror of dark CTA, smaller):
- `bg: --dark-card`, `border-radius: 16`, `padding: 20`, color `--dark-ink`. Flex space-between center, wrap.
- Left: `Need to talk to a human?` (12 `--dark-ink-2`) + `Oracle support · 24/7` (18 / 300).
- Right: `<a href="tel:18005550199">` pill — transparent, `border: 1px solid rgba(255,255,255,0.25)`, padding 8 16, 13px: `1-800-555-0199`.

---

## 9. Tweaks panel (optional but supported)

A floating panel registers via `postMessage` with the host:
- `register message listener` then `postMessage({type: "__edit_mode_available"}, "*")`
- Handles `__activate_edit_mode` / `__deactivate_edit_mode`
- Persists via `__edit_mode_set_keys` and a wrapped `/*EDITMODE-BEGIN*/{...}/*EDITMODE-END*/` JSON block

Default tweaks:
```json
{
  "theme": "light",
  "motion": "medium",
  "headline": "Three weeks of paperwork.\nNow two minutes flat.",
  "orbStyle": "warm"
}
```

Sections in the panel:
- **Appearance** → `Theme` radio (`light` | `dark`).
- **Hero** → multi-line `Headline` text input.
- **Navigation** → `Screen` radio (`landing` | `claim` | `dashboard`); also `window.scrollTo({top: 0})` on switch.

---

## 10. Responsive rules

- `nav-links` hidden under **820px**.
- Hero stat row collapses to 1 column under **760px**.
- StatContrast 3-up collapses to 1 column under **760px**.
- HowItWorks / Features 3-up collapse to 1 column under **900px**.
- Dashboard stats: 4 → 2 cols under **1100px**, then 1 col under **560px**.
- Dashboard main grid (list + detail) collapses to single column under **1100px**.
- All interactive targets remain >= 32px.
- Use `clamp()` extensively — see headline / card padding values.

---

## 11. Theme toggle behavior

- The Sun/Moon icon button is a single circular toggle; clicking flips between `"light"` and `"dark"`. Apply by:
  ```js
  document.body.setAttribute("data-theme", theme);
  ```
- The icon shown reflects the *destination*: in dark mode show a Sun (click to go light), in light mode show a Moon.
- Transition the body `background` and `color` over `0.4s ease`.
- All token values switch instantly via the `[data-theme="…"]` selector — no per-component overrides.

---

## 12. File / module layout (reference)

```
Oracle.html              # shell — fonts, tokens, body[data-theme], script tags
src/primitives.jsx       # useReveal, Reveal, Magnetic, Button, Chip, GlassCard, CountUp, Icon
src/nav.jsx              # Nav, OracleMark
src/hero.jsx             # Hero (landing)
src/sections.jsx         # StatContrast, HowItWorks, Features, Logos, Testimonial, CTAFooter
src/claim-flow.jsx       # ClaimFlow
src/dashboard.jsx        # Dashboard
src/footer.jsx           # Footer
src/app.jsx              # App root — theme, screen routing, tweaks wiring
tweaks-panel.jsx         # TweaksPanel + form helpers (optional)
```

Stack: React 18.3.1 + ReactDOM via UMD, Babel Standalone for inline JSX (or pre-compile in production). No CSS framework — design tokens via CSS custom properties on `[data-theme="…"]`.

---

## 13. Acceptance checklist (build it exactly)

- [ ] Warm cream `#F7F6F3` page, warm-white `#FFFFFF` cards, single deep `#423E3B` accent card per section
- [ ] Geist 300 for all display headlines, with `letter-spacing: -0.025em`
- [ ] All eyebrows: 11px uppercase `letter-spacing: 0.06em` `--ink-3`
- [ ] All large content cards have `border-radius: 24` and `1px solid --line` border
- [ ] Hero dark card has the green-dot listening label, 76px-max headline, magnetic CTA buttons, mini waveform on right
- [ ] Carrier marquee scrolls left at 40s linear, gap 56, doubled list
- [ ] Claim flow mic breathes when active, waveform updates every 110ms, transcript auto-types the 7-line script
- [ ] Dashboard `Recovered YTD` counts up to `$28,009` with cubic-out
- [ ] Dashboard timeline shows the green "done" dots, the live `--dark-card` dot with `--bg-soft` outline, and the pending `--line` dot
- [ ] Theme toggle swaps every token; Sun shown in dark mode, Moon in light
- [ ] Grain overlay covers the whole viewport at low opacity, mix-blend `overlay`
- [ ] Reduced-motion media query disables all transitions/animations
