// Moon-phase report for a trip window — computed, never guessed. Astro planning
// with no signal needs the moon baked in: a bright moon kills the Milky Way, a
// new moon is prime. Deterministic (no external data), so it reproduces exactly.
//
// This is a faithful TS port of the old plain-JS toolchain util
// (`build/lib/moon.mjs`) — same numbers, same output (handoff-spec §6.5). It runs
// at prerender and its result is baked into `MoonPanel` props: zero client JS.
// `moonReport` is the reusable pure function the future drafting app calls;
// `moonWindowLabel` / `moonPhaseLabel` derive the two labels the panel shows (§5).

const SYNODIC = 29.53058867 // days
const REF_NEW_JD = 2451550.09766 // known new moon 2000-01-06 18:14 UTC

function jd(date: Date): number {
  // date: JS Date (UTC midnight)
  let y = date.getUTCFullYear()
  let m = date.getUTCMonth() + 1
  const D = date.getUTCDate()
  if (m <= 2) {
    y -= 1
    m += 12
  }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    D +
    B -
    1524.5 +
    0.5
  )
}

// Julian Day -> UTC Date (Fliegel–Van Flandern via Meeus). Used to place the
// real nearest new/full moon on the calendar, not just the window's extremes.
function jdToDate(jdv: number): Date {
  const J = jdv + 0.5
  const Z = Math.floor(J)
  const F = J - Z
  let A = Z
  if (Z >= 2299161) {
    const a = Math.floor((Z - 1867216.25) / 36524.25)
    A = Z + 1 + a - Math.floor(a / 4)
  }
  const B = A + 1524
  const C = Math.floor((B - 122.1) / 365.25)
  const D = Math.floor(365.25 * C)
  const E = Math.floor((B - D) / 30.6001)
  const day = Math.floor(B - D - Math.floor(30.6001 * E) + F)
  const month = E < 14 ? E - 1 : E - 13
  const year = month > 2 ? C - 4716 : C - 4715
  return new Date(Date.UTC(year, month - 1, day))
}

function illum(date: Date): { age: number; illum: number } {
  const age = (((jd(date) - REF_NEW_JD) % SYNODIC) + SYNODIC) % SYNODIC
  return { age, illum: (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2 }
}

// Real lunar event (new: phase 0; full: phase SYNODIC/2) nearest a reference JD.
function nearestPhase(refJD: number, phaseOffset: number): Date {
  const base = REF_NEW_JD + phaseOffset
  const k = Math.round((refJD - base) / SYNODIC)
  return jdToDate(base + k * SYNODIC)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmt = (d: Date): string => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`

// "Aug 26–29" or "Aug 30 – Sep 3"
function range(a: Date | undefined, b: Date): string | null {
  if (!a) return null
  if (a.getTime() === b.getTime()) return fmt(a)
  if (a.getUTCMonth() === b.getUTCMonth()) return `${fmt(a)}–${b.getUTCDate()}`
  return `${fmt(a)} – ${fmt(b)}`
}

interface DayIllum {
  date: Date
  age: number
  illum: number
}

export interface MoonCard {
  dark?: boolean
  range: string | null
  text: string
}

export interface MoonReport {
  newMoon: string
  fullMoon: string
  cards: MoonCard[]
  days: DayIllum[]
}

// startISO/endISO: 'YYYY-MM-DD'. Returns computed facts + templated cards.
export function moonReport(startISO: string, endISO: string): MoonReport {
  const days: DayIllum[] = []
  for (
    let t = new Date(startISO + 'T00:00:00Z');
    t <= new Date(endISO + 'T00:00:00Z');
    t = new Date(t.getTime() + 86400000)
  ) {
    days.push({ date: new Date(t), ...illum(new Date(t)) })
  }
  // Coalesce contiguous days matching a predicate into [start,end] ranges.
  const spans = (pred: (d: DayIllum) => boolean): [Date, Date][] => {
    const out: [Date, Date][] = []
    let s: Date | null = null
    let p: Date | null = null
    for (const d of days) {
      if (pred(d)) {
        if (!s) s = d.date
        p = d.date
      } else if (s) {
        out.push([s, p as Date])
        s = null
      }
    }
    if (s) out.push([s, p as Date])
    return out
  }
  const waning = (d: DayIllum): boolean => d.age > SYNODIC / 2
  const bright = spans((d) => d.illum >= 0.75)
  const dark = spans((d) => d.illum <= 0.3)
  const mid = spans((d) => d.illum > 0.3 && d.illum < 0.75)

  // Phase state (waxing vs waning) of a span, judged by its first day.
  const isWaning = ([s]: [Date, Date]): boolean =>
    waning(days.find((d) => d.date.getTime() === s.getTime()) as DayIllum)

  const cards: MoonCard[] = []
  if (bright[0]) {
    cards.push({
      range: range(...bright[0]),
      text: 'full moon. Bright nights — shoot moonlit foregrounds, skip the core.',
    })
  }
  if (mid[0]) {
    cards.push({
      range: range(...mid[0]),
      text: isWaning(mid[0])
        ? 'waning gibbous. Moon rises late; early evening goes dark.'
        : 'waxing crescent → first quarter. Moon sets before midnight; late nights go dark.',
    })
  }
  if (dark[0]) {
    cards.push({
      dark: true,
      range: range(...dark[0]),
      text: isWaning(dark[0])
        ? 'last-quarter → new. Dark skies, prime Milky Way.'
        : 'new → thin crescent. Moon sets just after sunset — dark all night.',
    })
  }

  // Real nearest new / full moon to the middle of the window.
  const midJD = (jd(days[0]!.date) + jd(days[days.length - 1]!.date)) / 2

  return {
    newMoon: fmt(nearestPhase(midJD, 0)),
    fullMoon: fmt(nearestPhase(midJD, SYNODIC / 2)),
    cards,
    days, // raw, for callers that want the table
  }
}

// ── Derived labels for MoonPanel (handoff-spec §5) ────────────────────────────
// The panel is dumb; these two derivations produce the human window + phase it
// shows, from `moon.start`/`moon.end` alone. Deterministic, build-time only.

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type Tier = 'early' | 'mid' | 'late'
// Day-of-month → coarse human tier (thirds of the month).
function tier(dayOfMonth: number): Tier {
  if (dayOfMonth <= 10) return 'early'
  if (dayOfMonth <= 20) return 'mid'
  return 'late'
}

/**
 * Human window label from the trip's date span, e.g. `late September`,
 * `early–mid October`, or `mid August – early September`. Replaces the old
 * hand-authored `moon.windowLabel` — derived, never authored (§5).
 */
export function moonWindowLabel(start: Date, end: Date): string {
  const sT = tier(start.getUTCDate())
  const eT = tier(end.getUTCDate())
  const sM = MONTHS_FULL[start.getUTCMonth()]
  const eM = MONTHS_FULL[end.getUTCMonth()]
  if (sM === eM) {
    return sT === eT ? `${sT} ${sM}` : `${sT}–${eT} ${sM}`
  }
  return `${sT} ${sM} – ${eT} ${eM}`
}

const PHASE_NAMES = [
  'New moon',
  'Waxing crescent',
  'First quarter',
  'Waxing gibbous',
  'Full moon',
  'Waning gibbous',
  'Last quarter',
  'Waning crescent',
]

/**
 * Canonical 8-phase name of the moon at the middle of the trip window. Uses the
 * same `age`/`SYNODIC` primitives as {@link moonReport}; bins the lunation into
 * eight equal arcs centered on each named phase.
 */
export function moonPhaseLabel(start: Date, end: Date): string {
  const mid = new Date((start.getTime() + end.getTime()) / 2)
  const { age } = illum(mid)
  const f = age / SYNODIC // 0..1 through the lunation
  const bin = Math.floor(((f + 1 / 16) % 1) * 8) // shift so New is centered on 0
  return PHASE_NAMES[bin]!
}
