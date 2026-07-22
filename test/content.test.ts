import { describe, expect, it } from 'vitest'
import { useGuide } from '~/composables/useGuide'
import { useGuides } from '~/composables/useGuides'

// Integration: the committed content/*.yml are loaded through @rollup/plugin-yaml
// + import.meta.glob and Zod-validated — the exact path the Nuxt build uses.

describe('content loading (real yml via the composables)', () => {
  it('loads and validates the committed sample guide', () => {
    const guides = useGuides()
    expect(guides.length).toBeGreaterThanOrEqual(1)
    const slugs = guides.map((g) => g.slug)
    expect(slugs).toContain('sample')
  })

  it('useGuide(slug) returns the typed, validated guide', () => {
    const g = useGuide('sample')
    expect(g).toBeDefined()
    expect(g!.slug).toBe('sample')
    expect(g!.masthead.startDate).toBeInstanceOf(Date)
    const day0 = g!.days[0]!
    expect(day0.stops[0]!.gps.elev).toBe(6120)
    expect(day0.stops[1]!.optional).toBe(true)
  })

  it('useGuide returns undefined for an unknown slug', () => {
    expect(useGuide('does-not-exist')).toBeUndefined()
  })
})
