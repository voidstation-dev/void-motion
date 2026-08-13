import type { LegacyInkplainerState } from './legacy-state.types'
import type { RandomSource } from '../../migration/seeded-random'

/** Input parameters for the legacy hand rendering function. */
export interface DrawHandInput {
  ctx: CanvasRenderingContext2D
  x: number
  y: number
  dir: number
  handName: string
}

/**
 * AnimationContext (M17)
 * 
 * Provides global state and DOM replacements to the legacy animation algorithms,
 * isolating them from the real browser environment so they can be securely hosted
 * by the React shell.
 */
export interface AnimationContext {
  state: LegacyInkplainerState
  main: CanvasRenderingContext2D
  hand: CanvasRenderingContext2D
  offscreen: CanvasRenderingContext2D | null
  canvasWidth: number
  canvasHeight: number

  fillBackground: (ctx: CanvasRenderingContext2D) => void
  drawHand: (ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, hand: string) => void
  setProgress: (progress: number) => void
  finish: () => void

  resScale: (v?: number) => number
  resPointScale: (p: number) => number
  resSoftBlur: (ctx: CanvasRenderingContext2D, passes: number) => void

  random: RandomSource
  getSetting: (id: string) => string | number | boolean | undefined
}
