// Flickr API adapter. Conforms to the source-adapter contract (see sources.mjs).
// Requires an API key from https://www.flickr.com/services/apps in env FLICKR_KEY.
// Search is restricted to reuse-friendly licenses (CC BY/BY-SA/BY-NC*, CC0, PD,
// and no-known-restrictions). No-derivatives licenses are excluded because we
// resize/re-encode, which is arguably a derivative.
export const name = 'flickr';

const API = 'https://api.flickr.com/services/rest/';
const KEY = () => process.env.FLICKR_KEY || '';
export const enabled = () => !!KEY();

// Flickr license id -> { name, url }. See flickr.photos.licenses.getInfo.
const LICENSES = {
  0: { name: 'All Rights Reserved', url: '' },
  1: { name: 'CC BY-NC-SA 2.0', url: 'https://creativecommons.org/licenses/by-nc-sa/2.0/' },
  2: { name: 'CC BY-NC 2.0', url: 'https://creativecommons.org/licenses/by-nc/2.0/' },
  3: { name: 'CC BY-NC-ND 2.0', url: 'https://creativecommons.org/licenses/by-nc-nd/2.0/' },
  4: { name: 'CC BY 2.0', url: 'https://creativecommons.org/licenses/by/2.0/' },
  5: { name: 'CC BY-SA 2.0', url: 'https://creativecommons.org/licenses/by-sa/2.0/' },
  6: { name: 'CC BY-ND 2.0', url: 'https://creativecommons.org/licenses/by-nd/2.0/' },
  7: { name: 'No known copyright restrictions', url: 'https://www.flickr.com/commons/usage/' },
  8: { name: 'United States Government Work', url: 'https://www.usa.gov/government-works' },
  9: { name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  10: { name: 'Public Domain Mark 1.0', url: 'https://creativecommons.org/publicdomain/mark/1.0/' },
};
// Allowed in search: CC BY-NC-SA, BY-NC, BY, BY-SA, no-restrictions, US gov, CC0, PD.
const ALLOWED = '1,2,4,5,7,8,9,10';

async function api(params) {
  const url = API + '?' + new URLSearchParams({ api_key: KEY(), format: 'json', nojsoncallback: '1', ...params });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`flickr HTTP ${res.status}: ${params.method}`);
  const d = await res.json();
  if (d.stat !== 'ok') throw new Error(`flickr ${d.code}: ${d.message}`);
  return d;
}

// Search -> [{source,id,title,thumburl,width,height}] filtered to >= minW x minH.
export async function findImages(query, { limit = 40, minW = 800, minH = 600 } = {}) {
  const d = await api({
    method: 'flickr.photos.search', text: query, license: ALLOWED,
    content_type: '1', media: 'photos', sort: 'relevance', safe_search: '1',
    per_page: String(limit), extras: 'license,owner_name,url_z,url_c,url_l,o_dims',
  });
  return (d.photos?.photo || [])
    .map((p) => {
      const w = Number(p.o_width || p.width_l || p.width_c || p.width_z || 0);
      const h = Number(p.o_height || p.height_l || p.height_c || p.height_z || 0);
      return { source: name, id: p.id, title: (p.title || 'Flickr photo').slice(0, 120),
        thumburl: p.url_z || p.url_c || p.url_l, width: w, height: h };
    })
    .filter((p) => p.thumburl && p.width >= minW && p.height >= minH);
}

// Full metadata + a ~1024px URL for one photo id (one getInfo call; the source
// URL is built from server/secret rather than a second getSizes round-trip).
export async function imageInfo(id) {
  const d = await api({ method: 'flickr.photos.getInfo', photo_id: id });
  const p = d.photo;
  const lic = LICENSES[p.license] || { name: `license ${p.license}`, url: '' };
  const page = p.urls?.url?.find((u) => u.type === 'photopage')?._content || '';
  return {
    source: name,
    id,
    title: (p.title?._content || 'Flickr photo').slice(0, 120),
    thumburl: `https://live.staticflickr.com/${p.server}/${id}_${p.secret}_b.jpg`,
    artist: p.owner?.realname || p.owner?.username || 'Unknown',
    license: lic.name,
    licenseurl: lic.url,
    descurl: page,
  };
}

export async function bytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`flickr image HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
