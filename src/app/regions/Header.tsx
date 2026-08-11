/**
 * Header region (M02).
 *
 * Mirrors the legacy top bar (legacy/index.html ~line 3650): brand, project
 * name editor, undo/redo, export. Now styled with Tailwind tokens matching
 * the legacy palette. No behavior is wired up yet — buttons use shadcn/ui
 * primitives but remain disabled placeholders.
 */
import type { ReactElement } from 'react'
import { Button } from '@/app/components/ui/button'
import { Separator } from '@/app/components/ui/separator'

export function Header(): ReactElement {
  return (
    <header
      data-region="header"
      className="flex h-[52px] items-center gap-3 border-b border-border bg-sidebar px-4"
    >
      {/* Brand — legacy logo uses the Caveat hand font (legacy/index.html line 79). */}
      <span className="font-hand text-xl font-bold leading-none">Void Motion</span>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <span className="flex-1 truncate text-sm text-muted-foreground" aria-label="Project name">
        Untitled
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled aria-label="Undo">
          Undo
        </Button>
        <Button variant="outline" size="sm" disabled aria-label="Redo">
          Redo
        </Button>
        <Button variant="default" size="sm" disabled aria-label="Export">
          Export
        </Button>
      </div>
    </header>
  )
}
