/**
 * Projects sheet (M05).
 *
 * The React equivalent of the legacy `projects-modal` (legacy/index.html:3253):
 * a slide-in drawer listing every project, sorted by `modifiedAt` descending
 * (legacy `refreshProjectsList` 4753), with a New Project button and a
 * per-item delete button.
 *
 * Behavior parity:
 *   - Open: refresh list from IDB, show sheet (legacy `openProjectsModal` 5210).
 *   - Close: hide sheet (legacy `closeProjectsModal` 5215).
 *   - Click a project: load it (legacy `loadProject(project.id)`).
 *   - New Project: create + load (legacy `createNewProject`).
 *   - Delete: confirm, delete, refresh (legacy `deleteProject` 4685).
 *
 * The active project is highlighted (legacy `isActive` class, 4759).
 */
import { useCallback, useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/app/components/ui/sheet'
import { Button } from '@/app/components/ui/button'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import { useProjectStore, useUiStore } from '@/app/store'
import type { ProjectSummary } from '@/types/project'
import type { ProjectId } from '@/types/brand'
import { projectService } from '@/app/services/project-service'
import { formatSizeBytes, formatTimeAgo } from '@/app/services/time-ago'
import { useTranslation } from 'react-i18next'

export function ProjectsSheet(): ReactElement {
  const { t } = useTranslation(['projects', 'common'])
  const open = useUiStore((s) => s.projectListOpen)
  const summaries = useProjectStore((s) => s.summaries)
  const currentId = useProjectStore((s) => s.current?.id ?? null)
  const [, setTick] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<ProjectSummary | null>(null)

  // Re-render once a minute so the relative-time labels stay fresh. The
  // legacy list re-computes on every open; this matches that liveness.
  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(interval)
  }, [open])

  const close = useCallback(() => projectService.closeProjects(), [])
  const onSelect = useCallback(async (id: ProjectId) => {
    await projectService.load(id)
    projectService.closeProjects()
  }, [])
  const onCreate = useCallback(async () => {
    await projectService.createNew()
    projectService.closeProjects()
  }, [])
  const onDelete = useCallback((id: ProjectId) => {
    setPendingDelete(
      useProjectStore.getState().summaries.find((summary) => summary.id === id) ?? null,
    )
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return
    await projectService.delete(pendingDelete.id)
    setPendingDelete(null)
  }, [pendingDelete])

  const now = Date.now()

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => (v ? projectService.openProjects() : close())}>
        <SheetContent side="left" className="w-[380px] p-0 sm:max-w-[380px]">
          <SheetHeader className="px-4 pt-4">
            <SheetTitle>{t('title')}</SheetTitle>
            <SheetDescription className="sr-only">{t('description')}</SheetDescription>
          </SheetHeader>
          <div className="px-4 py-2">
            <Button variant="outline" size="sm" className="w-full" onClick={onCreate}>
              <Plus className="mr-1 h-4 w-4" />
              {t('new')}
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-120px)] px-4 pb-4">
            {summaries.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <p>{t('empty')}</p>
                <small className="text-xs">{t('emptyHint')}</small>
              </div>
            ) : (
              <ul className="space-y-1">
                {summaries.map((s) => (
                  <ProjectRow
                    key={s.id}
                    summary={s}
                    active={s.id === currentId}
                    now={now}
                    onSelect={onSelect}
                    onDelete={onDelete}
                  />
                ))}
              </ul>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmTitle', { name: pendingDelete?.name })}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              {t('confirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface ProjectRowProps {
  readonly summary: ProjectSummary
  readonly active: boolean
  readonly now: number
  readonly onSelect: (id: ProjectId) => void
  readonly onDelete: (id: ProjectId) => void
}

function ProjectRow({ summary, active, now, onSelect, onDelete }: ProjectRowProps): ReactElement {
  const { t, i18n } = useTranslation('projects')
  const ago = formatTimeAgo(now, summary.modifiedAt, i18n.resolvedLanguage)
  const size = formatSizeBytes(summary.sizeBytes, i18n.resolvedLanguage)
  // Legacy canvas size read: `project.state.canvasW × project.state.canvasH`
  // (legacy/index.html:4761). The summary carries no canvas dims yet, so we
  // omit that segment until M08 populates canvas dims on summaries.
  return (
    <li
      className={`flex items-center gap-2 rounded-md border px-2 py-2 ${
        active ? 'border-primary bg-surface-1' : 'border-transparent hover:bg-surface-1'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(summary.id)}
        className="flex-1 min-w-0 text-left"
        aria-label={t('open', { name: summary.name })}
      >
        <div className="truncate text-sm font-medium">{summary.name}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {ago && <span>{ago}</span>}
          {ago && <span aria-hidden>•</span>}
          <span>{size}</span>
        </div>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        aria-label={t('delete', { name: summary.name })}
        onClick={(e) => {
          e.stopPropagation()
          onDelete(summary.id)
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  )
}
