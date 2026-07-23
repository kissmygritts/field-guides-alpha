// fetch.mjs — source images for a guide from Unsplash, Flickr, and Wikimedia.
//
//   node build/fetch.mjs <slug> candidates   # download thumbs to curate
//   node build/fetch.mjs <slug> finalize     # pull picks full-res -> manifest.json
//
// candidates: reads guides/<slug>/sources.json  { stop: query | [query | {mode,query}] }
//             Each stop fills from Unsplash first, then Flickr, then Wikimedia —
//             a source is only queried if the stop is still short of the cap
//             (sequential fallback). Exception: a stop that names a Category:
//             ({mode:'category'}) sources Wikimedia FIRST — for obscure place
//             names Unsplash's text search otherwise fills the cap with off-topic
//             frames and the on-topic Commons category never runs. Sources without
//             an API key are skipped (UNSPLASH_KEY, FLICKR_KEY; Wikimedia needs
//             none). Wikimedia honors {mode:'category',query} to walk a Category:…;
//             everything else is a plain text search. Thumbs -> work/<stop>/NN.jpg
//             and work/index.json ([NN, ref, source, title]). Then run `sheet` and
//             eyeball; put your picks in selections.json.
//
// finalize:   reads guides/<slug>/selections.json  { stop: [[ref, role], …] }
//             ref is "<source>:<id>" (e.g. "unsplash:abc123"), the candidate number
//             NN (resolved via work/index.json), or a legacy bare "File:Title.jpg".
//             Fetches each pick, sharp-encodes a bounded-source (~1600px) WebP to
//             public/guides/<slug>/<stop>-<role>.webp, captures artist/license from
//             the adapter (never guessed), and upserts those image entries into
//             content/<slug>.yml — touching only `images:` arrays, never prose
//             (handoff-spec §7). No base64; @nuxt/image renders the real files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADAPTERS, ORDER, refOf, parseRef } from './lib/sources.mjs';
import { sleep } from './lib/wikimedia.mjs';
import { toBoundedWebp } from './lib/images.mjs';
import { imageFile, toImageEntry, upsertImages } from './lib/yml-images.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GUIDES = path.join(ROOT, 'guides');
const THROTTLE = 1400; // ms between downloads — be a polite API citizen
const CAP = 36;        // candidates per stop across all sources

const [slug, cmd] = process.argv.slice(2);
if (!slug || !['candidates', 'finalize'].includes(cmd)) {
  console.error('usage: node build/fetch.mjs <slug> <candidates|finalize>');
  process.exit(2);
}
const dir = path.join(GUIDES, slug);
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

// A query spec is a plain string or {mode,query} (mode only matters to Wikimedia).
const asQuery = (q) => (typeof q === 'string' ? { query: q } : q);

// Per-stop source order. A stop that names a Category: (mode:'category') is an
// obscure place-name the author knows Commons covers cleanly, so trust Wikimedia
// first — otherwise Unsplash's text search fills the whole cap with off-topic
// frames (a lake named X, a town named Y) and the good Commons results never run.
// Stops with no category keep the default Unsplash-first order for nicer scenics.
const orderFor = (queries) =>
  queries.some((q) => q.mode === 'category')
    ? ['wikimedia', ...ORDER.filter((s) => s !== 'wikimedia')]
    : ORDER;

async function candidates() {
  const sources = readJson('sources.json');
  const index = {};
  for (const [stop, spec] of Object.entries(sources)) {
    const queries = (Array.isArray(spec) ? spec : [spec]).map(asQuery);
    const order = orderFor(queries);
    if (order[0] === 'wikimedia') console.log(`  ${stop}: Wikimedia-first (category query)`);
    const out = path.join(dir, 'work', stop);
    fs.mkdirSync(out, { recursive: true });
    const seen = new Set();
    const found = [];
    // Sequential fallback: each source is only queried if the stop is still short.
    for (const src of order) {
      if (found.length >= CAP) break;
      const adapter = ADAPTERS[src];
      if (!adapter.enabled()) { console.log(`  ${stop}/${src}: no key, skipped`); continue; }
      for (const { mode, query } of queries) {
        if (found.length >= CAP) break;
        let hits = [];
        try { hits = await adapter.findImages(query, { mode }); }
        catch (e) { console.error(`  ${stop}/${src} "${query}":`, e.message); }
        for (const h of hits) {
          const ref = refOf(h);
          if (seen.has(ref) || found.length >= CAP) continue;
          seen.add(ref);
          found.push({ ...h, ref });
        }
        await sleep(THROTTLE);
      }
    }
    index[stop] = [];
    for (let i = 0; i < found.length; i++) {
      const f = found[i];
      try {
        fs.writeFileSync(path.join(out, String(i).padStart(2, '0') + '.jpg'), await ADAPTERS[f.source].bytes(f.thumburl));
        index[stop].push([i, f.ref, f.source, f.title || '']);
        await sleep(THROTTLE);
      } catch (e) { console.error('  skip', f.ref, e.message); }
    }
    const bySrc = {};
    for (const [, , s] of index[stop]) bySrc[s] = (bySrc[s] || 0) + 1;
    const mix = Object.entries(bySrc).map(([s, n]) => `${s} ${n}`).join(', ') || 'none';
    console.log(`${stop}: ${index[stop].length} candidates (${mix})`);
  }
  fs.mkdirSync(path.join(dir, 'work'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'work', 'index.json'), JSON.stringify(index, null, 1));
  console.log('→ run: node build/sheet.mjs ' + slug + '  then pick into selections.json');
}

// Resolve a selections.json key to a "<source>:<id>" ref. A bare candidate number
// looks it up in work/index.json; anything else is a ref or legacy File: title.
function resolveKey(stop, key, index) {
  if (/^\d+$/.test(String(key))) {
    const n = Number(key);
    const row = (index[stop] || []).find(([i]) => i === n);
    if (!row) throw new Error(`candidate #${n} for "${stop}" not in work/index.json (re-run candidates)`);
    return row[1];
  }
  return String(key);
}

async function finalize() {
  const sel = readJson('selections.json');
  let index = {};
  try { index = JSON.parse(fs.readFileSync(path.join(dir, 'work', 'index.json'), 'utf8')); } catch { /* refs only */ }

  const contentFile = path.join(ROOT, 'content', `${slug}.yml`);
  if (!fs.existsSync(contentFile)) throw new Error(`no content file to upsert into: ${path.relative(ROOT, contentFile)}`);
  const publicDir = path.join(ROOT, 'public', 'guides', slug);
  fs.mkdirSync(publicDir, { recursive: true });

  // Build the { stop: [image entry, …] } map finalize will upsert, and drop the
  // bounded-source WebP files alongside it. The filename IS the upsert key, so a
  // rare second image of one role gets a -2 suffix (imageFile).
  const imagesByStop = {};
  let count = 0;
  let totalKb = 0;
  for (const [stop, items] of Object.entries(sel)) {
    imagesByStop[stop] = [];
    const roleSeen = {};
    for (const [key, role] of items) {
      const { source, id } = parseRef(resolveKey(stop, key, index));
      const adapter = ADAPTERS[source];
      const info = await adapter.imageInfo(id, { thumb: 1600 });
      const file = imageFile(stop, role, roleSeen[role] ?? 0);
      roleSeen[role] = (roleSeen[role] ?? 0) + 1;
      const enc = await toBoundedWebp(await adapter.bytes(info.thumburl));
      fs.writeFileSync(path.join(publicDir, file), enc.data);
      imagesByStop[stop].push(toImageEntry({ file, role, source, info }));
      count++;
      totalKb += enc.kb;
      console.log(`${stop.padEnd(12)} ${role.padEnd(7)} ${source.padEnd(9)} ${enc.w}x${enc.h} ${String(enc.kb).padStart(6)}KB  ${info.artist.slice(0, 24).padEnd(24)} ${info.license}`);
      await sleep(THROTTLE);
    }
  }

  // Surgically upsert the attribution into content/<slug>.yml (prose untouched).
  const updated = upsertImages(fs.readFileSync(contentFile, 'utf8'), imagesByStop);
  fs.writeFileSync(contentFile, updated);

  console.log(`\n${path.relative(ROOT, publicDir)}/: ${count} images, ${(totalKb / 1024).toFixed(2)} MB source`);
  console.log(`→ upserted images into ${path.relative(ROOT, contentFile)}`);
}

await (cmd === 'candidates' ? candidates() : finalize());
