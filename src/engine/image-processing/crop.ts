/**
 * Crop tool primitives (M11).
 *
 * Pure functions ported verbatim from the legacy crop tool
 * (`legacy/index.html:9436-9718`), so the React crop feature can compute crop
 * geometry + the canvas↔image-space mapping without touching the legacy DOM.
 * These do NOT mutate state and do NOT rasterize (the legacy `confirmCrop`
 * rasterizes via an offscreen canvas; the typed path stashes the crop source
 * geometry and delegates the rasterize to the legacy runtime when present).
 *
 * Legacy behavior preserved exactly:
 *   - `_getCropHandle` (9618): 8 handles (nw, ne, se, sw, n, e, s, w) in the
 *     same order as the selection handles, hit radius `_CROP_HANDLE_HIT = 14`
 *     (strictly less-than, unlike the selection `<=`). A point inside the
 *     rect (exclusive) returns `'move'`; else `null`.
 *   - drag math (9675-9713): `move` clamps inside the canvas; edge/corner
 *     resize clamps to a 20px minimum AND to the canvas edges; an empty-area
 *     drag draws a new rect from scratch (min of start/current, abs delta).
 *   - Shift aspect constraint (9706-9710): locks to the CURRENT layer's
 *     `w/h` ratio (NOT the original image), applied to edge + corner handles
 *     (not `move`), using the "shrink the larger axis" rule.
 *   - `confirmCrop` mapping (9519-9526): canvas-space rect → image-space via
 *     `scaleX = _origImg.naturalWidth / _origW`, offset relative to the
 *     original layer origin.
 *
 * Per M11 "non-destructive crop semantics": the original source is retained
 * (`_origImg/_origX/_origY/_origW/_origH`); re-crop always reads from the
 * stashed original, never the cropped raster.
 */

/** The crop-handle hit radius. Legacy `_CROP_HANDLE_HIT = 14`. */
export const CROP_HANDLE_HIT = 14

/** The minimum crop width/height. Legacy `MIN = 20`. */
export const CROP_MIN_SIZE = 20

/** A crop handle id, or `'move'` (inside the rect), or `null` (outside). */
export type CropHandle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w' | 'move'

/** A crop rectangle in canvas-space pixels. */
export interface CropRect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** The canvas bounds used to clamp the crop rect. */
export interface CanvasBounds {
  readonly width: number
  readonly height: number
}

/**
 * Hit-test the 8 crop handles of a crop rect. Returns the handle id whose
 * circle (radius `CROP_HANDLE_HIT`, strictly less-than) contains the point,
 * `'move'` if the point is inside the rect (exclusive bounds), or `null`.
 *
 * Mirrors legacy `_getCropHandle` (`legacy/index.html:9618-9637`). Handle
 * order matches the selection handles (corners then edges) so a corner wins
 * on overlap. Note the legacy uses `<` (not `<=`) for the handle radius.
 */
export function getCropHandle(px: number, py: number, rect: CropRect): CropHandle | null {
  const { x, y, w, h } = rect
  const handles: ReadonlyArray<{
    readonly id: CropHandle
    readonly cx: number
    readonly cy: number
  }> = [
    { id: 'nw', cx: x, cy: y },
    { id: 'ne', cx: x + w, cy: y },
    { id: 'se', cx: x + w, cy: y + h },
    { id: 'sw', cx: x, cy: y + h },
    { id: 'n', cx: x + w / 2, cy: y },
    { id: 'e', cx: x + w, cy: y + h / 2 },
    { id: 's', cx: x + w / 2, cy: y + h },
    { id: 'w', cx: x, cy: y + h / 2 },
  ]
  for (const handle of handles) {
    if (Math.hypot(px - handle.cx, py - handle.cy) < CROP_HANDLE_HIT) {
      return handle.id
    }
  }
  // Inside rect (exclusive) = move. Legacy uses strict `<` on both axes.
  if (px > x && px < x + w && py > y && py < y + h) return 'move'
  return null
}

/**
 * Apply a crop drag. Mirrors the legacy mousemove drag body
 * (`legacy/index.html:9675-9713`):
 *   - `move`: translate the rect, clamped inside the canvas bounds.
 *   - edge/corner (`nw|ne|se|sw|n|e|s|w`): per-axis resize with a 20px
 *     minimum and canvas-edge clamping. The opposite edge is the anchor.
 *   - `null` (empty-area drag): draw a new rect from scratch (min of
 *     start/current, abs delta).
 *   - Shift (edge/corner only): lock to the CURRENT layer's `w/h` ratio
 *     using the "shrink the larger axis" rule.
 *
 * `layerAspect` is `layer.w / layer.h` (the current layer, NOT the original
 * image) — pass `undefined` to skip the Shift constraint.
 */
export function applyCropDrag(
  handle: CropHandle | null,
  orig: CropRect,
  startX: number,
  startY: number,
  curX: number,
  curY: number,
  bounds: CanvasBounds,
  shiftKey: boolean,
  layerAspect: number | undefined,
): CropRect {
  const dx = curX - startX
  const dy = curY - startY
  let { x, y, w, h } = orig
  const MIN = CROP_MIN_SIZE

  if (handle === 'move') {
    x = Math.max(0, Math.min(bounds.width - w, orig.x + dx))
    y = Math.max(0, Math.min(bounds.height - h, orig.y + dy))
  } else if (handle !== null) {
    if (handle.includes('e')) w = Math.max(MIN, Math.min(bounds.width - x, orig.w + dx))
    if (handle.includes('s')) h = Math.max(MIN, Math.min(bounds.height - y, orig.h + dy))
    if (handle.includes('w')) {
      const nx = Math.min(orig.x + orig.w - MIN, orig.x + dx)
      w = orig.w - (nx - orig.x)
      x = nx
    }
    if (handle.includes('n')) {
      const ny = Math.min(orig.y + orig.h - MIN, orig.y + dy)
      h = orig.h - (ny - orig.y)
      y = ny
    }
  } else {
    // Empty-area drag: draw a new rect from scratch.
    x = Math.min(startX, curX)
    y = Math.min(startY, curY)
    w = Math.abs(curX - startX)
    h = Math.abs(curY - startY)
  }

  // Shift aspect constraint (edge/corner only, not move). Legacy 9706-9710.
  if (shiftKey && handle !== 'move' && handle !== null && layerAspect !== undefined) {
    const ar = layerAspect
    if (w / h > ar) {
      w = h * ar
    } else {
      h = w / ar
    }
  }

  return { x, y, w: Math.max(MIN, w), h: Math.max(MIN, h) }
}

/**
 * Initialize the crop rect from a layer's on-canvas bounds, clamped to the
 * canvas. Mirrors `activateCropTool` (`legacy/index.html:9458-9461`).
 */
export function initialCropRect(
  layerX: number,
  layerY: number,
  layerW: number,
  layerH: number,
  bounds: CanvasBounds,
): CropRect {
  const x = Math.max(0, Math.round(layerX))
  const y = Math.max(0, Math.round(layerY))
  const w = Math.min(bounds.width - x, Math.round(layerW))
  const h = Math.min(bounds.height - y, Math.round(layerH))
  return { x, y, w, h }
}

/**
 * Reset the crop rect to the layer's current bounds (clamped to canvas).
 * Mirrors `resetCropRect` (`legacy/index.html:9491-9502`). This is a UI-only
 * reset of the crop rectangle — it does NOT restore the original image.
 */
export function resetCropRect(
  layerX: number,
  layerY: number,
  layerW: number,
  layerH: number,
  bounds: CanvasBounds,
): CropRect {
  return initialCropRect(layerX, layerY, layerW, layerH, bounds)
}

/** The original-source geometry stashed on first crop (non-destructive). */
export interface CropSource {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Map a canvas-space crop rect into image-space coordinates relative to the
 * stashed original source. Mirrors `confirmCrop` mapping
 * (`legacy/index.html:9519-9526`):
 *   `scaleX = origImg.naturalWidth / _origW`
 *   `rx = (rect.x - _origX) * scaleX`
 *
 * `origNatural` is the original image's natural pixel size; `origGeom` is the
 * stashed layer geometry at first-crop time (`_origX/Y/W/H`).
 */
export function cropRectToImageSpace(
  rect: CropRect,
  origGeom: CropSource,
  origNatural: { readonly naturalWidth: number; readonly naturalHeight: number },
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const scaleX = origNatural.naturalWidth / origGeom.width
  const scaleY = origNatural.naturalHeight / origGeom.height
  return {
    x: (rect.x - origGeom.x) * scaleX,
    y: (rect.y - origGeom.y) * scaleY,
    width: rect.w * scaleX,
    height: rect.h * scaleY,
  }
}

/**
 * Compute the non-destructive crop source to stash on first crop. Mirrors the
 * `if (!layer._origImg)` guard in `confirmCrop` (`legacy/index.html:9510-9516`):
 * the stash is set ONLY on the first crop; subsequent crops keep the original.
 *
 * Returns the new crop source if none exists, or the existing one to preserve.
 */
export function computeCropSource(
  existing: CropSource | undefined,
  layerX: number,
  layerY: number,
  layerW: number,
  layerH: number,
): CropSource {
  if (existing) return existing
  return { x: layerX, y: layerY, width: layerW, height: layerH }
}
