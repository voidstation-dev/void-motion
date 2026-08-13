/**
 * Void Motion application shell (M05).
 *
 * Renders the four regions that mirror the legacy Inkplainer layout: Header,
 * Canvas, Sidebar, Bottom bar. M05 wires the project lifecycle: the Header
 * hosts the project name editor + Projects button + save indicator, the
 * `ProjectsSheet` mounts here, and `useProjectBoot` loads the most-recent
 * project (or creates one) at startup — mirroring the legacy boot path
 * (legacy/index.html:5277).
 */
import type { ReactElement } from 'react'
import { Providers } from './providers'
import { Header } from './regions/Header'
import { CanvasRegion } from './regions/CanvasRegion'
import { Sidebar } from './regions/Sidebar'
import { BottomBar } from './regions/BottomBar'
import { ProjectsSheet } from './components/project/ProjectsSheet'
import { ExportFeature } from './features/export/ExportFeature'
import { useProjectBoot } from './hooks/useProjectBoot'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'

export function App(): ReactElement {
  // Load the most-recent project (or create one) on mount. No-op until the
  // legacy storage adapter has booted, so this is safe in tests / SSR.
  useProjectBoot()
  // Global keyboard shortcuts (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z). Mounted once.
  useGlobalShortcuts()

  return (
    <Providers>
      <div className="flex h-full flex-col bg-background text-foreground">
        <Header />
        <div className="flex min-h-0 flex-1">
          <CanvasRegion />
          <Sidebar />
        </div>
        <BottomBar />
      </div>
      <ProjectsSheet />
      <ExportFeature />
    </Providers>
  )
}
