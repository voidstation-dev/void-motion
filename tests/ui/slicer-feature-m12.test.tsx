/**
 * M12 slicer feature UI tests.
 *
 * Verifies the slicer tool UI:
 *   - the Slice activate button enters slicer mode (renders the modal).
 *   - the slicer modal renders with the legacy ids + test ids.
 *   - the Grid / Rectangles / Freehand tabs switch the active pane.
 *   - the grid pane shows the cols/rows slider value labels.
 *   - the Cancel / Apply buttons route to the slicer service.
 *
 * The engine is mocked (as in the M09–M11 suites) so no legacy runtime is
 * required. Radix Tabs fire `onValueChange` from a `mousedown` (button 0, no
 * ctrl) on the trigger; `fireEvent.click` does not synthesize mousedown, so
 * tab-switch tests dispatch `fireEvent.mouseDown` directly.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent, act } from '@testing-library/react'
import { CanvasRegion } from '@/app/regions/CanvasRegion'
import { slicerService } from '@/app/services/slicer-service'
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
  w.applySlices = vi.fn()
  w.closeSlicerModal = vi.fn()
  w.scheduleAutoSave = vi.fn()
  w.togglePlay = vi.fn()
  w.restartAnim = vi.fn()
}

function clearLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  delete w.applySlices
  delete w.closeSlicerModal
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
  slicerService.session = null
  globalThis.ResizeObserver = ControllableResizeObserver as unknown as typeof ResizeObserver
  installLegacy()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  clearLegacy()
})

/** Place a selected layer so the activate button is enabled. */
function placeSelectedLayer(): void {
  const layer = makeLayer(1)
  useLayerStore.getState().setLayers([layer])
  useSelectionStore.getState().selectLayer(layer.id)
}

describe('M12 slicer feature — activation', () => {
  it('renders the Slice activate button', () => {
    useLayerStore.getState().setLayers([makeLayer(1)])
    const { getByTestId } = render(<CanvasRegion />)
    expect(getByTestId('slicer-activate-btn')).toBeTruthy()
  })

  it('clicking Slice activate enters slicer mode and renders the modal', () => {
    placeSelectedLayer()
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('slicer-activate-btn'))
    expect(useSelectionStore.getState().editorMode).toBe('slicer')
    expect(getByTestId('slicer-modal')).toBeTruthy()
  })

  it('Slice button is disabled when no layers exist', () => {
    const { getByTestId } = render(<CanvasRegion />)
    const btn = getByTestId('slicer-activate-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('Slice button is disabled while slicer is active', () => {
    placeSelectedLayer()
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('slicer-activate-btn'))
    const btn = getByTestId('slicer-activate-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('Slice button is disabled while crop is active', () => {
    placeSelectedLayer()
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('crop-activate-btn'))
    const btn = getByTestId('slicer-activate-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})

describe('M12 slicer feature — modal structure', () => {
  it('renders the preview canvas with the legacy id', () => {
    placeSelectedLayer()
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('slicer-activate-btn'))
    const el = getByTestId('slicer-preview-canvas') as HTMLCanvasElement
    expect(el.id).toBe('slicer-preview-canvas')
  })

  it('renders the three mode tabs', () => {
    placeSelectedLayer()
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('slicer-activate-btn'))
    expect(getByTestId('slicer-tab-grid')).toBeTruthy()
    expect(getByTestId('slicer-tab-rect')).toBeTruthy()
    expect(getByTestId('slicer-tab-freehand')).toBeTruthy()
  })

  it('defaults to the grid pane with cols/rows = 2', () => {
    placeSelectedLayer()
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('slicer-activate-btn'))
    expect(getByTestId('slicer-pane-grid')).toBeTruthy()
    expect(getByTestId('slicer-cols-val').textContent).toBe('2')
    expect(getByTestId('slicer-rows-val').textContent).toBe('2')
  })

  it('footer shows the grid create-N-layers message', () => {
    placeSelectedLayer()
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('slicer-activate-btn'))
    expect(getByTestId('slicer-footer-info').textContent).toBe(
      'Will create 4 layers from this image.',
    )
  })
})

describe('M12 slicer feature — tab switching', () => {
  it('switching to the Rectangles tab shows the rect pane', () => {
    placeSelectedLayer()
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('slicer-activate-btn'))
    // Radix Tabs activate on mousedown (button 0, no ctrl); fireEvent.click
    // does not synthesize mousedown, so dispatch it directly.
    fireEvent.mouseDown(getByTestId('slicer-tab-rect'), { button: 0, ctrlKey: false })
    expect(slicerService.getMode()).toBe('rect')
    expect(getByTestId('slicer-pane-rect')).toBeTruthy()
  })

  it('switching to the Freehand tab shows the freehand pane', () => {
    placeSelectedLayer()
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('slicer-activate-btn'))
    fireEvent.mouseDown(getByTestId('slicer-tab-freehand'), { button: 0, ctrlKey: false })
    expect(slicerService.getMode()).toBe('freehand')
    expect(getByTestId('slicer-pane-freehand')).toBeTruthy()
  })
})

describe('M12 slicer feature — apply / cancel', () => {
  it('Cancel exits slicer mode with no mutation', () => {
    placeSelectedLayer()
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('slicer-activate-btn'))
    const transformBefore = useLayerStore.getState().layers[0]?.transform
    fireEvent.click(getByTestId('slicer-cancel-btn'))
    expect(useSelectionStore.getState().editorMode).toBe('image')
    expect(useLayerStore.getState().layers[0]?.transform).toEqual(transformBefore)
  })

  it('Apply confirms the slices and exits slicer mode', () => {
    placeSelectedLayer()
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('slicer-activate-btn'))
    // Grid 2x2 is the default → canApply is true.
    fireEvent.click(getByTestId('slicer-apply-btn'))
    expect(useSelectionStore.getState().editorMode).toBe('image')
    // confirm replaces the original with 4 new layers.
    expect(useLayerStore.getState().layers).toHaveLength(4)
  })

  it('Apply is disabled when canApply is false (grid 1x1)', () => {
    placeSelectedLayer()
    const { getByTestId } = render(<CanvasRegion />)
    fireEvent.click(getByTestId('slicer-activate-btn'))
    // Force the grid to 1x1 via the service (Radix Slider is jsdom-limited).
    // Wrap in act() because the service mutation notifies subscribers
    // synchronously; React needs a flush to re-render the modal.
    act(() => {
      slicerService.setGrid(1, 1)
    })
    const btn = getByTestId('slicer-apply-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})
