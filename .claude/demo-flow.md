# ORACLE Demo Flow For Screen Recording

Use this file as the presenter script for a full ORACLE demo. The goal is to show a smooth policyholder claim flow, AI voice intake, damage photos, processing, roadside result, FNOL completion, signature, PDF preview, and email submission.

## Preflight

1. Read `AGENTS.md` first. This project uses Next.js 16.2.4, and local rules say to read relevant docs in `node_modules/next/dist/docs/` before code changes.
2. Make sure `.env.local` exists. Do not expose it on camera.
3. Confirm these services are configured if the demo should use real integrations:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `GRADIUM_API_KEY`
   - `AI_COUSTICS_API_KEY`
   - `GEMINI_API_KEY`
   - `TAVILY_API_KEY`
   - `PIONEER_API_KEY`
   - `RESEND_API_KEY`
4. Start the app:

```bash
npm run dev
```

5. Open `http://localhost:3000` in a narrow mobile viewport. Hide the terminal once the app is running.
6. Prepare two damage photos before recording. Preferred filenames:
   - `.claude/demo-assets/front-left-bumper-damage.jpg`
   - `.claude/demo-assets/hood-grille-damage.jpg`

If the files do not exist yet, create the folder and prepare them before the recording. Use one of these methods:

- Search the web for "front left bumper collision damage close up" and "car hood grille front collision damage", then save two realistic JPG files with the names above.
- If image generation is available, generate two realistic insurance claim photos:
  - Photo 1 prompt: "realistic smartphone photo of a sedan front-left bumper cracked after a low-speed rear-end collision, daylight, no license plate visible, insurance documentation style"
  - Photo 2 prompt: "realistic smartphone photo of a car hood crease and loose grille after front impact, daylight, close-up, no people, no license plate visible"
- If time is short, use any two clear vehicle damage photos from the local machine.

## Screen Recording Script

Start on `http://localhost:3000`.

### Step 1: Voice Intake

When the voice agent asks "What happened?", say this in a slightly stressed but clear voice:

```text
I was driving westbound on Karl-Marx-Allee near Strausberger Platz in Berlin when a silver Volkswagen Golf in front of me braked suddenly. I hit the back of their car at low speed. I am shaken, but nobody is hurt.
```

If the agent asks how many vehicles and people were involved, say:

```text
Two vehicles were involved. I was alone in my car, and the other driver was alone too.
```

If the agent asks where exactly, say:

```text
It happened at Karl-Marx-Allee and Strausberger Platz in Berlin.
```

If the agent asks direction and what the other driver did, say:

```text
I was going westbound. The other driver braked suddenly at the light and stopped before I could react.
```

If the agent asks visible damage, say:

```text
My front-left bumper is cracked, the hood has a crease, and the grille is loose. The other car has a scrape on the rear bumper.
```

Expected result:

- The agent should ask short, direct follow-up questions.
- It should not ramble.
- It should move to the camera step after collecting the required incident facts.
- If sentiment analysis makes the tone more direct because the voice sounds stressed, call that out during narration.

### Step 2: Damage Photos

Click `Open Camera` or use the file picker fallback.

Upload these two photos:
 
2. `.claude/demo-assets/hood-grille-damage.jpg`

Expected result:

- The photo grid should show two thumbnails.
- Continue to personal details.

### Step 3: Personal And Vehicle Details

Enter this exact information:

```text
Full name: Lena Hoffmann
Email address: malek.korashi@gmail.com
Policy number: AZ-DE-482913
Insurance provider: Allianz
Date of birth: 14/03/1992
Phone number: +49 151 2345 6789
Home address: Boxhagener Str. 21, 10245 Berlin
Licence plate: B-OR-2046
Vehicle make: Volkswagen
Vehicle model: Golf
Vehicle year: 2021
```

Click `Submit Claim`.

Expected result:

- Processing screen appears.
- Transcript, photo analysis, weather, repair pricing, fraud scoring, and report delivery steps progress.
- A low confidence or escalation result is acceptable. It means Pioneer/Gemini are producing a confidence decision instead of always approving.

### Step 4: Result Screen

On `Claim submitted`, show:

- Estimated repair cost if available.
- Photos pending state if no photos were uploaded.
- `Complete your claim` CTA.

Click `Complete your claim`.

### Step 5: FNOL Other Driver

Enter:

```text
Full name: Markus Weber
Licence number: DE-WB-882104
Phone: +49 170 9988 221
Insurance company: HUK-Coburg
Policy number: HUK-71-55092
Vehicle: 2019 Volkswagen Golf Silver
```

Click `Continue`.

### Step 6: Witnesses

Click `Add witness`.

Enter:

```text
Full name: Nora Klein
Phone: +49 176 4400 331
Statement: I saw the silver Golf brake suddenly at the light. The car behind it tried to stop but made contact with the rear bumper.
```

Click `Continue`.

### Step 7: Police Report

Toggle `Police report filed?` on.

Enter:

```text
Report number: POL-BE-2026-0418
Officer name: Officer Kruger
Police station: Berlin-Mitte Traffic Unit
```

Click `Continue`.

### Step 8: Review

Pause briefly on the review screen. Confirm the visible values match the script.

Click `Continue`.

### Step 9: Signature

Draw a simple signature. It does not need to be perfect.

Click `Continue`.

Expected result:

- The PDF preview is generated.
- Signature appears on the generated supplementary report.

### Step 10: PDF Preview And Email Submit

Pause on the PDF preview. Mention:

- The claim data was pulled from the voice intake and FNOL wizard.
- The signature is embedded.
- The email submission step attaches the generated PDF.

Click `Submit to Allianz`.

Expected result:

- Final screen says `FNOL Submitted`.
- If `RESEND_API_KEY` is configured, the email should be sent to the configured recipient in `src/app/api/fnol/submit/route.ts`.

## Low Confidence Alternate

If you want the AI confidence system to visibly flag risk, use this alternate visible damage answer during voice intake:

```text
The damage is mostly on the passenger side door, but I think I hit the other car from behind. I am not completely sure when the photos were taken.
```

Then upload front bumper photos. This intentional inconsistency may lower confidence or trigger escalation. That is acceptable for the demo if you explain that the system is detecting mismatch risk.

## Narration Points

Use these short phrases while recording:

- "The voice agent is collecting only the claim facts it needs."
- "Gradium handles speech-to-text and voice output."
- "ai-coustics provides stress and audio quality signals."
- "Gemini reviews the vehicle photos."
- "Tavily adds weather and local repair market context."
- "Pioneer produces the confidence score."
- "The FNOL wizard completes the insurer-ready paperwork."
- "The final PDF and email are generated from the structured claim."

