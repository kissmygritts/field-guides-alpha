import type { FieldItem, Gps, Guide, Image } from '~/schema/guide'
import { moonPhaseLabel, moonWindowLabel } from '~/utils/moon'

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

/**
 * Stable in-page anchor for a stop, `s-<id>` (matches the old `#s-<slug>`
 * convention). The jump-nav link targets it and `StopCard` renders it as the
 * element id, so the two always resolve to each other.
 */
export function stopAnchor(id: string): string {
  return `s-${id}`
}

/** Plain props for a `StopCard` — derived, presentational-ready. */
export interface StopView {
  num: string
  /** In-page anchor id (`s-<id>`), the target of this stop's jump-nav link. */
  anchor: string
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

/** One stop entry in the jump-nav index (handoff-spec §6.3). */
export interface JumpStop {
  num: string
  name: string
  /** Matches the target stop's {@link StopView.anchor} (`s-<id>`). */
  anchor: string
}

/** One day row in the jump-nav index — its label and the stops under it. */
export interface JumpDay {
  label: string
  stops: JumpStop[]
}

/**
 * Derive the jump-nav anchor index (handoff-spec §5, §6.3): each day's derived
 * `Day N · Weekday` label with its stops' numbers, names, and anchors. Never
 * authored — computed from day/stop order so a link always resolves to its stop.
 */
export function deriveJumpNav(guide: Guide): JumpDay[] {
  return guide.days.map((day, di) => ({
    label: dayLabel(guide.masthead.startDate, di),
    stops: day.stops.map((stop, si) => ({
      num: stopNumber(di, si),
      name: stop.name,
      anchor: stopAnchor(stop.id),
    })),
  }))
}

/** One attribution row in the credits list (handoff-spec §5, §6.3). */
export interface CreditItem {
  /** The stop the image belongs to (its display name). */
  name: string
  artist: string
  source: Image['source']
  license: string
  /** Source/description page — the attribution link. */
  sourceUrl: string
}

/**
 * Derive the credits list (handoff-spec §5): the union of every stop's
 * `images[]`, one row per image in document order, carrying the stop name plus
 * each image's attribution. Derived — never authored; the yml only holds the
 * per-stop `images` arrays that `finalize` upserts.
 */
export function deriveCredits(guide: Guide): CreditItem[] {
  const rows: CreditItem[] = []
  for (const day of guide.days) {
    for (const stop of day.stops) {
      for (const img of stop.images) {
        rows.push({
          name: stop.name,
          artist: img.artist,
          source: img.source,
          license: img.license,
          sourceUrl: img.sourceUrl,
        })
      }
    }
  }
  return rows
}

/** Plain props for the dumb `MoonPanel` — derived moon data (handoff-spec §6.3). */
export interface MoonView {
  windowLabel: string
  phaseLabel: string
  start: Date
  end: Date
  darkSites: string
}

/** The full view model the guide page binds to the component tree. */
export interface GuideView {
  masthead: {
    eyebrow: string
    title: string
    dek: string
    meta: string[]
  }
  /** Day/stop anchor index rendered by `JumpNav` (derived). */
  jumpNav: JumpDay[]
  days: DayView[]
  moon: MoonView
  /** Attribution union rendered by `Credits`, one row per image (derived). */
  credits: CreditItem[]
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
    jumpNav: deriveJumpNav(guide),
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
        anchor: stopAnchor(stop.id),
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
    // Window + phase labels are computed from the trip dates at build time and
    // baked into props — the yml never authors them (§5, §6.5).
    moon: {
      windowLabel: moonWindowLabel(guide.moon.start, guide.moon.end),
      phaseLabel: moonPhaseLabel(guide.moon.start, guide.moon.end),
      start: guide.moon.start,
      end: guide.moon.end,
      darkSites: guide.darkSites,
    },
    // Attribution union — one row per image across every stop (§5).
    credits: deriveCredits(guide),
  }
}
