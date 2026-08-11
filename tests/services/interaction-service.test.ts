/**
 * M10 interaction-service tests — selection + transform wiring.
 *
 * Verifies the service drives selection + drag + resize through the typed
 * stores + legacy adapter with legacy parity:
 *   - handle-hit starts a resize; body-hit starts a move; hit on another
 *     layer only selects; empty space deselects (legacy 6693-6728).
 *   - move recomputes absolute-from-orig (legacy 6745).
 *   - resize applies per-handle math + 20px min + Shift aspect lock
 *     (legacy 6747-6762).
 *   - mouseup pushes an undo snapshot ONLY when geometry changed (legacy 6791).
 *   - all pointer paths are no-op while playing (legacy 6694).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { interactionService } from '@/app/services/interaction-service'
import { useLayerStore, useSelectionStore, usePlaybackStore } from '@/app/store'
import { makeLayer } from './helpers/layers'
import type { LayerId } from '@/types/brand'

/** A 640-wide display rect at origin (matches the toCanvasCoords scale math). */
const RECT = { width: 640, left: 0, top: 0 }
/** Logical canvas width = 1280 → scale = 2 (display 640). */
const CANVAS_W = 1280

/** Client coords → canvas coords helper (scale 2 for the test rect). */
function at(canvasX: number, canvasY: number): { clientX: number; clientY: number } {
  return { clientX: canvasX / 2, clientY: canvasY / 2 }
}

function installLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  w.selectLayer = vi.fn()
  w.setLayerPos = vi.fn()
  w.setLayerResize = vi.fn()
  w.scheduleAutoSave = vi.fn()
}

function clearLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  delete w.selectLayer
  delete w.setLayerPos
  delete w.setLayerResize
  delete w.scheduleAutoSave
}

beforeEach(() => {
  useLayerStore.getState().clear()
  useSelectionStore.getState().clear()
  usePlaybackStore.getState().reset()
  interactionService.cancel()
  installLegacy()
})

afterEach(() => {
  clearLegacy()
  vi.restoreAllMocks()
})

/** Place a layer with an explicit transform (the default makeLayer is 0,0,100,100). */
function placeLayer(n: number, x: number, y: number, w = 200, h = 100): LayerId {
  const layer = makeLayer(n)
  useLayerStore
    .getState()
    .setLayers([{ ...layer, transform: { x, y, width: w, height: h, rotation: 0 } }])
  return layer.id
}

describe('M10 interactionService.pointerDown — selection', () => {
  it('clicking a layer selects it (legacy 6725)', () => {
    const id = placeLayer(1, 100, 100, 200, 100)
    const r = interactionService.pointerDown(
      at(150, 150).clientX,
      at(150, 150).clientY,
      RECT,
      CANVAS_W,
    )
    expect(r.type).toBe('select')
    expect(useSelectionStore.getState().selectedLayerId).toBe(id)
  })

  it('clicking empty space deselects (legacy 6727)', () => {
    useSelectionStore.getState().selectLayer('layer-1' as LayerId)
    placeLayer(1, 100, 100, 200, 100)
    const r = interactionService.pointerDown(
      at(500, 500).clientX,
      at(500, 500).clientY,
      RECT,
      CANVAS_W,
    )
    expect(r.type).toBe('deselect')
    expect(useSelectionStore.getState().selectedLayerId).toBeNull()
  })

  it('hit-tests topmost layer first (legacy 6681)', () => {
    placeLayer(1, 0, 0, 200, 200)
    const id2 = placeLayer(2, 0, 0, 200, 200)
    interactionService.pointerDown(at(50, 50).clientX, at(50, 50).clientY, RECT, CANVAS_W)
    expect(useSelectionStore.getState().selectedLayerId).toBe(id2)
  })

  it('is blocked while playing (legacy 6694)', () => {
    usePlaybackStore.getState().setStatus('playing')
    placeLayer(1, 100, 100, 200, 100)
    const r = interactionService.pointerDown(
      at(150, 150).clientX,
      at(150, 150).clientY,
      RECT,
      CANVAS_W,
    )
    expect(r.type).toBe('blocked')
    expect(useSelectionStore.getState().selectedLayerId).toBeNull()
  })
})

describe('M10 interactionService.pointerDown — session start', () => {
  it('handle-hit on the selected layer starts a resize (legacy 6714)', () => {
    const id = placeLayer(1, 100, 100, 200, 100)
    useSelectionStore.getState().selectLayer(id)
    // se handle is at (300, 200).
    const r = interactionService.pointerDown(
      at(300, 200).clientX,
      at(300, 200).clientY,
      RECT,
      CANVAS_W,
    )
    expect(r.type).toBe('resize')
    expect(interactionService.isInteracting()).toBe(true)
  })

  it('body-hit on the selected layer starts a move (legacy 6719)', () => {
    const id = placeLayer(1, 100, 100, 200, 100)
    useSelectionStore.getState().selectLayer(id)
    const r = interactionService.pointerDown(
      at(150, 150).clientX,
      at(150, 150).clientY,
      RECT,
      CANVAS_W,
    )
    expect(r.type).toBe('move')
    expect(interactionService.isInteracting()).toBe(true)
  })

  it('clicking an unselected layer only selects — no move starts (legacy parity)', () => {
    placeLayer(1, 100, 100, 200, 100)
    const r = interactionService.pointerDown(
      at(150, 150).clientX,
      at(150, 150).clientY,
      RECT,
      CANVAS_W,
    )
    expect(r.type).toBe('select')
    expect(interactionService.isInteracting()).toBe(false)
  })

  it('handle-hit takes precedence over body-hit (legacy 6712-6718)', () => {
    const id = placeLayer(1, 100, 100, 200, 100)
    useSelectionStore.getState().selectLayer(id)
    // se handle (300,200) is also inside the layer body — should be a resize.
    const r = interactionService.pointerDown(
      at(300, 200).clientX,
      at(300, 200).clientY,
      RECT,
      CANVAS_W,
    )
    expect(r.type).toBe('resize')
  })
})

describe('M10 interactionService.pointerMove — drag', () => {
  it('move session recomputes absolute-from-orig (legacy 6745)', () => {
    const id = placeLayer(1, 100, 100, 200, 100)
    useSelectionStore.getState().selectLayer(id)
    interactionService.pointerDown(at(150, 150).clientX, at(150, 150).clientY, RECT, CANVAS_W)
    // pointer to (170, 160) → dx=20, dy=10 → x=120, y=110.
    interactionService.pointerMove(
      at(170, 160).clientX,
      at(170, 160).clientY,
      RECT,
      CANVAS_W,
      false,
    )
    const layer = useLayerStore.getState().layers[0]
    expect(layer?.transform.x).toBe(120)
    expect(layer?.transform.y).toBe(110)
  })

  it('resize se grows w/h, anchors nw (legacy 6747-6755)', () => {
    const id = placeLayer(1, 100, 100, 200, 100)
    useSelectionStore.getState().selectLayer(id)
    interactionService.pointerDown(at(300, 200).clientX, at(300, 200).clientY, RECT, CANVAS_W)
    // drag to (350, 225) → dx=50, dy=25 → w=250, h=125, x/y fixed.
    interactionService.pointerMove(
      at(350, 225).clientX,
      at(350, 225).clientY,
      RECT,
      CANVAS_W,
      false,
    )
    const layer = useLayerStore.getState().layers[0]
    expect(layer?.transform.width).toBe(250)
    expect(layer?.transform.height).toBe(125)
    expect(layer?.transform.x).toBe(100)
    expect(layer?.transform.y).toBe(100)
  })

  it('resize clamps to 20px minimum (legacy 6752-6755)', () => {
    const id = placeLayer(1, 100, 100, 200, 100)
    useSelectionStore.getState().selectLayer(id)
    interactionService.pointerDown(at(300, 200).clientX, at(300, 200).clientY, RECT, CANVAS_W)
    // drag far past the anchor: dx=-300 → w=max(20, -100)=20.
    interactionService.pointerMove(at(0, 0).clientX, at(0, 0).clientY, RECT, CANVAS_W, false)
    const layer = useLayerStore.getState().layers[0]
    expect(layer?.transform.width).toBe(20)
    expect(layer?.transform.height).toBe(20)
  })

  it('Shift locks aspect ratio to the original (legacy 6757-6760)', () => {
    const id = placeLayer(1, 100, 100, 200, 100)
    useSelectionStore.getState().selectLayer(id)
    interactionService.pointerDown(at(300, 200).clientX, at(300, 200).clientY, RECT, CANVAS_W)
    // drag to (400, 200) → dx=100 → w=300; Shift → nh = 300/2 = 150.
    interactionService.pointerMove(at(400, 200).clientX, at(400, 200).clientY, RECT, CANVAS_W, true)
    const layer = useLayerStore.getState().layers[0]
    expect(layer?.transform.width).toBe(300)
    expect(layer?.transform.height).toBe(150)
  })

  it('delegates each property to legacy setLayerPos during a drag', () => {
    const w = window as unknown as { setLayerPos: { mock: { calls: unknown[][] } } }
    const id = placeLayer(1, 100, 100, 200, 100)
    useSelectionStore.getState().selectLayer(id)
    interactionService.pointerDown(at(150, 150).clientX, at(150, 150).clientY, RECT, CANVAS_W)
    interactionService.pointerMove(
      at(170, 160).clientX,
      at(170, 160).clientY,
      RECT,
      CANVAS_W,
      false,
    )
    // x, y, w, h all delegated.
    expect(w.setLayerPos.mock.calls.length).toBeGreaterThanOrEqual(4)
  })

  it('idle move returns cursor feedback (legacy 6734-6741)', () => {
    const id = placeLayer(1, 100, 100, 200, 100)
    useSelectionStore.getState().selectLayer(id)
    // over the body
    const r = interactionService.pointerMove(
      at(150, 150).clientX,
      at(150, 150).clientY,
      RECT,
      CANVAS_W,
      false,
    )
    expect(r.cursor).toBe('move')
    // over the se handle
    const r2 = interactionService.pointerMove(
      at(300, 200).clientX,
      at(300, 200).clientY,
      RECT,
      CANVAS_W,
      false,
    )
    expect(r2.cursor).toBe('nwse-resize')
    // over empty space
    const r3 = interactionService.pointerMove(
      at(500, 500).clientX,
      at(500, 500).clientY,
      RECT,
      CANVAS_W,
      false,
    )
    expect(r3.cursor).toBe('default')
  })
})

describe('M10 interactionService.pointerUp — undo + rebaseline', () => {
  it('pushes an undo snapshot when a move changed geometry (legacy 6791)', () => {
    const id = placeLayer(1, 100, 100, 200, 100)
    useSelectionStore.getState().selectLayer(id)
    const before = useLayerStore.getState().undoStack.length
    interactionService.pointerDown(at(150, 150).clientX, at(150, 150).clientY, RECT, CANVAS_W)
    interactionService.pointerMove(
      at(170, 160).clientX,
      at(170, 160).clientY,
      RECT,
      CANVAS_W,
      false,
    )
    interactionService.pointerUp()
    expect(useLayerStore.getState().undoStack.length).toBe(before + 1)
  })

  it('does NOT push a snapshot for a no-op click (legacy 6791)', () => {
    const id = placeLayer(1, 100, 100, 200, 100)
    useSelectionStore.getState().selectLayer(id)
    const before = useLayerStore.getState().undoStack.length
    interactionService.pointerDown(at(150, 150).clientX, at(150, 150).clientY, RECT, CANVAS_W)
    // no move
    interactionService.pointerUp()
    expect(useLayerStore.getState().undoStack.length).toBe(before)
  })

  it('resize-end rebaselines resizePct to 100 via legacy setLayerResize (legacy 6795)', () => {
    const w = window as unknown as { setLayerResize: { mock: { calls: unknown[][] } } }
    const id = placeLayer(1, 100, 100, 200, 100)
    useSelectionStore.getState().selectLayer(id)
    interactionService.pointerDown(at(300, 200).clientX, at(300, 200).clientY, RECT, CANVAS_W)
    interactionService.pointerMove(
      at(350, 225).clientX,
      at(350, 225).clientY,
      RECT,
      CANVAS_W,
      false,
    )
    interactionService.pointerUp()
    // setLayerResize called with pct=100 to rebaseline.
    const last = w.setLayerResize.mock.calls.at(-1)
    expect(last?.[1]).toBe(100)
  })

  it('move-end does NOT call setLayerResize (legacy 6800)', () => {
    const w = window as unknown as { setLayerResize: { mock: { calls: unknown[][] } } }
    const id = placeLayer(1, 100, 100, 200, 100)
    useSelectionStore.getState().selectLayer(id)
    interactionService.pointerDown(at(150, 150).clientX, at(150, 150).clientY, RECT, CANVAS_W)
    interactionService.pointerMove(
      at(170, 160).clientX,
      at(170, 160).clientY,
      RECT,
      CANVAS_W,
      false,
    )
    interactionService.pointerUp()
    expect(w.setLayerResize.mock.calls.length).toBe(0)
  })

  it('move-end reschedules autosave (legacy 6802)', () => {
    const w = window as unknown as { scheduleAutoSave: { mock: { calls: unknown[][] } } }
    const id = placeLayer(1, 100, 100, 200, 100)
    useSelectionStore.getState().selectLayer(id)
    interactionService.pointerDown(at(150, 150).clientX, at(150, 150).clientY, RECT, CANVAS_W)
    interactionService.pointerMove(
      at(170, 160).clientX,
      at(170, 160).clientY,
      RECT,
      CANVAS_W,
      false,
    )
    interactionService.pointerUp()
    expect(w.scheduleAutoSave.mock.calls.length).toBeGreaterThan(0)
  })

  it('nulls the session on pointerUp', () => {
    const id = placeLayer(1, 100, 100, 200, 100)
    useSelectionStore.getState().selectLayer(id)
    interactionService.pointerDown(at(150, 150).clientX, at(150, 150).clientY, RECT, CANVAS_W)
    interactionService.pointerUp()
    expect(interactionService.isInteracting()).toBe(false)
  })
})
