import { describe, expect, it } from 'vitest'
import type { Image } from '~/schema/guide'
import { ROLE_LABELS, galleryImage } from '~/utils/derive'

// Gallery derivation (handoff-spec §5 + §7): the image role label is a RENDERING
// CONSTANT (never per-guide data), and the `src` is the bare `file` joined to the
// absolute `/guides/<slug>/` path (§7 — absolute-path src, IPX-optimizable).

const baseImage: Image = {
  file: 'trailhead-wide.webp',
  role: 'wide',
  source: 'wikimedia',
  artist: 'A. Photographer',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sample.jpg',
}

describe('ROLE_LABELS', () => {
  it('maps every image role to its rendering caption (§5)', () => {
    expect(ROLE_LABELS).toEqual({
      wide: 'the place',
      shot: "toward 'the shot'",
      detail: 'detail',
      mood: 'mood · light',
    })
  })
})

describe('galleryImage', () => {
  it('joins the bare filename to an absolute /guides/<slug>/ src (§7)', () => {
    const g = galleryImage('sample', baseImage)
    expect(g.src).toBe('/guides/sample/trailhead-wide.webp')
  })

  it('derives the role label from the role enum, never authored', () => {
    expect(galleryImage('sample', baseImage).roleLabel).toBe('the place')
    expect(galleryImage('sample', { ...baseImage, role: 'shot' }).roleLabel).toBe(
      "toward 'the shot'",
    )
    expect(
      galleryImage('sample', { ...baseImage, role: 'detail' }).roleLabel,
    ).toBe('detail')
    expect(galleryImage('sample', { ...baseImage, role: 'mood' }).roleLabel).toBe(
      'mood · light',
    )
  })

  it('carries the attribution fields through for per-image credits', () => {
    const g = galleryImage('sample', baseImage)
    expect(g.artist).toBe('A. Photographer')
    expect(g.source).toBe('wikimedia')
    expect(g.license).toBe('CC BY-SA 4.0')
    expect(g.sourceUrl).toBe('https://commons.wikimedia.org/wiki/File:Sample.jpg')
    expect(g.licenseUrl).toBe('https://creativecommons.org/licenses/by-sa/4.0/')
  })

  it('keeps licenseUrl optional', () => {
    const { licenseUrl, ...noLicenseUrl } = baseImage
    void licenseUrl
    expect(galleryImage('sample', noLicenseUrl).licenseUrl).toBeUndefined()
  })
})
