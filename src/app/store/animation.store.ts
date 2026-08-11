/**
 * Animation store (M04) — bounded Zustand domain store for animation/drawing
 * settings.
 *
 * Holds the project-wide animation/drawing defaults (the legacy `state.*`
 * scalar fields) plus the currently-active animation mode and per-layer
 * override cache. Per M04: serializable only; the rAF loop lives in the
 * engine (M03).
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  AnimationStyle,
  ColoringStyle,
  DetectionAlgorithm,
  DrawDirection,
  HandStyle,
  OutlineDetect,
  RevealStyle,
  StrokeStyle,
  TextDrawStyle,
} from '@/types/animation'
import type { ActiveAnimationMode } from '@/types/animation'
import type { ProjectAnimationDefaults } from '@/types/project'
import { DEFAULT_PROJECT_ANIMATION } from '@/types/project'

export interface AnimationState {
  readonly defaults: ProjectAnimationDefaults
  /** Currently-selected animation or drawing mode (legacy `state.animStyle`). */
  readonly activeMode: ActiveAnimationMode
  /** Final image reveal style (legacy `_revealStyle` top-level global). */
  readonly revealStyle: RevealStyle

  // ── actions ──
  setDefaults(patch: Partial<ProjectAnimationDefaults>): void
  setAnimationStyle(style: AnimationStyle): void
  setHandStyle(hand: HandStyle): void
  setZigzag(zigzag: boolean): void
  setDrawDirection(dir: DrawDirection): void
  setTextDrawStyle(style: TextDrawStyle): void
  setOutlineDetect(value: OutlineDetect): void
  setDetectionAlgorithm(algo: DetectionAlgorithm): void
  setStrokeStyle(style: StrokeStyle): void
  setColoringStyle(style: ColoringStyle): void
  setColor(color: string): void
  setRevealStyle(style: RevealStyle): void
  setActiveMode(mode: ActiveAnimationMode): void
  reset(): void
}

export const useAnimationStore = create<AnimationState>()(
  immer((set) => ({
    defaults: DEFAULT_PROJECT_ANIMATION,
    activeMode: DEFAULT_PROJECT_ANIMATION.animationStyle,
    revealStyle: DEFAULT_PROJECT_ANIMATION.revealStyle,

    setDefaults(patch) {
      set((s) => {
        s.defaults = { ...s.defaults, ...patch }
      })
    },
    setAnimationStyle(style) {
      set((s) => {
        s.defaults = { ...s.defaults, animationStyle: style }
        s.activeMode = style
      })
    },
    setHandStyle(hand) {
      set((s) => {
        s.defaults = { ...s.defaults, handStyle: hand }
      })
    },
    setZigzag(zigzag) {
      set((s) => {
        s.defaults = { ...s.defaults, zigzag }
      })
    },
    setDrawDirection(dir) {
      set((s) => {
        s.defaults = { ...s.defaults, drawDirection: dir }
      })
    },
    setTextDrawStyle(style) {
      set((s) => {
        s.defaults = { ...s.defaults, textDrawStyle: style }
      })
    },
    setOutlineDetect(value) {
      set((s) => {
        s.defaults = { ...s.defaults, outlineDetect: value }
      })
    },
    setDetectionAlgorithm(algo) {
      set((s) => {
        s.defaults = { ...s.defaults, detectionAlgorithm: algo }
      })
    },
    setStrokeStyle(style) {
      set((s) => {
        s.defaults = { ...s.defaults, strokeStyle: style }
      })
    },
    setColoringStyle(style) {
      set((s) => {
        s.defaults = { ...s.defaults, coloringStyle: style }
      })
    },
    setColor(color) {
      set((s) => {
        s.defaults = { ...s.defaults, color }
      })
    },
    setRevealStyle(style) {
      set((s) => {
        s.revealStyle = style
      })
    },
    setActiveMode(mode) {
      set((s) => {
        s.activeMode = mode
      })
    },
    reset() {
      set((s) => {
        s.defaults = DEFAULT_PROJECT_ANIMATION
        s.activeMode = DEFAULT_PROJECT_ANIMATION.animationStyle
        s.revealStyle = DEFAULT_PROJECT_ANIMATION.revealStyle
      })
    },
  })),
)

// ── selectors ──

export function selectAnimationSettings(s: AnimationState): ProjectAnimationDefaults {
  return s.defaults
}

export function selectActiveMode(s: AnimationState): ActiveAnimationMode {
  return s.activeMode
}

export function selectRevealStyle(s: AnimationState): RevealStyle {
  return s.revealStyle
}
