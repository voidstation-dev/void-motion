/**
 * Canvas overlay (M09).
 *
 * The selection/transform overlay (`select-canvas`, legacy/index.html:3810)
 * and the outline-only draw overlay (`outline-overlay`,
 * legacy/index.html:3823). Both are absolutely positioned, full-size,
 * pointer-events-none (they are drawn over, not interacted with directly —
 * pointer interaction lands in M10). React owns the `<canvas>` elements;
 * the engine draws into them via the refs handed over by `useCanvasHost`.
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
        className="pointer-events-none absolute left-0 top-0 h-full w-full"
      />
      <canvas
        ref={outlineOverlayRef}
        id="outline-overlay"
        data-testid="outline-overlay"
        className="pointer-events-none absolute left-0 top-0 h-full w-full opacity-100"
      />
    </>
  )
}
