# Fixture 10 — Freehand Slicer

## Scenario

A project where an image layer has been sliced along a freehand path. The
user draws a freehand stroke; the slicer cuts along the path.

## Why it exists

Locks the freehand-slicer projection. The freehand slicer is the most complex
slice mode: the cut path is user-drawn and may be non-rectangular. The adapter
records the resulting slices as new image layers; the original is removed.

## State parity checks

- N image layers resulting from the freehand cut.
- The original layer is gone.
- Slices inherit the parent's animation settings.

## Notes

- Freehand paths can involve many points; the fixture uses a fixed path for
  reproducibility.
- This fixture may use `withSeededRandom` if the slicer path sampling uses
  `Math.random()`.