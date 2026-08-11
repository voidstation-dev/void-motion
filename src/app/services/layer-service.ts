/**
 * Layer state + panel service (M08).
 *
 * Coordinates the layer list (the right-sidebar "Layers" panel) between the
 * React UI, the typed layer + selection Zustand stores, and the legacy
 * runtime (which owns the actual `state.layers` array + the `img` runtime
 * objects until the asset registry lands).
 *
 * Per the M08 flow:
 * ```text
 * React UI → Zustand → Layer service → Legacy adapter
 * ```
 *
 * Behavior parity (vs legacy `legacy/index.html`):
 *   - `selectLayer(id)` (5868): set `state.selectedLayerId`, re-render list,
 *     draw selection handles, sync sidebar. We delegate to the legacy
 *     `selectLayer` (already wrapped at 9429) and mirror into the selection
 *     store.
 *   - `removeLayer(id)` (5841): pushUndoSnapshot, prune groups, drop the
 *     layer, reselect the last layer (or null), clear baked outline overlays.
 *     We delegate to the legacy `removeLayer` and mirror the resulting list
 *     + selection into the stores.
 *   - `toggleLayerVisibility(id)` (6452): flip `layer.visible`, re-render +
 *     redraw. We delegate + mirror.
 *   - `setLayerOrder(id, val)` (6384): `''`/NaN → null, else `max(1, n)`. We
 *     delegate + mirror into the layer store (per-layer `animationOrder`).
 *   - `setLayerOpacity(id, val)` (6391): clamp `[0,1]`. Delegate + mirror.
 *   - `setLayerResize(id, pct)` (6416): clamp `[10,300]`, scale around
 *     center, update `w/h/x/y`. Delegate + mirror.
 *   - `setLayerPos(id, prop, val)` (6401): `w/h` clamp `>=20`; `x/y` raw.
 *     Delegate + mirror.
 *   - `renameLayer(id, name)`: legacy uses inline-DOM rename; we set the
 *     layer name directly in the store and call `scheduleAutoSave` (the
 *     legacy `startLayerRename` is DOM-driven and not reusable from React).
 *   - `switchTab(m)` (6809): set `state.mode`, toggle panels, cancel text
 *     placement. We delegate + mirror into the selection store's `editorMode`.
 *
 * The service never touches `document.getElementById` / `innerHTML` directly;
 * it reaches the legacy runtime through guarded `window.*` calls and mirrors
 * status into the typed stores so React can render without polling.
 */
import { useLayerStore } from '@/app/store'
import { useSelectionStore } from '@/app/store'
import type { LayerId } from '@/types/brand'
import type { AnimationOrder, Layer, ImageLayer, TextLayer } from '@/types/layer'

/** True when the legacy layer globals are present. */
function legacyReady(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.selectLayer === 'function' &&
    typeof window.removeLayer === 'function'
  )
}

/**
 * Map a legacy numeric layer id to the branded domain LayerId. The domain
 * id is the string `'layer-<n>'` (the canonical form used by the store
 * fixtures and `makeLayer`), so legacy id `10` → `'layer-10'`.
 */
function toLayerId(n: number | string): LayerId {
  return `layer-${n}` as LayerId
}

/**
 * Map a branded domain LayerId back to the legacy numeric id. The domain id
 * is a branded string of the form `'layer-N'` (the `makeLayer` fixture + the
 * store tests) OR a bare numeric string (`'10'`) when reconciled from the
 * legacy runtime. We extract the trailing integer so both shapes round-trip.
 */
function layerIdToLegacyNum(id: LayerId): number {
  const s = String(id)
  const m = s.match(/(\d+)$/)
  return m ? Number(m[1]) : Number(s)
}

export const layerService = {
  /**
   * Select a layer. Delegates to the legacy `selectLayer` (which re-renders
   * the list, draws selection handles, and syncs the sidebar), then mirrors
   * the selection into the typed selection store.
   */
  selectLayer(id: LayerId | null): void {
    if (id === null) {
      useSelectionStore.getState().selectLayer(null)
      return
    }
    if (legacyReady()) {
      window.selectLayer?.(layerIdToLegacyNum(id))
    }
    useSelectionStore.getState().selectLayer(id)
  },

  /**
   * Remove a layer. Delegates to the legacy `removeLayer` (which pushes an
   * undo snapshot, prunes groups, drops the layer, and reselects the last
   * layer), then mirrors the resulting list + selection into the stores.
   */
  removeLayer(id: LayerId): void {
    if (legacyReady()) {
      window.removeLayer?.(layerIdToLegacyNum(id))
    } else {
      // Store-only fallback (tests / pre-cohost): mirror the legacy
      // reselect-last behavior so the selection store stays consistent.
      useLayerStore.getState().removeLayer(id)
    }
    this.syncLayersFromLegacy()
  },

  /** Toggle a layer's visibility. Delegate + mirror. */
  toggleVisibility(id: LayerId): void {
    if (legacyReady()) {
      window.toggleLayerVisibility?.(layerIdToLegacyNum(id))
    } else {
      const l = useLayerStore.getState().layers.find((x) => x.id === id)
      if (l) useLayerStore.getState().updateLayer(id, { visible: !l.visible })
    }
    this.syncLayersFromLegacy()
  },

  /**
   * Set a layer's animation order. Legacy `''`/NaN → null (follow visual
   * stack order), else `max(1, n)`. Delegate + mirror.
   */
  setOrder(id: LayerId, val: string | number): void {
    const n = typeof val === 'number' ? val : parseInt(val, 10)
    const order: AnimationOrder = val === '' || Number.isNaN(n) ? null : Math.max(1, n)
    if (legacyReady()) {
      window.setLayerOrder?.(layerIdToLegacyNum(id), String(val))
    }
    useLayerStore.getState().updateLayer(id, { animationOrder: order })
  },

  /** Set a layer's opacity, clamped to [0,1]. Delegate + mirror. */
  setOpacity(id: LayerId, val: number): void {
    const clamped = Math.min(Math.max(val, 0), 1)
    if (legacyReady()) {
      window.setLayerOpacity?.(layerIdToLegacyNum(id), clamped)
    }
    useLayerStore.getState().updateLayer(id, { opacity: clamped })
  },

  /** Set a layer's resize percentage, clamped to [10,300]. Delegate + mirror. */
  setResize(id: LayerId, pct: number): void {
    const clamped = Math.min(Math.max(pct, 10), 300)
    if (legacyReady()) {
      window.setLayerResize?.(layerIdToLegacyNum(id), clamped)
    }
    // The legacy fn recomputes w/h/x/y around the center; we mirror the
    // resizePct only (the typed transform is reconciled in syncLayersFromLegacy
    // once the asset registry owns the bitmap).
    this.syncLayersFromLegacy()
  },

  /** Set a layer's position/size property. Delegate + mirror. */
  setPosition(id: LayerId, prop: 'x' | 'y' | 'w' | 'h', val: number): void {
    if (legacyReady()) {
      window.setLayerPos?.(layerIdToLegacyNum(id), prop, val)
    }
    const layer = useLayerStore.getState().layers.find((l) => l.id === id)
    if (layer) {
      const t = layer.transform
      const next = prop === 'w' || prop === 'h' ? Math.max(20, val) : val
      const patch =
        prop === 'x'
          ? { x: next }
          : prop === 'y'
            ? { y: next }
            : prop === 'w'
              ? { width: next }
              : { height: next }
      useLayerStore.getState().updateLayer(id, { transform: { ...t, ...patch } })
    }
  },

  /**
   * Rename a layer. The legacy `startLayerRename` is DOM-driven (replaces the
   * name div with an input), so it is not reusable from React. We set the
   * name directly in the typed store and reschedule autosave through the
   * legacy global. Trimming + empty-discard matches legacy `commit`.
   */
  renameLayer(id: LayerId, name: string): void {
    const trimmed = name.trim()
    if (!trimmed) return // legacy discards empty names (keeps the old name)
    useLayerStore.getState().updateLayer(id, { name: trimmed })
    if (typeof window !== 'undefined' && typeof window.scheduleAutoSave === 'function') {
      window.scheduleAutoSave()
    }
  },

  /**
   * Switch the input tab (image/text). Delegates to the legacy `switchTab`
   * (which toggles the panels + cancels text placement), then mirrors
   * `state.mode` into the selection store's `editorMode`.
   */
  switchTab(mode: 'image' | 'text'): void {
    if (legacyReady()) {
      window.switchTab?.(mode)
    }
    useSelectionStore.getState().setEditorMode(mode)
  },

  /**
   * Read the live legacy layer list into the typed store. The legacy
   * `state.layers` is the source of truth until the asset registry lands
   * (M11+); this mirrors the serializable projection (id, name, visible,
   * opacity, transform, animationOrder) so the React panel can render.
   *
   * Runtime objects (`HTMLImageElement`) are NOT copied — the typed store
   * holds only the `AssetId` reference, which is synthesized from the layer
   * id until the asset registry exists.
   */
  syncLayersFromLegacy(): void {
    if (typeof window === 'undefined' || !window.state) return
    const legacyLayers = window.state.layers
    if (!Array.isArray(legacyLayers)) return
    const current = useLayerStore.getState().layers
    // Only reconcile selection when the legacy has a different selection.
    const legacySel = window.state.selectedLayerId
    if (legacySel !== undefined) {
      const selId = legacySel === null ? null : toLayerId(legacySel)
      if (useSelectionStore.getState().selectedLayerId !== selId) {
        useSelectionStore.getState().selectLayer(selId)
      }
    }
    // Reconcile the typed list against the legacy list by id. We update
    // fields that the legacy mutates (visible, opacity, transform, order,
    // name) and leave the rest (assetId, sourceMetadata, animation overrides)
    // untouched so the typed projection is not clobbered. The panel renders
    // in reverse stack order, so the caller relies on array index — we do
    // NOT store a separate `_stackIndex` field.
    const next: Layer[] = legacyLayers.map((ll) => {
      const id = toLayerId(ll.id)
      const existing = current.find((c) => c.id === id)
      const isText = ll.kind === 'text'
      const base: Layer =
        existing ??
        ({
          id,
          name: String(ll.name ?? `Layer ${ll.id}`),
          type: isText ? 'text' : 'image',
          visible: true,
          opacity: 1,
          transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
          animationOrder: null,
          animation: {
            animationStyle: undefined,
            handStyle: undefined,
            zigzag: undefined,
            drawDirection: undefined,
            textDrawStyle: undefined,
            outlineDetect: undefined,
            detectionAlgorithm: undefined,
            strokeStyle: undefined,
            coloringStyle: undefined,
            outlineColor: undefined,
            outlineThickness: undefined,
            speed: undefined,
            handSpeed: undefined,
            chunks: undefined,
            specChunks: undefined,
          },
          ...(isText
            ? {
                assetId: `asset-${ll.id}` as never,
                textStyle: {
                  text: String(ll._textContent ?? ''),
                  fontFamily: String(ll._textFont ?? 'DM Sans'),
                  fontSize: Number(ll._textSize ?? 72),
                  bold: Boolean(ll._textBold),
                  italic: Boolean(ll._textItalic),
                  align: (ll._textAlign ?? 'left') as 'left' | 'center' | 'right',
                  color: String(ll._textColor ?? '#000000'),
                  lineHeight: Number(ll._textLineHeight ?? 1.3),
                  letterSpacing: Number(ll._textSpacing ?? 0),
                },
              }
            : {
                assetId: `asset-${ll.id}` as never,
                resizePct: typeof ll.resizePct === 'number' ? ll.resizePct : 100,
                sourceMetadata: {
                  naturalWidth: 100,
                  naturalHeight: 100,
                  hasPngAlpha: Boolean(ll.hasPngAlpha),
                },
              }),
        } as Layer)
      const transform = {
        x: Number(ll.x ?? base.transform.x),
        y: Number(ll.y ?? base.transform.y),
        width: Math.max(20, Number(ll.w ?? base.transform.width)),
        height: Math.max(20, Number(ll.h ?? base.transform.height)),
        rotation: base.transform.rotation,
      }
      const animationOrder: AnimationOrder =
        ll.animOrder === null || ll.animOrder === undefined
          ? null
          : Math.max(1, Number(ll.animOrder))
      if (base.type === 'image') {
        const img: ImageLayer = {
          ...(base as ImageLayer),
          name: String(ll.name ?? base.name),
          visible: ll.visible !== false,
          opacity: typeof ll.opacity === 'number' ? ll.opacity : 1,
          animationOrder,
          transform,
          resizePct:
            typeof ll.resizePct === 'number' ? ll.resizePct : (base as ImageLayer).resizePct,
        }
        return img
      }
      const txt: TextLayer = {
        ...(base as TextLayer),
        name: String(ll.name ?? base.name),
        visible: ll.visible !== false,
        opacity: typeof ll.opacity === 'number' ? ll.opacity : 1,
        animationOrder,
        transform,
      }
      return txt
    })
    useLayerStore.getState().setLayers(next)
  },
}
