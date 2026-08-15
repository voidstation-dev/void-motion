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
import { useTranslation } from 'react-i18next'

export interface CanvasViewportProps {
  readonly viewportRef: React.RefObject<HTMLDivElement>
  readonly children: ReactNode
  readonly width?: number
  readonly height?: number
  readonly aspectRatio?: string
}

export function CanvasViewport({
  viewportRef,
  children,
  width,
  height,
  aspectRatio = '16 / 9',
}: CanvasViewportProps): ReactElement {
  const { t } = useTranslation('editor')

  const hasExplicitSize = typeof width === 'number' && width > 0 && typeof height === 'number' && height > 0

  return (
    <div
      ref={viewportRef}
      aria-label={t('canvas.surface')}
      className="relative flex items-center justify-center overflow-hidden rounded-[15px] border border-black/10 bg-card shadow-[0_18px_45px_rgba(24,28,26,0.16)] shrink-0"
      style={{
        width: hasExplicitSize ? `${width}px` : undefined,
        height: hasExplicitSize ? `${height}px` : undefined,
        aspectRatio: !hasExplicitSize ? aspectRatio : undefined,
        maxWidth: '100%',
        maxHeight: '100%',
      }}
      data-testid="canvas-viewport"
    >
      {children}
    </div>
  )
}
