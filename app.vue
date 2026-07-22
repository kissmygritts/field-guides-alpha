<script setup lang="ts">
// Scaffold placeholder (handoff-spec §9.1). Nothing is rendered yet — the
// presentational component tree and routes land in later tickets. This root
// component only wires the typed loader into the build graph so that Zod
// validation of every content/*.yml runs at build (the schema gate, §8).
const guides = useGuides()
</script>

<template>
  <main>
    <h1>Field Guide — Nuxt data layer</h1>
    <p>{{ guides.length }} guide(s) loaded and Zod-validated at build.</p>
    <ul>
      <li v-for="g in guides" :key="g.slug">{{ g.slug }}</li>
    </ul>
  </main>
</template>
