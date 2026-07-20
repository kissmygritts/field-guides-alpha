// Image processing for offline embedding.
// Rule: keep it light for a phone. Cap ~640px wide / ~720px tall, WebP q80,
// and re-encode anything still over ~120 KB at a lower quality. Everything ends
// up as a base64 data: URI — NO hotlinked URLs (a broken image with no signal
// is a failure).
import sharp from 'sharp';

export const MAXW = 640;
export const MAXH = 720;

// Buffer -> { b64, w, h, kb } as WebP, capped and quality-managed.
export async function toWebp(buf, { maxW = MAXW, maxH = MAXH, quality = 80, capKb = 120, minQuality = 68 } = {}) {
  const base = sharp(buf).rotate().resize({ width: maxW, height: maxH, fit: 'inside', withoutEnlargement: true });
  let q = quality;
  let out = await base.clone().webp({ quality: q, effort: 6 }).toBuffer({ resolveWithObject: true });
  // One trim pass if still heavy.
  if (out.data.length / 1024 > capKb) {
    q = minQuality;
    out = await base.clone().webp({ quality: q, effort: 6 }).toBuffer({ resolveWithObject: true });
  }
  return {
    b64: out.data.toString('base64'),
    w: out.info.width,
    h: out.info.height,
    kb: Math.round((out.data.length / 1024) * 10) / 10,
    quality: q,
  };
}

// Build a contact-sheet montage (JPEG) of candidate images for visual curation.
// tiles: [{buf, label}]. Returns a JPEG Buffer.
export async function contactSheet(tiles, { cols = 6, cw = 300, ch = 220 } = {}) {
  const rows = Math.ceil(tiles.length / cols);
  const canvas = sharp({ create: { width: cols * cw, height: rows * ch, channels: 3, background: { r: 20, g: 20, b: 16 } } });
  const composites = [];
  for (let i = 0; i < tiles.length; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    try {
      const thumb = await sharp(tiles[i].buf).resize({ width: cw - 8, height: ch - 26, fit: 'inside' }).jpeg().toBuffer();
      composites.push({ input: thumb, left: c * cw + 4, top: r * ch + 4 });
    } catch { /* skip unreadable */ }
    const label = Buffer.from(
      `<svg width="${cw}" height="20"><rect width="42" height="18" fill="black"/><text x="5" y="14" font-family="monospace" font-size="12" fill="#ffdc78">${tiles[i].label}</text></svg>`
    );
    composites.push({ input: label, left: c * cw + 4, top: r * ch + ch - 20 });
  }
  return canvas.composite(composites).jpeg({ quality: 82 }).toBuffer();
}
