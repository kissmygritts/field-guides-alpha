import { reactive } from 'vue'
import type { GalleryImage } from '~/utils/derive'

// useLightbox (handoff-spec §6.6): the shared overlay state for the one page-level
// `Lightbox`. Any `Gallery` opens it via `open(images, index)`. This is VIEW state
// (which photos are showing, at what index) — not data-loading — so a singleton
// composable holding it doesn't break the one-smart-component rule (§6.2).
//
// A single module-level `reactive` object is the shared instance: every
// `useLightbox()` call returns actions bound to the same state, so a click in any
// gallery drives the single overlay mounted at the page root.

/** Reactive overlay state: whether it's open, the photos, and the active index. */
export interface LightboxState {
  open: boolean
  images: GalleryImage[]
  index: number
}

const state = reactive<LightboxState>({
  open: false,
  images: [],
  index: 0,
})

/** Clamp an index into `[0, len - 1]` (0 when there are no images). */
function clampIndex(index: number, len: number): number {
  if (len <= 0) return 0
  return Math.min(Math.max(0, index), len - 1)
}

export function useLightbox() {
  /** Open the overlay on `images`, starting at `index` (clamped, defaults to 0). */
  function open(images: GalleryImage[], index = 0): void {
    state.images = images
    state.index = clampIndex(index, images.length)
    state.open = true
  }

  function close(): void {
    state.open = false
  }

  /** Advance one photo, wrapping past the end. No-op for a single image. */
  function next(): void {
    if (state.images.length < 2) return
    state.index = (state.index + 1) % state.images.length
  }

  /** Step back one photo, wrapping past the start. No-op for a single image. */
  function prev(): void {
    if (state.images.length < 2) return
    state.index =
      (state.index - 1 + state.images.length) % state.images.length
  }

  return { state, open, close, next, prev }
}
