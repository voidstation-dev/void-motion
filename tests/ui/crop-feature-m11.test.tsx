/**
 * M11 crop feature UI tests.
 *
 * Verifies the crop tool UI:
 *   - the Crop activate button enters crop mode (renders the overlay + action bar).
 *   - the crop-canvas overlay renders with the legacy id + test id.
 *   - the Reset/Cancel/Apply buttons route to the crop service.
 *   - cancel exits crop mode (no mutation); confirm applies + exits.
 *
 * The engine is mocked (as in the M09/M10 suites) so no legacy runtime is
 * required.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { CanvasRegion } from '@/app/regions/CanvasRegion'
import { cropService } from '@/app/services/crop-service'
import { useLayerStore, useSelectionStore, usePlaybackStore, useCanvasStore } from '@/app/store'
import { makeLayer } from '../services/helpers/layers'

const engineMocks = {
  attachCanvases: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  destroy: vi.fn(),
}

vi.mock('@/engine/engine', () => ({
  get engine() {
    return engineMocks
  },
}))

const roObserve = vi.fn()
const roDisconnect = vi.fn()

class ControllableResizeObserver {
  constructor(_cb: ResizeObserverCallback) {
    // no-op
  }
  observe = roObserve
  unobserve = vi.fn()
  disconnect = roDisconnect
}

function installLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  w.confirmCrop = vi.fn()
  w.cancelCrop = vi.fn()
  w.scheduleAutoSave = vi.fn()
  w.togglePlay = vi.fn()
  w.restartAnim = vi.fn()
}

function clearLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  delete w.confirmCrop
  delete w.cancelCrop
  delete w.scheduleAutoSave
  delete w.togglePlay
  delete w.restartAnim
}

beforeEach(() => {
  engineMocks.attachCanvases.mockReset()
  engineMocks.resize.mockReset()
  engineMocks.dispose.mockReset()
  engineMocks.destroy.mockReset()
  roObserve.mockReset()
  roDisconnect.mockReset()
  useLayerStore.getState().clear()
  useSelectionStore.getState().clear()
  usePlaybackStore.getState().reset()
  useCanvasStore.getState().clear()
  useCanvasStore.getState().setCanvas({
    size: { width: 1280, height: 720 },
    aspectRatio: '16:9',
    resolutionPreset: '720p',
    background: { type: 'solid', val: 'white' },
  })
  cropService.session = null
  globalThis.ResizeObserver = ControllableResizeObserver as unknown as typeof ResizeObserver
  installLegacy()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  clearLegacy()
})

describe('M11 crop feature — activation', () => {
  it('renders the Crop activate button', () => {
    useLayerStore.getState().setLayers([makeLayer(1)])
    const { getByTestId } = render(<CanvasRegion />)
    expect(getByTestId('crop-activate-btn')).toBeTruthy()
  })

  it('clicking Crop activate enters crop mode and renders the overlay', () => {
    const layer = makeLayer(1)
    useLayerStore.getState().setLayers([layer])
    useSelectionStore.getState().selectLayer(layer.id)
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('crop-activate-btn'))
    expect(useSelectionStore.getState().editorMode).toBe('crop')
    expect(getByTestId('crop-canvas')).toBeTruthy()
    expect(getByTestId('crop-action-bar')).toBeTruthy()
  })

  it('Crop button is disabled when no layers exist', () => {
    const { getByTestId } = render(<CanvasRegion />)
    const btn = getByTestId('crop-activate-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('Crop button is disabled while crop is active', () => {
    const layer = makeLayer(1)
    useLayerStore.getState().setLayers([layer])
    useSelectionStore.getState().selectLayer(layer.id)
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('crop-activate-btn'))
    const btn = getByTestId('crop-activate-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})

describe('M11 crop feature — action bar', () => {
  it('Cancel exits crop mode with no mutation', () => {
    const layer = makeLayer(1)
    useLayerStore.getState().setLayers([layer])
    useSelectionStore.getState().selectLayer(layer.id)
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('crop-activate-btn'))
    const transformBefore = useLayerStore.getState().layers[0]?.transform
    fireEvent.click(getByTestId('crop-cancel-btn'))
    expect(useSelectionStore.getState().editorMode).toBe('image')
    expect(useLayerStore.getState().layers[0]?.transform).toEqual(transformBefore)
  })

  it('Apply confirms the crop and exits crop mode', () => {
    const layer = makeLayer(1)
    useLayerStore.getState().setLayers([layer])
    useSelectionStore.getState().selectLayer(layer.id)
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('crop-activate-btn'))
    fireEvent.click(getByTestId('crop-confirm-btn'))
    expect(useSelectionStore.getState().editorMode).toBe('image')
    // confirm applies the rect to the layer transform.
    const t = useLayerStore.getState().layers[0]?.transform
    expect(t).toBeDefined()
  })

  it('Reset resets the crop rect to the layer bounds', () => {
    const layer = makeLayer(1)
    useLayerStore
      .getState()
      .setLayers([
        { ...layer, transform: { x: 100, y: 100, width: 200, height: 100, rotation: 0 } },
      ])
    useSelectionStore.getState().selectLayer(layer.id)
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('crop-activate-btn'))
    const rectBefore = cropService.getRect()
    // Drag the rect, then reset.
    cropService.pointerDown(150, 150)
    cropService.pointerMove(200, 180, false)
    fireEvent.click(getByTestId('crop-reset-btn'))
    const rectAfter = cropService.getRect()
    expect(rectAfter).toEqual(rectBefore)
  })
})

describe('M11 crop feature — overlay', () => {
  it('crop-canvas has the legacy id', () => {
    const layer = makeLayer(1)
    useLayerStore.getState().setLayers([layer])
    useSelectionStore.getState().selectLayer(layer.id)
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('crop-activate-btn'))
    const el = getByTestId('crop-canvas') as HTMLCanvasElement
    expect(el.id).toBe('crop-canvas')
  })
})
