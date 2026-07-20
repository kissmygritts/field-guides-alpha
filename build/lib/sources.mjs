// Image-source registry. Each adapter (unsplash, flickr, wikimedia) exports the
// same contract so fetch.mjs can treat them uniformly:
//
//   name                      string id, e.g. 'unsplash'
//   enabled(): boolean        is it usable? (has an API key, etc.)
//   findImages(query, opts)   -> [{ source, id, title, thumburl, width, height }]
//   imageInfo(id)             -> { source, title, thumburl(highres),
//                                  artist, license, licenseurl, descurl }
//   bytes(url)                -> Buffer  (download a URL this adapter produced)
//
// Candidates are gathered in ORDER with sequential fallback: each stop fills from
// the first source, then the next only if still short of the cap, then the next.
import * as unsplash from './unsplash.mjs';
import * as flickr from './flickr.mjs';
import * as wikimedia from './wikimedia.mjs';

export const ADAPTERS = { unsplash, flickr, wikimedia };
export const ORDER = ['unsplash', 'flickr', 'wikimedia'];

// Human-readable source name for captions/credits.
export const SOURCE_LABEL = { unsplash: 'Unsplash', flickr: 'Flickr', wikimedia: 'Wikimedia Commons' };

// A candidate/selection reference is "<source>:<id>". Wikimedia ids are File:
// titles, so a wikimedia ref looks like "wikimedia:File:Foo.jpg". A bare
// "File:Foo.jpg" (or plain title) is accepted as legacy Wikimedia.
export const refOf = (c) => `${c.source}:${c.id}`;

export function parseRef(key) {
  const s = String(key);
  const i = s.indexOf(':');
  const head = i > 0 ? s.slice(0, i) : '';
  if (ADAPTERS[head]) return { source: head, id: s.slice(i + 1) };
  return { source: 'wikimedia', id: s.startsWith('File:') ? s : `File:${s}` };
}
