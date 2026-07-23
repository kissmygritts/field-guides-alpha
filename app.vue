<script setup lang="ts">
// Root shell. Routing is enabled by the `pages/` directory (handoff-spec §6.1);
// this only mounts the router outlet. The guide page (pages/guides/[slug].vue) is
// the one data-fetching component and drives the Zod build gate through useGuide.
</script>

<template>
  <NuxtPage />
</template>
