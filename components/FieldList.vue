<script setup lang="ts">
import type { FieldItem } from '~/schema/guide'

// Shared labeled-list component (handoff-spec §6.3). One type, one look — used by
// StopCard.directions AND DaySection.brief. `value` is thin inline Markdown,
// rendered via renderInline; `warn` gets the alert treatment; `icon` prefixes
// the label. Presentational: props in, markup out.
defineProps<{ items: FieldItem[] }>()
</script>

<template>
  <dl class="field-list">
    <div
      v-for="(item, i) in items"
      :key="i"
      class="field"
      :class="{ warn: item.warn }"
    >
      <dt>
        <span v-if="item.icon" class="field-icon">{{ item.icon }}</span>{{ item.label }}
      </dt>
      <!-- value is schema-validated thin prose; renderInline escapes then renders -->
      <dd v-html="renderInline(item.value)" />
    </div>
  </dl>
</template>
