import { describe, expect, it } from 'vitest'
import { resolveSource } from '../build/finalize-from-manifest.mjs'

// Unit tests for the offline finalize's source recovery (handoff-spec §7, ticket
// #18). The schema `image.source` is a required enum, but some early manifests
// (2026-395) predate the field. finalize-from-manifest recovers it from the
// description-page host instead of guessing — attribution stays sourced, never
// invented.

describe('resolveSource', () => {
  it('uses an explicit manifest source verbatim when present', () => {
    expect(
      resolveSource({ source: 'unsplash', descurl: 'https://example.com/x' }),
    ).toBe('unsplash')
  })

  it('recovers wikimedia from a Commons description url', () => {
    expect(
      resolveSource({
        descurl: 'https://commons.wikimedia.org/wiki/File:Trona_Pinnacles.jpg',
      }),
    ).toBe('wikimedia')
  })

  it('recovers unsplash from an unsplash.com url', () => {
    expect(
      resolveSource({ descurl: 'https://unsplash.com/photos/abc123' }),
    ).toBe('unsplash')
  })

  it('recovers flickr from a flickr.com url', () => {
    expect(
      resolveSource({ descurl: 'https://www.flickr.com/photos/x/123' }),
    ).toBe('flickr')
  })

  it('throws rather than guess when there is no source and no known host', () => {
    expect(() =>
      resolveSource({ descurl: 'https://unknown.example/img' }),
    ).toThrow()
  })
})
