/**
 * Branded primitive types.
 *
 * Branded types prevent the most common kind of ID bug — passing a value of
 * one identity domain into a slot that expects another (e.g. a LayerId where a
 * ProjectId is required). They are erased at runtime: a branded string is
 * still a plain string, and a branded number is still a plain number.
 *
 * The legacy Inkplainer application uses bare numeric IDs (layer IDs come from
 * a `let _layerIdCounter` incremented per layer; group IDs from a separate
 * counter; project IDs are IndexedDB auto-increment keys). The new domain
 * model uses branded string IDs throughout. Conversion happens exclusively
 * inside the legacy adapter boundary (see `src/engine/legacy/`), never in
 * feature or UI code.
 *
 * See MIGRATION_00 §6 "Branded IDs from the beginning".
 */

/**
 * The brand marker. A value of type `Brand<T, B>` is structurally just `T`,
 * but TypeScript treats it as incompatible with every other branded type.
 */
export type Brand<T, TBrand extends string> = T & {
  readonly __brand: TBrand
}

// ─── Project ────────────────────────────────────────────────────────────────

/** Unique identifier for a project. */
export type ProjectId = Brand<string, 'ProjectId'>

// ─── Layers ─────────────────────────────────────────────────────────────────

/** Unique identifier for a layer (image or text) within a project. */
export type LayerId = Brand<string, 'LayerId'>

/**
 * Unique identifier for an animation group within a project.
 *
 * In the legacy app, layers that share the same numeric `animOrder` value
 * animate in parallel. The new model may later promote a parallel group to a
 * first-class entity; this ID reserves that namespace now.
 */
export type AnimationGroupId = Brand<string, 'AnimationGroupId'>

/**
 * Identifier for a layer group (the user-facing grouping concept in the
 * layer panel, distinct from the animation-parallel group above).
 */
export type LayerGroupId = Brand<string, 'LayerGroupId'>

// ─── Assets ─────────────────────────────────────────────────────────────────

/**
 * Stable reference to a binary asset (an imported image, a rendered text
 * layer raster, a hand image, etc.).
 *
 * Assets are stored out-of-band in a runtime registry (see
 * `RuntimeAssetRegistry`); serializable project state only ever holds an
 * `AssetId`. This keeps `HTMLImageElement` / `ImageBitmap` out of persisted
 * state, per MIGRATION_00 §14 "Runtime must be separate from domain types".
 */
export type AssetId = Brand<string, 'AssetId'>

// ─── Presets ────────────────────────────────────────────────────────────────

/** Unique identifier for an animation/drawing preset (built-in or custom). */
export type PresetId = Brand<string, 'PresetId'>
