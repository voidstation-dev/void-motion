/**
 * Canvas pointer hit-testing primitives (M10).
 *
 * Pure functions ported verbatim from the legacy Inkplainer runtime
 * (`legacy/index.html`), so the React canvas interaction can hit-test layers
 * and selection handles without touching the legacy DOM. These operate on the
 * typed `LayerTransform` (a plain AABB `{x,y,width,height}`), so they are
 * deterministic and unit-testable in isolation.
 *
 * Legacy behavior preserved exactly:
 *   - `toCanvasCoords` (legacy 6659): scales client coords by
 *     `state.canvasW / rect.width` (uniform scale, no DPR handling).
 *   - `hitTestHandle` (legacy 6664): 8 handles in order `nw, ne, se, sw, n, e,
 *     s, w`; corners first; hit radius `HANDLE_R * 2` (12 logical px).
 *   - `hitTestLayer` (legacy 6681): AABB hit-test from topmost (last) to
 *     bottommost (first) layer; first containing rect wins.
 *
 * Per M10 "no new animation logic": these are interaction primitives only;
 * they do not render or mutate state.
 */
import type { Layer, LayerTransform } from '@/types/layer'
import type { LayerId } from '@/types/brand'

/** Selection-handle radius in logical canvas pixels. Legacy `HANDLE_R = 6`. */
export const HANDLE_R = 12

/** The eight selection-handle positions. Legacy order: corners then edges. */
export type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w'

/** A point in logical canvas pixel space. */
export interface CanvasPoint {
  readonly x: number
  readonly y: number
}

/**
 * A layer reduced to its AABB — the shape `hitTestHandle`/`hitTestLayer`
 * consume. Accepts either a typed `LayerTransform` or a full `Layer` (we read
 * only `transform.x/y/width/height`).
 */
export interface HitRect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** Read a layer's AABB as a `HitRect`. */
export function layerHitRect(layer: Layer): HitRect {
  const t = layer.transform
  return { x: t.x, y: t.y, w: t.width, h: t.height }
}

/** Read a bare `LayerTransform` as a `HitRect`. */
export function transformHitRect(t: LayerTransform): HitRect {
  return { x: t.x, y: t.y, w: t.width, h: t.height }
}

/**
 * Convert a pointer event's client coordinates to logical canvas pixels.
 * Mirrors legacy `toCanvasCoords` (`legacy/index.html:6659`):
 * `scale = state.canvasW / rect.width; x = (clientX - rect.left) * scale`.
 *
 * The scale is uniform (derived from the canvas logical width divided by the
 * rendered CSS width), matching the legacy assumption of square pixels. A
 * zero-width rect yields scale 0 so the point collapses to the origin rather
 * than dividing by zero.
 */
export function toCanvasCoords(
  clientX: number,
  clientY: number,
  rect: { readonly width: number; readonly left: number; readonly top: number },
  canvasWidth: number,
): CanvasPoint {
  const scale = rect.width > 0 ? canvasWidth / rect.width : 0
  return { x: (clientX - rect.left) * scale, y: (clientY - rect.top) * scale }
}

/**
 * Hit-test the 8 selection handles of a layer's rect. Returns the handle type
 * (`'nw' | 'ne' | … | 'w'`) whose circle contains the point, or `null`.
 *
 * Mirrors legacy `hitTestHandle` (`legacy/index.html:6664`):
 *   - Handles are tested in order `nw, ne, se, sw, n, e, s, w` (corners first),
 *     so a corner wins on overlap.
 *   - Hit radius is `HANDLE_R * 2` (12 logical px), in canvas/logical
 *     coordinates (not screen px).
 */
export function hitTestHandle(px: number, py: number, rect: HitRect): ResizeHandle | null {
  const { x, y, w, h } = rect
  const hr = HANDLE_R * 2
  
  if (Math.hypot(px - x, py - y) <= hr) return 'nw'
  if (Math.hypot(px - (x + w), py - y) <= hr) return 'ne'
  if (Math.hypot(px - (x + w), py - (y + h)) <= hr) return 'se'
  if (Math.hypot(px - x, py - (y + h)) <= hr) return 'sw'
  
  if (py >= y - hr && py <= y + hr && px >= x && px <= x + w) return 'n'
  if (py >= y + h - hr && py <= y + h + hr && px >= x && px <= x + w) return 's'
  if (px >= x - hr && px <= x + hr && py >= y && py <= y + h) return 'w'
  if (px >= x + w - hr && px <= x + w + hr && py >= y && py <= y + h) return 'e'

  return null
}

/**
 * Test whether a point is inside a rect's AABB (inclusive bounds).
 * Mirrors the legacy `px >= l.x && px <= l.x+l.w && py >= l.y && py <= l.y+l.h`.
 */
export function pointInRect(px: number, py: number, rect: HitRect): boolean {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h
}

/**
 * Hit-test the layer stack from topmost (last) to bottommost (first) and
 * return the id of the first layer whose AABB contains the point, or `null`.
 *
 * Mirrors legacy `hitTestLayer` (`legacy/index.html:6681`): the render order
 * is bottom-to-top, so the topmost layer is the last array element and is
 * tested first. No rotation, no alpha-mask hit-test — pure bounding box.
 */
export function hitTestLayer(px: number, py: number, layers: readonly Layer[]): LayerId | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i]
    if (layer && pointInRect(px, py, layerHitRect(layer))) {
      return layer.id
    }
  }
  return null
}
