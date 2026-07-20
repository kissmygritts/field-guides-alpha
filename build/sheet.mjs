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

const stops = fs.readdirSync(workDir).filter((d) => fs.statSync(path.join(workDir, d)).isDirectory());
for (const stop of stops) {
  const files = fs.readdirSync(path.join(workDir, stop)).filter((f) => f.endsWith('.jpg')).sort();
  if (!files.length) continue;
  const tiles = files.map((f) => ({ buf: fs.readFileSync(path.join(workDir, stop, f)), label: f.split('.')[0] }));
  fs.writeFileSync(path.join(outDir, stop + '.jpg'), await contactSheet(tiles));
  console.log(`sheets/${stop}.jpg  (${files.length} candidates)`);
}
