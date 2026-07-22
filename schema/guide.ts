import { z } from 'zod'

// The single shared guide schema (handoff-spec §3). This is the one source of
// truth for both the read path (composables, §4) and the future drafting app's
// write path. Nuxt Content is deliberately not used (§4) — structured YAML is
// parsed and validated against this schema at build time.

// Thin-prose guard (§3): bold/italic/inline-code/links allowed; no headings,
// lists, blockquotes, code fences, or ordered-list / block-level structure.
// A refinement rejects block-level Markdown so authors can't smuggle long-form
// copy back in.
const BLOCK_MARKDOWN = /^\s*(#{1,6}\s|[-*+]\s|>\s|```|\d+\.\s)/m
export const mdInline = z
  .string()
  .refine((s) => !BLOCK_MARKDOWN.test(s), {
    message: 'block-level Markdown is not allowed in thin-prose fields',
  })

// Shared labeled-list item — used by stop.directions AND day.brief (§3 unification).
export const fieldItem = z.object({
  label: z.string(), // free-text: Light / Glass / Access / Fuel / Also …
  value: mdInline,
  warn: z.boolean().optional(), // renders the alert treatment (old .warn)
  icon: z.string().optional(), // emoji/glyph, used mainly by day.brief
})

export const image = z.object({
  file: z.string(), // bare filename, joined to /guides/<slug>/ at render
  role: z.enum(['wide', 'shot', 'detail', 'mood']),
  source: z.enum(['unsplash', 'flickr', 'wikimedia']),
  artist: z.string(),
  license: z.string(), // e.g. "CC BY-SA 2.0", "Unsplash License"
  licenseUrl: z.string().url().optional(), // license deed (manifest `licenseurl`)
  sourceUrl: z.string().url(), // source/description page (manifest `descurl`) — the attribution link
})

export const gps = z.object({
  lat: z.number(),
  lng: z.number(),
  label: z.string(), // human place label shown on the geo line
  elev: z.number(), // FEET, numeric
})

export const stop = z.object({
  id: z.string(), // stable key (former manifest/config stop key)
  name: z.string(),
  badge: z.string().optional(), // free-text kicker, e.g. "state park" (old span.opt)
  optional: z.boolean().optional(), // true for promoted alts / "worth it if you have time"
  when: z.string().optional(), // e.g. "Low AM · roadside detour"
  teaser: mdInline.optional(),
  description: mdInline,
  location: z.string().optional(), // free-text locale line if distinct from gps.label
  gps,
  directions: z.array(fieldItem).default([]),
  theShot: mdInline.optional(),
  images: z.array(image).default([]), // upserted by finalize (§7)
})

export const day = z.object({
  theme: z.string().optional(), // day title / theme
  route: z.string().optional(), // one-line route summary
  summary: mdInline.optional(), // day-sub prose
  legs: z.array(z.object({ at: z.string(), text: z.string() })).default([]), // itinerary chips
  brief: z.array(fieldItem).default([]), // fuel/signal/water/drive — same type as directions
  stops: z.array(stop).min(1),
})

export const masthead = z.object({
  eyebrow: z.string(),
  title: mdInline,
  dek: mdInline,
  meta: z.array(z.string()).default([]), // plain-text stat chips (bold dropped for now)
  startDate: z.coerce.date(), // drives "Day N · Weekday" derivation
})

export const guideSchema = z.object({
  masthead,
  moon: z.object({ start: z.coerce.date(), end: z.coerce.date() }),
  darkSites: z.string(), // prose list of dark-sky sites
  days: z.array(day).min(1),
  fieldNotes: z
    .array(z.object({ heading: z.string(), body: mdInline }))
    .default([]),
  colophon: z
    .object({
      // the 3 credit lines, structured
      artDirection: z.string().optional(),
      photographers: z.string().optional(),
      route: z.string().optional(),
    })
    .optional(),
})

export type Guide = z.infer<typeof guideSchema>
export type Stop = z.infer<typeof stop>
export type Day = z.infer<typeof day>
export type Image = z.infer<typeof image>
export type Gps = z.infer<typeof gps>
export type Masthead = z.infer<typeof masthead>
export type FieldItem = z.infer<typeof fieldItem>
