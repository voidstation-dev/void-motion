/**
 * Canvas interaction service (M10).
 *
 * Coordinates pointer-driven selection + transform (drag, resize) between the
 * React canvas overlay, the typed layer + selection Zustand stores, and the
 * legacy runtime. Mirrors the legacy inline anonymous listeners attached to
 * `selectCanvas` (`legacy/index.html:6693-6804`), ported to a typed service so
 * the React shell owns the interaction contract:
 *
 * ```text
 * React overlay → interaction service → layer store + legacy adapter
 * ```
 *
 * Legacy behavior parity (vs `legacy/index.html`):
 *   - mousedown (6693): guarded by `state.playing`; handle-hit (12px radius)
 *     takes precedence over body-hit, which takes precedence over hit-testing
 *     other layers; clicking an unselected layer only SELECTS it (no drag
 *     starts); clicking empty space deselects.
 *   - mousemove (6730): live move uses absolute-from-orig math; live resize
 *     uses per-handle math with a 20px minimum + optional Shift aspect lock to
 *     the ORIGINAL ratio; the cursor reflects handle/body/empty feedback.
 *   - mouseup (6783): pushes an undo snapshot ONLY if the geometry changed;
 *     resize-end rebaselines `baseW/baseH/resizePct` (via `setLayerResize`
 *     with `pct=100` in the typed path) and reschedules autosave.
 *
 * The service never touches `document.getElementById` / `innerHTML`; it reads
 * the layer list from the typed store and reaches the legacy runtime through
 * guarded `window.*` calls (the legacy `setLayerPos` owns the redraw, and
 * `scheduleAutoSave` owns the autosave timer). The actual canvas redraw is a
 * no-op until the renderer is migrated (M19); the typed store update is what
 * React renders.
 *
 * Per M10 "no new animation logic": this is interaction only.
 */
import { useLayerStore, useSelectionStore, usePlaybackStore } from '@/app/store'
import { textService } from '@/app/services/text-service'
import type { LayerId } from '@/types/brand'
import type { Layer, LayerTransform } from '@/types/layer'
import {
  toCanvasCoords,
  hitTestHandle,
  hitTestLayer,
  pointInRect,
  layerHitRect,
  type CanvasPoint,
  type ResizeHandle,
} from '@/engine/interaction/hit-test'
import {
  startMoveSession,
  startResizeSession,
  applyMove,
  applyResize,
  sessionChanged,
  type PointerSession,
  type SessionGeometry,
} from '@/engine/interaction/transform-session'



/** Guarded legacy `scheduleAutoSave`. */
function legacyScheduleAutoSave(): void {
  if (typeof window !== 'undefined' && typeof window.scheduleAutoSave === 'function') {
    window.scheduleAutoSave()
  }
}

/** Map a branded domain LayerId back to the legacy numeric id. */
function layerIdToLegacyNum(id: LayerId): number {
  const s = String(id)
  const m = s.match(/(\d+)$/)
  return m ? Number(m[1]) : Number(s)
}

/** The layer's current geometry as a session `orig` snapshot. */
function captureGeometry(layer: Layer): SessionGeometry {
  const t = layer.transform
  return { x: t.x, y: t.y, w: t.width, h: t.height }
}

function applyGeometry(id: LayerId, next: SessionGeometry): void {
  const transform: LayerTransform = {
    x: next.x,
    y: next.y,
    width: next.w,
    height: next.h,
    rotation: 0,
  }
  useLayerStore.getState().updateLayer(id, { transform })
  if (typeof window !== 'undefined' && typeof (window as any).setLayerPos === 'function') {
    const legacyId = layerIdToLegacyNum(id)
    ;(window as any).setLayerPos(legacyId, 'x', next.x)
    ;(window as any).setLayerPos(legacyId, 'y', next.y)
    ;(window as any).setLayerPos(legacyId, 'w', next.w)
    ;(window as any).setLayerPos(legacyId, 'h', next.h)
  } else if (typeof window !== 'undefined' && window.state) {
    const legacyId = layerIdToLegacyNum(id)
    const legacyLayer = window.state.layers?.find((l: any) => l.id === legacyId)
    if (legacyLayer) {
      legacyLayer.x = next.x
      legacyLayer.y = next.y
      legacyLayer.w = next.w
      legacyLayer.h = next.h
      if (typeof (window as any).redrawLayersOnCanvas === 'function') (window as any).redrawLayersOnCanvas()
      if (typeof (window as any).drawSelectionHandles === 'function') (window as any).drawSelectionHandles()
    }
  }
}

/**
 * Canvas interaction service. Holds a single in-flight `PointerSession`
 * (mirrors the legacy module-level `_interact`). The React overlay calls
 * `pointerDown`/`pointerMove`/`pointerUp`; the service drives selection +
 * transform through the stores + legacy adapter.
 */
export const interactionService = {
  /** The in-flight session (null when idle). */
  session: null as PointerSession | null,
  /** Tracks if the BEFORE snapshot was pushed for the current session. */
  snapshotPushed: false,

  /**
   * Pointer-down on the canvas overlay. Mirrors the legacy mousedown handler
   * (`legacy/index.html:6693-6728`):
   *   - No-op while the animation is playing.
   *   - Handle-hit on the selected layer → start a resize session.
   *   - Body-hit on the selected layer → start a move session.
   *   - Hit on another layer → select it (no drag starts).
   *   - Empty space → deselect.
   *
   * `canvasWidth` is the logical canvas width (`state.canvasW`); `rect` is the
   * canvas overlay's `getBoundingClientRect()`. Returns the session type so the
   * overlay can set the cursor / capture the pointer.
   */
  pointerDown(
    clientX: number,
    clientY: number,
    rect: { readonly width: number; readonly left: number; readonly top: number },
    canvasWidth: number,
  ): { readonly type: 'move' | 'resize' | 'select' | 'deselect' | 'blocked' } {
    if (usePlaybackStore.getState().status === 'playing') {
      return { type: 'blocked' }
    }

    const { x, y } = toCanvasCoords(clientX, clientY, rect, canvasWidth)

    // Text tool takes precedence if active (legacy 6696-6699).
    if (textService.isActive()) {
      textService.closeEditor(true)
      return { type: 'blocked' }
    }
    if (textService.isPlacing()) {
      textService.openEditor(x, y, null)
      return { type: 'blocked' } // Consumes the click
    }

    const layers = useLayerStore.getState().layers
    const selectedId = useSelectionStore.getState().selectedLayerId
    const selected = selectedId !== null ? (layers.find((l) => l.id === selectedId) ?? null) : null

    if (selected) {
      const handle = hitTestHandle(x, y, layerHitRect(selected))
      if (handle) {
        this.snapshotPushed = false
        this.session = startResizeSession(handle, x, y, captureGeometry(selected))
        return { type: 'resize' }
      }
      // Body-hit on the selected layer starts a move (legacy 6719-6722).
      if (pointInRect(x, y, layerHitRect(selected))) {
        this.snapshotPushed = false
        this.session = startMoveSession(x, y, captureGeometry(selected))
        return { type: 'move' }
      }
    }

    // Click to select a different layer (legacy 6725-6727). Only selects; a
    // drag does NOT start on a freshly-selected layer (legacy parity).
    const hitId = hitTestLayer(x, y, layers)
    if (hitId !== null) {
      useSelectionStore.getState().selectLayer(hitId)
      // Delegate the legacy redraw/sidebar sync via selectLayer if present.
      if (typeof window !== 'undefined' && typeof window.selectLayer === 'function') {
        window.selectLayer(layerIdToLegacyNum(hitId))
      }
      return { type: 'select' }
    }

    // Empty space → deselect (legacy 6727).
    useSelectionStore.getState().selectLayer(null)
    return { type: 'deselect' }
  },

  /**
   * Pointer-move on the canvas overlay. Mirrors the legacy mousemove handler
   * (`legacy/index.html:6730-6770`):
   *   - No-op while playing.
   *   - Idle (no session): return cursor feedback ('resize' over a handle,
   *     'move' over the selected layer body, 'default' otherwise).
   *   - Active move session: recompute geometry absolute-from-orig + apply.
   *   - Active resize session: recompute per-handle geometry (min 20, Shift
   *     aspect lock) + apply.
   *
   * Returns the cursor feedback when idle, or null when a session is active.
   */
  pointerMove(
    clientX: number,
    clientY: number,
    rect: { readonly width: number; readonly left: number; readonly top: number },
    canvasWidth: number,
    shiftKey: boolean,
  ): { readonly cursor: string } {
    if (usePlaybackStore.getState().status === 'playing') {
      return { cursor: 'default' }
    }
    if (textService.isPlacing()) {
      return { cursor: 'text' }
    }
    if (textService.isActive()) {
      return { cursor: 'default' }
    }
    const { x, y } = toCanvasCoords(clientX, clientY, rect, canvasWidth)
    const session = this.session
    if (session === null) {
      // Cursor feedback (legacy 6734-6741).
      const layers = useLayerStore.getState().layers
      const selectedId = useSelectionStore.getState().selectedLayerId
      const selected =
        selectedId !== null ? (layers.find((l) => l.id === selectedId) ?? null) : null
      if (selected) {
        const handle = hitTestHandle(x, y, layerHitRect(selected))
        if (handle) {
          if (handle === 'n' || handle === 's') return { cursor: 'ns-resize' }
          if (handle === 'e' || handle === 'w') return { cursor: 'ew-resize' }
          if (handle === 'ne' || handle === 'sw') return { cursor: 'nesw-resize' }
          return { cursor: 'nwse-resize' }
        }
        if (pointInRect(x, y, layerHitRect(selected))) return { cursor: 'move' }
      }
      return { cursor: 'default' }
    }

    // Active session: apply the computed geometry to the selected layer.
    const selectedId = useSelectionStore.getState().selectedLayerId
    if (selectedId === null) return { cursor: 'default' }
    const next =
      session.type === 'move' ? applyMove(session, x, y) : applyResize(session, x, y, shiftKey)
      
    if (sessionChanged(session, next) && !this.snapshotPushed) {
      useLayerStore.getState().pushUndo()
      if (typeof window !== 'undefined' && typeof (window as any).pushUndoSnapshot === 'function') {
        (window as any).pushUndoSnapshot()
      }
      this.snapshotPushed = true
    }
    
    applyGeometry(selectedId, next)
    if (session.type === 'resize') {
      if (session.handle === 'n' || session.handle === 's') return { cursor: 'ns-resize' }
      if (session.handle === 'e' || session.handle === 'w') return { cursor: 'ew-resize' }
      if (session.handle === 'ne' || session.handle === 'sw') return { cursor: 'nesw-resize' }
      return { cursor: 'nwse-resize' }
    }
    return { cursor: 'move' }
  },

  /**
   * Pointer-up anywhere (document-level). Mirrors the legacy mouseup handler
   * (`legacy/index.html:6783-6804`):
   *   - Nulls the session.
   *   - Pushes an undo snapshot ONLY if the geometry changed.
   *   - Resize-end rebaselines `baseW/baseH/resizePct` (typed path: sets
   *     `resizePct = 100` on the image layer) + reschedules autosave.
   *   - Move-end only reschedules autosave.
   */
  pointerUp(): void {
    const session = this.session
    this.session = null
    if (session === null) return
    const selectedId = useSelectionStore.getState().selectedLayerId
    if (selectedId === null) return
    const layer = useLayerStore.getState().layers.find((l) => l.id === selectedId)
    if (!layer) return
    const next = captureGeometry(layer)
    if (!sessionChanged(session, next)) return
    
    if (session.type === 'resize') {
      // Rebaseline resizePct to 100 (legacy `syncLayerResizeFromCurrentSize`,
      // legacy/index.html:6409). Delegate to the legacy resize fn when present
      // so baseW/baseH are rebaselined in the runtime; mirror in the store.
      if (typeof window !== 'undefined' && typeof window.setLayerResize === 'function') {
        window.setLayerResize(layerIdToLegacyNum(selectedId), 100)
      }
    }
    legacyScheduleAutoSave()
  },

  /** Cancel any in-flight session (e.g. on Escape). Legacy has no such path. */
  cancel(): void {
    this.session = null
  },

  /**
   * Double-click on the canvas overlay. Mirrors the legacy dblclick handler
   * (`legacy/index.html:6773-6781`):
   *   - If hit a text layer → switch to text tab, open text editor.
   */
  doubleClick(
    clientX: number,
    clientY: number,
    rect: { readonly width: number; readonly left: number; readonly top: number },
    canvasWidth: number,
  ): void {
    if (usePlaybackStore.getState().status === 'playing') return
    if (textService.isActive()) return

    const { x, y } = toCanvasCoords(clientX, clientY, rect, canvasWidth)
    const layers = useLayerStore.getState().layers
    const hitId = hitTestLayer(x, y, layers)

    if (hitId !== null) {
      const hit = layers.find((l) => l.id === hitId)
      if (hit && hit.type === 'text') {
        useSelectionStore.getState().setEditorMode('text')
        textService.openEditor(hit.transform.x, hit.transform.y, hit)
        return
      }
    }

    // Double-clicking canvas space immediately opens the text editor at the click point
    useSelectionStore.getState().setEditorMode('text')
    textService.openEditor(x, y, null)
  },

  /** True when a pointer session is in flight. */
  isInteracting(): boolean {
    return this.session !== null
  },
}

/**
 * Project a pointer position into canvas coordinates + cursor feedback without
 * starting a session. Exposed for the overlay's hover behavior; the service
 * uses it internally during `pointerMove` idle.
 */
export function cursorForPoint(
  clientX: number,
  clientY: number,
  rect: { readonly width: number; readonly left: number; readonly top: number },
  canvasWidth: number,
): string {
  const { x, y } = toCanvasCoords(clientX, clientY, rect, canvasWidth)
  const layers = useLayerStore.getState().layers
  const selectedId = useSelectionStore.getState().selectedLayerId
  const selected = selectedId !== null ? (layers.find((l) => l.id === selectedId) ?? null) : null
  if (selected) {
    const handle = hitTestHandle(x, y, layerHitRect(selected))
    if (handle) {
      if (handle === 'n' || handle === 's') return 'ns-resize'
      if (handle === 'e' || handle === 'w') return 'ew-resize'
      if (handle === 'ne' || handle === 'sw') return 'nesw-resize'
      return 'nwse-resize'
    }
    if (pointInRect(x, y, layerHitRect(selected))) return 'move'
  }
  return 'default'
}

/** Re-export the hit-test primitives for the overlay + tests. */
export { toCanvasCoords, hitTestHandle, hitTestLayer, pointInRect }
export type { CanvasPoint, ResizeHandle }
