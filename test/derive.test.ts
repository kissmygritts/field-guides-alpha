import { describe, expect, it } from 'vitest'
import { guideSchema } from '~/schema/guide'
import { dayLabel, deriveGuideView, stopNumber } from '~/utils/derive'
import { validGuideInput } from './factories'

describe('dayLabel', () => {
  it('derives "Day N · Weekday" from startDate + day index', () => {
    const start = new Date('2026-09-17') // a Thursday (UTC)
    expect(dayLabel(start, 0)).toBe('Day 1 · Thu')
    expect(dayLabel(start, 1)).toBe('Day 2 · Fri')
    expect(dayLabel(start, 6)).toBe('Day 7 · Wed')
  })
})

describe('stopNumber', () => {
  it('derives "<dayN>.<stopN>" (1-based)', () => {
    expect(stopNumber(0, 0)).toBe('1.1')
    expect(stopNumber(0, 1)).toBe('1.2')
    expect(stopNumber(2, 3)).toBe('3.4')
  })
})

describe('deriveGuideView', () => {
  function view() {
    const input = validGuideInput()
    // Two days so day-label + stop-number derivation is exercised across days.
    ;(input as { days: unknown[] }).days.push({
      theme: 'Day two',
      stops: [
        {
          id: 'lake',
          name: 'Dry Lake',
          description: 'Cracked *playa*.',
          gps: { lat: 39, lng: -114, label: 'Dry Lake', elev: 5210 },
        },
      ],
    })
    return deriveGuideView(guideSchema.parse(input), 'sample')
  }

  it('passes masthead text through unchanged (raw thin-prose, rendered downstream)', () => {
    const v = view()
    expect(v.masthead.eyebrow).toBe('Sample route')
    expect(v.masthead.title).toBe('A *scaffold* loop')
    expect(v.masthead.meta).toEqual(['2 days', '4 stops'])
  })

  it('derives Day N · Weekday per day, never authored', () => {
    const v = view()
    expect(v.days.map((d) => d.label)).toEqual(['Day 1 · Thu', 'Day 2 · Fri'])
  })

  it('derives dotted stop numbers per day, never authored', () => {
    const v = view()
    expect(v.days[0]!.stops[0]!.num).toBe('1.1')
    expect(v.days[1]!.stops[0]!.num).toBe('2.1')
  })

  it('assigns each day an accent index for the accent-color cascade', () => {
    const v = view()
    expect(v.days.map((d) => d.accentIndex)).toEqual([0, 1])
  })

  it('normalizes optional to a boolean and carries stop fields through', () => {
    const v = view()
    const stop = v.days[0]!.stops[0]!
    expect(stop.optional).toBe(false)
    expect(stop.name).toBe('North Trailhead')
    expect(stop.gps.elev).toBe(6120)
    expect(stop.directions[0]!.label).toBe('Light')
  })

  it('carries day brief through for FieldList rendering', () => {
    const v = view()
    const brief = v.days[0]!.brief
    expect(brief.map((b) => b.label)).toEqual(['Fuel', 'Signal'])
    expect(brief[1]!.warn).toBe(true)
    expect(brief[0]!.icon).toBe('⛽')
  })

  it('derives each stop image into a gallery view (absolute src + role label)', () => {
    const v = view()
    const img = v.days[0]!.stops[0]!.images[0]!
    // Absolute-path src joined from the slug + bare filename (§7).
    expect(img.src).toBe('/guides/sample/trailhead-wide.webp')
    // Role label is the rendering constant, not authored data (§5).
    expect(img.roleLabel).toBe('the place')
    expect(img.role).toBe('wide')
    // Attribution carried through for per-image credits.
    expect(img.artist).toBe('A. Photographer')
    expect(img.source).toBe('wikimedia')
    expect(img.license).toBe('CC BY-SA 4.0')
    expect(img.sourceUrl).toBe(
      'https://commons.wikimedia.org/wiki/File:Sample.jpg',
    )
  })

  it('gives a stop with no images an empty gallery', () => {
    const v = view()
    // The second day's single stop (factory push) has no images.
    expect(v.days[1]!.stops[0]!.images).toEqual([])
  })

  it('derives the moon window + phase from the trip dates, never authored', () => {
    const v = view()
    // Factory window is 2026-09-17..2026-09-18 (both mid-month).
    expect(v.moon.windowLabel).toBe('mid September')
    expect(v.moon.phaseLabel).toBeTypeOf('string')
    expect(v.moon.phaseLabel.length).toBeGreaterThan(0)
  })

  it('passes moon dates + dark-sites note straight through to the panel props', () => {
    const v = view()
    expect(v.moon.start).toEqual(new Date('2026-09-17'))
    expect(v.moon.end).toEqual(new Date('2026-09-18'))
    expect(v.moon.darkSites).toBe('Great Basin skies.')
  })
})
