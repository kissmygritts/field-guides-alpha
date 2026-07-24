import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import { guideSchema } from '~/schema/guide'
import {
  configToGuide,
  elevToFeet,
} from '../build/lib/config-to-yml.mjs'

// Unit tests for the reusable config.json → yml conversion (handoff-spec §8,
// migration-spec §2). The transform is mechanical: it maps the structured keys
// (moon, darkSites, gps, days) and does the two lossy fixups the spec calls out —
// `elev` string→number and `gps.<stop>.alt[]` promoted to sibling `optional`
// stops. Prose (masthead/description/directions/theShot) is hand-ported on top of
// the skeleton, so those fields come out as empty placeholders here.

const config = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../guides/2026-reno-vegas/config.json', import.meta.url),
    ),
    'utf8',
  ),
)

// 2026-395 is the only guide carrying the old merged-gallery `feed` key, so it
// exercises the feed-split branch of the converter.
const config395 = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../guides/2026-395/config.json', import.meta.url)),
    'utf8',
  ),
)

describe('elevToFeet', () => {
  it('parses a "4,255 ft" display string to the number 4255', () => {
    expect(elevToFeet('4,255 ft')).toBe(4255)
  })

  it('parses a sub-1000 elevation with no thousands comma', () => {
    expect(elevToFeet('710 ft')).toBe(710)
  })

  it('is idempotent on a value that is already a number', () => {
    expect(elevToFeet(4255)).toBe(4255)
  })

  it('throws on an unparseable elevation', () => {
    expect(() => elevToFeet('somewhere high')).toThrow()
  })
})

describe('configToGuide — structural mapping', () => {
  const guide = configToGuide(config)

  it('carries moon start/end and drops the now-derived windowLabel', () => {
    expect(guide.moon).toEqual({ start: '2026-09-24', end: '2026-09-28' })
    expect(guide.moon).not.toHaveProperty('windowLabel')
  })

  it('passes darkSites through unchanged', () => {
    expect(guide.darkSites).toBe(config.darkSites)
  })

  it('seeds masthead.title from config.title and startDate from moon.start', () => {
    expect(guide.masthead.title).toBe(config.title)
    expect(guide.masthead.startDate).toBe('2026-09-24')
  })

  it('keeps every config day', () => {
    expect(guide.days).toHaveLength(config.days.length)
  })

  it('maps the first stop with its display name and numeric elevation', () => {
    const s = guide.days[0].stops[0]
    expect(s.id).toBe('fortchurchill')
    expect(s.name).toBe('Fort Churchill')
    expect(s.gps).toEqual({
      lat: 39.2936,
      lng: -119.2889,
      label: 'adobe ruins, off Alt US-95',
      elev: 4255,
    })
  })

  it('converts every stop elevation to a number', () => {
    for (const day of guide.days) {
      for (const stop of day.stops) {
        expect(typeof stop.gps.elev).toBe('number')
      }
    }
  })
})

describe('configToGuide — alt promotion (handoff-spec §3, migration-spec §2)', () => {
  const guide = configToGuide(config)
  const day1 = guide.days[0].stops

  it('promotes gps.<stop>.alt[] to a sibling stop right after its parent', () => {
    const tonopahIdx = day1.findIndex((s) => s.id === 'tonopah')
    const promoted = day1[tonopahIdx + 1]
    expect(promoted.id).toBe('tonopah-alt')
    expect(promoted.name).toBe('Old Cemetery · Clown Motel')
    expect(promoted.optional).toBe(true)
    expect(promoted.gps.lat).toBe(38.0778)
    expect(promoted.gps.elev).toBe(6030)
  })

  it('does not leave an `alt` array on the parent stop', () => {
    const tonopah = day1.find((s) => s.id === 'tonopah')
    expect(tonopah.gps).not.toHaveProperty('alt')
  })

  it('promotes all three alts across the guide (tonopah, rhyolite, ashmeadows)', () => {
    const optionalIds = guide.days
      .flatMap((d) => d.stops)
      .filter((s) => s.optional)
      .map((s) => s.id)
    expect(optionalIds).toEqual([
      'tonopah-alt',
      'rhyolite-alt',
      'ashmeadows-alt',
    ])
  })
})

describe('configToGuide — feed split (handoff-spec §8, ticket #18)', () => {
  const guide = configToGuide(config395)
  const day1 = guide.days[0].stops

  it('splits the fed sub-stop into its own promoted stop keyed by its manifest id', () => {
    // config.feed = { owens: [owens, cerrogordo] }; owens.alt is Cerro Gordo.
    const owensIdx = day1.findIndex((s) => s.id === 'owens')
    const promoted = day1[owensIdx + 1]
    // The promoted stop takes the fed manifest id `cerrogordo`, NOT `owens-alt`,
    // so finalize's stop-keyed image upsert lands on it.
    expect(promoted.id).toBe('cerrogordo')
    expect(promoted.optional).toBe(true)
    // Display name comes from config.disp[cerrogordo]; geo from owens.alt[0].
    expect(promoted.name).toBe('Cerro Gordo')
    expect(promoted.gps.lat).toBe(36.5383)
    expect(promoted.gps.elev).toBe(8200)
  })

  it('leaves no generic owens-alt stop behind (the fed id replaces it)', () => {
    const ids = guide.days.flatMap((d) => d.stops).map((s) => s.id)
    expect(ids).not.toContain('owens-alt')
    expect(ids).toContain('cerrogordo')
  })

  it('does not carry the `feed` key onto the emitted guide', () => {
    expect(guide).not.toHaveProperty('feed')
  })
})

describe('configToGuide — schema compatibility', () => {
  it('the skeleton validates against guideSchema once round-tripped through yaml', () => {
    // Prose placeholders are empty strings (valid mdInline); the skeleton is a
    // complete, parseable guide even before hand-porting.
    const guide = configToGuide(config)
    expect(() => guideSchema.parse(guide)).not.toThrow()
  })

  it('the feed-carrying 2026-395 skeleton also validates', () => {
    expect(() => guideSchema.parse(configToGuide(config395))).not.toThrow()
  })
})
