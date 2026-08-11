/**
 * Golden fixture helpers.
 *
 * Each golden fixture (see `tests/fixtures/`) carries an `expected.json`
 * machine-readable behavioral snapshot plus a `notes.md` human description.
 * These helpers load and validate them.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** A loaded golden fixture. */
export interface GoldenFixture {
  readonly name: string
  readonly expected: unknown
  readonly notes: string
}

/**
 * Load a golden fixture by name from `tests/fixtures/<name>/`.
 * `expected.json` is required; `notes.md` is optional.
 */
export function loadGoldenFixture(name: string, root = 'tests/fixtures'): GoldenFixture {
  const dir = resolve(root, name)
  const expectedPath = resolve(dir, 'expected.json')
  const notesPath = resolve(dir, 'notes.md')
  if (!existsSync(expectedPath)) {
    throw new Error(`Golden fixture ${name}: missing expected.json at ${expectedPath}`)
  }
  const expected = JSON.parse(readFileSync(expectedPath, 'utf8')) as unknown
  const notes = existsSync(notesPath) ? readFileSync(notesPath, 'utf8') : ''
  return { name, expected, notes }
}

/**
 * The canonical fixture names, matching the M00 minimum set
 * (MIGRATION_00 §20 / master plan §M00).
 */
export const GOLDEN_FIXTURE_NAMES = [
  '01-single-png',
  '02-transparent-png',
  '03-photo',
  '04-text',
  '05-multi-layer',
  '06-parallel-order',
  '07-crop',
  '08-grid-slicer',
  '09-rectangle-slicer',
  '10-freehand-slicer',
  '11-scanner',
  '12-contour',
  '13-outline',
  '14-illustration-fill',
  '15-specialized',
] as const
