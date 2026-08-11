/**
 * Crop overlay hook (M11).
 *
 * Draws the crop overlay from the `cropService` session and wires the pointer
 * drag. Mirrors the legacy `_drawCropOverlay` (`legacy/index.html:9558-9614`)
 * for rendering and the legacy crop-canvas listeners (`legacy/index.html:9650-9718`)
 * for interaction.
 *
 * Rendering (legacy 9558-9614):
 *   - clear the crop canvas;
 *   - darken the area outside the crop rect with `rgba(0,0,0,0.48)`, then
 *     clear the crop hole;
 *   - white border around the crop rect;
 *   - rule-of-thirds grid in `rgba(255,255,255,0.3)`;
 *   - L-shaped corner handles (`HS = 10`);
 *   - a `w × h` size label.
 *
 * Interaction (legacy 9650-9718): mousedown hit-tests a handle and starts a
 * drag; mousemove updates the temporary crop rect via `cropService.pointerMove`
 * (move/resize/draw-new-rect, 20px min, canvas-edge clamp, Shift aspect lock);
 * mouseup clears the dragging flag. The overlay cursor reflects the handle.
 *
 * The hook subscribes to the canvas store for the logical canvas size (used to
 * scale the overlay's internal bitmap + convert client coords to canvas space)
 * and reads the crop rect from the service. It redraws on every session
 * change (the service mutates the session in place, so we poll via a
 * lightweight rAF-driven state tick).
 */
import { useEffect, useSyncExternalStore, type RefObject } from 'react'
import { cropService, getCropHandleFor } from '@/app/services/crop-service'
import { useCanvasStore } from '@/app/store'
import type { CropRect, CropHandle } from '@/engine/image-processing/crop'

/** The L-shaped corner-handle size. Legacy `HS = 10`. */
const HANDLE_SIZE = 10

/** Subscribe to cropService session changes via a lightweight broadcast. */
let cropListeners: ReadonlyArray<() => void> = []
// Stable snapshot references — only reassigned when the values actually change,
// so useSyncExternalStore's Object.is check does not loop.
let cropRectSnapshot: CropRect | null = null
let cropDraggingSnapshot = false

function broadcastCrop(): void {
  const nextRect = cropService.getRect()
  const nextDragging = cropService.isActive() && cropService.session?.dragging === true
  // Reassign only when changed (Object.is comparison).
  if (!rectEqual(nextRect, cropRectSnapshot)) cropRectSnapshot = nextRect
  if (nextDragging !== cropDraggingSnapshot) cropDraggingSnapshot = nextDragging
  for (const l of cropListeners) l()
}
function rectEqual(a: CropRect | null, b: CropRect | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
}
function subscribeCrop(listener: () => void): () => void {
  cropListeners = [...cropListeners, listener]
  return () => {
    cropListeners = cropListeners.filter((l) => l !== listener)
  }
}

/** useSyncExternalStore accessors for the crop rect (stable reference). */
function cropRectSubscribe(listener: () => void): () => void {
  return subscribeCrop(listener)
}
function cropRectGetSnapshot(): CropRect | null {
  return cropRectSnapshot
}

/** useSyncExternalStore accessors for the dragging flag (primitive). */
function cropDraggingGetSnapshot(): boolean {
  return cropDraggingSnapshot
}

export function useCropOverlay(canvasRef: RefObject<HTMLCanvasElement>): void {
  const canvas = useCanvasStore((s) => s.canvas)
  const rect = useSyncExternalStore(cropRectSubscribe, cropRectGetSnapshot)
  const dragging = useSyncExternalStore(cropRectSubscribe, cropDraggingGetSnapshot)

  // Redraw whenever the crop rect or canvas size changes.
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const canvasW = canvas?.size.width ?? 1280
    const canvasH = canvas?.size.height ?? 720
    // Scale the internal bitmap to the logical canvas size (legacy 9452-9455).
    el.width = canvasW
    el.height = canvasH
    drawCropOverlay(el, rect, canvasW, canvasH)
  }, [canvasRef, canvas?.size.width, canvas?.size.height, rect, dragging])

  // Wire the pointer drag.
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const canvasW = canvas?.size.width ?? 1280
    const canvasH = canvas?.size.height ?? 720

    const toCanvas = (e: MouseEvent): { x: number; y: number } => {
      const r = el.getBoundingClientRect()
      const sx = canvasW / r.width
      const sy = canvasH / r.height
      return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }
    }

    const onDown = (e: MouseEvent): void => {
      const { x, y } = toCanvas(e)
      cropService.pointerDown(x, y)
      broadcastCrop()
      e.preventDefault()
    }
    const onMove = (e: MouseEvent): void => {
      const { x, y } = toCanvas(e)
      // Cursor feedback when not dragging (legacy 9667-9673).
      const r = cropService.getRect()
      if (r && !cropService.session?.dragging) {
        const handle = getCropHandleFor(x, y, r)
        el.style.cursor = cursorFor(handle)
      }
      if (cropService.session?.dragging) {
        cropService.pointerMove(x, y, e.shiftKey)
        broadcastCrop()
      }
    }
    const onUp = (): void => {
      cropService.pointerUp()
      broadcastCrop()
    }

    el.addEventListener('mousedown', onDown)
    el.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      el.removeEventListener('mousedown', onDown)
      el.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [canvasRef, canvas?.size.width, canvas?.size.height])
}

/** Map a crop handle to a CSS cursor. Mirrors the legacy cursor map (9670). */
function cursorFor(handle: CropHandle | null): string {
  if (!handle) return 'crosshair'
  const cursors: Record<CropHandle, string> = {
    nw: 'nwse-resize',
    ne: 'nesw-resize',
    se: 'nwse-resize',
    sw: 'nesw-resize',
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
    move: 'move',
  }
  return cursors[handle]
}

/**
 * Draw the crop overlay. Mirrors `_drawCropOverlay`
 * (`legacy/index.html:9558-9614`): darkened-outside mask, white border,
 * rule-of-thirds grid, L-shaped corner handles, size label.
 */
function drawCropOverlay(
  el: HTMLCanvasElement,
  rect: CropRect | null,
  canvasW: number,
  canvasH: number,
): void {
  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvasW, canvasH)
  if (!rect) return
  const { x, y, w, h } = rect

  // Darken outside, clear the crop hole (legacy 9566-9570).
  ctx.fillStyle = 'rgba(0,0,0,0.48)'
  ctx.fillRect(0, 0, canvasW, canvasH)
  ctx.clearRect(x, y, w, h)

  // White border (legacy 9574-9577).
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)

  // Rule-of-thirds grid (legacy 9580-9591).
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 1; i < 3; i++) {
    ctx.moveTo(x + (w / 3) * i, y)
    ctx.lineTo(x + (w / 3) * i, y + h)
    ctx.moveTo(x, y + (h / 3) * i)
    ctx.lineTo(x + w, y + (h / 3) * i)
  }
  ctx.stroke()

  // L-shaped corner handles (legacy 9594-9608).
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  const hs = HANDLE_SIZE
  const corners: ReadonlyArray<{ readonly cx: number; readonly cy: number }> = [
    { cx: x, cy: y },
    { cx: x + w, cy: y },
    { cx: x + w, cy: y + h },
    { cx: x, cy: y + h },
  ]
  for (const c of corners) {
    // L-shape: two perpendicular lines at the corner.
    ctx.beginPath()
    ctx.moveTo(c.cx, c.cy - hs)
    ctx.lineTo(c.cx, c.cy)
    ctx.lineTo(c.cx + hs, c.cy)
    ctx.stroke()
  }

  // Size label (legacy 9612-9613).
  ctx.fillStyle = '#ffffff'
  ctx.font = '12px sans-serif'
  ctx.fillText(`${Math.round(w)} × ${Math.round(h)}`, x + 4, y + h + 14)
}
