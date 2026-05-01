// --- Gemini 2.5 Flash One-Shot Claims Intake Agent ----------------------------
// Single-recording FNOL intake. User narrates the full accident in one go;
// Gemini extracts all fields and asks at most two targeted follow-ups.
// Uses system_instruction for the prompt and responseMimeType for JSON output.

export interface ConverseTurn {
  role: 'user' | 'model';
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

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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
    ? 'Hallo, hier ist Maya von Oracle Claims \u2014 ich sehe, dass Sie heute einen Unfall hatten. Zun\u00e4chst und vor allem: Sind Sie in Sicherheit und ben\u00f6tigen Sie Notfalldienste?'
    : 'Hi, this is Maya from Oracle Claims \u2014 I can see you have been in an accident today. First and most importantly, are you safe and do you need emergency services?';

  const finalEx = de
    ? 'Alles da \u2014 jetzt fotografieren wir den Schaden.'
    : "Got everything \u2014 let's photograph the damage.";

  return (
    'You are ORACLE, an AI insurance claims intake specialist for car accidents. Always respond with valid JSON.\n' +
    '\n' +
    'LANGUAGE RULES:\n' +
    '- Active session language: "' + language + '". ALL text in the "response" field MUST be in this language.\n' +
    '- German city trigger list: ' + GERMAN_CITIES + '\n' +
    '- If the transcript contains any city from that list, OR German grammar/vocabulary, set "detectedLanguage": "de" and respond in German.\n' +
    '- Otherwise set "detectedLanguage": "en".\n' +
    '- Language switches are permanent once triggered.\n' +
    '\n' +
    'ASR CORRECTION (silently, never mention to the user):\n' +
    '- "rear ended" -> rear-end collision\n' +
    '- "t boned" -> T-bone collision\n' +
    '- "totalled" / "total" (damage) -> total loss\n' +
    '- "ran a red" -> ran a red light\n' +
    '- Road codes (A7, B96, Route 9, I-95, E40) keep as-is\n' +
    '\n' +
    'ONE-SHOT INTAKE:\n' +
    'The user narrates the full accident in one recording. Extract all FNOL fields from it.\n' +
    '\n' +
    'OPENING TURN (isOpening: true):\n' +
    'Ask ONLY: "' + openingQ + '" \u2014 nothing else.\n' +
    '\n' +
    'AFTER THE NARRATION \u2014 extract fields, then decide done vs follow-up:\n' +
    'Critical fields (need 3 of 4 to be sufficient):\n' +
    '  1. incident_type\n' +
    '  2. description (always present if the user spoke)\n' +
    '  3. location (at least a road name or city)\n' +
    '  4. vehicles_involved OR people_count\n' +
    '\n' +
    'COMPLETENESS RULES:\n' +
    '- [follow_ups_used] >= 2: ALWAYS set done=true.\n' +
    '- 3+ critical fields filled: set done=true.\n' +
    '- Otherwise: ONE targeted follow-up for the most critical missing field.\n' +
    '  Priority: location > vehicles/people > injuries_reported > damage_severity > direction_of_travel > other_driver_action\n' +
    '\n' +
    'FOLLOW-UP RULES:\n' +
    '- ONE question per turn, max 1 sentence, short and direct.\n' +
    '- Accept null if user cannot answer \u2014 never push.\n' +
    '\n' +
    'TONE:\n' +
    '- stress_hint >= 0.6: MAX 1 sentence. Short words. No softening.\n' +
    '- 0.3\u20130.6: 1\u20132 sentences. Direct.\n' +
    '- < 0.3: 1\u20132 sentences. Slightly warmer.\n' +
    '- FORBIDDEN: "I understand", "I\'m sorry", "take your time", "of course", "absolutely".\n' +
    '\n' +
    'FINAL RESPONSE when done=true: "' + finalEx + '"\n' +
    '\n' +
    'EXTRACTION FIELDS:\n' +
    '- incident_type: "rear-end", "T-bone", "sideswipe", "head-on", "single vehicle", "hit and run", etc.\n' +
    '- description: full narrative\n' +
    '- location: { address, city } or null\n' +
    '- timestamp: ISO 8601 or null\n' +
    '- vehicles_involved: array of descriptions\n' +
    '- people_count: total including claimant\n' +
    '- direction_of_travel: e.g. "northbound on Route 9"\n' +
    '- other_driver_action: e.g. "ran a red light"\n' +
    '- at_fault: "claimant" | "other_party" | "unclear"\n' +
    '- injuries_reported: true/false/null\n' +
    '- police_involved: true/false/null\n' +
    '- damage_severity: "minor" | "moderate" | "severe" | "total_loss" | null\n' +
    '\n' +
    'RESPOND ONLY WITH THIS JSON (no markdown, no code fences):\n' +
    '{\n' +
    '  "response": "...",\n' +
    '  "done": false,\n' +
    '  "detectedLanguage": "en",\n' +
    '  "extracted": {\n' +
    '    "incident_type": null, "description": null, "location": null,\n' +
    '    "timestamp": null, "vehicles_involved": null, "people_count": null,\n' +
    '    "direction_of_travel": null, "other_driver_action": null,\n' +
    '    "at_fault": null, "injuries_reported": null,\n' +
    '    "police_involved": null, "damage_severity": null\n' +
    '  }\n' +
    '}'
  );
}

const emptyExtracted: ExtractedIncident = {
  incident_type: null, description: null, location: null, timestamp: null,
  vehicles_involved: null, people_count: null, direction_of_travel: null,
  other_driver_action: null, at_fault: null, injuries_reported: null,
  police_involved: null, damage_severity: null,
};

export async function geminiConverse(
  history: ConverseTurn[],
  transcript: string,
  stressHint: number,
  isOpening: boolean,
  detectedLanguage = 'en',
): Promise<ConverseResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Demo mode
  if (!apiKey) {
    if (isOpening) {
      return {
        response: 'Hi, this is Maya from Oracle Claims \u2014 I can see you have been in an accident today. First and most importantly, are you safe and do you need emergency services?',
        done: false,
        detectedLanguage,
        extracted: { ...emptyExtracted },
      };
    }
    return {
      response: "Got everything \u2014 let's photograph the damage.",
      done: true,
      detectedLanguage,
      extracted: { ...emptyExtracted, description: transcript || null },
    };
  }

  // follow_ups_used: model turns in history minus the opening question
  const modelTurns = history.filter((t) => t.role === 'model').length;
  const followUpsUsed = Math.max(0, modelTurns - 1);

  const turnNote = isOpening
    ? '[isOpening: true]'
    : `[follow_ups_used: ${followUpsUsed}][max_follow_ups: 2]`;

  const userContext = isOpening
    ? `${turnNote}[stress_hint: ${stressHint.toFixed(2)}][lang: ${detectedLanguage}]`
    : `${turnNote}[stress_hint: ${stressHint.toFixed(2)}][lang: ${detectedLanguage}] User said: ${transcript}`;

  // Build contents array: history turns + current user message
  // Gemini requires alternating user/model roles starting with user.
  // Ensure history starts with user (pad with a silent opener if needed).
  const rawHistory: ConverseTurn[] = history.length === 0 || history[0].role === 'user'
    ? history
    : [{ role: 'user', content: '[start]' }, ...history];

  const contents = [
    ...rawHistory.map((turn) => ({
      role: turn.role,  // 'user' | 'model' — Gemini uses 'model'
      parts: [{ text: turn.content }],
    })),
    { role: 'user' as const, parts: [{ text: userContext }] },
  ];

  const body = {
    system_instruction: { parts: [{ text: buildSystemPrompt(detectedLanguage) }] },
    contents,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini converse ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Gemini returned empty response');

  const result = JSON.parse(raw) as ConverseResult;

  // Hard gate: force done after 2 follow-ups
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
