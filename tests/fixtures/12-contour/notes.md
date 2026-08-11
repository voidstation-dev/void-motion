# Fixture 12 — Contour

## Scenario

A project with one image layer animated with the `contour` animation style.

## Why it exists

Locks the contour animation style. Contour traces the detected edges of the
image. This fixture captures the style's parameters and the detection
algorithm selection.

## State parity checks

- One layer, type `image`.
- `animation.animationStyle` = 'contour'.
- `animation.detectionAlgorithm` at default (classic).

## Notes

- Contour depends on edge detection; the detection algorithm affects the
  traced path. Fixture uses the default algorithm.