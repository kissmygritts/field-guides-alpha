// assemble.mjs — build self-contained guide HTML from authored content + config
// + a curated image manifest. No network: the manifest already holds base64.
//
//   node build/assemble.mjs            # build every guide in guides/
//   node build/assemble.mjs 2026-395   # build one
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { moonReport } from './lib/moon.mjs';
import * as H from './lib/html.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(__dirname, 'assets');
const GUIDES = path.join(ROOT, 'guides');
const DIST = path.join(ROOT, 'dist');

const asset = (f) => fs.readFileSync(path.join(ASSETS, f), 'utf8');

// Ordered [{img,cap,credit}] for one stop, honoring feed (e.g. owens shows owens + cerrogordo).
function imagesFor(slug, config, manifest) {
  const feed = config.feed?.[slug] || [slug];
  const out = [];
  for (const ms of feed) {
    for (const it of manifest[ms] || []) {
      out.push({
        img: it,
        cap: `${config.disp[ms]} — ${config.roles[it.role] || it.role}`,
        credit: `${it.artist} · ${it.license} · Wikimedia Commons`,
      });
    }
  }
  return out;
}

function assemble(slug) {
  const dir = path.join(GUIDES, slug);
  const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  let doc = fs.readFileSync(path.join(dir, config.content || 'content.html'), 'utf8');

  // 1) each <div class="stop-visual"><svg>…</svg><label></div> -> embedded photo gallery,
  //    consuming stops in document order. Output has no bare <svg>, so it won't re-match.
  const vizRe = /<div class="stop-visual">\s*<svg[\s\S]*?<\/svg>\s*<span class="visual-label">([\s\S]*?)<\/span>\s*<\/div>/;
  for (const s of config.order) {
    doc = doc.replace(vizRe, (_m, label) => H.galleryHtml(s, imagesFor(s, config, manifest), label.trim()));
  }

  // 2) anchor each stop <h3> and inject its GPS/elevation line
  const h3Re = /<h3>([\s\S]*?)<\/h3>/;
  for (const s of config.order) {
    doc = doc.replace(h3Re, (_m, inner) => `<h3 id="s-${s}">${inner}</h3>${H.geoLine(config.gps[s])}`);
  }

  // 3) inject enrichment CSS
  doc = doc.replace('</style>', asset('enrich.css') + '\n</style>');

  // 4) jump index at the top of the body
  doc = doc.replace('<div class="body">', '<div class="body">\n' + H.jumpNav(config.days));

  // 5) moon / night-sky panel above the colophon (computed for the trip window)
  const report = moonReport(config.moon.start, config.moon.end);
  doc = doc.replace('\n  <p class="colophon">',
    '\n  ' + H.moonPanel(report, { windowLabel: config.moon.windowLabel, darkSites: config.darkSites }) + '\n  <p class="colophon">');

  // 6) credits after the colophon paragraph
  doc = doc.replace('  </p>\n</section>', '  </p>' + H.creditsBlock(config.credits, manifest) + '\n</section>');

  // 7) lightbox markup + behavior before the trip-root close
  doc = doc.replace('</div><!-- /trip-root -->',
    asset('lightbox.html') + '\n<script>\n' + asset('lightbox.js') + '</script>\n</div><!-- /trip-root -->');

  // 8) wrap as a standalone, phone-ready document
  doc = H.wrapDoc(config.title, doc);

  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(path.join(DIST, config.output), doc);
  const images = Object.values(manifest).flat().length;
  return { output: config.output, title: config.title, mb: +(Buffer.byteLength(doc) / 1048576).toFixed(2), images };
}

function indexPage(built) {
  const rows = built.map((b) =>
    `<li><a href="./${b.output}">${H.esc(b.title)}</a> <span>${b.images} photos · ${b.mb} MB · offline</span></li>`
  ).join('\n    ');
  return H.wrapDoc('Field Guides', `<div id="trip-root"><div class="body" style="padding:32px 20px;max-width:720px;margin:0 auto">
  <h1 style="font-family:Georgia,serif;color:#e8e2d6">Field Guides</h1>
  <ul style="list-style:none;padding:0;line-height:2;font-family:system-ui;color:#cfc9bd">
    ${rows}
  </ul>
  <p style="font-family:monospace;font-size:12px;color:#8a8578">Self-contained · works with no signal.</p>
</div></div>`);
}

const only = process.argv[2];
const slugs = only ? [only] : fs.readdirSync(GUIDES).filter((d) => fs.existsSync(path.join(GUIDES, d, 'config.json')));
const built = [];
for (const s of slugs) {
  const r = assemble(s);
  built.push(r);
  console.log(`built ${r.output}  ${r.mb} MB  ${r.images} images`);
}
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), indexPage(built));
console.log(`wrote dist/index.html (${built.length} guide${built.length === 1 ? '' : 's'})`);
