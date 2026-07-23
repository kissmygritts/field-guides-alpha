// CLI wrapper for the config.json → yml conversion (handoff-spec §8, migration-
// spec §2). Reads guides/<slug>/config.json, runs the pure `configToGuide`
// transform, and prints the skeleton yml to stdout. It writes to stdout (not
// straight to content/<slug>.yml) on purpose: the emitted skeleton is the INPUT
// to the hand-port step, so it must never clobber an already hand-ported guide.
//
//   node build/config-to-yml.mjs 2026-reno-vegas > content/2026-reno-vegas.yml
//   # …then hand-port the prose (masthead, descriptions, directions, theShot,
//   #   day themes/briefs/legs, fieldNotes, colophon) and run finalize for images.
//
// Reusable across guides — the transform is data-driven off config.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { configToGuide } from './lib/config-to-yml.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const slug = process.argv[2];
if (!slug) {
  console.error('usage: node build/config-to-yml.mjs <slug>  > content/<slug>.yml');
  process.exit(1);
}

const configFile = path.join(ROOT, 'guides', slug, 'config.json');
if (!fs.existsSync(configFile)) {
  console.error(`no config.json for "${slug}": ${path.relative(ROOT, configFile)}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const guide = configToGuide(config);

// lineWidth: 0 disables reflow so long prose lines stay on one line, matching the
// finalize write-path's serializer settings (build/lib/yml-images.mjs).
process.stdout.write(
  `# ${slug} — migrated from guides/${slug}/config.json (structure) + hand-ported prose.\n` +
    `# Regenerate the STRUCTURE with:  node build/config-to-yml.mjs ${slug}\n` +
    `# Prose below the structural keys is hand-authored (migration-spec §2).\n` +
    stringify(guide, { lineWidth: 0 }),
);
