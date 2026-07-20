---
name: enrich-field-guide
description: >-
  Build or enrich an offline-first, self-contained photographer's field guide in
  this repo — source cleanly-licensed reference imagery, embed it as base64,
  add field data (GPS, elevation, fuel/signal briefs, moon phase), and verify it
  works in a real browser with no network. Use when the user wants to create a new
  guide, add stops/images to an existing one, or reproduce a build.
---

# Enrich a field guide

The toolchain does the mechanical work; you do judgment (which images, what copy).
Read `CLAUDE.md` first for the non-negotiables. Work a guide by its `<slug>`
(e.g. `2026-395`) under `guides/<slug>/`.

**API keys before any fetch.** Imagery comes from three sources, tried per stop in
order with sequential fallback: **Unsplash → Flickr → Wikimedia Commons**. Set the
keys for the sources you want; a source with no key is skipped (Wikimedia needs none,
so it always backs the chain):

- `WM_CONTACT` — an email/URL (Commons 429s an anonymous User-Agent). See `references/wikimedia.md`.
- `UNSPLASH_KEY` — Access Key from https://unsplash.com/developers.
- `FLICKR_KEY` — API key from https://www.flickr.com/services/apps.

Licensing differs by source and is captured from each API, never guessed: Wikimedia
= CC BY/BY-SA/CC0; Flickr = restricted to reuse-friendly CC/PD licenses (no
ND — we re-encode); Unsplash = the Unsplash License (attribution, non-commercial
personal use). Every image's source + artist + license lands in the manifest and the
credits block.

## A. Rebuild an existing guide (no new imagery)

The manifest already holds the images. Just:

```
npm run build -- <slug>     # guides/<slug> -> dist/<output>.html
npm run verify              # must PASS: 500/500, net 0, no JS errors
```

`content.html` + `config.json` + `manifest.json` fully determine the output — no
network needed. This is the cheap path; prefer it whenever imagery isn't changing.

## B. Add stops or images

1. **Author the content.** Add each stop's `<article class="stop">` to
   `content.html` in geographic order — copy an existing stop as the template
   (placeholder `<svg aria-hidden="true"></svg>` + `<span class="visual-label">`,
   then `stop-kicker`, `<h3>`, prose `<p>`, `.direct` dl, `.theshot`). Renumber
   `stop-num`s. Keep it in the same order you'll list in `config.order`.
2. **Register in `config.json`:** add to `order`, `disp`, `gps` (lat/lng/label/elev),
   the right `days` group (for the jump index), and `credits`. See `references/features.md`.
3. **Source imagery** (section C).
4. Build + verify (section A).

## C. Source & curate imagery

1. **Write queries** into `guides/<slug>/sources.json`:
   `{ "<stop>": "plain text query" }`. A list per stop is allowed, and any entry may
   be `{ "mode": "category"|"search", "query": "…" }` — `mode` only affects Wikimedia
   (`category` walks a `Category:…`; otherwise `search` forces `filetype:bitmap` to
   dodge PDFs/maps/diagrams). The same query string is reused across all three
   sources. **For any obscure place-name stop (a specific lake, ghost town, landmark),
   give it a `Category:` query** — that both walks the clean Commons category and makes
   the stop source **Wikimedia-first**, where the file titles are trustworthy. Reserve
   bare text queries (Unsplash-first) for generic scenics where you want the nicer
   stock photo and don't mind eyeballing. See `references/wikimedia.md`.
2. `node build/fetch.mjs <slug> candidates` — fills each stop up to the cap
   (Unsplash→Flickr→Wikimedia, or Wikimedia-first for category stops), downloads thumbs
   to `work/<stop>/`, records `[NN, ref, source, title]` in `work/index.json`. Prints
   the per-source mix and flags which stops went Wikimedia-first.
3. **Curate mainly from titles, not by eyeballing every sheet.** `work/index.json` holds
   each candidate's `title` — for Wikimedia-first stops those titles are reliable
   (`Category:Walker Lake (Nevada)` files *are* Walker Lake), so pick from them and let
   the authored copy frame the roles. Build sheets (`node build/sheet.mjs <slug>` →
   `sheets/<stop>.jpg`, tiles labeled `NNs`) and **read a sheet only to spot-check** —
   confirm the subject is right (Unsplash text search drifts badly — a lake/town of the
   same name), and reject frames with people/intrusions or archival junk. Don't vision-
   curate for aesthetics; the guide's editorial voice comes from the content, not from
   ranking frames by mood.
4. **Write picks** into `selections.json`: `{ "<stop>": [[<key>, "<role>"], …] }`. A
   `<key>` is the candidate number `NN` from the sheet (simplest), a `"<source>:<id>"`
   ref (e.g. `"unsplash:abc123"`, `"wikimedia:File:Foo.jpg"`), or a legacy bare
   `"File:Foo.jpg"`. Roles: `wide`, `shot`, `detail`, `mood`. Order matters — the
   first is the frame shown before the lightbox opens, so lead with the strongest.
5. `node build/fetch.mjs <slug> finalize` — full-res fetch, WebP encode, real
   attribution from the API, writes `manifest.json`. It prints per-image KB and a
   total — **report the total MB to the user** (constraint 2).

## D. Verify (always)

```
npm run verify              # PASS = no overflow (500/500), net 0, zero JS errors
npm run verify -- --shot    # spot-check screenshots in build/.verify/
```

Then **Read a screenshot or two** to sanity-check layout and that the right photos
landed for each stop (this is how the bristlecone image-desync bug was caught before).
Don't trust apparent right-edge cropping in shots — that's the 500px clamp, not
overflow; see `references/verify.md`.

## Gotchas (read the reference before hitting them)

- `references/wikimedia.md` — 429/User-Agent, category vs. search, verify-don't-guess attribution.
- `references/verify.md` — the 500px headless clamp, measuring scrollWidth, offline check.
- `references/features.md` — config-driven features: gps/elevation, jump index, moon panel, day briefs.

## Report to the user

Total size (MB + image count), any sourcing compromises (a stop with thin/imperfect
imagery — say so honestly), and the verify result. Don't claim it's done until verify
PASSes.
