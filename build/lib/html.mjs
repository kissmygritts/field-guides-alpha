// HTML-fragment builders for guide assembly. Pure string helpers — no I/O.

export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// One embedded photo. `on` marks the frame shown before the lightbox opens.
export function photoImg(img, cap, credit, on) {
  return `<img class="vp${on ? ' on' : ''}" src="data:image/webp;base64,${img.b64}" alt="${esc(cap)}"`
    + ` data-cap="${esc(cap)}" data-credit="${esc(credit)}" loading="lazy" decoding="async">`;
}

// Gallery (photos + count badge + zoom hint) for one stop. `imgs` is an ordered
// list of {img, cap, credit}; the visual-label is preserved from the source.
export function galleryHtml(slug, imgs, label) {
  const photos = imgs.map((x, i) => photoImg(x.img, x.cap, x.credit, i === 0)).join('');
  const count = imgs.length > 1 ? `<span class="viz-count">▤ ${imgs.length}</span>` : '';
  return `<div class="stop-visual" id="viz-${slug}"><div class="viz-frame">`
    + `<div class="viz-photos">${photos}</div>${count}`
    + `<span class="viz-zoom" aria-hidden="true">⤢</span></div>`
    + `<span class="visual-label">${label}</span></div>`;
}

// The GPS + elevation line injected under each stop heading.
export function geoLine(g) {
  const link = (lat, lng, cls, name) =>
    `<a${cls ? ` class="${cls}"` : ''} href="geo:${lat},${lng}?q=${lat},${lng}" aria-label="Open in maps">◉ ${name ? name + ' ' : ''}${lat}, ${lng}</a>`;
  let s = `<div class="stop-geo">${link(g.lat, g.lng)}<span>${esc(g.label || '')}</span>`;
  if (g.elev) s += `<span class="elev">▲ ${g.elev}</span>`;
  for (const a of g.alt || []) {
    s += link(a.lat, a.lng, 'alt', a.name) + (a.elev ? `<span class="elev">▲ ${a.elev}</span>` : '');
  }
  return s + '</div>';
}

export function jumpNav(days) {
  const rows = days.map((d) =>
    `<div class="jrow"><span class="jday">${esc(d.label)}</span>`
    + d.stops.map(([slug, label]) => `<a href="#s-${slug}">${esc(label)}</a>`).join('') + '</div>'
  ).join('');
  return `<nav class="jump" aria-label="Jump to a stop"><h2>Jump to a stop</h2>${rows}</nav>`;
}

export function moonPanel(report, { windowLabel, darkSites }) {
  const cards = report.cards.map((c) =>
    `<span class="mp${c.dark ? ' dark' : ''}"><b>${c.range}</b> · ${c.text}</span>`
  ).join('');
  return `<div class="moon">
    <h4>Moon &amp; night sky · your window</h4>
    <p>The Milky-Way core rides the SW sky after dark right through ${esc(windowLabel)}. What the moon is doing decides whether you can shoot it:</p>
    <div class="moon-row">${cards}</div>
    <p class="moon-note">New moon ${report.newMoon} · full moon ${report.fullMoon}. Darkest desert sites: ${esc(darkSites)}.</p>
  </div>`;
}

// Attribution block. `credits` is an ordered [[slug, label], ...]; images come
// from the manifest keyed by slug.
const SOURCE_LABEL = { unsplash: 'Unsplash', flickr: 'Flickr', wikimedia: 'Wikimedia Commons' };

// Prose list of the sources actually used, e.g. "Unsplash, Flickr and Wikimedia Commons".
function sourcesUsed(manifest) {
  const seen = [];
  for (const it of Object.values(manifest).flat()) {
    const s = it.source || 'wikimedia';
    if (!seen.includes(s)) seen.push(s);
  }
  const names = seen.map((s) => SOURCE_LABEL[s] || s);
  if (names.length <= 1) return names[0] || 'Wikimedia Commons';
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

export function creditsBlock(credits, manifest) {
  const lines = credits.map(([slug, label]) => {
    const parts = (manifest[slug] || []).map((it) => `<span>${esc(it.artist)} <i>(${esc(it.license)})</i></span>`);
    return `<b>${esc(label)}:</b> ${parts.join(' · ')}<br>`;
  }).join('\n    ');
  return `\n  <div class="credits">
    <b>Location photographs</b> — from ${esc(sourcesUsed(manifest))}, reused under their stated licenses. Attribution by stop:<br>
    ${lines}
    <br><b>Offline &amp; field use:</b> every image is embedded (WebP, ~640px) in this one file — nothing loads from the network, so it works with no signal. Tap any photo to open it full-screen and page through that stop’s shots. ◉ coordinates are decimal degrees (WGS84); tapping opens your default maps app.
  </div>`;
}

export function wrapDoc(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#14140f">
<meta name="color-scheme" content="dark">
<title>${esc(title)}</title>
<style>html,body{margin:0;padding:0;background:#14140f;}</style>
</head>
<body>
${body}
</body>
</html>
`;
}
