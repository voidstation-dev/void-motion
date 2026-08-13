/**
 * M13 text-service tests — session + commit wiring.
 *
 * Verifies the service drives the text tool with legacy parity.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { textService } from '@/app/services/text-service'
import { useLayerStore, useSelectionStore, usePlaybackStore, useCanvasStore } from '@/app/store'
import type { LayerId } from '@/types/brand'
import type { TextLayer } from '@/types/layer'
import { DEFAULT_TEXT_STYLE } from '@/engine/image-processing/text'

const BOUNDS = { width: 1280, height: 720 }

function installLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  w.activateTextPlacement = vi.fn()
  w.deactivateTextPlacement = vi.fn()
  w.openTextEditor = vi.fn()
  w.closeTextEditor = vi.fn()
  w._commitTextLayer = vi.fn()
  w.scheduleAutoSave = vi.fn()
  w.selectLayer = vi.fn()
}

function clearLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  delete w.activateTextPlacement
  delete w.deactivateTextPlacement
  delete w.openTextEditor
  delete w.closeTextEditor
  delete w._commitTextLayer
  delete w.scheduleAutoSave
  delete w.selectLayer
}

beforeEach(() => {
  useLayerStore.getState().clear()
  useSelectionStore.getState().clear()
  usePlaybackStore.getState().reset()
  useCanvasStore.getState().clear()
  useCanvasStore.getState().setCanvas({
    size: { width: BOUNDS.width, height: BOUNDS.height },
    aspectRatio: '16:9',
    resolutionPreset: '720p',
    background: { type: 'solid', val: 'white' },
  })
  textService.reset()
  installLegacy()
})

afterEach(() => {
  clearLegacy()
  vi.restoreAllMocks()
})

describe('M13 textService.activatePlacement (legacy 8116-8126)', () => {
  it('enters text placement mode and initializes session', () => {
    expect(textService.activatePlacement()).toBe(true)
    expect(textService.isPlacing()).toBe(true)
    expect(textService.isActive()).toBe(false)
    expect(useSelectionStore.getState().editorMode).toBe('text')
  })

  it('is a no-op while playing', () => {
    usePlaybackStore.getState().setStatus('playing')
    expect(textService.activatePlacement()).toBe(false)
    expect(textService.isPlacing()).toBe(false)
  })
})

describe('M13 textService.openEditor (legacy 8129-8160)', () => {
  it('opens text editor for a new layer', () => {
    textService.activatePlacement()
    expect(textService.openEditor(100, 200, null)).toBe(true)
    expect(textService.isPlacing()).toBe(false)
    expect(textService.isActive()).toBe(true)
    expect(textService.getPosition()).toEqual({ x: 100, y: 200 })
    expect(textService.getEditingId()).toBeNull()
    expect(textService.getEditingId()).toBeNull()
  })

  it('opens text editor for an existing text layer and restores style', () => {
    const textLayer: TextLayer = {
      id: 'layer-1' as LayerId,
      name: 'Text',
      type: 'text',
      visible: true,
      opacity: 1,
      transform: { x: 100, y: 200, width: 200, height: 100, rotation: 0 },
      animationOrder: null,
      animation: { animationStyle: 'text-draw' } as any,
      assetId: 'asset-1' as never,
      textStyle: { ...DEFAULT_TEXT_STYLE, text: 'Hello World', color: '#ff0000' },
    }
    useLayerStore.getState().setLayers([textLayer])
    
    expect(textService.openEditor(100, 200, textLayer)).toBe(true)
    expect(textService.getTextStyle()?.text).toBe('Hello World')
    expect(textService.getTextStyle()?.color).toBe('#ff0000')
  })
})

describe('M13 textService.commitText (legacy 8261-8373)', () => {
  it('commits a new text layer', () => {
    textService.activatePlacement()
    textService.openEditor(150, 150, null)
    textService.setText('New Text')
    const before = useLayerStore.getState().layers.length
    expect(textService.commitText('New Text')).toBe(true)
    expect(useLayerStore.getState().layers.length).toBe(before + 1)
    const layer = useLayerStore.getState().layers[0] as TextLayer
    expect(layer.type).toBe('text')
    expect(layer.textStyle.text).toBe('New Text')
    expect(layer.transform.x).toBe(150)
    expect(layer.transform.y).toBe(150)
    expect(useSelectionStore.getState().selectedLayerId).toBe(layer.id)
  })

  it('creates new text layer', () => {
    textService.activatePlacement()
    textService.openEditor(150, 150, null)
    textService.setText('New Text')
    textService.commitText('New Text')
    expect(useLayerStore.getState().layers.length).toBe(1)
    expect((useLayerStore.getState().layers[0] as TextLayer).textStyle.text).toBe('New Text')
  })

  it('updates an existing text layer in place', () => {
    const textLayer: TextLayer = {
      id: 'layer-1' as LayerId,
      name: 'Text',
      type: 'text',
      visible: true,
      opacity: 1,
      transform: { x: 100, y: 200, width: 200, height: 100, rotation: 0 },
      animationOrder: null,
      animation: { animationStyle: 'text-draw' } as any,
      assetId: 'asset-1' as never,
      textStyle: { ...DEFAULT_TEXT_STYLE, text: 'Hello World' },
    }
    useLayerStore.getState().setLayers([textLayer])
    
    textService.openEditor(100, 200, textLayer)
    textService.setText('Updated Text')
    textService.commitText('Updated Text')
    
    expect(useLayerStore.getState().layers.length).toBe(1)
    const layer = useLayerStore.getState().layers[0] as TextLayer
    expect(layer.textStyle.text).toBe('Updated Text')
  })

  it('is a no-op for empty text', () => {
    textService.activatePlacement()
    textService.openEditor(150, 150, null)
    expect(textService.commitText('   ')).toBe(false)
  })
})

describe('M13 textService style setters', () => {
  it('updates font family', () => {
    textService.activatePlacement()
    textService.setFont('Roboto')
    expect(textService.getTextStyle()?.fontFamily).toBe('Roboto')
  })
  
  it('updates font size with clamp', () => {
    textService.activatePlacement()
    textService.setSize(5) // below min
    expect(textService.getTextStyle()?.fontSize).toBe(10)
  })
})
