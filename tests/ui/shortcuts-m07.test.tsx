/**
 * M07 keyboard shortcut tests — Space (play/pause) + undo-while-playing block.
 *
 * Verifies the `useGlobalShortcuts` hook:
 *   - Space (no modifier, not typing) dispatches `playbackService.playPause`.
 *   - Space is ignored while typing in an INPUT/TEXTAREA.
 *   - Space is ignored when a modifier is held.
 *   - Ctrl+Z is blocked (no undo) while playback status is 'playing' (legacy
 *     parity: legacy/index.html:5199 blocks undo + toasts "Pause playback
 *     to undo").
 *   - Ctrl+Z still dispatches undo when not playing.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { playbackService } from '@/app/services/playback-service'
import { globalControlsService } from '@/app/services/global-controls-service'
import { usePlaybackStore } from '@/app/store'

function clearLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  delete w.togglePlay
  delete w.restartAnim
  delete w.undo
  delete w.redo
}

beforeEach(() => {
  usePlaybackStore.getState().reset()
  clearLegacy()
})

afterEach(() => {
  clearLegacy()
  vi.restoreAllMocks()
})

async function mountShortcuts(): Promise<() => void> {
  const { useGlobalShortcuts } = await import('@/app/hooks/useGlobalShortcuts')
  const { renderHook } = await import('@testing-library/react')
  const { unmount } = renderHook(() => useGlobalShortcuts())
  return unmount
}

describe('M07 useGlobalShortcuts — Space (play/pause)', () => {
  it('Space dispatches playbackService.playPause', async () => {
    const spy = vi.spyOn(playbackService, 'playPause').mockImplementation(() => {})
    const unmount = await mountShortcuts()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
    unmount()
  })

  it('Space is ignored while typing in an INPUT', async () => {
    const spy = vi.spyOn(playbackService, 'playPause').mockImplementation(() => {})
    const unmount = await mountShortcuts()
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
    unmount()
    document.body.removeChild(input)
  })

  it('Space is ignored when a modifier is held', async () => {
    const spy = vi.spyOn(playbackService, 'playPause').mockImplementation(() => {})
    const unmount = await mountShortcuts()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', ctrlKey: true }))
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
    unmount()
  })
})

describe('M07 useGlobalShortcuts — undo blocked while playing', () => {
  it('Ctrl+Z is a no-op while playback status is playing', async () => {
    const undoSpy = vi.spyOn(globalControlsService, 'undo').mockImplementation(() => {})
    const unmount = await mountShortcuts()
    usePlaybackStore.getState().setStatus('playing')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    expect(undoSpy).not.toHaveBeenCalled()
    undoSpy.mockRestore()
    unmount()
  })

  it('Ctrl+Z dispatches undo when not playing', async () => {
    const undoSpy = vi.spyOn(globalControlsService, 'undo').mockImplementation(() => {})
    const unmount = await mountShortcuts()
    usePlaybackStore.getState().setStatus('idle')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    expect(undoSpy).toHaveBeenCalledOnce()
    undoSpy.mockRestore()
    unmount()
  })

  it('Ctrl+Y and Ctrl+Shift+Z dispatch redo', async () => {
    const redoSpy = vi.spyOn(globalControlsService, 'redo').mockImplementation(() => {})
    const unmount = await mountShortcuts()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }))
    expect(redoSpy).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true }))
    expect(redoSpy).toHaveBeenCalledTimes(2)

    redoSpy.mockRestore()
    unmount()
  })
})

describe('useGlobalShortcuts — Delete / Backspace layer deletion', () => {
  it('Delete and Backspace dispatch layerService.removeLayer for selected layer', async () => {
    const { layerService } = await import('@/app/services/layer-service')
    const { useSelectionStore } = await import('@/app/store')
    const removeSpy = vi.spyOn(layerService, 'removeLayer').mockImplementation(() => {})
    const unmount = await mountShortcuts()

    useSelectionStore.getState().selectLayer('layer-1' as any)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))
    expect(removeSpy).toHaveBeenCalledWith('layer-1')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }))
    expect(removeSpy).toHaveBeenCalledTimes(2)

    removeSpy.mockRestore()
    unmount()
  })

  it('Delete is ignored when typing in an INPUT', async () => {
    const { layerService } = await import('@/app/services/layer-service')
    const { useSelectionStore } = await import('@/app/store')
    const removeSpy = vi.spyOn(layerService, 'removeLayer').mockImplementation(() => {})
    const unmount = await mountShortcuts()

    useSelectionStore.getState().selectLayer('layer-1' as any)
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))
    expect(removeSpy).not.toHaveBeenCalled()

    removeSpy.mockRestore()
    unmount()
    document.body.removeChild(input)
  })
})
