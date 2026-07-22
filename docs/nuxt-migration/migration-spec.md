# Migration + deploy spec — existing guides → Nuxt

> Resolves [Migration + deploy spec for the existing guides](https://github.com/kissmygritts/field-guides-alpha/issues/8)
> (ticket #8 of the [Nuxt migration wayfinder](https://github.com/kissmygritts/field-guides-alpha/issues/1)).
> **Spec, not execution.** This is the migration section of the eventual handoff spec;
> it defines *how* the three guides convert and *how* deploy changes, for an
> implementation session to follow. Nothing here is built.
>
> Depends on the data model (#2), image pipeline (#7), rendering (#6), and the
> `@nuxt/image` / deploy research (#4) already resolved on the map.

## 1. Conversion approach — **hybrid** (scripted structure + hand-ported prose)

Each old guide is three files; they split cleanly along a mechanical / authored seam:

| Old file | New home | How |
|---|---|---|
| `config.json` (structured: order, gps, days, moon, credits) | `content/<slug>.yml` structured keys | **scripted** — a one-shot `config → yml` transform; data is already clean |
| `manifest.json` (base64 images + attribution) | `public/guides/<slug>/<stop>-<role>.webp` + `images:` block in the yml | **scripted** — the rewritten `finalize` (#7) already does this from `selections.json`; no separate migration path needed |
| `content.html` (authored prose, in HTML) | yml `description` / `theShot` / `directions` / day `brief` — thin inline Markdown | **hand-ported** — HTML→Markdown is lossy and this copy *is the product* (non-negotiable #4); human eyes on 3 guides, not a brittle parser |

**Why hybrid, not fully scripted:** a full `content.html` DOM→Markdown parse (turndown et al.)
leaves artifacts — `<span class="opt">`, `<b>`, `<dt>/<dd>` pairs, kicker spans — that
need hand-cleanup anyway. For three guides the parser is net-negative tooling.

**Why not fully hand-authored:** the structured data (coordinates, elevations, day
grouping, moon window) is already correct in `config.json`; re-keying GPS by hand only
adds transcription errors.

### Lost / gained

- **Gained:** every location becomes a first-class stop; `elev` becomes a number; prose
  is short and constrained; design lives once in the template, not 236 duplicated CSS
  lines per guide.
- **Lost (deliberately):** the hand-drawn SVG placeholders in `stop-visual` — the new
  model always renders real imagery, the SVGs were a base64-era stand-in and are dropped.
- **Lost (deliberately):** the `feed` merged-gallery key — killed by promoting sub-stops
  (#2). *reno-vegas has no `feed` key, so it doesn't exercise this;* the guide that does
  gets each fed stop split into its own stop during its port.
- **Watch:** promoted `alt` sub-stops (see below) carried only coords+name in the old
  model. Any imagery that visually belongs to them (e.g. the Clown Motel shot filed
  under `tonopah`) **re-keys during curation**, not automatically — flag per alt.

## 2. Field mapping (authoritative)

`config.json` → `content/<slug>.yml`:

| config.json | yml | note |
|---|---|---|
| `slug`, `output`, `content` | — | dropped; slug is the **filename stem**, verbatim (#6) |
| `title` | `title` | as-is |
| `order` | — | **derived** from `days[].stops` sequence |
| `disp` | — | **derived** from each stop's `name` |
| `roles` (role→label map) | — | **derived**; moves to the shared template |
| `gps.<stop>` `{lat,lng,label,elev}` | `stop.gps` | `elev` string `"4,255 ft"` → number `4255` |
| `gps.<stop>.alt[]` | promoted sibling stops, `optional: true` (#2) | |
| `days[].label` | — | **derived** `Day N · Weekday` from `moon.start` + index |
| `days[].stops` | `days[].stops[]` (order + membership) | |
| `moon` `{start,end,windowLabel}` | `moon` `{start,end,window}` | phase label **derived** (build-time TS util, #6) |
| `darkSites` | `darkSites` | as-is |
| `credits` | — | **derived** from `images[]` across all stops |

`content.html` (per-stop) → yml:

| content.html | yml | 
|---|---|
| `<h3>Name<span class="opt">tag</span></h3>` | `stop.name` + optional `stop.tag` |
| `<span class="stop-when">…</span>` | `stop.when` |
| `<span class="stop-num">1.2</span>` | **derived** (day + index) |
| stop `<p>` prose | `stop.description` (inline Markdown) |
| `<div class="direct"><dt>/<dd></div>` | `stop.directions[]` `{label,value,warn?,icon?}` |
| `<div class="theshot">…</div>` | `stop.theShot` (inline Markdown) |
| day-level intro/brief prose | `day.brief[]` — same `{label,value,warn?,icon?}` type as `directions` (#2) |

`manifest.json` → images: handled by the rewritten `finalize` (#7), not this migration —
`selections.json` (unchanged) drives it; images land at
`public/guides/<slug>/<stop>-<role>.webp`, attribution upserted into `images:` keyed by
`stop`+`role`.

## 3. Worked example — `2026-reno-vegas`

The reference the implementation session mirrors. Representative slice: one plain stop,
the day-level brief, and an `alt` promotion.

```yaml
# content/2026-reno-vegas.yml   (slug = filename stem, not authored)
title: "Reno to Las Vegas — Photographer's Shooting Script"
moon: { start: 2026-09-24, end: 2026-09-28, window: "late September" }
darkSites: "Tonopah, Goldfield, the Rhyolite flats"

days:
  - # label "Day 1 · Thu" DERIVED from moon.start + index
    brief:
      - { label: Route, value: "Alt US-95 → US-95 south" }
      - { label: Fuel, value: "Fallon, then top off before Tonopah", warn: true }
    stops:
      - id: fortchurchill
        name: "Fort Churchill"
        tag: "state park"                 # from <span class="opt">
        when: "Low AM · roadside detour"  # from stop-when
        gps: { lat: 39.2936, lng: -119.2889, label: "adobe ruins, off Alt US-95", elev: 4255 }
        description: >
          An 1860s U.S. Army cavalry post melting back into the desert — **roofless
          adobe walls** ranged along the Carson River, cottonwoods behind them, a small
          pioneer cemetery. Your Nick Carver warm-up: texture, restraint. Morning
          side-light rakes the eroded adobe best.
        directions:
          - { label: Light,  value: "Low AM side-light on the walls" }
          - { label: Glass,  value: "35 / 50 · documentary, restrained" }
          - { label: Access, value: "Paved park road — any car · small fee" }
        theShot: >
          One adobe wall raking away from camera, warm light catching the crumbling
          edges, cottonwoods and empty sky behind — then a tight detail of eroded mud brick.
        images:                            # upserted by finalize (#7); shown for shape
          - { file: fortchurchill-shot.webp, role: shot, source: wikimedia,
              artist: "Peretz Partensky from San Francisco, USA", license: "CC BY-SA 2.0",
              descurl: "https://commons.wikimedia.org/wiki/File:Fort_Churchill_(5752450217).jpg" }
          - { file: fortchurchill-wide.webp, role: wide, source: wikimedia, artist: "…", license: "…", descurl: "…" }
          - { file: fortchurchill-mood.webp, role: mood, source: wikimedia, artist: "…", license: "…", descurl: "…" }

      # … walker, hawthorne …

      - id: tonopah
        name: "Tonopah"
        when: "Night · Main St"
        gps: { lat: 38.0692, lng: -117.2306, label: "Historic Mining Park, Main St", elev: 6047 }
        description: >
          High-desert mining town … dark skies overhead.
        directions: [ … ]
        theShot: >
          …
        images: [ … ]

      - id: tonopah-cemetery              # PROMOTED from config.gps.tonopah.alt (#2)
        name: "Old Cemetery · Clown Motel"
        optional: true
        gps: { lat: 38.0778, lng: -117.2314, label: "off Main St", elev: 6030 }
        # no prose by default — alts carried only coords+name.
        # the old tonopah 'mood' Clown Motel shot re-keys here during curation.
        images: [ ]
  - # Day 2 · Fri …
    stops: [ goldfield, carforest, rhyolite, zabriskie, ashmeadows … ]
```

Exercised by this guide: `alt` promotion (tonopah, rhyolite→Goldwell, ashmeadows→Devils
Hole), mixed `wikimedia` + `unsplash` sources (attribution enums), `elev` string→number,
day-label derivation. Not exercised: `feed` (absent here — covered by whichever guide has it).

## 4. Deploy

| | Old | New |
|---|---|---|
| Build command | `npm run build` (`assemble.mjs`) | `nuxt generate` |
| Output dir (Cloudflare Pages) | `dist` | `.output/public` |
| Image provider | `sharp` → base64 in HTML | `@nuxt/image` **IPX**, SSR-on `generate` bakes 640/q80 + retina (#7); bounded `sharp` pre-pass (~1600px) in `finalize` keeps git lean |
| Env | none | none (zero-server; `WM_CONTACT` only for local fetch, as today) |

**`verify.mjs` → retired.** Its core assertion was *zero network requests* (the offline
guarantee); offline is dropped, so that check is meaningless. New safety net:

- `nuxt build` / `vue-tsc` typecheck,
- **Zod parse of every `content/*.yml` at load** (#3) — the schema is the gate,
- broken images surface in `dev` / at `generate` time.

No headless-Chrome no-overflow / broken-asset harness carries forward. (If field
regressions later prove that gap matters, a broken-image smoke check can be reintroduced
as its own task — out of scope here.)

**Index page** (`dist/index.html` today) becomes the `/` route — tracked as fog on the
map, not specified here.

## 5. Sequencing for the implementation session

Keep the current `npm run build` + `dist` **working throughout**; the Nuxt app is built
alongside and only cut over at the end.

1. **Scaffold** the Nuxt app: the shared **Zod schema** (#2/#3) + typed `content/<slug>.yml`
   composable, the presentational component tree (#6: Masthead · JumpNav · DaySection ·
   StopCard · Gallery · MoonPanel · Credits · Lightbox · FieldList), and the **global
   tokenized stylesheet** ported from `enrich.css` + the shared `content.html` CSS (#5/#6).
2. **Rewrite `finalize`** (#7): emit `public/guides/<slug>/*.webp` + upsert `images:` into
   the yml. The curation front-half (`sources.json` → `fetch candidates` → `sheet` →
   `selections.json`) is untouched.
3. **Migrate `2026-reno-vegas` end-to-end** (the worked example): run `config → yml`,
   hand-port the prose, run `finalize` for images, render, eyeball against the old
   `dist/2026-reno-vegas.html` for parity. This validates schema + components + pipeline
   together on the hardest guide.
4. **Migrate `2026-395` and `2026-vegas-sandiego`** using reno-vegas as the reference;
   split the `feed` guide's merged galleries into promoted stops here.
5. **Wire the `/` index** route listing all guides.
6. **Cut over deploy**: Cloudflare Pages build → `nuxt generate`, output → `.output/public`.
   Once all three render at parity, delete `build/assemble.mjs`, `build/verify.mjs`, and
   `build/assets/`.
