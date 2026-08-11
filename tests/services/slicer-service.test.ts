/**
 * M12 slicer-service tests — session + confirm/cancel/wiring.
 *
 * Verifies the service drives the slicer tool with legacy parity:
 *   - activate: no-op if no layer/while playing; resets accumulators;
 *     defaults to grid mode; enters slicer mode (legacy 9738-9749).
 *   - setMode: switches the mode (other mode's data persists) (legacy 9756).
 *   - setGrid: updates the grid slider values (legacy 9931).
 *   - rect drag: pointerDown/move/up commits a rect gated by `> 10`
 *     (legacy 10006-10017); the live drag updates only the session (NOT
 *     project state).
 *   - freehand draw: pointerDown/move/up commits a path gated by `> 4` + bbox
 *     `> 10` (legacy 10018-10042).
 *   - remove/clear/reorder: mutate only the session accumulators.
 *   - cancel: exit slicer mode, no project mutation, no undo (legacy 9751).
 *   - confirm: push undo; build the new layers (inherit parent animation +
 *     resizePct=100, animOrder=null, visible=true); splice in at the
 *     original's index + remove the original + select newLayers[0]; delegate
 *     the rasterize to legacy applySlices (legacy 10121-10261).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { slicerService } from '@/app/services/slicer-service'
import { useLayerStore, useSelectionStore, usePlaybackStore, useCanvasStore } from '@/app/store'
import { makeLayer } from './helpers/layers'
import type { LayerId } from '@/types/brand'
import type { ImageLayer } from '@/types/layer'

function installLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  w.applySlices = vi.fn()
  w.closeSlicerModal = vi.fn()
  w.scheduleAutoSave = vi.fn()
}

function clearLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  delete w.applySlices
  delete w.closeSlicerModal
  delete w.scheduleAutoSave
}

beforeEach(() => {
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

describe('M12 slicerService.activate (legacy 9738-9749)', () => {
  it('enters slicer mode and defaults to grid 2x2', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    expect(slicerService.activate()).toBe(true)
    expect(useSelectionStore.getState().editorMode).toBe('slicer')
    expect(slicerService.isActive()).toBe(true)
    expect(slicerService.getMode()).toBe('grid')
    expect(slicerService.getGrid()).toEqual({ cols: 2, rows: 2 })
  })

  it('resets the rect + freehand accumulators on activate', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    slicerService.activate()
    expect(slicerService.getRects()).toEqual([])
    expect(slicerService.getFreehandPaths()).toEqual([])
  })

  it('is a no-op if no layer is selected', () => {
    useLayerStore.getState().setLayers([makeLayer(1)])
    expect(slicerService.activate()).toBe(false)
    expect(slicerService.isActive()).toBe(false)
  })

  it('is a no-op while playing', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    usePlaybackStore.getState().setStatus('playing')
    expect(slicerService.activate()).toBe(false)
    expect(slicerService.isActive()).toBe(false)
  })
})

describe('M12 slicerService.setMode / setGrid (legacy 9756, 9931)', () => {
  it('switches the mode (other mode data persists)', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    slicerService.activate()
    // Draw a rect first (switch to rect mode, draw, then switch away).
    slicerService.setMode('rect')
    slicerService.pointerDown(100, 100)
    slicerService.pointerMove(200, 150, 100, 50, 1, 100, 100)
    slicerService.pointerUp(300, 200)
    expect(slicerService.getRects()).toHaveLength(1)
    // Switch to freehand — rects persist.
    slicerService.setMode('freehand')
    expect(slicerService.getMode()).toBe('freehand')
    expect(slicerService.getRects()).toHaveLength(1)
  })

  it('updates the grid slider values', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    slicerService.activate()
    slicerService.setGrid(3, 4)
    expect(slicerService.getGrid()).toEqual({ cols: 3, rows: 4 })
  })
})

describe('M12 slicerService rect drag — temporary tool state (legacy 10006-10017)', () => {
  it('move updates the live drag rect (preview-pixel space), not the layer store', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    slicerService.activate()
    slicerService.setMode('rect')
    const layerBefore = useLayerStore.getState().layers[0]?.transform
    slicerService.pointerDown(100, 100)
    slicerService.pointerMove(200, 150, 100, 50, 1, 100, 100)
    // Live drag rect is in preview-pixel space: sxPx = (100-100)*1 = 0;
    // x = min(100, 0) = 0; w = abs(100-0) = 100.
    expect(slicerService.getRectDrag()?.cur).toEqual({ x: 0, y: 0, w: 100, h: 50 })
    // layer store is NOT mutated during the drag.
    expect(useLayerStore.getState().layers[0]?.transform).toEqual(layerBefore)
  })

  it('pointerUp commits a canvas-space rect gated by > 10', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    slicerService.activate()
    slicerService.setMode('rect')
    slicerService.pointerDown(100, 100)
    slicerService.pointerMove(200, 150, 100, 50, 1, 100, 100)
    const result = slicerService.pointerUp(300, 250)
    expect(result).toBe('committed')
    expect(slicerService.getRects()).toHaveLength(1)
    expect(slicerService.getRects()?.[0]).toEqual({
      x: 100,
      y: 100,
      w: 200,
      h: 150,
      label: 'Slice 1',
    })
  })

  it('rejects a rect with w <= 10 (too-small)', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    slicerService.activate()
    slicerService.setMode('rect')
    slicerService.pointerDown(100, 100)
    slicerService.pointerMove(105, 200, 5, 100, 1, 100, 100)
    const result = slicerService.pointerUp(110, 250)
    expect(result).toBe('too-small')
    expect(slicerService.getRects()).toHaveLength(0)
  })

  it('clears the drag on pointerUp (no commit when no drag)', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    slicerService.activate()
    slicerService.setMode('rect')
    expect(slicerService.pointerUp(100, 100)).toBeNull()
  })
})

describe('M12 slicerService freehand draw — temporary tool state (legacy 10018-10042)', () => {
  it('commits a path with bbox when > 4 points + bbox > 10', () => {
    placeSelectedLayer(1, 0, 0, 640, 720)
    slicerService.activate()
    slicerService.setMode('freehand')
    slicerService.pointerDown(0, 0)
    slicerService.pointerMove(100, 0, 0, 0, 1, 0, 0)
    slicerService.pointerMove(100, 100, 0, 0, 1, 0, 0)
    slicerService.pointerMove(0, 100, 0, 0, 1, 0, 0)
    slicerService.pointerMove(0, 0, 0, 0, 1, 0, 0)
    const result = slicerService.pointerUp(50, 50)
    expect(result).toBe('committed')
    expect(slicerService.getFreehandPaths()).toHaveLength(1)
    const path = slicerService.getFreehandPaths()?.[0]
    expect(path?.bounds).toEqual({ x: 0, y: 0, w: 100, h: 100 })
    expect(path?.label).toBe('Region 1')
  })

  it('rejects a path with <= 4 points', () => {
    placeSelectedLayer(1, 0, 0, 640, 720)
    slicerService.activate()
    slicerService.setMode('freehand')
    slicerService.pointerDown(0, 0)
    slicerService.pointerMove(100, 0, 0, 0, 1, 0, 0)
    slicerService.pointerMove(100, 100, 0, 0, 1, 0, 0)
    slicerService.pointerMove(0, 100, 0, 0, 1, 0, 0)
    const result = slicerService.pointerUp(0, 100)
    expect(result).toBe('too-small')
    expect(slicerService.getFreehandPaths()).toHaveLength(0)
  })

  it('clears the freehand draw on pointerUp', () => {
    placeSelectedLayer(1, 0, 0, 640, 720)
    slicerService.activate()
    slicerService.setMode('freehand')
    expect(slicerService.pointerUp(0, 0)).toBeNull()
    expect(slicerService.isFreehandDrawing()).toBe(false)
  })
})

describe('M12 slicerService remove/clear/reorder (legacy 10106-10119, 10073-10104)', () => {
  it('removes a rect by index', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    slicerService.activate()
    slicerService.setMode('rect')
    slicerService.pointerDown(100, 100)
    slicerService.pointerUp(300, 250)
    slicerService.pointerDown(100, 100)
    slicerService.pointerUp(200, 200)
    expect(slicerService.getRects()).toHaveLength(2)
    slicerService.removeRect(0)
    expect(slicerService.getRects()).toHaveLength(1)
    expect(slicerService.getRects()?.[0]?.label).toBe('Slice 2')
  })

  it('clears all rects', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    slicerService.activate()
    slicerService.setMode('rect')
    slicerService.pointerDown(100, 100)
    slicerService.pointerUp(300, 250)
    slicerService.clearRects()
    expect(slicerService.getRects()).toEqual([])
  })

  it('reorders rects (drag-drop move)', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    slicerService.activate()
    slicerService.setMode('rect')
    slicerService.pointerDown(100, 100)
    slicerService.pointerUp(300, 250) // Slice 1
    slicerService.pointerDown(100, 100)
    slicerService.pointerUp(200, 200) // Slice 2
    slicerService.reorderRects(0, 1)
    expect(slicerService.getRects()?.[0]?.label).toBe('Slice 2')
    expect(slicerService.getRects()?.[1]?.label).toBe('Slice 1')
  })

  it('reorders freehand paths', () => {
    placeSelectedLayer(1, 0, 0, 640, 720)
    slicerService.activate()
    slicerService.setMode('freehand')
    // Path 1
    slicerService.pointerDown(0, 0)
    slicerService.pointerMove(100, 0, 0, 0, 1, 0, 0)
    slicerService.pointerMove(100, 100, 0, 0, 1, 0, 0)
    slicerService.pointerMove(0, 100, 0, 0, 1, 0, 0)
    slicerService.pointerMove(0, 0, 0, 0, 1, 0, 0)
    slicerService.pointerUp(50, 50)
    // Path 2
    slicerService.pointerDown(200, 0)
    slicerService.pointerMove(300, 0, 0, 0, 1, 0, 0)
    slicerService.pointerMove(300, 100, 0, 0, 1, 0, 0)
    slicerService.pointerMove(200, 100, 0, 0, 1, 0, 0)
    slicerService.pointerMove(200, 0, 0, 0, 1, 0, 0)
    slicerService.pointerUp(250, 50)
    expect(slicerService.getFreehandPaths()).toHaveLength(2)
    slicerService.reorderFreehand(0, 1)
    expect(slicerService.getFreehandPaths()?.[0]?.label).toBe('Region 2')
    expect(slicerService.getFreehandPaths()?.[1]?.label).toBe('Region 1')
  })
})

describe('M12 slicerService.cancel (legacy 9751)', () => {
  it('exits slicer mode with no project mutation', () => {
    placeSelectedLayer(1, 100, 100, 200, 100)
    slicerService.activate()
    slicerService.setMode('rect')
    slicerService.pointerDown(100, 100)
    slicerService.pointerUp(300, 250)
    const layerBefore = useLayerStore.getState().layers[0]?.transform
    const undoBefore = useLayerStore.getState().undoStack.length
    slicerService.cancel()
    expect(slicerService.isActive()).toBe(false)
    expect(useSelectionStore.getState().editorMode).toBe('image')
    // no project mutation, no undo snapshot.
    expect(useLayerStore.getState().layers[0]?.transform).toEqual(layerBefore)
    expect(useLayerStore.getState().undoStack.length).toBe(undoBefore)
  })

  it('delegates to legacy closeSlicerModal', () => {
    const w = window as unknown as { closeSlicerModal: { mock: { calls: unknown[][] } } }
    placeSelectedLayer(1, 100, 100, 200, 100)
    slicerService.activate()
    slicerService.cancel()
    expect(w.closeSlicerModal.mock.calls.length).toBe(1)
  })
})

describe('M12 slicerService.confirm (legacy 10121-10261)', () => {
  it('grid: replaces the original with N new layers + selects newLayers[0]', () => {
    placeSelectedLayer(1, 0, 0, 1280, 720)
    slicerService.activate()
    slicerService.setGrid(2, 2)
    expect(slicerService.confirm()).toBe(true)
    const layers = useLayerStore.getState().layers
    // Original removed, 4 new layers.
    expect(layers).toHaveLength(4)
    expect(layers.find((l) => l.id === ('layer-1' as LayerId))).toBeUndefined()
    // Row-major positions.
    expect(layers[0]?.transform).toEqual({ x: 0, y: 0, width: 640, height: 360, rotation: 0 })
    expect(layers[1]?.transform).toEqual({ x: 640, y: 0, width: 640, height: 360, rotation: 0 })
    expect(layers[2]?.transform).toEqual({ x: 0, y: 360, width: 640, height: 360, rotation: 0 })
    expect(layers[3]?.transform).toEqual({ x: 640, y: 360, width: 640, height: 360, rotation: 0 })
    // Selects newLayers[0].
    expect(useSelectionStore.getState().selectedLayerId).toBe(layers[0]?.id)
  })

  it('new layers inherit the parent animation + resizePct=100 + animOrder=null', () => {
    const layer = makeLayer(1) as ImageLayer
    useLayerStore.getState().setLayers([
      {
        ...layer,
        transform: { x: 0, y: 0, width: 200, height: 100, rotation: 0 },
        animation: {
          ...layer.animation,
          animationStyle: 'scanner',
          speed: 60,
          handSpeed: 8,
        },
      },
    ])
    useSelectionStore.getState().selectLayer(layer.id)
    slicerService.activate()
    slicerService.setGrid(2, 1)
    slicerService.confirm()
    const newLayer = useLayerStore.getState().layers[0] as ImageLayer
    expect(newLayer.animation.animationStyle).toBe('scanner')
    expect(newLayer.animation.speed).toBe(60)
    expect(newLayer.animation.handSpeed).toBe(8)
    expect(newLayer.resizePct).toBe(100)
    expect(newLayer.animationOrder).toBeNull()
    expect(newLayer.visible).toBe(true)
  })

  it('new layer names use the grid label format `${name} ${idx+1}`', () => {
    placeSelectedLayer(1, 0, 0, 200, 100)
    slicerService.activate()
    slicerService.setGrid(2, 1)
    slicerService.confirm()
    const layers = useLayerStore.getState().layers
    expect(layers[0]?.name).toBe('Layer 1 1')
    expect(layers[1]?.name).toBe('Layer 1 2')
  })

  it('rect: replaces the original with the committed rects', () => {
    placeSelectedLayer(1, 0, 0, 1280, 720)
    slicerService.activate()
    slicerService.setMode('rect')
    slicerService.pointerDown(0, 0)
    slicerService.pointerUp(760, 720)
    slicerService.pointerDown(760, 0)
    slicerService.pointerUp(1280, 720)
    slicerService.confirm()
    const layers = useLayerStore.getState().layers
    expect(layers).toHaveLength(2)
    expect(layers[0]?.transform).toEqual({ x: 0, y: 0, width: 760, height: 720, rotation: 0 })
    expect(layers[1]?.transform).toEqual({ x: 760, y: 0, width: 520, height: 720, rotation: 0 })
  })

  it('pushes an undo snapshot', () => {
    placeSelectedLayer(1, 0, 0, 200, 100)
    slicerService.activate()
    const before = useLayerStore.getState().undoStack.length
    slicerService.confirm()
    expect(useLayerStore.getState().undoStack.length).toBe(before + 1)
  })

  it('delegates the rasterize to legacy applySlices when present', () => {
    const w = window as unknown as { applySlices: { mock: { calls: unknown[][] } } }
    placeSelectedLayer(1, 0, 0, 200, 100)
    slicerService.activate()
    slicerService.confirm()
    expect(w.applySlices.mock.calls.length).toBe(1)
  })

  it('exits slicer mode after confirm', () => {
    placeSelectedLayer(1, 0, 0, 200, 100)
    slicerService.activate()
    slicerService.confirm()
    expect(slicerService.isActive()).toBe(false)
    expect(useSelectionStore.getState().editorMode).toBe('image')
  })

  it('is a no-op when there is no session', () => {
    expect(slicerService.confirm()).toBe(false)
  })

  it('is a no-op when grid is 1x1 (no slices to build)', () => {
    placeSelectedLayer(1, 0, 0, 200, 100)
    slicerService.activate()
    slicerService.setGrid(1, 1)
    // canApply is false (1x1 < 2), but confirm should still no-op gracefully.
    expect(slicerService.confirm()).toBe(false)
  })
})

describe('M12 slicerService.canApply / footerText (legacy 9938-9956)', () => {
  it('grid 2x2 can apply', () => {
    placeSelectedLayer(1, 0, 0, 200, 100)
    slicerService.activate()
    expect(slicerService.canApply()).toBe(true)
    expect(slicerService.footerText()).toBe('Will create 4 layers from this image.')
  })

  it('grid 1x1 cannot apply', () => {
    placeSelectedLayer(1, 0, 0, 200, 100)
    slicerService.activate()
    slicerService.setGrid(1, 1)
    expect(slicerService.canApply()).toBe(false)
  })

  it('rect with 0 rects cannot apply', () => {
    placeSelectedLayer(1, 0, 0, 200, 100)
    slicerService.activate()
    slicerService.setMode('rect')
    expect(slicerService.canApply()).toBe(false)
  })
})
