# [research] Divergence audit of the 3 existing guides

Type: research
Status: resolved
Blocked by: —

## Question

How uniform are the three existing guides, really — is the CSS/structure shareable
as one template, or are there per-guide variations that a single template must
parameterize?

A local codebase audit (no external docs). De-risks tickets 01 and 05 by grounding
them in what actually varies vs. what's boilerplate.

Compare across `guides/2026-395`, `guides/2026-reno-vegas`, `guides/2026-vegas-sandiego`
(`content.html` + `config.json` + `manifest.json`):
- Is the `<style>` block **byte-identical** across guides, or does it diverge (e.g. day-accent colors, per-guide theming)? Diff it.
- What structural elements are **universal** vs. **guide-specific** (masthead, day headers, stop cards, briefs, jump nav, moon panel, credits)?
- Enumerate every distinct **field** used across the three `config.json` files (incl. optional ones like `feed`, `alt`, `darkSites`) — the raw material for the ticket-01 schema.
- Any one-off HTML in a `content.html` that won't fit a uniform data→template mapping.

Findings → `.scratch/nuxt-migration/research/guide-divergence.md`, linked back here.

## Answer

Findings: [research/guide-divergence.md](../research/guide-divergence.md)

- **The three guides are effectively one template already.** `<style>` blocks are byte-identical except the `--dayN` accent vars — a 2-3 rotation of a fixed 3-color palette (orange/blue/sage). Accent is selected **inline per element** (`style="--accent: var(--dayN)"`), so it's per-element *data*, not per-guide CSS.
- **Structure is uniform:** 26-class vocabulary, same repeating markup (mast, day headers, stop cards, day-briefs, camp interstitials, 6-item field-notes grid, colophon) in all three. `theshot` and the `opt` badge are the only optional-per-stop pieces.
- **config divergence:** the *only* genuinely guide-specific key is **`feed`** (2026-395 only, merged galleries e.g. owens+cerrogordo). All else (`order`, `roles`, `disp`, `gps`+`alt`, `days`, `moon`, `darkSites`, `credits`) is universal.
- **Schema guidance:** model each **stop once**; derive the redundant `order` / `credits` / `disp` / `days.stops` orderings from it. Per-stop SVG placeholder art is discarded by `assemble.mjs` — ignore it.
