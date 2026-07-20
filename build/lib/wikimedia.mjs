// Wikimedia Commons API client.
// Encodes the hard-won rules: a descriptive User-Agent with contact info is
// REQUIRED (anonymous/bot UAs get HTTP 429 "reduce your request rate"), and
// requests must be throttled with exponential backoff on 429.

const API = 'https://commons.wikimedia.org/w/api.php';

// A compliant UA is mandatory. Override CONTACT via env for your own runs.
const CONTACT = process.env.WM_CONTACT || 'contact via repo owner';
const UA = `FieldGuideBuilder/1.0 (offline photo reference; ${CONTACT})`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch with retry/backoff on 429 and transient network errors.
async function raw(url, { tries = 6 } = {}) {
  for (let a = 0; a < tries; a++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 429) {
        if (a < tries - 1) { await sleep(7000 + a * 4000); continue; }
        throw new Error(`429 after ${tries} tries: ${url}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      return res;
    } catch (e) {
      if (a < tries - 1) { await sleep(2000 + a * 2000); continue; }
      throw e;
    }
  }
}

async function api(params) {
  const url = API + '?' + new URLSearchParams({ ...params, format: 'json' });
  return (await raw(url)).json();
}

export async function bytes(url) {
  return Buffer.from(await (await raw(url)).arrayBuffer());
}

// Strip HTML tags Commons puts in extmetadata (Artist, LicenseShortName, ...).
export function clean(s) {
  if (!s) return '';
  return s.replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

// Find candidate File: pages. mode 'category' walks a Category; 'search' does a
// filetype:bitmap fulltext search (use this to avoid PDFs/maps/SVG diagrams).
// Returns [{title, thumburl, width, height}] filtered to >= minW x minH.
export async function findImages(query, { mode = 'search', limit = 40, thumb = 420, minW = 800, minH = 600 } = {}) {
  const base = mode === 'category'
    ? { generator: 'categorymembers', gcmtitle: query, gcmtype: 'file', gcmlimit: String(limit) }
    : { generator: 'search', gsrsearch: `${query} filetype:bitmap`, gsrnamespace: '6', gsrlimit: String(limit) };
  const d = await api({ action: 'query', ...base, prop: 'imageinfo', iiprop: 'url|size', iiurlwidth: String(thumb) });
  const pages = d?.query?.pages || {};
  return Object.values(pages)
    .map((p) => ({ title: p.title, ii: (p.imageinfo || [])[0] }))
    .filter((p) => p.ii?.thumburl && (p.ii.width || 0) >= minW && (p.ii.height || 0) >= minH)
    .map((p) => ({ title: p.title, thumburl: p.ii.thumburl, width: p.ii.width, height: p.ii.height }));
}

// Full metadata + a wide thumb URL for one File: title.
export async function imageInfo(title, { thumb = 1024 } = {}) {
  const d = await api({ action: 'query', titles: title, prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: String(thumb) });
  const p = Object.values(d.query.pages)[0];
  const ii = p.imageinfo[0];
  const m = ii.extmetadata || {};
  return {
    title: title.replace(/^File:/, ''),
    thumburl: ii.thumburl,
    artist: clean(m.Artist?.value) || 'Unknown',
    license: clean(m.LicenseShortName?.value) || '',
    licenseurl: m.LicenseUrl?.value || '',
    descurl: ii.descriptionurl || '',
  };
}

export { sleep };
