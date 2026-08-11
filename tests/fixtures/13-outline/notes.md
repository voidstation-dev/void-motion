# Fixture 13 — Outline (chunks + fill + only)

## Scenario

A project exercising the outline-family: `outline-chunks` animation style and
the `outline-fill` / `outline-only` drawing modes.

## Why it exists

Locks the outline family. `outline-chunks` breaks the outline into chunks
that animate separately. `outline-fill` and `outline-only` are drawing modes
(classified via `classifyLegacyAnimStyle` as `kind: 'drawing'`, not animation).
This fixture confirms the classification routing.

## State parity checks

- Image layer with `animationStyle` = 'outline-chunks' (animation).
- A layer or project with `animStyle` = 'outlinefill' classifies as drawing
  mode 'outline-fill'.
- A layer or project with `animStyle` = 'outlineonly' classifies as drawing
  mode 'outline-only'.

## Notes

- The legacy `state.animStyle` field conflates animation styles and drawing
  modes; the adapter splits them. This fixture is the parity check for that
  split (see `classifyLegacyAnimStyle` tests).