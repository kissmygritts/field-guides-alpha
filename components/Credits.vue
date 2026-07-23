<script setup lang="ts">
import type { CreditItem } from '~/utils/derive'

// Credits (handoff-spec §5, §6.3): the attribution list built from the derived
// union of every stop's images[] — one row per image (stop name, artist, source,
// license linked to its source page). Derived, never authored. Presentational —
// props in, markup out.
defineProps<{ items: CreditItem[] }>()

// Display labels for the source enum (the yml stores the lowercase key).
const SOURCE_LABEL: Record<CreditItem['source'], string> = {
  unsplash: 'Unsplash',
  flickr: 'Flickr',
  wikimedia: 'Wikimedia Commons',
}
</script>

<template>
  <section v-if="items.length" class="credits" aria-labelledby="credits-h">
    <h2 id="credits-h">Location photographs</h2>
    <p class="credits-note">
      Reused under their stated licenses. Attribution by image:
    </p>
    <ul class="credits-list">
      <li v-for="(item, i) in items" :key="i" class="credit">
        <b class="credit-name">{{ item.name }}</b>
        <span class="credit-artist">{{ item.artist }}</span>
        <span class="credit-source">{{ SOURCE_LABEL[item.source] }}</span>
        <a
          class="credit-license"
          :href="item.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          >{{ item.license }}</a
        >
      </li>
    </ul>
  </section>
</template>
