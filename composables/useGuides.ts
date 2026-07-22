import { loadGuides, type LoadedGuide } from '~/utils/loadGuides'

// Load every content/<slug>.yml at build via Vite's import.meta.glob (eager),
// then Zod-validate through loadGuides (handoff-spec §4). A malformed YAML file
// throws a ZodError here — failing the build, which is the intended gate (§8).
// No @nuxt/content, no runtime DB: types are inferred from the shared schema.
// Relative glob (../content) resolves identically under Nuxt's Vite build and
// under Vitest without depending on alias resolution inside glob patterns.
const modules = import.meta.glob('../content/*.yml', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>

const guides = loadGuides(modules)

/** All guides, Zod-validated at build, sorted by slug (for the index page). */
export const useGuides = (): LoadedGuide[] => guides
