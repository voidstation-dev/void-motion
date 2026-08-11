/**
 * Runtime types — browser/DOM objects that must NEVER appear in persisted
 * project state.
 *
 * Per MIGRATION_00 §14 ("Runtime must be separate from domain types") and
 * the master plan §4.2, objects like `HTMLCanvasElement`,
 * `CanvasRenderingContext2D`, `HTMLImageElement`, `ImageBitmap`,
 * `MediaRecorder`, and `VideoEncoder` belong in the engine/runtime layer,
 * not in the serializable domain model. This module declares the runtime
 * interfaces the future engine will expose.
 */

import type { AssetId } from './brand'

/**
 * The set of canvases the editor runtime owns.
 *
 * Legacy canvases (`legacy/index.html:3809`): `main-canvas`, `select-canvas`,
 * `crop-canvas`, `outline-overlay`, `slicer-preview-canvas`. There is NO
 * separate hand canvas — the hand is drawn directly onto `main-canvas`
 * during the animation tick (`legacy/index.html:8815`). The runtime
 * interface here models the production-relevant subset.
 */
export interface CanvasRuntime {
  readonly mainCanvas: HTMLCanvasElement
  /** Selection-handles + pointer interaction overlay. */
  readonly selectionCanvas: HTMLCanvasElement
  /** Crop overlay canvas (only active during crop tool). */
  readonly cropCanvas?: HTMLCanvasElement
}

/**
 * Registry mapping asset IDs to runtime image objects.
 *
 * A layer stores only an `AssetId`; the renderer resolves it to an
 * `HTMLImageElement` (or `ImageBitmap`) through this registry at draw time.
 * This keeps `HTMLImageElement` out of persisted state.
 */
export interface RuntimeAssetRegistry {
  get(assetId: AssetId): HTMLImageElement | ImageBitmap | undefined
  register(assetId: AssetId, image: HTMLImageElement | ImageBitmap): void
  unregister(assetId: AssetId): void
  has(assetId: AssetId): boolean
}

/**
 * A snapshot of the live legacy `state` object, for adapter use only.
 *
 * The legacy app keeps a single mutable `state` global
 * (`legacy/index.html:5570`). During parallel animation it swaps subsets of
 * this state in and out per "slot" (`legacy/animations.js:1781`,
 * `_SLOT_KEYS`). The new domain model does not replicate this machinery; it
 * is encapsulated behind the legacy adapter.
 */
export interface LegacyRuntimeSnapshot {
  readonly playing: boolean
  readonly done: boolean
  readonly progress: number
  readonly currentGroupIndex: number
}
