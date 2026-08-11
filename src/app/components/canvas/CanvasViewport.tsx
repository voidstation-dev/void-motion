/**
 * Canvas viewport (M09).
 *
 * The positioned container that hosts the stacked canvas surfaces. Mirrors
 * the legacy `canvas-wrapper` (legacy/index.html:3806): a relatively-
 * positioned box that the main/select/hand/outline canvases are absolutely
 * stacked inside. React owns the `<canvas>` element lifecycle; the engine
 * owns rendering (attached via `useCanvasHost`).
 */
import type { ReactElement, ReactNode } from 'react'

export interface CanvasViewportProps {
  readonly viewportRef: React.RefObject<HTMLDivElement>
  readonly children: ReactNode
}

export function CanvasViewport({ viewportRef, children }: CanvasViewportProps): ReactElement {
  return (
    <div
      ref={viewportRef}
      aria-label="Canvas surface"
      className="relative flex flex-1 items-center justify-center overflow-hidden rounded-md border border-border bg-card min-h-0"
      data-testid="canvas-viewport"
    >
      {children}
    </div>
  )
}
