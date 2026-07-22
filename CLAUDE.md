# Field Guide

Offline-first, self-contained photographer's field guides — single HTML files you
pull up on a phone with **no cell signal**. Each guide is an authored shooting
script enriched with real, cleanly-licensed reference photography and field data
(GPS, elevation, fuel/signal briefs, moon phase), then verified in a real browser.

## Non-negotiables

1. **Fully offline.** Every image is a base64 `data:` URI. **No hotlinked URLs, ever** —
   a broken image in the field is a failure. `verify` fails the build if any network
   request fires.
2. **Lean on a phone.** Images cap at ~640px wide / ~720px tall, WebP q80, re-encoded
   if still over ~120 KB. If a guide gets heavy, **tell the user the tradeoff** (e.g.
   "3.3 MB, 38 images") rather than silently shipping something huge.
3. **Cleanly licensed + attributed.** Imagery is sourced per stop from Unsplash →
   Flickr → Wikimedia Commons (sequential fallback). Wikimedia = CC BY/BY-SA/CC0;
   Flickr = reuse-friendly CC/PD licenses only (no-derivatives excluded, since we
   re-encode); Unsplash = the Unsplash License (attribution, non-commercial personal
   use — not CC). Every image's source + artist + license is captured in the manifest
   and listed in the guide's credits. **Verify attribution from each API — never guess it.**
4. **Don't strip the shooting script.** Timing, sun direction, focal-length notes,
   "the shot" callouts, day structure — that authored content is the point.
5. **Static-hostable.** Output is a plain directory of self-contained HTML. Deploys to
   Cloudflare Pages with zero server code.

## Toolchain (Node, ESM)

One dependency: `sharp` (WebP encode + contact sheets). Chrome for verify is the
system browser (no puppeteer download). Node ≥ 20 for built-in `fetch`.

```
npm run build                     # assemble every guide  guides/* -> dist/*
npm run build -- 2026-395         # one guide
npm run verify                    # headless offline check of dist/*.html
npm run verify -- --shot          # + screenshots to build/.verify/
node build/fetch.mjs <slug> candidates   # download candidate images to curate
node build/sheet.mjs <slug>              # contact sheets for curation
node build/fetch.mjs <slug> finalize     # picks -> manifest.json (base64)
```

When fetching, set the keys for whichever sources you want (each is skipped if unset;
Wikimedia always backs the fallback): `WM_CONTACT` (an email/URL — Commons requires a
real User-Agent contact or returns HTTP 429), `UNSPLASH_KEY`, `FLICKR_KEY`. None are
needed to build from a committed manifest.

## Layout

```
build/
  lib/       wikimedia · images (sharp) · moon · html builders
  assets/    enrich.css · lightbox.html · lightbox.js  (injected into every guide)
  fetch.mjs  sheet.mjs  assemble.mjs  verify.mjs
guides/<slug>/
  content.html     authored shooting script (SVG placeholders + prose). THE source of copy.
  config.json      structured data: stop order, gps+elevation, day/jump groups, moon window, credits
  selections.json  { stop: [[File:title, role], …] }  — curation picks (input to finalize)
  manifest.json    curated images w/ base64 + attribution (GENERATED, committed — rebuilds need no network)
  sources.json     per-stop search/category queries (input to candidates) — optional
  work/ sheets/    candidate downloads + contact sheets (git-ignored)
dist/              built guides + index.html  ← Cloudflare Pages serves this
```

**Reproducibility:** `content.html` + `config.json` + `manifest.json` fully determine a
guide. `assemble.mjs` needs no network. Re-curation (`fetch`/`sheet`) is only for new or
changed imagery. Moon phases are computed (`build/lib/moon.mjs`), never hand-entered.

## How assembly works

`assemble.mjs` reads `content.html` and, driven by `config.json`, rewrites each
`<div class="stop-visual"><svg>…</svg><span class="visual-label">…</span></div>` into an
embedded photo gallery (from `manifest[stop]`), anchors each `<h3>` and injects its
GPS/elevation line, then injects the enrichment CSS, jump index, moon panel, credits,
and lightbox, and wraps it as a standalone document. Stops are consumed in
`config.order`, which **must** match document order in `content.html`.

## Deploy (Cloudflare Pages)

Build command `npm run build`, output directory `dist`. No functions, no env needed
(set `WM_CONTACT` only for local fetching, never required to build from a manifest).

## Building or enriching a guide

Use the **`enrich-field-guide`** skill — it has the full procedure (sourcing, curation
via contact sheets, feature wiring, verification) and the gotcha references. Load it
before starting rather than re-deriving the flow.

## Agent skills

### Issue tracker

Issues and PRDs live as GitHub issues in `kissmygritts/field-guides-alpha`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
