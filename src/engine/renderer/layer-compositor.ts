import type { LegacyLayer } from '../legacy/legacy-state.types'

/**
 * Shared static layer compositor ported from M19.
 */

/**
 * Redraws all layers composited on the given canvas context.
 * This is the static frame rendering used when the animation is not playing.
 *
 * @param ctx The canvas 2D rendering context
 * @param layers The array of legacy layers to draw (in bottom-to-top visual stack order)
 * @param editingId The ID of the layer currently being edited inline (which should be hidden as the overlay textarea acts as its live preview)
 */
export function renderStaticLayers(
  ctx: CanvasRenderingContext2D,
  layers: LegacyLayer[],
  editingId: number | null,
): void {
  // Early exit if no layers to draw
  if (!layers || layers.length === 0) {
    return
  }

  ctx.save()

  layers.forEach((layer) => {
    if (layer.visible === false) return
    if (!layer.img) return // Skip if image not loaded

    // Hide the layer being edited — the overlay textarea is the live preview
    if (editingId !== null && layer.id === editingId) return

    ctx.save()
    ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1

    // Use faster rendering for small images
    if (layer.w < 100 && layer.h < 100) {
      ctx.imageSmoothingEnabled = false
    }

    ctx.drawImage(layer.img, layer.x, layer.y, layer.w, layer.h)
    ctx.restore()
  })

  ctx.restore()
}
