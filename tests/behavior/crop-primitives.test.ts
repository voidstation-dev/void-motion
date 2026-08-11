/**
 * M11 crop-primitive tests — pure crop geometry + mapping.
 *
 * Verifies the ported legacy crop math exactly:
 *   - `getCropHandle` 8-handle order + 14px radius (strict `<`) + `move`
 *     inside (legacy 9618-9637).
 *   - `applyCropDrag` move/resize/draw-new-rect + 20px min + canvas-edge
 *     clamp + Shift aspect lock to the CURRENT layer ratio (legacy 9675-9713).
 *   - `initialCropRect`/`resetCropRect` clamp to canvas (legacy 9458-9461,
 *     9491-9502).
 *   - `cropRectToImageSpace` canvas↔image mapping (legacy 9519-9526).
 *   - `computeCropSource` first-crop-only stash (legacy 9510-9516).
 */
import { describe, it, expect } from 'vitest'
import {
  getCropHandle,
  applyCropDrag,
  initialCropRect,
  resetCropRect,
  cropRectToImageSpace,
  computeCropSource,
  CROP_HANDLE_HIT,
  CROP_MIN_SIZE,
  type CropRect,
} from '@/engine/image-processing/crop'

const rect = (x: number, y: number, w: number, h: number): CropRect => ({ x, y, w, h })
const BOUNDS = { width: 1280, height: 720 }

describe('M11 getCropHandle (legacy 9618-9637)', () => {
  const r = rect(100, 100, 200, 100)

  it('hits the nw corner handle at its center', () => {
    expect(getCropHandle(100, 100, r)).toBe('nw')
  })

  it('hits within the 14px radius (strict less-than)', () => {
    expect(getCropHandle(100 + CROP_HANDLE_HIT - 1, 100, r)).toBe('nw')
    // At exactly the radius → no hit (legacy uses `<`, not `<=`).
    expect(getCropHandle(100 + CROP_HANDLE_HIT, 100, r)).not.toBe('nw')
  })

  it('returns move when inside the rect (exclusive bounds)', () => {
    expect(getCropHandle(200, 150, r)).toBe('move')
  })

  it('returns null outside the rect', () => {
    expect(getCropHandle(500, 500, r)).toBeNull()
  })

  it('tests corners before edges (corner wins on overlap)', () => {
    // The `n` edge sits at (200,100); a point there hits `n` (no corner within radius).
    expect(getCropHandle(200, 100, r)).toBe('n')
  })
})

describe('M11 applyCropDrag — move (legacy 9682-9685)', () => {
  const orig = rect(100, 100, 200, 100)

  it('move translates the rect, clamped inside the canvas', () => {
    const next = applyCropDrag('move', orig, 150, 150, 200, 180, BOUNDS, false, undefined)
    expect(next).toEqual({ x: 150, y: 130, w: 200, h: 100 })
  })

  it('move clamps to the canvas top-left (no negative origin)', () => {
    const next = applyCropDrag('move', orig, 150, 150, -100, -100, BOUNDS, false, undefined)
    expect(next.x).toBe(0)
    expect(next.y).toBe(0)
  })

  it('move clamps to the canvas bottom-right', () => {
    const next = applyCropDrag('move', orig, 150, 150, 2000, 2000, BOUNDS, false, undefined)
    expect(next.x).toBe(BOUNDS.width - orig.w)
    expect(next.y).toBe(BOUNDS.height - orig.h)
  })
})

describe('M11 applyCropDrag — resize (legacy 9685-9696)', () => {
  const orig = rect(100, 100, 200, 100)

  it('e handle grows width, clamped to the canvas right edge', () => {
    const next = applyCropDrag('e', orig, 300, 150, 350, 150, BOUNDS, false, undefined)
    expect(next).toEqual({ x: 100, y: 100, w: 250, h: 100 })
  })

  it('w handle moves the west edge (x moves, width shrinks)', () => {
    const next = applyCropDrag('w', orig, 100, 150, 120, 150, BOUNDS, false, undefined)
    expect(next.x).toBe(120)
    expect(next.w).toBe(180)
  })

  it('clamps both w and h to the 20px minimum', () => {
    const next = applyCropDrag('se', orig, 300, 200, 50, 50, BOUNDS, false, undefined)
    expect(next.w).toBe(CROP_MIN_SIZE)
    expect(next.h).toBe(CROP_MIN_SIZE)
  })

  it('e handle clamps width to the canvas right edge', () => {
    const next = applyCropDrag('e', orig, 300, 150, 2000, 150, BOUNDS, false, undefined)
    expect(next.w).toBe(BOUNDS.width - orig.x)
  })
})

describe('M11 applyCropDrag — empty-area draw (legacy 9697-9702)', () => {
  it('null handle draws a new rect from scratch (min + abs delta)', () => {
    const next = applyCropDrag(null, rect(0, 0, 0, 0), 100, 100, 300, 250, BOUNDS, false, undefined)
    expect(next).toEqual({ x: 100, y: 100, w: 200, h: 150 })
  })

  it('draws up-left when the pointer moves above-left of start', () => {
    const next = applyCropDrag(null, rect(0, 0, 0, 0), 300, 250, 100, 100, BOUNDS, false, undefined)
    expect(next.x).toBe(100)
    expect(next.y).toBe(100)
    expect(next.w).toBe(200)
    expect(next.h).toBe(150)
  })
})

describe('M11 applyCropDrag — Shift aspect lock (legacy 9706-9710)', () => {
  const orig = rect(100, 100, 200, 100)

  it('Shift locks to the CURRENT layer ratio (shrink larger axis)', () => {
    // layer ratio = 2. e handle grows w to 300 (dx=100) → w/h = 300/100 = 3 > ar
    // → w = h*ar = 100*2 = 200 (shrink the larger axis).
    const next = applyCropDrag('e', orig, 300, 150, 400, 150, BOUNDS, true, 2)
    expect(next.w).toBe(200)
    expect(next.h).toBe(100)
  })

  it('Shift does NOT apply to the move handle', () => {
    const next = applyCropDrag('move', orig, 150, 150, 200, 180, BOUNDS, true, 2)
    expect(next.w).toBe(200)
    expect(next.h).toBe(100)
  })
})

describe('M11 initialCropRect + resetCropRect (legacy 9458-9461, 9491-9502)', () => {
  it('initializes to the layer bounds, clamped to the canvas', () => {
    const r = initialCropRect(-10, -10, 2000, 2000, BOUNDS)
    expect(r.x).toBe(0)
    expect(r.y).toBe(0)
    expect(r.w).toBe(BOUNDS.width)
    expect(r.h).toBe(BOUNDS.height)
  })

  it('reset matches initial (same clamp logic)', () => {
    const r = resetCropRect(100, 100, 200, 100, BOUNDS)
    expect(r).toEqual({ x: 100, y: 100, w: 200, h: 100 })
  })
})

describe('M11 cropRectToImageSpace (legacy 9519-9526)', () => {
  it('maps canvas-space to image-space via the original source scale', () => {
    // origImg natural 1200×900, orig layer geom (0,0,400,300) → scale 3,3.
    const img = cropRectToImageSpace(
      rect(100, 75, 200, 150),
      { x: 0, y: 0, width: 400, height: 300 },
      { naturalWidth: 1200, naturalHeight: 900 },
    )
    expect(img).toEqual({ x: 300, y: 225, width: 600, height: 450 })
  })

  it('offsets relative to the original layer origin', () => {
    const img = cropRectToImageSpace(
      rect(150, 150, 100, 100),
      { x: 50, y: 50, width: 200, height: 200 },
      { naturalWidth: 400, naturalHeight: 400 },
    )
    // scale = 400/200 = 2; rx = (150-50)*2 = 200; rw = 100*2 = 200.
    expect(img).toEqual({ x: 200, y: 200, width: 200, height: 200 })
  })
})

describe('M11 computeCropSource (legacy 9510-9516)', () => {
  it('stashes the current layer geometry on first crop', () => {
    const src = computeCropSource(undefined, 10, 20, 200, 100)
    expect(src).toEqual({ x: 10, y: 20, width: 200, height: 100 })
  })

  it('preserves the existing stash on subsequent crops (non-destructive)', () => {
    const existing = { x: 0, y: 0, width: 400, height: 300 }
    const src = computeCropSource(existing, 10, 20, 200, 100)
    expect(src).toBe(existing)
  })
})
