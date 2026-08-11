/**
 * Sidebar region (M02).
 *
 * Mirrors the legacy right sidebar (legacy/index.html ~line 3715): layer
 * list, layer properties, animation/drawing tabs. Styled with Tailwind
 * tokens and the shadcn/ui Tabs primitive. No behavior is wired up yet.
 */
import type { ReactElement } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import { Separator } from '@/app/components/ui/separator'

export function Sidebar(): ReactElement {
  return (
    <aside
      data-region="sidebar"
      className="flex w-[280px] flex-col overflow-y-auto border-l border-border bg-sidebar p-3"
    >
      <section aria-label="Layers">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Layers
        </h2>
        <div className="rounded-md border border-dashed border-border bg-surface-1 px-3 py-3 text-sm text-muted-foreground">
          No layers
        </div>
      </section>
      <Separator className="my-3" />
      <section aria-label="Animation" className="flex-1">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Animation
        </h2>
        <Tabs defaultValue="animation" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="animation" className="flex-1">
              Animation
            </TabsTrigger>
            <TabsTrigger value="drawing" className="flex-1">
              Drawing
            </TabsTrigger>
          </TabsList>
          <TabsContent value="animation">
            <ScrollArea className="h-[400px] rounded-md border border-border bg-surface-1 p-3">
              <p className="text-sm text-muted-foreground">Animation controls</p>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="drawing">
            <ScrollArea className="h-[400px] rounded-md border border-border bg-surface-1 p-3">
              <p className="text-sm text-muted-foreground">Drawing controls</p>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </section>
    </aside>
  )
}
