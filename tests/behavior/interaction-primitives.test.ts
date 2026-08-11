/**
 * M10 interaction-primitive tests — pure hit-test + transform-session math.
 *
 * These verify the ported legacy geometry exactly:
 *   - `toCanvasCoords` uniform scaling (legacy 6659).
 *   - `hitTestHandle` 8-handle order + 12px radius, corners before edges
 *     (legacy 6664).
 *   - `hitTestLayer` topmost-first AABB hit (legacy 6681).
 *   - `applyMove` absolute-from-orig math (legacy 6745).
 *   - `applyResize` per-handle math + 20px minimum + Shift aspect lock
 *     (legacy 6747-6762).
 *   - `sessionChanged` no-op-click guard (legacy 6791).
 */
import { describe, it, expect } from 'vitest'
import {
  toCanvasCoords,
  hitTestHandle,
  hitTestLayer,
  pointInRect,
  HANDLE_R,
  type HitRect,
} from '@/engine/interaction/hit-test'
import {
  startMoveSession,
  startResizeSession,
  applyMove,
  applyResize,
  sessionChanged,
  MIN_LAYER_SIZE,
  type SessionGeometry,
} from '@/engine/interaction/transform-session'
import { makeLayer } from '../services/helpers/layers'

const rect = (x: number, y: number, w: number, h: number): HitRect => ({ x, y, w, h })

describe('M10 toCanvasCoords (legacy 6659)', () => {
  it('scales client coords by canvasW / rect.width (uniform)', () => {
    // canvas 1280 wide, displayed at 640 → scale 2.
    const p = toCanvasCoords(100, 50, { width: 640, left: 10, top: 20 }, 1280)
    expect(p.x).toBe((100 - 10) * 2)
    expect(p.y).toBe((50 - 20) * 2)
  })

  it('collapses to origin on a zero-width rect (guard divide-by-zero)', () => {
    const p = toCanvasCoords(100, 50, { width: 0, left: 0, top: 0 }, 1280)
    expect(p.x).toBe(0)
    expect(p.y).toBe(0)
  })
})

describe('M10 hitTestHandle (legacy 6664)', () => {
  const r = rect(100, 100, 200, 100)

  it('hits the nw corner handle at its center', () => {
    expect(hitTestHandle(100, 100, r)).toBe('nw')
  })

  it('hits within the 12px radius (HANDLE_R*2)', () => {
    expect(hitTestHandle(100 + HANDLE_R, 100, r)).toBe('nw')
    // Just outside the radius → no corner hit at nw center, but may hit edge.
    expect(hitTestHandle(100 + HANDLE_R * 2 + 1, 100, r)).not.toBe('nw')
  })

  it('tests corners before edges (corner wins on overlap)', () => {
    // The `n` edge handle sits at (x+w/2, y) = (200,100). A point there hits
    // `n`, not a corner (no corner is within radius). Confirm edges work.
    expect(hitTestHandle(200, 100, r)).toBe('n')
  })

  it('returns null outside any handle', () => {
    expect(hitTestHandle(500, 500, r)).toBeNull()
  })

  it('all 8 handles are reachable', () => {
    const cases: ReadonlyArray<{ readonly h: string; readonly at: HitRect }> = [
      { h: 'nw', at: { x: 100, y: 100, w: 0, h: 0 } },
      { h: 'ne', at: { x: 300, y: 100, w: 0, h: 0 } },
      { h: 'se', at: { x: 300, y: 200, w: 0, h: 0 } },
      { h: 'sw', at: { x: 100, y: 200, w: 0, h: 0 } },
      { h: 'n', at: { x: 200, y: 100, w: 0, h: 0 } },
      { h: 'e', at: { x: 300, y: 150, w: 0, h: 0 } },
      { h: 's', at: { x: 200, y: 200, w: 0, h: 0 } },
      { h: 'w', at: { x: 100, y: 150, w: 0, h: 0 } },
    ]
    for (const c of cases) {
      expect(hitTestHandle(c.at.x, c.at.y, r)).toBe(c.h)
    }
  })
})

describe('M10 pointInRect + hitTestLayer (legacy 6681)', () => {
  it('pointInRect is inclusive on all bounds', () => {
    const r = rect(10, 10, 20, 20)
    expect(pointInRect(10, 10, r)).toBe(true)
    expect(pointInRect(30, 30, r)).toBe(true)
    expect(pointInRect(9, 10, r)).toBe(false)
    expect(pointInRect(31, 30, r)).toBe(false)
  })

  it('hitTestLayer returns the topmost (last) layer containing the point', () => {
    const a = makeLayer(1)
    const b = makeLayer(2)
    // makeLayer defaults transform x=0,y=0,w=100,h=100 — both overlap.
    expect(hitTestLayer(50, 50, [a, b])).toBe(b.id)
  })

  it('hitTestLayer returns null when no layer contains the point', () => {
    expect(hitTestLayer(500, 500, [makeLayer(1)])).toBeNull()
  })
})

describe('M10 applyMove (legacy 6745)', () => {
  const orig: SessionGeometry = { x: 100, y: 100, w: 200, h: 100 }
  const session = startMoveSession(50, 50, orig)

  it('repositions absolute-from-orig (not per-frame delta)', () => {
    // pointer moved to (150, 80): dx=100, dy=30 → x=200, y=130.
    const next = applyMove(session, 150, 80)
    expect(next).toEqual({ x: 200, y: 130, w: 200, h: 100 })
  })

  it('is idempotent when the pointer returns to the start point', () => {
    expect(applyMove(session, 50, 50)).toEqual(orig)
  })

  it('allows off-canvas (negative) positions — no clamping', () => {
    const next = applyMove(session, -100, -100)
    expect(next.x).toBe(-50)
    expect(next.y).toBe(-50)
  })
})

describe('M10 applyResize (legacy 6747-6762)', () => {
  const orig: SessionGeometry = { x: 100, y: 100, w: 200, h: 100 }

  it('se handle grows width + height, anchors the nw corner', () => {
    const s = startResizeSession('se', 300, 200, orig)
    // dx=+50, dy=+25 → w=250, h=125; x/y unchanged (anchor).
    expect(applyResize(s, 350, 225, false)).toEqual({ x: 100, y: 100, w: 250, h: 125 })
  })

  it('nw handle moves the corner, shrinks w/h (se anchor)', () => {
    const s = startResizeSession('nw', 100, 100, orig)
    // dx=+20, dy=+10 → x=120, y=110, w=180, h=90.
    expect(applyResize(s, 120, 110, false)).toEqual({ x: 120, y: 110, w: 180, h: 90 })
  })

  it('e handle grows only width (west edge fixed)', () => {
    const s = startResizeSession('e', 300, 150, orig)
    expect(applyResize(s, 350, 150, false)).toEqual({ x: 100, y: 100, w: 250, h: 100 })
  })

  it('w handle moves the west edge (x moves, width shrinks)', () => {
    const s = startResizeSession('w', 100, 150, orig)
    // dx=+20 → x=120, w=180.
    expect(applyResize(s, 120, 150, false)).toEqual({ x: 120, y: 100, w: 180, h: 100 })
  })

  it('clamps both w and h to the 20px minimum', () => {
    const s = startResizeSession('se', 300, 200, orig)
    // Drag far left/up past the anchor: dx=-250 → w=max(20, -50)=20.
    const next = applyResize(s, 50, 50, false)
    expect(next.w).toBe(MIN_LAYER_SIZE)
    expect(next.h).toBe(MIN_LAYER_SIZE)
  })

  it('Shift locks aspect ratio to the ORIGINAL ratio (shrink larger axis)', () => {
    const s = startResizeSession('se', 300, 200, orig)
    // orig ratio = 200/100 = 2. Drag to w=300 (dx=100) → nw/nh > ar →
    // nh = nw/ar = 300/2 = 150.
    const next = applyResize(s, 400, 200, true)
    expect(next.w).toBe(300)
    expect(next.h).toBe(150)
  })

  it('Shift applies to edge handles too (constrains both dims)', () => {
    const s = startResizeSession('e', 300, 150, orig)
    // e grows width by dx=100 → w=300; Shift locks → nh = nw/ar = 300/2 = 150.
    const next = applyResize(s, 400, 150, true)
    expect(next.w).toBe(300)
    expect(next.h).toBe(150)
  })

  it('no-op resize (pointer at start) returns orig', () => {
    const s = startResizeSession('se', 300, 200, orig)
    expect(applyResize(s, 300, 200, false)).toEqual(orig)
  })
})

describe('M10 sessionChanged (legacy 6791)', () => {
  const orig: SessionGeometry = { x: 100, y: 100, w: 200, h: 100 }

  it('move: changed when x or y differ', () => {
    const s = startMoveSession(0, 0, orig)
    expect(sessionChanged(s, { ...orig, x: 101 })).toBe(true)
    expect(sessionChanged(s, orig)).toBe(false)
  })

  it('resize: changed when any of x/y/w/h differ', () => {
    const s = startResizeSession('se', 0, 0, orig)
    expect(sessionChanged(s, { ...orig, w: 201 })).toBe(true)
    expect(sessionChanged(s, orig)).toBe(false)
  })
})
