import { describe, expect, it } from 'vitest'
import { useGuide } from '~/composables/useGuide'
import { deriveGuideView } from '~/utils/derive'

// Full-pipeline integration proof for the two guides migrated in ticket #18
// (handoff-spec §8/§9 step 4): each loads through the real composable + Zod
// schema and derives cleanly through the view model the guide page binds. Mirrors
// the reno-vegas worked example (#17). The distinctive case here is 2026-395's
// retired `feed` key — Cerro Gordo is now its own promoted stop with its own
// gallery, so no merged galleries survive.

describe('2026-395 — migrated guide loads and validates', () => {
  const guide = useGuide('2026-395')

  it('is present and Zod-validated via the composable', () => {
    expect(guide).toBeDefined()
    expect(guide!.slug).toBe('2026-395')
  })

  it('spans three days with Cerro Gordo split out as an optional stop', () => {
    expect(guide!.days).toHaveLength(3)
    expect(guide!.days[0]!.stops.map((s) => s.id)).toEqual([
      'trona',
      'randsburg',
      'fossilfalls',
      'owens',
      'cerrogordo',
      'alabama',
    ])
    const cerro = guide!.days[0]!.stops.find((s) => s.id === 'cerrogordo')!
    expect(cerro.optional).toBe(true)
  })

  it('splits the old owens+cerrogordo merged gallery into two separate galleries', () => {
    const day1 = guide!.days[0]!.stops
    // No generic promoted-alt id survives; the fed manifest id is the stop id.
    expect(day1.map((s) => s.id)).not.toContain('owens-alt')
    const owens = day1.find((s) => s.id === 'owens')!
    const cerro = day1.find((s) => s.id === 'cerrogordo')!
    // Both stops carry their OWN images — nothing merged.
    expect(owens.images.length).toBeGreaterThan(0)
    expect(cerro.images.length).toBeGreaterThan(0)
    expect(owens.images.every((i) => i.file.startsWith('owens-'))).toBe(true)
    expect(cerro.images.every((i) => i.file.startsWith('cerrogordo-'))).toBe(true)
  })

  it('has numeric elevations everywhere (elev string→number)', () => {
    for (const stop of guide!.days.flatMap((d) => d.stops)) {
      expect(typeof stop.gps.elev).toBe('number')
    }
    expect(guide!.days[0]!.stops[0]!.gps.elev).toBe(1690) // Trona
    const cerro = guide!.days[0]!.stops.find((s) => s.id === 'cerrogordo')!
    expect(cerro.gps.elev).toBe(8200)
  })

  it('recovered every image source as wikimedia (manifest predated the field)', () => {
    const imgs = guide!.days.flatMap((d) => d.stops).flatMap((s) => s.images)
    expect(imgs.length).toBeGreaterThan(0)
    expect(imgs.every((i) => i.source === 'wikimedia')).toBe(true)
  })
})

describe('2026-395 — derives through the render pipeline', () => {
  const guide = useGuide('2026-395')!
  const view = deriveGuideView(guide, '2026-395')

  it('derives Fri/Sat/Sun day labels from the start date', () => {
    expect(view.days[0]!.label).toBe('Day 1 · Fri')
    expect(view.days[1]!.label).toBe('Day 2 · Sat')
    expect(view.days[2]!.label).toBe('Day 3 · Sun')
  })

  it('joins Cerro Gordo images to their own /guides/2026-395/ paths', () => {
    const cerro = view.days[0]!.stops.find((s) => s.anchor === 's-cerrogordo')!
    expect(cerro.images.map((i) => i.src)).toContain(
      '/guides/2026-395/cerrogordo-wide.webp',
    )
  })

  it('builds one credit row per image, each with an attribution link', () => {
    const totalImages = guide.days
      .flatMap((d) => d.stops)
      .reduce((n, s) => n + s.images.length, 0)
    expect(view.credits).toHaveLength(totalImages)
    expect(view.credits.every((c) => /^https?:\/\//.test(c.sourceUrl))).toBe(true)
  })

  it('derives the moon window + dark-sky sites for the trip dates', () => {
    expect(view.moon.windowLabel).toBe('mid August – early September')
    expect(view.moon.darkSites).toBe('Trona, Alabama Hills, the bristlecones, Mono')
    expect(view.moon.phaseLabel).toBeTruthy()
  })
})

describe('2026-vegas-sandiego — migrated guide loads and validates', () => {
  const guide = useGuide('2026-vegas-sandiego')

  it('is present and Zod-validated via the composable', () => {
    expect(guide).toBeDefined()
    expect(guide!.slug).toBe('2026-vegas-sandiego')
  })

  it('spans two days with both alts promoted to optional siblings', () => {
    expect(guide!.days).toHaveLength(2)
    expect(guide!.days[0]!.stops.map((s) => s.id)).toEqual([
      'cima',
      'cima-alt',
      'holeinthewall',
      'kelsodepot',
      'kelsodunes',
      'amboycrater',
      'roys',
    ])
    expect(guide!.days[1]!.stops.map((s) => s.id)).toEqual([
      'joshuatree',
      'joshuatree-alt',
      'theslot',
      'fontspoint',
      'montezuma',
      'julian',
      'sunrise',
    ])
    for (const id of ['cima-alt', 'joshuatree-alt']) {
      const stop = guide!.days.flatMap((d) => d.stops).find((s) => s.id === id)!
      expect(stop.optional).toBe(true)
    }
  })

  it('leaves the promoted alt stops image-free (imagery stays in the base gallery)', () => {
    for (const id of ['cima-alt', 'joshuatree-alt']) {
      const stop = guide!.days.flatMap((d) => d.stops).find((s) => s.id === id)!
      expect(stop.images).toHaveLength(0)
    }
  })

  it('has numeric elevations everywhere', () => {
    for (const stop of guide!.days.flatMap((d) => d.stops)) {
      expect(typeof stop.gps.elev).toBe('number')
    }
    expect(guide!.days[1]!.stops.find((s) => s.id === 'julian')!.gps.elev).toBe(4235)
  })
})

describe('2026-vegas-sandiego — derives through the render pipeline', () => {
  const guide = useGuide('2026-vegas-sandiego')!
  const view = deriveGuideView(guide, '2026-vegas-sandiego')

  it('derives Sat/Sun day labels from the start date', () => {
    expect(view.days[0]!.label).toBe('Day 1 · Sat')
    expect(view.days[1]!.label).toBe('Day 2 · Sun')
  })

  it('joins gallery images to their /guides/<slug>/ paths and role labels', () => {
    const kelso = view.days[0]!.stops.find((s) => s.anchor === 's-kelsodepot')!
    expect(kelso.images.map((i) => i.src)).toContain(
      '/guides/2026-vegas-sandiego/kelsodepot-wide.webp',
    )
    expect(kelso.images.find((i) => i.role === 'wide')!.roleLabel).toBe('the place')
  })

  it('builds one credit row per image, all wikimedia with attribution links', () => {
    const totalImages = guide.days
      .flatMap((d) => d.stops)
      .reduce((n, s) => n + s.images.length, 0)
    expect(view.credits).toHaveLength(totalImages)
    expect(view.credits.every((c) => /^https?:\/\//.test(c.sourceUrl))).toBe(true)
    expect(view.credits.every((c) => c.source === 'wikimedia')).toBe(true)
  })

  it('derives the mid-October moon window + dark sites', () => {
    expect(view.moon.windowLabel).toBe('mid October')
    expect(view.moon.darkSites).toBe(
      'Mojave Preserve (Kelso, Hole-in-the-Wall), Amboy on Route 66, and Anza-Borrego',
    )
  })
})
