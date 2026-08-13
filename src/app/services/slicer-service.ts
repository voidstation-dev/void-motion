/**
 * Slicer tool service (M12).
 *
 * Coordinates the slicer tool between the React UI, the typed layer +
 * selection Zustand stores, and the legacy runtime. Mirrors the legacy slicer
 * system (`legacy/index.html:9720-10261`), ported to a typed service so React
 * owns the slicer session contract:
 *
 * ```text
 * React slicer UI → slicer service → layer store + legacy adapter
 * ```
 *
 * Legacy behavior parity (vs `legacy/index.html`):
 *   - `openSlicerModal` (9738): no-op if no selected layer; resets the rect +
 *     freehand accumulators; defaults to grid mode; enters slicer mode.
 *   - `switchSlicerTab` (9756): set the mode; re-render the active list; the
 *     other mode's data persists across tab switches within one session.
 *   - rect drag (9973-10043): mousedown starts a drag; mousemove updates the
 *     live preview rect (preview-pixel space); mouseup commits a canvas-space
 *     rect gated by `w > 10 && h > 10` with a `"Slice N"` label.
 *   - freehand draw (9973-10043): mousedown starts a path; mousemove pushes
 *     canvas-space points; mouseup commits the path + bounding box gated by
 *     `pts.length > 4` AND `bw > 10 && bh > 10` with a `"Region N"` label.
 *   - `applySlices` (10121): push undo; resolve the source (prefer the
 *     non-destructive crop original else the layer's current geometry); build
 *     slice descriptors (grid = row-major cells; rect = stored rects;
 *     freehand = bbox + polygon); for each, compute the source-pixel rect via
 *     `scaleX/Y`, rasterize to an offscreen canvas (freehand uses a polygon
 *     clip); when all images load, splice the new layers in at the original's
 *     index, remove the original, select `newLayers[0]`, reschedule autosave.
 *   - `closeSlicerModal` (9751): exit slicer mode, no project mutation, no undo.
 *
 * Per M12 "preserve": original layer replacement, new layer positions,
 * inherited settings, ordering, independent animation. Cancel produces no
 * project mutation; confirm produces the same output as legacy.
 */
import { useLayerStore, useSelectionStore, usePlaybackStore } from '@/app/store'
import type { LayerId } from '@/types/brand'
import type { ImageLayer, Layer, LayerAnimationOverrides } from '@/types/layer'
import {
  buildGridSlices,
  buildRectSlices,
  buildFreehandSlices,
  commitRectDrag,
  commitFreehandPath,
  resolveSlicerSource,
  resolveInheritance,
  canApplySlices,
  slicerFooterText,
  SLICER_GRID_DEFAULT,
  type SlicerMode,
  type SlicerRect,
  type SlicerFreehandPath,
  type SliceDescriptor,
  type SlicerInheritance,
} from '@/engine/image-processing/slicer'
import { callLegacyRuntime, getLegacyRuntimeWindow } from '@/engine/legacy/legacy-runtime-bridge'

/** Guarded legacy `applySlices` (rasterize + replace + redraw + autosave). */
function legacyApplySlices(): boolean {
  if (typeof window !== 'undefined' && typeof window.applySlices === 'function') {
    window.applySlices()
    return true
  }
  return false
}

/** Guarded legacy `closeSlicerModal`. */
function legacyCloseSlicerModal(): void {
  if (typeof window !== 'undefined' && typeof window.closeSlicerModal === 'function') {
    window.closeSlicerModal()
  }
}

/** Guarded legacy `scheduleAutoSave`. */
function legacyScheduleAutoSave(): void {
  if (typeof window !== 'undefined' && typeof window.scheduleAutoSave === 'function') {
    window.scheduleAutoSave()
  }
}

// ── session reactivity ────────────────────────────────────────────────
// The slicer session is tool state mutated in place (NOT Zustand state), so
// the service owns a lightweight pub/sub. React subscribes via
// `useSyncExternalStore(slicerService.subscribe, slicerService.getSnapshot)`.
// Every mutating method calls `notify()` so the modal + preview hook always
// reflect the latest session without each call site remembering to broadcast.
let slicerTick = 0
let slicerListeners: ReadonlyArray<() => void> = []

/** Bump the tick + notify every subscriber. Call after any session mutation. */
function notify(): void {
  slicerTick++
  for (const l of slicerListeners) l()
}

/** A live rect-drag preview (preview-pixel space). Mirrors `_slicerRectDrag.cur`. */
export interface SlicerRectDrag {
  readonly startX: number
  readonly startY: number
  /** The live preview rect in preview-pixel space (null until the first move). */
  cur: { x: number; y: number; w: number; h: number } | null
}

/**
 * The temporary slicer-tool session. Mirrors the legacy module-level slicer
 * state (`legacy/index.html:9728-9734`): the layer being sliced, the active
 * mode, the accumulated rect + freehand slices, the in-flight rect drag +
 * freehand draw. This is tool state, NOT project state — it is never
 * persisted and never written into the layer store until `confirm`.
 */
export interface SlicerSession {
  readonly layerId: LayerId
  mode: SlicerMode
  /** Grid slider values (cols/rows). Legacy defaults 2/2. */
  gridCols: number
  gridRows: number
  /** Accumulated rect slices (canvas-space). Mirrors `_slicerRects`. */
  rects: SlicerRect[]
  /** Accumulated freehand paths (canvas-space). Mirrors `_slicerFhPaths`. */
  freehandPaths: SlicerFreehandPath[]
  /** The in-flight rect drag (null when not dragging). Mirrors `_slicerRectDrag`. */
  rectDrag: SlicerRectDrag | null
  /** True while a freehand path is being drawn. Mirrors `_slicerFhDrawing`. */
  freehandDrawing: boolean
  /** The in-flight freehand points (canvas-space). Mirrors `_slicerFhCurrent`. */
  freehandCurrent: { x: number; y: number }[]
}

/**
 * Slicer tool service. Holds a single in-flight `SlicerSession` (mirrors the
 * legacy `_slicerLayer` + `_slicerMode` + accumulators). The React slicer UI
 * calls `activate`/`setMode`/`setGrid`/`pointerDown`/`pointerMove`/
 * `pointerUp`/`removeRect`/`removeFreehand`/`clearRects`/`clearFreehand`/
 * `reorderRects`/`reorderFreehand`/`cancel`/`confirm`.
 */
export const slicerService = {
  /** The in-flight slicer session (null when idle). */
  session: null as SlicerSession | null,

  /** `useSyncExternalStore` subscribe callback. */
  subscribe(listener: () => void): () => void {
    slicerListeners = [...slicerListeners, listener]
    return () => {
      slicerListeners = slicerListeners.filter((l) => l !== listener)
    }
  },

  /** `useSyncExternalStore` getSnapshot callback (returns a primitive). */
  getSnapshot(): number {
    return slicerTick
  },

  /**
   * Enter slicer mode for the selected layer. Mirrors `openSlicerModal`
   * (`legacy/index.html:9738-9749`): no-op if no layer is selected or while
   * playing. Resets the rect + freehand accumulators, defaults to grid mode.
   */
  activate(): boolean {
    if (usePlaybackStore.getState().status === 'playing') return false
    const selectedId = useSelectionStore.getState().selectedLayerId
    if (selectedId === null) return false
    const layer = useLayerStore.getState().layers.find((l) => l.id === selectedId)
    if (!layer) return false
    this.session = {
      layerId: selectedId,
      mode: 'grid',
      gridCols: SLICER_GRID_DEFAULT,
      gridRows: SLICER_GRID_DEFAULT,
      rects: [],
      freehandPaths: [],
      rectDrag: null,
      freehandDrawing: false,
      freehandCurrent: [],
    }
    useSelectionStore.getState().setEditorMode('slicer')
    useSelectionStore.getState().setSlicerMode('grid')
    notify()
    return true
  },

  /** The current mode (null when no session). */
  getMode(): SlicerMode | null {
    return this.session ? this.session.mode : null
  },

  /**
   * Switch the slicer mode. Mirrors `switchSlicerTab`
   * (`legacy/index.html:9756-9767`): sets the mode (the other mode's data
   * persists across tab switches within one session — only cleared on
   * `activate`).
   */
  setMode(mode: SlicerMode): void {
    const session = this.session
    if (!session) return
    session.mode = mode
    useSelectionStore.getState().setSlicerMode(mode)
    notify()
  },

  /** Set the grid slider values. Mirrors `updateSlicerGrid` (9931-9936). */
  setGrid(cols: number, rows: number): void {
    const session = this.session
    if (!session) return
    session.gridCols = cols
    session.gridRows = rows
    notify()
  },

  /** The current grid slider values (null when no session). */
  getGrid(): { cols: number; rows: number } | null {
    const session = this.session
    if (!session) return null
    return { cols: session.gridCols, rows: session.gridRows }
  },

  /** The accumulated rect slices (null when no session). */
  getRects(): readonly SlicerRect[] | null {
    return this.session ? this.session.rects : null
  },

  /** The accumulated freehand paths (null when no session). */
  getFreehandPaths(): readonly SlicerFreehandPath[] | null {
    return this.session ? this.session.freehandPaths : null
  },

  /** The in-flight rect drag (null when no session / not dragging). */
  getRectDrag(): SlicerRectDrag | null {
    return this.session ? this.session.rectDrag : null
  },

  /** True while a freehand path is being drawn. */
  isFreehandDrawing(): boolean {
    return this.session ? this.session.freehandDrawing : false
  },

  /** The in-flight freehand points (null when no session). */
  getFreehandCurrent(): readonly { x: number; y: number }[] | null {
    return this.session ? this.session.freehandCurrent : null
  },

  /**
   * Pointer-down on the slicer preview. Mirrors the legacy mousedown
   * (`legacy/index.html:9973-9984`): rect mode starts a drag (recording the
   * canvas-space start point); freehand mode starts a new path. Grid mode is
   * read-only (no handler).
   */
  pointerDown(canvasX: number, canvasY: number): void {
    const session = this.session
    if (!session) return
    if (session.mode === 'rect') {
      session.rectDrag = { startX: canvasX, startY: canvasY, cur: null }
    } else if (session.mode === 'freehand') {
      session.freehandDrawing = true
      session.freehandCurrent = [{ x: canvasX, y: canvasY }]
    }
    notify()
  },

  /**
   * Pointer-move on the slicer preview. Mirrors the legacy mousemove
   * (`legacy/index.html:9986-10003`): rect mode updates the live preview rect
   * (in preview-pixel space — the caller passes the converted `px/py`); the
   * canvas-space `x/y` are used only for the freehand point push. Freehand
   * mode pushes canvas-space points.
   */
  pointerMove(
    canvasX: number,
    canvasY: number,
    previewPx: number,
    previewPy: number,
    scale: number,
    offX: number,
    offY: number,
  ): void {
    const session = this.session
    if (!session) return
    if (session.mode === 'rect' && session.rectDrag) {
      const sxPx = (session.rectDrag.startX - offX) * scale
      const syPx = (session.rectDrag.startY - offY) * scale
      session.rectDrag.cur = {
        x: Math.min(previewPx, sxPx),
        y: Math.min(previewPy, syPx),
        w: Math.abs(previewPx - sxPx),
        h: Math.abs(previewPy - syPx),
      }
    } else if (session.mode === 'freehand' && session.freehandDrawing) {
      session.freehandCurrent.push({ x: canvasX, y: canvasY })
    }
    notify()
  },

  /**
   * Pointer-up on the slicer preview. Mirrors the legacy mouseup
   * (`legacy/index.html:10005-10043`): rect mode commits a canvas-space rect
   * gated by `w > 10 && h > 10` (label `"Slice N"`); freehand mode commits the
   * path + bounding box gated by `pts.length > 4` AND `bw > 10 && bh > 10`
   * (label `"Region N"`). Always clears the in-flight drag/draw.
   *
   * Returns `'committed' | 'too-small' | null` (null = no active drag/draw).
   */
  pointerUp(canvasX: number, canvasY: number): 'committed' | 'too-small' | null {
    const session = this.session
    if (!session) return null
    if (session.mode === 'rect' && session.rectDrag) {
      const { startX, startY } = session.rectDrag
      const rect = commitRectDrag(startX, startY, canvasX, canvasY, session.rects.length + 1)
      session.rectDrag = null
      if (rect) {
        session.rects.push(rect)
        notify()
        return 'committed'
      }
      notify()
      return 'too-small'
    }
    if (session.mode === 'freehand' && session.freehandDrawing) {
      const path = commitFreehandPath(session.freehandCurrent, session.freehandPaths.length + 1)
      session.freehandDrawing = false
      session.freehandCurrent = []
      if (path) {
        session.freehandPaths.push(path)
        notify()
        return 'committed'
      }
      notify()
      return 'too-small'
    }
    return null
  },

  /** Remove a rect slice by index. Mirrors `removeSlicerRect` (10106-10111). */
  removeRect(index: number): void {
    const session = this.session
    if (!session) return
    if (index < 0 || index >= session.rects.length) return
    session.rects.splice(index, 1)
    notify()
  },

  /** Remove a freehand path by index. Mirrors `removeSlicerFh` (10112-10117). */
  removeFreehand(index: number): void {
    const session = this.session
    if (!session) return
    if (index < 0 || index >= session.freehandPaths.length) return
    session.freehandPaths.splice(index, 1)
    notify()
  },

  /** Clear all rect slices. Mirrors `clearSlicerRects` (10118). */
  clearRects(): void {
    const session = this.session
    if (!session) return
    session.rects = []
    notify()
  },

  /** Clear all freehand paths. Mirrors `clearSlicerFreehand` (10119). */
  clearFreehand(): void {
    const session = this.session
    if (!session) return
    session.freehandPaths = []
    notify()
  },

  /**
   * Reorder the rect slices via a drag-drop move. Mirrors `_bindSlicerDrag`
   * (`legacy/index.html:10073-10104`): `arr.splice(dragIdx, 1)` then
   * `arr.splice(dropIdx, 0, moved)`. Reordering the list reorders the array
   * index, which directly controls the order new layers are created in.
   */
  reorderRects(fromIndex: number, toIndex: number): void {
    const session = this.session
    if (!session) return
    if (fromIndex < 0 || fromIndex >= session.rects.length) return
    if (toIndex < 0 || toIndex >= session.rects.length) return
    if (fromIndex === toIndex) return
    const [moved] = session.rects.splice(fromIndex, 1)
    if (!moved) return
    session.rects.splice(toIndex, 0, moved)
    notify()
  },

  /** Reorder the freehand paths. Mirrors `_bindSlicerDrag` for the fh list. */
  reorderFreehand(fromIndex: number, toIndex: number): void {
    const session = this.session
    if (!session) return
    if (fromIndex < 0 || fromIndex >= session.freehandPaths.length) return
    if (toIndex < 0 || toIndex >= session.freehandPaths.length) return
    if (fromIndex === toIndex) return
    const [moved] = session.freehandPaths.splice(fromIndex, 1)
    if (!moved) return
    session.freehandPaths.splice(toIndex, 0, moved)
    notify()
  },

  /** True when a slicer session is in flight. */
  isActive(): boolean {
    return this.session !== null
  },

  /** The apply-button enabled predicate. Mirrors `_updateSlicerFooter`. */
  canApply(): boolean {
    const session = this.session
    if (!session) return false
    return canApplySlices(
      session.mode,
      session.gridCols,
      session.gridRows,
      session.rects.length,
      session.freehandPaths.length,
    )
  },

  /** The footer info text. Mirrors `_updateSlicerFooter`. */
  footerText(): string {
    const session = this.session
    if (!session) return 'Select a mode and define your slices.'
    return slicerFooterText(
      session.mode,
      session.gridCols,
      session.gridRows,
      session.rects.length,
      session.freehandPaths.length,
    )
  },

  /**
   * Cancel the slicer session. Mirrors `closeSlicerModal`
   * (`legacy/index.html:9751-9754`): exit slicer mode, no project mutation,
   * no undo snapshot.
   */
  cancel(): void {
    this.session = null
    useSelectionStore.getState().setEditorMode('image')
    useSelectionStore.getState().setSlicerMode(null)
    legacyCloseSlicerModal()
    notify()
  },

  /**
   * Confirm (apply) the slices. Mirrors `applySlices`
   * (`legacy/index.html:10121-10261`):
   *   - push an undo snapshot;
   *   - resolve the source (prefer the non-destructive crop original else the
   *     layer's current geometry);
   *   - build slice descriptors (grid = row-major cells; rect = stored rects;
   *     freehand = bbox + polygon);
   *   - build the new typed layers (inheriting the parent's animation settings
   *     + `resizePct=100`, `animOrder=null`, `visible=true`);
   *   - splice the new layers in at the original's index, remove the original,
   *     select `newLayers[0]`;
   *   - delegate the rasterize + redraw + autosave to the legacy `applySlices`
   *     when present (it rebuilds each `layer.img` from the source via the
   *     canvas↔image-space mapping). When the legacy runtime is not co-hosted
   *     (pre-M16), the typed store update above is the only effect.
   *
   * Returns false if there is no session / no slices / no layer (no-op).
   */
  confirm(): boolean {
    const session = this.session
    if (!session) return false
    // The legacy Apply button is disabled when `!canApply` (legacy 9938-9956),
    // so `applySlices` is never invoked in that state. Mirror that guard here
    // so the typed `confirm` is a no-op when there are not enough slices.
    if (!this.canApply()) return false
    const layer = useLayerStore.getState().layers.find((l) => l.id === session.layerId)
    if (!layer) {
      this.cancel()
      return false
    }
    const descriptors = this.buildDescriptors(session, layer)
    if (descriptors.length === 0) return false

    if (getLegacyRuntimeWindow()) {
      callLegacyRuntime('applyMigrationSlices', {
        layerId: legacyLayerId(session.layerId),
        slices: descriptors.map((descriptor) => ({
          bounds: { ...descriptor.bounds },
          clipPts: descriptor.clipPts?.map((point) => ({ ...point })) ?? null,
          label: descriptor.label,
        })),
      })
      this.session = null
      useSelectionStore.getState().setEditorMode('image')
      useSelectionStore.getState().setSlicerMode(null)
      notify()
      return true
    }

    // Push an undo snapshot before mutating (legacy 10124).
    useLayerStore.getState().pushUndo()

    // Resolve the inheritance defaults (legacy 10137-10150). The source
    // geometry (resolveSource) is used by the legacy `applySlices` rasterize
    // (delegated below); the typed path does not rasterize, so it is not
    // read here — it is exposed as a public method for the legacy co-host.
    const inheritance = this.resolveLayerInheritance(layer)

    // Build the new typed layers (legacy 10229-10243).
    const newLayers = this.buildNewLayers(descriptors, layer, inheritance)

    // Splice the new layers in at the original's index, then remove the
    // original; select newLayers[0] (legacy 10246-10250).
    const layers = useLayerStore.getState().layers
    const origIdx = layers.findIndex((l) => l.id === session.layerId)
    const insertAt = Math.max(0, origIdx)
    const nextLayers = [...layers]
    nextLayers.splice(insertAt, 0, ...newLayers)
    // Find the original's new index (now insertAt + newLayers.length) + remove.
    const origNewIdx = nextLayers.findIndex((l) => l.id === session.layerId)
    if (origNewIdx !== -1) nextLayers.splice(origNewIdx, 1)
    useLayerStore.getState().setLayers(nextLayers)
    useSelectionStore.getState().selectLayer(newLayers[0]?.id ?? null)

    // Delegate the rasterize + redraw + autosave to the legacy runtime when
    // present. The legacy `applySlices` rebuilds each `layer.img` from the
    // source via the canvas↔image-space mapping + reschedules autosave. When
    // the legacy runtime is not co-hosted (pre-M16), the typed store update
    // above is the only effect.
    if (!legacyApplySlices()) {
      legacyScheduleAutoSave()
    }

    // Exit slicer mode.
    this.session = null
    useSelectionStore.getState().setEditorMode('image')
    useSelectionStore.getState().setSlicerMode(null)
    notify()
    return true
  },

  /** Build the slice descriptors for the current session + layer. */
  buildDescriptors(session: SlicerSession, layer: Layer): SliceDescriptor[] {
    const t = layer.transform
    if (session.mode === 'grid') {
      return buildGridSlices(
        layer.name,
        t.x,
        t.y,
        t.width,
        t.height,
        session.gridCols,
        session.gridRows,
      )
    }
    if (session.mode === 'rect') {
      return buildRectSlices(layer.name, session.rects)
    }
    return buildFreehandSlices(layer.name, session.freehandPaths)
  },

  /** Resolve the slicer source for a layer (non-destructive crop original). */
  resolveSource(layer: Layer): {
    naturalWidth: number
    naturalHeight: number
    x: number
    y: number
    w: number
    h: number
  } {
    const t = layer.transform
    const img = layer as ImageLayer
    const cropSource = img.sourceMetadata.cropSource
    const cropNatural =
      cropSource && img.sourceMetadata
        ? {
            naturalWidth: img.sourceMetadata.naturalWidth,
            naturalHeight: img.sourceMetadata.naturalHeight,
          }
        : undefined
    return resolveSlicerSource(
      t.x,
      t.y,
      t.width,
      t.height,
      img.sourceMetadata.naturalWidth,
      img.sourceMetadata.naturalHeight,
      cropSource,
      cropNatural,
    )
  },

  /** Resolve the inheritance defaults for new slices. */
  resolveLayerInheritance(layer: Layer): SlicerInheritance {
    const a = layer.animation
    return resolveInheritance(undefined, a.speed, a.handSpeed)
  },

  /**
   * Build the new typed image layers from the slice descriptors. Mirrors the
   * new-layer shape in `applySlices` (`legacy/index.html:10229-10243`):
   * `resizePct=100`, `animOrder=null`, `visible=true`, `baseW/baseH=bounds`,
   * `id = <unique>`, inherit the parent's animation overrides.
   *
   * The legacy `id = Date.now() + i*7` is a timestamp-based unique id; the
   * typed domain uses branded `'layer-N'` ids, so we synthesize unique ids
   * from a monotonic counter derived from the existing layer ids (max + 1).
   */
  buildNewLayers(
    descriptors: readonly SliceDescriptor[],
    parent: Layer,
    inheritance: SlicerInheritance,
  ): ImageLayer[] {
    const layers = useLayerStore.getState().layers
    // Derive the next id counter from the max trailing integer across all
    // existing layer ids (mirrors the legacy `_layerIdCounter` monotonic
    // counter at `legacy/index.html:5791-5795`).
    let maxN = 0
    for (const l of layers) {
      const m = String(l.id).match(/(\d+)$/)
      if (m) {
        const n = Number(m[1])
        if (n > maxN) maxN = n
      }
    }
    // Inherit the parent's animation overrides (legacy spreads `...inherited`).
    const anim: LayerAnimationOverrides = { ...parent.animation }
    return descriptors.map((slice, i) => {
      const id = `layer-${maxN + i + 1}` as LayerId
      const b = slice.bounds
      return {
        id,
        name: slice.label,
        type: 'image',
        visible: true,
        opacity: inheritance.opacity,
        transform: {
          x: Math.round(b.x),
          y: Math.round(b.y),
          width: Math.round(b.w),
          height: Math.round(b.h),
          rotation: 0,
        },
        animationOrder: null,
        animation: anim,
        assetId: `asset-${maxN + i + 1}` as never,
        resizePct: 100,
        sourceMetadata: {
          naturalWidth: Math.round(b.w),
          naturalHeight: Math.round(b.h),
          hasPngAlpha: (parent as ImageLayer).sourceMetadata.hasPngAlpha ?? false,
        },
      } as ImageLayer
    })
  },
}

function legacyLayerId(id: LayerId): number {
  const match = String(id).match(/(\d+)$/)
  return match ? Number(match[1]) : Number(id)
}
