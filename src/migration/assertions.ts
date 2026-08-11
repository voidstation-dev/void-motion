/**
 * Migration parity assertions.
 *
 * Helpers for behavior-lock tests that compare legacy and domain values
 * without being noisy about floating-point / structural noise.
 */

import type { ProjectDocument } from '../types/project'

/**
 * Assert two values are strictly equal, with a readable failure message.
 */
export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
  }
}

/**
 * Assert two numbers are equal within a tolerance. Used for progress ratios
 * and geometry that may accumulate float error.
 */
export function assertClose(actual: number, expected: number, tol: number, message: string): void {
  if (Math.abs(actual - expected) > tol) {
    throw new Error(
      `${message}: expected ${expected} ± ${tol}, got ${actual} (diff ${actual - expected})`,
    )
  }
}

/**
 * Structural parity check for project documents: same schema version, same
 * layer count, same layer order. Deep equality is intentionally NOT used —
 * the point is to catch regressions in the shape the parity phase cares
 * about, not to forbid additive fields.
 */
export function assertProjectParity(actual: ProjectDocument, expected: ProjectDocument): void {
  assertEqual(actual.schemaVersion, expected.schemaVersion, 'schemaVersion mismatch')
  assertEqual(actual.layers.length, expected.layers.length, 'layer count mismatch')
  for (let i = 0; i < actual.layers.length; i++) {
    const a = actual.layers[i]
    const e = expected.layers[i]
    if (a === undefined || e === undefined) continue
    assertEqual(a.id, e.id, `layer[${i}].id mismatch`)
    assertEqual(a.type, e.type, `layer[${i}].type mismatch`)
    assertEqual(a.visible, e.visible, `layer[${i}].visible mismatch`)
    assertEqual(a.opacity, e.opacity, `layer[${i}].opacity mismatch`)
    assertEqual(a.animationOrder, e.animationOrder, `layer[${i}].animationOrder mismatch`)
  }
}
