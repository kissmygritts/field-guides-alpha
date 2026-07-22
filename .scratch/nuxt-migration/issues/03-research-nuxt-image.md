# [research] @nuxt/image — pre-fetched, attributed images + static deploy

Type: research
Status: resolved
Blocked by: —

## Question

How does `@nuxt/image` handle pre-downloaded external images with license metadata,
and what does that imply for the enrich toolchain and a Cloudflare static deploy?

Surface the facts that ticket 06 (image pipeline) waits on:
- Feeding `@nuxt/image` **local files that originated from external sources** (Unsplash/Flickr/Wikimedia) — the toolchain already downloads + re-encodes via `sharp`; where should those files live (`public/`? `assets/`?) and does IPX replace the `sharp` resize/WebP step or sit alongside it.
- **Static / `nuxt generate` on Cloudflare Pages**: which IPX provider works with zero server code (build-time image generation vs. a runtime image endpoint) — critical, deploy is static-hostable.
- Carrying **attribution metadata** (source, artist, license) alongside each image so credits render — @nuxt/image won't hold this, so where does it live (the guide data file? a sidecar?).
- Whether keeping a **base64/inline option** is feasible for the later PWA-offline goal without re-architecting.

Findings → `.scratch/nuxt-migration/research/nuxt-image.md`, linked back here.

## Answer

Findings: [research/nuxt-image.md](../research/nuxt-image.md)

- **`@nuxt/image` v2** (ships IPX v3). Pre-downloaded files go in **`public/`**, referenced with absolute paths: `<NuxtImg src="/guides/…/stop.webp">`.
- **IPX == sharp**, so it *replaces* the manual resize/WebP step. Default IPX is a runtime `/_ipx/...` server, BUT under `nuxt generate` with **SSR left ON**, transforms bake to static files at build time → **zero-server Cloudflare deploy**. Trap: `ssr:false` disables build-time optimization.
- **Recommended safer first move:** `none` provider + keep the existing `sharp` toolchain — closest to today and preserves the ~120 KB per-image byte-budget guardrail. (Feeds ticket 06.)
- **Attribution:** `@nuxt/image` stores none — source/artist/license stays in our own data layer (feeds ticket 01 schema).
- **Offline-later (PWA):** feasible without re-architecting — `@vite-pwa/nuxt` precache of `public/`, and `<NuxtImg>` accepts `data:` URIs so a base64 build variant can return.
