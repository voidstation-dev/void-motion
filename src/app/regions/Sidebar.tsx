/**
 * Sidebar region (M08).
 *
 * Mirrors the legacy right sidebar (legacy/index.html ~line 3715): the layer
 * list + per-layer inspector, and the animation/drawing tabs. M08 wires the
 * layer panel to the layer service (delegating to the legacy runtime) and
 * the image/text input tab switch to the legacy `switchTab`.
 *
 * The animation/drawing tab content remains placeholder until M11–M15
 * (animation settings migration); the layer panel is the M08 deliverable.
 */
import type { ReactElement } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'

import { Separator } from '@/app/components/ui/separator'
import { LayerPanel } from '@/app/components/layer/LayerPanel'
import { TextPanel } from '@/app/features/text/TextPanel'
import { AnimationPanel } from '@/app/features/animation/AnimationPanel'
import { layerService } from '@/app/services/layer-service'
import { useSelectionStore } from '@/app/store'

export function Sidebar(): ReactElement {
  const editorMode = useSelectionStore((s) => s.editorMode)
  const onTabChange = (m: string) => {
    if (m === 'image' || m === 'text') layerService.switchTab(m)
  }

  return (
    <aside
      data-region="sidebar"
      className="flex w-[280px] flex-col overflow-y-auto border-l border-border bg-sidebar p-3"
    >
      <LayerPanel />
      <Separator className="my-3" />
      <section aria-label="Input mode" className="mb-3">
        <Tabs value={editorMode} onValueChange={onTabChange} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="image" className="flex-1">
              Image
            </TabsTrigger>
            <TabsTrigger value="text" className="flex-1">
              Text
            </TabsTrigger>
          </TabsList>
          <TabsContent value="image">
            <p className="rounded-md border border-dashed border-border bg-surface-1 px-3 py-3 text-sm text-muted-foreground">
              Drop images or browse — PNG, JPG, GIF, SVG
            </p>
          </TabsContent>
          <TabsContent value="text">
            <TextPanel />
          </TabsContent>
        </Tabs>
      </section>
      <section aria-label="Animation" className="flex-1 min-h-0 flex flex-col">
        <AnimationPanel />
      </section>
    </aside>
  )
}
