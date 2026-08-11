/**
 * Slicer preview hook (M12).
 *
 * Draws the slicer preview canvas + wires the pointer drag/draw for the rect
 * + freehand modes. Mirrors the legacy `_initSlicerPreview` +
 * `_drawSlicerPreview` + the preview-canvas pointer listeners
 * (`legacy/index.html:9769-10043`).
 *
 * Preview rendering (legacy 9794-9929):
 *   - clear the preview canvas;
 *   - draw the layer image scaled to fill the preview;
 *   - grid mode: stroke each cell + badge + dashed grid lines;
 *   - rect mode: fill+stroke each committed rect + badge + the live drag rect;
 *   - freehand mode: fill+stroke each committed path + bounding box + badge +
 *     the in-progress drawing.
 *
 * Pointer interaction (legacy 9973-10043):
 *   - rect: mousedown starts a drag (canvas-space start); mousemove updates
 *     the live preview rect (preview-pixel space); mouseup commits a
 *     canvas-space rect (gated by `w > 10 && h > 10`).
 *   - freehand: mousedown starts a path; mousemove pushes canvas-space points;
 *     mouseup commits the path + bounding box (gated by `pts.length > 4` AND
 *     `bw > 10 && bh > 10`).
 *
 * The hook subscribes to the slicer session via a lightweight broadcast
 * (the service mutates the session in place, so we poll via a state tick).
 */
import { useEffect, useSyncExternalStore, type RefObject } from 'react'
import { slicerService } from '@/app/services/slicer-service'
import { useLayerStore } from '@/app/store'
import {
  SLICE_COLORS,
  computePreviewScale,
  previewCoords,
  type SlicerMode,
} from '@/engine/image-processing/slicer'

/** Safe slice-color lookup (noUncheckedIndexedAccess guards the tuple). */
function sliceColor(i: number): string {
  return SLICE_COLORS[i % SLICE_COLORS.length] ?? SLICE_COLORS[0] ?? '#e74c3c'
}

export function useSlicerPreview(
  canvasRef: RefObject<HTMLCanvasElement>,
  mode: SlicerMode | null,
): void {
  // Subscribe to the service's own session pub/sub (every service mutation
  // auto-notifies), so the preview redraws live as the user draws.
  const tick = useSyncExternalStore(
    (l) => slicerService.subscribe(l),
    () => slicerService.getSnapshot(),
  )
  const layerId = slicerService.session?.layerId ?? null
  const layer = useLayerStore((s) => s.layers.find((l) => l.id === layerId) ?? null)

  // Initialize the preview canvas size when the session opens / the layer
  // changes. Mirrors `_initSlicerPreview` (legacy 9774-9792).
  useEffect(() => {
    const el = canvasRef.current
    if (!el || !layer) return
    const wrap = el.parentElement
    if (!wrap) return
    const maxW = wrap.clientWidth - 32
    const maxH = wrap.clientHeight - 32 || 360
    const imgW = layer.transform.width
    const imgH = layer.transform.height
    const { scale, width, height } = computePreviewScale(
      imgW || 1,
      imgH || 1,
      maxW > 0 ? maxW : 1,
      maxH > 0 ? maxH : 1,
    )
    el.width = width
    el.height = height
    // Stash the scale on the element for the pointer handlers + redraw.
    ;(el as unknown as { _slicerScale: number })._slicerScale = scale
    drawSlicerPreview(el, layer, mode)
    // Deps: the canvas ref + the layer geometry. The draw fn closes over the
    // session (read live via the slicer service) so it is intentionally omitted.
  }, [canvasRef, layerId, layer?.transform.width, layer?.transform.height])

  // Redraw whenever the mode / tick / layer changes.
  useEffect(() => {
    const el = canvasRef.current
    if (!el || !layer) return
    drawSlicerPreview(el, layer, mode)
    // Deps: mode + tick + layer id. The draw fn reads the live session via
    // the slicer service, so the session is intentionally omitted.
  }, [canvasRef, mode, tick, layerId])

  // Wire the pointer drag/draw (rect + freehand only; grid is read-only).
  useEffect(() => {
    const el = canvasRef.current
    if (!el || !layer) return
    const scale = (el as unknown as { _slicerScale: number })._slicerScale ?? 1
    const offX = layer.transform.x
    const offY = layer.transform.y

    const toCoords = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      return previewCoords(
        e.clientX,
        e.clientY,
        { left: r.left, top: r.top, width: r.width, height: r.height },
        { width: el.width, height: el.height },
        scale,
        offX,
        offY,
      )
    }

    const onDown = (e: MouseEvent): void => {
      const { x, y } = toCoords(e)
      slicerService.pointerDown(x, y)
      e.preventDefault()
    }
    const onMove = (e: MouseEvent): void => {
      const session = slicerService.session
      if (!session) return
      const { x, y, px, py } = toCoords(e)
      slicerService.pointerMove(x, y, px, py, scale, offX, offY)
    }
    const onUp = (e: MouseEvent): void => {
      const { x, y } = toCoords(e)
      slicerService.pointerUp(x, y)
    }

    el.addEventListener('mousedown', onDown)
    el.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      el.removeEventListener('mousedown', onDown)
      el.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    // Deps: the canvas ref + the layer origin. The handlers read the live
    // session via the slicer service, so the session is intentionally omitted.
  }, [canvasRef, layerId, layer?.transform.x, layer?.transform.y])
}

/**
 * Draw the slicer preview. Mirrors `_drawSlicerPreview`
 * (`legacy/index.html:9794-9929`): the layer image scaled to fill the preview,
 * then per-mode overlays (grid cells + badges, committed rects + live drag,
 * committed freehand paths + in-progress drawing).
 */
function drawSlicerPreview(
  el: HTMLCanvasElement,
  layer: {
    readonly name: string
    readonly transform: {
      readonly x: number
      readonly y: number
      readonly width: number
      readonly height: number
    }
  },
  mode: SlicerMode | null,
): void {
  const ctx = el.getContext('2d')
  if (!ctx) return
  const pcW = el.width
  const pcH = el.height
  ctx.clearRect(0, 0, pcW, pcH)
  // Draw the layer image scaled to fill the preview. The legacy app draws
  // `layer.img`; the typed path has no runtime image (asset registry lands
  // later), so we draw a placeholder rect. The legacy co-host (M16) will
  // supply the real image via the engine.
  ctx.fillStyle = '#3a3a3a'
  ctx.fillRect(0, 0, pcW, pcH)
  const session = slicerService.session
  if (!session || !mode) return
  const s = (el as unknown as { _slicerScale: number })._slicerScale ?? 1
  const offX = layer.transform.x
  const offY = layer.transform.y

  if (mode === 'grid') {
    const cols = session.gridCols
    const rows = session.gridRows
    const cw = pcW / cols
    const ch = pcH / rows
    let idx = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = sliceColor(idx)
        ctx.save()
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.strokeRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2)
        drawBadge(ctx, c * cw + 12, r * ch + 12, idx + 1, color)
        ctx.restore()
        idx++
      }
    }
    // Dashed grid lines (legacy 9831-9842).
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    for (let c = 1; c < cols; c++) {
      ctx.beginPath()
      ctx.moveTo(c * cw, 0)
      ctx.lineTo(c * cw, pcH)
      ctx.stroke()
    }
    for (let r = 1; r < rows; r++) {
      ctx.beginPath()
      ctx.moveTo(0, r * ch)
      ctx.lineTo(pcW, r * ch)
      ctx.stroke()
    }
    ctx.restore()
  } else if (mode === 'rect') {
    session.rects.forEach((rect, idx) => {
      const color = sliceColor(idx)
      const px = (rect.x - offX) * s
      const py = (rect.y - offY) * s
      const pw = rect.w * s
      const ph = rect.h * s
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.fillStyle = color + '22'
      ctx.fillRect(px, py, pw, ph)
      ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2)
      drawBadge(ctx, px + 12, py + 12, idx + 1, color)
      ctx.restore()
    })
    // Live drag rect (legacy 9866-9874).
    const drag = session.rectDrag
    if (drag && drag.cur) {
      ctx.save()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      ctx.strokeRect(drag.cur.x, drag.cur.y, drag.cur.w, drag.cur.h)
      ctx.restore()
    }
  } else if (mode === 'freehand') {
    session.freehandPaths.forEach((path, idx) => {
      const color = sliceColor(idx)
      const b = path.bounds
      const px = (b.x - offX) * s
      const py = (b.y - offY) * s
      const pw = b.w * s
      const ph = b.h * s
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.fillStyle = color + '22'
      ctx.beginPath()
      path.pts.forEach((pt, i) => {
        const ppx = (pt.x - offX) * s
        const ppy = (pt.y - offY) * s
        if (i === 0) ctx.moveTo(ppx, ppy)
        else ctx.lineTo(ppx, ppy)
      })
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // Bounding box dashed (legacy 9898-9903).
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.strokeRect(px, py, pw, ph)
      ctx.setLineDash([])
      drawBadge(ctx, px + 12, py + 12, idx + 1, color)
      ctx.restore()
    })
    // Live freehand drawing (legacy 9913-9927).
    if (session.freehandDrawing && session.freehandCurrent.length > 1) {
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      session.freehandCurrent.forEach((pt, i) => {
        const ppx = (pt.x - offX) * s
        const ppy = (pt.y - offY) * s
        if (i === 0) ctx.moveTo(ppx, ppy)
        else ctx.lineTo(ppx, ppy)
      })
      ctx.stroke()
      ctx.restore()
    }
  }
}

/** Draw a numbered badge circle. Mirrors the legacy badge (9820-9826). */
function drawBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  n: number,
  color: string,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 9px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(n), cx, cy)
}
