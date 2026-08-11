/**
 * Export store (M04) — bounded Zustand domain store for export configuration
 * and in-flight export job state.
 *
 * Holds the current video export config (format/quality/png/fps) and the job
 * status. Per M04: serializable only; the actual MediaRecorder / mp4-muxer
 * runtime lives in the engine (M03 boundary, M15 UI).
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { ExportFormat, ExportQuality, VideoExportConfig } from '@/types/export'
import { DEFAULT_VIDEO_EXPORT_CONFIG } from '@/types/export'

/** Export job lifecycle (the legacy app has an implicit version of this). */
export type ExportJobStatus =
  'idle' | 'preparing' | 'rendering' | 'encoding' | 'finalizing' | 'done' | 'failed' | 'cancelled'

export interface ExportState {
  readonly config: VideoExportConfig
  readonly jobStatus: ExportJobStatus
  /** Job progress in [0,1]. */
  readonly jobProgress: number
  /** Last export error message (legacy surfaces inline). */
  readonly error: string | null

  // ── actions ──
  setFormat(format: ExportFormat): void
  setQuality(quality: ExportQuality): void
  setIncludeFinalPng(include: boolean): void
  setJobStatus(status: ExportJobStatus): void
  setJobProgress(progress: number): void
  setError(error: string | null): void
  resetJob(): void
}

export const useExportStore = create<ExportState>()(
  immer((set) => ({
    config: DEFAULT_VIDEO_EXPORT_CONFIG,
    jobStatus: 'idle',
    jobProgress: 0,
    error: null,

    setFormat(format) {
      set((s) => {
        s.config = { ...s.config, format }
      })
    },
    setQuality(quality) {
      set((s) => {
        s.config = { ...s.config, quality }
      })
    },
    setIncludeFinalPng(include) {
      set((s) => {
        s.config = { ...s.config, includeFinalPng: include }
      })
    },
    setJobStatus(status) {
      set((s) => {
        s.jobStatus = status
      })
    },
    setJobProgress(progress) {
      set((s) => {
        s.jobProgress = Math.min(Math.max(progress, 0), 1)
      })
    },
    setError(error) {
      set((s) => {
        s.error = error
      })
    },
    resetJob() {
      set((s) => {
        s.jobStatus = 'idle'
        s.jobProgress = 0
        s.error = null
      })
    },
  })),
)

// ── selectors ──

export function selectExportConfig(s: ExportState): VideoExportConfig {
  return s.config
}

export function selectExportJobStatus(s: ExportState): ExportJobStatus {
  return s.jobStatus
}

export function selectExportProgress(s: ExportState): number {
  return s.jobProgress
}
