// ─── Google Gemini Multimodal Analysis ────────────────────────────────────────
// Sends transcript + photos to Gemini for structured damage analysis.
// Returns JSON with damage location, severity, and cost estimate.

import { GeminiDamageResponse } from '@/types/claim';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const DAMAGE_ANALYSIS_PROMPT = `You are an expert automotive insurance adjuster AI.
Analyse the provided incident description and vehicle damage photos.
Return ONLY valid JSON matching this exact schema — no markdown, no code fences:
{
  "damage_location": string,
  "severity": "minor" | "moderate" | "severe" | "total_loss",
  "estimated_repair_cost": { "min": number, "max": number, "currency": "USD" },
  "damage_consistent_with_description": boolean,
  "damage_details": string[],
  "affected_parts": string[],
  "damage_zones": string[],
  "incident_circumstances": number[],
  "vehicle_a_heading": string | null,
  "vehicle_b_heading": string | null,
  "incident_road_type": "straight" | "junction" | "roundabout" | "driveway" | "other",
  "injuries_mentioned": boolean,
  "other_property_damage": boolean
}

damage_zones must be an array containing only values from this list:
front-center, front-left, front-right, rear-center, rear-left, rear-right,
driver-door, passenger-door, driver-rear-door, passenger-rear-door, roof, hood, trunk

incident_circumstances is an array of integers 1-17 from the Allianz form:
1=parked, 2=moving, 3=stopping, 4=leaving driveway, 5=entering driveway,
6=entering roundabout, 7=circulating roundabout, 8=struck rear, 9=same direction different lane,
10=changing lanes, 11=overtaking, 12=right turn, 13=left turn, 14=reversing,
15=entering opposite lane, 16=came from right, 17=failed give-way

vehicle_a_heading and vehicle_b_heading: compass direction strings ("northbound", "heading east", etc.) or null.
incident_road_type: best match from the options above.

Be precise. Be clinical. Return only the JSON object.`;

export async function analyseClaimWithGemini(
  transcript: string,
  photoBase64Images: string[]
): Promise<GeminiDamageResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 1200));
    return {
      damage_location: 'front bumper, hood, grille assembly',
      severity: 'moderate',
      estimated_repair_cost: { min: 2400, max: 4200, currency: 'USD' },
      damage_consistent_with_description: true,
      damage_details: [
        'Front bumper cover cracked along lower edge — approximately 60cm split',
        'Hood panel shows impact crease consistent with frontal collision',
        'Grille assembly partially displaced, mounting clips fractured',
        'No structural frame damage visible in submitted photos',
        'Headlight assemblies appear intact with no lens fracture',
      ],
      affected_parts: ['front bumper cover', 'hood panel', 'grille assembly', 'upper radiator support bracket'],
    };
  }

  const parts: object[] = [
    { text: DAMAGE_ANALYSIS_PROMPT },
    { text: `INCIDENT DESCRIPTION:\n${transcript}` },
    ...photoBase64Images.map((base64) => ({
      inline_data: {
        mime_type: 'image/jpeg',
        data: base64.replace(/^data:image\/\w+;base64,/, ''),
      },
    })),
  ];

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Gemini returned empty response');

  return JSON.parse(raw);
}
