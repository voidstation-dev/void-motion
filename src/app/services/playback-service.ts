/**
 * Playback + animation transport service (M07).
 *
 * Coordinates the canvas transport controls (play / pause / restart /
 * generate / seek) between the React UI, the playback Zustand store, and the
 * legacy runtime (which owns the rAF loop + slot system until M17+).
 *
 * Per the M07 flow:
 * ```text
 * React UI → Zustand → Playback/Animation service → Legacy adapter
 * ```
 *
 * Behavior parity (vs legacy `legacy/index.html`):
 *   - `togglePlay()` (8657): if `state.done`, restart; else flip `playing`.
 *     The adapter's `InkplainerEngine.play/pause` already wrap this; the
 *     service mirrors the resulting status into the playback store.
 *   - `restartAnim()` (8649): if layers exist, `generate()`; else reset+setup.
 *   - `generate()` (5977): rebuild the animation queue + run the first group.
 *     No-op (legacy toast) when no layers.
 *   - `seekAnim(e)` (8803): scrub the progress bar by click ratio.
 *   - `setProgress(ratio)` (8571): set `_animProgress` + update the fill UI.
 *
 * The service never touches `document.getElementById` / `innerHTML` directly;
 * it reaches the legacy runtime through guarded `window.*` calls and mirrors
 * status into the typed playback store so React can render without polling.
 */

import { usePlaybackStore } from '@/app/store'
import { useLayerStore } from '@/app/store'
import type { LegacyInkplainerState } from '@/engine/legacy/legacy-state.types'

function clampProgress(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0
}

function activeGroupProgress(state: LegacyInkplainerState): number {
  const slots = Array.isArray(state._activeSlots) ? state._activeSlots : []
  if (slots.length === 0) return clampProgress(state._animProgress)

  const total = slots.reduce((sum, candidate) => {
    if (!candidate || typeof candidate !== 'object') return sum
    const slot = candidate as { done?: unknown; _state?: { _animProgress?: unknown } }
    return sum + (slot.done ? 1 : clampProgress(slot._state?._animProgress))
  }, 0)
  return total / slots.length
}

/**
 * Convert the current per-group legacy progress to a monotonic whole-sequence
 * progress value. Parallel slots are averaged so one faster slot cannot make
 * the UI jump forward and then backwards when another slot ticks.
 */
export function computeOverallPlaybackProgress(state: LegacyInkplainerState): number {
  if (state.done) return 1
  const groups = Array.isArray(state._animGroups) ? state._animGroups : []
  const groupProgress = activeGroupProgress(state)
  if (groups.length <= 1) return groupProgress

  const rawIndex = typeof state._groupPos === 'number' ? state._groupPos : 0
  const groupIndex = Math.min(Math.max(Math.trunc(rawIndex), 0), groups.length - 1)
  return Math.min(Math.max((groupIndex + groupProgress) / groups.length, 0), 1)
}

/** True when the legacy playback globals are present. */
function legacyReady(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.togglePlay === 'function' &&
    typeof window.restartAnim === 'function'
  )
}

export const playbackService = {
  /** True when transport controls can run (legacy booted + layers exist). */
  canPlay(): boolean {
    return legacyReady() && useLayerStore.getState().layers.length > 0
  },

  /**
   * Play / pause toggle. Delegates to the legacy `togglePlay` (which handles
   * the done→restart flip), then mirrors the resulting playing/done state
   * into the playback store. No-op if the legacy runtime is not booted.
   */
  playPause(): void {
    if (!legacyReady()) return
    window.togglePlay?.()
    this.syncStatusFromLegacy()
  },

  /** Restart the animation from the beginning. Mirrors legacy `restartAnim`. */
  restart(): void {
    if (!legacyReady()) return
    window.restartAnim?.()
    this.syncStatusFromLegacy()
  },

  /**
   * Regenerate the animation. Delegates to the legacy `generate` global.
   * The legacy fn toasts "Upload at least one image" when there are no
   * layers; we preserve that by delegating rather than guarding here.
   */
  generate(): void {
    if (typeof window === 'undefined' || typeof window.generate !== 'function') return
    window.generate()
    this.syncStatusFromLegacy()
  },

  /**
   * Seek the animation by click ratio (0..1). Mirrors legacy `seekAnim`:
   * `ratio = offsetX / clientWidth`. The caller passes the ratio directly.
   */
  seek(ratio: number): void {
    const clamped = Math.min(Math.max(ratio, 0), 1)
    usePlaybackStore.getState().setProgress(clamped)
    if (typeof window !== 'undefined' && typeof window.setProgress === 'function') {
      window.setProgress(clamped)
    }
  },

  /** Read live progress for the compositor-paced React progress indicator. */
  getVisualProgress(): number {
    if (typeof window !== 'undefined' && window.state) {
      return computeOverallPlaybackProgress(window.state)
    }
    return usePlaybackStore.getState().progress
  },

  /**
   * Read the live legacy playback status into the typed store. The legacy
   * `state.playing` / `state.done` / `state._animProgress` are the source of
   * truth until the engine is migrated (M17+); this mirrors them so the React
   * transport UI (play/pause icon, progress bar) reflects reality.
   */
  syncStatusFromLegacy(): void {
    if (typeof window === 'undefined' || !window.state) return
    const s = window.state
    const generating = !!s.generating
    const playing = !!s.playing
    const done = !!s.done
    const progress = computeOverallPlaybackProgress(s)
    // Map legacy status to the domain PlaybackStatus union. Legacy has no
    // distinct "paused" state — `!playing && !done` is the idle/paused case.
    const status = generating ? 'generating' : done ? 'completed' : playing ? 'playing' : 'idle'
    usePlaybackStore.getState().setSnapshot(status, progress)
  },
}
