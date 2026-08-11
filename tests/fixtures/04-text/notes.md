# Fixture 04 — Text Layer

## Scenario

A project with one text layer. Exercises the full text-style projection:
content, font family, font size, bold, alignment, color.

## Why it exists

Locks the text-layer projection. The legacy app stores text properties with
`_text`-prefixed keys (`_textContent`, `_textFont`, `_textSize`, `_textBold`,
`_textAlign`, `_textColor`); the adapter maps them to the clean `TextStyle`
shape. This fixture also covers the `text-draw` drawing mode (the legacy
`spec-text` animStyle value).

## State parity checks

- One layer, type `text`.
- `textStyle.text` = the content string.
- `textStyle.fontFamily` = a font from the legacy font list.
- `textStyle.fontSize` = a valid size.
- `textStyle.bold` = boolean.
- `textStyle.align` = 'left' | 'center' | 'right'.
- `textStyle.color` = a hex color.

## Notes

- The legacy `_textItalic` and line-height/letter-spacing fields are projected
  as part of `TextStyle` (see `src/types/layer.ts`).
- The `spec-text` animStyle is classified as a drawing mode, not an animation
  style (see `classifyLegacyAnimStyle`).