<script setup lang="ts">
// Masthead (handoff-spec §6.3): eyebrow, title (with an <em> accent from inline
// Markdown), dek, plain-text meta stat chips (inline v-for), and the static ridge
// SVG. Presentational — props in, markup out.
defineProps<{
  eyebrow: string
  title: string
  dek: string
  meta: string[]
}>()
</script>

<template>
  <header class="mast">
    <svg
      class="mast-ridge"
      viewBox="0 0 940 120"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0,120 L0,86 L90,70 L180,80 L280,58 L380,74 L470,52 L560,72 L650,60 L760,78 L850,64 L940,80 L940,120 Z"
        fill="#0f0f0a"
      />
    </svg>
    <p class="eyebrow">{{ eyebrow }}</p>
    <!-- title/dek are schema-validated thin prose; renderInline escapes then renders -->
    <h1 v-html="renderInline(title)" />
    <p class="dek" v-html="renderInline(dek)" />
    <div v-if="meta.length" class="mast-meta">
      <span v-for="(m, i) in meta" :key="i">{{ m }}</span>
    </div>
  </header>
</template>
