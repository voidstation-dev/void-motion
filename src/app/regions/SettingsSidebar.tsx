import type { ReactElement } from 'react'
import { Play, SlidersHorizontal } from 'lucide-react'
import { AnimationPanel } from '@/app/features/animation/AnimationPanel'
import { playbackService } from '@/app/services/playback-service'
import { useLayerStore, useSelectionStore } from '@/app/store'
import { useTranslation } from 'react-i18next'

export function SettingsSidebar(): ReactElement {
  const { t } = useTranslation('editor')
  const hasLayers = useLayerStore((state) => state.layers.length > 0)
  const selectedLayerId = useSelectionStore((state) => state.selectedLayerId)

  return (
    <aside
      data-region="settings-sidebar"
      className="flex h-full w-[292px] shrink-0 flex-col overflow-hidden rounded-[14px] border border-black/10 bg-sidebar shadow-[0_8px_24px_rgba(24,28,26,0.06)]"
    >
      <div className="flex items-center gap-3 border-b border-border px-3 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#f0e3c7] text-[#8a5c16]">
          <SlidersHorizontal className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold">{t('header.settings')}</h2>
          <p className="truncate text-[10px] text-muted-foreground">
            {t('settings.sheetDescription')}
          </p>
        </div>
      </div>
      <div className="border-b border-border p-2.5">
        <div className="rounded-[10px] border border-dashed border-[#d3a13a]/40 bg-[#fbf7ed] px-3 py-2.5 text-center text-[11px] leading-4 text-muted-foreground">
          {selectedLayerId ? t('settings.editingSelected') : t('settings.selectLayer')}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AnimationPanel />
      </div>
      <div className="border-t border-border bg-[#fbfaf7] p-2.5">
        <button
          type="button"
          onClick={() => playbackService.generate()}
          disabled={!hasLayers}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-[#171918] px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-[#252826] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          <Play className="h-4 w-4 fill-current" />
          {t('settings.generate')}
        </button>
      </div>
    </aside>
  )
}
