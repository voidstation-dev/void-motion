/**
 * M10 canvas interaction UI tests.
 *
 * Verifies the `useCanvasInteraction` hook wires pointer events on the
 * selection overlay to the `interactionService`, and that the transport +
 * canvas host from M07/M09 still render under the M10 interaction layer.
 *
 * These are wiring tests: they drive the overlay with synthetic mouse events
 * and assert the selection store + layer store reflect the interaction. The
 * engine is mocked (as in the M09 suite) so no legacy runtime is required.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { CanvasRegion } from '@/app/regions/CanvasRegion'
import { useLayerStore, useSelectionStore, usePlaybackStore } from '@/app/store'
import { makeLayer } from '../services/helpers/layers'
import type { LayerId } from '@/types/brand'

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
    // No-op: the M10 UI tests do not drive the ResizeObserver; we only need
    // a non-throwing stub so useCanvasHost mounts cleanly.
  }
  observe = roObserve
  unobserve = vi.fn()
  disconnect = roDisconnect
}

function installLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  w.selectLayer = vi.fn()
  w.setLayerPos = vi.fn()
  w.setLayerResize = vi.fn()
  w.scheduleAutoSave = vi.fn()
  w.togglePlay = vi.fn()
  w.restartAnim = vi.fn()
}

function clearLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  delete w.selectLayer
  delete w.setLayerPos
  delete w.setLayerResize
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
  globalThis.ResizeObserver = ControllableResizeObserver as unknown as typeof ResizeObserver
  installLegacy()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  clearLegacy()
})

/**
 * jsdom `getBoundingClientRect` returns all zeros, so `toCanvasCoords`
 * collapses everything to the origin. To exercise real hit-testing we stub
 * the overlay's rect to a 640×360 box at (0,0) (scale = canvasW/640).
 */
function stubOverlayRect(width = 640): void {
  // The hook reads the viewport rect; stub it on the rendered element.
  const viewport = document.querySelector('[data-testid="canvas-viewport"]')
  if (viewport instanceof HTMLElement) {
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      width,
      height: 360,
      left: 0,
      top: 0,
      right: width,
      bottom: 360,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
  }
}

describe('M10 canvas interaction — overlay is the pointer surface', () => {
  it('select-canvas receives pointer events (no pointer-events-none)', () => {
    const { getByTestId } = render(<CanvasRegion />)
    const sel = getByTestId('select-canvas') as HTMLCanvasElement
    // M10 enables pointer events on the selection overlay (legacy 6691).
    expect(sel.className).not.toContain('pointer-events-none')
  })

  it('outline-overlay stays pointer-events-none (drawn over, not interacted)', () => {
    const { getByTestId } = render(<CanvasRegion />)
    const ov = getByTestId('outline-overlay') as HTMLCanvasElement
    expect(ov.className).toContain('pointer-events-none')
  })
})

describe('M10 canvas interaction — click selects a layer', () => {
  it('clicking inside a layer selects it', () => {
    const { getByTestId } = render(<CanvasRegion />)
    stubOverlayRect()
    const overlay = getByTestId('select-canvas') as HTMLCanvasElement
    // Layer at canvas (0,0,100,100); canvasW defaults to 1280 (no project
    // loaded) so scale = 1280/640 = 2 → client (25,25) → canvas (50,50).
    useLayerStore.getState().setLayers([makeLayer(1)])
    fireEvent.mouseDown(overlay, { clientX: 25, clientY: 25 })
    expect(useSelectionStore.getState().selectedLayerId).toBe('layer-1' as LayerId)
  })

  it('clicking empty space deselects', () => {
    const { getByTestId } = render(<CanvasRegion />)
    stubOverlayRect()
    const overlay = getByTestId('select-canvas') as HTMLCanvasElement
    useLayerStore.getState().setLayers([makeLayer(1)])
    useSelectionStore.getState().selectLayer('layer-1' as LayerId)
    // click far away (canvas 500,500 → client 250,250)
    fireEvent.mouseDown(overlay, { clientX: 250, clientY: 250 })
    expect(useSelectionStore.getState().selectedLayerId).toBeNull()
  })
})

describe('M10 canvas interaction — drag moves the selected layer', () => {
  it('mousedown on the selected layer body + mousemove moves it', () => {
    const { getByTestId } = render(<CanvasRegion />)
    stubOverlayRect()
    const overlay = getByTestId('select-canvas') as HTMLCanvasElement
    const layer = makeLayer(1)
    useLayerStore.getState().setLayers([layer])
    useSelectionStore.getState().selectLayer(layer.id)
    // canvas (50,50) → client (25,25) start; move to canvas (70,60) → client (35,30).
    fireEvent.mouseDown(overlay, { clientX: 25, clientY: 25 })
    fireEvent.mouseMove(overlay, { clientX: 35, clientY: 30 })
    const updated = useLayerStore.getState().layers[0]
    // dx=20, dy=10 → x=20, y=10 (orig 0,0).
    expect(updated?.transform.x).toBe(20)
    expect(updated?.transform.y).toBe(10)
  })

  it('mouseup after a move pushes an undo snapshot', () => {
    const { getByTestId } = render(<CanvasRegion />)
    stubOverlayRect()
    const overlay = getByTestId('select-canvas') as HTMLCanvasElement
    const layer = makeLayer(1)
    useLayerStore.getState().setLayers([layer])
    useSelectionStore.getState().selectLayer(layer.id)
    const before = useLayerStore.getState().undoStack.length
    fireEvent.mouseDown(overlay, { clientX: 25, clientY: 25 })
    fireEvent.mouseMove(overlay, { clientX: 35, clientY: 30 })
    fireEvent.mouseUp(document)
    expect(useLayerStore.getState().undoStack.length).toBe(before + 1)
  })
})

describe('M10 canvas interaction — no-op while playing', () => {
  it('pointerdown is a no-op while playing (legacy 6694)', () => {
    const { getByTestId } = render(<CanvasRegion />)
    stubOverlayRect()
    const overlay = getByTestId('select-canvas') as HTMLCanvasElement
    useLayerStore.getState().setLayers([makeLayer(1)])
    usePlaybackStore.getState().setStatus('playing')
    fireEvent.mouseDown(overlay, { clientX: 25, clientY: 25 })
    expect(useSelectionStore.getState().selectedLayerId).toBeNull()
  })
})

describe('M10 canvas interaction — M07/M09 parity preserved', () => {
  it('transport still renders with the interaction hook mounted', () => {
    useLayerStore.getState().setLayers([makeLayer(1)])
    const { getByLabelText } = render(<CanvasRegion />)
    const play = getByLabelText('Play') as HTMLButtonElement
    expect(play.disabled).toBe(false)
  })

  it('canvas surfaces still attach to the engine on mount', () => {
    render(<CanvasRegion />)
    expect(engineMocks.attachCanvases).toHaveBeenCalledOnce()
  })
})
