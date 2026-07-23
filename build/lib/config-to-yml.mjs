// Reusable config.json → content/<slug>.yml conversion (handoff-spec §8,
// migration-spec §2). This owns the *mechanical* half of the hybrid migration:
// the structured keys (moon, darkSites, gps, day/stop membership) map straight
// across, and two lossy fixups the spec calls out happen here —
//
//   1. `elev` display string ("4,255 ft") → number (4255), and
//   2. `gps.<stop>.alt[]` sub-locations → first-class sibling stops marked
//      `optional: true` (the change that kills the old merged-gallery `feed` key).
//
// It does NOT author prose: masthead copy, stop descriptions, directions,
// theShot, day themes/briefs/legs, fieldNotes and colophon are hand-ported onto
// the emitted skeleton (the copy IS the product — non-negotiable #4). Those come
// out as empty-string / empty-array placeholders, which are valid `mdInline` and
// keep the skeleton a complete, schema-parseable guide before hand-porting.
//
// Kept pure (no fs) so it unit-tests without touching disk; the CLI wrapper in
// build/config-to-yml.mjs reads/writes files around it.

/**
 * Parse an elevation to a plain number of feet. Accepts the old display strings
 * ("4,255 ft", "710 ft") and passes numbers through unchanged (idempotent, so
 * re-running the conversion on an already-migrated value is safe). Throws on a
 * value with no digits rather than silently emitting NaN.
 */
export function elevToFeet(elev) {
  if (typeof elev === 'number') return elev
  const digits = String(elev).replace(/[^\d]/g, '')
  if (!digits) throw new Error(`cannot parse elevation to feet: ${elev}`)
  return Number(digits)
}

// Map one config `gps.<stop>` entry to a schema `gps` object with numeric elev.
function toGps({ lat, lng, label, elev }) {
  return { lat, lng, label, elev: elevToFeet(elev) }
}

// A promoted `alt` sub-location → a first-class `optional` stop. Alts carried
// only name + coords in the old model, so prose/directions come out empty for
// hand-porting; the alt has no `label`, so gps.label seeds empty too. `n` is the
// 0-based alt index within the parent, so a parent with several alts stays unique
// (`<parent>-alt`, `<parent>-alt2`, …).
function promoteAlt(parentId, alt, n) {
  const id = n === 0 ? `${parentId}-alt` : `${parentId}-alt${n + 1}`
  return {
    id,
    name: alt.name,
    optional: true,
    description: '',
    gps: toGps({ lat: alt.lat, lng: alt.lng, label: alt.label ?? '', elev: alt.elev }),
    directions: [],
  }
}

/**
 * Convert a parsed `config.json` into a skeleton guide object shaped for the
 * shared schema (handoff-spec §3). Structured data maps across verbatim; prose
 * fields are empty placeholders for the hand-port step. Every `gps.<stop>.alt[]`
 * becomes a sibling `optional` stop inserted directly after its parent, in day
 * order.
 */
export function configToGuide(config) {
  const gps = config.gps ?? {}
  const disp = config.disp ?? {}

  const days = (config.days ?? []).map((day) => {
    const stops = []
    for (const entry of day.stops) {
      // config day stops are [id, shortLabel] pairs.
      const id = Array.isArray(entry) ? entry[0] : entry
      const g = gps[id] ?? {}
      stops.push({
        id,
        name: disp[id] ?? (Array.isArray(entry) ? entry[1] : id),
        when: '',
        description: '',
        gps: toGps(g),
        directions: [],
        theShot: '',
      })
      // Promote this stop's alts to sibling optional stops, right after it.
      ;(g.alt ?? []).forEach((alt, n) => stops.push(promoteAlt(id, alt, n)))
    }
    return {
      theme: '',
      route: '',
      summary: '',
      legs: [],
      brief: [],
      stops,
    }
  })

  return {
    masthead: {
      eyebrow: '',
      title: config.title ?? '',
      dek: '',
      meta: [],
      // Seeded from moon.start; hand-correct to the real departure date (it drives
      // the derived `Day N · Weekday` labels).
      startDate: config.moon?.start ?? '',
    },
    moon: { start: config.moon?.start ?? '', end: config.moon?.end ?? '' },
    darkSites: config.darkSites ?? '',
    days,
    fieldNotes: [],
  }
}
