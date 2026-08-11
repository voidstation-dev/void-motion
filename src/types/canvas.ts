/**
 * Canvas domain types.
 *
 * Derived from the legacy implementation:
 * - `CANVAS_SIZES` table at `legacy/index.html:7882` defines exactly three
 *   aspect ratios (`16:9`, `9:16`, `1:1`) × three resolution presets
 *   (`720`, `1080`, `1440`). There is NO custom ratio and NO custom
 *   resolution in the legacy UI.
 * - `state.canvasW` / `state.canvasH` (`legacy/index.html:5574`) hold the
 *   actual internal bitmap size.
 * - `state.canvasBg` (`legacy/index.html:5572`) is
 *   `{ type:'solid'|'gradient'|'custom', val, key? }`.
 *
 * Per MIGRATION_00 §8, CSS display dimensions are NOT stored in project data;
 * only the logical canvas size is modeled here. The viewport/display size is
 * a runtime concern.
 */

/** Aspect ratio preset. Legacy supports exactly these three — no custom. */
export type AspectRatio = '16:9' | '9:16' | '1:1'

/**
 * Resolution preset (short-edge pixels).
 *
 * `custom` is reserved for the future but is NOT exposed by the legacy UI.
 * It is included here only so the discriminated union is forward-compatible;
 * M00 must not surface it as selectable behavior.
 */
export type ResolutionPreset = '720p' | '1080p' | '1440p' | 'custom'

/** Logical canvas dimensions in pixels. */
export interface CanvasSize {
  readonly width: number
  readonly height: number
}

/** Canvas configuration stored in a project. */
export interface CanvasSettings {
  readonly size: CanvasSize
  readonly aspectRatio: AspectRatio
  readonly resolutionPreset: ResolutionPreset
  readonly background: CanvasBackground
}

/**
 * Canvas background.
 *
 * Legacy shape (`legacy/index.html:5572`, applied by `fillBg` at `:5761`):
 * - `solid`    — `val` is a color string or the literal `'white'` /
 *   `'transparent'` (the "None" preset).
 * - `gradient` — `val` is unused; `key` names an entry in `BG_GRADIENTS`
 *   (`legacy/index.html:5706`): notebook, graph, cream, chalk, softgrad,
 *   warmwhite, blueprint, kraft, dark, linen.
 * - `custom`   — `val` is an arbitrary CSS color string set via the color
 *   input (`legacy/index.html:7851`).
 */
export type CanvasBackground =
  | { readonly type: 'solid'; readonly val: string }
  | { readonly type: 'gradient'; readonly key: GradientKey; readonly val?: string }
  | { readonly type: 'custom'; readonly val: string }

/**
 * Gradient preset keys recognized by the legacy `BG_GRADIENTS` table
 * (`legacy/index.html:5706`). These are the exact legacy string values.
 */
export type GradientKey =
  | 'notebook'
  | 'graph'
  | 'cream'
  | 'chalk'
  | 'softgrad'
  | 'warmwhite'
  | 'blueprint'
  | 'kraft'
  | 'dark'
  | 'linen'

/**
 * The legacy canvas-size lookup table, reproduced verbatim for reference and
 * for adapter use. Values are `[width, height]` in pixels.
 *
 * Source: `legacy/index.html:7882`.
 */
export const CANVAS_SIZE_TABLE: Readonly<
  Record<
    AspectRatio,
    Readonly<Record<Exclude<ResolutionPreset, 'custom'>, readonly [number, number]>>
  >
> = {
  '16:9': { '720p': [1280, 720], '1080p': [1920, 1080], '1440p': [2560, 1440] },
  '9:16': { '720p': [720, 1280], '1080p': [1080, 1920], '1440p': [1440, 2560] },
  '1:1': { '720p': [720, 720], '1080p': [1080, 1080], '1440p': [1440, 1440] },
}
