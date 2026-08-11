import { describe, it, expect } from 'vitest'
import { createSeededRandom, withSeededRandom } from '../../src/migration/seeded-random'

describe('seeded random', () => {
  it('is deterministic for the same numeric seed', () => {
    const a = createSeededRandom(42)
    const b = createSeededRandom(42)
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('is deterministic for the same string seed', () => {
    const a = createSeededRandom('fixture-06')
    const b = createSeededRandom('fixture-06')
    expect(a.next()).toBe(b.next())
  })

  it('produces different sequences for different seeds', () => {
    const a = createSeededRandom(1)
    const b = createSeededRandom(2)
    const seqA = Array.from({ length: 5 }, () => a.next())
    const seqB = Array.from({ length: 5 }, () => b.next())
    expect(seqA).not.toEqual(seqB)
  })

  it('produces values in [0, 1)', () => {
    const rng = createSeededRandom(7)
    for (let i = 0; i < 1000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('nextInt returns integers in [0, n)', () => {
    const rng = createSeededRandom(99)
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextInt(5)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(5)
    }
  })

  it('reset returns the source to its initial state', () => {
    const rng = createSeededRandom(13)
    const first = Array.from({ length: 5 }, () => rng.next())
    rng.reset()
    const second = Array.from({ length: 5 }, () => rng.next())
    expect(second).toEqual(first)
  })

  it('withSeededRandom patches Math.random and restores it', () => {
    const original = Math.random
    const out = withSeededRandom('test', () => {
      const seq = Array.from({ length: 5 }, () => Math.random())
      return seq
    })
    expect(Math.random).toBe(original)
    // Re-running with the same seed yields the same patched sequence.
    const out2 = withSeededRandom('test', () => Array.from({ length: 5 }, () => Math.random()))
    expect(out2).toEqual(out)
  })
})
