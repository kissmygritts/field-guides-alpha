// Unsplash API adapter. Conforms to the source-adapter contract (see sources.mjs).
// Requires an Access Key from https://unsplash.com/developers in env UNSPLASH_KEY.
// The Unsplash License permits reuse with attribution; it is NOT a CC license, so
// the manifest records "Unsplash License" + the photographer + a link back.
export const name = 'unsplash';

const API = 'https://api.unsplash.com';
const KEY = () => process.env.UNSPLASH_KEY || '';
export const enabled = () => !!KEY();

async function api(pathname, params = {}) {
  const url = `${API}${pathname}?` + new URLSearchParams(params);
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${KEY()}`, 'Accept-Version': 'v1' } });
  if (!res.ok) throw new Error(`unsplash HTTP ${res.status}: ${pathname}`);
  return res.json();
}

// Search -> [{source,id,title,thumburl,width,height}] filtered to >= minW x minH.
// (mode is ignored; accepted for a uniform call signature across adapters.)
export async function findImages(query, { limit = 30, minW = 800, minH = 600 } = {}) {
  const d = await api('/search/photos', { query, per_page: String(limit), content_filter: 'high' });
  return (d.results || [])
    .filter((p) => (p.width || 0) >= minW && (p.height || 0) >= minH)
    .map((p) => ({
      source: name,
      id: p.id,
      title: (p.description || p.alt_description || 'Unsplash photo').slice(0, 120),
      thumburl: p.urls?.small,
      width: p.width,
      height: p.height,
    }));
}

// Full metadata + a wide URL for one photo id. Best-effort pings the download
// endpoint per Unsplash API guidelines (non-fatal if it fails).
export async function imageInfo(id) {
  const p = await api(`/photos/${id}`);
  if (p.links?.download_location) {
    fetch(p.links.download_location, { headers: { Authorization: `Client-ID ${KEY()}` } }).catch(() => {});
  }
  return {
    source: name,
    id,
    title: (p.description || p.alt_description || 'Unsplash photo').slice(0, 120),
    thumburl: p.urls?.regular || p.urls?.full,
    artist: p.user?.name || 'Unknown',
    license: 'Unsplash License',
    licenseurl: 'https://unsplash.com/license',
    descurl: p.links?.html || '',
  };
}

export async function bytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`unsplash image HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
