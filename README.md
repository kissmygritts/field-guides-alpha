# Field Guide

Offline-first, self-contained photographer's field guides — single HTML files you pull
up on a phone with **no cell signal**. Each guide is an authored shooting script
enriched with real, cleanly-licensed reference photography and field data (GPS,
elevation, fuel/signal briefs, moon phase), then verified in a real browser.

Every image is a base64 `data:` URI, so a built guide is one static file that works with
zero network. Output deploys to Cloudflare Pages with no server code.

## Requirements

- **Node ≥ 20** (built-in `fetch`)
- One dependency: **`sharp`** (WebP encode + contact sheets) — `npm install`
- Chrome (system browser) for `verify` — no puppeteer download
- [`mise`](https://mise.jdx.dev) (optional) to load image-source API keys from `mise.local.toml`

## Quick start

```bash
npm install
npm run build          # assemble every guide:  guides/* -> dist/*
npm run verify         # headless offline check of dist/*.html
```

`content.html` + `config.json` + `manifest.json` fully determine a guide, and the
manifest already holds every image as base64 — so **rebuilding needs no network**.
Re-sourcing imagery (below) is only for new or changed photos.

## Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Assemble every guide → `dist/`. `npm run build -- <slug>` for one. |
| `npm run verify` | Headless Chrome check of `dist/*.html`: fails on any network request, JS error, or layout overflow. `-- --shot` also writes screenshots to `build/.verify/`. |
| `npm run fetch -- <slug> candidates` | Search image sources, download thumbs to `guides/<slug>/work/` for curation. |
| `npm run sheet -- <slug>` | Build contact-sheet montages of the candidates → `guides/<slug>/sheets/`. |
| `npm run fetch -- <slug> finalize` | Fetch the curated picks full-res, WebP-encode, and write `manifest.json` (committed). |

## Image sourcing

Imagery is sourced per stop from three providers, tried in order with **sequential
fallback** — a source is only queried if the stop is still short of the candidate cap:

**Unsplash → Flickr → Wikimedia Commons**

Each provider's license + artist is captured from its API (never guessed) and recorded
in the manifest and the guide's credits:

- **Unsplash** — the Unsplash License (attribution; personal, non-commercial use). Thin
  library, best for generic subjects.
- **Flickr** — restricted to reuse-friendly CC / public-domain licenses (no-derivatives
  excluded, since images are re-encoded).
- **Wikimedia Commons** — CC BY / BY-SA / CC0. Deepest library for specific places; needs
  no key, so it always backs the fallback chain.

### API keys

Set the keys for the sources you want; a source with an empty key is skipped at fetch
time. Keys live in **`mise.local.toml`** (gitignored — never committed):

```toml
[env]
WM_CONTACT   = "you@example.com"   # Commons requires a real User-Agent contact, else HTTP 429
UNSPLASH_KEY = "…"                 # Access Key from https://unsplash.com/developers
FLICKR_KEY   = "…"                 # API key from https://www.flickr.com/services/apps
```

`mise` auto-loads these on `cd` into the repo (run `mise trust` once). Without mise,
export the same variables into your shell. The Unsplash demo tier allows **50 API
requests/hour** — image downloads come from the CDN and don't count, but searches and
metadata calls do, so lean subjects fall through to Flickr/Wikimedia.

## Building or enriching a guide (the `enrich-field-guide` skill)

The repo ships a Claude Code skill, **`enrich-field-guide`**
(`.claude/skills/enrich-field-guide/`), that carries the full procedure — authoring the
shooting script, sourcing and curating imagery, wiring field-data features, and
verifying in a real browser. In Claude Code, invoke it with:

```
/enrich-field-guide
```

or just describe the task ("add two stops to the 2026-395 guide", "create a new guide
for …") and it loads automatically. Under the hood it drives the same commands above.
The manual loop for new or changed imagery:

```bash
# 1. Write per-stop search queries into guides/<slug>/sources.json
#    { "<stop>": "text query" }   (a list is allowed; Wikimedia also takes {mode,query})

npm run fetch -- <slug> candidates   # 2. fill each stop Unsplash→Flickr→Wikimedia, download thumbs
npm run sheet -- <slug>              # 3. build contact sheets — read them, pick frames

# 4. Write picks into guides/<slug>/selections.json
#    { "<stop>": [[<key>, "<role>"], …] }
#    <key> = candidate number NN from the sheet, a "<source>:<id>" ref, or a bare "File:…"
#    <role> = wide | shot | detail | mood   (first pick is the frame shown before the lightbox)

npm run fetch -- <slug> finalize     # 5. full-res fetch + WebP + attribution -> manifest.json
npm run build -- <slug>              # 6. assemble
npm run verify                       # 7. offline check
```

Contact-sheet tiles are labeled `NNs` where `s` is the source letter (`u`/`f`/`w`), so
you curate knowing each frame's provenance.

## Layout

```
build/
  lib/       wikimedia · unsplash · flickr · sources (registry) · images · moon · html
  assets/    enrich.css · lightbox.html · lightbox.js  (injected into every guide)
  fetch.mjs  sheet.mjs  assemble.mjs  verify.mjs
guides/<slug>/
  content.html     authored shooting script (SVG placeholders + prose) — THE source of copy
  config.json      stop order, gps+elevation, day/jump groups, moon window, credits
  sources.json     per-stop search queries        (input to `candidates`) — optional
  selections.json  curation picks                  (input to `finalize`)
  manifest.json    curated images w/ base64 + attribution  (GENERATED, committed)
  work/ sheets/    candidate downloads + contact sheets     (git-ignored)
dist/              built guides + index.html  ← Cloudflare Pages serves this
```

See `CLAUDE.md` for the project's non-negotiables (fully offline, phone-lean, cleanly
licensed, don't strip the shooting script, static-hostable).

## Deploy (Cloudflare Pages)

Build command `npm run build`, output directory `dist`. No functions, no env needed —
building from a committed manifest never touches the network (API keys are only for
local re-sourcing).
