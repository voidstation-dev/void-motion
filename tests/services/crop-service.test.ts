/**
 * M11 crop-service tests — session + confirm/cancel/reset wiring.
 *
 * Verifies the service drives the crop tool with legacy parity:
 *   - activate: no-op if no layer/while playing; initializes the rect to the
 *     layer's clamped bounds; enters crop mode (legacy 9446-9480).
 *   - drag: move/resize update only the temporary session rect (NOT project
 *     state) (legacy 9675-9713).
 *   - reset: reset the rect to the layer bounds (legacy 9491-9502).
 *   - cancel: exit crop mode, no project mutation, no undo (legacy 9482).
 *   - confirm: push undo, stash the original source (first-crop only), apply
 *     the rect to the layer transform + resizePct=100, delegate the rasterize
 *     to legacy confirmCrop (legacy 9504-9556).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { cropService } from '@/app/services/crop-service'
import { useLayerStore, useSelectionStore, usePlaybackStore, useCanvasStore } from '@/app/store'
import { makeLayer } from './helpers/layers'
import type { LayerId } from '@/types/brand'
import type { ImageLayer } from '@/types/layer'

const BOUNDS = { width: 1280, height: 720 }

function installLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  w.confirmCrop = vi.fn()
  w.cancelCrop = vi.fn()
  w.scheduleAutoSave = vi.fn()
}

function clearLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  delete w.confirmCrop
  delete w.cancelCrop
  delete w.scheduleAutoSave
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
  cropService.session = null
  installLegacy()
})

afterEach(() => {
  clearLegacy()
  vi.restoreAllMocks()
})

/** Place a selected image layer with an explicit transform. */
function placeSelectedLayer(n: number, x: number, y: number, w = 200, h = 100): LayerId {
  const layer = makeLayer(n)
  const id = layer.id
  useLayerStore
    .getState()
    .setLayers([{ ...layer, transform: { x, y, width: w, height: h, rotation: 0 } }])
  useSelectionStore.getState().selectLayer(id)
  return id
}

describe('M11 cropService.activate (legacy 9446-9480)', () => {
  it('enters crop mode and initializes the rect to the layer bounds', () => {
    const id = placeSelectedLayer(1, 100, 100, 200, 100)
    expect(cropService.activate()).toBe(true)
    expect(useSelectionStore.getState().editorMode).toBe('crop')
    expect(cropService.isActive()).toBe(true)
    expect(cropService.getRect()).toEqual({ x: 100, y: 100, w: 200, h: 100 })
    expect(cropService.session?.layerId).toBe(id)
  })

  it('clamps the initial rect to the canvas', () => {
    placeSelectedLayer(1, -10, -10, 2000, 2000)
    expect(cropService.activate()).toBe(true)
    const r = cropService.getRect()
    expect(r?.x).toBe(0)
    expect(r?.y).toBe(0)
    expect(r?.w).toBe(BOUNDS.width)
    expect(r?.h).toBe(BOUNDS.height)
  })

  it('is a no-op if no layer is selected', () => {
    useLayerStore.getState().setLayers([makeLayer(1)])
    expect(cropService.activate()).toBe(false)
    expect(cropService.isActive()).toBe(false)
  })

  it('is a no-op while playing', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    usePlaybackStore.getState().setStatus('playing')
    expect(cropService.activate()).toBe(false)
    expect(cropService.isActive()).toBe(false)
  })
})

describe('M11 cropService drag — temporary tool state (legacy 9675-9713)', () => {
  it('move updates only the session rect, not the layer store', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    cropService.activate()
    const layerBefore = useLayerStore.getState().layers[0]?.transform
    cropService.pointerDown(150, 150) // inside the rect → move
    cropService.pointerMove(200, 180, false)
    // session rect moved by (50, 30) → (150, 130)
    expect(cropService.getRect()).toEqual({ x: 150, y: 130, w: 200, h: 100 })
    // layer store is NOT mutated during the drag.
    expect(useLayerStore.getState().layers[0]?.transform).toEqual(layerBefore)
  })

  it('resize updates the session rect with the 20px minimum', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    cropService.activate()
    cropService.pointerDown(300, 200) // se handle
    cropService.pointerMove(50, 50, false) // drag past the anchor
    const r = cropService.getRect()
    expect(r?.w).toBe(20)
    expect(r?.h).toBe(20)
  })

  it('pointerUp clears the dragging flag (does NOT commit)', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    cropService.activate()
    cropService.pointerDown(150, 150)
    cropService.pointerMove(200, 180, false)
    cropService.pointerUp()
    expect(cropService.session?.dragging).toBe(false)
    // session is still active (not committed).
    expect(cropService.isActive()).toBe(true)
  })
})

describe('M11 cropService.reset (legacy 9491-9502)', () => {
  it('resets the rect to the layer bounds', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    cropService.activate()
    cropService.pointerDown(150, 150)
    cropService.pointerMove(200, 180, false)
    cropService.pointerUp()
    cropService.reset()
    expect(cropService.getRect()).toEqual({ x: 100, y: 100, w: 200, h: 100 })
  })
})

describe('M11 cropService.cancel (legacy 9482)', () => {
  it('exits crop mode with no project mutation', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    cropService.activate()
    cropService.pointerDown(150, 150)
    cropService.pointerMove(200, 180, false)
    const layerBefore = useLayerStore.getState().layers[0]?.transform
    const undoBefore = useLayerStore.getState().undoStack.length
    cropService.cancel()
    expect(cropService.isActive()).toBe(false)
    expect(useSelectionStore.getState().editorMode).toBe('image')
    // no project mutation, no undo snapshot.
    expect(useLayerStore.getState().layers[0]?.transform).toEqual(layerBefore)
    expect(useLayerStore.getState().undoStack.length).toBe(undoBefore)
  })

  it('delegates to legacy cancelCrop', () => {
    const w = window as unknown as { cancelCrop: { mock: { calls: unknown[][] } } }
    placeSelectedLayer(1, 100, 100, 200, 100)
    cropService.activate()
    cropService.cancel()
    expect(w.cancelCrop.mock.calls.length).toBe(1)
  })
})

describe('M11 cropService.confirm (legacy 9504-9556)', () => {
  it('applies the crop rect to the layer transform + resizePct=100', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    cropService.activate()
    cropService.pointerDown(150, 150) // move
    cropService.pointerMove(200, 180, false) // → rect (150, 130, 200, 100)
    cropService.confirm()
    const layer = useLayerStore.getState().layers[0]
    expect(layer?.transform).toEqual({ x: 150, y: 130, width: 200, height: 100, rotation: 0 })
    expect((layer as { resizePct?: number })?.resizePct).toBe(100)
  })

  it('pushes an undo snapshot', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    cropService.activate()
    const before = useLayerStore.getState().undoStack.length
    cropService.confirm()
    expect(useLayerStore.getState().undoStack.length).toBe(before + 1)
  })

  it('stashes the original source geometry (first-crop only)', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    cropService.activate()
    cropService.confirm()
    const layer = useLayerStore.getState().layers[0] as {
      sourceMetadata?: { cropSource?: { x: number; y: number; width: number; height: number } }
    }
    // The stash records the layer's pre-crop geometry (100,100,200,100).
    expect(layer.sourceMetadata?.cropSource).toEqual({ x: 100, y: 100, width: 200, height: 100 })
  })

  it('preserves the existing crop source on a subsequent crop (non-destructive)', () => {
    const layer = makeLayer(1) as ImageLayer
    const existing = { x: 0, y: 0, width: 400, height: 300 }
    useLayerStore.getState().setLayers([
      {
        ...layer,
        transform: { x: 100, y: 100, width: 200, height: 100, rotation: 0 },
        sourceMetadata: { ...layer.sourceMetadata, cropSource: existing },
      },
    ])
    useSelectionStore.getState().selectLayer(layer.id)
    cropService.activate()
    cropService.confirm()
    const updated = useLayerStore.getState().layers[0] as {
      sourceMetadata?: { cropSource?: { x: number; y: number; width: number; height: number } }
    }
    expect(updated.sourceMetadata?.cropSource).toBe(existing)
  })

  it('delegates the rasterize to legacy confirmCrop when present', () => {
    const w = window as unknown as { confirmCrop: { mock: { calls: unknown[][] } } }
    placeSelectedLayer(1, 100, 100, 200, 100)
    cropService.activate()
    cropService.confirm()
    expect(w.confirmCrop.mock.calls.length).toBe(1)
  })

  it('exits crop mode after confirm', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    cropService.activate()
    cropService.confirm()
    expect(cropService.isActive()).toBe(false)
    expect(useSelectionStore.getState().editorMode).toBe('image')
  })

  it('is a no-op when there is no session', () => {
    expect(cropService.confirm()).toBe(false)
  })
})
