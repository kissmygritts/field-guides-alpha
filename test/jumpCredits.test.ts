import { describe, expect, it } from 'vitest'
import { guideSchema } from '~/schema/guide'
import { deriveCredits, deriveGuideView, deriveJumpNav, stopAnchor } from '~/utils/derive'
import { validGuideInput } from './factories'

// Structural-parity derivations (handoff-spec §5, §6.3): the jump-nav anchor index,
// the credits union (one row per image), and the stop anchor — all derived from the
// authored schema, never carried in the yml.

// A two-day input where the second day adds a stop with two images so the credits
// union and the per-day jump rows are exercised across days.
function twoDayGuide() {
  const input = validGuideInput()
  ;(input as { days: unknown[] }).days.push({
    theme: 'Day two',
    stops: [
      {
        id: 'lake',
        name: 'Dry Lake',
        optional: true,
        description: 'Cracked *playa*.',
        gps: { lat: 39, lng: -114, label: 'Dry Lake', elev: 5210 },
        images: [
          {
            file: 'lake-shot.webp',
            role: 'shot',
            source: 'unsplash',
            artist: 'B. Shooter',
            license: 'Unsplash License',
            sourceUrl: 'https://unsplash.com/photos/abc',
          },
          {
            file: 'lake-mood.webp',
            role: 'mood',
            source: 'flickr',
            artist: 'C. Snapper',
            license: 'CC BY 2.0',
            sourceUrl: 'https://flickr.com/photos/xyz',
          },
        ],
      },
    ],
  })
  return guideSchema.parse(input)
}

describe('stopAnchor', () => {
  it('derives a stable "s-<id>" anchor from the stop id', () => {
    expect(stopAnchor('trailhead')).toBe('s-trailhead')
    expect(stopAnchor('devils-hole')).toBe('s-devils-hole')
  })
})

describe('deriveJumpNav', () => {
  it('groups stops under their day label with num, name, and matching anchor', () => {
    const nav = deriveJumpNav(twoDayGuide())
    expect(nav.map((d) => d.label)).toEqual(['Day 1 · Thu', 'Day 2 · Fri'])

    expect(nav[0]!.stops).toEqual([
      { num: '1.1', name: 'North Trailhead', anchor: 's-trailhead' },
    ])
    expect(nav[1]!.stops).toEqual([
      { num: '2.1', name: 'Dry Lake', anchor: 's-lake' },
    ])
  })

  it('anchors match what stopAnchor produces (jump links resolve to stops)', () => {
    const nav = deriveJumpNav(twoDayGuide())
    expect(nav[1]!.stops[0]!.anchor).toBe(stopAnchor('lake'))
  })
})

describe('deriveCredits', () => {
  it('emits one row per image across every stop, in document order', () => {
    const credits = deriveCredits(twoDayGuide())
    // Day 1 trailhead has 1 image; day 2 lake has 2 → 3 rows total.
    expect(credits).toHaveLength(3)
    expect(credits.map((c) => c.artist)).toEqual([
      'A. Photographer',
      'B. Shooter',
      'C. Snapper',
    ])
  })

  it('carries name (stop), artist, source, license, and the sourceUrl link — all derived', () => {
    const credits = deriveCredits(twoDayGuide())
    expect(credits[0]).toEqual({
      name: 'North Trailhead',
      artist: 'A. Photographer',
      source: 'wikimedia',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sample.jpg',
    })
    expect(credits[1]!.name).toBe('Dry Lake')
    expect(credits[1]!.source).toBe('unsplash')
    expect(credits[2]!.sourceUrl).toBe('https://flickr.com/photos/xyz')
  })

  it('is empty when no stop has images', () => {
    const input = validGuideInput()
    // Strip the only image from the single factory stop.
    ;(input as { days: { stops: { images: unknown[] }[] }[] }).days[0]!.stops[0]!.images = []
    expect(deriveCredits(guideSchema.parse(input))).toEqual([])
  })
})

describe('deriveGuideView — structural parity', () => {
  it('exposes the derived jump-nav index on the view', () => {
    const v = deriveGuideView(twoDayGuide(), 'sample')
    expect(v.jumpNav.map((d) => d.label)).toEqual(['Day 1 · Thu', 'Day 2 · Fri'])
    expect(v.jumpNav[0]!.stops[0]!.anchor).toBe('s-trailhead')
  })

  it('exposes the derived credits union on the view', () => {
    const v = deriveGuideView(twoDayGuide(), 'sample')
    expect(v.credits).toHaveLength(3)
    expect(v.credits[0]!.name).toBe('North Trailhead')
  })

  it('gives each stop the same anchor its jump link targets', () => {
    const v = deriveGuideView(twoDayGuide(), 'sample')
    expect(v.days[1]!.stops[0]!.anchor).toBe('s-lake')
    expect(v.days[1]!.stops[0]!.anchor).toBe(v.jumpNav[1]!.stops[0]!.anchor)
  })
})
