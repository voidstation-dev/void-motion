# Fixture 01 — Single PNG

## Scenario

A project with one opaque PNG image layer on a solid white 1280×720 canvas.
Default animation (chunk-jump) is applied.

## Why it exists

Locks the baseline image-layer projection: transform defaults, `resizePct=100`,
source metadata (`naturalWidth`/`naturalHeight`, `hasPngAlpha=false`), and the
default animation envelope. Every other image fixture builds on this.

## State parity checks

- One layer, type `image`.
- Transform: `{ x: 0, y: 0, width: naturalWidth, height: naturalHeight, rotation: 0 }`.
- `resizePct` = 100.
- `sourceMetadata.hasPngAlpha` = false (opaque PNG).
- Animation defaults inherited from project (chunk-jump, hand-1, zigzag=true).
- Canvas 1280×720, solid white.

## Notes

- No asset blob is stored (placeholder fixture); `assetMap` is empty.
- Real-image visual parity is exercised in M01+ browser tests.