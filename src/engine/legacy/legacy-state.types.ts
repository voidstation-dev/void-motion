/**
 * Legacy Inkplainer state types.
 *
 * These model the ACTUAL shape of the legacy global `state` object
 * (`legacy/index.html:5570`) and the legacy `AnimationEngine` API
 * (`legacy/animations.js:3533`), NOT the new domain model. They exist so the
 * legacy adapter (`legacy-state.adapter.ts`) can read/write the legacy app
 * through a typed boundary instead of bare `any`.
 *
 * Per MIGRATION_00 §15 ("Legacy state typing"), we model the MINIMUM needed
 * for adapter correctness — not the entire 10k-line runtime. Fields that are
 * too tangled or engine-internal are typed `unknown` and narrowed at the
 * adapter boundary (Rule 5: no `any` as migration shortcut).
 *
 * The legacy `state` object mixes serializable settings with runtime objects
 * (`HTMLImageElement`, `HTMLCanvasElement`, `MediaRecorder`); that coupling
 * is exactly what the new domain model eliminates, but we must represent it
 * faithfully here.
 */

// ─── Legacy enum string values (verbatim from legacy code) ──────────────────

/**
 * Legacy animation style raw values. See `legacy/index.html:3348, 3410, 5573`.
 * Includes BOTH the Animation-tab values and the Drawing-tab values, because
 * the legacy `state.animStyle` field holds values from both sets in one
 * string field.
 */
export type LegacyAnimationStyle =
  | 'scanner'
  | 'contour'
  | 'outlinechunks'
  | 'chunkjump'
  | 'spec-human'
  | 'spec-animal'
  | 'spec-portrait'
  | 'spec-vehicle'
  | 'spec-building'
  | 'spec-landscape'
  | 'spec-spiral'
  | 'outlinefill'
  | 'illustfill'
  | 'outlineonly'
  | 'spec-text'
  // Dead branches (no UI path) — kept for completeness of the legacy type.
  | 'scribble'
  | 'nervous'
  | 'top-anchor'
  | 'gesture'
  | 'spec-nature'

/** Legacy hand style raw values. See `legacy/index.html:3859, 3688, 5573`. */
export type LegacyHandStyle = 'ghost' | 'custom1' | 'custom2' | 'custom3' | 'custom4'

/** Legacy draw direction raw values. See `legacy/index.html:3634`. */
export type LegacyDrawDirection = 'ltr' | 'rtl' | 'ttb' | 'btt'

/** Legacy text draw style raw values. See `legacy/index.html:5573`. */
export type LegacyTextDrawStyle = 'reveal' | 'outline' | 'outline-fill'

/** Legacy stroke style raw values. See `legacy/index.html:3422`. */
export type LegacyStrokeStyle = 'default' | 'charcoal' | 'multipass' | 'fountain' | 'blueprint'

/** Legacy detection algorithm raw values. See `legacy/index.html:3468`. */
export type LegacyDetectionAlgorithm = 'classic' | 'adaptive' | 'morph-shell' | 'canny2'

/** Legacy coloring style raw values. See `legacy/index.html:3444`. */
export type LegacyColoringStyle = 'sparse' | 'filled' | 'watercolor'

/** Legacy reveal style raw values. See `legacy/index.html:3504`. */
export type LegacyRevealStyle =
  'instant' | 'fade' | 'dissolve' | 'wipe-right' | 'iris' | 'scan-lines'

/** Legacy export format raw values. See `legacy/index.html:9000`. */
export type LegacyExportFormat = 'webm' | 'mp4'

/** Legacy export quality raw values. See `legacy/index.html:8971`. */
export type LegacyExportQuality = 'high' | 'medium' | 'low'

/** Legacy canvas background shape. See `legacy/index.html:5572`. */
export interface LegacyCanvasBackground {
  readonly type: 'solid' | 'gradient' | 'custom'
  readonly val: string
  readonly key?: string
}

// ─── Legacy layer ────────────────────────────────────────────────────────────

/**
 * A legacy layer. The legacy app uses a single object shape for both image
 * and text layers, distinguished by `kind === 'text'`. `img` is a runtime
 * `HTMLImageElement` — the new domain model replaces this with an `AssetId`.
 *
 * See `legacy/index.html:5814` (image) and `:8325` (text).
 */
export interface LegacyLayer {
  readonly id: number
  readonly name: string
  /** Runtime image — NOT serializable. */
  img: HTMLImageElement
  x: number
  y: number
  w: number
  h: number
  baseW: number
  baseH: number
  resizePct: number
  animStyle: LegacyAnimationStyle
  hand: LegacyHandStyle
  /** `null` = follow visual stack order. */
  animOrder: number | null
  opacity: number
  visible: boolean
  groupId: number | null
  speed: number
  handSpeed: number
  chunks: number
  specChunks: number
  hasPngAlpha: boolean
  // Optional per-layer overrides (undefined unless set).
  readonly zigzag?: boolean
  readonly outlineDetect?: number
  readonly outlineAlgorithm?: LegacyDetectionAlgorithm
  readonly outlineStrokeStyle?: LegacyStrokeStyle
  readonly colorStyle?: LegacyColoringStyle
  readonly outlineColor?: string
  readonly outlineThickness?: number
  readonly textAnimDir?: LegacyDrawDirection
  readonly textDrawStyle?: LegacyTextDrawStyle
  // Text-layer metadata (present iff kind === 'text').
  readonly kind?: 'text'
  readonly _textContent?: string
  readonly _textFont?: string
  readonly _textSize?: number
  readonly _textBold?: boolean
  readonly _textItalic?: boolean
  readonly _textAlign?: 'left' | 'center' | 'right'
  readonly _textColor?: string
  readonly _textLineHeight?: number
  readonly _textSpacing?: number
  /** Serialization-only; always null at runtime for in-app-created layers. */
  readonly textProps?: unknown
  // Non-destructive crop source retention.
  readonly _origImg?: HTMLImageElement
  readonly _origX?: number
  readonly _origY?: number
  readonly _origW?: number
  readonly _origH?: number
}

/** A legacy layer group. See `legacy/index.html:6461`. */
export interface LegacyLayerGroup {
  readonly id: number
  readonly name: string
  collapsed: boolean
  visible: boolean
  layerIds: number[]
}

// ─── Legacy global state ─────────────────────────────────────────────────────

/**
 * The minimum legacy `state` shape the adapter needs.
 *
 * Per MIGRATION_00 §15, this is expanded only when a migration feature needs
 * additional fields. The full legacy `state` has ~60 fields plus runtime
 * slot state (`_SLOT_KEYS`, `legacy/animations.js:1781`); we model the
 * serializable + adapter-relevant subset and leave the rest as `unknown`
 * internals.
 *
 * See `legacy/index.html:5570` for the declaration.
 */
export interface LegacyInkplainerState {
  // Editor mode
  mode: 'image' | 'text'
  canvasBg: LegacyCanvasBackground
  color: string
  hand: LegacyHandStyle
  animStyle: LegacyAnimationStyle
  zigzag: boolean
  textAnimDir: LegacyDrawDirection
  textDrawStyle: LegacyTextDrawStyle
  outlineDetect: number
  outlineAlgorithm: LegacyDetectionAlgorithm
  colorStyle: LegacyColoringStyle
  canvasW: number
  canvasH: number

  // Playback
  playing: boolean
  animFrame: number | null
  done: boolean

  // Layers & groups
  layers: LegacyLayer[]
  selectedLayerId: number | null
  activeLayerIndex: number
  groups: LegacyLayerGroup[]

  // Presets
  activePresetId: string | null

  // Export (runtime-assigned, not in the declaration literal).
  exportFormat?: LegacyExportFormat
  exportQuality?: LegacyExportQuality
  exportPNG?: boolean

  // Export recording runtime state.
  recording: boolean
  mediaRecorder: MediaRecorder | null
  chunks: Blob[]

  // Per-style runtime tick state (slot-swapped). Typed `unknown` because the
  // legacy engine swaps ~60 of these keys in/out per slot and most are
  // engine-internal; the adapter does not read them directly.
  [key: string]: unknown
}

// ─── Legacy AnimationEngine API ─────────────────────────────────────────────

/**
 * The legacy `window.AnimationEngine` API surface, as attached by
 * `legacy/animations.js:3533`. Only the methods the adapter may call are
 * declared; the rest are typed `unknown`.
 *
 * See `legacy/animations.js:3533` for the object literal.
 */
export interface LegacyAnimationEngineApi {
  // Setup (per style)
  setupScanner?: () => void
  setupContour?: () => void
  setupOutlineChunks?: () => void
  setupOutlineFill?: () => void
  setupIllustFill?: () => void
  setupChunkJump?: () => void
  setupScribble?: () => void
  setupSpecText?: () => void
  setupSpecialized?: () => void
  // Tick (per style)
  tickScanner?: (speed: number) => void
  tickContour?: (speed: number) => void
  tickOutlineChunks?: (speed: number) => void
  tickOutlineFill?: (speed: number) => void
  tickIllustFill?: (speed: number) => void
  tickOutlineOnly?: (speed: number) => void
  tickChunkJump?: (speed: number) => void
  tickScribble?: (speed: number) => void
  tickSpecText?: (speed: number) => void
  tickSpecialized?: (speed: number) => void
  // Slot system (parallel animation)
  _SLOT_KEYS?: readonly string[]
  _slotIn?: (slot: unknown) => void
  _slotOut?: (slot: unknown) => void
  _tickSlot?: (slot: unknown) => void
  _tickAllSlots?: () => void
  [key: string]: unknown
}

// ─── Window globals ──────────────────────────────────────────────────────────

/**
 * Typed `window` augmentation for the legacy globals the adapter may touch.
 *
 * Per MIGRATION_00 §17, legacy globals are typed explicitly and accessed
 * through runtime guards (never bare non-null assertions). The legacy app
 * also attaches wrapped versions of `selectLayer`, `selectRatio`, etc. to
 * `window`; only the ones the adapter needs are declared here.
 */
/**
 * The legacy project record shape — what IndexedDB stores under the `projects`
 * objectStore. Captured from `legacy/index.html:4660` (create) + `4284`
 * (save). The `state` field holds the serializable project snapshot; the
 * legacy app never sets `schemaVersion` (KQ-003).
 */
export interface LegacyProjectRecord {
  /** IndexedDB auto-increment key. */
  readonly id: number
  readonly name: string
  readonly createdAt: string
  readonly modifiedAt: string
  readonly state?: LegacySavedState
}

/**
 * The serializable snapshot the legacy app persists inside a project record
 * (`legacy/index.html:4284`). Modeled minimally — only the fields the M05
 * project lifecycle needs to read (size summary + timestamp). The full
 * layer/animation restoration round-trip is expanded in M08.
 */
export interface LegacySavedState {
  readonly canvasW?: number
  readonly canvasH?: number
  readonly canvasBg?: LegacyCanvasBackground
  readonly layers?: readonly unknown[]
  readonly groups?: readonly unknown[]
  readonly [key: string]: unknown
}

/**
 * A minimal stub of the legacy element-based controls. The legacy
 * `selectHand`/`selectRatio`/`selectRes`/`selectAnim` functions take a DOM
 * element and read `el.dataset.<key>` (+ mutate `el.classList`). The new
 * service does not have the real legacy DOM elements, so it passes a stub
 * carrying just the `dataset` value. The legacy functions' classList
 * mutations are no-ops against empty NodeLists in the React document.
 */
export interface LegacyControlElement {
  readonly dataset: Record<string, string>
  readonly classList: {
    add(...tokens: string[]): void
    remove(...tokens: string[]): void
    toggle(token: string, force?: boolean): void
  }
}

declare global {
  interface Window {
    state?: LegacyInkplainerState
    AnimationEngine?: LegacyAnimationEngineApi
    selectLayer?: (id: number) => void
    selectAnim?: (el: LegacyControlElement | string) => void
    selectHand?: (el: LegacyControlElement) => void
    selectRatio?: (el: LegacyControlElement) => void
    selectRes?: (el: LegacyControlElement) => void
    restartAnim?: () => void
    togglePlay?: () => void
    /** Seek the animation by ratio. Legacy `seekAnim` (`legacy/index.html:8803`). */
    seekAnim?: (e: { offsetX: number; currentTarget: { clientWidth: number } }) => void
    /** Set animation progress 0..1. Legacy `setProgress` (`legacy/index.html:8571`). */
    setProgress?: (ratio: number) => void
    _layerIdCounter?: number
    // ── M05: legacy project-lifecycle globals (legacy/index.html:4272+) ──
    /** Save the current project. Legacy `saveProject` (`legacy/index.html:4272`). */
    saveProject?: (projectId?: number) => void
    /** Load a project by IndexedDB key. Legacy `loadProject` (`legacy/index.html:4376`). */
    loadProject?: (projectId: number) => void
    /** Create + load a fresh project. Legacy `createNewProject` (`legacy/index.html:4639`). */
    createNewProject?: () => Promise<void> | void
    /** Delete a project by key. Legacy `deleteProject` (`legacy/index.html:4685`). */
    deleteProject?: (projectId: number, event?: { stopPropagation: () => void }) => void
    /** Rebuild the project list UI. Legacy `refreshProjectsList` (`legacy/index.html:4709`). */
    refreshProjectsList?: () => void
    /** Show the projects modal. Legacy `openProjectsModal` (`legacy/index.html:5210`). */
    openProjectsModal?: () => void
    /** Hide the projects modal. Legacy `closeProjectsModal` (`legacy/index.html:5215`). */
    closeProjectsModal?: () => void
    /** Begin inline rename. Legacy `startRenaming` (`legacy/index.html:4798`). */
    startRenaming?: () => void
    /** Commit inline rename. Legacy `finishRenaming` (`legacy/index.html:4809`). */
    finishRenaming?: () => void
    /** Update the project name display. Legacy `updateProjectNameDisplay` (`legacy/index.html:4848`). */
    updateProjectNameDisplay?: (name: string) => void
    /** Update the save indicator timestamp. Legacy `updateLastSaveTime` (`legacy/index.html:4862`). */
    updateLastSaveTime?: (isoString: string) => void
    /** Reschedule the 5s autosave timer. Legacy `scheduleAutoSave` (`legacy/index.html:4876`). */
    scheduleAutoSave?: () => void
    /** Show the inline toast. Legacy `showToast` (`legacy/index.html:5135`). */
    showToast?: (msg: string, anchorEl?: unknown, durationMs?: number) => void
    /** Current project IndexedDB key. Legacy `currentProjectId` (`legacy/index.html:4234`). */
    currentProjectId?: number | null
    // ── M06: global editor controls (legacy/index.html:5110+) ──
    /** Undo the last change. Legacy `undo` (`legacy/index.html:5110`). */
    undo?: () => void
    /** Redo. Legacy `redo` (`legacy/index.html:5118`). */
    redo?: () => void
    /** Open the export banner. Legacy `openExportBanner` (`legacy/index.html:8974`). */
    openExportBanner?: () => void
    /** Close the export banner. Legacy `closeExportBanner` (`legacy/index.html:9022`). */
    closeExportBanner?: () => void
    /** Regenerate the animation. Legacy `generate` (`legacy/index.html:5977`). */
    generate?: () => void
    // ── M08: legacy layer-panel globals (legacy/index.html:5793+) ──
    /** Rebuild the layer list DOM. Legacy `renderLayerList` (`legacy/index.html:6222`). */
    renderLayerList?: () => void
    /** Remove a layer by id. Legacy `removeLayer` (`legacy/index.html:5841`). */
    removeLayer?: (id: number) => void
    /** Toggle a layer's visibility. Legacy `toggleLayerVisibility` (`legacy/index.html:6452`). */
    toggleLayerVisibility?: (id: number) => void
    /** Set a layer's animation order. Legacy `setLayerOrder` (`legacy/index.html:6384`). */
    setLayerOrder?: (id: number, val: string | number) => void
    /** Set a layer's opacity [0,1]. Legacy `setLayerOpacity` (`legacy/index.html:6391`). */
    setLayerOpacity?: (id: number, val: number) => void
    /** Set a layer's resize percentage. Legacy `setLayerResize` (`legacy/index.html:6416`). */
    setLayerResize?: (id: number, pct: number) => void
    /** Set a layer's position/size property. Legacy `setLayerPos` (`legacy/index.html:6401`). */
    setLayerPos?: (id: number, prop: 'x' | 'y' | 'w' | 'h', val: number) => void
    /** Begin inline layer rename. Legacy `startLayerRename` (`legacy/index.html:6492`). */
    startLayerRename?: (id: number, nameEl: unknown) => void
    /** Switch the input tab. Legacy `switchTab` (`legacy/index.html:6809`). */
    switchTab?: (m: 'image' | 'text') => void
    /** Create a group from the selected layer. Legacy `createGroupFromSelected` (`legacy/index.html:6474`). */
    createGroupFromSelected?: () => void
    /** Toggle a group's collapsed state. Legacy `toggleGroupCollapse` (`legacy/index.html:6481`). */
    toggleGroupCollapse?: (gid: number) => void
    /** Rename a group. Legacy `renameGroup` (`legacy/index.html:6487`). */
    renameGroup?: (gid: number, name: string) => void
    /** Toggle a group's visibility. Legacy `toggleGroupVisibility` (`legacy/index.html:6520`). */
    toggleGroupVisibility?: (gid: number) => void
    /** Dissolve a group. Legacy `dissolveGroup` (`legacy/index.html:6529`). */
    dissolveGroup?: (gid: number) => void
    /** Assign a layer to a group. Legacy `assignLayerToGroup` (`legacy/index.html:6536`). */
    assignLayerToGroup?: (layerId: number, gidStr: string) => void
  }
}
