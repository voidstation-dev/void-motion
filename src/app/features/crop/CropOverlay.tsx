/**
 * Crop overlay (M11).
 *
 * The crop-tool overlay: a dedicated `<canvas>` (`crop-canvas`,
 * legacy/index.html:3819) rendered above the main canvas while the crop tool
 * is active. It draws the crop rectangle, the darkened-outside mask, the
 * rule-of-thirds grid, and the L-shaped corner handles — mirroring the legacy
 * `_drawCropOverlay` (`legacy/index.html:9558-9614`).
 *
 * React owns the `<canvas>` element; the `useCropOverlay` hook draws into it
 * from the `cropService` session + wires the pointer drag. The overlay is
 * mounted by `CanvasRegion` when `editorMode === 'crop'`.
 *
 * Per M11: the crop rect is temporary tool state (in `cropService.session`),
 * NOT project state — pointer moves update only the session, and `confirm`
 * is the only path that writes to the layer store.
 */
import type { ReactElement } from 'react'
import { useCropOverlay } from './useCropOverlay'

export interface CropOverlayProps {
  readonly canvasRef: React.RefObject<HTMLCanvasElement>
}

export function CropOverlay({ canvasRef }: CropOverlayProps): ReactElement {
  useCropOverlay(canvasRef)
  return (
    <canvas
      ref={canvasRef}
      id="crop-canvas"
      data-testid="crop-canvas"
      className="absolute left-0 top-0 z-20 h-full w-full"
      style={{ cursor: 'crosshair' }}
    />
  )
}
