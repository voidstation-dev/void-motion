/**
 * Layer domain types — a discriminated union of `ImageLayer` and `TextLayer`.
 *
 * Derived from the legacy implementation:
 * - Image layers are created by `addLayer` (`legacy/index.html:5814`).
 * - Text layers are created in the text-commit handler
 *   (`legacy/index.html:8325`) and carry `kind: 'text'` plus `_text*`
 *   metadata fields. Image layers leave `kind` unset, so the discriminator
 *   in the legacy app is `layer.kind === 'text'`.
 * - Per-layer animation/drawing overrides (`animStyle`, `hand`, `zigzag`,
 *   `outlineDetect`, `outlineAlgorithm`, `outlineStrokeStyle`, `colorStyle`,
 *   `textAnimDir`, `textDrawStyle`, `outlineColor`, `outlineThickness`) are
 *   optional; when absent the global `state.*` value is used.
 *
 * Per MIGRATION_00 §9, layers are modeled as a discriminated union, NOT one
 * giant interface with optional fields. Runtime objects (`HTMLImageElement`,
 * etc.) are deliberately absent — only an `AssetId` reference is stored.
 */

import type { AssetId, LayerId } from './brand'
import type {
  AnimationStyle,
  ColoringStyle,
  DetectionAlgorithm,
  DrawDirection,
  HandStyle,
  StrokeStyle,
  TextDrawStyle,
} from './animation'

/** Geometric transform of a layer in canvas pixel space. */
export interface LayerTransform {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  /**
   * Rotation in degrees. The legacy app does not currently expose layer
   * rotation, so this is always `0` during the parity phase. It is reserved
   * here so a future feature can add it without reshaping the persisted
   * schema.
   */
  readonly rotation: number
}

/**
 * Animation ordering.
 *
 * Legacy behavior (`legacy/index.html:5820`, `getAnimOrder` at `:5970`):
 * - `null` — the layer follows visual stack order, animated sequentially
 *   after all explicitly-ordered layers.
 * - A positive integer — layers sharing the same number animate in parallel
 *   (grouped into one `state._animGroups` entry).
 *
 * `animOrder` is set via `setLayerOrder` (`legacy/index.html:6384`): an
 * empty/non-numeric input becomes `null`, otherwise clamped to `>= 1`.
 */
export type AnimationOrder = number | null

/** Properties shared by every layer kind. */
export interface BaseLayer {
  readonly id: LayerId
  readonly name: string
  readonly visible: boolean
  /** Opacity, clamped to `[0, 1]`. Legacy default `1`. */
  readonly opacity: number
  readonly transform: LayerTransform
  /**
   * Animation sequence order. See {@link AnimationOrder}.
   */
  readonly animationOrder: AnimationOrder
  /** Per-layer animation settings (overrides win over project defaults). */
  readonly animation: LayerAnimationOverrides
}

/**
 * Per-layer animation/drawing overrides. Every field is optional; when
 * `undefined`, the project-level default applies. This mirrors the legacy
 * per-layer override semantics (see slot seeding at `legacy/index.html:6062`).
 *
 * Under `exactOptionalPropertyTypes`, optional fields here explicitly allow
 * `undefined` (via `T | undefined`) so the adapter can build override objects
 * that set a field to `undefined` when the legacy value is absent. This is
 * intentional: an "unset" override and an "absent" override are equivalent
 * for this domain.
 */
export interface LayerAnimationOverrides {
  readonly animationStyle: AnimationStyle | undefined
  readonly handStyle: HandStyle | undefined
  readonly zigzag: boolean | undefined
  readonly drawDirection: DrawDirection | undefined
  readonly textDrawStyle: TextDrawStyle | undefined
  readonly outlineDetect: number | undefined
  readonly detectionAlgorithm: DetectionAlgorithm | undefined
  readonly strokeStyle: StrokeStyle | undefined
  readonly coloringStyle: ColoringStyle | undefined
  readonly outlineColor: string | undefined
  readonly outlineThickness: number | undefined
  /** Reveal speed (legacy `speed`, default `40`). */
  readonly speed: number | undefined
  /** Hand speed (legacy `handSpeed`, default `6`). */
  readonly handSpeed: number | undefined
  /** Chunk count (legacy `chunks`, default `30`). */
  readonly chunks: number | undefined
  /** Specialized chunk count (legacy `specChunks`, default `35`). */
  readonly specChunks: number | undefined
}

/** Metadata describing the original source of an image layer. */
export interface ImageSourceMetadata {
  /** Natural pixel dimensions of the source image. */
  readonly naturalWidth: number
  readonly naturalHeight: number
  /**
   * Whether the source PNG has meaningful alpha transparency. Detected in
   * `addLayer` (`legacy/index.html:5805`) by probing a downscaled copy.
   */
  readonly hasPngAlpha: boolean
  /**
   * Non-destructive crop source retention. The legacy app stashes the
   * pre-crop image + geometry on `layer._origImg/_origX/_origY/_origW/_origH`
   * (`legacy/index.html:9509`) so re-cropping is lossless. The runtime image
   * is held in the asset registry; only the geometry is serializable.
   */
  readonly cropSource?: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
}

/** An image layer. */
export interface ImageLayer extends BaseLayer {
  readonly type: 'image'
  /** Reference to the runtime image asset. */
  readonly assetId: AssetId
  /**
   * Resize percentage relative to the original. Legacy default `100`,
   * clamped to `[10, 300]` by `setLayerResize` (`legacy/index.html:6416`).
   */
  readonly resizePct: number
  readonly sourceMetadata: ImageSourceMetadata
}

/** Text typography settings. */
export interface TextStyle {
  readonly text: string
  readonly fontFamily: string
  readonly fontSize: number
  readonly bold: boolean
  readonly italic: boolean
  readonly align: 'left' | 'center' | 'right'
  readonly color: string
  /** Line height multiplier. Legacy range `[0.8, 2.5]`, default `1.3`. */
  readonly lineHeight: number
  /** Letter spacing in px. Legacy range `[-5, 30]`, default `0`. */
  readonly letterSpacing: number
}

/** A text layer. */
export interface TextLayer extends BaseLayer {
  readonly type: 'text'
  /** Reference to the rasterized text image asset. */
  readonly assetId: AssetId
  readonly textStyle: TextStyle
}

/** Discriminated union of all layer kinds. */
export type Layer = ImageLayer | TextLayer

/** Type guard: narrows a `Layer` to `ImageLayer`. */
export function isImageLayer(layer: Layer): layer is ImageLayer {
  return layer.type === 'image'
}

/** Type guard: narrows a `Layer` to `TextLayer`. */
export function isTextLayer(layer: Layer): layer is TextLayer {
  return layer.type === 'text'
}
