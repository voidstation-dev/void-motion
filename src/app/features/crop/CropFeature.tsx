/**
 * Crop feature container (M11).
 *
 * Hosts the crop overlay (`CropOverlay`) over the canvas + the
 * `CropActionBar` below. Mounted by `CanvasRegion` when
 * `editorMode === 'crop'`. The overlay ref is owned here (React owns the
 * `<canvas>` element; the `useCropOverlay` hook draws into it + wires the
 * pointer drag).
 *
 * Per M11: the crop rect is temporary tool state in `cropService.session`;
 * the overlay + action bar read it through the service. `confirm` is the
 * only path that writes to the layer store.
 */
import type { ReactElement } from 'react'
import { useRef } from 'react'
import { CropOverlay } from './CropOverlay'
import { CropActionBar } from './CropActionBar'

export function CropFeature(): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  return (
    <>
      <CropOverlay canvasRef={canvasRef} />
      <CropActionBar />
    </>
  )
}
