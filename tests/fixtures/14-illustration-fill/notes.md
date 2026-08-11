# Fixture 14 — Illustration Fill

## Scenario

A project with one image layer using the `illust-fill` drawing mode (legacy
`animStyle` = 'illustfill').

## Why it exists

Locks the illustration-fill drawing mode. Illustration fill colors the
detected regions of the image. It is a drawing mode, not an animation style,
so `classifyLegacyAnimStyle('illustfill')` returns
`{ kind: 'drawing', value: 'illust-fill' }`.

## State parity checks

- Image layer with `animStyle` = 'illustfill' classifies as drawing mode
  'illust-fill'.
- The drawing mode is separate from the animation style in the domain model.

## Notes

- This fixture confirms the drawing-mode classification path is distinct from
  the animation-style path.