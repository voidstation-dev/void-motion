import type { LegacyLayer } from '../legacy/legacy-state.types'

/**
 * Shared selection handle rendering ported from M19.
 */

const HANDLE_R = 6

/**
 * Draws the selection box and 8 resize handles for the currently selected layer.
 * 
 * @param sctx The selection canvas 2D rendering context
 * @param layer The currently selected legacy layer (or null if none)
 * @param isPlaying Whether the animation is currently playing (selection should be hidden during playback)
 */
export function renderSelection(
  sctx: CanvasRenderingContext2D,
  layer: LegacyLayer | null,
  isPlaying: boolean
): void {
  // Clear the selection surface first
  sctx.canvas.width = sctx.canvas.width // fastest way to clear and reset context state
  // Or if we want to be safe and just clear:
  sctx.clearRect(0, 0, sctx.canvas.width, sctx.canvas.height)

  if (!layer || isPlaying) return

  const { x, y, w, h } = layer

  sctx.save()

  // Selection rect
  sctx.strokeStyle = '#6c63ff'
  sctx.lineWidth = 2
  sctx.setLineDash([5, 3])
  sctx.strokeRect(x, y, w, h)
  sctx.setLineDash([])

  // Corner handles
  const corners: [number, number][] = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h]
  ]
  corners.forEach(([cx, cy]) => {
    sctx.fillStyle = '#6c63ff'
    sctx.beginPath()
    sctx.arc(cx, cy, HANDLE_R, 0, Math.PI * 2)
    sctx.fill()
    sctx.strokeStyle = '#fff'
    sctx.lineWidth = 1.5
    sctx.stroke()
  })

  // Edge midpoint handles
  const mids: [number, number][] = [
    [x + w / 2, y],
    [x + w, y + h / 2],
    [x + w / 2, y + h],
    [x, y + h / 2]
  ]
  mids.forEach(([cx, cy]) => {
    sctx.fillStyle = '#fff'
    sctx.beginPath()
    sctx.arc(cx, cy, 4, 0, Math.PI * 2)
    sctx.fill()
    sctx.strokeStyle = '#6c63ff'
    sctx.lineWidth = 1.5
    sctx.stroke()
  })

  sctx.restore()
}
