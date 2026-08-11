/**
 * Canvas + hand + speed controls service (M07).
 *
 * Coordinates the bottom-bar global controls — hand style, reveal/hand
 * speed, canvas aspect ratio + resolution — between the React UI, the
 * animation/canvas/playback Zustand stores, and the legacy runtime.
 *
 * Per the M07 flow:
 * ```text
 * React UI → Zustand → Canvas/Animation service → Legacy adapter
 * ```
 *
 * Behavior parity (vs legacy `legacy/index.html`):
 *   - `bbSelectHand(el)` (5313): pushUndoSnapshot, clearActivePreset, sync
 *     pills, set `state.hand` + per-layer `layer.hand`. We delegate to the
 *     legacy `selectHand` (which does all of that) with a stub element, and
 *     mirror `hand` into the animation store.
 *   - `bbSelectRatio(el)` (5328) → `selectRatio` (7957): pushUndoSnapshot,
 *     set `_currentRatio`, `_applyCanvasSize` (rescale layers + re-init
 *     canvas + redraw). We delegate with a stub element and mirror the
 *     derived size into the canvas store.
 *   - `bbSelectRes(el)` (5338) → `selectRes` (7965): symmetric for `_currentRes`.
 *   - Speed sliders (`speed-slider`/`hand-speed-slider`, 3888+): on `input`,
 *     update `state.speed`/per-layer `layer.speed` (reveal) and
 *     `state.handSpeed`/per-layer `layer.handSpeed`. We mirror into the
 *     playback store; the legacy rAF loop reads the slider value each tick,
 *     so the legacy runtime stays authoritative for actual animation speed.
 *
 * The service never touches `document.getElementById` / `innerHTML` directly.
 */

import { useAnimationStore } from '@/app/store'
import { useCanvasStore } from '@/app/store'
import { usePlaybackStore } from '@/app/store'
import { CANVAS_SIZE_TABLE } from '@/types/canvas'
import type { AspectRatio, ResolutionPreset } from '@/types/canvas'
import type { HandStyle } from '@/types/animation'
import type { LegacyControlElement } from '@/engine/legacy/legacy-state.types'
import { domainHandStyleToLegacy } from '@/engine/legacy/legacy-enum-mapping'

/** True when the legacy canvas-control globals are present. */
function legacyReady(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.selectHand === 'function' &&
    typeof window.selectRatio === 'function' &&
    typeof window.selectRes === 'function'
  )
}

/** Build a minimal stub element for the legacy element-based controls. */
function stubElement(dataset: Record<string, string>): LegacyControlElement {
  return {
    dataset,
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
  }
}

/** Map a legacy resolution number (720/1080/1440) to the domain preset. */
function legacyResToPreset(res: number): ResolutionPreset {
  switch (res) {
    case 1080:
      return '1080p'
    case 1440:
      return '1440p'
    default:
      return '720p'
  }
}

export const canvasControlsService = {
  /**
   * Select a hand style. Delegates to the legacy `selectHand` (which pushes
   * an undo snapshot, syncs the legacy pill UI, sets `state.hand` + the
   * selected layer's `layer.hand`, and schedules autosave), then mirrors
   * the hand into the animation store.
   */
  setHand(hand: HandStyle): void {
    if (legacyReady()) {
      // The legacy `selectHand` reads `el.dataset.hand` and assigns it
      // verbatim to `state.hand` + `layer.hand`, so the dataset value MUST be
      // the legacy raw value (e.g. `custom1`), not the clean domain enum.
      window.selectHand?.(stubElement({ hand: domainHandStyleToLegacy(hand) }))
    }
    useAnimationStore.getState().setHandStyle(hand)
  },

  /**
   * Select an aspect ratio. Delegates to the legacy `selectRatio` (which
   * pushes an undo snapshot, sets `_currentRatio`, and runs
   * `_applyCanvasSize` — rescaling layers + re-initializing the canvas +
   * redrawing), then mirrors the derived pixel size into the canvas store.
   */
  setAspectRatio(ratio: AspectRatio): void {
    if (legacyReady()) {
      window.selectRatio?.(stubElement({ ratio }))
    }
    // Mirror the derived size into the typed canvas store. The legacy
    // `_applyCanvasSize` is the source of truth for the actual canvas; this
    // keeps the React readout in sync.
    const canvas = useCanvasStore.getState().canvas
    const preset = canvas?.resolutionPreset ?? '720p'
    if (preset !== 'custom') {
      const dims = CANVAS_SIZE_TABLE[ratio][preset]
      useCanvasStore.getState().setCanvas({
        size: { width: dims[0], height: dims[1] },
        aspectRatio: ratio,
        resolutionPreset: preset,
        background: canvas?.background ?? { type: 'solid', val: 'white' },
      })
    }
  },

  /**
   * Select a resolution preset. Delegates to the legacy `selectRes`, then
   * mirrors the derived pixel size into the canvas store.
   */
  setResolutionPreset(preset: ResolutionPreset): void {
    if (preset === 'custom') return
    if (legacyReady()) {
      const resNum = preset === '720p' ? 720 : preset === '1080p' ? 1080 : 1440
      window.selectRes?.(stubElement({ res: String(resNum) }))
    }
    const canvas = useCanvasStore.getState().canvas
    const ratio = canvas?.aspectRatio ?? '16:9'
    const dims = CANVAS_SIZE_TABLE[ratio][preset]
    useCanvasStore.getState().setCanvas({
      size: { width: dims[0], height: dims[1] },
      aspectRatio: ratio,
      resolutionPreset: preset,
      background: canvas?.background ?? { type: 'solid', val: 'white' },
    })
  },

  /**
   * Set the reveal (animation) speed. Mirrors into the playback store. The
   * legacy rAF loop reads the slider value each tick (`animate`, 8588), so
   * the legacy runtime stays authoritative for the actual playback speed;
   * the store value is the typed mirror the React slider renders.
   *
   * Per-layer speed is set by the legacy slider listener; we do NOT set it
   * here because per-layer values are an M08 concern (layer inspector).
   */
  setRevealSpeed(speed: number): void {
    usePlaybackStore.getState().setRevealSpeed(speed)
  },

  /** Set the hand speed. Mirrors into the playback store. */
  setHandSpeed(speed: number): void {
    usePlaybackStore.getState().setHandSpeed(speed)
  },

  /** Read the legacy `_currentRes`/`_currentRatio`-derived preset into the store. */
  syncCanvasFromLegacy(): void {
    if (typeof window === 'undefined' || !window.state) return
    const s = window.state
    const w = s.canvasW
    const h = s.canvasH
    // Infer ratio + preset from size by matching the table.
    const ratio = (Object.keys(CANVAS_SIZE_TABLE) as AspectRatio[]).find((r) => {
      const presets = CANVAS_SIZE_TABLE[r]
      return (Object.keys(presets) as Exclude<ResolutionPreset, 'custom'>[]).some((p) => {
        const dims = presets[p]
        return dims[0] === w && dims[1] === h
      })
    })
    if (!ratio) return
    const preset = (
      Object.keys(CANVAS_SIZE_TABLE[ratio]) as Exclude<ResolutionPreset, 'custom'>[]
    ).find((p) => CANVAS_SIZE_TABLE[ratio][p][0] === w && CANVAS_SIZE_TABLE[ratio][p][1] === h)
    if (!preset) return
    useCanvasStore.getState().setCanvas({
      size: { width: w, height: h },
      aspectRatio: ratio,
      resolutionPreset: preset,
      background: s.canvasBg as never,
    })
  },
}

/** Map a legacy resolution number to the domain preset (exported for tests). */
export function legacyResToPresetExport(res: number): ResolutionPreset {
  return legacyResToPreset(res)
}
