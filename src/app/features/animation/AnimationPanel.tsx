import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { PresetsSection } from './PresetsSection'
import { AnimationTab } from './AnimationTab'
import { DrawingTab } from './DrawingTab'
import { useAnimationStore } from '@/app/store'
import { useTranslation } from 'react-i18next'

export function AnimationPanel() {
  const { t } = useTranslation('animation')
  const activeMode = useAnimationStore((s) => s.activeMode)

  const isDrawingMode =
    activeMode === 'outline-fill' ||
    activeMode === 'illust-fill' ||
    activeMode === 'outline-only' ||
    activeMode === 'text-draw'

  const defaultTab = isDrawingMode ? 'drawing' : 'animation'

  return (
    <div className="flex h-full flex-col gap-3 p-2">
      <details className="rounded-lg border border-border bg-surface-1">
        <summary className="cursor-pointer list-none px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t('tabs.presets')} <span className="float-right">›</span>
        </summary>
        <div className="border-t border-border">
          <PresetsSection />
        </div>
      </details>

      <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="animation" className="flex-1">
            {t('tabs.animation')}
          </TabsTrigger>
          <TabsTrigger value="drawing" className="flex-1">
            {t('tabs.drawing')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="animation" className="mt-3 flex-1 data-[state=inactive]:hidden">
          <AnimationTab />
        </TabsContent>
        <TabsContent value="drawing" className="mt-3 flex-1 data-[state=inactive]:hidden">
          <DrawingTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
