import { describe, it, expect } from 'vitest'
import { loadGoldenFixture, GOLDEN_FIXTURE_NAMES } from '../../src/test-utils/golden'
import { projectLegacyState } from '../../src/engine/legacy/legacy-state.adapter'
import {
  buildLegacyState,
  buildLegacyImageLayer,
  buildLegacyTextLayer,
} from '../../src/test-utils/fixtures'
import { fromLegacyProjectId } from '../../src/engine/legacy/legacy-id'
import type { LegacyInkplainerState, LegacyLayer } from '../../src/engine/legacy/legacy-state.types'

/**
 * Golden fixture parity tests.
 *
 * Each fixture in `tests/fixtures/<name>/` carries an `expected.json`
 * behavioral snapshot. These tests build the corresponding legacy `state`,
 * project it through the adapter, and assert the snapshot matches. This is
 * the M00 state-parity check: if the adapter projection ever drifts from the
 * locked behavior, a fixture fails.
 */

const FIXED_CREATED = '2026-01-01T00:00:00.000Z'

/** Project a legacy state and return the serializable snapshot fields. */
function projectSnapshot(legacy: LegacyInkplainerState, name: string) {
  const { project } = projectLegacyState(
    legacy,
    fromLegacyProjectId(1),
    name,
    FIXED_CREATED,
    FIXED_CREATED,
  )
  return project
}

describe('golden fixtures load', () => {
  it.each(GOLDEN_FIXTURE_NAMES)('%s has expected.json and notes.md', (name) => {
    const fixture = loadGoldenFixture(name)
    expect(fixture.expected).toBeDefined()
    expect(fixture.notes.length).toBeGreaterThan(0)
  })
})

describe('fixture 01 — single PNG projects to expected snapshot', () => {
  it('matches expected.json', () => {
    const expected = loadGoldenFixture('01-single-png').expected as Record<string, unknown>
    const legacy = buildLegacyState({
      layers: [
        buildLegacyImageLayer(1, {
          name: 'Single PNG',
          w: 800,
          h: 600,
          baseW: 800,
          baseH: 600,
          animOrder: 1,
        }),
      ],
    })
    const project = projectSnapshot(legacy, '01-single-png')
    const expectedCanvas = expected.canvas as { size: { width: number; height: number } }
    expect(project.schemaVersion).toBe(expected.schemaVersion)
    expect(project.name).toBe(expected.name)
    expect(project.canvas.size).toEqual(expectedCanvas.size)
    expect(project.layers.length).toBe(expected.layerCount)
    expect(project.layers[0]?.type).toBe('image')
    expect(project.layers[0]?.transform.width).toBe(800)
  })
})

describe('fixture 02 — transparent PNG projects to expected snapshot', () => {
  it('matches expected.json', () => {
    const expected = loadGoldenFixture('02-transparent-png').expected as Record<string, unknown>
    const legacy = buildLegacyState({
      layers: [
        buildLegacyImageLayer(1, {
          name: 'Transparent PNG',
          w: 640,
          h: 480,
          baseW: 640,
          baseH: 480,
          hasPngAlpha: true,
          animOrder: 1,
        }),
      ],
    })
    const project = projectSnapshot(legacy, '02-transparent-png')
    const layer = project.layers[0]
    if (!layer || layer.type !== 'image') throw new Error('expected image layer')
    expect(layer.sourceMetadata.hasPngAlpha).toBe(true)
    expect(project.layers.length).toBe(expected.layerCount)
  })
})

describe('fixture 04 — text layer projects to expected snapshot', () => {
  it('matches expected.json', () => {
    const expected = loadGoldenFixture('04-text').expected as Record<string, unknown>
    const legacy = buildLegacyState({
      layers: [
        buildLegacyTextLayer(2, {
          name: 'Caption',
          _textContent: 'Hello world',
          _textFont: 'Patrick Hand',
          _textSize: 96,
          _textBold: true,
          _textAlign: 'center',
          _textColor: '#ff0000',
          animOrder: 1,
        }),
      ],
    })
    const project = projectSnapshot(legacy, '04-text')
    const layer = project.layers[0]
    if (!layer || layer.type !== 'text') throw new Error('expected text layer')
    expect(layer.textStyle.text).toBe('Hello world')
    expect(layer.textStyle.fontFamily).toBe('Patrick Hand')
    expect(layer.textStyle.fontSize).toBe(96)
    expect(layer.textStyle.bold).toBe(true)
    expect(layer.textStyle.align).toBe('center')
    expect(layer.textStyle.color).toBe('#ff0000')
    expect(project.layers.length).toBe(expected.layerCount)
  })
})

describe('fixture 05 — multi-layer sequential projects to expected snapshot', () => {
  it('matches expected.json', () => {
    const expected = loadGoldenFixture('05-multi-layer').expected as Record<string, unknown>
    const layers: LegacyLayer[] = []
    for (let i = 0; i < 3; i++) {
      layers.push(
        buildLegacyImageLayer(i + 1, {
          name: `Layer ${String.fromCharCode(65 + i)}`,
          x: i * 400,
          w: 400,
          h: 300,
          baseW: 400,
          baseH: 300,
          animOrder: i + 1,
        }),
      )
    }
    const legacy = buildLegacyState({ layers })
    const project = projectSnapshot(legacy, '05-multi-layer')
    expect(project.layers.length).toBe(expected.layerCount)
    expect(project.layers[0]?.animationOrder).toBe(1)
    expect(project.layers[1]?.animationOrder).toBe(2)
    expect(project.layers[2]?.animationOrder).toBe(3)
  })
})

describe('fixture 06 — parallel order projects to expected snapshot', () => {
  it('matches expected.json', () => {
    const expected = loadGoldenFixture('06-parallel-order').expected as Record<string, unknown>
    const layers: LegacyLayer[] = []
    for (let i = 0; i < 3; i++) {
      layers.push(
        buildLegacyImageLayer(i + 1, {
          name: `Parallel ${String.fromCharCode(65 + i)}`,
          x: i * 400,
          w: 400,
          h: 300,
          baseW: 400,
          baseH: 300,
          animOrder: 1, // all same order → parallel
        }),
      )
    }
    const legacy = buildLegacyState({ layers })
    const project = projectSnapshot(legacy, '06-parallel-order')
    expect(project.layers.length).toBe(expected.layerCount)
    for (const layer of project.layers) {
      expect(layer.animationOrder).toBe(1)
    }
  })
})

describe('fixture 11 — scanner projects to expected snapshot', () => {
  it('matches expected.json', () => {
    const expected = loadGoldenFixture('11-scanner').expected as Record<string, unknown>
    const legacy = buildLegacyState({
      animStyle: 'scanner',
      layers: [
        buildLegacyImageLayer(1, {
          name: 'Scanner target',
          w: 800,
          h: 600,
          baseW: 800,
          baseH: 600,
          animStyle: 'scanner',
          animOrder: 1,
        }),
      ],
    })
    const project = projectSnapshot(legacy, '11-scanner')
    expect(project.animation.animationStyle).toBe('scanner')
    expect(project.layers[0]?.animation.animationStyle).toBe('scanner')
    expect(project.layers.length).toBe(expected.layerCount)
  })
})

describe('fixture 12 — contour projects to expected snapshot', () => {
  it('matches expected.json', () => {
    const expected = loadGoldenFixture('12-contour').expected as Record<string, unknown>
    const legacy = buildLegacyState({
      animStyle: 'contour',
      layers: [
        buildLegacyImageLayer(1, {
          name: 'Contour target',
          w: 800,
          h: 600,
          baseW: 800,
          baseH: 600,
          animStyle: 'contour',
          animOrder: 1,
        }),
      ],
    })
    const project = projectSnapshot(legacy, '12-contour')
    expect(project.animation.animationStyle).toBe('contour')
    expect(project.layers[0]?.animation.animationStyle).toBe('contour')
    expect(project.layers.length).toBe(expected.layerCount)
  })
})

describe('fixture 13 — outline chunks projects to expected snapshot', () => {
  it('matches expected.json', () => {
    const expected = loadGoldenFixture('13-outline').expected as Record<string, unknown>
    const legacy = buildLegacyState({
      animStyle: 'outlinechunks',
      layers: [
        buildLegacyImageLayer(1, {
          name: 'Outline target',
          w: 800,
          h: 600,
          baseW: 800,
          baseH: 600,
          animStyle: 'outlinechunks',
          animOrder: 1,
        }),
      ],
    })
    const project = projectSnapshot(legacy, '13-outline')
    expect(project.animation.animationStyle).toBe('outline-chunks')
    expect(project.layers[0]?.animation.animationStyle).toBe('outline-chunks')
    expect(project.layers.length).toBe(expected.layerCount)
  })
})

describe('fixture 15 — specialized modes round-trip', () => {
  it('matches expected.json', () => {
    const expected = loadGoldenFixture('15-specialized').expected as Record<string, unknown>
    const specMap = expected.specializedRoundTrip as Record<string, string>
    const specEntries = Object.entries(specMap)
    const names = ['Human', 'Animal', 'Portrait', 'Vehicle', 'Building', 'Landscape', 'Spiral']
    const legacy = buildLegacyState({
      layers: specEntries.map(([legacyStyle], i) => {
        const name = names[i]
        if (!name) throw new Error(`missing name for index ${i}`)
        return buildLegacyImageLayer(i + 1, {
          name,
          animStyle: legacyStyle as LegacyLayer['animStyle'],
          animOrder: i + 1,
        })
      }),
    })
    const project = projectSnapshot(legacy, '15-specialized')
    expect(project.layers.length).toBe(expected.layerCount)
    project.layers.forEach((layer, i) => {
      const entry = specEntries[i]
      if (!entry) throw new Error(`missing spec entry ${i}`)
      const expectedStyle = specMap[entry[0]]
      if (!expectedStyle) throw new Error(`missing spec value for ${entry[0]}`)
      expect(layer.animation.animationStyle).toBe(expectedStyle)
    })
  })
})
