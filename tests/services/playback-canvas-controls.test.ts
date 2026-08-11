/**
 * M07 playback + canvas-controls service contract tests.
 *
 * Verifies the playback service delegates play/pause/restart/generate/seek to
 * the legacy runtime through guarded `window.*` calls and mirrors status into
 * the typed playback store; and that the canvas-controls service delegates
 * hand/ratio/res to the legacy `selectHand`/`selectRatio`/`selectRes` with the
 * correct dataset values (legacy raw values, not domain enums) and mirrors
 * into the animation + canvas + playback stores.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { playbackService } from '@/app/services/playback-service'
import {
  canvasControlsService,
  legacyResToPresetExport,
} from '@/app/services/canvas-controls-service'
import { usePlaybackStore, useAnimationStore, useCanvasStore, useLayerStore } from '@/app/store'
import { makeLayer } from './helpers/layers'
import type { LegacyControlElement } from '@/engine/legacy/legacy-state.types'

/** Read the dataset of the element passed to the Nth selectHand/Ratio/Res call. */
function datasetOf(spy: { mock: { calls: unknown[][] } }, call = 0): Record<string, string> {
  const args = spy.mock.calls[call]
  if (!args) throw new Error(`datasetOf: call ${call} not made`)
  return (args[0] as LegacyControlElement).dataset
}

/** Install legacy playback globals with spies. */
function installLegacyPlayback(
  opts: {
    togglePlay?: () => void
    restartAnim?: () => void
    generate?: () => void
    setProgress?: (ratio: number) => void
  } = {},
): void {
  const w = window as unknown as Record<string, unknown>
  w.togglePlay = opts.togglePlay ?? vi.fn()
  w.restartAnim = opts.restartAnim ?? vi.fn()
  w.generate = opts.generate ?? vi.fn()
  w.setProgress = opts.setProgress ?? vi.fn()
}

/** Install legacy canvas-control globals with a captured-element spy. */
function installLegacyCanvas(
  opts: {
    selectHand?: (el: LegacyControlElement) => void
    selectRatio?: (el: LegacyControlElement) => void
    selectRes?: (el: LegacyControlElement) => void
  } = {},
): void {
  const w = window as unknown as Record<string, unknown>
  w.selectHand = opts.selectHand ?? vi.fn()
  w.selectRatio = opts.selectRatio ?? vi.fn()
  w.selectRes = opts.selectRes ?? vi.fn()
}

/** Install a legacy `window.state` playback snapshot. */
function installLegacyState(s: {
  playing?: boolean
  done?: boolean
  _animProgress?: number
  canvasW?: number
  canvasH?: number
}): void {
  const w = window as unknown as Record<string, unknown>
  w.state = {
    playing: s.playing ?? false,
    done: s.done ?? false,
    _animProgress: s._animProgress ?? 0,
    canvasW: s.canvasW ?? 1280,
    canvasH: s.canvasH ?? 720,
  }
}

function clearLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  delete w.togglePlay
  delete w.restartAnim
  delete w.generate
  delete w.setProgress
  delete w.selectHand
  delete w.selectRatio
  delete w.selectRes
  delete w.state
}

beforeEach(() => {
  usePlaybackStore.getState().reset()
  usePlaybackStore.getState().setRevealSpeed(40)
  usePlaybackStore.getState().setHandSpeed(6)
  useAnimationStore.getState().reset()
  useCanvasStore.getState().clear()
  useLayerStore.getState().clear()
  clearLegacy()
})

afterEach(() => {
  clearLegacy()
  vi.useRealTimers()
})

// ─── Playback service ───────────────────────────────────────────────────────

describe('M07 playbackService', () => {
  it('canPlay is false when legacy not booted', () => {
    useLayerStore.getState().addLayer(makeLayer(1))
    expect(playbackService.canPlay()).toBe(false)
  })

  it('canPlay is false when no layers exist', () => {
    installLegacyPlayback()
    expect(playbackService.canPlay()).toBe(false)
  })

  it('canPlay is true when legacy booted + layers exist', () => {
    installLegacyPlayback()
    useLayerStore.getState().addLayer(makeLayer(1))
    expect(playbackService.canPlay()).toBe(true)
  })

  it('playPause delegates to window.togglePlay', () => {
    const togglePlay = vi.fn()
    installLegacyPlayback({ togglePlay })
    playbackService.playPause()
    expect(togglePlay).toHaveBeenCalledOnce()
  })

  it('playPause is a no-op when legacy not booted', () => {
    const before = usePlaybackStore.getState().status
    playbackService.playPause()
    expect(usePlaybackStore.getState().status).toBe(before)
  })

  it('playPause mirrors playing status from legacy state', () => {
    installLegacyPlayback()
    installLegacyState({ playing: true, done: false, _animProgress: 0.25 })
    playbackService.playPause()
    expect(usePlaybackStore.getState().status).toBe('playing')
    expect(usePlaybackStore.getState().progress).toBeCloseTo(0.25)
  })

  it('playPause mirrors completed status when legacy done', () => {
    installLegacyPlayback()
    installLegacyState({ playing: false, done: true, _animProgress: 1 })
    playbackService.playPause()
    expect(usePlaybackStore.getState().status).toBe('completed')
  })

  it('playPause mirrors idle status when not playing + not done', () => {
    installLegacyPlayback()
    installLegacyState({ playing: false, done: false, _animProgress: 0 })
    playbackService.playPause()
    expect(usePlaybackStore.getState().status).toBe('idle')
  })

  it('restart delegates to window.restartAnim', () => {
    const restartAnim = vi.fn()
    installLegacyPlayback({ restartAnim })
    playbackService.restart()
    expect(restartAnim).toHaveBeenCalledOnce()
  })

  it('generate delegates to window.generate', () => {
    const generate = vi.fn()
    installLegacyPlayback({ generate })
    playbackService.generate()
    expect(generate).toHaveBeenCalledOnce()
  })

  it('generate is a no-op when legacy generate not present', () => {
    installLegacyPlayback() // no generate fn
    delete (window as unknown as Record<string, unknown>).generate
    playbackService.generate()
    // No throw, no status change.
    expect(usePlaybackStore.getState().status).toBe('idle')
  })

  it('seek clamps ratio to [0,1] and sets store + legacy setProgress', () => {
    const setProgress = vi.fn()
    installLegacyPlayback({ setProgress })
    playbackService.seek(-0.5)
    expect(usePlaybackStore.getState().progress).toBe(0)
    expect(setProgress).toHaveBeenCalledWith(0)
    playbackService.seek(2)
    expect(usePlaybackStore.getState().progress).toBe(1)
    expect(setProgress).toHaveBeenCalledWith(1)
    playbackService.seek(0.4)
    expect(usePlaybackStore.getState().progress).toBeCloseTo(0.4)
    expect(setProgress).toHaveBeenCalledWith(0.4)
  })

  it('seek updates the store even when legacy setProgress is absent', () => {
    installLegacyPlayback()
    delete (window as unknown as Record<string, unknown>).setProgress
    playbackService.seek(0.5)
    expect(usePlaybackStore.getState().progress).toBeCloseTo(0.5)
  })

  it('syncStatusFromLegacy maps legacy _animProgress into [0,1]', () => {
    installLegacyPlayback()
    installLegacyState({ playing: true, done: false, _animProgress: 1.5 })
    playbackService.syncStatusFromLegacy()
    expect(usePlaybackStore.getState().progress).toBe(1)
  })
})

// ─── Canvas controls service ─────────────────────────────────────────────────

describe('M07 canvasControlsService', () => {
  it('setHand delegates to window.selectHand with the legacy raw value', () => {
    const selectHand = vi.fn()
    installLegacyCanvas({ selectHand })
    canvasControlsService.setHand('hand-1')
    expect(selectHand).toHaveBeenCalledOnce()
    // Domain `hand-1` maps to legacy `custom1`.
    expect(datasetOf(selectHand).hand).toBe('custom1')
  })

  it('setHand maps pen → custom4', () => {
    const selectHand = vi.fn()
    installLegacyCanvas({ selectHand })
    canvasControlsService.setHand('pen')
    expect(datasetOf(selectHand).hand).toBe('custom4')
  })

  it('setHand mirrors the domain hand into the animation store', () => {
    installLegacyCanvas()
    canvasControlsService.setHand('hand-2')
    expect(useAnimationStore.getState().defaults.handStyle).toBe('hand-2')
  })

  it('setHand is a no-op (store-only) when legacy not booted', () => {
    canvasControlsService.setHand('ghost')
    expect(useAnimationStore.getState().defaults.handStyle).toBe('ghost')
  })

  it('setAspectRatio delegates to window.selectRatio with the ratio string', () => {
    const selectRatio = vi.fn()
    installLegacyCanvas({ selectRatio })
    // Seed a canvas so the store mirror has a preset to preserve.
    useCanvasStore.getState().setCanvas({
      size: { width: 1280, height: 720 },
      aspectRatio: '16:9',
      resolutionPreset: '720p',
      background: { type: 'solid', val: 'white' },
    })
    canvasControlsService.setAspectRatio('9:16')
    expect(selectRatio).toHaveBeenCalledOnce()
    expect(datasetOf(selectRatio).ratio).toBe('9:16')
  })

  it('setAspectRatio mirrors the derived size into the canvas store', () => {
    installLegacyCanvas()
    useCanvasStore.getState().setCanvas({
      size: { width: 1280, height: 720 },
      aspectRatio: '16:9',
      resolutionPreset: '1080p',
      background: { type: 'solid', val: 'white' },
    })
    canvasControlsService.setAspectRatio('1:1')
    const canvas = useCanvasStore.getState().canvas
    expect(canvas?.aspectRatio).toBe('1:1')
    expect(canvas?.size.width).toBe(1080)
    expect(canvas?.size.height).toBe(1080)
  })

  it('setResolutionPreset delegates to window.selectRes with the numeric res', () => {
    const selectRes = vi.fn()
    installLegacyCanvas({ selectRes })
    canvasControlsService.setResolutionPreset('1080p')
    expect(selectRes).toHaveBeenCalledOnce()
    expect(datasetOf(selectRes).res).toBe('1080')
  })

  it('setResolutionPreset maps 1440p → 1440', () => {
    const selectRes = vi.fn()
    installLegacyCanvas({ selectRes })
    canvasControlsService.setResolutionPreset('1440p')
    expect(datasetOf(selectRes).res).toBe('1440')
  })

  it('setResolutionPreset mirrors the derived size into the canvas store', () => {
    installLegacyCanvas()
    useCanvasStore.getState().setCanvas({
      size: { width: 1280, height: 720 },
      aspectRatio: '16:9',
      resolutionPreset: '720p',
      background: { type: 'solid', val: 'white' },
    })
    canvasControlsService.setResolutionPreset('1440p')
    const canvas = useCanvasStore.getState().canvas
    expect(canvas?.resolutionPreset).toBe('1440p')
    expect(canvas?.size.width).toBe(2560)
    expect(canvas?.size.height).toBe(1440)
  })

  it('setResolutionPreset is a no-op for custom', () => {
    const selectRes = vi.fn()
    installLegacyCanvas({ selectRes })
    canvasControlsService.setResolutionPreset('custom')
    expect(selectRes).not.toHaveBeenCalled()
  })

  it('setRevealSpeed mirrors into the playback store (clamped)', () => {
    canvasControlsService.setRevealSpeed(150)
    expect(usePlaybackStore.getState().revealSpeed).toBe(100)
    canvasControlsService.setRevealSpeed(0)
    expect(usePlaybackStore.getState().revealSpeed).toBe(1)
    canvasControlsService.setRevealSpeed(55)
    expect(usePlaybackStore.getState().revealSpeed).toBe(55)
  })

  it('setHandSpeed mirrors into the playback store (clamped)', () => {
    canvasControlsService.setHandSpeed(99)
    expect(usePlaybackStore.getState().handSpeed).toBe(20)
    canvasControlsService.setHandSpeed(0)
    expect(usePlaybackStore.getState().handSpeed).toBe(1)
    canvasControlsService.setHandSpeed(12)
    expect(usePlaybackStore.getState().handSpeed).toBe(12)
  })

  it('syncCanvasFromLegacy infers ratio + preset from window.state size', () => {
    installLegacyCanvas()
    installLegacyState({ canvasW: 1920, canvasH: 1080 })
    canvasControlsService.syncCanvasFromLegacy()
    const canvas = useCanvasStore.getState().canvas
    expect(canvas?.aspectRatio).toBe('16:9')
    expect(canvas?.resolutionPreset).toBe('1080p')
    expect(canvas?.size.width).toBe(1920)
    expect(canvas?.size.height).toBe(1080)
  })

  it('syncCanvasFromLegacy is a no-op for an unrecognized size', () => {
    installLegacyCanvas()
    installLegacyState({ canvasW: 1234, canvasH: 567 })
    canvasControlsService.syncCanvasFromLegacy()
    expect(useCanvasStore.getState().canvas).toBeNull()
  })

  it('legacyResToPresetExport maps 720/1080/1440', () => {
    expect(legacyResToPresetExport(720)).toBe('720p')
    expect(legacyResToPresetExport(1080)).toBe('1080p')
    expect(legacyResToPresetExport(1440)).toBe('1440p')
    expect(legacyResToPresetExport(999)).toBe('720p')
  })
})
