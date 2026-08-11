/**
 * M08 layer-service contract tests.
 *
 * Verifies the layer service delegates select/remove/visibility/order/
 * opacity/resize/position/rename/switchTab to the legacy runtime through
 * guarded `window.*` calls and mirrors the result into the typed layer +
 * selection stores; and that `syncLayersFromLegacy` reconciles the typed
 * projection from `window.state.layers`.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { layerService } from '@/app/services/layer-service'
import { useLayerStore, useSelectionStore } from '@/app/store'
import { makeLayer } from './helpers/layers'
import type { LayerId } from '@/types/brand'

const id = (n: number): LayerId => `layer-${n}` as LayerId

function installLegacyLayer(): void {
  const w = window as unknown as Record<string, unknown>
  w.selectLayer = vi.fn()
  w.removeLayer = vi.fn()
  w.toggleLayerVisibility = vi.fn()
  w.setLayerOrder = vi.fn()
  w.setLayerOpacity = vi.fn()
  w.setLayerResize = vi.fn()
  w.setLayerPos = vi.fn()
  w.switchTab = vi.fn()
  w.scheduleAutoSave = vi.fn()
}

function clearLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  delete w.selectLayer
  delete w.removeLayer
  delete w.toggleLayerVisibility
  delete w.setLayerOrder
  delete w.setLayerOpacity
  delete w.setLayerResize
  delete w.setLayerPos
  delete w.switchTab
  delete w.scheduleAutoSave
  delete w.state
}

beforeEach(() => {
  useLayerStore.getState().clear()
  useSelectionStore.getState().clear()
  clearLegacy()
})

afterEach(() => {
  clearLegacy()
  vi.restoreAllMocks()
})

describe('M08 layerService — delegation', () => {
  it('selectLayer delegates to window.selectLayer and mirrors selection', () => {
    installLegacyLayer()
    useLayerStore.getState().addLayer(makeLayer(1))
    layerService.selectLayer(id(1))
    expect(window.selectLayer).toHaveBeenCalledWith(1)
    expect(useSelectionStore.getState().selectedLayerId).toBe(id(1))
  })

  it('selectLayer(null) clears the selection store only', () => {
    installLegacyLayer()
    useLayerStore.getState().addLayer(makeLayer(1))
    useSelectionStore.getState().selectLayer(id(1))
    layerService.selectLayer(null)
    expect(useSelectionStore.getState().selectedLayerId).toBeNull()
    expect(window.selectLayer).not.toHaveBeenCalled()
  })

  it('removeLayer delegates to window.removeLayer', () => {
    installLegacyLayer()
    useLayerStore.getState().addLayer(makeLayer(1))
    layerService.removeLayer(id(1))
    expect(window.removeLayer).toHaveBeenCalledWith(1)
  })

  it('removeLayer falls back to the store when legacy not booted', () => {
    useLayerStore.getState().addLayer(makeLayer(1))
    layerService.removeLayer(id(1))
    expect(useLayerStore.getState().layers.length).toBe(0)
  })

  it('toggleVisibility delegates to window.toggleLayerVisibility', () => {
    installLegacyLayer()
    useLayerStore.getState().addLayer(makeLayer(1))
    layerService.toggleVisibility(id(1))
    expect(window.toggleLayerVisibility).toHaveBeenCalledWith(1)
  })

  it('toggleVisibility flips the store when legacy not booted', () => {
    useLayerStore.getState().addLayer(makeLayer(1))
    expect(useLayerStore.getState().layers[0]?.visible).toBe(true)
    layerService.toggleVisibility(id(1))
    expect(useLayerStore.getState().layers[0]?.visible).toBe(false)
  })

  it('setOrder maps empty string → null and delegates the raw value', () => {
    installLegacyLayer()
    useLayerStore.getState().addLayer(makeLayer(1))
    layerService.setOrder(id(1), '')
    expect(window.setLayerOrder).toHaveBeenCalledWith(1, '')
    expect(useLayerStore.getState().layers[0]?.animationOrder).toBeNull()
  })

  it('setOrder maps a number to max(1, n) and mirrors into the store', () => {
    installLegacyLayer()
    useLayerStore.getState().addLayer(makeLayer(1))
    layerService.setOrder(id(1), '3')
    expect(useLayerStore.getState().layers[0]?.animationOrder).toBe(3)
    layerService.setOrder(id(1), '0')
    expect(useLayerStore.getState().layers[0]?.animationOrder).toBe(1)
  })

  it('setOpacity clamps to [0,1] and delegates', () => {
    installLegacyLayer()
    useLayerStore.getState().addLayer(makeLayer(1))
    layerService.setOpacity(id(1), 1.5)
    expect(window.setLayerOpacity).toHaveBeenCalledWith(1, 1)
    expect(useLayerStore.getState().layers[0]?.opacity).toBe(1)
    layerService.setOpacity(id(1), -0.2)
    expect(useLayerStore.getState().layers[0]?.opacity).toBe(0)
  })

  it('setResize clamps to [10,300] and delegates', () => {
    installLegacyLayer()
    useLayerStore.getState().addLayer(makeLayer(1))
    layerService.setResize(id(1), 500)
    expect(window.setLayerResize).toHaveBeenCalledWith(1, 300)
    layerService.setResize(id(1), 5)
    expect(window.setLayerResize).toHaveBeenCalledWith(1, 10)
  })

  it('setPosition clamps w/h to >=20 and mirrors the transform', () => {
    useLayerStore.getState().addLayer(makeLayer(1))
    layerService.setPosition(id(1), 'w', 5)
    expect(useLayerStore.getState().layers[0]?.transform.width).toBe(20)
    layerService.setPosition(id(1), 'x', 42)
    expect(useLayerStore.getState().layers[0]?.transform.x).toBe(42)
  })

  it('renameLayer trims + discards empty + schedules autosave', () => {
    installLegacyLayer()
    useLayerStore.getState().addLayer(makeLayer(1))
    layerService.renameLayer(id(1), '  My Layer  ')
    expect(useLayerStore.getState().layers[0]?.name).toBe('My Layer')
    expect(window.scheduleAutoSave).toHaveBeenCalled()
  })

  it('renameLayer discards an empty name', () => {
    installLegacyLayer()
    useLayerStore.getState().addLayer(makeLayer(1))
    const before = useLayerStore.getState().layers[0]?.name
    layerService.renameLayer(id(1), '   ')
    expect(useLayerStore.getState().layers[0]?.name).toBe(before)
  })

  it('switchTab delegates to window.switchTab and mirrors editorMode', () => {
    installLegacyLayer()
    layerService.switchTab('text')
    expect(window.switchTab).toHaveBeenCalledWith('text')
    expect(useSelectionStore.getState().editorMode).toBe('text')
  })
})

describe('M08 layerService — syncLayersFromLegacy', () => {
  it('reconciles the typed list from window.state.layers', () => {
    installLegacyLayer()
    const w = window as unknown as Record<string, unknown>
    w.state = {
      layers: [
        {
          id: 10,
          name: 'Photo',
          visible: true,
          opacity: 0.5,
          x: 5,
          y: 6,
          w: 100,
          h: 200,
          animOrder: 2,
          resizePct: 120,
          hasPngAlpha: true,
        },
      ],
      selectedLayerId: 10,
    }
    layerService.syncLayersFromLegacy()
    const layers = useLayerStore.getState().layers
    expect(layers.length).toBe(1)
    expect(layers[0]?.id).toBe(id(10))
    expect(layers[0]?.name).toBe('Photo')
    expect(layers[0]?.opacity).toBe(0.5)
    expect(layers[0]?.animationOrder).toBe(2)
    expect(layers[0]?.transform.width).toBe(100)
    expect((layers[0] as { resizePct: number }).resizePct).toBe(120)
    expect(useSelectionStore.getState().selectedLayerId).toBe(id(10))
  })

  it('maps a text layer (kind === "text") into a TextLayer', () => {
    installLegacyLayer()
    const w = window as unknown as Record<string, unknown>
    w.state = {
      layers: [
        {
          id: 20,
          name: 'Title',
          kind: 'text',
          visible: true,
          opacity: 1,
          x: 0,
          y: 0,
          w: 50,
          h: 50,
          animOrder: null,
          _textContent: 'Hi',
          _textFont: 'DM Sans',
          _textSize: 72,
          _textAlign: 'center',
          _textColor: '#ff0000',
          _textLineHeight: 1.3,
          _textSpacing: 0,
        },
      ],
      selectedLayerId: null,
    }
    layerService.syncLayersFromLegacy()
    const layer = useLayerStore.getState().layers[0]
    expect(layer?.type).toBe('text')
    if (layer && layer.type === 'text') {
      expect(layer.textStyle.text).toBe('Hi')
      expect(layer.textStyle.align).toBe('center')
      expect(layer.textStyle.color).toBe('#ff0000')
    }
  })

  it('is a no-op when window.state is absent', () => {
    useLayerStore.getState().addLayer(makeLayer(1))
    const before = useLayerStore.getState().layers.length
    layerService.syncLayersFromLegacy()
    expect(useLayerStore.getState().layers.length).toBe(before)
  })
})
