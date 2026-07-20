// verify.mjs — prove a built guide works offline in a real browser engine.
// Checks, via headless system Chrome (no puppeteer/playwright download):
//   • no horizontal overflow  (scrollWidth === clientWidth — see clamp note)
//   • zero runtime JS errors   (window.onerror capture)
//   • no network requests      (offline-first: everything must be inlined)
//   • optional screenshot       (--shot)
//
// Clamp note: headless Chrome enforces a ~500px minimum window width, so a 390px
// request renders at 500 and a screenshot at 390 *looks* cropped. That is an
// artifact — trust scrollWidth===clientWidth, not the picture.
//
//   node build/verify.mjs                 # verify every dist/*.html
//   node build/verify.mjs dist/foo.html   # one file
//   node build/verify.mjs --shot          # also save PNGs to build/.verify/
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TMP = path.join(__dirname, '.verify');

const CHROME = process.env.CHROME
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
    .find((p) => fs.existsSync(p));

const PROBE = `<script>
window.__net=0;
(function(){var o=window.fetch;if(o)window.fetch=function(){window.__net++;return o.apply(this,arguments);};
var X=window.XMLHttpRequest;if(X){var op=X.prototype.open;X.prototype.open=function(){window.__net++;return op.apply(this,arguments);};}})();
window.__errs=[];window.onerror=function(m){window.__errs.push(String(m));};
addEventListener('DOMContentLoaded',function(){var r=document.documentElement;
document.title='RESULT'+JSON.stringify({w:r.scrollWidth,c:r.clientWidth,net:window.__net,errs:window.__errs});});
</script>`;

function chrome(args) {
  return execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--no-sandbox', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 });
}

function verify(file, { shot = false } = {}) {
  fs.mkdirSync(TMP, { recursive: true });
  const html = fs.readFileSync(file, 'utf8').replace('</body>', PROBE + '</body>');
  const probeFile = path.join(TMP, path.basename(file) + '.probe.html');
  fs.writeFileSync(probeFile, html);
  const url = 'file://' + probeFile;

  const dom = chrome(['--window-size=390,1200', '--virtual-time-budget=4000', '--dump-dom', url]);
  const m = dom.match(/<title>RESULT(.*?)<\/title>/);
  if (!m) return { file, ok: false, reason: 'no probe result (page failed to load?)' };
  const r = JSON.parse(m[1]);

  const problems = [];
  if (r.w > r.c) problems.push(`horizontal overflow: scrollWidth ${r.w} > clientWidth ${r.c}`);
  if (r.errs.length) problems.push(`JS errors: ${r.errs.join(' | ')}`);
  if (r.net > 0) problems.push(`${r.net} network request(s) — not fully offline`);

  if (shot) {
    const png = path.join(TMP, path.basename(file) + '.png');
    chrome(['--window-size=440,2600', `--screenshot=${png}`, url]);
  }
  return { file, ok: problems.length === 0, dims: `${r.w}/${r.c}`, net: r.net, problems };
}

if (!CHROME) { console.error('No Chrome/Chromium found. Set CHROME=/path/to/chrome'); process.exit(2); }
const shot = process.argv.includes('--shot');
const args = process.argv.slice(2).filter((a) => a !== '--shot');
const files = args.length ? args
  : fs.readdirSync(path.join(ROOT, 'dist')).filter((f) => f.endsWith('.html') && f !== 'index.html').map((f) => path.join(ROOT, 'dist', f));

let bad = 0;
for (const f of files) {
  const r = verify(f, { shot });
  if (r.ok) console.log(`PASS  ${path.basename(r.file)}  (${r.dims}, net ${r.net})`);
  else { bad++; console.log(`FAIL  ${path.basename(r.file)}\n      - ${(r.problems || [r.reason]).join('\n      - ')}`); }
}
process.exit(bad ? 1 : 0);
