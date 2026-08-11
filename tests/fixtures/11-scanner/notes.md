# Fixture 11 — Scanner

## Scenario

A project with one image layer animated with the `scanner` animation style.

## Why it exists

Locks the scanner animation style. The scanner style sweeps a line across the
image, revealing it progressively. This fixture captures the style's
parameters and the seeded-random behavior (if any) for reproducibility.

## State parity checks

- One layer, type `image`.
- `animation.animationStyle` = 'scanner'.
- Speed and other parameters at defaults.

## Notes

- If scanner uses `Math.random()` for jitter, this fixture's test wraps
  playback in `withSeededRandom('fixture-11', ...)` for reproducibility.
- Production randomness is unchanged; seeding is test-only.