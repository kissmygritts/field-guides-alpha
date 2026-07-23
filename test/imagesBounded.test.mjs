import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { SOURCE_MAXDIM, toBoundedWebp } from '../build/lib/images.mjs'

// The finalize source pre-pass (handoff-spec §7): tame the source to ~1600px webp
// so IPX has real pixels without committing multi-MB originals. Distinct from the
// old 640px final-byte toWebp pass.

// Build a synthetic PNG of a given size — no network needed.
async function png(w, h) {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r: 90, g: 120, b: 60 } },
  })
    .png()
    .toBuffer()
}

describe('toBoundedWebp', () => {
  it('bounds an oversized source to the max dimension and emits webp', async () => {
    const out = await toBoundedWebp(await png(4000, 3000))
    expect(out.w).toBe(SOURCE_MAXDIM)
    expect(out.h).toBe(Math.round((SOURCE_MAXDIM * 3000) / 4000))
    // magic bytes: RIFF....WEBP
    expect(out.data.subarray(0, 4).toString('latin1')).toBe('RIFF')
    expect(out.data.subarray(8, 12).toString('latin1')).toBe('WEBP')
  })

  it('does not enlarge a source already under the bound', async () => {
    const out = await toBoundedWebp(await png(800, 600))
    expect(out.w).toBe(800)
    expect(out.h).toBe(600)
  })

  it('reports a positive kb size', async () => {
    const out = await toBoundedWebp(await png(2000, 2000))
    expect(out.kb).toBeGreaterThan(0)
  })
})
