// The finalize yml write-path (handoff-spec §7). base64 is gone: finalize writes
// real image files under public/guides/<slug>/ and upserts their attribution into
// content/<slug>.yml. This module owns the *durable data* side of that — filename
// derivation, adapter→schema mapping, and the surgical yml edit — kept pure so it
// unit-tests without the network or sharp.
import { parseDocument } from 'yaml';

// Filename for the Nth (0-based) image of a stop+role. The first is
// `<stop>-<role>.webp`; a rare second image of the same role gets a `-2` suffix
// (spec §7 — none needed today). The filename IS the upsert key, so it must be
// stable across re-runs.
export function imageFile(stopId, role, n = 0) {
  return n === 0 ? `${stopId}-${role}.webp` : `${stopId}-${role}-${n + 1}.webp`;
}

// Map one adapter `imageInfo` (source/artist/license/licenseurl/descurl — see
// build/lib/sources.mjs) to a schema `image` entry (spec §3). Attribution is
// copied verbatim from the adapter, NEVER guessed. Key order matches the schema:
// file, role, source, artist, license, [licenseUrl], sourceUrl. An empty
// licenseUrl is dropped (schema makes it optional + .url()-validated); sourceUrl
// (the manifest `descurl`) is the required attribution link and is always kept.
export function toImageEntry({ file, role, source, info }) {
  const entry = {
    file,
    role,
    source,
    artist: info.artist,
    license: info.license,
  };
  if (info.licenseurl) entry.licenseUrl = info.licenseurl;
  entry.sourceUrl = info.descurl;
  return entry;
}

// Upsert image entries into the raw text of content/<slug>.yml, keyed by `file`
// within each stop's `images:` array. Touches ONLY images arrays — every other
// node (prose, comments, key order, and long lines) is preserved byte-for-byte;
// `lineWidth: 0` disables the serializer's reflow so untouched long values are
// never rewrapped.
//
// imagesByStop: { <stop id>: [entry, …] }. An entry whose `file` already exists on
// that stop is overwritten in place; a new `file` is appended. Re-running finalize
// with the same selections is therefore idempotent. Throws if a stop id has no
// matching stop in the yml (a stale selections key — fail loudly rather than drop
// the images silently).
export function upsertImages(ymlText, imagesByStop) {
  const doc = parseDocument(ymlText);

  const stopsById = new Map();
  const days = doc.get('days');
  for (const day of days?.items ?? []) {
    const stops = day.get('stops');
    for (const st of stops?.items ?? []) stopsById.set(st.get('id'), st);
  }

  const missing = Object.keys(imagesByStop).filter((id) => !stopsById.has(id));
  if (missing.length) {
    throw new Error(
      `upsertImages: stop id(s) not found in yml: ${missing.join(', ')}`,
    );
  }

  for (const [stopId, entries] of Object.entries(imagesByStop)) {
    const st = stopsById.get(stopId);
    let arr = st.get('images');
    if (!arr || !Array.isArray(arr.items)) {
      arr = doc.createNode([]); // a real YAMLSeq node we can mutate + upsert into
      st.set('images', arr);
    }
    for (const entry of entries) {
      const node = doc.createNode(entry);
      const idx = arr.items.findIndex((it) => it.get('file') === entry.file);
      if (idx >= 0) arr.items[idx] = node;
      else arr.add(node);
    }
  }

  return doc.toString({ lineWidth: 0 });
}
