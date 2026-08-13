/**
 * Canvas stage (M09).
 *
 * The primary animation surface (`main-canvas`, legacy/index.html:3809) plus
 * the moving-hand overlay (`handCanvas`, legacy/index.html:5606). Both are
 * absolutely positioned, full-size, stacked inside the viewport. React owns
 * the `<canvas>` elements; the engine draws into them via the refs handed
 * over by `useCanvasHost`.
 *
 * Per M09: no canvas element is looked up globally by ID from new code. The
 * `id` attributes are retained purely for legacy-DOM co-hosting parity
 * (M16) and are NOT queried by any new module.
 */
import type { ReactElement } from 'react'

export interface CanvasStageProps {
  readonly mainRef: React.RefObject<HTMLCanvasElement>
  readonly handRef: React.RefObject<HTMLCanvasElement>
}

export function CanvasStage({ mainRef, handRef }: CanvasStageProps): ReactElement {
  return (
    <>
      <canvas
        ref={mainRef}
        id="main-canvas"
        data-testid="main-canvas"
        className="absolute inset-0 !h-full !w-full"
      />
      <canvas
        ref={handRef}
        data-testid="hand-canvas"
        className="pointer-events-none absolute inset-0 !h-full !w-full"
      />
    </>
  )
}
