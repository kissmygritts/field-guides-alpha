# Image pipeline & enrich-toolchain rewrite

Type: grilling
Status: open
Blocked by: 01, 03

## Question

What is the new image pipeline end-to-end, and how does the enrich toolchain
(`fetch` / `sheet` / `finalize` / `manifest.json`) change to feed it?

Base64 is gone (ticket 03: `@nuxt/image`). Decide:
- Where image files live in the repo and how they're named/organized per guide.
- What `finalize` now **emits** instead of a base64 `manifest.json` — image files on disk + an attribution metadata record (per ticket 01's schema).
- Whether `sharp` re-encode stays in the toolchain or is handed to IPX (ticket 03 findings).
- How **attribution** (source/artist/license) flows from each API through to rendered credits without guessing (still a non-negotiable).
- What survives of `fetch`/`sheet`/`selections.json` — and note (do not build) how the future drafting app might absorb the curation step (see map Fog).

Depends on the data-model schema (01) for the metadata shape and the image research (03) for the mechanics.
