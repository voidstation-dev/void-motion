import type { LegacyInkplainerState } from '../legacy/legacy-state.types'
import type { CanvasHandles } from '../legacy/legacy-types'
import { renderBackground } from './background-renderer'
import { renderStaticLayers } from './layer-compositor'
import { renderSelection } from './selection-renderer'

/**
 * Root coordinator for static frame rendering.
 * Extracts the `redrawLayersOnCanvas` top-level orchestration from legacy `index.html`.
 */

export function renderStaticFrame(
  handles: CanvasHandles,
  state: LegacyInkplainerState,
  editingId: number | null,
): void {
  const { main, selection } = handles
  const mainCtx = main.getContext('2d')
  const selectCtx = selection.getContext('2d')

  if (!mainCtx || !selectCtx) {
    return
  }

  // 1. Clear main canvas
  mainCtx.clearRect(0, 0, state.canvasW, state.canvasH)

  // 2. Render background
  // `state.canvasBg` might be undefined in strict typing but we assume it's set by legacy boot
  const bg = state.canvasBg || { type: 'solid', val: 'white' }
  renderBackground(
    mainCtx,
    bg,
    state.canvasW,
    state.canvasH,
    !!state._slotMode, // boolean flag for slot mode
    state.bgCanvas as HTMLCanvasElement | undefined,
  )

  // 3. Render static layers
  // Legacy layer drawing requires layers to be an array
  renderStaticLayers(mainCtx, state.layers || [], editingId)

  // 4. Render selection overlay
  // selection layer finding
  const selectedLayer = state.layers?.find((l) => l.id === state.selectedLayerId) || null
  renderSelection(selectCtx, selectedLayer, !!state.playing)
}
