import type { FieldItem, Gps, Guide, Image } from '~/schema/guide'

// Image role label (handoff-spec §5): a RENDERING CONSTANT mapping the `image.role`
// enum to its caption. Never per-guide data — the yml carries only the role enum.
export const ROLE_LABELS: Record<Image['role'], string> = {
  wide: 'the place',
  shot: "toward 'the shot'",
  detail: 'detail',
  mood: 'mood · light',
}

/** Presentational props for one `Gallery` image (handoff-spec §6.3). */
export interface GalleryImage {
  /** Absolute `/guides/<slug>/<file>` path — IPX-optimizable (§7). */
  src: string
  role: Image['role']
  roleLabel: string
  artist: string
  source: Image['source']
  license: string
  licenseUrl?: string
  /** Source/description page — the attribution link. */
  sourceUrl: string
}

/**
 * Derive one {@link GalleryImage} from an authored {@link Image}: join the bare
 * `file` to the absolute `/guides/<slug>/` path (§7) and attach the role label
 * rendering constant (§5). Attribution fields pass through for per-image credits.
 */
export function galleryImage(slug: string, img: Image): GalleryImage {
  return {
    src: `/guides/${slug}/${img.file}`,
    role: img.role,
    roleLabel: ROLE_LABELS[img.role],
    artist: img.artist,
    source: img.source,
    license: img.license,
    licenseUrl: img.licenseUrl,
    sourceUrl: img.sourceUrl,
  }
}

// Derived data (handoff-spec §5): everything below is COMPUTED from the authored
// schema — the yml never carries `Day N · Weekday`, dotted stop numbers, or the
// day-accent index. The page (the one smart component, §6.2) calls
// `deriveGuideView` and passes the plain result down to the presentational tree.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** `Day N · Weekday`, from the masthead start date + a 0-based day index. */
export function dayLabel(startDate: Date, dayIndex: number): string {
  const d = new Date(startDate.getTime())
  d.setUTCDate(d.getUTCDate() + dayIndex)
  return `Day ${dayIndex + 1} · ${WEEKDAYS[d.getUTCDay()]}`
}

/** Dotted stop number `<dayN>.<stopN>` (both 1-based). */
export function stopNumber(dayIndex: number, stopIndex: number): string {
  return `${dayIndex + 1}.${stopIndex + 1}`
}

/** Plain props for a `StopCard` — derived, presentational-ready. */
export interface StopView {
  num: string
  name: string
  badge?: string
  optional: boolean
  when?: string
  teaser?: string
  description: string
  location?: string
  gps: Gps
  directions: FieldItem[]
  theShot?: string
  images: GalleryImage[]
}

/** Plain props for a `DaySection` — derived, presentational-ready. */
export interface DayView {
  label: string
  theme?: string
  route?: string
  summary?: string
  legs: { at: string; text: string }[]
  brief: FieldItem[]
  accentIndex: number
  stops: StopView[]
}

/** The full view model the guide page binds to the component tree. */
export interface GuideView {
  masthead: {
    eyebrow: string
    title: string
    dek: string
    meta: string[]
  }
  days: DayView[]
}

/**
 * Turn a validated {@link Guide} into a flat, presentational view model: derive
 * per-day labels and per-stop numbers, the accent index, normalize optional
 * flags, and derive each stop's gallery images (absolute src + role label). The
 * `slug` joins bare image filenames to their `/guides/<slug>/` path (§7). No
 * moon/jump-nav data yet (later tickets).
 */
export function deriveGuideView(guide: Guide, slug: string): GuideView {
  return {
    masthead: {
      eyebrow: guide.masthead.eyebrow,
      title: guide.masthead.title,
      dek: guide.masthead.dek,
      meta: guide.masthead.meta,
    },
    days: guide.days.map((day, di) => ({
      label: dayLabel(guide.masthead.startDate, di),
      theme: day.theme,
      route: day.route,
      summary: day.summary,
      legs: day.legs,
      brief: day.brief,
      accentIndex: di,
      stops: day.stops.map((stop, si) => ({
        num: stopNumber(di, si),
        name: stop.name,
        badge: stop.badge,
        optional: stop.optional ?? false,
        when: stop.when,
        teaser: stop.teaser,
        description: stop.description,
        location: stop.location,
        gps: stop.gps,
        directions: stop.directions,
        theShot: stop.theShot,
        images: stop.images.map((img) => galleryImage(slug, img)),
      })),
    })),
  }
}
