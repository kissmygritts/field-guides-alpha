# Nuxt migration — handoff spec

> Resolves [Final spec synthesis](https://github.com/kissmygritts/field-guides-alpha/issues/9)
> (the destination of the [Nuxt migration wayfinder](https://github.com/kissmygritts/field-guides-alpha/issues/1)).
>
> **This is the single source an implementation session builds from.** It reconciles the
> decisions made across tickets #2–#8 (informed by research #3/#4/#5) into one coherent
> spec. You should not need to re-read the tracker. Where a decision has deeper rationale,
> the owning ticket is linked; the migration *mechanics* live in a companion doc,
> [`migration-spec.md`](./migration-spec.md), referenced from §8.
>
> **Spec, not execution.** Nothing here is built. The output of *this* effort is this
> document; building the Nuxt app is the next, separate effort.

---

## 1. What we're building & why

Migrate field-guide from the current single-HTML-file-per-guide toolchain to a **Nuxt
SSG app**: one structured data file per guide, rendered by a shared presentational
component tree, images via `@nuxt/image`. The choices below are made so two *downstream*
efforts stay reachable without rework: a **drafting/curation app** (surface candidates →
user picks → writes a guide) and a **PWA/offline mode**.

**Locked constraints (decided during charting, not up for revisiting):**

- **Nuxt** is the framework — user familiarity, and it fits the downstream drafting app
  better than a static-first tool.
- **`@nuxt/image`** for imagery — real files + IPX, not base64.
- **Offline is no longer a hard requirement.** Base64 inlining existed only to serve it;
  it goes away. Offline returns later as a PWA (`@vite-pwa/nuxt` service-worker precache).
- **Data-driven with thin prose.** Descriptions are short constrained-Markdown strings,
  not long-form copy. The ~236-line CSS block duplicated in every `content.html` collapses
  to one shared, tokenized stylesheet.
- The **drafting app** and **PWA** are downstream — they shape decisions here but are
  **not built** in the migration.

## 2. Project shape

```
content/
  <slug>.yml                     # one guide per file; slug = filename stem, verbatim
public/
  guides/<slug>/<stop>-<role>.webp   # image binaries (IPX-optimizable), joined to yml by slug
schema/                          # or app/schema — the one shared Zod schema (§3)
composables/
  useGuides.ts  useGuide.ts      # typed, Zod-validated loaders (§4)
  useLightbox.ts                 # shared overlay state (§7)
utils/
  moon.ts                        # pure build-time phase util, ported from build/lib/moon.mjs (§6.5)
  derive.ts                      # order / credits / day-label / stop-number derivations (§5)
components/                      # flat, auto-imported, all presentational (§6.3)
  Masthead.vue JumpNav.vue DaySection.vue StopCard.vue Gallery.vue
  MoonPanel.vue Credits.vue Lightbox.vue FieldList.vue
pages/
  index.vue                      # guide listing (replaces dist/index.html)
  guides/[slug].vue              # the ONE smart component
assets/css/                      # global tokenized stylesheet (ports the current look)
```

The old `build/` toolchain's **curation front-half survives** (see §7); only `finalize`
is rewritten. `assemble.mjs`, `verify.mjs`, and `build/assets/` are deleted at cutover.

## 3. Data model & the shared Zod schema

[Ticket #2](https://github.com/kissmygritts/field-guides-alpha/issues/2) ·
[ticket #3 (skip Nuxt Content)](https://github.com/kissmygritts/field-guides-alpha/issues/3)

**One `content/<slug>.yml` per guide** holds everything authored, validated by **one
shared Zod schema** that is the single source of truth for both the renderer (§4) and the
future drafting app's write path. Image binaries are **not** in the yml — they are sibling
files under `public/guides/<slug>/` (§7), referenced by bare filename.

**Design rules baked into the schema:**

- **Every location is a first-class stop.** Former `gps.<stop>.alt[]` sub-stops (Cerro
  Gordo, Devils Hole, Goldwell) are **promoted to normal stops** marked `optional: true`.
  This kills the old `feed` merged-gallery key entirely — no gallery merging; each stop
  renders its own images.
- **Stops nest inside days** — the day is the container, one source of truth per stop.
- **`directions` (per stop) and `brief` (per day) share one type** — an open, ordered
  labeled list. Labels are free-text (`Light`, `Glass`, `Access`, `Fuel`, `Also`,
  `Altitude`, …), *not* a fixed enum.
- **Prose is thin, constrained inline Markdown** — bold + italic only, no block-level
  syntax. A Zod `.refine()` rejects block markdown so authors can't smuggle long-form copy
  back in.
- **`elev` is a number** (feet), never a display string. `image.role` and `image.source`
  are enums.
- **Derived, never authored** (see §5): `order`, `disp`/display-names, `credits`,
  image role labels, `Day N · Weekday`, moon `windowLabel`/phase label, stop numbers.

### The schema (authoritative)

Illustrative TypeScript; `zod` is the only new dependency beyond Nuxt itself. `mdInline`
is a branded string with a refinement that rejects block-level Markdown.

```ts
import { z } from 'zod'

// Thin-prose guard: bold/italic/inline-code/links allowed; no headings, lists,
// blockquotes, code fences, or hard line-block structure.
const mdInline = z.string().refine(s => !/^\s*(#{1,6}\s|[-*+]\s|>\s|```|\d+\.\s)/m.test(s),
  { message: 'block-level Markdown is not allowed in thin-prose fields' })

// Shared labeled-list item — used by stop.directions AND day.brief (#2 unification).
const fieldItem = z.object({
  label: z.string(),          // free-text: Light / Glass / Access / Fuel / Also …
  value: mdInline,
  warn:  z.boolean().optional(),   // renders the alert treatment (old .warn)
  icon:  z.string().optional(),    // emoji/glyph, used mainly by day.brief
})

const image = z.object({
  file:       z.string(),                                  // bare filename, joined to /guides/<slug>/ at render
  role:       z.enum(['wide', 'shot', 'detail', 'mood']),
  source:     z.enum(['unsplash', 'flickr', 'wikimedia']),
  artist:     z.string(),
  license:    z.string(),                                  // e.g. "CC BY-SA 2.0", "Unsplash License"
  licenseUrl: z.string().url().optional(),                 // license deed  (manifest `licenseurl`)
  sourceUrl:  z.string().url(),                            // source/description page (manifest `descurl`) — the attribution link
})

const gps = z.object({
  lat:   z.number(),
  lng:   z.number(),
  label: z.string(),          // human place label shown on the geo line
  elev:  z.number(),          // FEET, numeric
})

const stop = z.object({
  id:          z.string(),                     // stable key (former manifest/config stop key)
  name:        z.string(),
  badge:       z.string().optional(),          // free-text kicker, e.g. "state park" (old span.opt)
  optional:    z.boolean().optional(),         // true for promoted alts / "worth it if you have time"
  when:        z.string().optional(),          // e.g. "Low AM · roadside detour"
  teaser:      mdInline.optional(),
  description: mdInline,
  location:    z.string().optional(),          // free-text locale line if distinct from gps.label
  gps,
  directions:  z.array(fieldItem).default([]),
  theShot:     mdInline.optional(),
  images:      z.array(image).default([]),      // upserted by finalize (§7)
})

const day = z.object({
  theme:   z.string().optional(),               // day title / theme
  route:   z.string().optional(),               // one-line route summary
  summary: mdInline.optional(),                 // day-sub prose
  legs:    z.array(z.object({ at: z.string(), text: z.string() })).default([]), // itinerary chips
  brief:   z.array(fieldItem).default([]),       // fuel/signal/water/drive — same type as directions
  stops:   z.array(stop).min(1),
})

const masthead = z.object({
  eyebrow:   z.string(),
  title:     mdInline,
  dek:       mdInline,
  meta:      z.array(z.string()).default([]),    // plain-text stat chips (bold dropped for now)
  startDate: z.coerce.date(),                    // drives "Day N · Weekday" derivation
})

export const guideSchema = z.object({
  masthead,
  moon:       z.object({ start: z.coerce.date(), end: z.coerce.date() }),
  darkSites:  z.string(),                         // prose list of dark-sky sites
  days:       z.array(day).min(1),
  fieldNotes: z.array(z.object({ heading: z.string(), body: mdInline })).default([]),
  colophon:   z.object({                          // the 3 credit lines, structured
    artDirection: z.string().optional(),
    photographers: z.string().optional(),
    route: z.string().optional(),
  }).optional(),
})

export type Guide = z.infer<typeof guideSchema>
export type Stop  = z.infer<typeof stop>
export type FieldItem = z.infer<typeof fieldItem>
```

**Reconciliation note (editorial, not a new decision):** the `image` block unifies #2's
`licenseUrl`/`sourceUrl` naming with #7's `finalize` output and the current
`manifest.json`. Mapping from today's manifest: `licenseurl → licenseUrl`,
`descurl → sourceUrl`, `title` is dropped (filename carries identity). `sourceUrl` is
required because it is the attribution link rendered in credits; `licenseUrl` is optional.

**Fog carried forward:** the masthead `meta` vocabulary stays a free plain-text list for
now — standardize it after building several guides (from #2).

## 4. Data loading — typed composable, no Nuxt Content

[Ticket #3](https://github.com/kissmygritts/field-guides-alpha/issues/3) — **verdict:
skip Nuxt Content.** For structured records with short strings, Content's markdown/AST/SQL
machinery is unused; it would add a `@nuxt/content` dependency, a SQLite/WASM build step,
and a client-side DB payload for nothing. The deciding factor: the future drafting app
needs a *write* path, and Content is build-time-read-only — so a shared Zod schema across a
read composable and the app's write path keeps one source of truth either way.

Load `content/*.yml` directly, Zod-validate at build:

```ts
// composables/useGuides.ts
import { guideSchema, type Guide } from '~/schema/guide'

const modules = import.meta.glob('~/content/*.yml', { eager: true, import: 'default' })
// needs a yaml loader in vite config, e.g. @rollup/plugin-yaml
const guides = Object.entries(modules).map(([path, raw]) => ({
  slug: path.split('/').pop()!.replace(/\.yml$/, ''),   // filename stem = slug, verbatim
  ...guideSchema.parse(raw),                             // bad YAML fails the BUILD
}))

export const useGuides = () => guides                     // index page
export const useGuide  = (slug: string) => guides.find(g => g.slug === slug)
```

Bad YAML fails the build; types are fully inferred from the schema; zero runtime DB.

## 5. Derived data (single place, never authored)

[#2](https://github.com/kissmygritts/field-guides-alpha/issues/2) ·
[#5](https://github.com/kissmygritts/field-guides-alpha/issues/5). The old model stored the
same stop identity four ways (`order`, `days[].stops`, `credits`, `disp`). The schema
models each **stop once**; everything below is computed in `utils/derive.ts` (or the page
composable) and passed as props — the authored yml never carries it.

| Derived value | From | Notes |
|---|---|---|
| Flat `order` | `days[].stops` sequence | jump-nav + document order |
| Display name (`disp`) | `stop.name` | gallery caption prefix |
| `credits` list | union of every `stop.images[]` | one row per image: name, artist, source, license, `sourceUrl` |
| Image role label | `image.role` enum | `wide→"the place"`, `shot→"toward 'the shot'"`, `detail→"detail"`, `mood→"mood · light"` — a **rendering constant**, not per-guide data |
| `Day N · Weekday` | `masthead.startDate` + day index | e.g. `Day 1 · Thu` |
| Stop number (`1.2`) | day index + stop index | `<dayN>.<stopN>` |
| Moon `windowLabel` + phase | `moon.start`/`end` via `utils/moon.ts` | pure build-time TS util (§6.5) |
| Day accent (`--accent`) | day index → global palette | fixed 3-color palette; no color authored (§6.4) |

## 6. Rendering architecture

[Ticket #6](https://github.com/kissmygritts/field-guides-alpha/issues/6).

### 6.1 Routing (SSG)

- `pages/index.vue` → guide listing (replaces `dist/index.html`).
- `pages/guides/[slug].vue` → one dynamic route per guide.
- `nuxt generate` enumerates slugs from `content/` and prerenders one route per file.
- **Slug = the content filename stem, verbatim.** The old `2026-` date-prefix convention
  is dropped; rename a file freely and the URL follows.
- URL prefix `/guides/` keeps a namespace open for future non-guide pages / the drafting app.

### 6.2 Smart/dumb boundary

**Exactly one smart component: the page** (`pages/guides/[slug].vue`). It calls the typed
composable, runs the §5 derivations, and passes plain props down. **Every other component
is presentational** — props in, markup out, no data fetching. This is what lets the
downstream drafting app render the *same* component tree from its own live, mutable state.

### 6.3 Component contract

Flat `components/`, Nuxt auto-import, plain names. A component earns its own file only on
**reuse** (`FieldList`) or **real internal behavior** (`Gallery`, `Lightbox`); trivial
`v-for`-over-strings blocks (chips, masthead meta) stay inline in their parent.

| Component | Props (shape) | Responsibility |
|---|---|---|
| `Masthead` | `{ eyebrow, title, dek, meta: string[] }` | eyebrow, title (+`<em>` accent), dek, meta stat chips (inline `v-for`), static ridge SVG |
| `JumpNav` | `{ days: { label, stops: { num, name, anchor }[] }[] }` | day/stop anchor index (derived) |
| `DaySection` | `{ label, theme, route, summary, legs, brief: FieldItem[], accentIndex, stops }` | day header, legs/chips (inline), brief via `FieldList`; binds `--accent` from `accentIndex`, cascades to child stops |
| `StopCard` | `{ num, name, badge?, optional, when, teaser?, description, location?, gps, directions: FieldItem[], theShot?, images }` | kicker (num/optional/when), title (+locale), desc, geo line, directions via `FieldList`, theShot, hosts `Gallery` |
| `Gallery` | `{ images: { src, role, roleLabel, artist, license, sourceUrl }[] }` | multi-photo grid, per-image attribution, opens lightbox via `useLightbox()` |
| `MoonPanel` | `{ windowLabel, phaseLabel, start, end, darkSites }` | dumb; receives derived moon data |
| `Credits` | `{ items: { name, artist, source, license, sourceUrl }[] }` | colophon + attribution list (derived union) |
| `Lightbox` | — (reads `useLightbox()` state) | one instance at page root; overlay + keyboard/touch nav |
| `FieldList` | `{ items: FieldItem[] }` | shared `{label, value, warn?, icon?}` list — used by `StopCard.directions` **and** `DaySection.brief` |

`pages/index.vue` + `pages/guides/[slug].vue` are the only files in `pages/`.

### 6.4 Styling

- **Global tokenized stylesheet is the base** — port the current prototype CSS so the look
  is preserved, factoring design tokens (colors, type stack, spacing, day-accent palette)
  into reusable custom properties.
- **Scoped `<style scoped>`** on components/pages where necessary.
- **Day accent is data-derived, can't defer:** palette stays global (`--day1`, `--day2`,
  …) from a fixed 3-color set `{orange #c76b2a, blue #6f86a3, sage #7f9b6d}`. Authored YAML
  carries **no color**; `DaySection` binds `--accent` from its day index and it cascades to
  the stops inside — exactly as today's inline `--accent` var does.
- The full **design-language / CSS-architecture sprint** (Tailwind vs a leaner token-CSS
  system) is **out of scope** — its own follow-up (§9).

### 6.5 Moon panel

Port `build/lib/moon.mjs` to a **pure TS util** (`utils/moon.ts`, auto-imported), computed
at **prerender** and baked into props for the dumb `MoonPanel`. Zero client JS, zero
runtime cost. A server route was rejected (reintroduces a runtime server, computes
something build-time-fixed); a composable wrapper was skipped (nothing to fetch). The pure
function is what the future drafting app reuses.

### 6.6 Lightbox

Rewrite as a small idiomatic **`Lightbox.vue`** — reactive `{ open, images, index }`,
`<Teleport to="body">`, keyboard (Esc/←/→) + touch-swipe as Vue listeners. No library (a
dependency for ~38 lines of behavior, against the one-dependency ethos). One Lightbox
mounts at the page; many Galleries open it via a tiny **`useLightbox()` composable** holding
the shared overlay state (`open(images, index)`) — *view* state, not data-loading, so it
doesn't violate the one-smart-component rule.

## 7. Image pipeline & toolchain

[Ticket #7](https://github.com/kissmygritts/field-guides-alpha/issues/7) ·
[research #4](https://github.com/kissmygritts/field-guides-alpha/issues/4).

**Base64 is gone; `@nuxt/image` renders real files.** Only `finalize` is rewritten — the
curation front-half survives verbatim.

**Storage & references**
- Files live in **`public/guides/<slug>/`** (web-served, IPX-optimizable), **not** beside
  the yml. Data and assets are two trees joined by slug.
- The yml stores a **bare `file:` filename**, joined to `/guides/<slug>/` at render.
- Filename = **`<stop>-<role>.webp`**, identical to the upsert key, so re-`finalize`
  overwrites in place. (`-2` suffix only if a stop ever needs two of one role — none today.)

**Encode ownership — default IPX + bounded-source `sharp` pre-pass**
- **Default IPX provider**, SSR-on `nuxt generate` → zero-server Cloudflare deploy; IPX
  bakes 640/q80 (+retina) variants at build. Shipped bytes match today's; retina is a free
  upgrade. (`none` provider rejected as against the library's grain.)
- `sharp` shrinks to a **bounded-source pre-pass in `finalize`** (~1600px) so IPX has real
  pixels without committing multi-MB originals to git. Different role from the old
  final-byte `toWebp` pass: *tame the source*, not *produce the shipped byte*.

**What `finalize` emits (the only rewrite)**
- Bounded-source `.webp` → `public/guides/<slug>/<stop>-<role>.webp`.
- **Upserts image entries directly into `content/<slug>.yml`**, keyed by `stop`+`role`,
  touching only `images:` arrays (never prose): `file`/`role`/`source`/`artist`/`license`/
  `licenseUrl`/`sourceUrl`. One source of truth per guide; credits **derived** from it (§5).
  Rejected: sidecar `credits.json` / split `.images.yml` (hands the drafting app two files
  to reconcile).

**Attribution (non-negotiable preserved)** — `finalize` captures source/artist/license
from each adapter's `imageInfo` per image, **never guessed**, and writes it into the yml.
`@nuxt/image` carries none of this; it lives in our data layer.

**What survives unchanged** — `sources.json` → `fetch candidates` (sequential
Unsplash→Flickr→Wikimedia fallback, Category-first gotcha, `work/` thumbs + `index.json`) →
`sheet.mjs` → `selections.json`. `selections.json` stays a **separate transient curation
input** (it references ephemeral candidate #s), NOT folded into the durable yml.

**Flagged, not built** — the drafting app later absorbs `fetch candidates` + `sheet` +
`selections.json` behind the same yml write path `finalize` now establishes.

### `@nuxt/image` / IPX config notes (research #4)

- Reference files with **absolute paths**: `<NuxtImg src="/guides/<slug>/<stop>-shot.webp">`.
- **Keep SSR on** for `nuxt generate` — the generator crawls prerendered pages, renders each
  `/_ipx/...` transform once, and writes it to static output. **`ssr: false` breaks this**
  (you'd have to hand-enumerate every transform route). SSR-on `generate` is still a fully
  static, zero-server deploy.
- **Crawl reachability caveat:** confirm every guide page is linked from `/` (or listed in
  `nitro.prerender.routes`) — an uncrawled page never gets its `/_ipx` variants baked.

## 8. Migration & deploy

[Ticket #8](https://github.com/kissmygritts/field-guides-alpha/issues/8) — full mechanics
in the companion doc **[`migration-spec.md`](./migration-spec.md)**. Summary:

- **Hybrid conversion.** Script the mechanical seam (`config.json` → structured yml;
  `manifest.json` → images via the rewritten `finalize`); **hand-port** `content.html`
  prose into thin Markdown (the copy *is* the product; a full HTML→MD parse is net-negative
  for three guides). Drops the SVG `stop-visual` placeholders and the `feed` key; `elev`
  string→number.
- **Worked example: `2026-reno-vegas`** — exercises `alt` promotion (tonopah→Clown Motel,
  rhyolite→Goldwell, ashmeadows→Devils Hole), mixed `wikimedia`+`unsplash` attribution
  enums, `elev` string→number, day-label derivation. (No `feed` — that's exercised by
  whichever guide has it, `2026-395`.)

**Deploy**

| | Old | New |
|---|---|---|
| Build command | `npm run build` (`assemble.mjs`) | `nuxt generate` |
| Output dir (Cloudflare Pages) | `dist` | `.output/public` |
| Image provider | `sharp` → base64 in HTML | `@nuxt/image` IPX, SSR-on `generate` bakes 640/q80 + retina; bounded `sharp` pre-pass in `finalize` |
| Env | none | none (zero-server; `WM_CONTACT` only for local fetch, as today) |

**Build/verify gate — `verify.mjs` retired.** Its core assertion was *zero network
requests* (the offline guarantee); offline is dropped, so it's moot. The new gate:

- `nuxt build` / `vue-tsc` typecheck,
- **Zod parse of every `content/*.yml` at load** (§3/§4) — the schema is the gate,
- broken images surface in `dev` / at `generate` time.

(No headless-Chrome no-overflow/broken-asset harness carries forward. If field regressions
later prove that gap matters, a broken-image smoke check can be reintroduced as its own
task — out of scope here.)

## 9. Sequencing for the implementation session

Keep the current `npm run build` + `dist` **working throughout**; build the Nuxt app
alongside and cut over only at the end.

1. **Scaffold** — the shared Zod schema (§3) + typed composable (§4), the presentational
   component tree (§6.3), and the global tokenized stylesheet ported from `enrich.css` +
   the shared `content.html` CSS.
2. **Rewrite `finalize`** (§7) — emit `public/guides/<slug>/*.webp` + upsert `images:` into
   the yml. Curation front-half untouched.
3. **Migrate `2026-reno-vegas` end-to-end** (the worked example) — run `config → yml`,
   hand-port prose, run `finalize`, render, eyeball against the old
   `dist/2026-reno-vegas.html` for parity. Validates schema + components + pipeline on the
   hardest guide.
4. **Migrate `2026-395` and `2026-vegas-sandiego`** using reno-vegas as reference; split
   the `feed` guide's merged galleries into promoted stops here.
5. **Wire the `/` index** route listing all guides.
6. **Cut over deploy** — Cloudflare Pages build → `nuxt generate`, output →
   `.output/public`. Once all three render at parity, delete `build/assemble.mjs`,
   `build/verify.mjs`, and `build/assets/`.

## 10. Out of scope (this effort)

- Building the drafting/curation app.
- Building the PWA / offline mode.
- **Executing** the migration — the destination is this spec, not a running Nuxt repo.
- **Design-language / CSS-architecture sprint** (Tailwind vs a leaner token-driven CSS
  system, potentially better for LLM ergonomics). Deferred to its own sprint; this
  migration ships a global tokenized stylesheet + scoped-where-needed.

## 11. Fog carried forward (revisit after building)

- **Masthead `meta` route-stats vocabulary** — kept free plain-text for now; standardize
  after several guides give a feel for the common stats.
- Whether the curation step (`sheet` / `selections.json`) gets **absorbed into the drafting
  app** vs. staying a CLI step.
- The **`/` index / guide-listing** page's full shape — routing is settled (§6.1); what it
  *shows* (per-guide card fields, ordering, filters) is unspecified.

---

## Ticket index

| # | Ticket | Section |
|---|---|---|
| [#2](https://github.com/kissmygritts/field-guides-alpha/issues/2) | Data model & schema | §3, §5 |
| [#3](https://github.com/kissmygritts/field-guides-alpha/issues/3) | Nuxt Content vs typed composable | §4 |
| [#4](https://github.com/kissmygritts/field-guides-alpha/issues/4) | `@nuxt/image` + static deploy | §7, §8 |
| [#5](https://github.com/kissmygritts/field-guides-alpha/issues/5) | Divergence audit | §3, §5, §6.4 |
| [#6](https://github.com/kissmygritts/field-guides-alpha/issues/6) | Rendering architecture | §6 |
| [#7](https://github.com/kissmygritts/field-guides-alpha/issues/7) | Image pipeline rewrite | §7 |
| [#8](https://github.com/kissmygritts/field-guides-alpha/issues/8) | Migration + deploy | §8, §9 · [`migration-spec.md`](./migration-spec.md) |
