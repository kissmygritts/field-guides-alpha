<script setup lang="ts">
import type { FieldItem, Gps } from '~/schema/guide'
import type { GalleryImage } from '~/utils/derive'

// StopCard (handoff-spec §6.3): kicker (num / optional / when), title (+ badge and
// locale), description, geo line, directions via FieldList, the "shot" callout, and
// the photo Gallery. Presentational — props in, markup out; `--accent` is inherited
// from the enclosing DaySection.
defineProps<{
  num: string
  name: string
  badge?: string
  optional: boolean
  when?: string
  teaser?: string
  description: string
  location?: string
  gps: Gps
  directions: FieldItem[]
  theShot?: string
  images: GalleryImage[]
}>()
</script>

<template>
  <article class="stop">
    <div class="stop-body">
      <div class="stop-kicker">
        <span class="stop-num">
          {{ num }}<span v-if="optional" class="opt-flag">optional</span>
        </span>
        <span v-if="when" class="stop-when">{{ when }}</span>
      </div>

      <h3>{{ name }}<span v-if="badge" class="opt">{{ badge }}</span></h3>
      <p v-if="location" class="stop-locale">{{ location }}</p>

      <!-- teaser/description/theShot are schema-validated thin prose -->
      <p v-if="teaser" class="stop-teaser" v-html="renderInline(teaser)" />
      <p class="stop-desc" v-html="renderInline(description)" />

      <p class="stop-geo">
        <span>{{ gps.label }}</span>
        <span class="elev">{{ gps.elev.toLocaleString() }} ft</span>
        <span>{{ gps.lat.toFixed(4) }}, {{ gps.lng.toFixed(4) }}</span>
      </p>

      <FieldList v-if="directions.length" :items="directions" />

      <div v-if="theShot" class="theshot">
        <span class="theshot-tag">The shot</span>
        <span v-html="renderInline(theShot)" />
      </div>

      <Gallery v-if="images.length" :images="images" />
    </div>
  </article>
</template>
