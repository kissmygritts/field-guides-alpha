<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useLightbox } from '~/composables/useLightbox'

// Lightbox (handoff-spec §6.6): the single full-screen photo viewer, mounted once
// at the page root. It reads the shared overlay state from `useLightbox()` — any
// Gallery opens it — and renders through <Teleport to="body"> so the fixed overlay
// escapes the page's stacking/transform context. Keyboard (Esc / ← / →) and
// touch-swipe are plain Vue listeners; NO third-party lightbox library (§6.6 — a
// dependency for ~40 lines of behavior would fight the one-dependency ethos).
const { state, close, next, prev } = useLightbox()

/** The active photo, or null when the overlay is empty (narrows the template). */
const current = computed(() => state.images[state.index] ?? null)

function onKey(e: KeyboardEvent): void {
  if (!state.open) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowRight') next()
  else if (e.key === 'ArrowLeft') prev()
}

// Touch-swipe: a mostly-horizontal drag past the threshold cycles the photo.
let startX = 0
let startY = 0
function onTouchStart(e: TouchEvent): void {
  const t = e.touches[0]
  if (!t) return
  startX = t.clientX
  startY = t.clientY
}
function onTouchEnd(e: TouchEvent): void {
  const t = e.changedTouches[0]
  if (!t) return
  const dx = t.clientX - startX
  const dy = t.clientY - startY
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) next()
    else prev()
  }
}

// One window listener for the page's single overlay; guarded by `state.open`.
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state.open && current"
      class="lb"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      @click.self="close"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <button class="lb-btn lb-close" type="button" aria-label="Close" @click="close">
        ✕
      </button>
      <button
        v-if="state.images.length > 1"
        class="lb-btn lb-prev"
        type="button"
        aria-label="Previous"
        @click.stop="prev"
      >
        ‹
      </button>
      <button
        v-if="state.images.length > 1"
        class="lb-btn lb-next"
        type="button"
        aria-label="Next"
        @click.stop="next"
      >
        ›
      </button>

      <span class="lb-imgbox">
        <NuxtImg
          :src="current.src"
          :alt="current.roleLabel"
          width="1280"
          format="webp"
          quality="80"
          class="lb-img"
        />
      </span>

      <figcaption class="lb-cap">
        {{ current.roleLabel }}
        <span class="cr">
          {{ current.artist }} · {{ current.source }} ·
          <a
            :href="current.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            >{{ current.license }}</a
          >
        </span>
      </figcaption>

      <div v-if="state.images.length > 1" class="lb-tools">
        <span class="lb-dots">
          <i
            v-for="(img, i) in state.images"
            :key="i"
            :class="{ on: i === state.index }"
          />
        </span>
      </div>
    </div>
  </Teleport>
</template>
