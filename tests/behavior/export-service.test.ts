import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportService } from '@/app/services/export-service'
import { useExportStore, useUiStore } from '@/app/store'
import { engine } from '@/engine/engine'

vi.mock('@/engine/engine', () => ({
  engine: {
    exportVideo: vi.fn(),
  },
}))

describe('Export Service', () => {
  beforeEach(() => {
    useExportStore.setState({
      config: { format: 'webm', quality: 'medium', includeFinalPng: false, fps: 30 },
      jobStatus: 'idle',
      jobProgress: 0,
      error: null,
    })
    useUiStore.setState({ exportDialogOpen: false })
    vi.clearAllMocks()
    ;(window as any).VideoEncoder = undefined
  })

  it('opens dialog and resets job state', () => {
    useExportStore.setState({ jobStatus: 'failed', error: 'test' })
    exportService.openDialog()
    expect(useUiStore.getState().exportDialogOpen).toBe(true)
    expect(useExportStore.getState().jobStatus).toBe('idle')
    expect(useExportStore.getState().error).toBeNull()
  })

  it('falls back from mp4 to webm if VideoEncoder is not available', () => {
    useExportStore.getState().setFormat('mp4')
    exportService.openDialog()
    expect(useExportStore.getState().config.format).toBe('webm')
  })

  it('keeps mp4 if VideoEncoder is available', () => {
    ;(window as any).VideoEncoder = class {}
    useExportStore.getState().setFormat('mp4')
    exportService.openDialog()
    expect(useExportStore.getState().config.format).toBe('mp4')
  })

  it('closes dialog', () => {
    useUiStore.setState({ exportDialogOpen: true })
    exportService.closeDialog()
    expect(useUiStore.getState().exportDialogOpen).toBe(false)
  })

  it('sets config properties', () => {
    exportService.setFormat('mp4')
    expect(useExportStore.getState().config.format).toBe('mp4')

    exportService.setQuality('high')
    expect(useExportStore.getState().config.quality).toBe('high')

    exportService.setIncludePng(true)
    expect(useExportStore.getState().config.includeFinalPng).toBe(true)
  })

  it('starts export and handles progress', async () => {
    vi.mocked(engine.exportVideo).mockImplementation(async (_config, callbacks) => {
      callbacks.onProgress(0.5, 'Recording...')
      callbacks.onComplete()
    })

    await exportService.startExport()
    expect(engine.exportVideo).toHaveBeenCalled()
    expect(useExportStore.getState().jobStatus).toBe('done')
    expect(useExportStore.getState().jobProgress).toBe(1)
  })

  it('handles export errors', async () => {
    vi.mocked(engine.exportVideo).mockImplementation(async (_config, callbacks) => {
      callbacks.onError(new Error('Export failed'))
    })

    await exportService.startExport()
    expect(useExportStore.getState().jobStatus).toBe('failed')
    expect(useExportStore.getState().error).toBe('Export failed')
  })

  it('does not start if already running', async () => {
    useExportStore.setState({ jobStatus: 'encoding' })
    await exportService.startExport()
    expect(engine.exportVideo).not.toHaveBeenCalled()
  })
})
