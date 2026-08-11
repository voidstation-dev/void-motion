/**
 * Crop tool service (M11).
 *
 * Coordinates the crop tool between the React UI, the typed layer + selection
 * Zustand stores, and the legacy runtime. Mirrors the legacy crop tool
 * (`legacy/index.html:9436-9718`), ported to a typed service so React owns
 * the crop session contract:
 *
 * ```text
 * React crop UI → crop service → layer store + legacy adapter
 * ```
 *
 * Legacy behavior parity (vs `legacy/index.html`):
 *   - `activateCropTool` (9446): no-op if no selected layer or while playing;
 *     initializes the crop rect to the layer's clamped bounds; enters crop
 *     mode (legacy uses an implicit `_cropState` + `.active` CSS; we use the
 *     selection store's `editorMode = 'crop'`).
 *   - drag (9675-9713): move/resize/draw-new-rect via the pure `applyCropDrag`,
 *     updating only the temporary `CropSession.rect` (NOT project state —
 *     "use temporary tool state rather than writing every pointer movement
 *     into project state").
 *   - `resetCropRect` (9491): reset the rect to the layer's current bounds.
 *   - `cancelCrop` (9482): exit crop mode, no project mutation, no undo.
 *   - `confirmCrop` (9504): push an undo snapshot; stash the original source
 *     geometry (non-destructive, first-crop only); apply the crop rect to the
 *     layer's transform + `resizePct = 100`; delegate the rasterize to the
 *     legacy `confirmCrop` when present (it rebuilds `layer.img` from
 *     `_origImg`); reschedule autosave.
 *
 * Per M11 exit criteria: cancel produces no project mutation; confirm produces
 * the same output; reset matches; crop fixtures pass.
 */
import { useLayerStore, useSelectionStore, usePlaybackStore, useCanvasStore } from '@/app/store'
import type { LayerId } from '@/types/brand'
import type { ImageLayer } from '@/types/layer'
import {
  initialCropRect,
  resetCropRect,
  applyCropDrag,
  cropRectToImageSpace,
  computeCropSource,
  getCropHandle,
  type CropRect,
  type CropHandle,
  type CropSource,
} from '@/engine/image-processing/crop'

/** Guarded legacy `confirmCrop` (rasterize + redraw + autosave). */
function legacyConfirmCrop(): boolean {
  if (typeof window !== 'undefined' && typeof window.confirmCrop === 'function') {
    window.confirmCrop()
    return true
  }
  return false
}

/** Guarded legacy `cancelCrop`. */
function legacyCancelCrop(): void {
  if (typeof window !== 'undefined' && typeof window.cancelCrop === 'function') {
    window.cancelCrop()
  }
}

/** Guarded legacy `scheduleAutoSave`. */
function legacyScheduleAutoSave(): void {
  if (typeof window !== 'undefined' && typeof window.scheduleAutoSave === 'function') {
    window.scheduleAutoSave()
  }
}

/**
 * The temporary crop-tool session. Mirrors the legacy module-level `_cropState`
 * (`legacy/index.html:9441`): the layer being cropped, the live crop rect, the
 * in-flight drag handle + start point + orig-rect snapshot. This is tool state,
 * NOT project state — it is never persisted and never written into the layer
 * store until `confirm`.
 */
export interface CropSession {
  readonly layerId: LayerId
  rect: CropRect
  dragging: boolean
  dragHandle: CropHandle | null
  startX: number
  startY: number
  origRect: CropRect
}

/**
 * Crop tool service. Holds a single in-flight `CropSession` (mirrors the
 * legacy `_cropState`). The React crop UI calls `activate`/`pointerDown`/
 * `pointerMove`/`pointerUp`/`reset`/`cancel`/`confirm`.
 */
export const cropService = {
  /** The in-flight crop session (null when idle). */
  session: null as CropSession | null,

  /**
   * Enter crop mode for the selected layer. Mirrors `activateCropTool`
   * (`legacy/index.html:9446-9480`): no-op if no layer is selected or while
   * playing. Initializes the crop rect to the layer's clamped bounds.
   */
  activate(): boolean {
    if (usePlaybackStore.getState().status === 'playing') return false
    const selectedId = useSelectionStore.getState().selectedLayerId
    if (selectedId === null) return false
    const layer = useLayerStore.getState().layers.find((l) => l.id === selectedId)
    if (!layer) return false
    const canvas = useCanvasStore.getState().canvas
    const bounds = {
      width: canvas?.size.width ?? 1280,
      height: canvas?.size.height ?? 720,
    }
    const t = layer.transform
    const rect = initialCropRect(t.x, t.y, t.width, t.height, bounds)
    this.session = {
      layerId: selectedId,
      rect,
      dragging: false,
      dragHandle: null,
      startX: 0,
      startY: 0,
      origRect: rect,
    }
    useSelectionStore.getState().setEditorMode('crop')
    return true
  },

  /** The current crop rect (null when no session). */
  getRect(): CropRect | null {
    return this.session ? { ...this.session.rect } : null
  },

  /**
   * Pointer-down on the crop overlay. Mirrors the legacy mousedown
   * (`legacy/index.html:9650-9660`): records the drag handle (from hit-test),
   * the start point, and the orig-rect snapshot.
   */
  pointerDown(canvasX: number, canvasY: number): void {
    const session = this.session
    if (!session) return
    const handle = getCropHandleFor(canvasX, canvasY, session.rect)
    session.dragging = true
    session.dragHandle = handle
    session.startX = canvasX
    session.startY = canvasY
    session.origRect = { ...session.rect }
  },

  /**
   * Pointer-move on the crop overlay. Mirrors the legacy mousemove drag body
   * (`legacy/index.html:9675-9713`): updates the temporary crop rect via the
   * pure `applyCropDrag` (move/resize/draw-new-rect, 20px min, canvas-edge
   * clamp, Shift aspect lock to the CURRENT layer's ratio). Does NOT write to
   * the layer store — the rect is tool state until `confirm`.
   */
  pointerMove(canvasX: number, canvasY: number, shiftKey: boolean): void {
    const session = this.session
    if (!session || !session.dragging) return
    const canvas = useCanvasStore.getState().canvas
    const bounds = {
      width: canvas?.size.width ?? 1280,
      height: canvas?.size.height ?? 720,
    }
    const layer = useLayerStore.getState().layers.find((l) => l.id === session.layerId)
    const layerAspect = layer ? layer.transform.width / layer.transform.height : undefined
    session.rect = applyCropDrag(
      session.dragHandle,
      session.origRect,
      session.startX,
      session.startY,
      canvasX,
      canvasY,
      bounds,
      shiftKey,
      layerAspect,
    )
  },

  /** Pointer-up: clears the dragging flag (does NOT commit). Legacy 9716-9718. */
  pointerUp(): void {
    if (this.session) this.session.dragging = false
  },

  /**
   * Reset the crop rect to the layer's current bounds. Mirrors `resetCropRect`
   * (`legacy/index.html:9491-9502`). UI-only; does NOT restore the original
   * image and does NOT mutate project state.
   */
  reset(): void {
    const session = this.session
    if (!session) return
    const layer = useLayerStore.getState().layers.find((l) => l.id === session.layerId)
    if (!layer) return
    const canvas = useCanvasStore.getState().canvas
    const bounds = {
      width: canvas?.size.width ?? 1280,
      height: canvas?.size.height ?? 720,
    }
    const t = layer.transform
    session.rect = resetCropRect(t.x, t.y, t.width, t.height, bounds)
  },

  /**
   * Cancel the crop session. Mirrors `cancelCrop` (`legacy/index.html:9482`):
   * exit crop mode, no project mutation, no undo snapshot.
   */
  cancel(): void {
    this.session = null
    useSelectionStore.getState().setEditorMode('image')
    legacyCancelCrop()
  },

  /**
   * Confirm the crop. Mirrors `confirmCrop` (`legacy/index.html:9504-9556`):
   *   - push an undo snapshot;
   *   - stash the original source geometry (non-destructive, first-crop only);
   *   - apply the crop rect to the layer's transform + `resizePct = 100`;
   *   - delegate the rasterize to the legacy `confirmCrop` when present (it
   *     rebuilds `layer.img` from `_origImg` and reschedules autosave).
   *
   * Returns false if there is no session (no-op).
   */
  confirm(): boolean {
    const session = this.session
    if (!session) return false
    const layer = useLayerStore.getState().layers.find((l) => l.id === session.layerId)
    if (!layer) {
      this.cancel()
      return false
    }
    // Push an undo snapshot before mutating (legacy 9506).
    useLayerStore.getState().pushUndo()

    const rect = session.rect
    // Stash the original source geometry (non-destructive, first-crop only).
    // Mirrors `if (!layer._origImg)` (legacy 9510-9516).
    const img = layer as ImageLayer
    const existing = img.sourceMetadata.cropSource
    const cropSource = computeCropSource(
      existing,
      layer.transform.x,
      layer.transform.y,
      layer.transform.width,
      layer.transform.height,
    )

    // Apply the crop rect to the layer transform + resizePct = 100 (legacy 9541-9547).
    useLayerStore.getState().updateLayer(session.layerId, {
      transform: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, rotation: 0 },
      resizePct: 100,
      sourceMetadata: { ...img.sourceMetadata, cropSource },
    })

    // Delegate the rasterize + redraw + autosave to the legacy runtime when
    // present. The legacy `confirmCrop` rebuilds `layer.img` from `_origImg`
    // using the canvas↔image-space mapping (cropRectToImageSpace) and reschedules
    // autosave. When the legacy runtime is not co-hosted (pre-M16), the typed
    // store update above is the only effect.
    if (!legacyConfirmCrop()) {
      legacyScheduleAutoSave()
    }

    // Exit crop mode.
    this.session = null
    useSelectionStore.getState().setEditorMode('image')
    return true
  },

  /** True when a crop session is in flight. */
  isActive(): boolean {
    return this.session !== null
  },
}

/** Hit-test a crop handle (exposed for the overlay). */
export function getCropHandleFor(px: number, py: number, rect: CropRect): CropHandle | null {
  return getCropHandle(px, py, rect)
}

export { cropRectToImageSpace, computeCropSource }
export type { CropRect, CropHandle, CropSource }
