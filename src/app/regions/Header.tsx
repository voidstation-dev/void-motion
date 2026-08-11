/**
 * Header region (M06).
 *
 * Hosts the global editor controls: brand, Projects button, project name
 * editor + save indicator, undo/redo (with depth badges), export trigger,
 * and the center status readout (canvas size + active animation label).
 * Mirrors the legacy topbar layout (legacy/index.html:3190).
 *
 * M06 promotes the undo/redo/export buttons from disabled placeholders to
 * wired controls: they call the global-controls service, which delegates to
 * the legacy runtime through guarded `window.*` calls and mirrors state into
 * the typed stores. The badge counts come from the layer store (typed mirror
 * of the legacy `_undoStack`/`_redoStack`).
 *
 * Keyboard shortcuts (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z) are mounted at the App
 * root via `useGlobalShortcuts` — see App.tsx.
 */
import type { ReactElement } from 'react'
import { Undo2, Redo2, Download } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Separator } from '@/app/components/ui/separator'
import { ProjectNameEditor } from '@/app/components/project/ProjectNameEditor'
import { ProjectsButton } from '@/app/components/project/ProjectsButton'
import { SaveIndicator } from '@/app/components/project/SaveIndicator'
import { globalControlsService } from '@/app/services/global-controls-service'
import { useLayerStore } from '@/app/store'
import { useAnimationStore } from '@/app/store'
import { useCanvasStore } from '@/app/store'

export function Header(): ReactElement {
  // Subscribe to the typed mirror of the legacy undo/redo stacks.
  const undoDepth = useLayerStore((s) => s.undoStack.length)
  const redoDepth = useLayerStore((s) => s.redoStack.length)
  const canUndo = undoDepth > 0
  const canRedo = redoDepth > 0

  // Center status readout — canvas size + active animation label.
  const canvas = useCanvasStore((s) => s.canvas)
  const activeMode = useAnimationStore((s) => s.activeMode)
  const sizeText = canvas ? `${canvas.size.width} × ${canvas.size.height}` : '1280 × 720'
  const animLabel = ANIMATION_LABELS[activeMode] ?? 'Chunk Jump'

  const onUndo = () => globalControlsService.undo()
  const onRedo = () => globalControlsService.redo()
  const onExport = () => globalControlsService.openExport()

  return (
    <header
      data-region="header"
      className="flex h-[52px] items-center gap-3 border-b border-border bg-sidebar px-4"
    >
      <span className="font-hand text-xl font-bold leading-none">Void Motion</span>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ProjectsButton />
      <Separator orientation="vertical" className="mx-1 h-6" />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <ProjectNameEditor />
        <SaveIndicator />
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={!canUndo}
          onClick={onUndo}
          aria-label="Undo"
          title={
            canUndo
              ? `Undo (${undoDepth} step${undoDepth !== 1 ? 's' : ''}) — Ctrl+Z`
              : 'Nothing to undo'
          }
        >
          <Undo2 className="h-4 w-4" />
          {canUndo && <span className="ml-1 text-xs tabular-nums">{undoDepth}</span>}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canRedo}
          onClick={onRedo}
          aria-label="Redo"
          title={
            canRedo
              ? `Redo (${redoDepth} step${redoDepth !== 1 ? 's' : ''}) — Ctrl+Shift+Z`
              : 'Nothing to redo'
          }
        >
          <Redo2 className="h-4 w-4" />
          {canRedo && <span className="ml-1 text-xs tabular-nums">{redoDepth}</span>}
        </Button>
      </div>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <div
        className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"
        aria-label="Canvas size and animation"
      >
        <span>{sizeText}</span>
        <span aria-hidden>•</span>
        <span>{animLabel}</span>
      </div>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Button variant="default" size="sm" onClick={onExport} aria-label="Export">
        <Download className="mr-1 h-4 w-4" />
        Export
      </Button>
    </header>
  )
}

/** Legacy animation-style → display label map (legacy topbar anim label). */
const ANIMATION_LABELS: Readonly<Record<string, string>> = {
  'chunk-jump': 'Chunk Jump',
  scanner: 'Scanner',
  contour: 'Contour',
  'outline-chunks': 'Outline Chunks',
  'outline-fill': 'Outline Fill',
  'illust-fill': 'Illust Fill',
  'outline-only': 'Outline Only',
  'text-draw': 'Text Draw',
  'spec-human': 'Human',
  'spec-animal': 'Animal',
  'spec-portrait': 'Portrait',
  'spec-vehicle': 'Vehicle',
  'spec-building': 'Building',
  'spec-landscape': 'Landscape',
  'spec-spiral': 'Spiral',
  'spec-text': 'Spec Text',
}
