/**
 * Slicer tool primitives (M12).
 *
 * Pure functions ported verbatim from the legacy slicer system
 * (`legacy/index.html:9720-10261`), so the React slicer feature can compute
 * slice geometry + build slice descriptors without touching the legacy DOM.
 * These do NOT mutate state and do NOT rasterize (the legacy `applySlices`
 * rasterizes via offscreen canvases; the typed path builds slice descriptors
 * and delegates the rasterize to the legacy runtime when present).
 *
 * Legacy behavior preserved exactly:
 *   - three modes (`legacy/index.html:9729`): `'grid' | 'rect' | 'freehand'`.
 *   - grid generation (`applySlices` 10159-10173): `cw = layer.w/cols`,
 *     `ch = layer.h/rows`; iterates `r` then `c` (row-major, reading order);
 *     each cell `bounds = { x: layer.x + c*cw, y: layer.y + r*ch, w: cw, h: ch }`,
 *     label `${layer.name} ${idx+1}` (single space, no dash).
 *   - rect mode (10174-10179): uses accumulated `_slicerRects`
 *     (`{x,y,w,h,label}`); each becomes a slice with `clipPts: null`, label
 *     `${layer.name} — ${r.label}` (em dash).
 *   - freehand mode (10181-10187): uses `_slicerFhPaths`
 *     (`{pts:[{x,y}], bounds:{x,y,w,h}, label}`); `clipPts = p.pts` (polygon
 *     in canvas-space), label `${layer.name} — ${p.label}`.
 *   - rect drag min-size gate (`mouseup` 10010): `rw > 10 && rh > 10`
 *     (canvas-space pixels) before a rect is committed.
 *   - freehand commit gate (`mouseup` 10020-10039): require
 *     `_slicerFhCurrent.length > 4` points AND a bounding box
 *     `bw > 10 && bh > 10`; else toast + discard.
 *   - source resolution (`applySlices` 10128-10134): prefer the non-destructive
 *     crop original (`layer._origImg/_origX/_origY/_origW/_origH`) else fall
 *     back to `layer.img/x/y/w/h`; `scaleX = srcImg.naturalWidth / srcW`.
 *   - per-slice raster (10194-10225): `rx = (bounds.x - srcX) * scaleX`,
 *     `rw = Math.max(1, Math.round(bounds.w * scaleX))`; freehand clip when
 *     `clipPts.length > 2` (polygon path in crop-canvas-local coords, then
 *     `clip()` + `drawImage`).
 *   - layer inheritance (10137-10150): slices inherit the parent's animation
 *     settings (falling back to `state.*`); `opacity ?? 1`, `speed ?? 40`,
 *     `handSpeed ?? 6`.
 *   - new-layer shape (10229-10243): `resizePct: 100`, `animOrder: null`,
 *     `visible: true`, `baseW/baseH = bounds`, `id: Date.now() + i*7`.
 *   - original removal (10246-10249): after all slice images load, splice the
 *     new layers in at the original's index, then remove the original; select
 *     `newLayers[0]`.
 *
 * Per M12 "preserve": original layer replacement, new layer positions,
 * inherited settings, ordering, independent animation.
 */

/** The slicer mode. Legacy `_slicerMode` (`legacy/index.html:9729`). */
export type SlicerMode = 'grid' | 'rect' | 'freehand'

/** A rectangle in canvas-space pixels. */
export interface SlicerRect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  /** User-facing label, e.g. `"Slice 1"`. */
  readonly label: string
}

/** A freehand path in canvas-space pixels. */
export interface SlicerFreehandPath {
  /** The full polygon point list (canvas-space). */
  readonly pts: ReadonlyArray<{ readonly x: number; readonly y: number }>
  /** The bounding box of `pts` (canvas-space). */
  readonly bounds: { x: number; y: number; w: number; h: number }
  /** User-facing label, e.g. `"Region 1"`. */
  readonly label: string
}

/**
 * A slice descriptor — the pure description of one output layer before the
 * rasterize. Mirrors the `slices[i]` objects built in `applySlices`
 * (`legacy/index.html:10166, 10175, 10182`).
 */
export interface SliceDescriptor {
  /** The slice bounds in canvas-space (becomes the new layer's x/y/w/h). */
  readonly bounds: {
    readonly x: number
    readonly y: number
    readonly w: number
    readonly h: number
  }
  /**
   * The freehand polygon (canvas-space) for a non-rectangular cut, or `null`
   * for a plain rectangular cut. Legacy `clipPts`.
   */
  readonly clipPts: ReadonlyArray<{ readonly x: number; readonly y: number }> | null
  /** The new layer's name. */
  readonly label: string
}

/** The minimum rect width/height to commit (canvas-space px). Legacy `10`. */
export const SLICER_MIN_SIZE = 10

/** The minimum freehand point count to commit. Legacy `> 4` (i.e. ≥5). */
export const SLICER_MIN_POINTS = 5

/** The grid slider range. Legacy `min="1" max="8" value="2"`. */
export const SLICER_GRID_MIN = 1
export const SLICER_GRID_MAX = 8
export const SLICER_GRID_DEFAULT = 2

/** The 8 cycling slice-badge colors. Legacy `SLICE_COLORS`. */
export const SLICE_COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#e91e63',
] as const

/**
 * Build the grid slice descriptors. Mirrors the grid branch of `applySlices`
 * (`legacy/index.html:10159-10173`): `cw = layer.w/cols`, `ch = layer.h/rows`;
 * iterates `r` then `c` (row-major, reading order); each cell
 * `bounds = { x: layer.x + c*cw, y: layer.y + r*ch, w: cw, h: ch }`; label
 * `${layer.name} ${idx+1}` (single space, no dash). `clipPts: null`.
 *
 * `cols`/`rows` default to 2 when falsy (legacy `parseInt(...) || 2`).
 */
export function buildGridSlices(
  layerName: string,
  layerX: number,
  layerY: number,
  layerW: number,
  layerH: number,
  cols: number,
  rows: number,
): SliceDescriptor[] {
  const c = Math.round(cols) || SLICER_GRID_DEFAULT
  const r = Math.round(rows) || SLICER_GRID_DEFAULT
  const cw = layerW / c
  const ch = layerH / r
  const slices: SliceDescriptor[] = []
  let idx = 0
  for (let row = 0; row < r; row++) {
    for (let col = 0; col < c; col++) {
      slices.push({
        bounds: {
          x: layerX + col * cw,
          y: layerY + row * ch,
          w: cw,
          h: ch,
        },
        clipPts: null,
        label: `${layerName} ${idx + 1}`,
      })
      idx++
    }
  }
  return slices
}

/**
 * Build the rectangle-mode slice descriptors. Mirrors the rect branch of
 * `applySlices` (`legacy/index.html:10174-10179`): each accumulated rect
 * becomes a slice with `clipPts: null`, label `${layerName} — ${rect.label}`
 * (em dash).
 */
export function buildRectSlices(
  layerName: string,
  rects: readonly SlicerRect[],
): SliceDescriptor[] {
  return rects.map((r) => ({
    bounds: { x: r.x, y: r.y, w: r.w, h: r.h },
    clipPts: null,
    label: `${layerName} — ${r.label}`,
  }))
}

/**
 * Build the freehand-mode slice descriptors. Mirrors the freehand branch of
 * `applySlices` (`legacy/index.html:10181-10187`): each path becomes a slice
 * with `bounds = path.bounds`, `clipPts = path.pts` (the full polygon in
 * canvas-space), label `${layerName} — ${path.label}` (em dash).
 */
export function buildFreehandSlices(
  layerName: string,
  paths: readonly SlicerFreehandPath[],
): SliceDescriptor[] {
  return paths.map((p) => ({
    bounds: { x: p.bounds.x, y: p.bounds.y, w: p.bounds.w, h: p.bounds.h },
    clipPts: p.pts,
    label: `${layerName} — ${p.label}`,
  }))
}

/**
 * Commit a rectangle drag. Mirrors the rect-mode `mouseup` handler
 * (`legacy/index.html:10006-10017`): the final canvas-space rect is
 * `{ x: min(sx,x), y: min(sy,y), w: abs(x-sx), h: abs(y-sy) }`, gated by
 * `w > 10 && h > 10`. Returns the committed rect (with a `"Slice N"` label
 * using the supplied 1-based count) or `null` if too small.
 */
export function commitRectDrag(
  startX: number,
  startY: number,
  curX: number,
  curY: number,
  nextCount: number,
): SlicerRect | null {
  const rw = Math.abs(curX - startX)
  const rh = Math.abs(curY - startY)
  if (rw <= SLICER_MIN_SIZE || rh <= SLICER_MIN_SIZE) return null
  return {
    x: Math.min(startX, curX),
    y: Math.min(startY, curY),
    w: rw,
    h: rh,
    label: `Slice ${nextCount}`,
  }
}

/**
 * Commit a freehand path. Mirrors the freehand-mode `mouseup` handler
 * (`legacy/index.html:10018-10042`): require `pts.length > 4` (≥5 points) AND
 * a bounding box `bw > 10 && bh > 10`; else return `null` (the legacy app
 * toasts + discards). Returns the committed path (with a `"Region N"` label
 * using the supplied 1-based count) or `null` if too small.
 */
export function commitFreehandPath(
  pts: ReadonlyArray<{ readonly x: number; readonly y: number }>,
  nextCount: number,
): SlicerFreehandPath | null {
  if (pts.length <= 4) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  const bw = maxX - minX
  const bh = maxY - minY
  if (bw <= SLICER_MIN_SIZE || bh <= SLICER_MIN_SIZE) return null
  return {
    pts: [...pts],
    bounds: { x: minX, y: minY, w: bw, h: bh },
    label: `Region ${nextCount}`,
  }
}

/**
 * The non-destructive crop source — the full-resolution original the slicer
 * re-cuts from. Mirrors `layer._origImg/_origX/_origY/_origW/_origH`
 * (`legacy/index.html:10128-10132`), falling back to the layer's current
 * geometry when no crop original is stashed.
 */
export interface SlicerSource {
  /** Natural pixel size of the source image. */
  readonly naturalWidth: number
  readonly naturalHeight: number
  /** The source geometry in canvas-space. */
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/**
 * Resolve the slicer source for a layer. Mirrors `applySlices`
 * (`legacy/index.html:10128-10132`): prefer the non-destructive crop original
 * (`cropSource` + the crop natural size) else fall back to the layer's current
 * geometry + natural size.
 */
export function resolveSlicerSource(
  layerX: number,
  layerY: number,
  layerW: number,
  layerH: number,
  layerNaturalW: number,
  layerNaturalH: number,
  cropSource?: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  },
  cropNatural?: { readonly naturalWidth: number; readonly naturalHeight: number },
): SlicerSource {
  if (cropSource && cropNatural) {
    return {
      naturalWidth: cropNatural.naturalWidth,
      naturalHeight: cropNatural.naturalHeight,
      x: cropSource.x,
      y: cropSource.y,
      w: cropSource.width,
      h: cropSource.height,
    }
  }
  return {
    naturalWidth: layerNaturalW,
    naturalHeight: layerNaturalH,
    x: layerX,
    y: layerY,
    w: layerW,
    h: layerH,
  }
}

/**
 * Compute the source-image-pixel crop rect for a slice. Mirrors the per-slice
 * math in `applySlices` (`legacy/index.html:10198-10201`):
 *   `rx = (bounds.x - srcX) * scaleX`
 *   `rw = Math.max(1, Math.round(bounds.w * scaleX))`
 * where `scaleX = srcNaturalWidth / srcW`.
 */
export function sliceSourceRect(
  bounds: { readonly x: number; readonly y: number; readonly w: number; readonly h: number },
  source: SlicerSource,
): { readonly rx: number; readonly ry: number; readonly rw: number; readonly rh: number } {
  const scaleX = source.naturalWidth / source.w
  const scaleY = source.naturalHeight / source.h
  return {
    rx: (bounds.x - source.x) * scaleX,
    ry: (bounds.y - source.y) * scaleY,
    rw: Math.max(1, Math.round(bounds.w * scaleX)),
    rh: Math.max(1, Math.round(bounds.h * scaleY)),
  }
}

/**
 * Rasterize a slice to an offscreen canvas. Mirrors the per-slice render in
 * `applySlices` (`legacy/index.html:10203-10225`): create a `rw × rh` canvas;
 * for a freehand clip (`clipPts.length > 2`) build a polygon path in
 * crop-canvas-local coords (`lx = (pt.x - bounds.x) * scaleX`), `clip()`, then
 * `drawImage(srcImg, rx, ry, rw, rh, 0, 0, rw, rh)`; for a rectangular cut
 * just `drawImage`.
 *
 * Returns the offscreen canvas (the legacy app serializes it via `toDataURL`
 * into a new `Image`; the typed path leaves that to the caller/legacy runtime).
 */
export function rasterizeSlice(
  sourceImage: CanvasImageSource,
  bounds: { readonly x: number; readonly y: number; readonly w: number; readonly h: number },
  clipPts: ReadonlyArray<{ readonly x: number; readonly y: number }> | null,
  source: SlicerSource,
  createCanvas: () => HTMLCanvasElement = defaultCreateCanvas,
): HTMLCanvasElement {
  const { rx, ry, rw, rh } = sliceSourceRect(bounds, source)
  const cc = createCanvas()
  cc.width = rw
  cc.height = rh
  const cctx = cc.getContext('2d')
  if (!cctx) return cc
  const scaleX = source.naturalWidth / source.w
  const scaleY = source.naturalHeight / source.h
  if (clipPts && clipPts.length > 2) {
    cctx.beginPath()
    clipPts.forEach((pt, pi) => {
      const lx = (pt.x - bounds.x) * scaleX
      const ly = (pt.y - bounds.y) * scaleY
      if (pi === 0) cctx.moveTo(lx, ly)
      else cctx.lineTo(lx, ly)
    })
    cctx.closePath()
    cctx.clip()
    cctx.drawImage(sourceImage, rx, ry, rw, rh, 0, 0, rw, rh)
  } else {
    cctx.drawImage(sourceImage, rx, ry, rw, rh, 0, 0, rw, rh)
  }
  return cc
}

/** Default canvas factory — `document.createElement('canvas')`. */
function defaultCreateCanvas(): HTMLCanvasElement {
  return document.createElement('canvas')
}

/**
 * The inheritance spec for new slices. Mirrors the `inherited` object built
 * in `applySlices` (`legacy/index.html:10137-10150`): each new layer gets
 * these from the source layer, falling back to the global `state.*` defaults.
 * `??` is used for numeric/boolean props (so `0`/`false` are preserved); `||`
 * is used for string props (so empty string falls back).
 */
export interface SlicerInheritance {
  readonly opacity: number
  readonly speed: number
  readonly handSpeed: number
}

/**
 * Compute the inheritance defaults for new slices. Mirrors the
 * `opacity ?? 1`, `speed ?? 40`, `handSpeed ?? 6` fallbacks
 * (`legacy/index.html:10147-10149`). The per-layer animation-style overrides
 * are carried on the layer's `animation` field directly (the typed model
 * already projects them there), so this helper only resolves the scalar
 * numeric defaults.
 */
export function resolveInheritance(
  layerOpacity: number | undefined,
  layerSpeed: number | undefined,
  layerHandSpeed: number | undefined,
): SlicerInheritance {
  return {
    opacity: layerOpacity ?? 1,
    speed: layerSpeed ?? 40,
    handSpeed: layerHandSpeed ?? 6,
  }
}

/**
 * Compute the preview-canvas scale + offset. Mirrors `_initSlicerPreview`
 * (`legacy/index.html:9774-9792`): `s = min(maxW/imgW, maxH/imgH, 1)` (never
 * upscales — capped at 1), `_slicerOffX/Y = layer.x/y`. The preview maps
 * between canvas-space and preview-pixel space:
 *   `px = (canvasX - offX) * scale`
 *   `canvasX = px / scale + offX`
 */
export function computePreviewScale(
  imgW: number,
  imgH: number,
  maxW: number,
  maxH: number,
): { readonly scale: number; readonly width: number; readonly height: number } {
  const s = Math.min(maxW / imgW, maxH / imgH, 1)
  return {
    scale: s,
    width: Math.round(imgW * s),
    height: Math.round(imgH * s),
  }
}

/**
 * Convert a client-space pointer event into canvas-space + preview-pixel-space
 * coords. Mirrors `_pcCoords` (`legacy/index.html:9961-9971`):
 *   `x = ((clientX - r.left) / r.width * pc.width) / scale + offX`
 *   `px = (clientX - r.left) / r.width * pc.width`
 *
 * `rect` is the preview canvas's `getBoundingClientRect()`; `pcSize` is the
 * preview canvas's internal bitmap size (`pc.width/height`).
 */
export function previewCoords(
  clientX: number,
  clientY: number,
  rect: {
    readonly left: number
    readonly top: number
    readonly width: number
    readonly height: number
  },
  pcSize: { readonly width: number; readonly height: number },
  scale: number,
  offX: number,
  offY: number,
): { readonly x: number; readonly y: number; readonly px: number; readonly py: number } {
  const px = ((clientX - rect.left) / rect.width) * pcSize.width
  const py = ((clientY - rect.top) / rect.height) * pcSize.height
  return {
    x: px / scale + offX,
    y: py / scale + offY,
    px,
    py,
  }
}

/**
 * Compute the live rect-drag preview rectangle (in preview-pixel space).
 * Mirrors the rect-mode `mousemove` handler
 * (`legacy/index.html:9986-9997`): the live `cur` rect is built in
 * preview-pixel space using the start point converted to preview-pixel space
 * (`(sx - offX) * scale`).
 */
export function liveRectDrag(
  startCanvasX: number,
  startCanvasY: number,
  curPx: number,
  curPy: number,
  scale: number,
  offX: number,
  offY: number,
): { readonly x: number; readonly y: number; readonly w: number; readonly h: number } {
  const sxPx = (startCanvasX - offX) * scale
  const syPx = (startCanvasY - offY) * scale
  return {
    x: Math.min(curPx, sxPx),
    y: Math.min(curPy, syPx),
    w: Math.abs(curPx - sxPx),
    h: Math.abs(curPy - syPx),
  }
}

/**
 * The apply-button enabled predicate. Mirrors `_updateSlicerFooter`
 * (`legacy/index.html:9938-9956`): grid → `cols*rows >= 2`; rect → ≥1 rect;
 * freehand → ≥1 path.
 */
export function canApplySlices(
  mode: SlicerMode,
  gridCols: number,
  gridRows: number,
  rectCount: number,
  freehandCount: number,
): boolean {
  if (mode === 'grid') return gridCols * gridRows >= 2
  if (mode === 'rect') return rectCount >= 1
  return freehandCount >= 1
}

/**
 * The footer info text. Mirrors `_updateSlicerFooter`
 * (`legacy/index.html:9941-9955`): grid → `Will create N layers from this
 * image.`; rect → `N regions defined. Click Apply to create layers.` or
 * `Draw rectangles on the preview image.`; freehand → `N freehand regions
 * defined.` or `Draw on the preview to define regions.`.
 */
export function slicerFooterText(
  mode: SlicerMode,
  gridCols: number,
  gridRows: number,
  rectCount: number,
  freehandCount: number,
): string {
  if (mode === 'grid') {
    const n = gridCols * gridRows
    return `Will create ${n} layer${n !== 1 ? 's' : ''} from this image.`
  }
  if (mode === 'rect') {
    return rectCount
      ? `${rectCount} region${rectCount !== 1 ? 's' : ''} defined. Click Apply to create layers.`
      : 'Draw rectangles on the preview image.'
  }
  return freehandCount
    ? `${freehandCount} freehand region${freehandCount !== 1 ? 's' : ''} defined.`
    : 'Draw on the preview to define regions.'
}
