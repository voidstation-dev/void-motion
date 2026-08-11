/**
 * Layer store (M04) — bounded Zustand domain store for the layer model.
 *
 * Holds the typed layer list of the current project (a discriminated union of
 * ImageLayer / TextLayer) plus layer-group membership and undo/redo depth.
 * Per M04 rules: discriminated unions (never one giant optional Layer type),
 * no runtime objects (HTMLImageElement stays in the asset registry), bounded
 * domain store.
 *
 * Structural mutations (add/delete/reorder) and edits both flow through here.
 * The legacy runtime is synced via the engine adapter (M03) when React
 * becomes the source of truth (M08).
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Layer, ImageLayer, TextLayer } from '@/types/layer'
import type { LayerId } from '@/types/brand'
import type { LayerGroup } from '@/types/project'

/** Maximum undo/redo depth. Legacy `MAX_UNDO = 50` (`legacy/index.html:...`). */
export const MAX_UNDO_DEPTH = 50

export interface LayerState {
  layers: Layer[]
  groups: LayerGroup[]
  /** Undo stack of layer-list snapshots (deep-cloned). */
  undoStack: Layer[][]
  /** Redo stack. */
  redoStack: Layer[][]

  // ── actions ──
  setLayers(layers: readonly Layer[]): void
  addLayer(layer: Layer, at?: number): void
  updateLayer(id: LayerId, patch: Partial<ImageLayer> | Partial<TextLayer>): void
  removeLayer(id: LayerId): void
  reorder(fromIndex: number, toIndex: number): void
  setGroups(groups: readonly LayerGroup[]): void

  /** Push current layers onto undo stack before a mutating action. */
  pushUndo(): void
  undo(): void
  redo(): void
  canUndo(): boolean
  canRedo(): boolean
  clear(): void
}

export const useLayerStore = create<LayerState>()(
  immer((set, get) => ({
    layers: [],
    groups: [],
    undoStack: [],
    redoStack: [],

    setLayers(layers) {
      set((s) => {
        s.layers = layers as Layer[]
      })
    },
    addLayer(layer, at) {
      get().pushUndo()
      set((s) => {
        if (at === undefined || at < 0 || at > s.layers.length) {
          s.layers.push(layer)
        } else {
          s.layers.splice(at, 0, layer)
        }
      })
    },
    updateLayer(id, patch) {
      set((s) => {
        const idx = s.layers.findIndex((l) => l.id === id)
        if (idx < 0) return
        const existing = s.layers[idx]
        if (!existing) return
        s.layers[idx] = { ...existing, ...(patch as Partial<Layer>) } as Layer
      })
    },
    removeLayer(id) {
      get().pushUndo()
      set((s) => {
        s.layers = s.layers.filter((l) => l.id !== id)
      })
    },
    reorder(fromIndex, toIndex) {
      get().pushUndo()
      set((s) => {
        if (
          fromIndex < 0 ||
          fromIndex >= s.layers.length ||
          toIndex < 0 ||
          toIndex > s.layers.length
        )
          return
        const [moved] = s.layers.splice(fromIndex, 1)
        if (!moved) return
        const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex
        s.layers.splice(insertAt, 0, moved)
      })
    },
    setGroups(groups) {
      set((s) => {
        s.groups = groups.map((g) => ({
          ...g,
          layerIds: [...g.layerIds],
        }))
      })
    },
    pushUndo() {
      set((s) => {
        s.undoStack.push([...s.layers])
        if (s.undoStack.length > MAX_UNDO_DEPTH) {
          s.undoStack.shift()
        }
        s.redoStack = []
      })
    },
    undo() {
      set((s) => {
        const prev = s.undoStack.pop()
        if (!prev) return
        s.redoStack.push([...s.layers])
        s.layers = prev
      })
    },
    redo() {
      set((s) => {
        const next = s.redoStack.pop()
        if (!next) return
        s.undoStack.push([...s.layers])
        s.layers = next
      })
    },
    canUndo() {
      return get().undoStack.length > 0
    },
    canRedo() {
      return get().redoStack.length > 0
    },
    clear() {
      set((s) => {
        s.layers = []
        s.groups = []
        s.undoStack = []
        s.redoStack = []
      })
    },
  })),
)

// ── selectors ──

export function selectLayers(s: LayerState): readonly Layer[] {
  return s.layers
}

export function selectVisibleLayers(s: LayerState): readonly Layer[] {
  return s.layers.filter((l) => l.visible)
}

export function selectLayerCount(s: LayerState): number {
  return s.layers.length
}

export function selectCanUndo(s: LayerState): boolean {
  return s.undoStack.length > 0
}

export function selectCanRedo(s: LayerState): boolean {
  return s.redoStack.length > 0
}
