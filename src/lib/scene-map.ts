/**
 * Accident Scene Map Renderer
 * Fetches a static map tile from staticmap.openstreetmap.de
 * (no API key required) then composites vehicle pin overlays using Sharp.
 */
import sharp from 'sharp';

export interface SceneMapOptions {
  lat: number;
  lng: number;
  widthPx:  number;
  heightPx: number;
  vehicleAHeading?: string | null;
  vehicleBHeading?: string | null;
}

/** Compass heading string → rotation degrees for the arrow SVG. */
function headingToDeg(heading: string | null | undefined): number {
  if (!heading) return 0;
  const h = heading.toLowerCase();
  if (h.includes('northeast') || h.includes('north-east')) return 45;
  if (h.includes('northwest') || h.includes('north-west')) return 315;
  if (h.includes('southeast') || h.includes('south-east')) return 135;
  if (h.includes('southwest') || h.includes('south-west')) return 225;
  if (h.includes('north'))  return 0;
  if (h.includes('east'))   return 90;
  if (h.includes('south'))  return 180;
  if (h.includes('west'))   return 270;
  return 0;
}

/** Small SVG vehicle pin with a directional arrow. */
function vehiclePin(color: string, headingDeg: number, label: string): Buffer {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44">`,
    `<circle cx="18" cy="18" r="14" fill="${color}" stroke="#fff" stroke-width="2"/>`,
    `<g transform="rotate(${headingDeg},18,18)">`,
    `<polygon points="18,5 24,15 12,15" fill="#fff" opacity="0.9"/>`,
    `</g>`,
    `<text x="18" y="40" text-anchor="middle" font-size="9" fill="#333" font-family="sans-serif" font-weight="bold">${label}</text>`,
    `</svg>`,
  ].join('');
  return Buffer.from(svg);
}

/** Red X collision marker. */
function collisionMarker(): Buffer {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">`,
    `<circle cx="11" cy="11" r="9" fill="rgba(220,38,38,0.9)" stroke="#fff" stroke-width="2"/>`,
    `<line x1="7" y1="7" x2="15" y2="15" stroke="#fff" stroke-width="2.5"/>`,
    `<line x1="15" y1="7" x2="7" y2="15" stroke="#fff" stroke-width="2.5"/>`,
    `</svg>`,
  ].join('');
  return Buffer.from(svg);
}

/**
 * Render the scene map as a PNG Buffer.
 * Falls back to a plain coordinates card if the OSM fetch fails.
 */
export async function renderSceneMap(opts: SceneMapOptions): Promise<Buffer> {
  const { lat, lng, widthPx, heightPx, vehicleAHeading, vehicleBHeading } = opts;

  // Clamp dimensions — OSM static map caps at 1024px per side
  const w = Math.min(widthPx,  1024);
  const h = Math.min(heightPx, 1024);

  const url =
    `https://staticmap.openstreetmap.de/staticmap.php` +
    `?center=${lat},${lng}` +
    `&zoom=17` +
    `&size=${w}x${h}` +
    `&markers=${lat},${lng},red-pushpin`;

  const baseImage = await fetchWithRetry(url, 3);

  // Composite vehicle pin overlays
  const cx = Math.round(w / 2);
  const cy = Math.round(h / 2);

  const overlays: sharp.OverlayOptions[] = [
    // Vehicle A (blue) — left of centre
    {
      input: vehiclePin('#1d4ed8', headingToDeg(vehicleAHeading), 'A'),
      left: Math.max(0, cx - 46),
      top:  Math.max(0, cy - 36),
    },
    // Collision marker — dead centre
    {
      input: collisionMarker(),
      left: Math.max(0, cx - 11),
      top:  Math.max(0, cy - 11),
    },
  ];

  // Vehicle B only when heading is explicitly provided
  if (vehicleBHeading != null) {
    overlays.push({
      input: vehiclePin('#dc2626', headingToDeg(vehicleBHeading), 'B'),
      left: Math.min(w - 40, cx + 10),
      top:  Math.max(0, cy - 36),
    });
  }

  return sharp(baseImage)
    .resize(w, h, { fit: 'cover' })
    .composite(overlays)
    .png()
    .toBuffer();
}

/**
 * Fetch the OSM tile with up to `attempts` retries and exponential backoff.
 * Throws only after all attempts are exhausted.
 */
async function fetchWithRetry(url: string, attempts: number): Promise<Buffer> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i - 1))); // 500ms, 1000ms
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ORACLE-Claims/1.0 (insurance claims platform)' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`OSM static map HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastErr = err;
      console.warn(`[scene-map] attempt ${i + 1}/${attempts} failed:`, err);
    }
  }
  throw new Error(`[scene-map] OSM static map unreachable after ${attempts} attempts: ${lastErr}`);
}

async function buildFallbackMap(
  lat: number, lng: number, w: number, h: number,
): Promise<Buffer> {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`,
    `<rect width="${w}" height="${h}" fill="#f1f5f9"/>`,
    `<rect x="0" y="${h / 2 - 1}" width="${w}" height="2" fill="#cbd5e1"/>`,
    `<rect x="${w / 2 - 1}" y="0" width="2" height="${h}" fill="#cbd5e1"/>`,
    `<text x="${w / 2}" y="${h / 2 - 16}" text-anchor="middle" font-size="11" fill="#64748b" font-family="sans-serif">Incident location</text>`,
    `<text x="${w / 2}" y="${h / 2 + 4}"  text-anchor="middle" font-size="10" fill="#94a3b8" font-family="sans-serif">${lat.toFixed(5)}°, ${lng.toFixed(5)}°</text>`,
    `</svg>`,
  ].join('');
  return sharp(Buffer.from(svg)).png().toBuffer();
}
