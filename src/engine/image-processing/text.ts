/**
 * Text layer primitives (M13).
 *
 * Pure, framework-agnostic text-tool geometry + constants ported from the
 * legacy text editor (`legacy/index.html:8035-8370`). The typed text service
 * (`src/app/services/text-service.ts`) composes these; the legacy runtime
 * remains the rasterization authority (the offscreen-canvas render +
 * `Image.onload` in `_commitTextLayer`, `legacy/index.html:8261-8370`) until
 * the renderer is migrated (M19).
 *
 * Legacy behavior parity:
 *   - `TEXT_FONTS` array (8035-8044): 8 fonts with family/label/desc/preview.
 *   - `_ts` defaults (8047-8062): font 'Caveat', size 72, bold false, italic
 *     false, align 'left', color '#1a1a1a', lineHeight 1.3, spacing 0.
 *   - `updateTextState` (8108-8113): `size = Math.max(10, parseInt(...) || 72)`
 *     (min 10, default 72; the max 400 is enforced by the input element, not
 *     the clamp).
 *   - `_commitTextLayer` measurement (8272-8281): `maxW = min(canvasW, max
 *     line-width + size*0.4)`, `lineH = size*lh`, `totalH = lines*lineH +
 *     size*0.3`; the layer name is `text.split('\n')[0].slice(0, 24) || 'Text'`
 *     (8327).
 *   - Color swatches (8068-8075): 8 hex colors.
 */

/** A font entry in the legacy `TEXT_FONTS` array. */
export interface TextFont {
  readonly family: string
  readonly label: string
  readonly desc: string
  readonly preview: string
}

/**
 * The legacy font list (`legacy/index.html:8035-8044`). Exact order + labels.
 * The typed text panel renders these as font cards; the family string is what
 * gets stored on the text layer's `textStyle.fontFamily`.
 */
export const TEXT_FONTS: readonly TextFont[] = [
  { family: 'Caveat', label: 'Caveat', desc: 'Handwritten', preview: 'Aa' },
  { family: 'Patrick Hand', label: 'Patrick Hand', desc: 'Natural hand', preview: 'Aa' },
  { family: 'Permanent Marker', label: 'Permanent Marker', desc: 'Bold marker', preview: 'Aa' },
  { family: 'Nunito', label: 'Nunito', desc: 'Friendly sans', preview: 'Aa' },
  { family: 'DM Sans', label: 'DM Sans', desc: 'Clean sans', preview: 'Aa' },
  { family: 'Roboto', label: 'Roboto', desc: 'Modern sans', preview: 'Aa' },
  { family: 'Merriweather', label: 'Merriweather', desc: 'Serif heading', preview: 'Aa' },
  { family: 'Space Mono', label: 'Space Mono', desc: 'Monospace', preview: 'Aa' },
] as const

/**
 * The legacy color swatches (`legacy/index.html:8068-8075`). Exact order. The
 * first swatch (`#1a1a1a`) is the default selected color.
 */
export const TEXT_COLOR_SWATCHES: readonly string[] = [
  '#1a1a1a',
  '#ffffff',
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#d97706',
  '#7c3aed',
  '#0891b2',
] as const

/** The default text color (the first swatch). Legacy `_ts.color` (8053). */
export const DEFAULT_TEXT_COLOR = '#1a1a1a'

/** The default font family (the first `TEXT_FONTS` entry). Legacy `_ts.font` (8048). */
export const DEFAULT_TEXT_FONT = 'Caveat'

/** Min font size. Legacy `updateTextState` `Math.max(10, …)` (8109). */
export const TEXT_SIZE_MIN = 10

/** Max font size. Legacy input `max="400"` (4024). Enforced by the UI, not the clamp. */
export const TEXT_SIZE_MAX = 400

/** Default font size. Legacy `_ts.size` (8049) + input `value="48"` (4024). */
export const TEXT_SIZE_DEFAULT = 48

/** Line-height slider bounds. Legacy `min="0.8" max="2.5" step="0.05" value="1.3"` (4049). */
export const TEXT_LINEHEIGHT_MIN = 0.8
export const TEXT_LINEHEIGHT_MAX = 2.5
export const TEXT_LINEHEIGHT_STEP = 0.05
export const TEXT_LINEHEIGHT_DEFAULT = 1.3

/** Letter-spacing slider bounds. Legacy `min="-5" max="30" step="0.5" value="0"` (4057). */
export const TEXT_SPACING_MIN = -5
export const TEXT_SPACING_MAX = 30
export const TEXT_SPACING_STEP = 0.5
export const TEXT_SPACING_DEFAULT = 0

/**
 * The default `TextStyle` (mirrors the legacy `_ts` defaults, 8047-8062).
 * Used when opening the editor for a new layer (no existing settings to
 * restore).
 */
export const DEFAULT_TEXT_STYLE = {
  text: '',
  fontFamily: DEFAULT_TEXT_FONT,
  fontSize: TEXT_SIZE_DEFAULT,
  bold: false,
  italic: false,
  align: 'left' as const,
  color: DEFAULT_TEXT_COLOR,
  lineHeight: TEXT_LINEHEIGHT_DEFAULT,
  letterSpacing: TEXT_SPACING_DEFAULT,
}

/**
 * Clamp a raw font-size input to the legacy min + default. Mirrors
 * `updateTextState` (`legacy/index.html:8109`):
 * `_ts.size = Math.max(10, parseInt(...) || 72)`. The max (400) is enforced by
 * the input element, not this clamp — preserving the legacy behavior where a
 * pasted/out-of-range value is only clamped downward to 10.
 */
export function clampFontSize(raw: number | string | undefined): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10)
  return Math.max(TEXT_SIZE_MIN, Number.isFinite(n) ? n : TEXT_SIZE_DEFAULT)
}

/**
 * Build the canvas-2d font string for a `TextStyle`. Mirrors the legacy
 * `_commitTextLayer` font string (`legacy/index.html:8276`):
 * `${italic?'italic ':''} ${bold?'bold ':''} ${size}px '${font}'`.
 */
export function buildFontString(style: {
  readonly italic: boolean
  readonly bold: boolean
  readonly fontSize: number
  readonly fontFamily: string
}): string {
  const italic = style.italic ? 'italic ' : ''
  const bold = style.bold ? 'bold ' : ''
  return `${italic}${bold}${style.fontSize}px '${style.fontFamily}'`
}

/**
 * Measure the tight bounding box for a text block. Mirrors the legacy
 * `_commitTextLayer` measurement (`legacy/index.html:8272-8281`):
 *   - `maxW = min(canvasW, max(lineWidths) + size*0.4)`
 *   - `lineH = size * lineHeight`
 *   - `totalH = lines.length * lineH + size * 0.3`
 *
 * `lineWidths` is the measured pixel width of each line (the caller measures
 * via a canvas-2d `measureText` — kept out of the pure primitive so it is
 * testable in jsdom). When `lineWidths` is empty (no measurement available),
 * the width falls back to `size * 0.4` (the legacy padding term) so the layer
 * is never zero-sized.
 */
export function measureText(
  text: string,
  style: { readonly fontSize: number; readonly lineHeight: number },
  canvasWidth: number,
  lineWidths: readonly number[],
): { readonly width: number; readonly height: number } {
  const lines = text.split('\n')
  const maxLineW = lineWidths.length > 0 ? Math.max(...lineWidths) : 0
  const maxW = Math.min(canvasWidth, maxLineW + style.fontSize * 0.4)
  const lineH = style.fontSize * style.lineHeight
  const totalH = lines.length * lineH + style.fontSize * 0.3
  return { width: Math.ceil(maxW), height: Math.ceil(totalH) }
}

/**
 * Build the layer name for a text block. Mirrors the legacy
 * `_commitTextLayer` name (`legacy/index.html:8327`):
 * `text.split('\n')[0].slice(0, 24) || 'Text'`.
 */
export function textLayerName(text: string): string {
  return text.split('\n')[0]?.slice(0, 24) || 'Text'
}
