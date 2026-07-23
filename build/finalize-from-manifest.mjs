// Offline finalize for a migrated guide (handoff-spec §7, §8). The rewritten
// network finalize (build/fetch.mjs finalize) pulls fresh bytes from the source
// APIs; this variant reproduces the SAME output — image files under
// public/guides/<slug>/ + attribution upserted into content/<slug>.yml — from the
// already-committed guides/<slug>/manifest.json, so migrating a curated guide
// needs no network (CLAUDE.md: "the curated manifest.json IS committed so rebuilds
// need no network").
//
//   node build/finalize-from-manifest.mjs 2026-reno-vegas
//
// Only the base64 payload differs from the network path — the manifest already
// holds each image's WebP bytes plus its verbatim source/artist/license/licenseurl/
// descurl, which map to the schema `image` entry exactly as `toImageEntry` does.
// Attribution is copied, never guessed. Images key to their manifest stop (base
// stops); promoted `alt` stops carry no imagery, matching the old rendered galleries.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageFile, toImageEntry, upsertImages } from './lib/yml-images.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const slug = process.argv[2];
if (!slug) {
  console.error('usage: node build/finalize-from-manifest.mjs <slug>');
  process.exit(1);
}

const manifestFile = path.join(ROOT, 'guides', slug, 'manifest.json');
const contentFile = path.join(ROOT, 'content', `${slug}.yml`);
if (!fs.existsSync(manifestFile)) throw new Error(`no manifest: ${path.relative(ROOT, manifestFile)}`);
if (!fs.existsSync(contentFile)) throw new Error(`no content yml to upsert into: ${path.relative(ROOT, contentFile)}`);

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const publicDir = path.join(ROOT, 'public', 'guides', slug);
fs.mkdirSync(publicDir, { recursive: true });

const imagesByStop = {};
let count = 0;
let totalKb = 0;
for (const [stop, imgs] of Object.entries(manifest)) {
  imagesByStop[stop] = [];
  const roleSeen = {};
  for (const img of imgs) {
    const { role, source, b64 } = img;
    const file = imageFile(stop, role, roleSeen[role] ?? 0);
    roleSeen[role] = (roleSeen[role] ?? 0) + 1;

    const bytes = Buffer.from(b64, 'base64');
    if (bytes.subarray(0, 4).toString('latin1') !== 'RIFF' || bytes.subarray(8, 12).toString('latin1') !== 'WEBP') {
      throw new Error(`${stop}/${role}: manifest payload is not WebP`);
    }
    fs.writeFileSync(path.join(publicDir, file), bytes);

    // Manifest fields map to an adapter imageInfo shape (licenseurl/descurl), so
    // toImageEntry produces the identical schema entry the network finalize would.
    imagesByStop[stop].push(toImageEntry({ file, role, source, info: img }));
    count++;
    totalKb += Math.round(bytes.length / 1024);
  }
}

const updated = upsertImages(fs.readFileSync(contentFile, 'utf8'), imagesByStop);
fs.writeFileSync(contentFile, updated);

console.log(`${path.relative(ROOT, publicDir)}/: ${count} images, ${(totalKb / 1024).toFixed(2)} MB`);
console.log(`→ upserted images into ${path.relative(ROOT, contentFile)}`);
