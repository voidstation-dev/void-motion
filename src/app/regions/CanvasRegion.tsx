/**
 * Canvas region (M02).
 *
 * Mirrors the legacy canvas area (legacy/index.html ~line 3680): the main
 * drawing surface and the play/restart transport. Styled with Tailwind tokens
 * matching the legacy palette. No behavior is wired up yet — the legacy
 * runtime remains authoritative; the real <canvas> elements mount in M09.
 */
import type { ReactElement } from 'react'
import { Button } from '@/app/components/ui/button'

export function CanvasRegion(): ReactElement {
  return (
    <main data-region="canvas" className="flex min-w-0 flex-1 flex-col gap-3 p-4">
      <div
        aria-label="Canvas surface"
        className="flex flex-1 items-center justify-center rounded-md border border-border bg-card min-h-0"
      >
        <span className="text-lg text-muted-foreground">Canvas</span>
      </div>
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" disabled aria-label="Restart">
          Restart
        </Button>
        <Button variant="default" size="sm" disabled aria-label="Play/Pause">
          Play
        </Button>
      </div>
    </main>
  )
}
