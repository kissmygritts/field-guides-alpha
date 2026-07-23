import { describe, expect, it } from 'vitest'
import { guideListing } from '~/utils/guideListing'
import { loadGuides, type LoadedGuide } from '~/utils/loadGuides'
import { validGuideInput } from './factories'

// Pure listing helper that drives pages/index.vue (handoff-spec §6.1). The `/`
// route must link every guide to its canonical /guides/<slug> path so the
// `nuxt generate` crawler reaches — and bakes the /_ipx variants of — each
// guide page (§7 crawl-reachability caveat).

function guides(...slugs: string[]): LoadedGuide[] {
  return loadGuides(
    Object.fromEntries(slugs.map((s) => [`../content/${s}.yml`, validGuideInput()])),
  )
}

describe('guideListing', () => {
  it('produces one entry per guide — every guide is listed', () => {
    const items = guideListing(guides('reno-vegas', 'great-basin', 'sample'))
    expect(items).toHaveLength(3)
    expect(items.map((i) => i.slug).sort()).toEqual([
      'great-basin',
      'reno-vegas',
      'sample',
    ])
  })

  it('links each guide to its /guides/<slug> route (crawl reachability)', () => {
    const items = guideListing(guides('2026-reno-vegas'))
    expect(items[0]!.href).toBe('/guides/2026-reno-vegas')
  })

  it('preserves the incoming guide order (loadGuides already sorts by slug)', () => {
    const items = guideListing(guides('b-guide', 'a-guide'))
    expect(items.map((i) => i.slug)).toEqual(['a-guide', 'b-guide'])
    expect(items.map((i) => i.href)).toEqual([
      '/guides/a-guide',
      '/guides/b-guide',
    ])
  })

  it('carries the masthead fields the listing renders', () => {
    const [item] = guideListing(guides('sample'))
    expect(item!.title).toBe('A *scaffold* loop')
    expect(item!.eyebrow).toBe('Sample route')
    expect(item!.dek).toBe('Validates the **data layer**.')
    expect(item!.meta).toEqual(['2 days', '4 stops'])
  })

  it('returns an empty list for no guides', () => {
    expect(guideListing([])).toEqual([])
  })
})
