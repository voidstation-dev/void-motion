/**
 * Canvas store (M04) — bounded Zustand domain store for canvas configuration.
 *
 * Holds the current canvas size, aspect ratio, resolution preset, and
 * background. Per M04: serializable only; CSS display dimensions are a
 * runtime concern, not stored here.
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  AspectRatio,
  CanvasBackground,
  CanvasSettings,
  ResolutionPreset,
} from '@/types/canvas'
import { CANVAS_SIZE_TABLE } from '@/types/canvas'

export interface CanvasState {
  readonly canvas: CanvasSettings | null

  // ── actions ──
  setCanvas(canvas: CanvasSettings): void
  setAspectRatio(ratio: AspectRatio): void
  setResolutionPreset(preset: ResolutionPreset): void
  setBackground(background: CanvasBackground): void
  clear(): void
}

export const useCanvasStore = create<CanvasState>()(
  immer((set) => ({
    canvas: null,

    setCanvas(canvas) {
      set((s) => {
        s.canvas = canvas
      })
    },
    setAspectRatio(ratio) {
      set((s) => {
        if (!s.canvas) return
        // Preserve the current resolution preset; derive new pixel size.
        const preset = s.canvas.resolutionPreset
        if (preset === 'custom') return
        const dims = CANVAS_SIZE_TABLE[ratio][preset]
        s.canvas = {
          ...s.canvas,
          aspectRatio: ratio,
          size: { width: dims[0], height: dims[1] },
        }
      })
    },
    setResolutionPreset(preset) {
      set((s) => {
        if (!s.canvas) return
        if (preset === 'custom') {
          s.canvas = { ...s.canvas, resolutionPreset: 'custom' }
          return
        }
        const ratio = s.canvas.aspectRatio
        const dims = CANVAS_SIZE_TABLE[ratio][preset]
        s.canvas = {
          ...s.canvas,
          resolutionPreset: preset,
          size: { width: dims[0], height: dims[1] },
        }
      })
    },
    setBackground(background) {
      set((s) => {
        if (!s.canvas) return
        s.canvas = { ...s.canvas, background }
      })
    },
    clear() {
      set((s) => {
        s.canvas = null
      })
    },
  })),
)

// ── selectors ──

export function selectCanvas(s: CanvasState): CanvasSettings | null {
  return s.canvas
}

export function selectCanvasDimensions(s: CanvasState): { width: number; height: number } | null {
  return s.canvas ? { width: s.canvas.size.width, height: s.canvas.size.height } : null
}

export function selectAspectRatio(s: CanvasState): AspectRatio | null {
  return s.canvas ? s.canvas.aspectRatio : null
}

export function selectResolutionPreset(s: CanvasState): ResolutionPreset | null {
  return s.canvas ? s.canvas.resolutionPreset : null
}
