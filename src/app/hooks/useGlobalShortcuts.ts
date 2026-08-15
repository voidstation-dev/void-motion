/**
 * Global keyboard shortcuts hook (M06/M07).
 *
 * Wires the legacy `document.addEventListener('keydown', …)` handler
 * (legacy/index.html:5167) into the React shell. Per the migration plan:
 * "shortcuts match legacy".
 *
 * M06 owns the undo/redo shortcuts. M07 wires the Space (play/pause) branch
 * and restores the legacy "block undo while playing" guard (legacy 5197):
 * Ctrl/Cmd+Z is a no-op (legacy toasts "Pause playback to undo") when the
 * animation is playing. Delete/Backspace (remove selected layer) remains a
 * no-op here and lands in M10 (selection) — but the branch structure mirrors
 * the legacy one so later migrations fill it in.
 *
 * Legacy behavior (legacy/index.html:5167):
 *   - Ignore when typing in an INPUT/TEXTAREA.
 *   - Escape → cancel text placement / close editor (M_text, later migration).
 *   - Space (no modifier, not typing) → togglePlay.
 *   - Delete/Backspace (no modifier, not typing) → remove selected layer.
 *   - Ctrl/Cmd+Z → undo, BLOCKED while playing (toast "Pause playback to undo").
 *   - Ctrl/Cmd+Shift+Z | Y → redo.
 *
 * The hook installs one `keydown` listener on mount and removes it on
 * unmount. It is mounted once at the App root.
 */
import { useEffect } from 'react'
import { globalControlsService } from '@/app/services/global-controls-service'
import { playbackService } from '@/app/services/playback-service'
import { usePlaybackStore, useSelectionStore } from '@/app/store'
import { layerService } from '@/app/services/layer-service'

export function useGlobalShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      // Legacy checks `document.activeElement` (legacy/index.html:5168),
      // not `e.target`, because the listener is on `document` and `e.target`
      // is the event's dispatch source (often `body`), not the focused field.
      const active = document.activeElement as Element | null
      const tag = active?.tagName ?? ''
      const typing = tag === 'INPUT' || tag === 'TEXTAREA'
      const mod = e.ctrlKey || e.metaKey

      // Space — play / pause (no modifier, not typing). Legacy uses
      // `e.code === 'Space'` (legacy/index.html:5174).
      if (e.code === 'Space' && !mod && !typing) {
        e.preventDefault()
        playbackService.playPause()
        return
      }

      // Modifier shortcuts (Ctrl/Cmd). Legacy returns early on `!mod`.
      if (!mod || typing) return

      if (e.key === 'z' && !e.shiftKey) {
        // Legacy blocks undo while playing and toasts "Pause playback to undo"
        // (legacy/index.html:5199). We preserve the block; the toast is a
        // legacy-only side-effect (no-op in the React shell).
        if (usePlaybackStore.getState().status === 'playing') return
        e.preventDefault()
        globalControlsService.undo()
        return
      }
      if ((e.key === 'Z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        globalControlsService.redo()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !typing) {
        e.preventDefault()
        const selectedId = useSelectionStore.getState().selectedLayerId
        if (selectedId !== null) {
          layerService.removeLayer(selectedId)
        }
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])
}
