import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { PresetsSection } from './PresetsSection'
import { AnimationTab } from './AnimationTab'
import { DrawingTab } from './DrawingTab'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/app/components/ui/accordion'
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
    <div className="flex h-full flex-col bg-transparent">
      <div className="px-3 pt-4">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {t('tabs.presets', 'PRESETS')}
        </div>

        <Accordion type="single" collapsible defaultValue="presets">
          <AccordionItem
            value="presets"
            className="overflow-hidden rounded-xl border border-black/10 bg-white mb-4 shadow-sm"
          >
            <AccordionTrigger className="bg-transparent px-3 py-3 hover:no-underline">
              <span className="flex items-center gap-2">
                <div className="h-3 w-[2px] bg-foreground rounded-full" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
                  SETTINGS PRESETS
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 pt-1">
              <PresetsSection />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="px-3 pb-3">
        <Tabs defaultValue={defaultTab} className="flex flex-col">
          <TabsList className="w-full bg-[#f4f4f5] rounded-[10px] p-1 h-auto mb-4 border border-black/5">
            <TabsTrigger
              value="animation"
              className="flex-1 rounded-[8px] py-1.5 text-xs font-semibold data-[state=active]:bg-[#171918] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <div className="flex items-center gap-2 justify-center">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {t('tabs.animation', 'Animation')}
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="drawing"
              className="flex-1 rounded-[8px] py-1.5 text-xs font-semibold data-[state=active]:bg-[#171918] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <div className="flex items-center gap-2 justify-center">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
                {t('tabs.drawing', 'Drawing')}
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="animation" className="mt-0 data-[state=inactive]:hidden outline-none">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t('tabs.animation', 'ANIMATION')}
            </div>
            <Accordion type="single" collapsible defaultValue="anim-style">
              <AccordionItem
                value="anim-style"
                className="overflow-hidden rounded-xl border border-black/10 bg-white mb-4 shadow-sm"
              >
                <AccordionTrigger className="bg-transparent px-3 py-3 hover:no-underline">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-[2px] bg-foreground rounded-full" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
                      ANIMATION STYLE
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 pt-1">
                  <AnimationTab />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
          <TabsContent value="drawing" className="mt-0 data-[state=inactive]:hidden outline-none">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t('tabs.drawingStyle', 'DRAWING STYLE')}
            </div>
            <Accordion type="single" collapsible defaultValue="draw-style">
              <AccordionItem
                value="draw-style"
                className="overflow-hidden rounded-xl border border-black/10 bg-white mb-4 shadow-sm"
              >
                <AccordionTrigger className="bg-transparent px-3 py-3 hover:no-underline">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-[2px] bg-foreground rounded-full" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
                      OUTLINE ANIMATION
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 pt-1">
                  <DrawingTab />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
