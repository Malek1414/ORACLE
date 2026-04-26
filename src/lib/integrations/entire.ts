// ─── Entire Human Escalation ──────────────────────────────────────────────────
// Creates a task in Entire's platform when Pioneer confidence < threshold.
// The adjuster receives the full claim context pre-packaged.

import { ClaimObject, EntireTaskResponse } from '@/types/claim';
import { formatCurrency } from '@/lib/utils';

const ENTIRE_API_URL = 'https://api.entire.ai/v1/tasks';

export async function escalateToEntire(claim: ClaimObject): Promise<EntireTaskResponse> {
  const apiKey = process.env.ENTIRE_API_KEY;

  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 500));
    const taskId = 'ENT-' + claim.id.slice(0, 8).toUpperCase();
    return { task_id: taskId, task_url: `https://app.entire.ai/tasks/${taskId}`, status: 'open', created_at: new Date().toISOString() };
  }

  const payload = {
    title: `ORACLE Claim Escalation — ${claim.id.slice(0, 8).toUpperCase()}`,
    priority: claim.fraud_assessment?.fraud_risk === 'high' ? 'urgent' : 'high',
    description: buildEscalationDescription(claim),
    metadata: {
      claim_id: claim.id,
      policy_number: claim.user.policy_number,
      insurer: claim.user.insurer,
      confidence_score: claim.fraud_assessment?.confidence_score,
      fraud_risk: claim.fraud_assessment?.fraud_risk,
    },
    attachments: {
      transcript: claim.voice?.transcript,
      photo_urls: claim.photos?.urls,
      full_claim: claim,
    },
  };

  const response = await fetch(ENTIRE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Entire error ${response.status}: ${err}`);
  }

  return response.json();
}

function buildEscalationDescription(claim: ClaimObject): string {
  const fa = claim.fraud_assessment;
  const da = claim.damage_analysis;
  const env = claim.environmental;

  return `
CLAIM ID: ${claim.id}
FILED: ${new Date(claim.created_at).toLocaleString()}
POLICYHOLDER: ${claim.user.name} — ${claim.user.policy_number}
INSURER: ${claim.user.insurer}

INCIDENT:
${claim.incident?.description}

LOCATION: ${claim.incident?.location.address}
TIME: ${claim.incident?.timestamp}

DAMAGE ASSESSMENT:
- Severity: ${da?.severity}
- Location: ${da?.damage_location}
- Estimated Cost: ${da ? formatCurrency(da.estimated_repair_cost.min) + ' – ' + formatCurrency(da.estimated_repair_cost.max) : 'Unknown'}
- Consistent with description: ${da?.damage_consistent_with_description ? 'YES' : 'NO ⚠️'}

ENVIRONMENT:
- Weather: ${env?.weather_condition}, ${env?.temperature_celsius}°C
- Road: ${env?.road_conditions}
- Precipitation: ${env?.precipitation}

VOICE ANALYSIS:
- Stress Score: ${claim.voice?.stress_score?.toFixed(2)}/1.00
- Acoustic Sentiment: ${claim.voice?.acoustic_sentiment}

PIONEER FRAUD ASSESSMENT:
- Confidence Score: ${fa?.confidence_score}/100
- Fraud Risk: ${fa?.fraud_risk?.toUpperCase()}
- Flags: ${fa?.flags?.join(', ') || 'None'}
- Reasoning:
${fa?.reasoning.map((r) => `  • ${r}`).join('\n')}

TRANSCRIPT:
${claim.voice?.transcript}

This claim requires human review. Context pre-packaged by ORACLE.
`.trim();
}
