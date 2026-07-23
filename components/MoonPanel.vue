<script setup lang="ts">
// Moon & night-sky panel (handoff-spec §6.3, §6.5). Fully dumb: every value is
// derived at prerender by utils/moon.ts and passed in as props — zero client JS,
// zero runtime cost. It shows the trip window, the window's moon phase, and the
// dark-sites note.
const props = defineProps<{
  windowLabel: string
  phaseLabel: string
  start: Date
  end: Date
  darkSites: string
}>()

// UTC formatting keeps the prerendered output deterministic regardless of the
// build machine's timezone.
const fmt = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

const dateRange = computed(() =>
  props.start.getTime() === props.end.getTime()
    ? fmt(props.start)
    : `${fmt(props.start)} – ${fmt(props.end)}`,
)
</script>

<template>
  <section class="moon" aria-labelledby="moon-h">
    <h4 id="moon-h">Moon &amp; night sky · your window</h4>
    <p class="moon-window">
      <span class="moon-phrase">{{ windowLabel }}</span>
      <time class="moon-dates" :datetime="start.toISOString()">{{ dateRange }}</time>
    </p>
    <p class="moon-phase">{{ phaseLabel }} over the window.</p>
    <p class="moon-note">Darkest desert sites: {{ darkSites }}.</p>
  </section>
</template>

<style scoped>
.moon {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 15px 17px;
}
.moon h4 {
  margin: 0 0 7px;
  color: var(--ink);
  font-size: 15px;
}
.moon-window {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 6px;
}
.moon-phrase {
  color: var(--ink);
  font-size: 14px;
  text-transform: capitalize;
}
.moon-dates {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-faint);
}
.moon-phase {
  margin: 0 0 11px;
  color: var(--ink-dim);
  font-size: 13px;
  line-height: 1.5;
}
.moon-note {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--ink-faint);
  margin: 0;
  line-height: 1.55;
}
</style>
