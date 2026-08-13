import { useEffect, useRef, type ReactElement } from 'react'
import {
  connectLegacyRuntime,
  disconnectLegacyRuntime,
} from '@/engine/legacy/legacy-runtime-bridge'
import { layerService } from '@/app/services/layer-service'
import { canvasControlsService } from '@/app/services/canvas-controls-service'
import { playbackService } from '@/app/services/playback-service'
import { projectService } from '@/app/services/project-service'
import { useLayerStore } from '@/app/store'
import { useTranslation } from 'react-i18next'

const SYNC_INTERVAL_MS = 120

export function LegacyRuntimeHost(): ReactElement {
  const { t } = useTranslation('editor')
  const frameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    let syncTimer: ReturnType<typeof setInterval> | null = null
    let projectsBooted = false

    const bootProjects = (): void => {
      const runtime = frame.contentWindow as
        (Window & { __VOID_MOTION_STORAGE_READY__?: boolean }) | null
      if (projectsBooted || runtime?.__VOID_MOTION_STORAGE_READY__ !== true) return
      projectsBooted = true
      void projectService.bootstrap().then(() => projectService.hydrateCurrentFromLegacy())
    }

    const sync = (): void => {
      bootProjects()
      layerService.syncLayersFromLegacy()
      canvasControlsService.syncCanvasFromLegacy()
      playbackService.syncStatusFromLegacy()
      const runtime = frame.contentWindow as
        (Window & { __VOID_MOTION_HISTORY__?: { undo: number; redo: number } }) | null
      const history = runtime?.__VOID_MOTION_HISTORY__
      if (history) useLayerStore.getState().syncHistoryDepth(history.undo, history.redo)
    }

    const connect = (): void => {
      const runtime = frame.contentWindow
      if (!runtime || !connectLegacyRuntime(runtime)) return
      sync()
      syncTimer = setInterval(sync, SYNC_INTERVAL_MS)
    }

    frame.addEventListener('load', connect)
    if (frame.contentDocument?.readyState === 'complete') connect()

    return () => {
      frame.removeEventListener('load', connect)
      if (syncTimer !== null) clearInterval(syncTimer)
      if (frame.contentWindow) disconnectLegacyRuntime(frame.contentWindow)
    }
  }, [])

  return (
    <iframe
      ref={frameRef}
      src="/legacy/index.html?migration-runtime=1"
      title={t('runtimeTitle')}
      aria-hidden="true"
      tabIndex={-1}
      className="pointer-events-none fixed -left-[10000px] top-0 h-[900px] w-[1600px] opacity-0"
    />
  )
}
