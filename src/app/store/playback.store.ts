/**
 * Playback store (M04) — bounded Zustand domain store for playback state.
 *
 * A serializable projection of the runtime playback loop (which lives in the
 * legacy engine adapter, M03). Holds status, progress, current group, and
 * the global reveal + hand speeds (legacy `speed` slider default 40, range
 * 1-100; `handSpeed` default 6, range 1-20).
 *
 * Per M04: serializable only. The actual rAF loop is owned by the engine; this
 * store is updated by the engine via the subscribe bridge (later migration).
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { PlaybackStatus as DomainPlaybackStatus } from '@/types/animation'

/** Legacy speed defaults (legacy/index.html:5573 area). */
export const DEFAULT_REVEAL_SPEED = 40
export const DEFAULT_HAND_SPEED = 6
export const MIN_SPEED = 1
export const MAX_SPEED = 100
export const MIN_HAND_SPEED = 1
export const MAX_HAND_SPEED = 20

export interface PlaybackState {
  readonly status: DomainPlaybackStatus
  readonly progress: number
  readonly currentGroupIndex: number
  /** Reveal speed (legacy `speed`, default 40, range [1,100]). */
  readonly revealSpeed: number
  /** Hand speed (legacy `handSpeed`, default 6, range [1,20]). */
  readonly handSpeed: number
  /** Loop playback. Legacy does NOT loop (KQ-010). */
  readonly loop: boolean

  // ── actions ──
  setStatus(status: DomainPlaybackStatus): void
  setProgress(progress: number): void
  setSnapshot(status: DomainPlaybackStatus, progress: number): void
  setCurrentGroupIndex(index: number): void
  setRevealSpeed(speed: number): void
  setHandSpeed(speed: number): void
  setLoop(loop: boolean): void
  reset(): void
}

export const usePlaybackStore = create<PlaybackState>()(
  immer((set) => ({
    status: 'idle',
    progress: 0,
    currentGroupIndex: 0,
    revealSpeed: DEFAULT_REVEAL_SPEED,
    handSpeed: DEFAULT_HAND_SPEED,
    loop: false,

    setStatus(status) {
      set((s) => {
        s.status = status
      })
    },
    setProgress(progress) {
      set((s) => {
        s.progress = Math.min(Math.max(progress, 0), 1)
      })
    },
    setSnapshot(status, progress) {
      set((s) => {
        s.status = status
        s.progress = Math.min(Math.max(progress, 0), 1)
      })
    },
    setCurrentGroupIndex(index) {
      set((s) => {
        s.currentGroupIndex = index
      })
    },
    setRevealSpeed(speed) {
      set((s) => {
        s.revealSpeed = Math.min(Math.max(speed, MIN_SPEED), MAX_SPEED)
      })
    },
    setHandSpeed(speed) {
      set((s) => {
        s.handSpeed = Math.min(Math.max(speed, MIN_HAND_SPEED), MAX_HAND_SPEED)
      })
    },
    setLoop(loop) {
      set((s) => {
        s.loop = loop
      })
    },
    reset() {
      set((s) => {
        s.status = 'idle'
        s.progress = 0
        s.currentGroupIndex = 0
      })
    },
  })),
)

// ── selectors ──

export function selectIsPlaying(s: PlaybackState): boolean {
  return s.status === 'playing'
}

export function selectProgress(s: PlaybackState): number {
  return s.progress
}

export function selectRevealSpeed(s: PlaybackState): number {
  return s.revealSpeed
}

export function selectHandSpeed(s: PlaybackState): number {
  return s.handSpeed
}
