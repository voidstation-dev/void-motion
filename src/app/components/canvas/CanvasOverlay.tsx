/**
 * Canvas overlay (M09/M10).
 *
 * The selection/transform overlay (`select-canvas`, legacy/index.html:3810)
 * and the outline-only draw overlay (`outline-overlay`,
 * legacy/index.html:3823). Both are absolutely positioned, full-size, and
 * stacked over the main canvas. React owns the `<canvas>` elements; the
 * engine draws into them via the refs handed over by `useCanvasHost`.
 *
 * M10: the selection overlay receives pointer events (it is the interaction
 * surface — legacy re-enables `selectCanvas.style.pointerEvents = 'auto'` at
 * `legacy/index.html:6691`). The outline overlay stays `pointer-events-none`
 * (drawn over, never interacted with). Pointer interaction is wired by
 * `useCanvasInteraction` in `CanvasRegion`.
 *
 * Per M09: no canvas element is looked up globally by ID from new code. The
 * `id` attributes are retained purely for legacy-DOM co-hosting parity
 * (M16) and are NOT queried by any new module.
 */
import type { ReactElement } from 'react'

export interface CanvasOverlayProps {
  readonly selectionRef: React.RefObject<HTMLCanvasElement>
  readonly outlineOverlayRef: React.RefObject<HTMLCanvasElement>
}

export function CanvasOverlay({
  selectionRef,
  outlineOverlayRef,
}: CanvasOverlayProps): ReactElement {
  return (
    <>
      <canvas
        ref={selectionRef}
        id="select-canvas"
        data-testid="select-canvas"
        className="absolute inset-0 h-full w-full"
      />
      <canvas
        ref={outlineOverlayRef}
        id="outline-overlay"
        data-testid="outline-overlay"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-100"
      />
    </>
  )
}
