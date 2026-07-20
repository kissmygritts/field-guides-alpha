// sheet.mjs — build contact-sheet montages from downloaded candidates so you can
// eyeball and curate. One JPEG per stop; each tile is numbered to match the index
// in work/index.json (that number is what you reference in selections.json).
//
//   node build/sheet.mjs <slug>
//   -> guides/<slug>/sheets/<stop>.jpg   (Read these, pick frames, write selections.json)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contactSheet } from './lib/images.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const slug = process.argv[2];
if (!slug) { console.error('usage: node build/sheet.mjs <slug>'); process.exit(2); }

const dir = path.resolve(__dirname, '..', 'guides', slug);
const workDir = path.join(dir, 'work');
const outDir = path.join(dir, 'sheets');
fs.mkdirSync(outDir, { recursive: true });

// work/index.json rows are [NN, ref, source, title]; map NN -> source letter so
// each tile is labeled e.g. "07u" (Unsplash), "12f" (Flickr), "03w" (Wikimedia).
let index = {};
try { index = JSON.parse(fs.readFileSync(path.join(workDir, 'index.json'), 'utf8')); } catch { /* no source labels */ }

const stops = fs.readdirSync(workDir).filter((d) => fs.statSync(path.join(workDir, d)).isDirectory());
for (const stop of stops) {
  const srcByN = Object.fromEntries((index[stop] || []).map(([n, , s]) => [n, (s || '')[0] || '']));
  const files = fs.readdirSync(path.join(workDir, stop)).filter((f) => f.endsWith('.jpg')).sort();
  if (!files.length) continue;
  const tiles = files.map((f) => {
    const nn = f.split('.')[0];
    return { buf: fs.readFileSync(path.join(workDir, stop, f)), label: nn + (srcByN[Number(nn)] || '') };
  });
  fs.writeFileSync(path.join(outDir, stop + '.jpg'), await contactSheet(tiles));
  console.log(`sheets/${stop}.jpg  (${files.length} candidates)`);
}
