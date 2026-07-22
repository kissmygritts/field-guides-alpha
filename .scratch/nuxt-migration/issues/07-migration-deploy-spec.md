# Migration + deploy spec for the existing guides

Type: task
Status: open
Blocked by: 01, 05, 06

## Question

How do the three existing guides convert to the new data model, and how does the
build/deploy change — specified as a handoff, not executed.

Decide:
- The **conversion mapping**: content.html + config.json + manifest.json → the new per-guide data file + image files. Is it a one-time scripted transform, or hand-authored? What's lost/gained.
- A **worked example**: fully map one guide (e.g. `2026-reno-vegas`) to the new shape as the reference the implementation session follows.
- **Deploy**: Cloudflare Pages build command shifts from `npm run build` to `nuxt generate`; output dir; what happens to `verify.mjs` (the offline network-request check) now that offline is dropped — retire it, or repurpose as a broken-link/asset check.
- **Sequencing** for the implementation session: what lands first, how to keep the three guides renderable throughout.

This ticket produces the migration section of the final spec. Once it, 05, and 06
resolve, the **spec synthesis** graduates from Fog.
