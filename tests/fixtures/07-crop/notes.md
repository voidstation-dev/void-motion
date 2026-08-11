# Fixture 07 — Cropped Image

## Scenario

A project with one image layer that has been cropped via the crop tool. The
crop is non-destructive: the original source pixels are preserved, and the
crop rectangle is stored as metadata.

## Why it exists

Locks the crop projection. The legacy crop tool selects a sub-rectangle of an
image; the adapter records the crop source rectangle in `sourceMetadata` (or
a dedicated crop field) without discarding the original. This is a quirk:
crop is non-destructive (KQ-006).

## State parity checks

- One layer, type `image`.
- A crop rectangle is recorded (x, y, width, height in source pixels).
- `sourceMetadata.naturalWidth`/`naturalHeight` still reflect the *original*
  un-cropped image.

## Notes

- Crop does not mutate the underlying image data; it only changes what
  portion is displayed/rendered.
- Reset clears the crop rectangle and restores the full image.