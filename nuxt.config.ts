import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import yaml from '@rollup/plugin-yaml'

// Every guide route, derived from content/<slug>.yml. Until the index page (a
// later ticket) links them, dynamic /guides/[slug] routes are unreachable to the
// prerender crawler — so an uncrawled page never gets its /_ipx image variants
// baked (handoff-spec §7 reachability caveat). Listing them in
// nitro.prerender.routes makes `nuxt generate` prerender each guide and bake its
// optimized image transforms to static output.
const guideRoutes = readdirSync(fileURLToPath(new URL('./content', import.meta.url)))
  .filter((f) => /\.ya?ml$/.test(f))
  .map((f) => `/guides/${f.replace(/\.ya?ml$/, '')}`)

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',

  // Prerender each guide so IPX bakes its image variants (§7 reachability).
  // crawlLinks is off until the index page (a later ticket) exists to link the
  // guides — without it the crawler would try `/`, which has no route yet.
  nitro: {
    prerender: { crawlLinks: false, routes: guideRoutes },
  },

  // Nuxt 3-style layout (handoff-spec §2): content/, schema/, composables/,
  // utils/, components/, pages/ all live at the project root, so `~` resolves
  // there for `~/content/*.yml` and `~/schema/guide`.
  srcDir: '.',

  // Nuxt Content is deliberately NOT installed (§4): guides are structured YAML
  // validated by the shared Zod schema, loaded via a typed composable.
  // @nuxt/image renders real image files via the default IPX provider (§7): with
  // SSR left on, `nuxt generate` crawls prerendered pages and bakes each /_ipx
  // transform (640/q80 + retina) to static output. No base64 inlining.
  modules: ['@nuxt/image'],

  // Default IPX provider; per-image transforms are declared on each <NuxtImg>.
  // `ssr` is intentionally NOT set to false — that would break the generate-time
  // crawl that bakes /_ipx variants to static files (§7).
  image: {
    quality: 80,
    format: ['webp'],
  },

  // Global tokenized stylesheet — ports the current guide look (§6.4).
  css: ['~/assets/css/main.css'],

  // @rollup/plugin-yaml lets `content/*.yml` be imported as data at build time.
  vite: {
    plugins: [yaml()],
  },

  typescript: {
    // Fail the build/typecheck on TS errors in app code.
    strict: true,
    // vitest.config.ts and this nuxt.config.ts are node-runtime tooling, not app
    // code — they use Node builtins (node:fs/node:url) that don't belong in the
    // Nuxt (DOM) type context, so keep them out of the app typecheck.
    tsConfig: {
      exclude: ['../vitest.config.ts', '../nuxt.config.ts'],
    },
  },
})
