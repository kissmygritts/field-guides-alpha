import type { LoadedGuide } from '~/utils/loadGuides'

// Pure helper backing the `/` index route (handoff-spec §6.1). Kept framework-
// free so the listing logic — one link per guide to its canonical
// `/guides/<slug>` path — is unit-testable without a Nuxt/DOM runtime, and so
// the page component stays a thin template.

/** One row in the guide listing rendered by `pages/index.vue`. */
export interface GuideListItem {
  /** Content filename stem — verbatim URL slug. */
  slug: string
  /** Canonical route the listing links to; the `nuxt generate` crawler follows
   * this to reach and bake each guide page's `/_ipx` variants (§7). */
  href: string
  /** Masthead fields the card renders (thin inline Markdown, rendered as text). */
  title: string
  eyebrow: string
  dek: string
  meta: string[]
}

/** The route every guide is linked to. Single source of the `/guides/` prefix
 * (§6.1) so index links and the guide route can never drift. */
export function guideHref(slug: string): string {
  return `/guides/${slug}`
}

/**
 * Map loaded guides to listing rows — one per guide, each linking to
 * {@link guideHref}. Order is preserved (guides arrive slug-sorted from
 * `loadGuides`). This is what guarantees every guide page is reachable from `/`.
 */
export function guideListing(guides: LoadedGuide[]): GuideListItem[] {
  return guides.map((g) => ({
    slug: g.slug,
    href: guideHref(g.slug),
    title: g.masthead.title,
    eyebrow: g.masthead.eyebrow,
    dek: g.masthead.dek,
    meta: g.masthead.meta,
  }))
}
