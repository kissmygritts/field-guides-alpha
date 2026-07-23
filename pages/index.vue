<script setup lang="ts">
import { useGuides } from '~/composables/useGuides'
import { guideListing } from '~/utils/guideListing'

// The `/` index route (handoff-spec §6.1) — replaces the old dist/index.html.
// The one smart seam here is calling useGuides(); guideListing() does the
// derivation and the template is a thin list. Linking every guide to its
// /guides/<slug> route is also what makes each guide page crawl-reachable, so
// `nuxt generate` bakes its /_ipx image variants (§7 crawl-reachability caveat).
const guides = guideListing(useGuides())

useHead({ title: 'Field Guides' })
</script>

<template>
  <main class="index">
    <h1>Field Guides</h1>
    <p v-if="!guides.length" class="empty">No guides yet.</p>
    <ul v-else class="guide-list">
      <li v-for="guide in guides" :key="guide.slug" class="guide-item">
        <NuxtLink :to="guide.href" class="guide-link">
          <span class="eyebrow">{{ guide.eyebrow }}</span>
          <span class="title">{{ guide.title }}</span>
          <span class="dek">{{ guide.dek }}</span>
          <span v-if="guide.meta.length" class="meta">
            <span v-for="stat in guide.meta" :key="stat" class="stat">{{ stat }}</span>
          </span>
        </NuxtLink>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.index {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 20px;
}
h1 {
  font-family: Georgia, serif;
}
.guide-list {
  list-style: none;
  padding: 0;
  margin: 24px 0 0;
  display: grid;
  gap: 16px;
}
.guide-link {
  display: grid;
  gap: 4px;
  padding: 16px;
  border: 1px solid currentColor;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  opacity: 0.7;
}
.title {
  font-family: Georgia, serif;
  font-size: 1.25rem;
}
.dek {
  opacity: 0.85;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.8rem;
  opacity: 0.7;
}
.stat::after {
  content: '·';
  margin-left: 8px;
}
.stat:last-child::after {
  content: '';
  margin-left: 0;
}
</style>
