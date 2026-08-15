/**
 * Void Motion application shell.
 *
 * React owns every visible editor region. The preserved production runtime is
 * mounted separately by the legacy adapter and never becomes user-facing UI.
 */
import { lazy, useState, type ReactElement } from 'react'
import { Providers } from './providers'
import { Header } from './regions/Header'
import { CanvasRegion } from './regions/CanvasRegion'
import { Sidebar } from './regions/Sidebar'
import { SettingsSidebar } from './regions/SettingsSidebar'
import { ProjectsSheet } from './components/project/ProjectsSheet'
import { ExportFeature } from './features/export/ExportFeature'
import { useProjectBoot } from './hooks/useProjectBoot'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { LegacyRuntimeHost } from './components/runtime/LegacyRuntimeHost'
import { MobileWarning } from './components/MobileWarning'
import { useMediaQuery } from './hooks/useMediaQuery'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './components/ui/sheet'
import { useTranslation } from 'react-i18next'
import { usePageMetadata } from './hooks/usePageMetadata'

const TutorialPage = lazy(async () => {
  const module = await import('./pages/TutorialPage')
  return { default: module.TutorialPage }
})
const AboutPage = lazy(async () => {
  const module = await import('./pages/AboutPage')
  return { default: module.AboutPage }
})
const PrivacyPage = lazy(async () => {
  const module = await import('./pages/PrivacyPage')
  return { default: module.PrivacyPage }
})

function currentPage(): 'editor' | 'tutorial' | 'about' | 'privacy' {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/tutorial' || path === '/docs') return 'tutorial'
  if (path === '/about') return 'about'
  if (path === '/privacy') return 'privacy'
  return 'editor'
}

export function App(): ReactElement {
  const page = currentPage()
  if (page === 'tutorial')
    return (
      <Providers>
        <TutorialPage />
      </Providers>
    )
  if (page === 'about')
    return (
      <Providers>
        <AboutPage />
      </Providers>
    )
  if (page === 'privacy')
    return (
      <Providers>
        <PrivacyPage />
      </Providers>
    )
  return <EditorApp />
}

function EditorApp(): ReactElement {
  const { t } = useTranslation(['editor', 'common'])
  usePageMetadata(
    t('meta.editorTitle', { ns: 'common' }),
    t('meta.editorDescription', { ns: 'common' }),
  )
  useProjectBoot()
  useGlobalShortcuts()
  const desktopPanels = useMediaQuery('(min-width: 1360px)')
  const [mobilePanel, setMobilePanel] = useState<'settings' | 'layers' | null>(null)

  return (
    <Providers>
      <LegacyRuntimeHost />
      <div className="editor-shell flex h-full min-w-0 flex-col overflow-hidden bg-background text-foreground gap-2">
        <Header
          compact={!desktopPanels}
          onOpenSettings={() => setMobilePanel('settings')}
          onOpenLayers={() => setMobilePanel('layers')}
        />
        <div className="grid min-h-0 flex-1 gap-2 p-2 pt-0 xl:gap-2.5 xl:px-2.5 xl:pb-2.5">
          {desktopPanels && <SettingsSidebar />}
          <CanvasRegion />
          {desktopPanels && <Sidebar />}
        </div>
      </div>
      {!desktopPanels && (
        <>
          <Sheet
            open={mobilePanel === 'settings'}
            onOpenChange={(open) => setMobilePanel(open ? 'settings' : null)}
          >
            <SheetContent
              side="left"
              className="w-[min(92vw,360px)] overflow-hidden p-0 sm:max-w-[360px] [&_[data-region=settings-sidebar]]:h-full [&_[data-region=settings-sidebar]]:w-full"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{t('header.settings')}</SheetTitle>
                <SheetDescription>{t('settings.sheetDescription')}</SheetDescription>
              </SheetHeader>
              <SettingsSidebar />
            </SheetContent>
          </Sheet>
          <Sheet
            open={mobilePanel === 'layers'}
            onOpenChange={(open) => setMobilePanel(open ? 'layers' : null)}
          >
            <SheetContent
              side="right"
              className="w-[min(94vw,390px)] overflow-hidden p-0 sm:max-w-[390px] [&_[data-region=sidebar]]:h-full [&_[data-region=sidebar]]:w-full"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{t('input.sheetTitle')}</SheetTitle>
                <SheetDescription>{t('input.sheetDescription')}</SheetDescription>
              </SheetHeader>
              <Sidebar />
            </SheetContent>
          </Sheet>
        </>
      )}
      <ProjectsSheet />
      <ExportFeature />
      <MobileWarning />
    </Providers>
  )
}
