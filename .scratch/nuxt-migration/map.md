# Nuxt migration — map

Label: wayfinder:map

## Destination

A **spec + decision set** for migrating field-guide to **Nuxt**: one structured
data file per guide (data-driven, thin descriptions) rendered by shared templates,
images via `@nuxt/image` — chosen so a future drafting/curation app and a future
PWA/offline mode are both reachable. The deliverable is a handoff spec; **nothing is
built** in this effort.

## Notes

**Locked during charting (constraints, not tickets):**
- **Nuxt** is the framework (decided — user familiarity + fits the downstream interactive drafting app better than a static-first tool).
- **`@nuxt/image`** for imagery — real files + IPX, not base64.
- **Offline is no longer a hard requirement.** Base64 inlining was a consequence of it; it goes away. Offline returns later as a **PWA**.
- The **drafting/curation app** (surface all candidates → user picks/narrows → generate a non-draft guide) and the **PWA** are **downstream efforts** — they shape the choices here but are not built.
- Content is **data-driven with thin prose**: descriptions are short string fields, not long-form copy. The 236-line CSS block in every `content.html` is design duplicated across guides — it moves to the shared template.

**Plan, don't do.** Every ticket resolves a decision; the output is a spec, not a migrated repo.

**Skills to consult:** `/grilling` + `/domain-modeling` for decision tickets; `/research` for the research tickets; `/prototype` if a rendering shape needs something concrete to react to.

## Decisions so far

<!-- one line per closed ticket -->

- [[research] Nuxt Content — typed collections & data loading](issues/02-research-nuxt-content.md) — **skip Nuxt Content**; read `content/<slug>.yml` directly with a Zod-validated typed composable (same build-time types, lighter, zero-server on Cloudflare). One shared Zod schema is the source of truth for both the renderer and the future drafting app (Content is build-time-only, so the app needs a separate write path regardless).
- [[research] @nuxt/image — pre-fetched, attributed images + static deploy](issues/03-research-nuxt-image.md) — v2/IPX replaces the `sharp` step; keep SSR on for a zero-server `nuxt generate` Cloudflare deploy, or use the `none` provider + existing `sharp` toolchain (safer, keeps the byte budget); attribution stays in our data layer; PWA-offline later via `@vite-pwa/nuxt` + optional base64 variant.
- [[research] Divergence audit of the 3 existing guides](issues/04-research-guide-divergence-audit.md) — the three guides are **already one template**: byte-identical CSS except a per-*element* accent var (fixed 3-color palette), uniform 26-class markup, only `feed` (merged galleries) is a guide-specific config key. Schema should model each **stop once** and derive `order`/`credits`/`disp`/`days.stops` from it.

## Not yet specified

- **Final spec synthesis** — assemble tickets 01/05/06/07 into the handoff spec. Graduates once rendering, image pipeline, and migration land.
- Whether the current curation step (`sheet` / `selections.json`) gets **absorbed into the drafting app** vs. staying a CLI step.
- The **index / guide-listing** page (today `dist/index.html`) in the Nuxt world.

## Out of scope

- Building the drafting/curation app.
- Building the PWA / offline mode.
- **Executing** the migration — the destination is a spec, not a running Nuxt repo.
