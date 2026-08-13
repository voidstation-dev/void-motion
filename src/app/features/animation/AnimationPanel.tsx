import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { PresetsSection } from './PresetsSection'
import { AnimationTab } from './AnimationTab'
import { DrawingTab } from './DrawingTab'
import { useAnimationStore } from '@/app/store'

export function AnimationPanel() {
  const activeMode = useAnimationStore((s) => s.activeMode)

  const isDrawingMode =
    activeMode === 'outline-fill' ||
    activeMode === 'illust-fill' ||
    activeMode === 'outline-only' ||
    activeMode === 'text-draw'

  const defaultTab = isDrawingMode ? 'drawing' : 'animation'

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      <PresetsSection />
      
      <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="animation" className="flex-1">
            Animation
          </TabsTrigger>
          <TabsTrigger value="drawing" className="flex-1">
            Drawing
          </TabsTrigger>
        </TabsList>
        <TabsContent value="animation" className="flex-1 mt-4 data-[state=inactive]:hidden">
          <AnimationTab />
        </TabsContent>
        <TabsContent value="drawing" className="flex-1 mt-4 data-[state=inactive]:hidden">
          <DrawingTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
