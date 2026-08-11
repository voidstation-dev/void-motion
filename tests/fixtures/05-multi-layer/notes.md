# Fixture 05 — Multi-layer Sequential

## Scenario

A project with three image layers, each with a distinct sequential animation
order (1, 2, 3). Default animation (chunk-jump) applies.

## Why it exists

Locks the numbered-animation-order behavior. Layers animate in the order
specified by their `animationOrder` field: 1 first, then 2, then 3. This is
the default sequential playback pattern.

## State parity checks

- Three layers, all type `image`.
- `animationOrder` = 1, 2, 3 respectively.
- Each layer inherits project animation defaults unless overridden.

## Notes

- A blank/null `animationOrder` means the layer animates in its stack order
  (see fixture 06 for the parallel case).
- Reordering layers in the panel does not change `animationOrder`; the two
  are independent.