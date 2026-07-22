# Rendering architecture & component breakdown

Type: grilling
Status: open
Blocked by: 01, 04

## Question

How does the guide data file become pages — routing, templates, and the component
breakdown?

Decide:
- **Routing** — one dynamic route per guide (`/guides/[slug]`) + an index/listing page; how slugs map to data files.
- **Component breakdown** — decompose today's monolithic HTML into Vue components: masthead, day header, stop card (w/ gallery + Light/Glass/Access fields + "the shot"), briefs row, jump nav, moon panel, credits, lightbox. Which are dumb/presentational vs. data-bound.
- **Styling** — where the extracted CSS lives (global stylesheet, scoped components, or a design-token layer); how day-accent colors parameterize (see ticket 04 findings).
- **Moon panel** — `build/lib/moon.mjs` computes phases today; does that logic move to a build-time util, a server route, or a composable.
- **Lightbox** — replace the injected `lightbox.html`/`lightbox.js` with a Vue component/library or port as-is.

A `/prototype` of one stop card may be worth it if the shape is contested.
