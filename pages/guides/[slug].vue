<script setup lang="ts">
// The ONE smart component (handoff-spec §6.2): it is the only data-fetching page.
// It loads the guide by slug via the typed composable, runs the §5 derivations
// (`deriveGuideView`), and passes plain props to the presentational tree
// (Masthead / DaySection / StopCard / FieldList). No other component fetches data.
const route = useRoute()
const slug = computed(() => String(route.params.slug))

const guide = useGuide(slug.value)
if (!guide) {
  throw createError({
    statusCode: 404,
    statusMessage: `No guide for slug "${slug.value}"`,
    fatal: true,
  })
}

// Derived, never authored: Day N · Weekday, dotted stop numbers, accent index,
// and each stop's gallery images (absolute /guides/<slug>/ src + role label).
const view = deriveGuideView(guide, slug.value)

useHead({ title: guide.masthead.eyebrow })
</script>

<template>
  <main class="guide">
    <Masthead
      :eyebrow="view.masthead.eyebrow"
      :title="view.masthead.title"
      :dek="view.masthead.dek"
      :meta="view.masthead.meta"
    />
    <div class="body">
      <JumpNav :days="view.jumpNav" />
      <DaySection
        v-for="(day, i) in view.days"
        :key="i"
        :label="day.label"
        :theme="day.theme"
        :route="day.route"
        :summary="day.summary"
        :legs="day.legs"
        :brief="day.brief"
        :accent-index="day.accentIndex"
        :stops="day.stops"
      />
      <MoonPanel
        :window-label="view.moon.windowLabel"
        :phase-label="view.moon.phaseLabel"
        :start="view.moon.start"
        :end="view.moon.end"
        :dark-sites="view.moon.darkSites"
      />
      <Credits :items="view.credits" />
    </div>
  </main>
</template>
