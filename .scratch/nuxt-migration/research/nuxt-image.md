# `@nuxt/image` for pre-downloaded, attributed external images on a static Cloudflare deploy

**Version investigated:** `@nuxt/image` **v2.0.0** (released 2025-11-05; ships IPX v3, full TypeScript support). Requires Nuxt 3.1+; works on Nuxt 4. Source: [npm](https://www.npmjs.com/package/@nuxt/image), [nuxt/image releases](https://github.com/nuxt/image/releases).

## Verdict

`@nuxt/image` is a good fit for the drop-offline migration. Your existing `sharp` re-encode step is **redundant** with the default IPX provider — IPX *is* sharp, exposed as a build/runtime transform. For a fully-static `nuxt generate` deploy to Cloudflare Pages with **zero server code**, the working path is: **keep SSR enabled (the default), put downloaded files under `public/`, reference them with `<NuxtImg src="/…">`, and let Nuxt's static generation crawl your prerendered pages and bake the optimized `/_ipx/...` variants to disk at build time.** No runtime image server results. Attribution metadata is *not* something `@nuxt/image` carries — that stays in your own data layer (config/manifest/sidecar), exactly as today. A base64/inline path for a future PWA-offline mode is feasible and orthogonal — it does not require re-architecting the image pipeline.

## Findings

### 1. Feeding `@nuxt/image` local files — `public/` vs `assets/`

- Put pre-downloaded files in **`public/`**, not `assets/`. With the default provider, `<NuxtImg>`'s `src` must be an **absolute path** rooting at `public/`:
  ```vue
  <NuxtImg src="/guides/2026-395/stop-03.webp" />
  ```
  maps to `public/guides/2026-395/stop-03.webp`. Source: [usage/nuxt-img](https://image.nuxt.com/usage/nuxt-img) — *"src should be in the form of an absolute path for static images in the `public/` directory."*
- **`assets/` is not the documented path for `@nuxt/image`.** `assets/` is for files consumed by the Vite bundler (hashed, import-based). The IPX provider optimizes files served as static URLs, i.e. from `public/`. Use `public/` and you avoid the bundler-hashing / provider-resolution friction entirely.
- Practical mapping for this repo: the toolchain's downloaded-and-re-encoded outputs become real files under `public/guides/<slug>/…` instead of base64 blobs inlined into one HTML file.

### 2. Does IPX replace the manual `sharp` step? Build vs runtime.

- **IPX is the default provider and it is built on `sharp`** (via unjs/ipx). It performs resize, format conversion (WebP/AVIF), quality, and other modifiers. Source: [providers/ipx](https://image.nuxt.com/providers/ipx).
- So IPX **replaces** your manual `sharp` resize→WebP→q80 pass. You feed it the *original* downloaded file and express intent declaratively:
  ```vue
  <NuxtImg src="/guides/…/stop-03.jpg" width="640" format="webp" quality="80" />
  ```
  Doing your own `sharp` pass *and* IPX is double work and double re-encode. Pick one. (Reason to keep a pre-step anyway: enforcing your ~120 KB budget, or shrinking source files committed to git — see Recommendation.)
- **Build vs runtime:** IPX is fundamentally a **runtime, on-demand** optimizer — it serves `/_ipx/...` transforms per request from a running server. BUT under `nuxt generate` with SSR enabled, those transforms are **materialized at build time** (see #3). So "IPX needs a server" is true in dev/SSR, and *avoidable* in static generation.

### 3. CRITICAL — static `nuxt generate` on Cloudflare Pages, zero server code

The path that yields **no runtime image server**:

- **Keep SSR enabled (default) and run `nuxt generate`.** Per [advanced/static-images](https://image.nuxt.com/advanced/static-images): during static generation, `@nuxt/image` **optimizes and saves images locally at build time** and deploys them alongside the generated pages — pre-processed, not runtime. The generator crawls prerendered pages, discovers each `<NuxtImg>`'s emitted `/_ipx/...` URL, renders it once, and writes the optimized file to the static output. Cloudflare then serves plain static files. No IPX server runs in production.
- **The trap: `ssr: false` breaks this.** The docs are explicit: *"If you disabled server-side rendering (`ssr: false`), Nuxt Image won't be able to optimize your images during the static generation process."* With `ssr:false` you must hand-enumerate every transform route:
  ```ts
  nitro: { prerender: { routes: ['/_ipx/w_640/guides/…/stop-03.jpg', /* every size */ ] } }
  ```
  which is brittle for a many-stop, many-size guide. **Recommendation: leave SSR on**; static generation with SSR-on is still a fully static, zero-server deploy.
- **Cloudflare deploy:** build command `nuxt generate` (or `nuxi build --preset=cloudflare_pages` for wrangler direct upload), output `dist/`. No functions, no env. Source: [nuxt.com/deploy/cloudflare](https://nuxt.com/deploy/cloudflare). This matches the repo's existing "zero server code" Cloudflare Pages posture.
- **Alternative providers if you want to sidestep IPX entirely:**
  - **`none` provider** ([providers/none](https://image.nuxt.com/providers/none)): pass-through, returns the URL unchanged, no transforms. You'd pair it with **pre-optimized files** (your `sharp` toolchain still does the resize/WebP) — you keep `<NuxtImg>`'s lazy-loading/placeholder ergonomics but do the encoding yourself. This is the closest analog to today's pipeline and the most predictable for static hosting.
  - Default IPX + SSR-on generation (above) is the more idiomatic choice and lets you drop `sharp`.

  Both produce a fully static, server-less result. The trade is *who does the encode*: IPX-at-build-time (drop sharp) vs. your toolchain (keep sharp, use `none`).

### 4. Attribution/license metadata — `@nuxt/image` does NOT store it

`@nuxt/image` models only image *rendering* (src, sizes, format, provider). It has no concept of source/artist/license. That metadata must live in **your app's data layer**, same as the current `manifest.json`:

- **Option A (recommended): the guide's structured data file.** Keep credits in `config.json` / a per-guide data module (the repo already records source+artist+license in the manifest). The Nuxt page renders `<NuxtImg :src="img.file" />` and a credits block from the same object. Single source of truth, travels with the guide.
- **Option B: sidecar JSON per image directory** (e.g. `public/guides/<slug>/credits.json`) imported at build/prerender time. Cleaner separation but a second file to keep in sync.
- **Option C:** co-locate as frontmatter/content if guides move to Nuxt Content.

This is an app-architecture decision, not a `@nuxt/image` capability — flagging only. Option A preserves the current "manifest is the attribution record" model with the least churn.

### 5. Feasibility of an optional base64/inline path for a LATER PWA-offline mode

**Feasible and non-disruptive.** Two independent routes, neither requires re-architecting the image pipeline:

- **PWA / service-worker precache (the idiomatic Nuxt path):** with `public/` files, a service worker (e.g. `@vite-pwa/nuxt` / Workbox) precaches the built image files for offline use. Real files + SW cache is the standard offline story and keeps HTML lean — generally preferable to base64 for a PWA.
- **Keep an inline escape hatch:** because attribution + file references live in your own data object (see #4), a build-time helper can still base64-encode selected images into a self-contained HTML variant on demand — the same operation the current toolchain does. `<NuxtImg>` accepts a `data:` URI as `src` with the `none`/default provider, so an inlined variant renders through the same component. So you can ship the normal file-based static site now and add either SW-precache or an inline export later without touching the component layer.

## Recommendation

For the static-Cloudflare, zero-server case:

1. **Downloaded originals → `public/guides/<slug>/…`**; reference via `<NuxtImg src="/guides/<slug>/…">` (absolute paths).
2. **Deploy with `nuxt generate`, SSR left ON.** This bakes IPX transforms to static files at build time — no runtime image server, matches the repo's Cloudflare Pages "no functions" setup.
3. **Choose the encode owner:**
   - *Drop `sharp`, use default IPX:* commit source files, let build-time IPX emit 640px/WebP/q80 variants. Least code, idiomatic.
   - *Keep `sharp` + `none` provider:* your toolchain still enforces the ~120 KB budget and commits small pre-optimized WebPs; `@nuxt/image` just renders them. Most predictable, closest to today, and keeps your byte-budget guardrail. **Given the repo's hard byte-budget culture, this is the safer first move**; migrate to build-time IPX later if the budget control isn't missed.
4. **Attribution stays in your data layer** (`config.json`/manifest, Option A) — `@nuxt/image` won't carry it.
5. **Offline later:** add `@vite-pwa/nuxt` SW precache of `public/` images; retain the optional base64-inline export as a build variant. No pipeline re-architecture needed.

One caveat to verify in a spike: with SSR-on `nuxt generate`, confirm every guide page is actually reachable by the prerender crawler (linked from the index or listed in `nitro.prerender.routes`) — an uncrawled page means its `/_ipx` variants never get baked.

## Sources

- @nuxt/image version — [npm](https://www.npmjs.com/package/@nuxt/image), [nuxt/image releases](https://github.com/nuxt/image/releases)
- Local file refs / `public/` — [image.nuxt.com/usage/nuxt-img](https://image.nuxt.com/usage/nuxt-img)
- IPX provider (sharp-based) — [image.nuxt.com/providers/ipx](https://image.nuxt.com/providers/ipx)
- Static generation / build-time optimization / `ssr:false` prerender routes — [image.nuxt.com/advanced/static-images](https://image.nuxt.com/advanced/static-images)
- `none` provider — [image.nuxt.com/providers/none](https://image.nuxt.com/providers/none)
- Cloudflare Pages static deploy — [nuxt.com/deploy/cloudflare](https://nuxt.com/deploy/cloudflare)
