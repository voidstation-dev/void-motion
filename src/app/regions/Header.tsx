import type { ReactElement } from 'react'
import {
  Code2,
  Download,
  HelpCircle,
  Layers3,
  Pencil,
  Redo2,
  SlidersHorizontal,
  Undo2,
  ChevronDown,
  Info,
  FileText,
  ShieldCheck,
} from 'lucide-react'
import { ProjectNameEditor } from '@/app/components/project/ProjectNameEditor'
import { ProjectsButton } from '@/app/components/project/ProjectsButton'
import { SaveIndicator } from '@/app/components/project/SaveIndicator'
import { globalControlsService } from '@/app/services/global-controls-service'
import { useLayerStore } from '@/app/store'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher'
import { EXTERNAL_LINKS } from '@/app/config/external-links'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'

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
  const undoCount = useLayerStore((state) => state.undoStack.length)
  const canUndo = undoCount > 0
  const canRedo = useLayerStore((state) => state.redoStack.length > 0)

  return (
    <header
      data-region="header"
      className="motion-trace relative z-20 flex h-[50px] shrink-0 items-center justify-between border-b border-black/10 bg-white px-3 sm:px-4"
    >
      {/* Left section: Brand, Divider, Projects, Name & Save, Undo/Redo */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Brand Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="group flex items-center gap-2 rounded-[8px] py-1 outline-none hover:opacity-80 transition-opacity text-left focus-visible:ring-2 focus-visible:ring-primary">
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#e8e8ea] border border-black/5 text-[#171918] shadow-sm">
              <Pencil className="h-3.5 w-3.5 stroke-[2]" />
            </span>
            <span className="font-hand text-[22px] font-bold tracking-tight text-foreground leading-none">
              Void Motion
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[280px] rounded-xl p-1.5 shadow-xl border border-black/10 bg-white/95 backdrop-blur-sm">
            <div className="px-3 py-2.5">
              <div className="font-hand text-2xl font-bold">Void Motion</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Free whiteboard animation maker • created by Void Station</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer gap-2.5 py-2 px-3 text-xs">
              <a href="/about">
                <Info className="h-4 w-4 opacity-70" />
                {t('nav.about', { ns: 'common' })}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer gap-2.5 py-2 px-3 text-xs">
              <a href="/tutorial">
                <FileText className="h-4 w-4 opacity-70" />
                {t('nav.tutorial', { ns: 'common' })}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer gap-2.5 py-2 px-3 text-xs">
              <a href={EXTERNAL_LINKS.repository} target="_blank" rel="noopener noreferrer">
                <Code2 className="h-4 w-4 opacity-70" />
                {t('nav.source', { ns: 'common' })}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer gap-2.5 py-2 px-3 text-xs">
              <a href="/privacy">
                <ShieldCheck className="h-4 w-4 opacity-70" />
                {t('nav.privacy', { ns: 'common' })}
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider */}
        <div className="hidden h-4 w-px bg-black/10 sm:block" />

        {/* Projects button */}
        <ProjectsButton />

        {/* Project Name + Timestamp Pill */}
        <div className="hidden h-8 items-center gap-2 rounded-[8px] border border-black/10 bg-[#f4f4f5] px-3 shadow-sm sm:flex">
          <ProjectNameEditor />
          <SaveIndicator />
        </div>

        {/* Undo / Redo buttons with count badge */}
        <div className="flex h-8 items-center rounded-[8px] border border-black/10 bg-white p-0.5 shadow-sm">
          <button
            type="button"
            disabled={!canUndo}
            onClick={() => globalControlsService.undo()}
            aria-label={t('actions.undo', { ns: 'common' })}
            title={t('header.undoShortcut')}
            className="relative flex h-7 w-7 items-center justify-center rounded-[6px] text-foreground transition hover:bg-black/5 disabled:opacity-30"
          >
            <Undo2 className="h-3.5 w-3.5" />
            {undoCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#171918] px-1 text-[8px] font-bold text-white leading-none shadow-sm">
                {undoCount}
              </span>
            )}
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={() => globalControlsService.redo()}
            aria-label={t('actions.redo', { ns: 'common' })}
            title={t('header.redoShortcut')}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-foreground transition hover:bg-black/5 disabled:opacity-30"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Right section: Links and Actions */}
      <div className="flex items-center gap-2">
        <LanguageSwitcher />

        <a
          href="/tutorial"
          aria-label={t('nav.tutorial', { ns: 'common' })}
          className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-black/10 bg-white px-3 text-xs font-medium text-foreground shadow-sm transition hover:bg-black/5"
        >
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">{t('nav.tutorial', { ns: 'common', defaultValue: 'Tutorial' })}</span>
        </a>

        <button
          type="button"
          onClick={() => globalControlsService.openExport()}
          aria-label={t('header.exportVideo')}
          className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-black/10 bg-white px-3.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-black/5"
        >
          <Download className="h-3.5 w-3.5 text-foreground" />
          <span className="hidden sm:inline">{t('header.exportVideo', 'Export Video')}</span>
        </button>

        {compact && (
          <div className="flex items-center gap-1 border-l border-black/10 pl-1.5 sm:hidden">
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label={t('header.openSettings')}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-black/10 bg-white text-foreground shadow-sm hover:bg-black/5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onOpenLayers}
              aria-label={t('header.openLayers')}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-black/10 bg-white text-foreground shadow-sm hover:bg-black/5"
            >
              <Layers3 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}


