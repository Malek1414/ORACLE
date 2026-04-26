// --- OpenAI GPT-4o-mini One-Shot Claims Intake Agent ---------------------------
// Single-recording FNOL intake with multilingual support (EN/DE), contextual ASR
// correction, and rich field extraction. The user narrates the full accident in one
// go; the model extracts all fields and asks at most two targeted follow-ups when
// critical data is missing.

export interface ConverseTurn {
  role: 'user' | 'model'; // 'model' mapped to 'assistant' for OpenAI API
  content: string;
}

export interface ExtractedIncident {
  incident_type: string | null;
  description: string | null;
  location: { address: string; city: string } | null;
  timestamp: string | null;
  vehicles_involved: string[] | null;
  people_count: number | null;
  direction_of_travel: string | null;
  other_driver_action: string | null;
  at_fault: 'claimant' | 'other_party' | 'unclear' | null;
  injuries_reported: boolean | null;
  police_involved: boolean | null;
  damage_severity: 'minor' | 'moderate' | 'severe' | 'total_loss' | null;
}

export interface ConverseResult {
  response: string;
  done: boolean;
  detectedLanguage: string;
  extracted: ExtractedIncident;
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

// German cities — included so the model can trigger an automatic language switch.
const GERMAN_CITIES = [
  'Berlin', 'Muenchen', 'Munchen', 'Munich', 'Hamburg', 'Frankfurt', 'Koeln', 'Cologne',
  'Stuttgart', 'Dusseldorf', 'Duesseldorf', 'Bremen', 'Leipzig', 'Dresden', 'Hannover',
  'Nuernberg', 'Nuremberg', 'Dortmund', 'Essen', 'Duisburg', 'Bochum', 'Wuppertal',
  'Bielefeld', 'Bonn', 'Munster', 'Muenster', 'Karlsruhe', 'Mannheim', 'Augsburg',
  'Wiesbaden', 'Gelsenkirchen', 'Aachen', 'Braunschweig', 'Kiel', 'Chemnitz',
  'Magdeburg', 'Halle', 'Freiburg', 'Krefeld', 'Luebeck', 'Oberhausen', 'Erfurt',
  'Mainz', 'Rostock', 'Kassel', 'Saarbruecken', 'Potsdam', 'Oldenburg', 'Leverkusen',
  'Heidelberg', 'Regensburg', 'Ingolstadt', 'Wolfsburg', 'Ulm', 'Darmstadt',
].join(', ');

function buildSystemPrompt(language: string): string {
  const de = language === 'de';

  const openingQ = de
    ? 'Bitte beschreiben Sie den Unfall vollst\u00e4ndig \u2014 was passiert ist, wo und wann, wer beteiligt war, eventuelle Verletzungen und die sichtbaren Sch\u00e4den an Ihrem Fahrzeug.'
    : 'Please describe the full accident \u2014 what happened, where and when it occurred, who was involved, any injuries, and the damage you can see on your vehicle.';

  const finalEx = de
    ? 'Alles da \u2014 jetzt fotografieren wir den Schaden.'
    : "Got everything \u2014 let's photograph the damage.";

  return (
    'You are ORACLE, an AI insurance claims intake specialist for car accidents. Always respond with valid JSON.\n' +
    '\n' +
    'LANGUAGE RULES:\n' +
    '- Active session language: "' + language + '". ALL text in the "response" field MUST be in this language.\n' +
    '- German city trigger list: ' + GERMAN_CITIES + '\n' +
    '- If the user transcript contains any city from that list, OR uses German grammar or vocabulary, set "detectedLanguage": "de" and respond in German from that point forward.\n' +
    '- Otherwise set "detectedLanguage": "en".\n' +
    '- Language switches are permanent once triggered. Never mix languages in one response.\n' +
    '\n' +
    'ASR CORRECTION (apply silently \u2014 never mention corrections to the user):\n' +
    'You receive raw speech-to-text. Correct these common insurance-domain ASR errors internally:\n' +
    '- "rear ended" / "rear end" -> rear-end collision\n' +
    '- "t boned" / "t bone" -> T-bone / side-impact collision\n' +
    '- "totalled" / "total" (when describing damage) -> total loss\n' +
    '- "ran a red" -> ran a red light\n' +
    '- Road codes (A7, B96, M25, Route 9, I-95, E40) are valid \u2014 keep as-is\n' +
    '- Licence plates spoken phonetically: normalise if clearly a plate (e.g. "bee em double-u 123" -> "BMW-123")\n' +
    '- German plates follow pattern "AB CD 1234" \u2014 normalise if spoken phonetically\n' +
    '- Garbled city names: correct to nearest plausible city from the German city list or general geography\n' +
    '\n' +
    'ONE-SHOT INTAKE APPROACH:\n' +
    'The user narrates the full accident in a single recording. Extract all fields from that narration.\n' +
    '\n' +
    'OPENING TURN (isOpening: true):\n' +
    'Ask ONLY: "' + openingQ + '" \u2014 nothing else.\n' +
    '\n' +
    'AFTER THE NARRATION \u2014 extract all fields, then decide done vs follow-up:\n' +
    'Critical fields (need at least 3 of 4 to consider the intake sufficient):\n' +
    '  1. incident_type\n' +
    '  2. description (always present if the user spoke)\n' +
    '  3. location (at least a road name or city)\n' +
    '  4. vehicles_involved OR people_count\n' +
    '\n' +
    'COMPLETENESS RULES (evaluated after each user turn):\n' +
    '- If [follow_ups_used] >= 2: ALWAYS set done=true regardless of what is missing.\n' +
    '- If 3 or more critical fields are filled: set done=true.\n' +
    '- Otherwise: set done=false and ask ONE targeted follow-up for the single most critical missing field.\n' +
    '  Priority order for follow-ups: location > vehicles/people count > injuries_reported > damage_severity > direction_of_travel > other_driver_action\n' +
    '\n' +
    'FOLLOW-UP RULES:\n' +
    '- ONE question per turn. Never combine two questions.\n' +
    '- Maximum 1 sentence. Short and direct.\n' +
    '- Accept null for any field the user cannot provide \u2014 never push.\n' +
    '\n' +
    'TONE (driven by stress_hint in the message):\n' +
    '- >= 0.6: MAX 1 sentence. Short words. No softening whatsoever.\n' +
    '- 0.3 to 0.6: 1 to 2 sentences. Direct.\n' +
    '- < 0.3: 1 to 2 sentences. Slightly warmer.\n' +
    '- FORBIDDEN in any language: "I understand", "I\'m sorry to hear", "take your time", "of course", "absolutely".\n' +
    '- FORBIDDEN in German: "Ich verstehe", "Es tut mir leid", "Nehmen Sie sich Zeit", "Natuerlich".\n' +
    '\n' +
    'FINAL RESPONSE when done=true: "' + finalEx + '"\n' +
    '\n' +
    'FNOL EXTRACTION \u2014 populate from the full narration (not just the latest turn):\n' +
    '- incident_type: "rear-end", "T-bone", "sideswipe", "head-on", "single vehicle", "parking lot", "hit and run", etc.\n' +
    '- description: full narrative of what happened\n' +
    '- location: { address: street or road, city: city name } or null\n' +
    '- timestamp: ISO 8601 if mentioned, else null\n' +
    '- vehicles_involved: array of vehicle descriptions (e.g. ["2019 Honda Civic", "black SUV"])\n' +
    '- people_count: total people involved including the claimant\n' +
    '- direction_of_travel: direction the claimant was traveling (e.g. "northbound on Route 9")\n' +
    '- other_driver_action: what the other driver did (e.g. "ran a red light", "braked suddenly")\n' +
    '- at_fault: "claimant" if they admit fault; "other_party" if the other driver caused it; "unclear" if ambiguous\n' +
    '- injuries_reported: true if anyone mentions pain/injury/ambulance/hospital; false if explicitly none; null if not mentioned\n' +
    '- police_involved: true if police called or report mentioned; false if explicitly denied; null if not mentioned\n' +
    '- damage_severity:\n' +
    '    minor      = scratches, small dents, fully driveable\n' +
    '    moderate   = bumper/hood/door damage but car moves\n' +
    '    severe     = major structural damage, barely driveable\n' +
    '    total_loss = destroyed, user says "totalled" or "Totalschaden"\n' +
    '\n' +
    'RESPOND ONLY WITH THIS EXACT JSON \u2014 no markdown, no code fences, no extra text:\n' +
    '{\n' +
    '  "response": "question or closing sentence in the active session language",\n' +
    '  "done": false,\n' +
    '  "detectedLanguage": "en",\n' +
    '  "extracted": {\n' +
    '    "incident_type": null,\n' +
    '    "description": null,\n' +
    '    "location": null,\n' +
    '    "timestamp": null,\n' +
    '    "vehicles_involved": null,\n' +
    '    "people_count": null,\n' +
    '    "direction_of_travel": null,\n' +
    '    "other_driver_action": null,\n' +
    '    "at_fault": null,\n' +
    '    "injuries_reported": null,\n' +
    '    "police_involved": null,\n' +
    '    "damage_severity": null\n' +
    '  }\n' +
    '}'
  );
}

const emptyExtracted: ExtractedIncident = {
  incident_type: null,
  description: null,
  location: null,
  timestamp: null,
  vehicles_involved: null,
  people_count: null,
  direction_of_travel: null,
  other_driver_action: null,
  at_fault: null,
  injuries_reported: null,
  police_involved: null,
  damage_severity: null,
};

export async function openaiConverse(
  history: ConverseTurn[],
  transcript: string,
  stressHint: number,
  isOpening: boolean,
  detectedLanguage = 'en',
): Promise<ConverseResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  // Demo mode \u2014 opening prompts for narration, first user turn auto-completes
  if (!apiKey) {
    if (isOpening) {
      return {
        response: detectedLanguage === 'de'
          ? 'Bitte beschreiben Sie den Unfall vollst\u00e4ndig \u2014 was passiert ist, wo und wann, wer beteiligt war, Verletzungen und sichtbare Sch\u00e4den.'
          : 'Please describe the full accident \u2014 what happened, where and when, who was involved, any injuries, and the damage you can see.',
        done: false,
        detectedLanguage,
        extracted: { ...emptyExtracted },
      };
    }
    return {
      response: detectedLanguage === 'de'
        ? 'Alles da \u2014 jetzt fotografieren wir den Schaden.'
        : "Got everything \u2014 let's photograph the damage.",
      done: true,
      detectedLanguage,
      extracted: { ...emptyExtracted, description: transcript || null },
    };
  }

  // follow_ups_used = number of model turns already in history beyond the opening question.
  // Opening model turn (asks for the narration) does not count; each subsequent model turn is a follow-up.
  const modelTurns = history.filter((t) => t.role === 'model').length;
  const followUpsUsed = Math.max(0, modelTurns - 1);

  const turnNote = isOpening
    ? '[isOpening: true]'
    : `[follow_ups_used: ${followUpsUsed}][max_follow_ups: 2]`;

  const userContext = isOpening
    ? `${turnNote}[stress_hint: ${stressHint.toFixed(2)}][lang: ${detectedLanguage}]`
    : `${turnNote}[stress_hint: ${stressHint.toFixed(2)}][lang: ${detectedLanguage}] User said: ${transcript}`;

  const historyMessages = history.map((turn) => ({
    role: (turn.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: turn.content,
  }));

  const messages = [
    { role: 'system' as const, content: buildSystemPrompt(detectedLanguage) },
    ...historyMessages,
    { role: 'user' as const, content: userContext },
  ];

  const body = {
    model: MODEL,
    messages,
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 400,
  };

  // Abort if OpenAI has not responded in 5 s.
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), 5000);

  let response: Response;
  try {
    response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(abortTimer);
    throw new Error(`OpenAI fetch failed: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`);
  }
  clearTimeout(abortTimer);

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI converse error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('OpenAI returned empty response');

  const result = JSON.parse(raw) as ConverseResult;

  // Hard server-side gate: force done=true after 2 follow-ups regardless of model output.
  if (!result.done && followUpsUsed >= 2) {
    result.done = true;
    const lang = result.detectedLanguage || detectedLanguage;
    result.response = lang === 'de'
      ? 'Alles da \u2014 jetzt fotografieren wir den Schaden.'
      : "Got everything \u2014 let's photograph the damage.";
  }

  result.detectedLanguage = result.detectedLanguage || detectedLanguage;

  return result;
}

/* \u2500\u2500\u2500 LEGACY: Five-Turn Multi-Step Collection (parenthesised for potential reinvocation) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
 *
 * The original intake used a strict five-turn collection order with a hard turn gate:
 *   P1: What happened \u2014 incident type, cause, mechanism
 *   P2: Vehicles + people count
 *   P3: Location \u2014 street or road, city
 *   P4: Direction the claimant was traveling + what the other party did
 *   P5: Visible damage on the claimant's vehicle right now
 *
 * Turn gate: done=false until userTurns >= 5, enforced both in the prompt
 * ([min_turns_required: 5][done_allowed: true/false]) and server-side
 * (if (result.done && userTurns < 5) result.done = false).
 *
 * Elaborative questioning was also enforced: uncertain language ("I think",
 * "maybe", German equivalents) triggered a focused follow-up before advancing.
 *
 * To reinvoke:
 *  1. Restore the legacy buildSystemPrompt_Legacy function (see git history for full source).
 *  2. Replace openaiConverse with openaiConverse_Legacy.
 *  3. In openaiConverse_Legacy, replace the followUpsUsed logic with:
 *       const userTurns = history.filter((t) => t.role === 'user').length;
 *       const turnNote = isOpening
 *         ? '[isOpening: true]'
 *         : `[user_turns_so_far: ${userTurns}][min_turns_required: 5][done_allowed: ${userTurns >= 4}]`;
 *  4. Restore the server-side gate:
 *       if (result.done && userTurns < 5) result.done = false;
 */
