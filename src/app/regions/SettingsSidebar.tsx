import type { ReactElement } from 'react'
import { Play, Loader2 } from 'lucide-react'
import { AnimationPanel } from '@/app/features/animation/AnimationPanel'
import { playbackService } from '@/app/services/playback-service'
import { useLayerStore, useSelectionStore, usePlaybackStore } from '@/app/store'
import { useTranslation } from 'react-i18next'

export function SettingsSidebar(): ReactElement {
  const { t } = useTranslation('editor')
  const hasLayers = useLayerStore((state) => state.layers.length > 0)
  const selectedLayerId = useSelectionStore((state) => state.selectedLayerId)
  const playbackStatus = usePlaybackStore((state) => state.status)
  const isGenerating = playbackStatus === 'generating'

  const handleGenerate = () => {
    playbackService.generate()
  }

  return (
    <aside
      data-region="settings-sidebar"
      className="flex h-full w-[292px] shrink-0 flex-col overflow-hidden bg-[#fbfaf7] border-r border-border"
    >
      <div className="p-3">
        <div className="h-[50px] flex items-center justify-center rounded-[10px] border border-dashed border-black/15 bg-black/5 px-3 text-center text-[11px] leading-snug text-muted-foreground transition-all">
          {selectedLayerId ? (
            <span>{t('settings.editingSelected')}</span>
          ) : (
            <span>Select a layer on the right to edit settings</span>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AnimationPanel />
      </div>
      <div className="border-t border-black/5 bg-white p-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!hasLayers || isGenerating}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-[#171918] px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-[#252826] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
          {isGenerating ? t('settings.generating') : t('settings.generate')}
        </button>
      </div>
    </aside>
  )
}
