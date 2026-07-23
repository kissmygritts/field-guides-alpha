import { describe, expect, it } from 'vitest'
import { useGuide } from '~/composables/useGuide'
import { deriveGuideView } from '~/utils/derive'

// Worked-example integration proof (handoff-spec §8/§9 step 3, ticket #17): the
// migrated 2026-reno-vegas guide loads through the real composable + Zod schema
// and derives cleanly through the exact view model the guide page binds. This is
// the full-stack check on the hardest guide — schema + derivations + image joins.

const guide = useGuide('2026-reno-vegas')

describe('2026-reno-vegas — migrated guide loads and validates', () => {
  it('is present and Zod-validated via the composable', () => {
    expect(guide).toBeDefined()
    expect(guide!.slug).toBe('2026-reno-vegas')
  })

  it('spans two days with the promoted alt stops as optional siblings', () => {
    expect(guide!.days).toHaveLength(2)
    expect(guide!.days[0]!.stops.map((s) => s.id)).toEqual([
      'fortchurchill',
      'walker',
      'hawthorne',
      'tonopah',
      'tonopah-alt',
    ])
    expect(guide!.days[1]!.stops.map((s) => s.id)).toEqual([
      'goldfield',
      'carforest',
      'rhyolite',
      'rhyolite-alt',
      'zabriskie',
      'ashmeadows',
      'ashmeadows-alt',
    ])
    // The three promoted alts are all flagged optional.
    for (const id of ['tonopah-alt', 'rhyolite-alt', 'ashmeadows-alt']) {
      const stop = guide!.days.flatMap((d) => d.stops).find((s) => s.id === id)!
      expect(stop.optional).toBe(true)
    }
  })

  it('has numeric elevations everywhere (elev string→number)', () => {
    for (const stop of guide!.days.flatMap((d) => d.stops)) {
      expect(typeof stop.gps.elev).toBe('number')
    }
    const fc = guide!.days[0]!.stops[0]!
    expect(fc.gps.elev).toBe(4255)
    const zab = guide!.days[1]!.stops.find((s) => s.id === 'zabriskie')!
    expect(zab.gps.elev).toBe(710)
  })
})

describe('2026-reno-vegas — derives through the render pipeline', () => {
  const view = deriveGuideView(guide!, '2026-reno-vegas')

  it('derives Saturday/Sunday day labels from the start date', () => {
    expect(view.days[0]!.label).toBe('Day 1 · Sat')
    expect(view.days[1]!.label).toBe('Day 2 · Sun')
  })

  it('joins gallery images to their /guides/<slug>/ paths and role labels', () => {
    const fc = view.days[0]!.stops[0]!
    expect(fc.images.map((i) => i.src)).toContain(
      '/guides/2026-reno-vegas/fortchurchill-shot.webp',
    )
    expect(fc.images.find((i) => i.role === 'wide')!.roleLabel).toBe('the place')
  })

  it('leaves the promoted alt stops image-free (imagery stays in the base gallery)', () => {
    const alt = view.days[0]!.stops.find((s) => s.anchor === 's-tonopah-alt')!
    expect(alt.images).toHaveLength(0)
  })

  it('builds a credit row per image with an attribution link', () => {
    const totalImages = guide!.days
      .flatMap((d) => d.stops)
      .reduce((n, s) => n + s.images.length, 0)
    expect(view.credits).toHaveLength(totalImages)
    expect(view.credits.every((c) => /^https?:\/\//.test(c.sourceUrl))).toBe(true)
    // Mixed wikimedia + unsplash attribution is exercised by this guide.
    const sources = new Set(view.credits.map((c) => c.source))
    expect(sources).toContain('wikimedia')
    expect(sources).toContain('unsplash')
  })

  it('derives the moon window + full-moon phase for the trip dates', () => {
    expect(view.moon.windowLabel).toBe('late September')
    expect(view.moon.phaseLabel).toBe('Full moon')
    expect(view.moon.darkSites).toBe('Tonopah, Goldfield, the Rhyolite flats')
  })
})
