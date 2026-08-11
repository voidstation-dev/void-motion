/**
 * Global keyboard shortcuts hook (M06).
 *
 * Wires the legacy `document.addEventListener('keydown', …)` handler
 * (legacy/index.html:5167) into the React shell. Per the M06 plan:
 * "shortcuts match legacy". M06 owns the undo/redo shortcuts; Space
 * (play/pause) and Delete (remove layer) are no-ops here and land in M07
 * (playback) and M10 (selection) respectively — but the handler structure
 * mirrors the legacy one so later migrations fill in the branches.
 *
 * Legacy behavior (legacy/index.html:5167):
 *   - Ignore when typing in an INPUT/TEXTAREA.
 *   - Ctrl/Cmd+Z           → undo (block while playing, toast "Pause playback")
 *   - Ctrl/Cmd+Shift+Z | Y → redo
 *
 * The hook installs one `keydown` listener on mount and removes it on
 * unmount. It is mounted once at the App root.
 */
import { useEffect } from 'react'
import { globalControlsService } from '@/app/services/global-controls-service'

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

      // Undo / Redo — only when not typing + a modifier is held.
      if (!mod || typing) return

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        globalControlsService.undo()
        return
      }
      if ((e.key === 'Z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        globalControlsService.redo()
        return
      }
      // Intentionally no-op for other keys here — Space/Delete land in
      // M07/M10. Keep the branch structure to ease those migrations.
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])
}
