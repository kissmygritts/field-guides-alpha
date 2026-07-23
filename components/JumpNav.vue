<script setup lang="ts">
import type { JumpDay } from '~/utils/derive'

// JumpNav (handoff-spec §6.3): the day/stop anchor index at the top of the guide
// body. Each row is a derived `Day N · Weekday` label followed by its stops; every
// link targets a stop's `s-<id>` anchor (rendered as the id on StopCard), so a tap
// jumps to that stop. Presentational — props in, markup out.
defineProps<{ days: JumpDay[] }>()
</script>

<template>
  <nav class="jump" aria-label="Jump to a stop">
    <h2>Jump to a stop</h2>
    <div v-for="(day, i) in days" :key="i" class="jrow">
      <span class="jday">{{ day.label }}</span>
      <a v-for="stop in day.stops" :key="stop.anchor" :href="`#${stop.anchor}`">
        {{ stop.name }}
      </a>
    </div>
  </nav>
</template>
