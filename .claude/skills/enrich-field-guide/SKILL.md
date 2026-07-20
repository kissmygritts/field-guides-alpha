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

**Set `WM_CONTACT` before any fetch** (`export WM_CONTACT="…email or url…"`) — Commons
429s an anonymous User-Agent. See `references/wikimedia.md`.

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
   `{ "<stop>": { "mode": "category"|"search", "query": "…" } }` (a list per stop is
   allowed). Prefer a real `Category:…` when one exists; else `search` (it forces
   `filetype:bitmap` to dodge PDFs/maps/diagrams). See `references/wikimedia.md`.
2. `node build/fetch.mjs <slug> candidates` — downloads thumbs to `work/<stop>/`.
3. `node build/sheet.mjs <slug>` — builds `sheets/<stop>.jpg` contact sheets.
   **Read each sheet** and actually look. Favor obscure/moody frames; the user wants
   variety (a hero "place" shot, a "the shot" composition, a detail, a mood frame).
   **Reject frames with people/intrusions** unless the subject genuinely needs scale.
4. **Write picks** into `selections.json`: `{ "<stop>": [["File:<title>", "<role>"], …] }`
   using the exact titles from `work/index.json`. Roles: `wide`, `shot`, `detail`,
   `mood`. Order matters — the first is the frame shown before the lightbox opens, so
   lead with the strongest.
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
