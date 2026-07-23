import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import { guideSchema } from '~/schema/guide'
import {
  imageFile,
  toImageEntry,
  upsertImages,
} from '../build/lib/yml-images.mjs'

// Unit tests for the finalize yml write-path (handoff-spec §7). These cover the
// pure pieces — file naming, adapter→schema mapping, and the surgical upsert —
// without touching the network or sharp.

const sampleYml = readFileSync(
  fileURLToPath(new URL('../content/sample.yml', import.meta.url)),
  'utf8',
)

// A wikimedia-shaped imageInfo (matches build/lib/wikimedia.mjs output).
const wmInfo = {
  source: 'wikimedia',
  title: 'Ridge.jpg',
  thumburl: 'https://upload.wikimedia.org/x/thumb.jpg',
  artist: 'Ansel Example',
  license: 'CC BY-SA 4.0',
  licenseurl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  descurl: 'https://commons.wikimedia.org/wiki/File:Ridge.jpg',
}

// Deep-clone a parsed guide with every stop's `images` removed — used to prove no
// non-image data changed.
function stripImages(guide) {
  const g = structuredClone(guide)
  for (const day of g.days ?? []) {
    for (const stop of day.stops ?? []) delete stop.images
  }
  return g
}

describe('imageFile', () => {
  it('names the first image <stop>-<role>.webp with no suffix', () => {
    expect(imageFile('overlook', 'wide', 0)).toBe('overlook-wide.webp')
  })

  it('suffixes a rare second image of the same role with -2', () => {
    expect(imageFile('overlook', 'wide', 1)).toBe('overlook-wide-2.webp')
    expect(imageFile('overlook', 'detail', 2)).toBe('overlook-detail-3.webp')
  })
})

describe('toImageEntry', () => {
  it('maps adapter imageInfo to a schema image entry, attribution verbatim', () => {
    const e = toImageEntry({
      file: 'overlook-wide.webp',
      role: 'wide',
      source: 'wikimedia',
      info: wmInfo,
    })
    expect(e).toEqual({
      file: 'overlook-wide.webp',
      role: 'wide',
      source: 'wikimedia',
      artist: 'Ansel Example',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ridge.jpg',
    })
  })

  it('drops licenseUrl when the adapter has none, keeps sourceUrl', () => {
    const e = toImageEntry({
      file: 'x-shot.webp',
      role: 'shot',
      source: 'flickr',
      info: { ...wmInfo, source: 'flickr', licenseurl: '' },
    })
    expect(e).not.toHaveProperty('licenseUrl')
    expect(e.sourceUrl).toBe('https://commons.wikimedia.org/wiki/File:Ridge.jpg')
  })

  it('produces an entry that validates against the schema image role/source enums', () => {
    const e = toImageEntry({
      file: 'overlook-wide.webp',
      role: 'wide',
      source: 'wikimedia',
      info: wmInfo,
    })
    // round-trip through the real guide schema by grafting it onto a valid guide
    const guide = parse(sampleYml)
    guide.days[0].stops[1].images = [e]
    expect(() => guideSchema.parse(guide)).not.toThrow()
  })
})

describe('upsertImages', () => {
  const entry = (file, artist = 'Ansel Example') => ({
    file,
    role: 'wide',
    source: 'wikimedia',
    artist,
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ridge.jpg',
  })

  it('inserts images into a stop that had none without touching any prose', () => {
    const out = upsertImages(sampleYml, {
      overlook: [entry('overlook-wide.webp')],
    })
    // Non-image data is byte-for-byte semantically identical.
    expect(stripImages(parse(out))).toEqual(stripImages(parse(sampleYml)))
    // The header comment survives verbatim.
    expect(out).toContain('# Sample guide — exercises every branch')
    // The overlook stop now carries the image.
    expect(parse(out).days[0].stops[1].images).toEqual([
      expect.objectContaining({ file: 'overlook-wide.webp', role: 'wide' }),
    ])
  })

  it('never reflows an untouched long prose line', () => {
    const longLine =
      '        description: Cracked playa that goes *pink* at dusk. Watch for **soft** mud after rain.'
    expect(sampleYml).toContain(longLine)
    const out = upsertImages(sampleYml, {
      overlook: [entry('overlook-wide.webp')],
    })
    expect(out).toContain(longLine)
  })

  it('overwrites an existing entry in place when the file key matches', () => {
    const out = upsertImages(sampleYml, {
      trailhead: [
        {
          file: 'trailhead-wide.webp',
          role: 'wide',
          source: 'wikimedia',
          artist: 'Freshly Recredited',
          license: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
          sourceUrl: 'https://commons.wikimedia.org/wiki/File:New.jpg',
        },
      ],
    })
    const imgs = parse(out).days[0].stops[0].images
    expect(imgs).toHaveLength(1) // replaced, not appended
    expect(imgs[0].artist).toBe('Freshly Recredited')
    expect(imgs[0].sourceUrl).toBe(
      'https://commons.wikimedia.org/wiki/File:New.jpg',
    )
  })

  it('appends a new-role image while keeping existing images (upsert)', () => {
    const out = upsertImages(sampleYml, {
      trailhead: [
        {
          file: 'trailhead-detail.webp',
          role: 'detail',
          source: 'flickr',
          artist: 'Someone',
          license: 'CC BY 2.0',
          sourceUrl: 'https://www.flickr.com/photos/x/1',
        },
      ],
    })
    const imgs = parse(out).days[0].stops[0].images
    expect(imgs.map((i) => i.file)).toEqual([
      'trailhead-wide.webp',
      'trailhead-detail.webp',
    ])
  })

  it('is idempotent — re-running yields identical text', () => {
    const once = upsertImages(sampleYml, {
      overlook: [entry('overlook-wide.webp')],
    })
    const twice = upsertImages(once, {
      overlook: [entry('overlook-wide.webp')],
    })
    expect(twice).toBe(once)
  })

  it('throws when a stop id is not present in the yml', () => {
    expect(() =>
      upsertImages(sampleYml, { nonexistent: [entry('nonexistent-wide.webp')] }),
    ).toThrow(/nonexistent/)
  })

  it('produces yml that still validates against guideSchema', () => {
    const out = upsertImages(sampleYml, {
      overlook: [entry('overlook-wide.webp')],
      'dry-lake': [entry('dry-lake-wide.webp')],
    })
    expect(() => guideSchema.parse(parse(out))).not.toThrow()
  })
})
