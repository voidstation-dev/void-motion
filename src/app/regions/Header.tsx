import type { ReactElement } from 'react'
import {
  Code2,
  Coffee,
  Download,
  HelpCircle,
  Layers3,
  Pencil,
  Redo2,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { ProjectNameEditor } from '@/app/components/project/ProjectNameEditor'
import { ProjectsButton } from '@/app/components/project/ProjectsButton'
import { SaveIndicator } from '@/app/components/project/SaveIndicator'
import { globalControlsService } from '@/app/services/global-controls-service'
import { useLayerStore } from '@/app/store'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher'
import { EXTERNAL_LINKS } from '@/app/config/external-links'

interface HeaderProps {
  readonly compact?: boolean
  readonly onOpenSettings?: () => void
  readonly onOpenLayers?: () => void
}

export function Header({
  compact = false,
  onOpenSettings,
  onOpenLayers,
}: HeaderProps): ReactElement {
  const { t } = useTranslation(['editor', 'common'])
  const canUndo = useLayerStore((state) => state.undoStack.length > 0)
  const canRedo = useLayerStore((state) => state.redoStack.length > 0)

  return (
    <header
      data-region="header"
      className="motion-trace relative z-20 mx-2 mt-2 flex h-[64px] shrink-0 items-center gap-1 overflow-hidden rounded-[14px] border border-black/10 bg-sidebar px-2 shadow-[0_5px_18px_rgba(24,28,26,0.06)] sm:gap-2 sm:px-3 xl:mx-2.5 xl:mt-2.5 xl:px-4"
    >
      <div className="flex items-center gap-2 sm:pr-2 xl:pr-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#171918] text-[#f8f7f2] shadow-sm">
          <Pencil className="h-4 w-4" />
        </span>
        <span className="hidden min-w-0 leading-none md:block">
          <span className="block font-hand text-[23px] font-bold tracking-tight">Void Motion</span>
          <span className="mt-0.5 hidden text-[8px] font-semibold uppercase tracking-[0.2em] text-muted-foreground xl:block">
            by Void Station
          </span>
        </span>
      </div>
      <div className="hidden h-7 w-px bg-border sm:block" />
      <div className="sm:ml-1 xl:ml-2">
        <ProjectsButton />
      </div>
      <div className="mx-2 hidden h-7 w-px bg-border md:block xl:mx-3" />
      <div className="hidden min-w-0 max-w-[360px] flex-1 items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface-1 sm:flex">
        <ProjectNameEditor />
        <span className="hidden xl:inline">
          <SaveIndicator />
        </span>
      </div>
      <div className="flex items-center gap-0.5 sm:ml-1 xl:ml-3 xl:gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!canUndo}
          onClick={() => globalControlsService.undo()}
          aria-label={t('actions.undo', { ns: 'common' })}
          title={t('header.undoShortcut')}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!canRedo}
          onClick={() => globalControlsService.redo()}
          aria-label={t('actions.redo', { ns: 'common' })}
          title={t('header.redoShortcut')}
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {compact && (
        <div className="flex items-center gap-0.5 border-l border-border pl-1 sm:gap-1 sm:pl-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onOpenSettings}
            aria-label={t('header.openSettings')}
            title={t('header.settings')}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onOpenLayers}
            aria-label={t('header.openLayers')}
            title={t('header.layers')}
          >
            <Layers3 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <nav
        className="ml-auto flex items-center gap-3 xl:gap-4"
        aria-label={t('header.helpExport')}
      >
        <LanguageSwitcher />
        <a
          href="/tutorial"
          aria-label={t('nav.tutorial', { ns: 'common' })}
          className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-border bg-background px-2 text-xs font-medium transition hover:-translate-y-px hover:bg-accent xl:px-3"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden 2xl:inline">{t('nav.tutorial', { ns: 'common' })}</span>
        </a>
        <a
          href={EXTERNAL_LINKS.repository}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('nav.source', { ns: 'common' })}
          className="hidden h-9 items-center gap-2 rounded-[10px] border border-border bg-background px-3 text-xs font-medium transition hover:-translate-y-px hover:bg-accent 2xl:inline-flex"
        >
          <Code2 className="h-4 w-4" />
          {t('nav.source', { ns: 'common' })}
        </a>
        <a
          href={EXTERNAL_LINKS.support}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('nav.support', { ns: 'common' })}
          className="hidden h-9 items-center gap-2 rounded-[10px] border border-border bg-background px-3 text-xs font-medium transition hover:-translate-y-px hover:bg-accent 2xl:inline-flex"
        >
          <Coffee className="h-4 w-4" />
          {t('nav.support', { ns: 'common' })}
        </a>
        <Button
          className="h-9 gap-2 rounded-[10px] bg-[#171918] px-3 text-xs text-white shadow-sm transition hover:-translate-y-px hover:bg-[#252826] xl:px-4"
          onClick={() => globalControlsService.openExport()}
          aria-label={t('header.exportVideo')}
        >
          <Download className="h-4 w-4" />
          <span className="hidden lg:inline">{t('header.exportVideo')}</span>
        </Button>
      </nav>
    </header>
  )
}
