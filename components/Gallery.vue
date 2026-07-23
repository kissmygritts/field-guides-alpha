<script setup lang="ts">
import type { GalleryImage } from '~/utils/derive'

// Gallery (handoff-spec §6.3): a stop's multi-photo grid. Each image renders via
// <NuxtImg> from its absolute /guides/<slug>/<file> src (§7) at 640px q80 with a
// retina (x2) variant — the IPX provider bakes those transforms at `nuxt generate`
// (§7, SSR-on). No base64 anywhere. Below each photo: its role-label caption (a
// rendering constant, §5) and per-image attribution (artist · source · license,
// linked to the source page). Presentational — props in, markup out.
defineProps<{ images: GalleryImage[] }>()
</script>

<template>
  <div v-if="images.length" class="gallery">
    <figure v-for="(img, i) in images" :key="i" class="gallery-item">
      <NuxtImg
        :src="img.src"
        :alt="img.roleLabel"
        width="640"
        densities="x1 x2"
        format="webp"
        quality="80"
        loading="lazy"
        class="gallery-img"
      />
      <figcaption class="gallery-cap">
        <span class="gallery-role">{{ img.roleLabel }}</span>
        <span class="gallery-attr">
          {{ img.artist }} · {{ img.source }} ·
          <a
            :href="img.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            >{{ img.license }}</a
          >
        </span>
      </figcaption>
    </figure>
  </div>
</template>
