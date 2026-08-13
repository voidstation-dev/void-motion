import { useCanvasStore } from '@/app/store'
import { callLegacyRuntime } from '@/engine/legacy/legacy-runtime-bridge'
import type { CanvasBackground } from '@/types/canvas'

export const backgroundService = {
  setBackground(background: CanvasBackground): void {
    if (typeof window !== 'undefined' && window.state) {
      window.state.canvasBg =
        background.type === 'gradient'
          ? { type: 'gradient', key: background.key, val: background.val ?? '' }
          : background
      callLegacyRuntime('redrawWithBg')
      window.scheduleAutoSave?.()
    }
    useCanvasStore.getState().setBackground(background)
  },
}
