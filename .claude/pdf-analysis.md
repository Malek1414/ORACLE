# PDF Analysis And FNOL Verification

This file tells Claude how to validate and improve the PDF/FNOL part of ORACLE.

## Goal

Make sure the PDF flow:

1. Pulls the correct claim data.
2. Places each value in the correct visible area or field.
3. Embeds the claimant signature.
4. Draws a vehicle damage sketch.
5. Draws an arrow pointing to the correct point of impact.
6. Generates a preview before final email submission.
7. Sends the same PDF as an email attachment.

## Current Implementation

Main generator:

```text
src/lib/pdf/generate-fnol-pdf.ts
```

Routes:

```text
src/app/api/fnol/generate-pdf/route.ts
src/app/api/fnol/submit/route.ts
```

Template:

```text
public/Allianz.pdf
```

Field inspection helper:

```text
scripts/inspect-pdf-fields.ts
```

I want the generator to file in the 1 page format of the FNOL-report so that it is admissable by Allianz.

## First Inspection

Inspect `public/Allianz.pdf`:

```bash
npx tsx scripts/inspect-pdf-fields.ts
```

If `tsx` is unavailable, either install a dev runner or temporarily run a JS equivalent. Do not commit unnecessary tooling unless it is useful.

Record:

- Total AcroForm fields.
- Field names.
- Field types.
- Whether the Allianz PDF is fillable or just a visual template.

## If The PDF Has AcroForm Fields

Use `pdfDoc.getForm()` and map claim values to fields.

Create a mapping table:

```ts
const FIELD_MAP = {
  claimantName: "...actual Allianz field name...",
  policyNumber: "...",
  incidentDate: "...",
  incidentLocation: "...",
  vehiclePlate: "...",
  signature: "..."
};
```

Then fill fields with:

```ts
form.getTextField(fieldName).setText(value);
```

Flatten the form only after visual verification:

```ts
form.flatten();
```

## If The PDF Is Not Fillable

Use coordinate overlays. Create named coordinates instead of magic numbers:

```ts
const ALLIANZ_COORDS = {
  claimantName: { page: 0, x: 120, y: 710 },
  policyNumber: { page: 0, x: 120, y: 684 },
  incidentDate: { page: 0, x: 120, y: 650 },
  incidentLocation: { page: 0, x: 120, y: 624 },
  vehiclePlate: { page: 0, x: 120, y: 598 }
};
```

Add a debug mode that draws small red boxes around target areas. Disable debug mode by default.

## Required Claim Data Mapping

Verify these values appear in the generated PDF:

- Claim reference: `claim.id.substring(0, 8).toUpperCase()`
- Claimant full name: `claim.user.name`
- Policy number: `claim.user.policy_number`
- Insurer: `claim.user.insurer`
- Email: `claim.user.email`
- Date of birth: `claim.dob`
- Phone: `claim.phone`
- Address: `claim.address`
- Licence plate: `claim.licence_plate`
- Vehicle: `claim.vehicle_year`, `claim.vehicle_make`, `claim.vehicle_model`
- Incident timestamp: `claim.incident.timestamp`
- Incident location: `claim.incident.location.address`
- Incident description: `claim.incident.description`
- Other driver: `claim.other_driver`
- Witnesses: `claim.witnesses`
- Police report: `claim.police_report`
- Damage severity: `claim.damage_analysis.severity`
- Damage location: `claim.damage_analysis.damage_location`
- Estimated repair cost: `claim.damage_analysis.estimated_repair_cost`
- Signature: `signatureDataUrl`

## Vehicle Sketch Requirement

Add a simple top-down or three-quarter vehicle diagram to the PDF. It does not need to be photorealistic. It needs to clearly show:

- vehicle outline
- front
- rear
- left side
- right side
- point of impact
- arrow pointing at point of impact
- text label like `Point of impact: front-left bumper`

Use `pdf-lib` drawing primitives:

- `drawRectangle`
- `drawLine`
- `drawEllipse`
- `drawText`

Do not use a heavy rendering dependency unless needed.

## Impact Location Parser

Create a helper:

```ts
type ImpactZone =
  | "front"
  | "front-left"
  | "front-right"
  | "rear"
  | "rear-left"
  | "rear-right"
  | "left-side"
  | "right-side"
  | "hood"
  | "grille"
  | "unknown";
```

Parse from:

```text
claim.damage_analysis.damage_location
claim.incident.description
claim.voice.transcript
```

Examples:

```text
"front-left bumper, hood, grille assembly" -> front-left
"rear bumper scrape" -> rear
"passenger side door" -> right-side for US/EU left-hand-drive context, but mark as uncertain
```

If uncertain, draw the arrow to the closest known zone and label the confidence:

```text
Point of impact: likely front-left bumper
```

## Arrow Drawing

Draw a line from the label to the impact coordinate. Add a small arrowhead.

Pseudo-code:

```ts
function drawArrow(page, from, to) {
  page.drawLine({ start: from, end: to, thickness: 2, color });
  page.drawLine({ start: to, end: arrowHeadA, thickness: 2, color });
  page.drawLine({ start: to, end: arrowHeadB, thickness: 2, color });
}
```

Coordinates should be tested visually on the PDF preview.

## Test Claim

Use this claim data for PDF verification:

```text
Claimant: Lena Hoffmann
Policy: AZ-DE-482913
Insurer: Allianz
DOB: 14/03/1992
Phone: +49 151 2345 6789
Address: Boxhagener Str. 21, 10245 Berlin
Plate: B-OR-2046
Vehicle: 2021 Volkswagen Golf
Incident: Low speed rear-end collision at Karl-Marx-Allee and Strausberger Platz, Berlin
Damage: front-left bumper cracked, hood creased, grille loose
Other driver: Markus Weber
Witness: Nora Klein
Police report: POL-BE-2026-0418
```

Expected sketch:

- Arrow should point to front-left bumper or front/hood area.
- Label should match front-left bumper.

## Visual QA Checklist

Open the generated PDF preview and check:

- No text overlaps.
- Long address wraps cleanly.
- Claimant data is not placed under other-driver labels.
- Witness statement is visible and readable.
- Police report fields appear only when filed is true.
- Signature is inside the signature box.
- Sketch is not cropped.
- Arrow points to the correct vehicle zone.
- Damage label matches Gemini output.
- PDF preview and emailed PDF match.

## Email QA

In `src/app/api/fnol/submit/route.ts`, verify:

- Same generator is used as preview.
- Attachment filename is stable: `fnol-CLAIMID.pdf`.
- Claim reference appears in subject.
- Recipient is intentionally configured. Avoid hardcoding a personal email for production.
- Errors from Resend are surfaced clearly in the UI.

## Acceptance Criteria

This part is complete when:

- `POST /api/fnol/generate-pdf` returns a visually correct PDF.
- `POST /api/fnol/submit` sends an email with the same PDF.
- The PDF contains all entered FNOL fields.
- The PDF contains a signature.
- The PDF contains a vehicle sketch and impact arrow.
- The impact arrow matches the claim damage text.

