/**
 * Project domain types — the versioned, serializable project document.
 *
 * Derived from the legacy implementation:
 * - The legacy app persists a `savedState` object to IndexedDB
 *   (`legacy/index.html:4284`) with NO `schemaVersion` field — a known quirk
 *   the migration must back-fill. The new model versions from day one
 *   (MIGRATION_00 §7, §16).
 * - Legacy layers carry both serializable geometry AND runtime image
 *   objects (`layer.img` is an `HTMLImageElement`). The new model stores
 *   only an `AssetId` reference; the runtime image lives in a
 *   `RuntimeAssetRegistry` (MIGRATION_00 §14).
 * - Legacy project defaults: `animStyle:'chunkjump'`, `hand:'custom1'`,
 *   `zigzag:true`, `textAnimDir:'ltr'`, `textDrawStyle:'reveal'`,
 *   `outlineDetect:50`, `outlineAlgorithm:'classic'`,
 *   `colorStyle:'filled'`, `canvasW:1280`, `canvasH:720`,
 *   `canvasBg:{type:'solid',val:'white'}` (`legacy/index.html:5571`).
 */

import type { LayerGroupId, ProjectId } from './brand'
import type { CanvasSettings } from './canvas'
import type { Layer } from './layer'
import type {
  AnimationStyle,
  ColoringStyle,
  DetectionAlgorithm,
  DrawDirection,
  HandStyle,
  OutlineDetect,
  RevealStyle,
  StrokeStyle,
  TextDrawStyle,
} from './animation'

/** The current project document schema version. */
export const PROJECT_SCHEMA_VERSION = 1

/**
 * Project-wide animation/drawing defaults.
 *
 * Layers inherit these when their per-layer override is `undefined`
 * (mirroring legacy slot seeding, `legacy/index.html:6062`).
 */
export interface ProjectAnimationDefaults {
  readonly animationStyle: AnimationStyle
  readonly handStyle: HandStyle
  readonly zigzag: boolean
  readonly drawDirection: DrawDirection
  readonly textDrawStyle: TextDrawStyle
  readonly outlineDetect: OutlineDetect
  readonly detectionAlgorithm: DetectionAlgorithm
  readonly strokeStyle: StrokeStyle
  readonly coloringStyle: ColoringStyle
  /** Default stroke/text color. Legacy `state.color` = `'#1a1a1a'`. */
  readonly color: string
  /**
   * Final image reveal style. Legacy stores this on the top-level
   * `_revealStyle` global (`legacy/index.html:7319`), not on `state`; the
   * new model promotes it to a project-level setting.
   */
  readonly revealStyle: RevealStyle
}

/** Default project animation settings (match legacy `state` defaults). */
export const DEFAULT_PROJECT_ANIMATION: ProjectAnimationDefaults = {
  animationStyle: 'chunk-jump',
  handStyle: 'hand-1',
  zigzag: true,
  drawDirection: 'left-to-right',
  textDrawStyle: 'reveal',
  outlineDetect: 50,
  detectionAlgorithm: 'classic',
  strokeStyle: 'default',
  coloringStyle: 'filled',
  color: '#1a1a1a',
  revealStyle: 'fade',
}

/**
 * A user-facing layer group (the panel grouping concept, distinct from
 * animation-parallel groups).
 *
 * Legacy shape (`legacy/index.html:6461`): `{ id, name, collapsed, visible,
 * layerIds:[] }`. Group membership is stored both on the layer
 * (`layer.groupId`) and in the group's `layerIds` — both must stay in sync.
 */
export interface LayerGroup {
  readonly id: LayerGroupId
  readonly name: string
  readonly collapsed: boolean
  readonly visible: boolean
  readonly layerIds: readonly string[]
}

/**
 * The versioned, serializable project document.
 *
 * This is what gets persisted (and, later, exported as a `.inkproj` bundle).
 * It contains NO runtime objects — only IDs, geometry, settings, and asset
 * references.
 */
export interface ProjectDocumentV1 {
  readonly schemaVersion: 1
  readonly id: ProjectId
  readonly name: string
  readonly canvas: CanvasSettings
  readonly layers: readonly Layer[]
  readonly groups: readonly LayerGroup[]
  readonly animation: ProjectAnimationDefaults
  readonly createdAt: string
  readonly updatedAt: string
}

/** The current project document type. */
export type ProjectDocument = ProjectDocumentV1

/**
 * Project summary used in the project list. Legacy `refreshProjectsList`
 * (`legacy/index.html:4709`) sorts by `modifiedAt` descending and computes
 * size from `JSON.stringify(project.state)`.
 */
export interface ProjectSummary {
  readonly id: ProjectId
  readonly name: string
  readonly createdAt: string
  readonly modifiedAt: string
  /** Serialized size in bytes (legacy computes via Blob size). */
  readonly sizeBytes: number
}

// ─── Presets ─────────────────────────────────────────────────────────────────

/**
 * Animation/drawing preset.
 *
 * Legacy (`legacy/index.html:6983`): built-in presets have `id`, `name`,
 * `desc`, and an 11-field `settings` object. Custom presets are stored in
 * `localStorage` under `wb_custom_presets_v1` (`legacy/index.html:6981`).
 *
 * The preset `settings` shape is exactly the 11 fields the legacy
 * `captureCurrentSettings` (`legacy/index.html:7059`) captures.
 */
export interface PresetSettings {
  readonly animationStyle: AnimationStyle
  readonly handStyle: HandStyle
  readonly zigzag: boolean
  readonly speed: number
  readonly handSpeed: number
  readonly outlineDetect: OutlineDetect
  readonly detectionAlgorithm: DetectionAlgorithm
  readonly strokeStyle: StrokeStyle
  readonly coloringStyle: ColoringStyle
  readonly drawDirection: DrawDirection
  readonly textDrawStyle: TextDrawStyle
}

export interface Preset {
  readonly id: string
  readonly name: string
  readonly desc?: string
  readonly settings: PresetSettings
  /** Built-in vs custom (custom presets persist in localStorage). */
  readonly kind: 'built-in' | 'custom'
}

/** Maximum built-in presets. Legacy `MAX_BUILTIN = 4` (`legacy/index.html:6979`). */
export const MAX_BUILTIN_PRESETS = 4
/** Maximum custom presets. Legacy `MAX_CUSTOM = 6` (`legacy/index.html:6980`). */
export const MAX_CUSTOM_PRESETS = 6
/** localStorage key for custom presets. Legacy value. */
export const CUSTOM_PRESETS_STORAGE_KEY = 'wb_custom_presets_v1'
