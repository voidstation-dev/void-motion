/**
 * M06 global controls + shortcuts tests.
 *
 * Verifies the global-controls service delegates undo/redo/export to the
 * legacy runtime through guarded `window.*` calls and mirrors state into the
 * typed stores, and that the keyboard shortcuts hook fires the right service
 * methods for Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { globalControlsService } from '@/app/services/global-controls-service'
import { useLayerStore, useExportStore, useUiStore } from '@/app/store'
import { makeLayer } from './helpers/layers'

function installLegacyUndoRedo(
  opts: { undo?: () => void; redo?: () => void; openExportBanner?: () => void } = {},
): void {
  ;(window as unknown as Record<string, unknown>).undo = opts.undo ?? vi.fn()
  ;(window as unknown as Record<string, unknown>).redo = opts.redo ?? vi.fn()
  ;(window as unknown as Record<string, unknown>).openExportBanner =
    opts.openExportBanner ?? vi.fn()
}

function clearLegacy(): void {
  delete (window as unknown as Record<string, unknown>).undo
  delete (window as unknown as Record<string, unknown>).redo
  delete (window as unknown as Record<string, unknown>).openExportBanner
  delete (window as unknown as Record<string, unknown>).closeExportBanner
}

beforeEach(() => {
  useLayerStore.getState().clear()
  useExportStore.getState().resetJob()
  clearLegacy()
})

afterEach(() => {
  useLayerStore.getState().clear()
  clearLegacy()
  vi.useRealTimers()
})

describe('M06 globalControlsService', () => {
  it('canUndo/canRedo are false when legacy not booted', () => {
    // Seed the store so depth is > 0, but legacy not booted → still false.
    useLayerStore.getState().addLayer(makeLayer(1))
    useLayerStore.getState().pushUndo()
    expect(globalControlsService.canUndo()).toBe(false)
    expect(globalControlsService.canRedo()).toBe(false)
  })

  it('canUndo is true when legacy booted + store has undo depth', () => {
    installLegacyUndoRedo()
    useLayerStore.getState().addLayer(makeLayer(1))
    expect(globalControlsService.canUndo()).toBe(true)
  })

  it('undo delegates to window.undo and mirrors the stack swap in the store', () => {
    const undoFn = vi.fn()
    installLegacyUndoRedo({ undo: undoFn })
    useLayerStore.getState().addLayer(makeLayer(1))
    globalControlsService.undo()
    expect(undoFn).toHaveBeenCalled()
    // Store mirror: undo pops the undo stack + pushes redo.
    expect(useLayerStore.getState().undoStack.length).toBe(0)
    expect(useLayerStore.getState().redoStack.length).toBe(1)
  })

  it('redo delegates to window.redo and mirrors the stack swap', () => {
    const redoFn = vi.fn()
    installLegacyUndoRedo({ redo: redoFn })
    useLayerStore.getState().addLayer(makeLayer(1))
    useLayerStore.getState().undo()
    globalControlsService.redo()
    expect(redoFn).toHaveBeenCalled()
    expect(useLayerStore.getState().redoStack.length).toBe(0)
    expect(useLayerStore.getState().undoStack.length).toBe(1)
  })

  it('undo is a no-op when the undo stack is empty', () => {
    const undoFn = vi.fn()
    installLegacyUndoRedo({ undo: undoFn })
    globalControlsService.undo()
    expect(undoFn).not.toHaveBeenCalled()
  })

  it('openExport delegates to exportService (M15) and opens the UI dialog', () => {
    installLegacyUndoRedo({}) // Mock legacy boot
    useExportStore.setState({ jobStatus: 'failed' })
    useUiStore.setState({ exportDialogOpen: false })

    globalControlsService.openExport()

    expect(useUiStore.getState().exportDialogOpen).toBe(true)
    expect(useExportStore.getState().jobStatus).toBe('idle')
  })

  it('openExport is a no-op when legacy not booted', () => {
    useUiStore.setState({ exportDialogOpen: false })
    globalControlsService.openExport()
    expect(useUiStore.getState().exportDialogOpen).toBe(false)
  })

  it('undoDepth/redoDepth read the typed store mirror', () => {
    installLegacyUndoRedo()
    useLayerStore.getState().addLayer(makeLayer(1))
    expect(globalControlsService.undoDepth()).toBe(1)
    expect(globalControlsService.redoDepth()).toBe(0)
  })
})

describe('M06 useGlobalShortcuts hook', () => {
  it('Ctrl+Z dispatches undo', async () => {
    const { useGlobalShortcuts } = await import('@/app/hooks/useGlobalShortcuts')
    const undoSpy = vi.spyOn(globalControlsService, 'undo').mockImplementation(() => {})
    const { renderHook } = await import('@testing-library/react')
    const { unmount } = renderHook(() => useGlobalShortcuts())
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    expect(undoSpy).toHaveBeenCalledTimes(1)
    undoSpy.mockRestore()
    unmount()
  })

  it('Ctrl+Shift+Z dispatches redo', async () => {
    const { useGlobalShortcuts } = await import('@/app/hooks/useGlobalShortcuts')
    const redoSpy = vi.spyOn(globalControlsService, 'redo').mockImplementation(() => {})
    const { renderHook } = await import('@testing-library/react')
    const { unmount } = renderHook(() => useGlobalShortcuts())
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Z', ctrlKey: true, shiftKey: true }))
    expect(redoSpy).toHaveBeenCalledTimes(1)
    redoSpy.mockRestore()
    unmount()
  })

  it('Ctrl+Z while typing in an INPUT does not dispatch undo', async () => {
    const { useGlobalShortcuts } = await import('@/app/hooks/useGlobalShortcuts')
    const undoSpy = vi.spyOn(globalControlsService, 'undo').mockImplementation(() => {})
    const { renderHook } = await import('@testing-library/react')
    const { unmount } = renderHook(() => useGlobalShortcuts())
    // Simulate an input focus target.
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    expect(undoSpy).not.toHaveBeenCalled()
    undoSpy.mockRestore()
    unmount()
    document.body.removeChild(input)
  })

  it('plain Z (no modifier) does not dispatch undo', async () => {
    const { useGlobalShortcuts } = await import('@/app/hooks/useGlobalShortcuts')
    const undoSpy = vi.spyOn(globalControlsService, 'undo').mockImplementation(() => {})
    const { renderHook } = await import('@testing-library/react')
    const { unmount } = renderHook(() => useGlobalShortcuts())
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }))
    expect(undoSpy).not.toHaveBeenCalled()
    undoSpy.mockRestore()
    unmount()
  })
})
