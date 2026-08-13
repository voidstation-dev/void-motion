import { engine } from '@/engine/engine'
import { useExportStore, useUiStore } from '@/app/store'
import type { ExportFormat, ExportQuality } from '@/types/export'

/**
 * Export service (M15).
 *
 * Coordinates the export pipeline between the React UI, the export/ui stores,
 * and the legacy engine adapter (which houses the MediaRecorder and mp4-muxer
 * implementation).
 */
export const exportService = {
  /** Open the export dialog (M15 React UI). */
  openDialog(): void {
    // Sync the initial format support based on browser
    const hasWebCodecs = typeof (window as any).VideoEncoder !== 'undefined'
    const config = useExportStore.getState().config
    if (!hasWebCodecs && config.format === 'mp4') {
      useExportStore.getState().setFormat('webm')
    }

    useUiStore.getState().setExportDialogOpen(true)
    useExportStore.getState().resetJob()
  },

  /** Close the export dialog. */
  closeDialog(): void {
    useUiStore.getState().setExportDialogOpen(false)
  },

  setFormat(format: ExportFormat): void {
    useExportStore.getState().setFormat(format)
  },

  setQuality(quality: ExportQuality): void {
    useExportStore.getState().setQuality(quality)
  },

  setIncludePng(include: boolean): void {
    useExportStore.getState().setIncludeFinalPng(include)
  },

  /**
   * Start the export process.
   * Delegates the actual recording and chunk muxing to the engine.
   * Pipes progress back to the store.
   */
  async startExport(): Promise<void> {
    const state = useExportStore.getState()
    if (state.jobStatus !== 'idle' && state.jobStatus !== 'failed' && state.jobStatus !== 'cancelled') {
      return
    }

    useExportStore.getState().setJobStatus('preparing')
    useExportStore.getState().setJobProgress(0)
    useExportStore.getState().setError(null)

    try {
      await engine.exportVideo(state.config, {
        onProgress: (progress: number, label: string) => {
          useExportStore.getState().setJobProgress(progress)
          
          if (label === 'Finalizing...' || label.includes('Muxing')) {
            useExportStore.getState().setJobStatus('finalizing')
          } else if (label.includes('Encoding')) {
            useExportStore.getState().setJobStatus('encoding')
          } else if (label.includes('Recording')) {
            useExportStore.getState().setJobStatus('rendering')
          }
        },
        onComplete: () => {
          useExportStore.getState().setJobProgress(1)
          useExportStore.getState().setJobStatus('done')
          // Auto close after success (matches legacy 2.5s delay)
          setTimeout(() => {
            this.closeDialog()
            useExportStore.getState().resetJob()
          }, 2500)
        },
        onError: (err: Error) => {
          useExportStore.getState().setJobStatus('failed')
          useExportStore.getState().setError(err.message)
        },
      })
    } catch (err: unknown) {
      useExportStore.getState().setJobStatus('failed')
      useExportStore.getState().setError(err instanceof Error ? err.message : String(err))
    }
  },
}
