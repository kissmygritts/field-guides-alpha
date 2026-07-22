# Data model & schema for a guide

Type: grilling
Status: open
Blocked by: —

## Question

What is the canonical structured-data shape for one guide, and in what format?

The spine of the whole migration. Today a guide is `content.html` (prose + SVG
placeholders + 236 lines of CSS) + `config.json` (order, disp, roles, gps, days,
moon, credits, feed) + `manifest.json` (base64 images + attribution). This ticket
collapses that into **one data-driven file per guide** whose fields drive rendering.

Decide:
- **Format** — YAML vs JSON vs a Nuxt Content collection entry (`.yml`/`.json`/`.md` with frontmatter). Weigh authoring/diff ergonomics against how the future drafting app reads/writes it.
- **Shape** — how to model: masthead (title/dek/meta chips), day groups (label, route, summary, itinerary chips, fuel/signal/water/heat/drive briefs), stops (teaser, number, optional flag, timing, name, location note, description, Light/Glass/Access/Stay/Note key-values, "the shot"), gps + elevation (+ `alt` sub-points), moon window, credits, and the per-stop image list w/ attribution metadata.
- **Schema/validation** — typed schema (e.g. Zod via Nuxt Content) so both the renderer and the future drafting app share one contract.
- **Thin-prose boundary** — confirm every description fits as a short string field; flag anything that doesn't.

Informed by ticket 02 (Nuxt Content capabilities) and ticket 04 (how uniform the 3 guides really are).
