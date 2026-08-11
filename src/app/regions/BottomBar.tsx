/**
 * Bottom bar region (M02).
 *
 * Mirrors the legacy bottom bar (legacy/index.html ~line 3850): hand style
 * picker, speed sliders, aspect/resolution controls. Styled with Tailwind
 * tokens. No behavior is wired up yet — controls are placeholder read-outs.
 */
import type { ReactElement } from 'react'
import { Separator } from '@/app/components/ui/separator'

export function BottomBar(): ReactElement {
  return (
    <footer
      data-region="bottombar"
      className="flex h-[48px] items-center gap-6 border-t border-border bg-sidebar px-4"
    >
      <div className="flex items-center gap-2" aria-label="Hand style">
        <span className="text-xs font-semibold text-muted-foreground">Hand</span>
        <span className="text-xs text-muted-foreground">
          Ghost · Hand 1 · Hand 2 · Hand 3 · Pen
        </span>
      </div>
      <Separator orientation="vertical" className="h-5" />
      <div className="flex items-center gap-2" aria-label="Speed">
        <span className="text-xs font-semibold text-muted-foreground">Speed</span>
        <span className="text-xs text-muted-foreground">Reveal · Hand</span>
      </div>
      <Separator orientation="vertical" className="h-5" />
      <div className="flex items-center gap-2" aria-label="Canvas size">
        <span className="text-xs font-semibold text-muted-foreground">Canvas</span>
        <span className="text-xs text-muted-foreground">16:9 · 720p</span>
      </div>
    </footer>
  )
}
