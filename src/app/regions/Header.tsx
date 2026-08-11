/**
 * Header region (M05).
 *
 * Hosts the M05 project-lifecycle UI: brand, Projects button, project name
 * editor, save indicator. Mirrors the legacy topbar layout
 * (legacy/index.html:3190): logo · Projects · name editor (+ save dot) ·
 * undo/redo · center status · export. The name editor and save indicator
 * replace the legacy static span + `#project-save-indicator` (3209–3212).
 *
 * Undo/redo + Export remain disabled placeholders — they migrate in M06
 * (Header global controls) and M15 (Export UI). No behavior change beyond
 * wiring the project name / list / save-indicator through the typed store.
 */
import type { ReactElement } from 'react'
import { Button } from '@/app/components/ui/button'
import { Separator } from '@/app/components/ui/separator'
import { ProjectNameEditor } from '@/app/components/project/ProjectNameEditor'
import { ProjectsButton } from '@/app/components/project/ProjectsButton'
import { SaveIndicator } from '@/app/components/project/SaveIndicator'

export function Header(): ReactElement {
  return (
    <header
      data-region="header"
      className="flex h-[52px] items-center gap-3 border-b border-border bg-sidebar px-4"
    >
      {/* Brand — legacy logo uses the Caveat hand font (legacy/index.html line 79). */}
      <span className="font-hand text-xl font-bold leading-none">Void Motion</span>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ProjectsButton />
      <Separator orientation="vertical" className="mx-1 h-6" />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <ProjectNameEditor />
        <SaveIndicator />
      </div>
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
