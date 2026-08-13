import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { presetService } from '../../src/app/services/preset-service'
import type { PresetSettings } from '../../src/types/project'
import { animationService } from '../../src/app/services/animation-service'
import { canvasControlsService } from '../../src/app/services/canvas-controls-service'

describe('presetService (M14)', () => {
  const dummySettings: PresetSettings = {
    animationStyle: 'contour',
    handStyle: 'hand-2',
    zigzag: false,
    speed: 50,
    handSpeed: 5,
    outlineDetect: 40,
    detectionAlgorithm: 'adaptive',
    strokeStyle: 'charcoal',
    coloringStyle: 'watercolor',
    drawDirection: 'top-to-bottom',
    textDrawStyle: 'outline',
  }

  beforeEach(() => {
    localStorage.clear()
    
    vi.spyOn(animationService, 'setAnimationStyle').mockImplementation(() => {})
    vi.spyOn(animationService, 'setDrawingMode').mockImplementation(() => {})
    vi.spyOn(animationService, 'setZigzag').mockImplementation(() => {})
    vi.spyOn(animationService, 'setOutlineDetect').mockImplementation(() => {})
    vi.spyOn(animationService, 'setDetectionAlgorithm').mockImplementation(() => {})
    vi.spyOn(animationService, 'setStrokeStyle').mockImplementation(() => {})
    vi.spyOn(animationService, 'setColoringStyle').mockImplementation(() => {})
    vi.spyOn(animationService, 'setDrawDirection').mockImplementation(() => {})
    vi.spyOn(animationService, 'setTextDrawStyle').mockImplementation(() => {})

    vi.spyOn(canvasControlsService, 'setHand').mockImplementation(() => {})
    vi.spyOn(canvasControlsService, 'setRevealSpeed').mockImplementation(() => {})
    vi.spyOn(canvasControlsService, 'setHandSpeed').mockImplementation(() => {})

    vi.stubGlobal('window', {
      pushUndoSnapshot: vi.fn(),
      scheduleAutoSave: vi.fn(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('loads empty array if no custom presets', () => {
    const presets = presetService.loadCustomPresets()
    expect(presets).toEqual([])
  })

  it('saves and loads custom presets', () => {
    const success = presetService.saveCustomPreset('My Preset', dummySettings)
    expect(success).toBe(true)

    const presets = presetService.loadCustomPresets()
    expect(presets).toHaveLength(1)
    expect(presets[0]!.name).toBe('My Preset')
    expect(presets[0]!.kind).toBe('custom')
    expect(presets[0]!.settings).toEqual(dummySettings)
  })

  it('enforces maximum custom presets limit', () => {
    for (let i = 0; i < 6; i++) {
      presetService.saveCustomPreset(`Preset ${i}`, dummySettings)
    }
    const presets = presetService.loadCustomPresets()
    expect(presets).toHaveLength(6)

    const success = presetService.saveCustomPreset('Over Limit', dummySettings)
    expect(success).toBe(false)
    expect(presetService.loadCustomPresets()).toHaveLength(6)
  })

  it('deletes custom preset by id', () => {
    presetService.saveCustomPreset('Preset A', dummySettings)
    presetService.saveCustomPreset('Preset B', dummySettings)
    const presets = presetService.loadCustomPresets()
    expect(presets).toHaveLength(2)

    presetService.deleteCustomPreset(presets[0]!.id)
    const afterDelete = presetService.loadCustomPresets()
    expect(afterDelete).toHaveLength(1)
    expect(afterDelete[0]!.name).toBe('Preset B')
  })

  it('applyPreset dispatches to animationService and canvasControlsService', () => {
    presetService.applyPreset(dummySettings)

    expect((window as any).pushUndoSnapshot).toHaveBeenCalledOnce()

    expect(animationService.setAnimationStyle).toHaveBeenCalledWith('contour')
    expect(animationService.setDrawingMode).not.toHaveBeenCalled()
    expect(animationService.setZigzag).toHaveBeenCalledWith(false)
    expect(animationService.setOutlineDetect).toHaveBeenCalledWith(40)
    expect(animationService.setDetectionAlgorithm).toHaveBeenCalledWith('adaptive')
    expect(animationService.setStrokeStyle).toHaveBeenCalledWith('charcoal')
    expect(animationService.setColoringStyle).toHaveBeenCalledWith('watercolor')
    expect(animationService.setDrawDirection).toHaveBeenCalledWith('top-to-bottom')
    expect(animationService.setTextDrawStyle).toHaveBeenCalledWith('outline')

    expect(canvasControlsService.setHand).toHaveBeenCalledWith('hand-2')
    expect(canvasControlsService.setRevealSpeed).toHaveBeenCalledWith(50)
    expect(canvasControlsService.setHandSpeed).toHaveBeenCalledWith(5)

    expect(window.scheduleAutoSave).toHaveBeenCalledOnce()
  })

  it('applyPreset routes drawing modes to setDrawingMode', () => {
    presetService.applyPreset({
      ...dummySettings,
      animationStyle: 'illust-fill',
    })

    expect(animationService.setDrawingMode).toHaveBeenCalledWith('illust-fill')
    expect(animationService.setAnimationStyle).not.toHaveBeenCalled()
  })
})
