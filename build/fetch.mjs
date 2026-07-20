// fetch.mjs — source images from Wikimedia Commons for a guide.
//
//   node build/fetch.mjs <slug> candidates   # download thumbs to curate
//   node build/fetch.mjs <slug> finalize     # pull picks full-res -> manifest.json
//
// candidates: reads guides/<slug>/sources.json  { stop: {mode,query} | [{mode,query}] }
//             mode 'category' walks a Category:… ; 'search' does filetype:bitmap
//             fulltext (use search to dodge PDFs/maps/diagrams). Writes thumbs to
//             guides/<slug>/work/<stop>/NN.jpg and work/index.json (NN -> title).
//             Then run `sheet` and eyeball; put your picks in selections.json.
//
// finalize:   reads guides/<slug>/selections.json  { stop: [[File:title, role], …] }
//             fetches full-res, WebP-encodes (~640px), captures artist/license,
//             writes guides/<slug>/manifest.json (base64, committed — no network
//             needed to rebuild).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findImages, imageInfo, bytes, sleep } from './lib/wikimedia.mjs';
import { toWebp } from './lib/images.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUIDES = path.resolve(__dirname, '..', 'guides');
const THROTTLE = 1400; // ms between downloads — be a polite Commons citizen

const [slug, cmd] = process.argv.slice(2);
if (!slug || !['candidates', 'finalize'].includes(cmd)) {
  console.error('usage: node build/fetch.mjs <slug> <candidates|finalize>');
  process.exit(2);
}
const dir = path.join(GUIDES, slug);
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

async function candidates() {
  const sources = readJson('sources.json');
  const index = {};
  for (const [stop, spec] of Object.entries(sources)) {
    const queries = Array.isArray(spec) ? spec : [spec];
    const out = path.join(dir, 'work', stop);
    fs.mkdirSync(out, { recursive: true });
    const seen = new Set();
    const found = [];
    for (const { mode = 'search', query } of queries) {
      const hits = await findImages(query, { mode });
      for (const h of hits) if (!seen.has(h.title)) { seen.add(h.title); found.push(h); }
      await sleep(THROTTLE);
    }
    index[stop] = [];
    for (let i = 0; i < Math.min(found.length, 36); i++) {
      try {
        fs.writeFileSync(path.join(out, String(i).padStart(2, '0') + '.jpg'), await bytes(found[i].thumburl));
        index[stop].push([i, found[i].title]);
        await sleep(THROTTLE);
      } catch (e) { console.error('  skip', found[i].title, e.message); }
    }
    console.log(`${stop}: ${index[stop].length} candidates`);
  }
  fs.mkdirSync(path.join(dir, 'work'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'work', 'index.json'), JSON.stringify(index, null, 1));
  console.log('→ run: node build/sheet.mjs ' + slug + '  then pick into selections.json');
}

async function finalize() {
  const sel = readJson('selections.json');
  const manifest = {};
  for (const [stop, items] of Object.entries(sel)) {
    manifest[stop] = [];
    for (const [title, role] of items) {
      const info = await imageInfo(title);
      const enc = await toWebp(await bytes(info.thumburl));
      manifest[stop].push({ role, title: info.title, artist: info.artist, license: info.license,
        licenseurl: info.licenseurl, descurl: info.descurl, w: enc.w, h: enc.h, kb: enc.kb, b64: enc.b64 });
      console.log(`${stop.padEnd(12)} ${role.padEnd(7)} ${enc.w}x${enc.h} ${String(enc.kb).padStart(6)}KB  ${info.artist.slice(0, 28).padEnd(28)} ${info.license}`);
      await sleep(THROTTLE);
    }
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  const total = Object.values(manifest).flat().reduce((s, i) => s + i.kb, 0);
  console.log(`\nmanifest.json: ${(total / 1024).toFixed(2)} MB across ${Object.values(manifest).flat().length} images`);
}

await (cmd === 'candidates' ? candidates() : finalize());
