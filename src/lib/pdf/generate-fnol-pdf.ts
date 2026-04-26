import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { ClaimObject } from '@/types/claim';
import { ALLIANZ_COORDS, COORDS_MAPPED } from './allianz-coords';
import { selectSketch } from './sketch-selector';

// ─── Impact zone ─────────────────────────────────────────────────────────────

type ImpactZone =
  | 'front' | 'front-left' | 'front-right'
  | 'rear'  | 'rear-left'  | 'rear-right'
  | 'left-side' | 'right-side'
  | 'hood' | 'grille' | 'unknown';

function parseImpactZone(
  damageLocation?: string,
  incidentDescription?: string,
  voiceTranscript?: string,
): ImpactZone {
  const t = [damageLocation, incidentDescription, voiceTranscript]
    .filter(Boolean).join(' ').toLowerCase();
  if (/front[-.\s]*left|left[-.\s]*front|driver[-.\s]*front/.test(t))   return 'front-left';
  if (/front[-.\s]*right|right[-.\s]*front|passenger[-.\s]*front/.test(t)) return 'front-right';
  if (/rear[-.\s]*left|left[-.\s]*rear/.test(t))   return 'rear-left';
  if (/rear[-.\s]*right|right[-.\s]*rear/.test(t)) return 'rear-right';
  if (/grille|grill/.test(t))  return 'grille';
  if (/\bhood\b/.test(t))       return 'hood';
  if (/\bfront\b/.test(t))      return 'front';
  if (/\b(rear|back)\b/.test(t)) return 'rear';
  if (/left.*side|driver.*side/.test(t))     return 'left-side';
  if (/right.*side|passenger.*side/.test(t)) return 'right-side';
  return 'unknown';
}

function drawVehicleSketch(
  page: PDFPage,
  cx: number,
  cy: number,
  zone: ImpactZone,
  bold: PDFFont,
  regular: PDFFont,
): void {
  const accent  = rgb(0.78, 0.12, 0.12);
  const bodyClr = rgb(0.25, 0.25, 0.25);
  const fillClr = rgb(0.94, 0.94, 0.94);
  const wheelClr = rgb(0.2, 0.2, 0.2);

  // ── car body ────────────────────────────────────────────────────────────
  const bW = 70; const bH = 130;
  const bX = cx - bW / 2; const bY = cy - bH / 2;
  page.drawRectangle({ x: bX, y: bY, width: bW, height: bH,
    color: fillClr, borderColor: bodyClr, borderWidth: 1.5 });

  // windscreen lines
  page.drawLine({ start: { x: bX + 10, y: bY + bH - 24 }, end: { x: bX + bW - 10, y: bY + bH - 24 }, thickness: 1, color: bodyClr });
  page.drawLine({ start: { x: bX + 10, y: bY + 20 },       end: { x: bX + bW - 10, y: bY + 20 },       thickness: 1, color: bodyClr });

  // ── wheels ───────────────────────────────────────────────────────────────
  const wW = 14; const wH = 28; const wGap = 5;
  const flX = bX - wGap - wW; const flY = bY + bH - 12 - wH; // front-left
  const frX = bX + bW + wGap;  const frY = flY;               // front-right
  const rlX = flX;              const rlY = bY + 12;           // rear-left
  const rrX = frX;              const rrY = rlY;               // rear-right
  for (const [wx, wy] of [[flX, flY],[frX, frY],[rlX, rlY],[rrX, rrY]] as [number,number][]) {
    page.drawRectangle({ x: wx, y: wy, width: wW, height: wH, color: wheelClr, borderColor: bodyClr, borderWidth: 1 });
  }

  // ── direction labels ─────────────────────────────────────────────────────
  page.drawText('FRONT', { x: cx - 14, y: bY + bH + 8,   size: 7, font: bold, color: bodyClr });
  page.drawText('REAR',  { x: cx - 11, y: bY - 19,        size: 7, font: bold, color: bodyClr });
  page.drawText('L',     { x: flX - 14, y: cy - 4,        size: 7, font: bold, color: bodyClr });
  page.drawText('R',     { x: frX + wW + 3, y: cy - 4,    size: 7, font: bold, color: bodyClr });

  // ── impact zone coordinates ───────────────────────────────────────────────
  const ZONES: Record<ImpactZone, [number, number]> = {
    'front':       [cx, bY + bH],
    'front-left':  [flX, flY + wH / 2],
    'front-right': [frX + wW, frY + wH / 2],
    'rear':        [cx, bY],
    'rear-left':   [rlX, rlY + wH / 2],
    'rear-right':  [rrX + wW, rrY + wH / 2],
    'left-side':   [bX, cy],
    'right-side':  [bX + bW, cy],
    'hood':        [cx, bY + bH - 14],
    'grille':      [cx, bY + bH + 2],
    'unknown':     [cx, bY + bH],
  };
  const [ix, iy] = ZONES[zone];

  // impact marker
  page.drawEllipse({ x: ix, y: iy, xScale: 6, yScale: 6, color: accent });

  // ── arrow from label to impact ────────────────────────────────────────────
  const label = zone === 'unknown' ? 'Point of impact: unknown' : `Point of impact: ${zone}`;
  const lx = cx + 55; const ly = cy + 20;
  page.drawText(label, { x: lx, y: ly, size: 8, font: bold, color: accent });

  const ax0 = lx - 3; const ay0 = ly + 3;
  page.drawLine({ start: { x: ax0, y: ay0 }, end: { x: ix, y: iy }, thickness: 1.5, color: accent });
  const ang = Math.atan2(iy - ay0, ix - ax0);
  const hs = 6;
  page.drawLine({ start: { x: ix, y: iy }, end: { x: ix - hs * Math.cos(ang - Math.PI / 6), y: iy - hs * Math.sin(ang - Math.PI / 6) }, thickness: 1.5, color: accent });
  page.drawLine({ start: { x: ix, y: iy }, end: { x: ix - hs * Math.cos(ang + Math.PI / 6), y: iy - hs * Math.sin(ang + Math.PI / 6) }, thickness: 1.5, color: accent });

  // secondary label below sketch (fallback confidence note)
  if (zone === 'unknown') {
    page.drawText('Impact location could not be determined from available data.', {
      x: cx - 100, y: bY - 30, size: 7, font: regular, color: rgb(0.5, 0.5, 0.5),
    });
  }
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;
const COL_W = (PAGE_W - MARGIN * 2 - 16) / 2;

function toBase64(dataUrl: string): { data: Uint8Array; type: 'png' | 'jpeg' } {
  const [header, b64] = dataUrl.split(',');
  const type = header.includes('png') ? 'png' : 'jpeg';
  return { data: Buffer.from(b64, 'base64'), type };
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generateFnolPdf(
  claim: ClaimObject,
  signatureDataUrl: string | null
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ─── Page 1: Allianz template + coordinate overlay ──────────────────────
  let templatePage: PDFPage | null = null;
  try {
    const templatePath = path.join(process.cwd(), 'public', 'Allianz.pdf');
    const templateBytes = fs.readFileSync(templatePath);
    const templateDoc = await PDFDocument.load(templateBytes);
    const [embedded] = await pdfDoc.copyPages(templateDoc, [0]);
    pdfDoc.addPage(embedded);
    templatePage = pdfDoc.getPage(0);
  } catch {
    const cover = pdfDoc.addPage([PAGE_W, PAGE_H]);
    cover.drawText('ALLIANZ – FIRST NOTICE OF LOSS', {
      x: MARGIN, y: PAGE_H / 2, size: 18, font: bold, color: rgb(0, 0.4, 0.8),
    });
    templatePage = cover;
  }

  // Overlay personal + incident data onto page 1 once ChatGPT coords are pasted in.
  // Until then COORDS_MAPPED is false and this block is skipped — no breakage.
  if (COORDS_MAPPED && templatePage) {
    const C = ALLIANZ_COORDS;
    const ov = (coord: { x: number; y: number; maxWidth: number }, value: string | null | undefined) => {
      if (!value || coord.x === 0) return;
      templatePage!.drawText(value, { x: coord.x, y: coord.y, size: 9, font: regular, color: rgb(0, 0, 0), maxWidth: coord.maxWidth });
    };
    const vehicle = [claim.vehicle_year, claim.vehicle_make, claim.vehicle_model].filter(Boolean).join(' ');
    ov(C.claimantName,         claim.user?.name);
    ov(C.dateOfBirth,          claim.dob);
    ov(C.address,              claim.address);
    ov(C.phone,                claim.phone);
    ov(C.email,                claim.user?.email);
    ov(C.policyNumber,         claim.user?.policy_number);
    ov(C.insurer,              claim.user?.insurer);
    ov(C.licencePlate,         claim.licence_plate);
    ov(C.vehicleMakeModelYear, vehicle || null);
    ov(C.incidentDate,         claim.incident?.timestamp ? new Date(claim.incident.timestamp).toLocaleDateString('en-GB') : null);
    ov(C.incidentLocation,     claim.incident?.location?.address);
    ov(C.incidentDescription,  claim.incident?.description);
    ov(C.otherDriverName,      claim.other_driver?.name);
    ov(C.otherDriverLicence,   claim.other_driver?.licence);
    ov(C.otherDriverPhone,     claim.other_driver?.phone);
    ov(C.otherDriverInsurer,   claim.other_driver?.insurer);
    ov(C.otherDriverVehicle,   claim.other_driver?.vehicle);
    ov(C.witnessName,          claim.witnesses?.[0]?.name);
    ov(C.witnessPhone,         claim.witnesses?.[0]?.phone);
    ov(C.policeReportNumber,   claim.police_report?.report_number);
  }

  // ─── Page 2: FNOL data ─────────────────────────────────────────────────────
  // currentPage tracks which page we are currently writing to.
  // When y would go below the safe margin, a new page is created automatically.
  let currentPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  function ensurePage(neededPts = 20) {
    if (y < MARGIN + neededPts) {
      currentPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  }

  const drawHeader = (text: string) => {
    ensurePage(30);
    currentPage.drawRectangle({
      x: MARGIN, y: y - 4, width: PAGE_W - MARGIN * 2, height: 20,
      color: rgb(0, 0.38, 0.75), opacity: 0.9,
    });
    currentPage.drawText(text.toUpperCase(), {
      x: MARGIN + 6, y, font: bold, size: 10, color: rgb(1, 1, 1),
    });
    y -= 28;
  };

  const drawRow = (label: string, value: string | null | undefined, x = MARGIN, width = PAGE_W - MARGIN * 2) => {
    if (!value) return;
    ensurePage(15);
    const labelW = bold.widthOfTextAtSize(label + ': ', 9);
    currentPage.drawText(label + ': ', {
      x, y, font: bold, size: 9, color: rgb(0.3, 0.3, 0.3),
    });
    // Word-wrap value — continuation lines align under the value start
    const maxW = width - labelW - 4;
    const words = value.split(' ');
    let line = '';
    let firstLine = true;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (regular.widthOfTextAtSize(test, 9) > maxW && line) {
        currentPage.drawText(line, { x: x + labelW + 4, y, font: regular, size: 9, color: rgb(0, 0, 0) });
        line = word;
        y -= 13;
        firstLine = false;
        ensurePage(13);
      } else {
        line = test;
      }
    }
    if (line) {
      if (!firstLine) ensurePage(13);
      currentPage.drawText(line, { x: firstLine ? x + labelW + 4 : x + labelW + 4, y, font: regular, size: 9, color: rgb(0, 0, 0) });
    }
    y -= 15;
  };

  const gap = () => { y -= 6; };

  // Title
  page.drawText('FIRST NOTICE OF LOSS – SUPPLEMENTARY REPORT', {
    x: MARGIN, y, font: bold, size: 13, color: rgb(0, 0.38, 0.75),
  });
  y -= 8;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1.5, color: rgb(0, 0.38, 0.75) });
  y -= 20;

  // Meta
  const claimDate = claim.created_at ? new Date(claim.created_at).toLocaleDateString('en-GB') : '';
  drawRow('Claim Reference', claim.id.substring(0, 8).toUpperCase());
  drawRow('Date', claimDate);
  drawRow('Policy Number', claim.user?.policy_number);
  drawRow('Insurer', claim.user?.insurer);
  gap();

  // ─── Section A: Claimant ───────────────────────────────────────────────────
  drawHeader('A – Claimant Details');
  drawRow('Full Name',        claim.user?.name);
  drawRow('Date of Birth',    claim.dob);
  drawRow('Address',          claim.address);
  drawRow('Phone',            claim.phone);
  drawRow('Email',            claim.user?.email);
  drawRow('Licence Plate',    claim.licence_plate);
  drawRow('Vehicle',          [claim.vehicle_year, claim.vehicle_make, claim.vehicle_model].filter(Boolean).join(' ') || null);
  gap();

  // ─── Section B: Incident ──────────────────────────────────────────────────
  drawHeader('B – Incident');
  const inc = claim.incident;
  drawRow('Date / Time',      inc?.timestamp ? new Date(inc.timestamp).toLocaleString('en-GB') : null);
  drawRow('Location',         inc?.location?.address);
  drawRow('Description',      inc?.description);
  drawRow('Type',             inc?.incident_type?.replace(/_/g, ' '));
  gap();

  // ─── Section C: Other Driver ──────────────────────────────────────────────
  const od = claim.other_driver;
  if (od?.name || od?.vehicle) {
    drawHeader('C – Other Driver');
    drawRow('Name',           od.name);
    drawRow('Licence',        od.licence);
    drawRow('Phone',          od.phone);
    drawRow('Insurer',        od.insurer);
    drawRow('Policy No.',     od.policy_number);
    drawRow('Vehicle',        od.vehicle);
    gap();
  }

  // ─── Section D: Witnesses ─────────────────────────────────────────────────
  const witnesses = claim.witnesses ?? [];
  if (witnesses.length > 0) {
    drawHeader('D – Witnesses');
    witnesses.forEach((w, i) => {
      drawRow(`Witness ${i + 1}`, `${w.name}${w.phone ? '  ' + w.phone : ''}`);
      if (w.statement) drawRow('Statement', w.statement);
    });
    gap();
  }

  // ─── Section E: Police Report ─────────────────────────────────────────────
  const pr = claim.police_report;
  if (pr) {
    drawHeader('E – Police Report');
    drawRow('Filed',          pr.filed ? 'Yes' : 'No');
    if (pr.filed) {
      drawRow('Report Number', pr.report_number);
      drawRow('Officer',       pr.officer_name);
      drawRow('Station',       pr.station);
    }
    gap();
  }

  // ─── Section F: Damage Analysis ──────────────────────────────────────────
  const da = claim.damage_analysis;
  if (da) {
    drawHeader('F – Damage Assessment');
    drawRow('Severity',       da.severity?.replace(/_/g, ' '));
    drawRow('Location',       da.damage_location);
    const cost = da.estimated_repair_cost;
    if (cost?.min != null) {
      drawRow('Est. Repair Cost', `${cost.currency ?? 'USD'} ${cost.min.toLocaleString()} – ${cost.max.toLocaleString()}`);
    }
    drawRow('Details', da.damage_details?.join(', '));
    gap();
  }

  // ─── Section G: Vehicle Sketch ────────────────────────────────────────────
  const zone = parseImpactZone(
    da?.damage_location,
    inc?.description,
    claim.voice?.transcript ?? undefined,
  );

  // PNG sketch box from coords (populated after ChatGPT analysis), else zero = fallback
  const sBox = COORDS_MAPPED ? ALLIANZ_COORDS.sketchBox : { x: 0, y: 0, width: 0, height: 0 };
  const sketch = await selectSketch(
    zone, sBox.width, sBox.height,
    da?.damage_location ?? inc?.description,
  );

  const sketchTargetPage = y >= 240 ? page : pdfDoc.addPage([PAGE_W, PAGE_H]);
  if (sketchTargetPage !== page) {
    sketchTargetPage.drawText('G – VEHICLE DAMAGE SKETCH', {
      x: MARGIN, y: PAGE_H - MARGIN - 10, size: 10, font: bold, color: rgb(0, 0.38, 0.75),
    });
  } else {
    drawHeader('G – Vehicle Damage Sketch');
  }

  if (sketch) {
    try {
      const img = await pdfDoc.embedPng(sketch.pngBytes);
      const px = COORDS_MAPPED && sBox.x > 0
        ? sBox.x + (sBox.width  - sketch.pdfWidth)  / 2
        : (PAGE_W - sketch.pdfWidth)  / 2;
      const py = COORDS_MAPPED && sBox.y > 0
        ? sBox.y + (sBox.height - sketch.pdfHeight) / 2
        : y - sketch.pdfHeight - 10;
      sketchTargetPage.drawImage(img, { x: px, y: py, width: sketch.pdfWidth, height: sketch.pdfHeight });
      sketchTargetPage.drawText(`Point of impact: ${zone}`, {
        x: px, y: py - 14, size: 8, font: bold, color: rgb(0.78, 0.12, 0.12),
      });
      if (sketchTargetPage === page) y -= (sketch.pdfHeight + 30);
    } catch {
      // PNG embed failed — fall back to vector sketch
      const cy = sketchTargetPage === page ? y - 90 : PAGE_H / 2 + 30;
      drawVehicleSketch(sketchTargetPage, PAGE_W / 2, cy, zone, bold, regular);
      if (sketchTargetPage === page) y -= 200;
    }
  } else {
    // No PNGs yet — use existing vector sketch
    const cy = sketchTargetPage === page ? y - 90 : PAGE_H / 2 + 30;
    drawVehicleSketch(sketchTargetPage, PAGE_W / 2, cy, zone, bold, regular);
    if (sketchTargetPage === page) y -= 200;
  }
  gap();

  // ─── Section H: Signature ────────────────────────────────────────────────
  if (signatureDataUrl && y > 120) {
    // Leave room for signature block
    const sigBoxH = Math.min(100, y - MARGIN - 40);
    const sigBoxW = 220;
    const sigBoxX = PAGE_W - MARGIN - sigBoxW;
    const sigBoxY = y - sigBoxH;

    page.drawText('Claimant Signature:', { x: sigBoxX, y: sigBoxY + sigBoxH + 8, font: bold, size: 9, color: rgb(0.3, 0.3, 0.3) });
    page.drawRectangle({ x: sigBoxX, y: sigBoxY, width: sigBoxW, height: sigBoxH, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1 });

    try {
      const { data, type } = toBase64(signatureDataUrl);
      const sigImg = type === 'png'
        ? await pdfDoc.embedPng(data)
        : await pdfDoc.embedJpg(data);
      const scale = Math.min(sigBoxW / sigImg.width, sigBoxH / sigImg.height) * 0.9;
      const iw = sigImg.width * scale;
      const ih = sigImg.height * scale;
      page.drawImage(sigImg, {
        x: sigBoxX + (sigBoxW - iw) / 2,
        y: sigBoxY + (sigBoxH - ih) / 2,
        width: iw,
        height: ih,
      });
    } catch {}
  }

  // Footer
  const footerY = MARGIN - 10;
  page.drawLine({ start: { x: MARGIN, y: footerY + 16 }, end: { x: PAGE_W - MARGIN, y: footerY + 16 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  page.drawText(`Generated by ORACLE Claims Platform  ·  ${new Date().toLocaleDateString('en-GB')}`, {
    x: MARGIN, y: footerY, font: regular, size: 7.5, color: rgb(0.5, 0.5, 0.5),
  });

  return pdfDoc.save();
}
