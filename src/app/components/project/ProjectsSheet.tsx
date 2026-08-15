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
import { Plus, Trash2, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/components/ui/dialog'
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
      <Dialog open={open} onOpenChange={(v) => (v ? projectService.openProjects() : close())}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4">
            <DialogTitle className="text-xl font-semibold">{t('title')}</DialogTitle>
            <DialogDescription className="sr-only">{t('description')}</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-2">
            <Button className="w-full bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm" onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('new')}
            </Button>
          </div>
          <ScrollArea className="max-h-[50vh] px-6 pb-6 pt-2">
            {summaries.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <p>{t('empty')}</p>
                <small className="text-xs">{t('emptyHint')}</small>
              </div>
            ) : (
              <ul className="space-y-2">
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
        </DialogContent>
      </Dialog>
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
  return (
    <li
      className={`group flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors ${
        active ? 'border-foreground bg-muted/20' : 'border-border hover:bg-muted/50'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(summary.id)}
        className="flex flex-1 min-w-0 items-center gap-3 text-left"
        aria-label={t('open', { name: summary.name })}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/30 text-foreground">
          <Pencil className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-medium">{summary.name}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            {ago && <span>{ago}</span>}
            {ago && <span aria-hidden>•</span>}
            <span>{size}</span>
          </div>
        </div>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        aria-label={t('delete', { name: summary.name })}
        onClick={(e) => {
          e.stopPropagation()
          onDelete(summary.id)
        }}
      >
        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
      </Button>
    </li>
  )
}
