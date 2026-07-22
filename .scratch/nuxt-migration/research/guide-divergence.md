# Guide divergence audit — is the three-guide corpus one Nuxt template?

Scope: local audit of `guides/2026-395`, `guides/2026-reno-vegas`, `guides/2026-vegas-sandiego`
(each `content.html` + `config.json` + `manifest.json`), cross-checked against `build/assemble.mjs`
and `build/lib/html.mjs`. No network, no external docs.

## Verdict

**The three guides are essentially one template already.** The `<style>` block is byte-identical
across all three except for the `--dayN` accent-color variables (a 2–3 entry palette rotation), the
CSS class vocabulary is identical (26 classes, same set in all three), and every structural element
(masthead, day sections, stop cards, day-briefs, camp interstitials, field-notes grid, colophon) is
the same repeating markup differing only in authored copy and SVG placeholder art. `config.json`
carries a near-uniform schema — the only truly optional key is `feed` (present only in 2026-395). A
single Nuxt template parameterized by (a) an ordered list of days, (b) an ordered list of stops with
GPS/copy/SVG, and (c) a small set of trip-level fields would reproduce all three. The one thing a
naive data→template mapping does *not* capture cleanly is the hand-authored **SVG placeholder art**
and the free-prose blocks (dek, day-sub, day-brief lines, camp notes, field notes, colophon), which
are bespoke per stop/guide but structurally uniform.

## CSS divergence

The extracted `<style>` blocks (235 / 234 / 234 lines) are **identical except for the day-accent
custom properties** in the `#trip-root { … }` root rule. `diff` shows the only changed lines:

| Guide | Day accents declared |
|---|---|
| 2026-395 | `--day1:#c76b2a; --day2:#7f9b6d; --day3:#6f86a3;` (3 days) |
| 2026-reno-vegas | `--day1:#6f86a3; --day2:#c76b2a;` (2 days) |
| 2026-vegas-sandiego | `--day1:#c76b2a; --day2:#6f86a3;` (2 days) |

So the divergence is entirely: **(1) how many `--dayN` vars exist (= number of days), and (2) which
of a fixed 3-color palette `{#c76b2a orange, #6f86a3 blue, #7f9b6d/#8a9a72 sage}` each day gets.**
Every other rule — layout, typography vars (`--serif/--sans/--mono`), `.mast`, `.day`, `.stop`,
`.direct`, `.theshot`, `.camp`, `.notes`, `.colophon`, media queries — is character-for-character the
same. Each `<section class="day">` and `<article class="stop">` selects its accent inline via
`style="--accent: var(--dayN);"`, so day-color assignment is per-element data, not per-guide CSS.

Note: `assemble.mjs` step 3 also appends `build/assets/enrich.css` into the same `<style>` at build
time (the enrichment layer — gallery, geo line, jump nav, moon panel, credits, lightbox). That file
is shared and guide-independent.

## Structural elements

Document shell (identical in all three): `<!-- comment -->` → `<div id="trip-root">` → `<style>` →
`<header class="mast">` → `<div class="body">` → day/stop flow → `<section class="notes">` →
`</div><!-- /body --></div><!-- /trip-root -->`.

Present in **all three** (same markup, same classes):

- **Masthead** `header.mast`: inline SVG `.mast-ridge` (a mountain-silhouette `<path>`), `p.eyebrow`,
  `h1` (with `<em>`), `p.dek`, `div.mast-meta` holding several `<span><b>…</b>…</span>` stat chips.
- **Day header** `section.day` (inline `--accent`): `p.day-tag`, `h2.day-title`, `p.day-sub`,
  `div.day-legs` of `span.chip` timeline pills, `div.day-brief` of `<span><b>emoji Label</b> …</span>`
  fuel/signal/water/drive lines.
- **Stop card** `article.stop` (inline `--accent`): `div.stop-visual` (an SVG placeholder +
  `span.visual-label` — this is what assemble.mjs replaces with the photo gallery) and `div.stop-body`
  → `div.stop-kicker` (`span.stop-num` like `1.2`, `span.stop-when`), `h3` (title, optional
  `span.opt` badge), `<p>` prose, `div.direct` (three `<div><dt>Light/Glass/Access</dt><dd>…</dd></div>`,
  `dd` may carry `.warn`), and an **optional** `div.theshot` (`<span>The shot</span>` + prose).
- **Camp / drive interstitial** `div.camp`: a `span.ci` glyph (`▲` camp, `◆` drive-transition) + a
  `<div>` prose block; sometimes `style="border-color: var(--line);"`. Placed between stops / after a
  day. Free-form, repeating.
- **Field notes** `section.notes`: `h2` + `div.notegrid` of exactly 6 `div.note` (`h4` + `p`) in every
  guide, then a single `p.colophon` with three `<b>`-labeled lines joined by `<br>` (Art direction /
  Reference photographers / Route).

Element counts (structure repeats, quantity varies):

| Element | 395 | reno-vegas | vegas-sandiego |
|---|---|---|---|
| `section.day` | 3 | 2 | 2 |
| `article.stop` | 15 | 9 | 12 |
| `div.direct` (1/stop) | 15 | 9 | 12 |
| `div.theshot` (optional) | 11 | 9 | 12 |
| `div.camp` interstitial | 4 | 2 | 2 |
| `div.note` (field notes) | 6 | 6 | 6 |
| `span.opt` badges | 8 | 6 | 10 |

Nothing structural appears in only some guides. The only *optional-per-instance* pieces are
`div.theshot` (not every stop has one) and the `span.opt` badge. Injected-at-build structures
(jump nav, moon panel, credits, lightbox) come from assemble.mjs/enrich.css, not from `content.html`.

## config.json field inventory

Every distinct key across the three files. "In all 3?" = present in every config; value shape noted.
Path uses `.` for nesting and `[]` for array element.

| Key | In all 3? | Value shape | Consumed by |
|---|---|---|---|
| `slug` | yes | string | (identity; also dir name) |
| `title` | yes | string | `assemble` → `H.wrapDoc(title)`, dist index link text |
| `output` | yes | string (filename) | `assemble` → `dist/<output>` write path |
| `content` | yes | string (default `content.html`) | `assemble` → which HTML to read |
| `order` | yes | string[] of stop keys | `assemble` steps 1–2: drives gallery + `<h3>` injection, **must match document order** |
| `feed` | **NO — only 2026-395** | `{ stopKey: string[] }` | `imagesFor`: one card shows multiple manifest keys (owens → owens+cerrogordo). Defaults to `[slug]`. |
| `roles` | yes (identical text) | `{ wide,shot,detail,mood: string }` | `imagesFor`: maps a manifest image `role` → caption suffix |
| `disp` | yes | `{ stopKey: displayName }` | `imagesFor`: gallery caption prefix (`disp[ms] — role`) |
| `gps` | yes | `{ stopKey: {…} }` map | step 2 → `H.geoLine` |
| `gps.*.lat` | yes | number | geo link |
| `gps.*.lng` | yes | number | geo link |
| `gps.*.label` | yes | string | geo line place label |
| `gps.*.elev` | yes | string (e.g. `"6,047 ft"`) | geo line `▲ elev` |
| `gps.*.alt` | yes (a *few* stops each) | `[{ name, lat, lng, elev }]` | geo line extra "alt" pins (Cerro Gordo, Devils Hole, etc.) |
| `days` | yes | `[{ label, stops }]` | `H.jumpNav` |
| `days[].label` | yes | string (`"Day 1"`) | jump-nav row label |
| `days[].stops` | yes | `[[stopKey, shortLabel], …]` | jump-nav anchors `#s-<key>` + link text |
| `moon` | yes | `{ start, end, windowLabel }` | `moonReport(start,end)` + `H.moonPanel` |
| `moon.start` / `moon.end` | yes | ISO date string | computed moon report |
| `moon.windowLabel` | yes | string | moon panel heading |
| `darkSites` | yes | string (prose list) | `H.moonPanel` dark-sky note |
| `credits` | yes | `[[stopKey, displayName], …]` | `H.creditsBlock` (joins with manifest attribution) |

Shape notes: `order`, `credits`, and `days[].stops` are three *separate* orderings of the same stop
keys (flat list, credit pairs, day-grouped pairs) — redundant data a schema could derive one from
another. `disp` and the `credits`/`days` labels are three more copies of a stop's human name at
different lengths. `feed` is the sole genuinely guide-specific key.

## One-off HTML

Nothing in any body breaks the uniform stop/day/brief/camp/notes pattern *structurally*. The
"bespoke" content that a pure data→template mapping does not trivially capture:

1. **Per-stop SVG placeholder art.** Each `div.stop-visual` contains a hand-drawn inline `<svg>`
   (gradients, spires, storefronts, dunes…) unique to that stop. `assemble.mjs` **deletes** all of it
   (regex replace with the photo gallery), so for the *built* output it's throwaway — a template can
   emit a generic placeholder or nothing. Only matters if the authoring/preview view wants art.
2. **Free-prose fields.** `dek`, `day-sub`, each `day-brief` line, stop `<p>` bodies, `theshot` text,
   `camp` notes, the 6 field notes, and the 3-line colophon are all authored per stop/guide. These are
   string fields, not structural variants — they map to data, but they're the actual content payload,
   not boilerplate.
3. **`camp` glyph choice** (`▲` vs `◆`) and optional inline `border-color` style — a small enum a
   template would parameterize.
4. **`mast-ridge` SVG path** — one hand-tuned mountain silhouette; identical intent across guides,
   different `d`. Could be shared/static.

No guide contains a section, table, embed, or layout that the other two lack. There are no
guide-unique classes.

## Implications for the schema/template

- **One template is viable.** Parameterize by: trip-level fields (`title`, `output`/`slug`,
  `dek`/eyebrow, `mast-meta` chips, `moon`, `darkSites`, colophon lines, reference-photographer list),
  a `days[]` array, and each day's ordered `stops[]`.
- **Day accent** is data, not CSS: a day carries an accent from a fixed 3-color palette; drop the
  per-guide `--dayN` block and assign `--accent` per day/stop element (as the guides already do
  inline). Template just needs a palette + day→color index.
- **Collapse the triple stop-ordering.** `order`, `days[].stops`, `credits`, and `disp` are four views
  of the same stop objects. A schema should model a stop once (`{ key, name, shortName, gps, images,
  copy, theShot?, feed? }`) grouped under days, and derive the flat order / credits / jump nav.
- **`feed` becomes a per-stop `extraImageKeys`/merged-gallery flag** rather than a top-level map.
- **`gps.alt`** is a clean 0-N nested list on a stop — keep as-is.
- **Optional fields to model as nullable:** `theShot` (per stop), `opt` badge (per stop),
  `camp`/interstitial notes (0-N between stops, with a glyph enum), `feed`.
- **SVG placeholder art** can be dropped from the data model entirely for the offline output (assemble
  discards it). Keep only if a live Nuxt preview wants a pre-image placeholder.
- **Field notes** are a fixed-cardinality-ish (6 observed) list of `{ heading, body }` — model as an
  array, don't hardcode 6.
- The shared **enrich.css + lightbox** already prove the enrichment layer is guide-independent; in
  Nuxt it becomes a component/layout, not injected strings.
