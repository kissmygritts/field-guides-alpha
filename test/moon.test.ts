import { describe, expect, it } from 'vitest'
import { moonReport as portedReport } from '~/utils/moon'
import { moonPhaseLabel, moonWindowLabel } from '~/utils/moon'
// The original plain-JS toolchain implementation — the port must not change its
// behavior (acceptance criterion: "no behavior change").
import { moonReport as legacyReport } from '../build/lib/moon.mjs'

const WINDOWS: [string, string][] = [
  ['2026-09-24', '2026-09-28'], // reno-vegas
  ['2026-08-18', '2026-09-08'], // 395 — spans two months
  ['2026-10-16', '2026-10-18'], // vegas-sandiego
  ['2026-09-17', '2026-09-18'], // factory window
]

const PHASE_LABELS = [
  'New moon',
  'Waxing crescent',
  'First quarter',
  'Waxing gibbous',
  'Full moon',
  'Waning gibbous',
  'Last quarter',
  'Waning crescent',
]

describe('moonReport (ported, no behavior change)', () => {
  for (const [start, end] of WINDOWS) {
    it(`matches the legacy build/lib/moon.mjs output for ${start}..${end}`, () => {
      expect(portedReport(start, end)).toStrictEqual(legacyReport(start, end))
    })
  }
})

describe('moonWindowLabel', () => {
  const d = (iso: string) => new Date(iso + 'T00:00:00Z')

  it('labels a same-month, same-tier window with one phrase', () => {
    expect(moonWindowLabel(d('2026-09-24'), d('2026-09-28'))).toBe('late September')
    expect(moonWindowLabel(d('2026-09-17'), d('2026-09-18'))).toBe('mid September')
    expect(moonWindowLabel(d('2026-10-16'), d('2026-10-18'))).toBe('mid October')
  })

  it('labels a same-month window that crosses tiers with a tier range', () => {
    expect(moonWindowLabel(d('2026-10-08'), d('2026-10-18'))).toBe('early–mid October')
  })

  it('labels a window spanning two months with both ends', () => {
    expect(moonWindowLabel(d('2026-08-18'), d('2026-09-08'))).toBe(
      'mid August – early September',
    )
  })
})

describe('moonPhaseLabel', () => {
  const d = (iso: string) => new Date(iso + 'T00:00:00Z')

  it('names the phase at the window midpoint', () => {
    const label = moonPhaseLabel(d('2026-09-24'), d('2026-09-28'))
    expect(PHASE_LABELS).toContain(label)
  })

  it('names a real new moon "New moon"', () => {
    // 2000-01-06 was the reference new moon.
    expect(moonPhaseLabel(d('2000-01-06'), d('2000-01-06'))).toBe('New moon')
  })

  it('names a real full moon "Full moon"', () => {
    // ~14.77 days after the reference new moon.
    expect(moonPhaseLabel(d('2000-01-21'), d('2000-01-21'))).toBe('Full moon')
  })
})
