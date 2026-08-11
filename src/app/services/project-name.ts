/**
 * Legacy random project-name generator (M05).
 *
 * Mirrors the legacy `generateRandomName` (legacy/index.html:4241) verbatim,
 * including the exact adjective/noun word lists and the `adj + ' ' + noun`
 * format. Behavior must match the legacy generator so the "New Project"
 * flow produces names from the same distribution.
 *
 * The legacy app uses `Math.random()` directly; the new domain keeps that
 * for parity (the deterministic `RandomSource` from M18 is for animation
 * algorithms, not project naming).
 */

/** Legacy adjective list (legacy/index.html:4238). */
const ADJECTIVES = [
  'Bright',
  'Happy',
  'Creative',
  'Swift',
  'Bold',
  'Vivid',
  'Fresh',
  'Clever',
  'Dynamic',
  'Neat',
] as const

/** Legacy noun list (legacy/index.html:4239). */
const NOUNS = [
  'Sketch',
  'Drawing',
  'Board',
  'Canvas',
  'Design',
  'Art',
  'Doodle',
  'Visual',
  'Diagram',
  'Scene',
] as const

/**
 * Generate a random project name in the legacy `"Adjective Noun"` format.
 * Uses `Math.random()` to match the legacy distribution exactly.
 */
export function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  if (adj === undefined || noun === undefined) {
    // Unreachable: the arrays are non-empty constants. Guarded only to
    // satisfy `noUncheckedIndexedAccess`.
    return 'Untitled'
  }
  return `${adj} ${noun}`
}
