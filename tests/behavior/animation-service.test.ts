import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { animationService } from '../../src/app/services/animation-service'
import { useAnimationStore } from '../../src/app/store/animation.store'
import { buildLegacyState } from '../../src/test-utils/fixtures'

describe('animationService (M14)', () => {
  let selectAnimSpy: ReturnType<typeof vi.fn>
  let selectTextDirSpy: ReturnType<typeof vi.fn>
  let selectTextDrawStyleSpy: ReturnType<typeof vi.fn>
  let selectDetectAlgSpy: ReturnType<typeof vi.fn>
  let selectOutlineStrokeSpy: ReturnType<typeof vi.fn>
  let selectColorStyleSpy: ReturnType<typeof vi.fn>
  let selectRevealAnimSpy: ReturnType<typeof vi.fn>
  let scheduleAutoSaveSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    selectAnimSpy = vi.fn()
    selectTextDirSpy = vi.fn()
    selectTextDrawStyleSpy = vi.fn()
    selectDetectAlgSpy = vi.fn()
    selectOutlineStrokeSpy = vi.fn()
    selectColorStyleSpy = vi.fn()
    selectRevealAnimSpy = vi.fn()
    scheduleAutoSaveSpy = vi.fn()

    const state = buildLegacyState()

    // Add layers for testing zigzag/outlineDetect overrides
    state.layers.push({
      id: 1,
      kind: 'image',
      name: 'Layer 1',
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      baseW: 100,
      baseH: 100,
      hasPngAlpha: false,
      visible: true,
      opacity: 1,
      animOrder: 0,
      resizePct: 1,
      animStyle: 'scanner',
      hand: 'ghost',
      zigzag: false,
      speed: 40,
      handSpeed: 6,
      chunks: 1,
      specChunks: 1,
      outlineDetect: 50,
      outlineColor: '#000',
      outlineThickness: 2,
    } as any)
    state.selectedLayerId = 1

    vi.stubGlobal('window', {
      state,
      selectAnim: selectAnimSpy,
      selectTextDir: selectTextDirSpy,
      selectTextDrawStyle: selectTextDrawStyleSpy,
      selectDetectAlg: selectDetectAlgSpy,
      selectOutlineStroke: selectOutlineStrokeSpy,
      selectColorStyle: selectColorStyleSpy,
      selectRevealAnim: selectRevealAnimSpy,
      scheduleAutoSave: scheduleAutoSaveSpy,
    })

    useAnimationStore.getState().reset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('setAnimationStyle sets state and delegates to legacy', () => {
    animationService.setAnimationStyle('contour')

    expect(useAnimationStore.getState().defaults.animationStyle).toBe('contour')
    expect(useAnimationStore.getState().activeMode).toBe('contour')

    expect(selectAnimSpy).toHaveBeenCalledOnce()
    expect(selectAnimSpy.mock.calls[0]![0].dataset.anim).toBe('contour')
  })

  it('setDrawingMode sets state and delegates to legacy', () => {
    animationService.setDrawingMode('outline-fill')

    // Store activeMode updates but defaults.animationStyle does not change
    expect(useAnimationStore.getState().activeMode).toBe('outline-fill')
    expect(useAnimationStore.getState().defaults.animationStyle).toBe('chunk-jump') // default

    expect(selectAnimSpy).toHaveBeenCalledOnce()
    expect(selectAnimSpy.mock.calls[0]![0].dataset.anim).toBe('outlinefill')
  })

  it('setZigzag mutates legacy state directly and selected layer', () => {
    animationService.setZigzag(true)

    expect(useAnimationStore.getState().defaults.zigzag).toBe(true)
    expect(window.state!.zigzag).toBe(true)
    expect(window.state!.layers[0]!.zigzag).toBe(true)
    expect(scheduleAutoSaveSpy).toHaveBeenCalledOnce()
  })

  it('setOutlineDetect mutates legacy state directly and selected layer', () => {
    animationService.setOutlineDetect(75)

    expect(useAnimationStore.getState().defaults.outlineDetect).toBe(75)
    expect(window.state!.outlineDetect).toBe(75)
    expect(window.state!.layers[0]!.outlineDetect).toBe(75)
    expect(scheduleAutoSaveSpy).toHaveBeenCalledOnce()
  })

  it('setColor mutates legacy state color and selected layer outlineColor', () => {
    animationService.setColor('#ff0000')

    expect(useAnimationStore.getState().defaults.color).toBe('#ff0000')
    expect(window.state!.color).toBe('#ff0000')
    expect(window.state!.layers[0]!.outlineColor).toBe('#ff0000')
    expect(scheduleAutoSaveSpy).toHaveBeenCalledOnce()
  })

  it('delegates other settings correctly', () => {
    animationService.setDrawDirection('top-to-bottom')
    expect(window.state!.textAnimDir).toBe('ttb')
    expect(window.state!.layers[0]!.textAnimDir).toBe('ttb')

    animationService.setTextDrawStyle('outline')
    expect(window.state!.textDrawStyle).toBe('outline')
    expect(window.state!.layers[0]!.textDrawStyle).toBe('outline')

    animationService.setDetectionAlgorithm('adaptive')
    expect(window.state!.outlineAlgorithm).toBe('adaptive')
    expect(window.state!.layers[0]!.outlineAlgorithm).toBe('adaptive')

    animationService.setStrokeStyle('charcoal')
    expect(window.state!.outlineStrokeStyle).toBe('charcoal')
    expect(window.state!.layers[0]!.outlineStrokeStyle).toBe('charcoal')

    animationService.setColoringStyle('watercolor')
    expect(window.state!.colorStyle).toBe('watercolor')
    expect(window.state!.layers[0]!.colorStyle).toBe('watercolor')

    animationService.setRevealStyle('wipe-right')
    expect(window.state!.animStyle).toBe('wipe-right' as any)
    expect(window.state!.layers[0]!.animStyle).toBe('wipe-right' as any)
  })
})
