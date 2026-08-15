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
import { textService } from '@/app/services/text-service'

export function useGlobalShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const active = document.activeElement as Element | null
      const tag = active?.tagName ?? ''
      const isContentEditable = (active as HTMLElement | null)?.isContentEditable ?? false
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || isContentEditable
      const mod = e.ctrlKey || e.metaKey

      if (typing) return

      // Escape — cancel text placement / editor
      if (e.key === 'Escape') {
        if (textService.isActive()) {
          textService.closeEditor(false)
          e.preventDefault()
          return
        }
        if (textService.isPlacing()) {
          textService.cancelPlacement()
          e.preventDefault()
          return
        }
      }

      // Space — play / pause (no modifier, not typing)
      if (e.code === 'Space' && !mod) {
        e.preventDefault()
        playbackService.playPause()
        return
      }

      // Delete / Backspace — remove selected layer (no modifier, not typing)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !mod) {
        const selectedId = useSelectionStore.getState().selectedLayerId
        if (selectedId !== null) {
          e.preventDefault()
          layerService.removeLayer(selectedId)
        }
        return
      }

      // Modifier shortcuts (Ctrl/Cmd)
      if (mod) {
        const key = e.key.toLowerCase()
        if (key === 'z' && !e.shiftKey) {
          if (usePlaybackStore.getState().status === 'playing') return
          e.preventDefault()
          globalControlsService.undo()
          return
        }
        if ((key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey)) {
          e.preventDefault()
          globalControlsService.redo()
          return
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])
}
