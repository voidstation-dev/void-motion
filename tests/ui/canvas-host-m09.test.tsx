/**
 * M09 React Canvas Host tests.
 *
 * Verifies the canvas lifecycle contract:
 *   - React renders the four `<canvas>` surfaces (main, hand, selection,
 *     outline) with the legacy IDs + test ids.
 *   - `useCanvasHost` attaches the canvas refs to the engine on mount via
 *     `engine.attachCanvases`.
 *   - viewport resize forwards to `engine.resize` (ResizeObserver).
 *   - unmount calls `engine.dispose` (soft teardown — the singleton stays
 *     reusable, a subsequent mount can re-attach).
 *   - no new code looks up a canvas by `document.getElementById`.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { CanvasRegion } from '@/app/regions/CanvasRegion'
import { useLayerStore } from '@/app/store'
import { makeLayer } from '../services/helpers/layers'

// The engine is a singleton imported by useCanvasHost. Mock the module so we
// can observe attachCanvases / resize / dispose without touching the real
// adapter (which would require the legacy runtime).
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

// Capture the ResizeObserver callback so the test can drive it. The jsdom
// polyfill is a no-op, so we install a controllable stub for this suite.
let roCallback: ResizeObserverCallback | null = null
const roObserve = vi.fn()
const roDisconnect = vi.fn()

class ControllableResizeObserver {
  constructor(cb: ResizeObserverCallback) {
    roCallback = cb
  }
  observe = roObserve
  unobserve = vi.fn()
  disconnect = roDisconnect
}

beforeEach(() => {
  engineMocks.attachCanvases.mockReset()
  engineMocks.resize.mockReset()
  engineMocks.dispose.mockReset()
  engineMocks.destroy.mockReset()
  roObserve.mockReset()
  roDisconnect.mockReset()
  roCallback = null
  useLayerStore.getState().clear()
  // Replace the global ResizeObserver with the controllable stub.
  globalThis.ResizeObserver = ControllableResizeObserver as unknown as typeof ResizeObserver
})

function installLegacyTransport(): void {
  const w = window as unknown as Record<string, unknown>
  w.togglePlay = vi.fn()
  w.restartAnim = vi.fn()
}

function clearLegacyTransport(): void {
  const w = window as unknown as Record<string, unknown>
  delete w.togglePlay
  delete w.restartAnim
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  clearLegacyTransport()
})

function entry(width: number, height: number): ResizeObserverEntry {
  // Minimal ResizeObserverEntry shape used by the hook.
  return {
    target: null as unknown as Element,
    contentRect: {
      width,
      height,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    },
    borderBoxSize: [],
    contentBoxSize: [],
    devicePixelContentBoxSize: [],
  } as unknown as ResizeObserverEntry
}

describe('M09 React Canvas Host — surfaces', () => {
  it('renders main-canvas with the legacy id + test id', () => {
    const { getByTestId } = render(<CanvasRegion />)
    const main = getByTestId('main-canvas') as HTMLCanvasElement
    expect(main.id).toBe('main-canvas')
  })

  it('renders hand-canvas (no legacy id — created dynamically in legacy)', () => {
    const { getByTestId } = render(<CanvasRegion />)
    const hand = getByTestId('hand-canvas') as HTMLCanvasElement
    expect(hand).toBeTruthy()
  })

  it('renders select-canvas with the legacy id + test id', () => {
    const { getByTestId } = render(<CanvasRegion />)
    const sel = getByTestId('select-canvas') as HTMLCanvasElement
    expect(sel.id).toBe('select-canvas')
  })

  it('renders outline-overlay with the legacy id + test id', () => {
    const { getByTestId } = render(<CanvasRegion />)
    const ov = getByTestId('outline-overlay') as HTMLCanvasElement
    expect(ov.id).toBe('outline-overlay')
  })

  it('renders the canvas-viewport container', () => {
    const { getByTestId } = render(<CanvasRegion />)
    expect(getByTestId('canvas-viewport')).toBeTruthy()
  })
})

describe('M09 React Canvas Host — engine contract', () => {
  it('attaches the four canvas refs to the engine on mount', () => {
    render(<CanvasRegion />)
    expect(engineMocks.attachCanvases).toHaveBeenCalledOnce()
    const handles = engineMocks.attachCanvases.mock.calls[0]?.[0] as
      Record<string, HTMLCanvasElement> | undefined
    expect(handles).toBeTruthy()
    expect(handles?.main).toBeInstanceOf(HTMLCanvasElement)
    expect(handles?.hand).toBeInstanceOf(HTMLCanvasElement)
    expect(handles?.selection).toBeInstanceOf(HTMLCanvasElement)
    expect(handles?.outlineOverlay).toBeInstanceOf(HTMLCanvasElement)
  })

  it('forwards viewport content-box size to engine.resize', () => {
    render(<CanvasRegion />)
    expect(roCallback).not.toBeNull()
    expect(roObserve).toHaveBeenCalled()
    // Drive the observer with a non-zero content rect.
    roCallback?.([entry(640, 360)], new ControllableResizeObserver(() => {}))
    expect(engineMocks.resize).toHaveBeenCalledWith(640, 360)
  })

  it('ignores zero-size resize entries (guards divide-by-zero / degenerate)', () => {
    render(<CanvasRegion />)
    roCallback?.([entry(0, 0)], new ControllableResizeObserver(() => {}))
    expect(engineMocks.resize).not.toHaveBeenCalled()
  })

  it('calls engine.dispose on unmount (soft teardown)', () => {
    const { unmount } = render(<CanvasRegion />)
    unmount()
    expect(engineMocks.dispose).toHaveBeenCalledOnce()
    // Soft teardown must NOT call hard destroy on the shared singleton.
    expect(engineMocks.destroy).not.toHaveBeenCalled()
  })

  it('re-attaches the engine after a soft-teardown remount (singleton reuse)', () => {
    const { unmount } = render(<CanvasRegion />)
    unmount()
    expect(engineMocks.dispose).toHaveBeenCalledOnce()
    // A fresh mount must be able to re-attach (dispose did not kill the
    // singleton).
    render(<CanvasRegion />)
    expect(engineMocks.attachCanvases).toHaveBeenCalledTimes(2)
  })

  it('disconnects the ResizeObserver on unmount', () => {
    const { unmount } = render(<CanvasRegion />)
    unmount()
    expect(roDisconnect).toHaveBeenCalled()
  })
})

describe('M09 React Canvas Host — no-global-lookup', () => {
  it('does not call document.getElementById for any canvas surface', () => {
    const spy = vi.spyOn(document, 'getElementById')
    render(<CanvasRegion />)
    const ids = spy.mock.calls.map((c) => c[0])
    expect(ids).not.toContain('main-canvas')
    expect(ids).not.toContain('select-canvas')
    expect(ids).not.toContain('outline-overlay')
    spy.mockRestore()
  })

  it('transport still renders (M07 parity preserved under M09 host)', () => {
    installLegacyTransport()
    useLayerStore.getState().addLayer(makeLayer(1))
    const { getByLabelText } = render(<CanvasRegion />)
    const play = getByLabelText('Play') as HTMLButtonElement
    expect(play.disabled).toBe(false)
  })
})
