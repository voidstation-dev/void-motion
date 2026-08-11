/**
 * Deterministic seeded random source.
 *
 * The legacy animation/drawing/hand code uses bare `Math.random()` in many
 * places (per-point geometric jitter, tile-ordering tiebreakers, random
 * starting tiles, per-pixel dissolve maps — see `KNOWN_QUIRKS.md` and the
 * randomness inventory in `docs/migration/`).
 *
 * Per MIGRATION_00 §21, production behavior is NOT changed during M00. This
 * module provides a deterministic PRNG so later visual parity tests can
 * substitute a seeded source and get reproducible output. It is used only by
 * tests in M00; production code continues to call `Math.random()`.
 *
 * The algorithm is xfnv1a + sfc32 (small, fast, well-mixed, deterministic
 * across JS engines). It does not need cryptographic strength — only
 * reproducibility.
 */

/** A source of deterministic pseudo-random numbers in `[0, 1)`. */
export interface RandomSource {
  /** Next float in `[0, 1)`. */
  next(): number
  /** Next integer in `[0, n)`. */
  nextInt(n: number): number
  /** Reset to the initial seed (for repeated runs over the same fixture). */
  reset(): void
  /** The seed this source was created with. */
  readonly seed: number
}

/**
 * Hash a 32-bit integer (xfnv1a). Used to mix the seed before sfc32.
 */
function xfnv1a(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  }
  return h >>> 0
}

/**
 * Create a seeded random source.
 *
 * @param seed - numeric or string seed. The same seed always yields the
 *   same sequence.
 */
export function createSeededRandom(seed: number | string): RandomSource {
  const numericSeed = typeof seed === 'string' ? xfnv1a(seed) : seed >>> 0
  let a = numericSeed
  let b = 0
  let c = 0
  let d = 0

  // sfc32 state init.
  a >>>= 0
  b = (b ^ 0x9e3779b9) >>> 0
  c = (c ^ 0x85ebca6b) >>> 0
  d = (d ^ 0xc2b2ae35) >>> 0

  function sfc32(): number {
    a |= 0
    b |= 0
    c |= 0
    d |= 0
    const t = (((a + b) | 0) + d) | 0
    d = (d + 1) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    c = (c + t) | 0
    return (t >>> 0) / 4294967296
  }

  const initial = { a, b, c, d }

  return {
    seed: numericSeed,
    next: sfc32,
    nextInt(n: number): number {
      return Math.floor(sfc32() * n)
    },
    reset(): void {
      a = initial.a
      b = initial.b
      c = initial.c
      d = initial.d
    },
  }
}

/**
 * Patch `Math.random` with a seeded source for the duration of `fn`, then
 * restore it. Used by behavior/visual tests that drive the legacy animation
 * engine and need reproducible jitter.
 *
 * NOTE: This MUST only be used in tests. Production code never patches
 * `Math.random`.
 */
export function withSeededRandom<T>(seed: number | string, fn: () => T): T {
  const rng = createSeededRandom(seed)
  const original = Math.random
  Math.random = rng.next
  try {
    return fn()
  } finally {
    Math.random = original
  }
}
