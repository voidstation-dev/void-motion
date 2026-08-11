# Fixture 03 — Photo

## Scenario

A project with one large JPEG/TIFF photo layer that exceeds the canvas and
must be auto-scaled to fit.

## Why it exists

Locks the auto-scale behavior: when an image's natural dimensions exceed the
canvas, the legacy app scales it down to fit while preserving aspect ratio.
The adapter records the *natural* dimensions in `sourceMetadata` and the
*displayed* dimensions in `transform.width`/`transform.height`; `resizePct`
reflects the scale applied.

## State parity checks

- One layer, type `image`.
- `sourceMetadata.naturalWidth`/`naturalHeight` = original (large) values.
- `transform.width`/`height` ≤ canvas dimensions, aspect preserved.
- `resizePct` < 100 (auto-scaled down).

## Notes

- Auto-scale is a one-time event on upload; later manual resize is independent.
- The exact scale factor depends on the image's natural size vs canvas size.