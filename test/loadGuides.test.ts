import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { findGuide, loadGuides, slugFromPath } from '~/utils/loadGuides'
import { validGuideInput } from './factories'

describe('slugFromPath', () => {
  it('derives the filename stem verbatim (no date-prefix stripping)', () => {
    expect(slugFromPath('~/content/2026-reno-vegas.yml')).toBe('2026-reno-vegas')
    expect(slugFromPath('../content/sample.yml')).toBe('sample')
    expect(slugFromPath('/abs/content/great-basin.yaml')).toBe('great-basin')
  })
})

describe('loadGuides', () => {
  it('validates each module and attaches the slug from its path', () => {
    const guides = loadGuides({
      '../content/b-guide.yml': validGuideInput(),
      '../content/a-guide.yml': validGuideInput(),
    })
    expect(guides.map((g) => g.slug)).toEqual(['a-guide', 'b-guide']) // sorted by slug
    expect(guides[0]!.masthead.startDate).toBeInstanceOf(Date)
  })

  it('THROWS a ZodError on a malformed guide — this is the build gate (spec §4/§8)', () => {
    const malformed = validGuideInput() as { days: { stops: { gps: { elev: unknown } }[] }[] }
    malformed.days[0]!.stops[0]!.gps.elev = '6,120 ft' // string instead of numeric feet
    expect(() => loadGuides({ '../content/broken.yml': malformed })).toThrow(z.ZodError)
  })

  it('rejects block-level Markdown smuggled into a thin-prose field', () => {
    const smuggled = validGuideInput() as { masthead: { dek: string } }
    smuggled.masthead.dek = '## Long-form heading\n\nlots of copy'
    expect(() => loadGuides({ '../content/prose.yml': smuggled })).toThrow(z.ZodError)
  })
})

describe('findGuide', () => {
  it('finds by slug and returns undefined when absent', () => {
    const guides = loadGuides({ '../content/only.yml': validGuideInput() })
    expect(findGuide(guides, 'only')?.slug).toBe('only')
    expect(findGuide(guides, 'missing')).toBeUndefined()
  })
})
