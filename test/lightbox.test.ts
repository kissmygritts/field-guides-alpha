import { beforeEach, describe, expect, it } from 'vitest'
import { useLightbox } from '~/composables/useLightbox'
import type { GalleryImage } from '~/utils/derive'

// useLightbox (handoff-spec §6.6): a tiny composable holding the SHARED overlay
// state `{ open, images, index }`. It is VIEW state, not data-loading — a single
// module singleton so every Gallery opens the one page-level Lightbox. The index
// wraps on next/prev and is no-op for a single image (matching the ported vanilla
// behavior). These cover the reactive contract without a DOM.

function img(file: string): GalleryImage {
  return {
    src: `/guides/sample/${file}`,
    role: 'wide',
    roleLabel: 'the place',
    artist: 'A. Photographer',
    source: 'wikimedia',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sample.jpg',
  }
}

const three = [img('a.webp'), img('b.webp'), img('c.webp')]

describe('useLightbox', () => {
  beforeEach(() => {
    // reset the shared singleton between cases
    useLightbox().close()
  })

  it('starts closed', () => {
    // close() in beforeEach leaves it closed; a fresh read agrees
    const { state } = useLightbox()
    expect(state.open).toBe(false)
  })

  it('open(images, index) fills state and flips open true at that index', () => {
    const { state, open } = useLightbox()
    open(three, 1)
    expect(state.open).toBe(true)
    expect(state.images).toEqual(three)
    expect(state.index).toBe(1)
  })

  it('open defaults to the first image when no index is given', () => {
    const { state, open } = useLightbox()
    open(three)
    expect(state.index).toBe(0)
  })

  it('open clamps an out-of-range index into the image bounds', () => {
    const { state, open } = useLightbox()
    open(three, 99)
    expect(state.index).toBe(2)
    open(three, -5)
    expect(state.index).toBe(0)
  })

  it('close flips open false', () => {
    const { state, open, close } = useLightbox()
    open(three, 2)
    close()
    expect(state.open).toBe(false)
  })

  it('next cycles forward and wraps past the end', () => {
    const { state, open, next } = useLightbox()
    open(three, 0)
    next()
    expect(state.index).toBe(1)
    next()
    next()
    expect(state.index).toBe(0)
  })

  it('prev cycles backward and wraps past the start', () => {
    const { state, open, prev } = useLightbox()
    open(three, 0)
    prev()
    expect(state.index).toBe(2)
    prev()
    expect(state.index).toBe(1)
  })

  it('next/prev are no-ops for a single image', () => {
    const { state, open, next, prev } = useLightbox()
    open([img('solo.webp')], 0)
    next()
    expect(state.index).toBe(0)
    prev()
    expect(state.index).toBe(0)
  })

  it('shares one singleton across separate useLightbox() calls', () => {
    useLightbox().open(three, 2)
    // a second, independent consumer sees the same overlay state
    expect(useLightbox().state.index).toBe(2)
    expect(useLightbox().state.open).toBe(true)
  })
})
