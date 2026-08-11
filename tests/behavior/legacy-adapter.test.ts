import { describe, it, expect } from 'vitest'
import { projectLegacyState } from '../../src/engine/legacy/legacy-state.adapter'
import {
  buildLegacyState,
  buildLegacyImageLayer,
  buildLegacyTextLayer,
} from '../../src/test-utils/fixtures'
import { fromLegacyProjectId } from '../../src/engine/legacy/legacy-id'

describe('projectLegacyState (legacy → domain)', () => {
  it('projects an empty project with legacy defaults', () => {
    const legacy = buildLegacyState()
    const { project, assetMap } = projectLegacyState(
      legacy,
      fromLegacyProjectId(1),
      'Empty',
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    )
    expect(project.schemaVersion).toBe(1)
    expect(project.name).toBe('Empty')
    expect(project.layers).toEqual([])
    expect(project.animation.animationStyle).toBe('chunk-jump')
    expect(project.animation.handStyle).toBe('hand-1')
    expect(project.animation.zigzag).toBe(true)
    expect(project.animation.drawDirection).toBe('left-to-right')
    expect(project.animation.coloringStyle).toBe('filled')
    expect(project.animation.detectionAlgorithm).toBe('classic')
    expect(project.animation.strokeStyle).toBe('default')
    expect(project.animation.outlineDetect).toBe(50)
    expect(project.animation.color).toBe('#1a1a1a')
    expect(project.canvas.size).toEqual({ width: 1280, height: 720 })
    expect(project.canvas.background).toEqual({ type: 'solid', val: 'white' })
    expect(assetMap.size).toBe(0)
  })

  it('projects an image layer', () => {
    const legacy = buildLegacyState({
      layers: [buildLegacyImageLayer(1, { name: 'Photo', w: 200, h: 150, baseW: 200, baseH: 150 })],
    })
    const { project, assetMap } = projectLegacyState(
      legacy,
      fromLegacyProjectId(1),
      'P',
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    )
    expect(project.layers.length).toBe(1)
    const layer = project.layers[0]
    if (!layer || layer.type !== 'image') throw new Error('expected image layer')
    expect(layer.name).toBe('Photo')
    expect(layer.transform).toEqual({ x: 0, y: 0, width: 200, height: 150, rotation: 0 })
    expect(layer.resizePct).toBe(100)
    expect(layer.sourceMetadata.naturalWidth).toBe(200)
    expect(layer.sourceMetadata.hasPngAlpha).toBe(false)
    expect(assetMap.size).toBe(0) // img was null placeholder
  })

  it('projects a text layer with typography metadata', () => {
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
        }),
      ],
    })
    const { project } = projectLegacyState(
      legacy,
      fromLegacyProjectId(1),
      'P',
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    )
    const layer = project.layers[0]
    if (!layer || layer.type !== 'text') throw new Error('expected text layer')
    expect(layer.textStyle.text).toBe('Hello world')
    expect(layer.textStyle.fontFamily).toBe('Patrick Hand')
    expect(layer.textStyle.fontSize).toBe(96)
    expect(layer.textStyle.bold).toBe(true)
    expect(layer.textStyle.align).toBe('center')
    expect(layer.textStyle.color).toBe('#ff0000')
  })

  it('maps per-layer animation overrides', () => {
    const legacy = buildLegacyState({
      layers: [
        buildLegacyImageLayer(1, {
          animStyle: 'scanner',
          hand: 'custom4',
          zigzag: false,
          speed: 80,
          handSpeed: 12,
          chunks: 50,
        }),
      ],
    })
    const { project } = projectLegacyState(
      legacy,
      fromLegacyProjectId(1),
      'P',
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    )
    const layer = project.layers[0]
    if (!layer) throw new Error('expected layer')
    expect(layer.animation.animationStyle).toBe('scanner')
    expect(layer.animation.handStyle).toBe('pen')
    expect(layer.animation.zigzag).toBe(false)
    expect(layer.animation.speed).toBe(80)
    expect(layer.animation.handSpeed).toBe(12)
    expect(layer.animation.chunks).toBe(50)
  })

  it('maps a drawing-mode animStyle to chunk-jump default', () => {
    const legacy = buildLegacyState({ animStyle: 'outlinefill' })
    const { project } = projectLegacyState(
      legacy,
      fromLegacyProjectId(1),
      'P',
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    )
    // Drawing mode is classified separately; animationStyle falls back to default.
    expect(project.animation.animationStyle).toBe('chunk-jump')
  })

  it('maps gradient canvas background', () => {
    const legacy = buildLegacyState({
      canvasBg: { type: 'gradient', val: '', key: 'blueprint' },
    })
    const { project } = projectLegacyState(
      legacy,
      fromLegacyProjectId(1),
      'P',
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    )
    expect(project.canvas.background).toEqual({ type: 'gradient', key: 'blueprint' })
  })
})
