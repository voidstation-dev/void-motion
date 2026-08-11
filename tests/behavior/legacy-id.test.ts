import { describe, it, expect } from 'vitest'
import {
  fromLegacyLayerId,
  toLegacyLayerId,
  fromLegacyGroupId,
  toLegacyGroupId,
  fromLegacyProjectId,
  toLegacyProjectId,
} from '../../src/engine/legacy/legacy-id'

describe('legacy ID conversion', () => {
  it('layer IDs round-trip', () => {
    expect(toLegacyLayerId(fromLegacyLayerId(42))).toBe(42)
    expect(String(fromLegacyLayerId(7))).toBe('7')
  })

  it('group IDs round-trip', () => {
    expect(toLegacyGroupId(fromLegacyGroupId(3))).toBe(3)
  })

  it('project IDs round-trip', () => {
    expect(toLegacyProjectId(fromLegacyProjectId(101))).toBe(101)
  })

  it('branded IDs are strings at runtime', () => {
    expect(typeof fromLegacyLayerId(1)).toBe('string')
    expect(typeof fromLegacyProjectId(1)).toBe('string')
  })
})
