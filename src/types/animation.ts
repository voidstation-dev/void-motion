/**
 * Animation, drawing, hand, and playback domain types.
 *
 * The domain enum values here are the CLEAN names called for by the migration
 * plan (e.g. `'hand-1'`, `'left-to-right'`, `'chunk-jump'`). The legacy app
 * uses different raw string values (e.g. `'custom1'`, `'ltr'`, `'chunkjump'`).
 * The mapping between the two lives EXCLUSIVELY in the legacy adapter
 * (`src/engine/legacy/legacy-enum-mapping.ts`), never in feature/UI code.
 *
 * Per MIGRATION_00 §10/§11, values are "derived from current behavior, not
 * redesigned naming in the UI" — meaning the SET of supported values matches
 * the legacy set exactly; only the spellings are normalized for the new
 * domain model.
 */

// ─── Animation styles ───────────────────────────────────────────────────────

/**
 * Animation style (the "Animation" tab in the legacy sidebar).
 *
 * Legacy raw values (`legacy/index.html:3348, 3371`):
 * - Basic: `scanner`, `contour`, `outlinechunks`, `chunkjump` (default).
 * - Specialized: `spec-human`, `spec-animal`, `spec-portrait`,
 *   `spec-vehicle`, `spec-building`, `spec-landscape`, `spec-spiral`.
 *
 * The drawing-tab modes (`outlinefill`, `illustfill`, `outlineonly`,
 * `spec-text`) are modeled as {@link DrawingMode}, not here, because the
 * legacy UI groups them under a separate tab (`_OUTLINE_ANIM_MODES`,
 * `legacy/index.html:7765`).
 *
 * Dead branches preserved as a documented-but-unreachable set: the legacy
 * engine has tick functions for `scribble`, `nervous`, `top-anchor`,
 * `gesture`, and `spec-nature` that have NO UI option and cannot be
 * selected. They are intentionally NOT included in this union — the new
 * domain models only what a user can actually choose. See
 * `KNOWN_QUIRKS.md` for the dead-branch inventory.
 */
export type AnimationStyle =
  | 'scanner'
  | 'contour'
  | 'outline-chunks'
  | 'chunk-jump'
  | 'specialized-human'
  | 'specialized-animal'
  | 'specialized-portrait'
  | 'specialized-vehicle'
  | 'specialized-building'
  | 'specialized-landscape'
  | 'specialized-spiral'

/** Default animation style. Legacy default is `chunkjump` (`legacy/index.html:5573`). */
export const DEFAULT_ANIMATION_STYLE: AnimationStyle = 'chunk-jump'

// ─── Drawing modes ──────────────────────────────────────────────────────────

/**
 * Drawing mode (the "Drawing" tab in the legacy sidebar).
 *
 * Legacy raw values (`legacy/index.html:3410`): `outlinefill`, `illustfill`,
 * `outlineonly`, `spec-text`. These four constitute `_OUTLINE_ANIM_MODES`
 * (`legacy/index.html:7765`).
 */
export type DrawingMode = 'outline-fill' | 'illust-fill' | 'outline-only' | 'text-draw'

// ─── The combined "active style" ────────────────────────────────────────────

/**
 * The active animation mode, which is EITHER an {@link AnimationStyle} OR a
 * {@link DrawingMode}. The legacy `state.animStyle` field is a single string
 * that holds values from both sets (e.g. `'chunkjump'` or `'outlinefill'`);
 * the new model keeps the union explicit.
 */
export type ActiveAnimationMode = AnimationStyle | DrawingMode

// ─── Draw direction (text) ───────────────────────────────────────────────────

/**
 * Draw direction for text animation.
 *
 * Legacy raw values (`legacy/index.html:3634`): `ltr` (default), `rtl`,
 * `ttb`, `btt`. Stored on `state.textAnimDir` and per-layer
 * `layer.textAnimDir`.
 */
export type DrawDirection = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top'

/** Default draw direction. Legacy default is `ltr`. */
export const DEFAULT_DRAW_DIRECTION: DrawDirection = 'left-to-right'

// ─── Text draw style ─────────────────────────────────────────────────────────

/**
 * Text draw style (how text is revealed).
 *
 * Legacy raw values (`legacy/index.html:5573`, `animations.js:3209+`):
 * `reveal` (default), `outline`, `outline-fill`. Stored on
 * `state.textDrawStyle` and per-layer `layer.textDrawStyle`.
 */
export type TextDrawStyle = 'reveal' | 'outline' | 'outline-fill'

/** Default text draw style. Legacy default is `reveal`. */
export const DEFAULT_TEXT_DRAW_STYLE: TextDrawStyle = 'reveal'

// ─── Hand style ──────────────────────────────────────────────────────────────

/**
 * Hand style (the pen/hand drawn over the animation).
 *
 * Legacy raw values (`legacy/index.html:3859, 3688`): `ghost`, `custom1`
 * (default, labeled "Hand 1"), `custom2` ("Hand 2"), `custom3` ("Hand 3"),
 * `custom4` (labeled "Pen"). Stored on `state.hand` and per-layer
 * `layer.hand`.
 *
 * Note: `ghost` draws NO hand (`drawHand` returns early,
 * `legacy/index.html:8815`).
 */
export type HandStyle = 'ghost' | 'hand-1' | 'hand-2' | 'hand-3' | 'pen'

/** Default hand style. Legacy default is `custom1` → `hand-1`. */
export const DEFAULT_HAND_STYLE: HandStyle = 'hand-1'

// ─── Stroke style ────────────────────────────────────────────────────────────

/**
 * Outline stroke style.
 *
 * Legacy raw values (`legacy/index.html:3422`): `default` (default),
 * `charcoal`, `multipass` (labeled "Sketch"), `fountain`, `blueprint`.
 * Stored on `state.outlineStrokeStyle` and per-layer
 * `layer.outlineStrokeStyle`.
 *
 * Note the value/label mismatch: the UI says "Sketch" but the data value is
 * `multipass`. The domain uses `sketch`.
 */
export type StrokeStyle = 'default' | 'charcoal' | 'sketch' | 'fountain' | 'blueprint'

/** Default stroke style. Legacy default is `default`. */
export const DEFAULT_STROKE_STYLE: StrokeStyle = 'default'

// ─── Detection algorithm ─────────────────────────────────────────────────────

/**
 * Edge-detection algorithm for outline animations.
 *
 * Legacy raw values (`legacy/index.html:3468`): `classic` (default),
 * `adaptive`, `morph-shell`, `canny2` (labeled "Canny+"). Stored on
 * `state.outlineAlgorithm` and per-layer `layer.outlineAlgorithm`.
 *
 * The legacy `_DETECT_ALG_HINTS` map also contains dead `chroma` and `log`
 * entries with no UI button; they are excluded.
 */
export type DetectionAlgorithm = 'classic' | 'adaptive' | 'morph-shell' | 'canny-plus'

/** Default detection algorithm. Legacy default is `classic`. */
export const DEFAULT_DETECTION_ALGORITHM: DetectionAlgorithm = 'classic'

// ─── Coloring style ──────────────────────────────────────────────────────────

/**
 * Coloring style for outline-fill animations.
 *
 * Legacy raw values (`legacy/index.html:3444`): `sparse`, `filled`
 * (default), `watercolor`. Stored on `state.colorStyle` and per-layer
 * `layer.colorStyle`.
 *
 * Quirk: `colorStyle` is NOT in `_SLOT_KEYS` (`legacy/animations.js:1781`),
 * so in parallel-slot mode it is read from global `state.colorStyle`, not
 * per-slot. Documented in `KNOWN_QUIRKS.md`.
 */
export type ColoringStyle = 'sparse' | 'filled' | 'watercolor'

/** Default coloring style. Legacy default is `filled`. */
export const DEFAULT_COLORING_STYLE: ColoringStyle = 'filled'

// ─── Outline detection threshold ────────────────────────────────────────────

/**
 * Outline detection sensitivity. Legacy range `[0, 100]`, default `50`
 * (`legacy/index.html:5573`). Stored on `state.outlineDetect` and per-layer
 * `layer.outlineDetect`.
 */
export type OutlineDetect = number

/** Default outline detection threshold. */
export const DEFAULT_OUTLINE_DETECT: OutlineDetect = 50

// ─── Playback ───────────────────────────────────────────────────────────────

/**
 * Playback status.
 *
 * Legacy tracks `state.playing` and `state.done` as two booleans
 * (`legacy/index.html:5575`). The new model collapses them into a single
 * status enum; the adapter derives the two booleans from it when needed.
 */
export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'completed'

/** Playback state — serializable projection of the runtime playback loop. */
export interface PlaybackState {
  readonly status: PlaybackStatus
  /** Animation progress in `[0, 1]`. Legacy `state._animProgress`. */
  readonly progress: number
  /**
   * Index of the currently-animating parallel group. Legacy
   * `state._groupPos`.
   */
  readonly currentGroupIndex: number
}

/**
 * Future-compatible explicit timeline timing. These are OPTIONAL and MUST
 * NOT be consumed by any UI or behavior during M00 (per MIGRATION_00 §12).
 * They reserve the shape for M43/M44.
 */
export interface TimelineTiming {
  readonly drawingDurationMs?: number
  readonly finalHoldMs?: number
}

// ─── Reveal style (image reveal after draw) ──────────────────────────────────

/**
 * Final image reveal transition style.
 *
 * Legacy raw values (`legacy/index.html:3504`): `instant`, `fade` (default),
 * `dissolve`, `wipe-right`, `iris`, `scan-lines`. Stored on the top-level
 * `_revealStyle` global (`legacy/index.html:7319`), NOT on `state`.
 */
export type RevealStyle = 'instant' | 'fade' | 'dissolve' | 'wipe-right' | 'iris' | 'scan-lines'

/** Default reveal style. Legacy default is `fade`. */
export const DEFAULT_REVEAL_STYLE: RevealStyle = 'fade'
