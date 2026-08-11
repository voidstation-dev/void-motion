# Fixture 02 — Transparent PNG

## Scenario

A project with one PNG image layer that has an alpha channel (transparency).
Default animation applied.

## Why it exists

Locks the `hasPngAlpha` detection path. The legacy app detects PNG alpha and
the adapter surfaces it as `sourceMetadata.hasPngAlpha = true`. This flag
affects compositing and export behavior.

## State parity checks

- One layer, type `image`.
- `sourceMetadata.hasPngAlpha` = true.
- Transform and animation defaults same as fixture 01.

## Notes

- The transparency flag is a source-metadata property, not a transform; it
  does not change when the layer is resized.