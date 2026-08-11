/**
 * Legacy ↔ domain enum mapping.
 *
 * This is the ONLY place where legacy raw string values are translated to and
 * from the clean domain enum values. Feature/UI code consumes the domain
 * enums exclusively; the adapter calls these functions when reading from or
 * writing to the legacy `state` object.
 *
 * Per MIGRATION_00 §10, the mapping preserves the legacy value SET exactly;
 * only the spellings are normalized for the new domain model.
 *
 * Legacy value sources are cited per mapping.
 */

import type {
  AnimationStyle,
  ColoringStyle,
  DetectionAlgorithm,
  DrawDirection,
  HandStyle,
  RevealStyle,
  StrokeStyle,
  TextDrawStyle,
} from '../../types/animation'
import type {
  LegacyAnimationStyle,
  LegacyColoringStyle,
  LegacyDetectionAlgorithm,
  LegacyDrawDirection,
  LegacyHandStyle,
  LegacyRevealStyle,
  LegacyStrokeStyle,
  LegacyTextDrawStyle,
} from './legacy-state.types'

// ─── Animation style ─────────────────────────────────────────────────────────

const ANIMATION_STYLE_TO_DOMAIN: Readonly<Partial<Record<LegacyAnimationStyle, AnimationStyle>>> = {
  scanner: 'scanner',
  contour: 'contour',
  outlinechunks: 'outline-chunks',
  chunkjump: 'chunk-jump',
  'spec-human': 'specialized-human',
  'spec-animal': 'specialized-animal',
  'spec-portrait': 'specialized-portrait',
  'spec-vehicle': 'specialized-vehicle',
  'spec-building': 'specialized-building',
  'spec-landscape': 'specialized-landscape',
  'spec-spiral': 'specialized-spiral',
  // Drawing-tab modes and dead branches are intentionally NOT mapped here.
  // `classifyLegacyAnimStyle` routes drawing modes to the drawing-mode map
  // and returns null for dead branches (scribble, nervous, top-anchor,
  // gesture, spec-nature, outlinefill, illustfill, outlineonly, spec-text).
}

const ANIMATION_STYLE_TO_LEGACY: Readonly<Record<AnimationStyle, LegacyAnimationStyle>> = {
  scanner: 'scanner',
  contour: 'contour',
  'outline-chunks': 'outlinechunks',
  'chunk-jump': 'chunkjump',
  'specialized-human': 'spec-human',
  'specialized-animal': 'spec-animal',
  'specialized-portrait': 'spec-portrait',
  'specialized-vehicle': 'spec-vehicle',
  'specialized-building': 'spec-building',
  'specialized-landscape': 'spec-landscape',
  'specialized-spiral': 'spec-spiral',
}

/**
 * Map a legacy animation-style raw value to the domain enum. Throws for
 * drawing-mode values and dead branches — callers should route those through
 * `classifyLegacyAnimStyle` first. Only the 11 live animation styles are
 * mapped here.
 */
export function legacyAnimationStyleToDomain(legacy: LegacyAnimationStyle): AnimationStyle {
  const domain = ANIMATION_STYLE_TO_DOMAIN[legacy]
  if (domain === undefined) {
    throw new Error(
      `legacyAnimationStyleToDomain: '${legacy}' is not a live animation style (it is a drawing mode or dead branch). Use classifyLegacyAnimStyle() to route it.`,
    )
  }
  return domain
}

/** Map a domain animation-style enum to the legacy raw value. */
export function domainAnimationStyleToLegacy(domain: AnimationStyle): LegacyAnimationStyle {
  return ANIMATION_STYLE_TO_LEGACY[domain]
}

// ─── Drawing mode ────────────────────────────────────────────────────────────

import type { DrawingMode } from '../../types/animation'

const DRAWING_MODE_TO_DOMAIN: Readonly<Record<string, DrawingMode>> = {
  outlinefill: 'outline-fill',
  illustfill: 'illust-fill',
  outlineonly: 'outline-only',
  'spec-text': 'text-draw',
}

const DRAWING_MODE_TO_LEGACY: Readonly<Record<DrawingMode, string>> = {
  'outline-fill': 'outlinefill',
  'illust-fill': 'illustfill',
  'outline-only': 'outlineonly',
  'text-draw': 'spec-text',
}

/**
 * Classify a legacy `state.animStyle` raw value as either an animation style
 * or a drawing mode. The legacy field conflates both into one string; the
 * new model keeps them separate. Returns `null` if the value is neither
 * (dead branches).
 */
export function classifyLegacyAnimStyle(
  legacy: LegacyAnimationStyle,
): { kind: 'animation'; value: AnimationStyle } | { kind: 'drawing'; value: DrawingMode } | null {
  if (legacy in DRAWING_MODE_TO_DOMAIN) {
    return { kind: 'drawing', value: DRAWING_MODE_TO_DOMAIN[legacy] as DrawingMode }
  }
  const animStyle = ANIMATION_STYLE_TO_DOMAIN[legacy]
  if (animStyle !== undefined) {
    return { kind: 'animation', value: animStyle }
  }
  return null
}

/** Map a domain drawing mode to the legacy raw value. */
export function domainDrawingModeToLegacy(domain: DrawingMode): string {
  return DRAWING_MODE_TO_LEGACY[domain]
}

// ─── Hand style ──────────────────────────────────────────────────────────────

const HAND_STYLE_TO_DOMAIN: Readonly<Record<LegacyHandStyle, HandStyle>> = {
  ghost: 'ghost',
  custom1: 'hand-1',
  custom2: 'hand-2',
  custom3: 'hand-3',
  custom4: 'pen',
}

const HAND_STYLE_TO_LEGACY: Readonly<Record<HandStyle, LegacyHandStyle>> = {
  ghost: 'ghost',
  'hand-1': 'custom1',
  'hand-2': 'custom2',
  'hand-3': 'custom3',
  pen: 'custom4',
}

/** Map a legacy hand-style raw value to the domain enum. */
export function legacyHandStyleToDomain(legacy: LegacyHandStyle): HandStyle {
  return HAND_STYLE_TO_DOMAIN[legacy]
}

/** Map a domain hand-style enum to the legacy raw value. */
export function domainHandStyleToLegacy(domain: HandStyle): LegacyHandStyle {
  return HAND_STYLE_TO_LEGACY[domain]
}

// ─── Draw direction ───────────────────────────────────────────────────────────

const DRAW_DIRECTION_TO_DOMAIN: Readonly<Record<LegacyDrawDirection, DrawDirection>> = {
  ltr: 'left-to-right',
  rtl: 'right-to-left',
  ttb: 'top-to-bottom',
  btt: 'bottom-to-top',
}

const DRAW_DIRECTION_TO_LEGACY: Readonly<Record<DrawDirection, LegacyDrawDirection>> = {
  'left-to-right': 'ltr',
  'right-to-left': 'rtl',
  'top-to-bottom': 'ttb',
  'bottom-to-top': 'btt',
}

/** Map a legacy draw-direction raw value to the domain enum. */
export function legacyDrawDirectionToDomain(legacy: LegacyDrawDirection): DrawDirection {
  return DRAW_DIRECTION_TO_DOMAIN[legacy]
}

/** Map a domain draw-direction enum to the legacy raw value. */
export function domainDrawDirectionToLegacy(domain: DrawDirection): LegacyDrawDirection {
  return DRAW_DIRECTION_TO_LEGACY[domain]
}

// ─── Text draw style ──────────────────────────────────────────────────────────

const TEXT_DRAW_STYLE_TO_DOMAIN: Readonly<Record<LegacyTextDrawStyle, TextDrawStyle>> = {
  reveal: 'reveal',
  outline: 'outline',
  'outline-fill': 'outline-fill',
}

const TEXT_DRAW_STYLE_TO_LEGACY: Readonly<Record<TextDrawStyle, LegacyTextDrawStyle>> = {
  reveal: 'reveal',
  outline: 'outline',
  'outline-fill': 'outline-fill',
}

/** Map a legacy text-draw-style raw value to the domain enum. */
export function legacyTextDrawStyleToDomain(legacy: LegacyTextDrawStyle): TextDrawStyle {
  return TEXT_DRAW_STYLE_TO_DOMAIN[legacy]
}

/** Map a domain text-draw-style enum to the legacy raw value. */
export function domainTextDrawStyleToLegacy(domain: TextDrawStyle): LegacyTextDrawStyle {
  return TEXT_DRAW_STYLE_TO_LEGACY[domain]
}

// ─── Stroke style ──────────────────────────────────────────────────────────────

const STROKE_STYLE_TO_DOMAIN: Readonly<Record<LegacyStrokeStyle, StrokeStyle>> = {
  default: 'default',
  charcoal: 'charcoal',
  multipass: 'sketch',
  fountain: 'fountain',
  blueprint: 'blueprint',
}

const STROKE_STYLE_TO_LEGACY: Readonly<Record<StrokeStyle, LegacyStrokeStyle>> = {
  default: 'default',
  charcoal: 'charcoal',
  sketch: 'multipass',
  fountain: 'fountain',
  blueprint: 'blueprint',
}

/** Map a legacy stroke-style raw value to the domain enum. */
export function legacyStrokeStyleToDomain(legacy: LegacyStrokeStyle): StrokeStyle {
  return STROKE_STYLE_TO_DOMAIN[legacy]
}

/** Map a domain stroke-style enum to the legacy raw value. */
export function domainStrokeStyleToLegacy(domain: StrokeStyle): LegacyStrokeStyle {
  return STROKE_STYLE_TO_LEGACY[domain]
}

// ─── Detection algorithm ───────────────────────────────────────────────────────

const DETECTION_ALGORITHM_TO_DOMAIN: Readonly<
  Record<LegacyDetectionAlgorithm, DetectionAlgorithm>
> = {
  classic: 'classic',
  adaptive: 'adaptive',
  'morph-shell': 'morph-shell',
  canny2: 'canny-plus',
}

const DETECTION_ALGORITHM_TO_LEGACY: Readonly<
  Record<DetectionAlgorithm, LegacyDetectionAlgorithm>
> = {
  classic: 'classic',
  adaptive: 'adaptive',
  'morph-shell': 'morph-shell',
  'canny-plus': 'canny2',
}

/** Map a legacy detection-algorithm raw value to the domain enum. */
export function legacyDetectionAlgorithmToDomain(
  legacy: LegacyDetectionAlgorithm,
): DetectionAlgorithm {
  return DETECTION_ALGORITHM_TO_DOMAIN[legacy]
}

/** Map a domain detection-algorithm enum to the legacy raw value. */
export function domainDetectionAlgorithmToLegacy(
  domain: DetectionAlgorithm,
): LegacyDetectionAlgorithm {
  return DETECTION_ALGORITHM_TO_LEGACY[domain]
}

// ─── Coloring style ───────────────────────────────────────────────────────────

const COLORING_STYLE_TO_DOMAIN: Readonly<Record<LegacyColoringStyle, ColoringStyle>> = {
  sparse: 'sparse',
  filled: 'filled',
  watercolor: 'watercolor',
}

const COLORING_STYLE_TO_LEGACY: Readonly<Record<ColoringStyle, LegacyColoringStyle>> = {
  sparse: 'sparse',
  filled: 'filled',
  watercolor: 'watercolor',
}

/** Map a legacy coloring-style raw value to the domain enum. */
export function legacyColoringStyleToDomain(legacy: LegacyColoringStyle): ColoringStyle {
  return COLORING_STYLE_TO_DOMAIN[legacy]
}

/** Map a domain coloring-style enum to the legacy raw value. */
export function domainColoringStyleToLegacy(domain: ColoringStyle): LegacyColoringStyle {
  return COLORING_STYLE_TO_LEGACY[domain]
}

// ─── Reveal style ───────────────────────────────────────────────────────────────

const REVEAL_STYLE_TO_DOMAIN: Readonly<Record<LegacyRevealStyle, RevealStyle>> = {
  instant: 'instant',
  fade: 'fade',
  dissolve: 'dissolve',
  'wipe-right': 'wipe-right',
  iris: 'iris',
  'scan-lines': 'scan-lines',
}

const REVEAL_STYLE_TO_LEGACY: Readonly<Record<RevealStyle, LegacyRevealStyle>> = {
  instant: 'instant',
  fade: 'fade',
  dissolve: 'dissolve',
  'wipe-right': 'wipe-right',
  iris: 'iris',
  'scan-lines': 'scan-lines',
}

/** Map a legacy reveal-style raw value to the domain enum. */
export function legacyRevealStyleToDomain(legacy: LegacyRevealStyle): RevealStyle {
  return REVEAL_STYLE_TO_DOMAIN[legacy]
}

/** Map a domain reveal-style enum to the legacy raw value. */
export function domainRevealStyleToLegacy(domain: RevealStyle): LegacyRevealStyle {
  return REVEAL_STYLE_TO_LEGACY[domain]
}
