import { fileURLToPath } from 'node:url'
import yaml from '@rollup/plugin-yaml'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '')

export default defineConfig({
  // Same YAML loader the Nuxt build uses, so tests exercise the real import path.
  plugins: [yaml()],
  resolve: {
    alias: [{ find: /^~\//, replacement: `${root}/` }],
  },
  test: {
    environment: 'node',
    // .ts covers the app/data layer; .mjs covers the plain-JS build/ toolchain
    // (finalize's yml + image helpers) with the same alias + yaml plugin.
    include: ['test/**/*.test.ts', 'test/**/*.test.mjs'],
  },
})
