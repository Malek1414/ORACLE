/**
 * Damage Diagram Renderer
 * Composites red impact markers onto the vehicle silhouette SVG
 * for each damage zone returned by Gemini analysis.
 * Output: PNG Buffer sized to fit the target bounding box.
 */
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

// Zone ID -> centroid pixel on the 140x220 vehicle SVG
const ZONE_CENTROIDS: Record<string, [number, number]> = {
  'front-center':       [70,  20],
  'front-left':         [18,  52],
  'front-right':        [122, 52],
  'rear-center':        [70,  200],
  'rear-left':          [18,  165],
  'rear-right':         [122, 165],
  'driver-door':        [18,  100],
  'passenger-door':     [122, 100],
  'driver-rear-door':   [18,  130],
  'passenger-rear-door':[122, 130],
  'roof':               [70,  110],
  'hood':               [70,  38],
  'trunk':              [70,  180],
};

/**
 * Build a red circular impact marker SVG string centred at (cx, cy)
 * with radius r, rendered at scale factor s.
 */
function impactMarker(cx: number, cy: number, r = 10, opacity = 0.85): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cx * 2}" height="${cy * 2}">` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(204,17,17,${opacity})" stroke="#fff" stroke-width="1.5"/>` +
    `</svg>`
  );
}

/**
 * Renders the vehicle silhouette with impact markers for each zone.
 * @param damageZones - array of zone IDs from ZONE_CENTROIDS
 * @param boxWidth    - target PNG width in pixels
 * @param boxHeight   - target PNG height in pixels
 * @returns PNG Buffer
 */
export async function renderDamageDiagram(
  damageZones: string[],
  boxWidth = 200,
  boxHeight = 220,
): Promise<Buffer> {
  const svgPath = path.join(process.cwd(), 'src', 'assets', 'vehicle-top-view.svg');
  const svgSrc  = fs.existsSync(svgPath) ? fs.readFileSync(svgPath, 'utf8') : null;

  // Scale the 140x220 SVG to fit the requested box (preserve aspect ratio)
  const BASE_W = 140;
  const BASE_H = 220;
  const scale  = Math.min((boxWidth - 16) / BASE_W, (boxHeight - 16) / BASE_H);
  const scaledW = Math.round(BASE_W * scale);
  const scaledH = Math.round(BASE_H * scale);

  // Start with the base vehicle silhouette
  let base: sharp.Sharp;
  if (svgSrc) {
    base = sharp(Buffer.from(svgSrc)).resize(scaledW, scaledH);
  } else {
    // Fallback: plain white rectangle
    base = sharp({ create: { width: scaledW, height: scaledH, channels: 4, background: { r: 240, g: 240, b: 240, alpha: 1 } } });
  }

  // Composite an impact marker for each damaged zone
  const overlays: sharp.OverlayOptions[] = [];
  const validZones = damageZones.filter((z) => z in ZONE_CENTROIDS);

  for (const zone of validZones) {
    const [bx, by] = ZONE_CENTROIDS[zone];
    const px = Math.round(bx * scale);
    const py = Math.round(by * scale);
    const r  = Math.round(10 * scale);
    const markerSize = r * 2 + 4;

    // Build a tiny SVG marker centred at (markerSize/2, markerSize/2)
    const half = markerSize / 2;
    const markerSvg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${markerSize}" height="${markerSize}">`,
      `<circle cx="${half}" cy="${half}" r="${r}" fill="rgba(204,17,17,0.85)" stroke="#fff" stroke-width="1.5"/>`,
      `</svg>`,
    ].join('');

    overlays.push({
      input: Buffer.from(markerSvg),
      left: Math.max(0, px - Math.round(half)),
      top:  Math.max(0, py - Math.round(half)),
    });
  }

  // If no valid zones, add a "?" marker in the centre
  if (overlays.length === 0) {
    const noZoneSvg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">`,
      `<circle cx="12" cy="12" r="10" fill="rgba(150,150,150,0.5)" stroke="#999" stroke-width="1"/>`,
      `<text x="12" y="16" text-anchor="middle" font-size="12" fill="#555" font-family="sans-serif">?</text>`,
      `</svg>`,
    ].join('');
    overlays.push({
      input: Buffer.from(noZoneSvg),
      left: Math.round(scaledW / 2) - 12,
      top:  Math.round(scaledH / 2) - 12,
    });
  }

  // Produce final PNG on white background, centred in the box
  const offsetX = Math.round((boxWidth  - scaledW) / 2);
  const offsetY = Math.round((boxHeight - scaledH) / 2);

  const vehiclePng = await base
    .png()
    .composite(overlays)
    .toBuffer();

  return sharp({
    create: { width: boxWidth, height: boxHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: vehiclePng, left: offsetX, top: offsetY }])
    .png()
    .toBuffer();
}
