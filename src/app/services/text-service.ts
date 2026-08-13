/**
 * Text tool service (M13).
 *
 * Coordinates the text tool between the React UI (the text panel + the
 * on-canvas editor overlay), the typed layer + selection Zustand stores, and
 * the legacy runtime. Mirrors the legacy text editor system
 * (`legacy/index.html:8035-8370`), ported to a typed service so React owns
 * the text-session contract:
 *
 * ```text
 * React text UI → text service → layer store + legacy adapter
 * ```
 *
 * Legacy behavior parity (vs `legacy/index.html`):
 *   - `_ts` module state (8047-8062): font 'Caveat', size 72, bold false,
 *     italic false, align 'left', color '#1a1a1a', lineHeight 1.3, spacing 0;
 *     editor state active=false, placing=false, editingId=null, canvasX/Y=0.
 *   - `activateTextPlacement` (8116-8126): no-op if playing; placing=true,
 *     editingId=null.
 *   - `deactivateTextPlacement` (8128-8131): placing=false.
 *   - `openTextEditor(canvasX, canvasY, existingLayer)` (8129-8160):
 *     deactivate placement; active=true; set position + editingId; if editing
 *     an existing text layer, restore its `_text*` settings into `_ts`.
 *   - `closeTextEditor(commit)` (8162-8174): if commit && txt.trim() →
 *     `_commitTextLayer(txt)`; active=false, editingId=null.
 *   - `_commitTextLayer(text)` (8261-8373): measure text; render to an
 *     offscreen canvas; on `Image.onload`, push undo (edit) / push undo (new),
 *     build the layer (kind 'text', `_text*` metadata, hasPngAlpha true,
 *     resizePct 100, animStyle = oldLayer?.animStyle ?? (state.animStyle ||
 *     'spec-text'), animOrder = oldLayer?.animOrder ?? null, opacity/visible/
 *     groupId/speed/handSpeed/chunks/specChunks inherited from oldLayer or
 *     defaults), splice in place (edit) or append (new), selectLayer(id),
 *     scheduleAutoSave.
 *   - `onTextEditorKeydown` (8254-8258): Escape → closeTextEditor(false);
 *     Ctrl/Cmd+Enter → closeTextEditor(true).
 *   - canvas mousedown (6693-6707): if placing → openTextEditor(x,y,null); if
 *     active → closeTextEditor(true) (click outside commits).
 *   - dblclick (6773-6781): if hit && hit.kind === 'text' → switchTab('text'),
 *     openTextEditor(hit.x, hit.y, hit).
 *   - Escape key (5173-5176): if placing → deactivateTextPlacement; if active
 *     → closeTextEditor(false).
 *
 * Per M13 "preserve": text layer creation/editing, text metrics, editing
 * behavior parity, keyboard behavior parity. The legacy runtime remains the
 * rasterization authority (the offscreen-canvas render + `Image.onload` in
 * `_commitTextLayer`) until the renderer is migrated (M19); the typed service
 * builds a parallel typed `TextLayer` in the store so React renders without
 * the legacy bitmap, and delegates the rasterize + redraw + autosave to the
 * legacy `_commitTextLayer` when co-hosted.
 */
import { useLayerStore, useSelectionStore, usePlaybackStore, useCanvasStore } from '@/app/store'
import type { LayerId } from '@/types/brand'
import type { TextLayer, LayerAnimationOverrides, TextStyle } from '@/types/layer'
import {
  DEFAULT_TEXT_STYLE,
  clampFontSize,
  textLayerName,
  measureText,
  TEXT_LINEHEIGHT_DEFAULT,
  TEXT_SPACING_DEFAULT,
} from '@/engine/image-processing/text'
import { classifyLegacyAnimStyle } from '@/engine/legacy/legacy-enum-mapping'
import { DEFAULT_ANIMATION_STYLE } from '@/types/animation'

import { commitLegacyTextLayer } from '@/engine/legacy/legacy-text'

/** Guarded legacy `scheduleAutoSave`. */
function legacyScheduleAutoSave(): void {
  if (typeof window !== 'undefined' && typeof window.scheduleAutoSave === 'function') {
    window.scheduleAutoSave()
  }
}

/** Guarded legacy `selectLayer`. */
function legacySelectLayer(id: number): void {
  if (typeof window !== 'undefined' && typeof window.selectLayer === 'function') {
    window.selectLayer(id)
  }
}

/** Map a branded domain LayerId back to the legacy numeric id. */
function layerIdToLegacyNum(id: LayerId): number {
  const s = String(id)
  const m = s.match(/(\d+)$/)
  return m ? Number(m[1]) : Number(s)
}

// ── session reactivity ────────────────────────────────────────────────
// The text session is tool state mutated in place (NOT Zustand state), so the
// service owns a lightweight pub/sub. React subscribes via
// `useSyncExternalStore(textService.subscribe, textService.getSnapshot)`.
// Every mutating method calls `notify()` so the panel + editor overlay always
// reflect the latest session without each call site remembering to broadcast.
let textTick = 0
let textListeners: ReadonlyArray<() => void> = []

/** Bump the tick + notify every subscriber. Call after any session mutation. */
function notify(): void {
  textTick++
  for (const l of textListeners) l()
}

/**
 * The temporary text-tool session. Mirrors the legacy module-level `_ts`
 * (`legacy/index.html:8047-8062`): the live text style, the editor state
 * (active/placing/editingId), and the canvas-space position of the current
 * edit. This is tool state, NOT project state — it is never persisted and
 * never written into the layer store until `commitText`.
 */
export interface TextSession {
  /** The live text style being edited (mirrors `_ts` font/size/bold/etc). */
  textStyle: TextStyle
  /** True while waiting for a canvas click to place new text (`_ts.placing`). */
  placing: boolean
  /** True while the editor overlay is open (`_ts.active`). */
  active: boolean
  /** The layer id being edited (null = new layer) (`_ts.editingId`). */
  editingId: LayerId | null
  /** The canvas-space position of the current edit (`_ts.canvasX/canvasY`). */
  canvasX: number
  canvasY: number
}

/** The current project animation style, read from the legacy `state.animStyle`. */
function currentAnimStyle(): LayerAnimationOverrides['animationStyle'] {
  if (typeof window !== 'undefined' && window.state && typeof window.state.animStyle === 'string') {
    const classified = classifyLegacyAnimStyle(window.state.animStyle)
    if (classified?.kind === 'animation') return classified.value
  }
  return DEFAULT_ANIMATION_STYLE
}

/**
 * Text tool service. Holds a single in-flight `TextSession` (mirrors the
 * legacy `_ts`). The React text panel + editor overlay call
 * `activatePlacement`/`cancelPlacement`/`openEditor`/`closeEditor`/
 * `commitText`/`setFont`/`setSize`/`setBold`/`setItalic`/`setAlign`/
 * `setColor`/`setLineHeight`/`setLetterSpacing`/`setText`.
 */
export const textService = {
  /** The in-flight text session (null when idle). */
  session: null as TextSession | null,

  /** `useSyncExternalStore` subscribe callback. */
  subscribe(listener: () => void): () => void {
    textListeners = [...textListeners, listener]
    return () => {
      textListeners = textListeners.filter((l) => l !== listener)
    }
  },

  /** `useSyncExternalStore` getSnapshot callback (returns a primitive). */
  getSnapshot(): number {
    return textTick
  },

  /**
   * Enter text-placement mode. Mirrors `activateTextPlacement`
   * (`legacy/index.html:8116-8126`): no-op if playing; placing=true,
   * editingId=null. Opens a fresh session with the default text style so the
   * panel reflects the settings that will be applied on placement.
   */
  activatePlacement(): boolean {
    if (usePlaybackStore.getState().status === 'playing') return false
    this.session = {
      textStyle: { ...DEFAULT_TEXT_STYLE },
      placing: true,
      active: false,
      editingId: null,
      canvasX: 0,
      canvasY: 0,
    }
    useSelectionStore.getState().setEditorMode('text')
    notify()
    return true
  },

  /**
   * Exit text-placement mode. Mirrors `deactivateTextPlacement`
   * (`legacy/index.html:8128-8131`): placing=false. Keeps the session alive
   * (the panel still shows the style settings) but the next canvas click no
   * longer places text.
   */
  cancelPlacement(): void {
    const session = this.session
    if (session) session.placing = false
    notify()
  },

  /**
   * Open the text editor at a canvas-space position. Mirrors `openTextEditor`
   * (`legacy/index.html:8129-8160`): deactivate placement; active=true; set
   * position + editingId; if editing an existing text layer, restore its
   * `textStyle` settings into the session.
   *
   * `existingLayer` is the typed `TextLayer` being edited (null for a new
   * layer). The legacy co-host receives the legacy layer object via
   * `legacyOpenTextEditor` when present.
   */
  openEditor(
    canvasX: number,
    canvasY: number,
    existingLayer: TextLayer | null,
  ): boolean {
    // Deactivate placement first (legacy 8132).
    const session = this.session
    if (session) session.placing = false

    const editingId = existingLayer ? existingLayer.id : null
    const textStyle: TextStyle = existingLayer
      ? { ...existingLayer.textStyle }
      : { ...(session?.textStyle ?? DEFAULT_TEXT_STYLE) }

    this.session = {
      textStyle,
      placing: false,
      active: true,
      editingId,
      canvasX,
      canvasY,
    }
    useSelectionStore.getState().setEditorMode('text')
    notify()
    return true
  },

  /**
   * Close the text editor. Mirrors `closeTextEditor`
   * (`legacy/index.html:8162-8174`): if `commit` && the trimmed text is
   * non-empty → `commitText(text)`; then active=false, editingId=null. A
   * discard (`commit=false`) drops the in-flight text entirely.
   *
   * Returns true if a layer was committed.
   */
  closeEditor(commit: boolean): boolean {
    const session = this.session
    if (!session || !session.active) return false
    const text = session.textStyle.text.trim()
    let committed = false
    if (commit && text) {
      committed = this.commitText(session.textStyle.text)
    }
    session.active = false
    session.editingId = null
    notify()
    return committed
  },

  /**
   * Commit the in-flight text as a text layer. Mirrors `_commitTextLayer`
   * (`legacy/index.html:8261-8373`):
   *   - push an undo snapshot (legacy pushes inside the onload boundary; we
   *     push before the typed splice so the undo stack captures the pre-commit
   *     state — the legacy co-host pushes again inside its own onload, which
   *     is a harmless duplicate snapshot that mirrors the legacy double-push
   *     on edit);
   *   - measure the text (maxW = min(canvasW, max line width + size*0.4),
   *     lineH = size*lh, totalH = lines*lineH + size*0.3);
   *   - build the typed `TextLayer` (inherit the old layer's animation when
   *     editing, else the current project animation style; animOrder=null for
   *     new, inherited for edit; opacity/visible inherited; hasPngAlpha=true,
   *     resizePct=100);
   *   - splice in place (edit) or append (new); select the new layer;
   *   - delegate the rasterize + redraw + autosave to the legacy
   *     `_commitTextLayer` when present (it rebuilds the `layer.img` from the
   *     offscreen canvas via `toDataURL` + `Image.onload`). When the legacy
   *     runtime is not co-hosted (pre-M16), the typed store update above is
   *     the only effect + a rescheduled autosave.
   *
   * Returns false if there is no session / no text.
   */
  commitText(text: string): boolean {
    const session = this.session
    if (!session) return false
    const trimmed = text.trim()
    if (!trimmed) return false

    const style = session.textStyle
    const canvasWidth = useCanvasStore.getState().canvas?.size.width ?? 1280
    // jsdom cannot measure text (no canvas 2d `measureText`), so pass empty
    // line widths — `measureText` falls back to `size*0.4` for the width so
    // the layer is never zero-sized. The legacy co-host (M16) supplies the
    // real measured width via its own `_commitTextLayer`.
    const { width, height } = measureText(
      text,
      { fontSize: style.fontSize, lineHeight: style.lineHeight },
      canvasWidth,
      [],
    )

    // Resolve the old layer (when editing) + the animation inheritance.
    const layers = useLayerStore.getState().layers
    const oldLayer =
      session.editingId !== null
        ? (layers.find((l) => l.id === session.editingId) ?? null)
        : null
    // oldText is not used, so we removed it.

    // Push an undo snapshot before mutating (legacy 8305 / 8311).
    useLayerStore.getState().pushUndo()

    // Inherit animation: old layer's overrides when editing, else the current
    // project animation style as the single override (legacy 8336-8345).
    const animation: LayerAnimationOverrides = oldLayer
      ? { ...oldLayer.animation }
      : { ...blankAnimationOverrides(), animationStyle: currentAnimStyle() }

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
    const newId = `layer-${maxN + 1}` as LayerId

    // Position: edit preserves the old layer's x/y (legacy 8302-8304); new
    // uses the placement click point (legacy 8331-8332).
    const finalX = oldLayer ? oldLayer.transform.x : Math.round(session.canvasX)
    const finalY = oldLayer ? oldLayer.transform.y : Math.round(session.canvasY)

    const newLayer: TextLayer = {
      id: newId,
      name: textLayerName(text),
      type: 'text',
      visible: oldLayer ? oldLayer.visible : true,
      opacity: oldLayer ? oldLayer.opacity : 1,
      transform: { x: finalX, y: finalY, width, height, rotation: 0 },
      animationOrder: oldLayer ? oldLayer.animationOrder : null,
      animation,
      assetId: `asset-${maxN + 1}` as never,
      textStyle: { ...style, text },
    }

    // Splice in place (edit) or append (new). The legacy placeholder-splice
    // (8306-8310) keeps the stack index on edit; the typed path splices the
    // new layer in at the old index + removes the old.
    const nextLayers = [...layers]
    if (oldLayer) {
      const idx = nextLayers.findIndex((l) => l.id === oldLayer.id)
      if (idx !== -1) {
        nextLayers.splice(idx, 1, newLayer)
      } else {
        nextLayers.push(newLayer)
      }
    } else {
      nextLayers.push(newLayer)
    }
    useLayerStore.getState().setLayers(nextLayers)
    useSelectionStore.getState().selectLayer(newLayer.id)

    // Delegate the rasterize + redraw + autosave to the legacy runtime when
    // present. We use our ported TS version of _commitTextLayer.
    const commitSuccess = commitLegacyTextLayer(text, {
      font: style.fontFamily,
      size: style.fontSize,
      bold: style.bold,
      italic: style.italic,
      color: style.color,
      align: style.align,
      lineHeight: style.lineHeight,
      spacing: style.letterSpacing
    }, {
      editingId: session.editingId !== null ? layerIdToLegacyNum(session.editingId) : null,
      canvasX: session.canvasX,
      canvasY: session.canvasY
    })

    if (!commitSuccess) {
      legacySelectLayer(layerIdToLegacyNum(newLayer.id))
      legacyScheduleAutoSave()
    }

    // Close the editor (the layer is committed).
    session.active = false
    session.editingId = null
    notify()
    return true
  },

  // ── live text-style setters (mirror `_ts.*` mutations) ──

  /** Set the font family. Mirrors `selectFont` (legacy 8077-8082). */
  setFont(family: string): void {
    const session = this.session
    if (!session) return
    session.textStyle = { ...session.textStyle, fontFamily: family }
    notify()
  },

  /**
   * Set the font size. Mirrors `updateTextState` (legacy 8108-8113):
   * `size = Math.max(10, parseInt(...) || 72)`. The max (400) is enforced by
   * the UI input element, not this clamp.
   */
  setSize(raw: number | string): void {
    const session = this.session
    if (!session) return
    session.textStyle = { ...session.textStyle, fontSize: clampFontSize(raw) }
    notify()
  },

  /** Toggle bold/italic. Mirrors `toggleTextStyle` (legacy 8084-8089). */
  toggleBold(): void {
    const session = this.session
    if (!session) return
    session.textStyle = { ...session.textStyle, bold: !session.textStyle.bold }
    notify()
  },

  toggleItalic(): void {
    const session = this.session
    if (!session) return
    session.textStyle = { ...session.textStyle, italic: !session.textStyle.italic }
    notify()
  },

  /** Set the alignment. Mirrors `setTextAlign` (legacy 8091-8096). */
  setAlign(align: 'left' | 'center' | 'right'): void {
    const session = this.session
    if (!session) return
    session.textStyle = { ...session.textStyle, align }
    notify()
  },

  /** Set the color. Mirrors `selectTextColor`/`onTextCustomColor` (8098-8106). */
  setColor(color: string): void {
    const session = this.session
    if (!session) return
    session.textStyle = { ...session.textStyle, color }
    notify()
  },

  /**
   * Set the line height. Mirrors `updateTextState` (legacy 8111):
   * `lineHeight = parseFloat(...) || 1.3`.
   */
  setLineHeight(raw: number | string): void {
    const session = this.session
    if (!session) return
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''))
    session.textStyle = {
      ...session.textStyle,
      lineHeight: Number.isFinite(n) ? n : TEXT_LINEHEIGHT_DEFAULT,
    }
    notify()
  },

  /**
   * Set the letter spacing. Mirrors `updateTextState` (legacy 8112):
   * `spacing = parseFloat(...) || 0`.
   */
  setLetterSpacing(raw: number | string): void {
    const session = this.session
    if (!session) return
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''))
    session.textStyle = {
      ...session.textStyle,
      letterSpacing: Number.isFinite(n) ? n : TEXT_SPACING_DEFAULT,
    }
    notify()
  },

  /**
   * Set the live text being edited. Mirrors the textarea `value` bound to
   * `_ts` (the legacy reads `ta.value` at commit; the typed path keeps the
   * live text in the session so the overlay + commit share one source).
   */
  setText(text: string): void {
    const session = this.session
    if (!session) return
    session.textStyle = { ...session.textStyle, text }
    notify()
  },

  // ── session selectors ──

  /** True when the text editor overlay is open. */
  isActive(): boolean {
    return this.session ? this.session.active : false
  },

  /** True when waiting for a canvas click to place new text. */
  isPlacing(): boolean {
    return this.session ? this.session.placing : false
  },

  /** The current text style (null when no session). */
  getTextStyle(): TextStyle | null {
    return this.session ? this.session.textStyle : null
  },

  /** The layer id being edited (null when no session / new layer). */
  getEditingId(): LayerId | null {
    return this.session ? this.session.editingId : null
  },

  /** The canvas-space position of the current edit. */
  getPosition(): { x: number; y: number } | null {
    const session = this.session
    if (!session) return null
    return { x: session.canvasX, y: session.canvasY }
  },

  /** True when a text session is in flight (placing or editing). */
  hasSession(): boolean {
    return this.session !== null
  },

  /** Reset the session (used by tests + on tab switch away from text). */
  reset(): void {
    this.session = null
    notify()
  },
}

/** A blank animation-overrides object (all undefined → project defaults). */
function blankAnimationOverrides(): LayerAnimationOverrides {
  return {
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
  }
}

/** Re-export the text primitives for the UI + tests. */
export {
  DEFAULT_TEXT_STYLE,
  clampFontSize,
  textLayerName,
  measureText,
} from '@/engine/image-processing/text'