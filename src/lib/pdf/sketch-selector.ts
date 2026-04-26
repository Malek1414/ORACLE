// Sketch selector — picks the right vehicle diagram PNG for a given impact zone,
// then asks OpenAI to confirm the sizing fits the PDF's sketch box.
// Drop PNGs into public/png/ and paste the SKETCH_MANIFEST from ChatGPT into
// src/lib/pdf/sketch-manifest.ts — this file handles the rest automatically.

import * as fs from 'fs';
import * as path from 'path';
import { SKETCH_MANIFEST, SketchEntry } from './sketch-manifest';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface SelectedSketch {
  pngBytes: Buffer;
  pdfWidth: number;
  pdfHeight: number;
  zone: string;
  entry: SketchEntry;
}

/**
 * Select and size the best sketch PNG for the given impact zone.
 *
 * 1. Exact zone match from SKETCH_MANIFEST.
 * 2. Falls back to 'front' or 'unknown' if no exact match.
 * 3. If a sketchBoxWidth/Height is provided, asks OpenAI to compute the best
 *    scale so the image fits the box while preserving aspect ratio.
 * 4. If SKETCH_MANIFEST is empty (not yet generated), returns null.
 */
export async function selectSketch(
  zone: string,
  sketchBoxWidth: number,
  sketchBoxHeight: number,
  damageDescription?: string,
): Promise<SelectedSketch | null> {
  if (SKETCH_MANIFEST.length === 0) return null;

  // 1. Find best match
  let entry =
    SKETCH_MANIFEST.find((e) => e.zone === zone) ??
    SKETCH_MANIFEST.find((e) => e.zone === 'front') ??
    SKETCH_MANIFEST[0];

  // 2. Load PNG bytes
  const pngPath = path.join(process.cwd(), 'public', 'png', entry.filename);
  if (!fs.existsSync(pngPath)) return null;
  const pngBytes = fs.readFileSync(pngPath);

  // 3. Ask OpenAI to compute the best fit dimensions (only if box coords are known)
  let pdfWidth  = entry.suggestedPdfWidth;
  let pdfHeight = entry.suggestedPdfHeight;

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && sketchBoxWidth > 0 && sketchBoxHeight > 0) {
    try {
      const prompt =
        `A vehicle damage sketch PNG has natural dimensions ${entry.naturalWidth}x${entry.naturalHeight}px. ` +
        `It must fit inside a PDF box of ${sketchBoxWidth}x${sketchBoxHeight} points with 8pt padding on each side. ` +
        `The damage zone is "${zone}"` +
        (damageDescription ? ` and the description is: "${damageDescription}".` : '.') +
        ` Reply with ONLY a JSON object: {"width": <number>, "height": <number>} — ` +
        `the final PDF drawing dimensions in points, aspect ratio preserved, centred in the box.`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 60,
          temperature: 0,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
        if (parsed.width > 0 && parsed.height > 0) {
          pdfWidth  = parsed.width;
          pdfHeight = parsed.height;
        }
      }
    } catch { /* non-fatal — use suggestedPdfWidth/Height */ }
  } else {
    // No OpenAI key or box not yet mapped: fit manually
    if (sketchBoxWidth > 0 && sketchBoxHeight > 0) {
      const scale = Math.min(
        (sketchBoxWidth  - 16) / entry.naturalWidth,
        (sketchBoxHeight - 16) / entry.naturalHeight,
      );
      pdfWidth  = entry.naturalWidth  * scale;
      pdfHeight = entry.naturalHeight * scale;
    }
  }

  return { pngBytes, pdfWidth, pdfHeight, zone: entry.zone, entry };
}
