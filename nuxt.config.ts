import yaml from '@rollup/plugin-yaml'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',

  // Nuxt 3-style layout (handoff-spec §2): content/, schema/, composables/,
  // utils/, components/, pages/ all live at the project root, so `~` resolves
  // there for `~/content/*.yml` and `~/schema/guide`.
  srcDir: '.',

  // Nuxt Content is deliberately NOT installed (§4): guides are structured YAML
  // validated by the shared Zod schema, loaded via a typed composable.
  modules: [],

  // @rollup/plugin-yaml lets `content/*.yml` be imported as data at build time.
  vite: {
    plugins: [yaml()],
  },

  typescript: {
    // Fail the build/typecheck on TS errors in app code.
    strict: true,
    // vitest.config.ts is node-runtime tooling, not app code — it belongs to
    // Vitest's own type context, so keep it out of the Nuxt (DOM) typecheck.
    tsConfig: {
      exclude: ['../vitest.config.ts'],
    },
  },
})
