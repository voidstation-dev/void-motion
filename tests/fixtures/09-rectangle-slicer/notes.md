# Fixture 09 — Rectangle Slicer

## Scenario

A project where an image layer has been sliced into arbitrary rectangles. The
user draws rectangles over the image; each rectangle becomes a new layer.

## Why it exists

Locks the rectangle-slicer projection. Unlike the grid slicer, rectangle
slices are user-defined (not a regular grid). Each rectangle becomes a new
image layer; the original is removed.

## State parity checks

- N image layers, one per user-drawn rectangle.
- The original layer is gone.
- Each slice's transform reflects its rectangle position and size.
- Slices inherit the parent's animation settings.

## Notes

- Rectangle positions are user-drawn, so this fixture uses a fixed set of
  rectangles (no randomness) for reproducibility.