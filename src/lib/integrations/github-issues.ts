// ─── GitHub Issues — Human Escalation Layer ───────────────────────────────
// Replaces Entire.io. When Pioneer confidence < threshold, a GitHub Issue
// is created containing the full structured claim context as Markdown.
// Free. Open-source. No API key costs. Adjusters get a direct link.
//
// Setup (one time, 30 seconds):
//   1. Create a repo: github.com/new  (can be private)
//   2. Generate a token: github.com/settings/tokens → New token → repo scope
//   3. Set GITHUB_TOKEN and GITHUB_REPO in .env.local

import { ClaimObject } from '@/types/claim';
import { formatCurrency, formatDuration } from '@/lib/utils';

export interface EscalationResult {
  task_id: string;
  task_url: string;
  status: string;
  created_at: string;
}

export async function escalateClaim(claim: ClaimObject): Promise<EscalationResult> {
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo  = process.env.GITHUB_REPO?.trim(); // e.g. "yourname/oracle-escalations"

  // ─── Demo fallback (no token configured) ────────────────────────────────
  if (!token || !repo) {
    await new Promise((r) => setTimeout(r, 500));
    const taskId = 'GH-' + claim.id.slice(0, 8).toUpperCase();
    return {
      task_id: taskId,
      task_url: `https://github.com/issues`,
      status: 'open',
      created_at: new Date().toISOString(),
    };
  }

  const fa = claim.fraud_assessment;
  const da = claim.damage_analysis;
  const env = claim.environmental;

  const riskEmoji = fa?.fraud_risk === 'high' ? '🔴' : fa?.fraud_risk === 'medium' ? '🟡' : '🟢';
  const scoreBar = buildScoreBar(fa?.confidence_score ?? 0);

  const body = `
## 🛡️ ORACLE — Claim Escalation

| Field | Value |
|---|---|
| **Claim ID** | \`${claim.id}\` |
| **Filed** | ${new Date(claim.created_at).toLocaleString()} |
| **Policyholder** | ${claim.user.name} |
| **Policy #** | \`${claim.user.policy_number}\` |
| **Insurer** | ${claim.user.insurer} |
| **Contact** | ${claim.user.email} |

---

## 🍡 Pioneer Confidence Score

> ${riskEmoji} **${fa?.confidence_score ?? 'N/A'} / 100** — ${(fa?.fraud_risk ?? 'unknown').toUpperCase()} FRAUD RISK

\`\`\`
${scoreBar}
\`\`\`

**Reasoning:**
${fa?.reasoning.map((r) => `- ${r}`).join('\n') ?? '_No reasoning available_'}

${fa?.flags && fa.flags.length > 0 ? `**Flags:** ${fa.flags.map((f) => `\`${f}\``).join(' ')}` : ''}

---

## 🗣️ Claimant Statement

> ${claim.voice?.transcript ?? '_No transcript available_'}

**Voice Analysis:**
- Stress score: \`${claim.voice?.stress_score?.toFixed(2) ?? 'N/A'}\` / 1.00
- Acoustic sentiment: \`${claim.voice?.acoustic_sentiment ?? 'N/A'}\`
- Duration: \`${claim.voice?.duration_seconds ?? 0}s\`

---

## 🚗 Damage Assessment (Gemini 2.0)

| Field | Value |
|---|---|
| **Location** | ${da?.damage_location ?? 'N/A'} |
| **Severity** | **${da?.severity?.toUpperCase() ?? 'N/A'}** |
| **Consistent with statement** | ${da?.damage_consistent_with_description ? '✅ Yes' : '❌ **No — inconsistency detected**'} |
| **Estimated cost** | ${da ? `${formatCurrency(da.estimated_repair_cost.min)} – ${formatCurrency(da.estimated_repair_cost.max)}` : 'N/A'} |

**Observations:**
${da?.damage_details.map((d) => `- ${d}`).join('\n') ?? '_None_'}

**Affected parts:** ${da?.affected_parts.join(', ') ?? 'N/A'}

---

## 🌧️ Environmental Context (Tavily)

| Condition | Value |
|---|---|
| Weather | ${env?.weather_condition ?? 'N/A'} |
| Temperature | ${env?.temperature_celsius ?? 'N/A'}°C |
| Road | ${env?.road_conditions ?? 'N/A'} |
| Visibility | ${env?.visibility ?? 'N/A'} |
| Precipitation | ${env?.precipitation ?? 'N/A'} |

---

## 📈 Market Pricing (Tavily)

- Average repair cost: **${formatCurrency(claim.market_data?.average_repair_cost_usd ?? 0)}**
- Range: ${formatCurrency(claim.market_data?.cost_range.min ?? 0)} – ${formatCurrency(claim.market_data?.cost_range.max ?? 0)}
- Market: ${claim.market_data?.market_location ?? 'N/A'}

---

## 📍 Incident Location

${claim.incident?.location.address ?? 'N/A'}

---

_This claim was automatically escalated by ORACLE after Pioneer scored it below the 72/100 auto-approval threshold. Context is pre-packaged — you are starting from 90% complete._

**Resolution time so far:** ${formatDuration(claim.resolution?.resolution_time_seconds ?? 0)}
`.trim();

  const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `🛡️ [ORACLE] Claim Escalation — ${claim.user.name} | Score: ${fa?.confidence_score}/100 | ${(fa?.fraud_risk ?? '').toUpperCase()} RISK`,
      body,
      labels: [
        'oracle-escalation',
        fa?.fraud_risk === 'high' ? 'high-risk' : fa?.fraud_risk === 'medium' ? 'medium-risk' : 'low-risk',
        da?.severity === 'severe' || da?.severity === 'total_loss' ? 'high-value' : 'standard',
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GitHub Issues error ${response.status}: ${err}`);
  }

  const issue = await response.json();
  return {
    task_id: `GH-${issue.number}`,
    task_url: issue.html_url,
    status: 'open',
    created_at: issue.created_at,
  };
}

function buildScoreBar(score: number): string {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${score}/100`;
}
