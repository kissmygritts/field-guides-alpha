import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  fieldItem,
  guideSchema,
  image,
  mdInline,
  stop,
} from '~/schema/guide'
import { validGuideInput } from './factories'

describe('guideSchema', () => {
  it('parses a well-formed guide and infers types', () => {
    const g = guideSchema.parse(validGuideInput())
    // masthead + moon dates are coerced to Date
    expect(g.masthead.startDate).toBeInstanceOf(Date)
    expect(g.moon.start).toBeInstanceOf(Date)
    expect(g.days).toHaveLength(1)
    const stop0 = g.days[0]!.stops[0]!
    expect(stop0.id).toBe('trailhead')
    // numeric elevation, not a display string
    expect(stop0.gps.elev).toBe(6120)
    expect(typeof stop0.gps.elev).toBe('number')
  })

  it('requires at least one day and one stop per day', () => {
    const noDays = validGuideInput()
    ;(noDays as { days: unknown[] }).days = []
    expect(() => guideSchema.parse(noDays)).toThrow(z.ZodError)

    const emptyDay = validGuideInput()
    const days = (emptyDay as { days: { stops: unknown[] }[] }).days
    days[0]!.stops = []
    expect(() => guideSchema.parse(emptyDay)).toThrow(z.ZodError)
  })

  it('applies array defaults when optional lists are omitted', () => {
    const input = validGuideInput() as {
      days: { legs?: unknown; brief?: unknown; stops: { directions?: unknown; images?: unknown }[] }[]
      fieldNotes?: unknown
    }
    const inputDay0 = input.days[0]!
    const inputStop0 = inputDay0.stops[0]!
    delete inputDay0.legs
    delete inputDay0.brief
    delete inputStop0.directions
    delete inputStop0.images
    delete input.fieldNotes
    const g = guideSchema.parse(input)
    const day0 = g.days[0]!
    const stop0 = day0.stops[0]!
    expect(day0.legs).toEqual([])
    expect(day0.brief).toEqual([])
    expect(stop0.directions).toEqual([])
    expect(stop0.images).toEqual([])
    expect(g.fieldNotes).toEqual([])
  })

  it('colophon is optional', () => {
    const input = validGuideInput() as { colophon?: unknown }
    delete input.colophon
    expect(() => guideSchema.parse(input)).not.toThrow()
  })
})

describe('mdInline thin-prose guard', () => {
  const ok = [
    'Plain sentence.',
    'Some **bold** and *italic* and `code`.',
    'A [link](https://example.com) inline.',
    'A hash # mid-sentence is fine.',
    'Numbers like 3.14 are fine.',
  ]
  for (const s of ok) {
    it(`accepts inline prose: ${JSON.stringify(s)}`, () => {
      expect(() => mdInline.parse(s)).not.toThrow()
    })
  }

  const blocked = [
    '# Heading',
    '## Heading two',
    '- bullet list',
    '* bullet list',
    '+ bullet list',
    '> blockquote',
    '```\ncode fence\n```',
    '1. ordered list',
    'intro\n\n## a heading on a later line',
  ]
  for (const s of blocked) {
    it(`rejects block markdown: ${JSON.stringify(s)}`, () => {
      expect(() => mdInline.parse(s)).toThrow(z.ZodError)
    })
  }
})

describe('enums and shared shapes', () => {
  it('image.role and image.source are enums', () => {
    const base = {
      file: 'x.webp',
      artist: 'a',
      license: 'CC0',
      sourceUrl: 'https://example.com/x',
    }
    expect(() => image.parse({ ...base, role: 'wide', source: 'unsplash' })).not.toThrow()
    expect(() => image.parse({ ...base, role: 'poster', source: 'unsplash' })).toThrow(z.ZodError)
    expect(() => image.parse({ ...base, role: 'wide', source: 'getty' })).toThrow(z.ZodError)
  })

  it('image.sourceUrl is required and must be a URL', () => {
    const base = { file: 'x.webp', role: 'wide', source: 'flickr', artist: 'a', license: 'CC0' }
    expect(() => image.parse(base)).toThrow(z.ZodError) // missing sourceUrl
    expect(() => image.parse({ ...base, sourceUrl: 'not-a-url' })).toThrow(z.ZodError)
  })

  it('fieldItem is the shared shape used by directions and brief', () => {
    // stop.directions[] and day.brief[] both reference fieldItem — verify the shape parses.
    const item = fieldItem.parse({ label: 'Fuel', value: 'Top off.', warn: true, icon: '⛽' })
    expect(item.label).toBe('Fuel')
    expect(item.warn).toBe(true)
    // and that a stop's directions accept it
    const s = stop.parse({
      id: 's',
      name: 'S',
      description: 'plain',
      gps: { lat: 0, lng: 0, label: 'here', elev: 10 },
      directions: [{ label: 'Access', value: 'Graded dirt.' }],
    })
    expect(s.directions[0]!.label).toBe('Access')
  })
})
