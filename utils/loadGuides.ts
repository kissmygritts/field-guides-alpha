import { guideSchema, type Guide } from '~/schema/guide'

// Pure, framework-free loader helpers (handoff-spec §4). The composables wire
// these to `import.meta.glob('~/content/*.yml')`; keeping the logic here makes
// the build-time gate unit-testable without a Nuxt runtime.

export interface LoadedGuide extends Guide {
  /** Filename stem of the source `content/<slug>.yml`, used verbatim as the URL slug. */
  slug: string
}

/** Derive the slug from a `content/<slug>.yml` module path — the filename stem, verbatim. */
export function slugFromPath(path: string): string {
  const stem = path.split('/').pop()
  if (!stem) throw new Error(`cannot derive slug from path: ${path}`)
  return stem.replace(/\.ya?ml$/, '')
}

/**
 * Validate a map of `{ path: rawYaml }` modules into typed guides.
 * Each value is Zod-parsed against {@link guideSchema}; a malformed guide throws
 * a `ZodError`, which fails the build (spec §4/§8 — "the schema is the gate").
 * Results are sorted by slug for stable ordering.
 */
export function loadGuides(modules: Record<string, unknown>): LoadedGuide[] {
  return Object.entries(modules)
    .map(([path, raw]) => ({
      slug: slugFromPath(path),
      ...guideSchema.parse(raw),
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug))
}

/** Find one loaded guide by slug. */
export function findGuide(
  guides: LoadedGuide[],
  slug: string,
): LoadedGuide | undefined {
  return guides.find((g) => g.slug === slug)
}
