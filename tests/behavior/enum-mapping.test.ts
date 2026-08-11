import { describe, it, expect } from 'vitest'
import {
  legacyAnimationStyleToDomain,
  domainAnimationStyleToLegacy,
  legacyHandStyleToDomain,
  domainHandStyleToLegacy,
  legacyDrawDirectionToDomain,
  domainDrawDirectionToLegacy,
  legacyStrokeStyleToDomain,
  domainStrokeStyleToLegacy,
  legacyDetectionAlgorithmToDomain,
  domainDetectionAlgorithmToLegacy,
  legacyColoringStyleToDomain,
  domainColoringStyleToLegacy,
  legacyTextDrawStyleToDomain,
  domainTextDrawStyleToLegacy,
  classifyLegacyAnimStyle,
} from '../../src/engine/legacy/legacy-enum-mapping'
import type {
  LegacyAnimationStyle,
  LegacyHandStyle,
  LegacyDrawDirection,
  LegacyStrokeStyle,
  LegacyDetectionAlgorithm,
  LegacyColoringStyle,
  LegacyTextDrawStyle,
} from '../../src/engine/legacy/legacy-state.types'

describe('enum mapping round-trips', () => {
  const animationStyles: LegacyAnimationStyle[] = [
    'scanner',
    'contour',
    'outlinechunks',
    'chunkjump',
    'spec-human',
    'spec-animal',
    'spec-portrait',
    'spec-vehicle',
    'spec-building',
    'spec-landscape',
    'spec-spiral',
  ]
  it.each(animationStyles)('animation style %s round-trips', (legacy) => {
    const domain = legacyAnimationStyleToDomain(legacy)
    expect(domainAnimationStyleToLegacy(domain)).toBe(legacy)
  })

  const handStyles: LegacyHandStyle[] = ['ghost', 'custom1', 'custom2', 'custom3', 'custom4']
  it.each(handStyles)('hand style %s round-trips', (legacy) => {
    const domain = legacyHandStyleToDomain(legacy)
    expect(domainHandStyleToLegacy(domain)).toBe(legacy)
  })

  const directions: LegacyDrawDirection[] = ['ltr', 'rtl', 'ttb', 'btt']
  it.each(directions)('draw direction %s round-trips', (legacy) => {
    const domain = legacyDrawDirectionToDomain(legacy)
    expect(domainDrawDirectionToLegacy(domain)).toBe(legacy)
  })

  const strokes: LegacyStrokeStyle[] = ['default', 'charcoal', 'multipass', 'fountain', 'blueprint']
  it.each(strokes)('stroke style %s round-trips', (legacy) => {
    const domain = legacyStrokeStyleToDomain(legacy)
    expect(domainStrokeStyleToLegacy(domain)).toBe(legacy)
  })

  const algos: LegacyDetectionAlgorithm[] = ['classic', 'adaptive', 'morph-shell', 'canny2']
  it.each(algos)('detection algorithm %s round-trips', (legacy) => {
    const domain = legacyDetectionAlgorithmToDomain(legacy)
    expect(domainDetectionAlgorithmToLegacy(domain)).toBe(legacy)
  })

  const colors: LegacyColoringStyle[] = ['sparse', 'filled', 'watercolor']
  it.each(colors)('coloring style %s round-trips', (legacy) => {
    const domain = legacyColoringStyleToDomain(legacy)
    expect(domainColoringStyleToLegacy(domain)).toBe(legacy)
  })

  const textStyles: LegacyTextDrawStyle[] = ['reveal', 'outline', 'outline-fill']
  it.each(textStyles)('text draw style %s round-trips', (legacy) => {
    const domain = legacyTextDrawStyleToDomain(legacy)
    expect(domainTextDrawStyleToLegacy(domain)).toBe(legacy)
  })
})

describe('classifyLegacyAnimStyle', () => {
  it('classifies animation-tab values as animation', () => {
    expect(classifyLegacyAnimStyle('scanner')).toEqual({ kind: 'animation', value: 'scanner' })
    expect(classifyLegacyAnimStyle('chunkjump')).toEqual({
      kind: 'animation',
      value: 'chunk-jump',
    })
  })

  it('classifies drawing-tab values as drawing', () => {
    expect(classifyLegacyAnimStyle('outlinefill')).toEqual({
      kind: 'drawing',
      value: 'outline-fill',
    })
    expect(classifyLegacyAnimStyle('spec-text')).toEqual({ kind: 'drawing', value: 'text-draw' })
  })

  it('returns null for dead branches', () => {
    expect(classifyLegacyAnimStyle('scribble')).toBeNull()
    expect(classifyLegacyAnimStyle('nervous')).toBeNull()
    expect(classifyLegacyAnimStyle('spec-nature')).toBeNull()
  })
})
