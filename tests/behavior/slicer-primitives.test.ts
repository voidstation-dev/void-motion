/**
 * M12 slicer-primitive tests — pure slice geometry + descriptors.
 *
 * Verifies the ported legacy slicer math exactly:
 *   - `buildGridSlices` row-major cells + label `${name} ${idx+1}`
 *     (legacy 10159-10173).
 *   - `buildRectSlices` stored rects + label `${name} — ${rect.label}`
 *     (legacy 10174-10179).
 *   - `buildFreehandSlices` bbox + polygon + label `${name} — ${path.label}`
 *     (legacy 10181-10187).
 *   - `commitRectDrag` `> 10` min-size gate + `"Slice N"` label
 *     (legacy 10006-10017).
 *   - `commitFreehandPath` `> 4` points + `> 10` bbox gate + `"Region N"`
 *     label (legacy 10018-10042).
 *   - `resolveSlicerSource` non-destructive crop-original preference
 *     (legacy 10128-10132).
 *   - `sliceSourceRect` canvas↔image mapping (legacy 10198-10201).
 *   - `resolveInheritance` `opacity ?? 1`, `speed ?? 40`, `handSpeed ?? 6`
 *     (legacy 10147-10149).
 *   - `computePreviewScale` `min(maxW/imgW, maxH/imgH, 1)` cap (legacy 9784).
 *   - `previewCoords` client→canvas-space + preview-pixel mapping
 *     (legacy 9961-9971).
 *   - `liveRectDrag` preview-pixel live rect (legacy 9986-9997).
 *   - `canApplySlices` grid `>= 2`, rect `>= 1`, freehand `>= 1`
 *     (legacy 9938-9956).
 *   - `slicerFooterText` footer info strings (legacy 9941-9955).
 */
import { describe, it, expect } from 'vitest'
import {
  buildGridSlices,
  buildRectSlices,
  buildFreehandSlices,
  commitRectDrag,
  commitFreehandPath,
  resolveSlicerSource,
  sliceSourceRect,
  resolveInheritance,
  computePreviewScale,
  previewCoords,
  liveRectDrag,
  canApplySlices,
  slicerFooterText,
  SLICER_MIN_SIZE,
  SLICER_MIN_POINTS,
  SLICER_GRID_DEFAULT,
  SLICER_GRID_MIN,
  SLICER_GRID_MAX,
  SLICE_COLORS,
  type SlicerRect,
} from '@/engine/image-processing/slicer'

const rect = (x: number, y: number, w: number, h: number, label: string): SlicerRect => ({
  x,
  y,
  w,
  h,
  label,
})

describe('M12 buildGridSlices (legacy 10159-10173)', () => {
  it('builds row-major cells (reading order) with `${name} ${idx+1}` labels', () => {
    const slices = buildGridSlices('Photo', 0, 0, 1280, 720, 2, 2)
    expect(slices).toHaveLength(4)
    expect(slices[0]).toEqual({
      bounds: { x: 0, y: 0, w: 640, h: 360 },
      clipPts: null,
      label: 'Photo 1',
    })
    expect(slices[1]).toEqual({
      bounds: { x: 640, y: 0, w: 640, h: 360 },
      clipPts: null,
      label: 'Photo 2',
    })
    expect(slices[2]).toEqual({
      bounds: { x: 0, y: 360, w: 640, h: 360 },
      clipPts: null,
      label: 'Photo 3',
    })
    expect(slices[3]).toEqual({
      bounds: { x: 640, y: 360, w: 640, h: 360 },
      clipPts: null,
      label: 'Photo 4',
    })
  })

  it('offsets cells by the layer origin', () => {
    const slices = buildGridSlices('Img', 100, 50, 200, 100, 2, 1)
    expect(slices[0]?.bounds).toEqual({ x: 100, y: 50, w: 100, h: 100 })
    expect(slices[1]?.bounds).toEqual({ x: 200, y: 50, w: 100, h: 100 })
  })

  it('defaults cols/rows to 2 when falsy (legacy parseInt || 2)', () => {
    const slices = buildGridSlices('X', 0, 0, 400, 200, 0, 0)
    expect(slices).toHaveLength(4)
  })

  it('uses a single space in the label (no dash)', () => {
    const slices = buildGridSlices('MyImage', 0, 0, 100, 100, 1, 1)
    expect(slices[0]?.label).toBe('MyImage 1')
  })
})

describe('M12 buildRectSlices (legacy 10174-10179)', () => {
  it('builds a slice per stored rect with `${name} — ${rect.label}` (em dash)', () => {
    const slices = buildRectSlices('Photo', [
      rect(0, 0, 760, 720, 'Slice 1'),
      rect(760, 0, 520, 720, 'Slice 2'),
    ])
    expect(slices).toHaveLength(2)
    expect(slices[0]).toEqual({
      bounds: { x: 0, y: 0, w: 760, h: 720 },
      clipPts: null,
      label: 'Photo — Slice 1',
    })
    expect(slices[1]?.label).toBe('Photo — Slice 2')
  })

  it('returns empty for no rects', () => {
    expect(buildRectSlices('X', [])).toEqual([])
  })
})

describe('M12 buildFreehandSlices (legacy 10181-10187)', () => {
  it('builds a slice per path with bbox + polygon clip + em-dash label', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 640, y: 0 },
      { x: 640, y: 720 },
      { x: 0, y: 720 },
      { x: 0, y: 0 },
    ]
    const slices = buildFreehandSlices('Photo', [
      { pts, bounds: { x: 0, y: 0, w: 640, h: 720 }, label: 'Region 1' },
    ])
    expect(slices).toHaveLength(1)
    expect(slices[0]?.bounds).toEqual({ x: 0, y: 0, w: 640, h: 720 })
    expect(slices[0]?.clipPts).toBe(pts)
    expect(slices[0]?.label).toBe('Photo — Region 1')
  })
})

describe('M12 commitRectDrag (legacy 10006-10017)', () => {
  it('commits a rect with min(sx,x) + abs delta + "Slice N" label', () => {
    const r = commitRectDrag(100, 100, 300, 250, 1)
    expect(r).toEqual({ x: 100, y: 100, w: 200, h: 150, label: 'Slice 1' })
  })

  it('draws up-left (min handles negative delta)', () => {
    const r = commitRectDrag(300, 250, 100, 100, 3)
    expect(r).toEqual({ x: 100, y: 100, w: 200, h: 150, label: 'Slice 3' })
  })

  it('rejects rects with w <= 10', () => {
    expect(commitRectDrag(100, 100, 105, 200, 1)).toBeNull()
  })

  it('rejects rects with h <= 10', () => {
    expect(commitRectDrag(100, 100, 200, 108, 1)).toBeNull()
  })

  it('uses the strict > 10 gate (11px passes)', () => {
    expect(commitRectDrag(100, 100, 111, 200, 1)).not.toBeNull()
  })
})

describe('M12 commitFreehandPath (legacy 10018-10042)', () => {
  it('commits a path with bbox + "Region N" label when > 4 points + bbox > 10', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 0, y: 0 },
    ]
    const p = commitFreehandPath(pts, 1)
    expect(p).toEqual({
      pts: [...pts],
      bounds: { x: 0, y: 0, w: 100, h: 100 },
      label: 'Region 1',
    })
  })

  it('rejects paths with <= 4 points', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ]
    expect(commitFreehandPath(pts, 1)).toBeNull()
  })

  it('rejects paths with a bbox <= 10', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
      { x: 0, y: 5 },
      { x: 0, y: 0 },
    ]
    expect(commitFreehandPath(pts, 1)).toBeNull()
  })

  it('uses the strict > 4 gate (5 points passes)', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
      { x: 25, y: 25 },
    ]
    expect(commitFreehandPath(pts, 1)).not.toBeNull()
  })
})

describe('M12 resolveSlicerSource (legacy 10128-10132)', () => {
  it('prefers the non-destructive crop original when present', () => {
    const src = resolveSlicerSource(
      100,
      100,
      200,
      100,
      200,
      100,
      { x: 0, y: 0, width: 400, height: 300 },
      { naturalWidth: 1200, naturalHeight: 900 },
    )
    expect(src.x).toBe(0)
    expect(src.y).toBe(0)
    expect(src.w).toBe(400)
    expect(src.h).toBe(300)
    expect(src.naturalWidth).toBe(1200)
    expect(src.naturalHeight).toBe(900)
  })

  it('falls back to the layer geometry when no crop original', () => {
    const src = resolveSlicerSource(100, 100, 200, 100, 200, 100)
    expect(src.x).toBe(100)
    expect(src.y).toBe(100)
    expect(src.w).toBe(200)
    expect(src.h).toBe(100)
    expect(src.naturalWidth).toBe(200)
    expect(src.naturalHeight).toBe(100)
  })
})

describe('M12 sliceSourceRect (legacy 10198-10201)', () => {
  it('maps canvas-space bounds to source-image pixels via scaleX/Y', () => {
    const src = { naturalWidth: 1200, naturalHeight: 900, x: 0, y: 0, w: 400, h: 300 }
    const r = sliceSourceRect({ x: 100, y: 75, w: 200, h: 150 }, src)
    // scaleX = 1200/400 = 3; rx = (100-0)*3 = 300; rw = max(1, round(200*3)) = 600.
    expect(r).toEqual({ rx: 300, ry: 225, rw: 600, rh: 450 })
  })

  it('offsets relative to the source origin', () => {
    const src = { naturalWidth: 400, naturalHeight: 400, x: 50, y: 50, w: 200, h: 200 }
    const r = sliceSourceRect({ x: 150, y: 150, w: 100, h: 100 }, src)
    // scaleX = 400/200 = 2; rx = (150-50)*2 = 200; rw = 100*2 = 200.
    expect(r).toEqual({ rx: 200, ry: 200, rw: 200, rh: 200 })
  })

  it('clamps rw/rh to a 1px minimum', () => {
    const src = { naturalWidth: 100, naturalHeight: 100, x: 0, y: 0, w: 1000, h: 1000 }
    const r = sliceSourceRect({ x: 0, y: 0, w: 1, h: 1 }, src)
    expect(r.rw).toBe(1)
    expect(r.rh).toBe(1)
  })
})

describe('M12 resolveInheritance (legacy 10147-10149)', () => {
  it('uses the layer value when present', () => {
    expect(resolveInheritance(0.5, 60, 8)).toEqual({ opacity: 0.5, speed: 60, handSpeed: 8 })
  })

  it('falls back to 1 / 40 / 6 when undefined', () => {
    expect(resolveInheritance(undefined, undefined, undefined)).toEqual({
      opacity: 1,
      speed: 40,
      handSpeed: 6,
    })
  })

  it('preserves 0 (?? not ||)', () => {
    expect(resolveInheritance(0, 0, 0)).toEqual({ opacity: 0, speed: 0, handSpeed: 0 })
  })
})

describe('M12 computePreviewScale (legacy 9784)', () => {
  it('scales to fit, capped at 1 (never upscales)', () => {
    const s = computePreviewScale(800, 600, 400, 300)
    // min(400/800, 300/600, 1) = min(0.5, 0.5, 1) = 0.5.
    expect(s.scale).toBe(0.5)
    expect(s.width).toBe(400)
    expect(s.height).toBe(300)
  })

  it('caps at 1 when the image is smaller than the wrap', () => {
    const s = computePreviewScale(100, 100, 400, 300)
    expect(s.scale).toBe(1)
    expect(s.width).toBe(100)
    expect(s.height).toBe(100)
  })
})

describe('M12 previewCoords (legacy 9961-9971)', () => {
  it('converts client coords to canvas-space + preview-pixel', () => {
    const r = previewCoords(
      200,
      150,
      { left: 0, top: 0, width: 400, height: 300 },
      { width: 400, height: 300 },
      0.5,
      100,
      50,
    )
    // px = (200-0)/400 * 400 = 200; x = 200/0.5 + 100 = 500.
    expect(r.px).toBe(200)
    expect(r.py).toBe(150)
    expect(r.x).toBe(500)
    expect(r.y).toBe(350)
  })
})

describe('M12 liveRectDrag (legacy 9986-9997)', () => {
  it('builds the live preview rect in preview-pixel space', () => {
    const r = liveRectDrag(100, 100, 200, 150, 0.5, 0, 0)
    // sxPx = (100-0)*0.5 = 50; x = min(200, 50) = 50; w = abs(200-50) = 150.
    expect(r).toEqual({ x: 50, y: 50, w: 150, h: 100 })
  })

  it('handles up-left drag (cur < start)', () => {
    const r = liveRectDrag(200, 200, 50, 50, 1, 0, 0)
    expect(r.x).toBe(50)
    expect(r.y).toBe(50)
    expect(r.w).toBe(150)
    expect(r.h).toBe(150)
  })
})

describe('M12 canApplySlices (legacy 9938-9956)', () => {
  it('grid: enabled when cols*rows >= 2', () => {
    expect(canApplySlices('grid', 2, 2, 0, 0)).toBe(true)
    expect(canApplySlices('grid', 1, 2, 0, 0)).toBe(true)
  })

  it('grid: disabled when cols*rows < 2 (1x1)', () => {
    expect(canApplySlices('grid', 1, 1, 0, 0)).toBe(false)
  })

  it('rect: enabled when >= 1 rect', () => {
    expect(canApplySlices('rect', 2, 2, 1, 0)).toBe(true)
    expect(canApplySlices('rect', 2, 2, 0, 0)).toBe(false)
  })

  it('freehand: enabled when >= 1 path', () => {
    expect(canApplySlices('freehand', 2, 2, 0, 1)).toBe(true)
    expect(canApplySlices('freehand', 2, 2, 0, 0)).toBe(false)
  })
})

describe('M12 slicerFooterText (legacy 9941-9955)', () => {
  it('grid: "Will create N layers from this image." (plural)', () => {
    expect(slicerFooterText('grid', 2, 2, 0, 0)).toBe('Will create 4 layers from this image.')
  })

  it('grid: singular when 1', () => {
    expect(slicerFooterText('grid', 1, 1, 0, 0)).toBe('Will create 1 layer from this image.')
  })

  it('rect: defined message when >= 1', () => {
    expect(slicerFooterText('rect', 2, 2, 2, 0)).toBe(
      '2 regions defined. Click Apply to create layers.',
    )
  })

  it('rect: empty prompt when 0', () => {
    expect(slicerFooterText('rect', 2, 2, 0, 0)).toBe('Draw rectangles on the preview image.')
  })

  it('freehand: defined message when >= 1', () => {
    expect(slicerFooterText('freehand', 2, 2, 0, 1)).toBe('1 freehand region defined.')
  })

  it('freehand: empty prompt when 0', () => {
    expect(slicerFooterText('freehand', 2, 2, 0, 0)).toBe('Draw on the preview to define regions.')
  })
})

describe('M12 slicer constants (legacy)', () => {
  it('SLICER_MIN_SIZE = 10 (legacy rect/freehand min gate)', () => {
    expect(SLICER_MIN_SIZE).toBe(10)
  })

  it('SLICER_MIN_POINTS = 5 (legacy > 4 gate)', () => {
    expect(SLICER_MIN_POINTS).toBe(5)
  })

  it('grid slider range 1-8, default 2', () => {
    expect(SLICER_GRID_MIN).toBe(1)
    expect(SLICER_GRID_MAX).toBe(8)
    expect(SLICER_GRID_DEFAULT).toBe(2)
  })

  it('SLICE_COLORS has 8 cycling colors', () => {
    expect(SLICE_COLORS).toHaveLength(8)
    expect(SLICE_COLORS[0]).toBe('#e74c3c')
  })
})
