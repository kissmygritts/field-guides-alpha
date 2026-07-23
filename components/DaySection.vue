<script setup lang="ts">
import type { FieldItem } from '~/schema/guide'
import type { StopView } from '~/utils/derive'

// DaySection (handoff-spec §6.3): day header (derived `Day N · Weekday` label +
// theme, route, summary), leg chips (inline), the day brief via FieldList, and the
// nested StopCards. Binds --accent from the derived day index and lets it cascade
// to the stops inside (§6.4). Presentational — props in, markup out.
const props = defineProps<{
  label: string
  theme?: string
  route?: string
  summary?: string
  legs: { at: string; text: string }[]
  brief: FieldItem[]
  accentIndex: number
  stops: StopView[]
}>()

// Fixed 3-color palette (§6.4); cycles for guides longer than three days.
const accent = computed(() => `var(--day${(props.accentIndex % 3) + 1})`)
</script>

<template>
  <section class="day-section" :style="{ '--accent': accent }">
    <div class="day">
      <p class="day-tag">
        {{ label }}<template v-if="theme"> · {{ theme }}</template>
      </p>
      <h2 v-if="route" class="day-title">{{ route }}</h2>
      <!-- summary is schema-validated thin prose -->
      <p v-if="summary" class="day-sub" v-html="renderInline(summary)" />

      <div v-if="legs.length" class="day-legs">
        <span v-for="(leg, i) in legs" :key="i" class="chip">
          <b>{{ leg.at }}</b> {{ leg.text }}
        </span>
      </div>

      <FieldList v-if="brief.length" :items="brief" />
    </div>

    <StopCard v-for="stop in stops" :key="stop.num" v-bind="stop" />
  </section>
</template>
