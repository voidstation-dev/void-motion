/**
 * Selection store (M04) — bounded Zustand domain store for selection state.
 *
 * Tracks the currently-selected layer and the active edit/tool mode. Per M04:
 * serializable only; pointer/transform sessions are runtime concerns (M10).
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { LayerId } from '@/types/brand'

/** Editor interaction mode. Legacy `state.mode` is 'image' | 'text'. */
export type EditorMode = 'image' | 'text' | 'crop' | 'slicer'

/** Active slicer sub-mode (legacy `state.slicerMode`). */
export type SlicerMode = 'grid' | 'rectangle' | 'freehand' | null

export interface SelectionState {
  readonly selectedLayerId: LayerId | null
  readonly editorMode: EditorMode
  readonly slicerMode: SlicerMode

  // ── actions ──
  selectLayer(id: LayerId | null): void
  setEditorMode(mode: EditorMode): void
  setSlicerMode(mode: SlicerMode): void
  clear(): void
}

export const useSelectionStore = create<SelectionState>()(
  immer((set) => ({
    selectedLayerId: null,
    editorMode: 'image',
    slicerMode: null,

    selectLayer(id) {
      set((s) => {
        s.selectedLayerId = id
      })
    },
    setEditorMode(mode) {
      set((s) => {
        s.editorMode = mode
      })
    },
    setSlicerMode(mode) {
      set((s) => {
        s.slicerMode = mode
      })
    },
    clear() {
      set((s) => {
        s.selectedLayerId = null
        s.editorMode = 'image'
        s.slicerMode = null
      })
    },
  })),
)

// ── selectors ──

export function selectSelectedLayerId(s: SelectionState): LayerId | null {
  return s.selectedLayerId
}

export function selectEditorMode(s: SelectionState): EditorMode {
  return s.editorMode
}

export function selectSlicerMode(s: SelectionState): SlicerMode {
  return s.slicerMode
}
