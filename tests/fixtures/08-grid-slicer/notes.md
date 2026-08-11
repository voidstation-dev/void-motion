# Fixture 08 — Grid Slicer

## Scenario

A project where a single image layer has been sliced into a grid (rows ×
columns). The slicer produces N new layers, one per grid cell, and removes
the original layer.

## Why it exists

Locks the grid-slicer projection. The legacy grid slicer divides an image
into a regular grid; each cell becomes a new image layer. The original layer
is removed after slicing. Slices inherit the parent's animation settings.

## State parity checks

- N image layers (rows × cols), each a slice of the original.
- The original layer is gone (not present in `project.layers`).
- Each slice's transform reflects its grid position and cell size.
- Slices inherit the parent's `animationOrder` and animation overrides.

## Notes

- "Original removal" is a slicer quirk: the parent layer is deleted, not
  hidden. This is preserved (documented in BEHAVIOR_LOCK).
- Grid slicing is deterministic given rows/cols; no randomness involved.