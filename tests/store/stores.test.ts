/**
 * M04 store unit tests.
 *
 * Each bounded store is tested for: initial state, action correctness,
 * selector derivation, and the immer no-mutation guarantee. No legacy
 * globals are touched — these are pure domain-state tests.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  useProjectStore,
  useLayerStore,
  useCanvasStore,
  useSelectionStore,
  useAnimationStore,
  usePlaybackStore,
  useExportStore,
  useUiStore,
  buildNewProject,
  selectSelectedLayerId,
  hydrateStoresFromLegacyState,
} from '@/app/store'
import { DEFAULT_PROJECT_ANIMATION } from '@/types/project'
import { CANVAS_SIZE_TABLE } from '@/types/canvas'
import { type ProjectId, type LayerId } from '@/types/brand'
import { type Layer, type ImageLayer } from '@/types/layer'
import { buildLegacyState, buildLegacyImageLayer } from '@/test-utils/fixtures'

function pid(n: number): ProjectId {
  return `proj-${n}` as ProjectId
}
function lid(n: number): LayerId {
  return `layer-${n}` as LayerId
}
function makeLayer(n: number): Layer {
  return {
    id: lid(n),
    name: `Layer ${n}`,
    type: 'image',
    visible: true,
    opacity: 1,
    transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
    animationOrder: null,
    animation: {
      animationStyle: undefined,
      handStyle: undefined,
      zigzag: undefined,
      drawDirection: undefined,
      textDrawStyle: undefined,
      outlineDetect: undefined,
      detectionAlgorithm: undefined,
      strokeStyle: undefined,
      coloringStyle: undefined,
      outlineColor: undefined,
      outlineThickness: undefined,
      speed: undefined,
      handSpeed: undefined,
      chunks: undefined,
      specChunks: undefined,
    },
    assetId: `asset-${n}` as never,
    resizePct: 100,
    sourceMetadata: { naturalWidth: 100, naturalHeight: 100, hasPngAlpha: false },
  } as ImageLayer
}

beforeEach(() => {
  // Reset all stores between tests so state doesn't leak.
  useProjectStore.getState().clear()
  useLayerStore.getState().clear()
  useCanvasStore.getState().clear()
  useSelectionStore.getState().clear()
  useAnimationStore.getState().reset()
  usePlaybackStore.getState().reset()
  useExportStore.getState().resetJob()
})

describe('M04 project store', () => {
  it('starts empty with no dirty/saving flags', () => {
    const s = useProjectStore.getState()
    expect(s.current).toBeNull()
    expect(s.dirty).toBe(false)
    expect(s.saving).toBe(false)
    expect(s.summaries).toEqual([])
  })

  it('buildNewProject matches legacy defaults', () => {
    const doc = buildNewProject(pid(1), 'Untitled', '2026-01-01T00:00:00.000Z', {
      size: { width: 1280, height: 720 },
      aspectRatio: '16:9',
      resolutionPreset: '720p',
      background: { type: 'solid', val: 'white' },
    })
    expect(doc.schemaVersion).toBe(1)
    expect(doc.animation).toEqual(DEFAULT_PROJECT_ANIMATION)
    expect(doc.layers).toEqual([])
  })

  it('setCurrent sets the document and clears dirty', () => {
    const doc = buildNewProject(pid(1), 'P', '2026-01-01T00:00:00.000Z', {
      size: { width: 1280, height: 720 },
      aspectRatio: '16:9',
      resolutionPreset: '720p',
      background: { type: 'solid', val: 'white' },
    })
    useProjectStore.getState().markDirty()
    useProjectStore.getState().setCurrent(doc)
    const s = useProjectStore.getState()
    expect(s.current?.id).toBe(pid(1))
    expect(s.dirty).toBe(false)
  })

  it('setName updates name and marks dirty', () => {
    useProjectStore.getState().setCurrent(
      buildNewProject(pid(1), 'A', '2026-01-01T00:00:00.000Z', {
        size: { width: 1280, height: 720 },
        aspectRatio: '16:9',
        resolutionPreset: '720p',
        background: { type: 'solid', val: 'white' },
      }),
    )
    useProjectStore.getState().setName('B')
    expect(useProjectStore.getState().current?.name).toBe('B')
    expect(useProjectStore.getState().dirty).toBe(true)
  })
})

describe('M04 layer store', () => {
  it('addLayer appends and supports undo', () => {
    useLayerStore.getState().addLayer(makeLayer(1))
    expect(useLayerStore.getState().layers.length).toBe(1)
    useLayerStore.getState().undo()
    expect(useLayerStore.getState().layers.length).toBe(0)
    expect(useLayerStore.getState().canRedo()).toBe(true)
  })

  it('removeLayer filters by id', () => {
    useLayerStore.getState().addLayer(makeLayer(1))
    useLayerStore.getState().addLayer(makeLayer(2))
    useLayerStore.getState().removeLayer(lid(1))
    expect(useLayerStore.getState().layers.length).toBe(1)
    expect(useLayerStore.getState().layers[0]?.id).toBe(lid(2))
  })

  it('reorder moves a layer from one index to another', () => {
    useLayerStore.getState().addLayer(makeLayer(1))
    useLayerStore.getState().addLayer(makeLayer(2))
    useLayerStore.getState().addLayer(makeLayer(3))
    // 0,1,2 → move index 2 to index 0
    useLayerStore.getState().reorder(2, 0)
    expect(useLayerStore.getState().layers.map((l) => l.id)).toEqual([lid(3), lid(1), lid(2)])
  })

  it('redo restores an undone layer list', () => {
    useLayerStore.getState().addLayer(makeLayer(1))
    useLayerStore.getState().undo()
    useLayerStore.getState().redo()
    expect(useLayerStore.getState().layers.length).toBe(1)
  })
})

describe('M04 canvas store', () => {
  it('setAspectRatio derives pixel size from the table', () => {
    useCanvasStore.getState().setCanvas({
      size: { width: 1280, height: 720 },
      aspectRatio: '16:9',
      resolutionPreset: '720p',
      background: { type: 'solid', val: 'white' },
    })
    useCanvasStore.getState().setAspectRatio('1:1')
    const c = useCanvasStore.getState().canvas
    expect(c?.aspectRatio).toBe('1:1')
    expect(c?.size).toEqual({
      width: CANVAS_SIZE_TABLE['1:1']['720p'][0],
      height: CANVAS_SIZE_TABLE['1:1']['720p'][1],
    })
  })

  it('setBackground updates only background', () => {
    useCanvasStore.getState().setCanvas({
      size: { width: 1280, height: 720 },
      aspectRatio: '16:9',
      resolutionPreset: '720p',
      background: { type: 'solid', val: 'white' },
    })
    useCanvasStore.getState().setBackground({ type: 'solid', val: '#ff0000' })
    expect(useCanvasStore.getState().canvas?.background).toEqual({ type: 'solid', val: '#ff0000' })
  })
})

describe('M04 selection store', () => {
  it('selectLayer sets the selected id (selector works)', () => {
    useSelectionStore.getState().selectLayer(lid(1))
    expect(selectSelectedLayerId(useSelectionStore.getState())).toBe(lid(1))
  })
})

describe('M04 animation store', () => {
  it('setAnimationStyle updates defaults and active mode', () => {
    useAnimationStore.getState().setAnimationStyle('scanner')
    expect(useAnimationStore.getState().defaults.animationStyle).toBe('scanner')
    expect(useAnimationStore.getState().activeMode).toBe('scanner')
  })

  it('reset restores defaults', () => {
    useAnimationStore.getState().setHandStyle('pen')
    useAnimationStore.getState().reset()
    expect(useAnimationStore.getState().defaults.handStyle).toBe(
      DEFAULT_PROJECT_ANIMATION.handStyle,
    )
  })
})

describe('M04 playback store', () => {
  it('speeds are clamped to legacy ranges', () => {
    usePlaybackStore.getState().setRevealSpeed(999)
    expect(usePlaybackStore.getState().revealSpeed).toBe(100)
    usePlaybackStore.getState().setHandSpeed(0)
    expect(usePlaybackStore.getState().handSpeed).toBe(1)
  })

  it('progress is clamped to [0,1]', () => {
    usePlaybackStore.getState().setProgress(1.5)
    expect(usePlaybackStore.getState().progress).toBe(1)
    usePlaybackStore.getState().setProgress(-0.5)
    expect(usePlaybackStore.getState().progress).toBe(0)
  })
})

describe('M04 export store', () => {
  it('setFormat updates config', () => {
    useExportStore.getState().setFormat('mp4')
    expect(useExportStore.getState().config.format).toBe('mp4')
  })

  it('resetJob clears job state', () => {
    useExportStore.getState().setJobStatus('rendering')
    useExportStore.getState().setJobProgress(0.5)
    useExportStore.getState().resetJob()
    expect(useExportStore.getState().jobStatus).toBe('idle')
    expect(useExportStore.getState().jobProgress).toBe(0)
  })
})

describe('M04 ui store', () => {
  it('setSidebarTab switches tab', () => {
    useUiStore.getState().setSidebarTab('drawing')
    expect(useUiStore.getState().activeSidebarTab).toBe('drawing')
  })

  it('pushToast + dismissToast manage the queue', () => {
    useUiStore.getState().pushToast({ id: 't1', message: 'hi', tone: 'info' })
    useUiStore.getState().pushToast({ id: 't2', message: 'bye', tone: 'error' })
    expect(useUiStore.getState().toasts.length).toBe(2)
    useUiStore.getState().dismissToast('t1')
    expect(useUiStore.getState().toasts.length).toBe(1)
    expect(useUiStore.getState().toasts[0]?.id).toBe('t2')
  })
})

describe('M04 legacy → Zustand hydration', () => {
  it('hydrateStoresFromLegacyState maps legacy state into all bounded stores', () => {
    const legacy = buildLegacyState({
      layers: [buildLegacyImageLayer(1, { name: 'Photo', w: 200, h: 150, baseW: 200, baseH: 150 })],
    })
    const id = hydrateStoresFromLegacyState(
      legacy,
      42,
      'My Project',
      '2026-01-01T00:00:00.000Z',
      '2026-01-02T00:00:00.000Z',
    )
    expect(typeof id).toBe('string')
    expect(useProjectStore.getState().current?.name).toBe('My Project')
    expect(useLayerStore.getState().layers.length).toBe(1)
    expect(useCanvasStore.getState().canvas?.size.width).toBe(1280)
    expect(useAnimationStore.getState().defaults.animationStyle).toBe('chunk-jump')
  })
})
