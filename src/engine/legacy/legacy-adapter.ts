/**
 * Typed legacy runtime adapter — the single engine boundary (M03).
 *
 * This module defines `InkplainerEngine`, the interface all new React feature
 * code sees, and `LegacyEngineAdapter`, the concrete implementation that
 * delegates to the frozen legacy Inkplainer runtime (`window.state`,
 * `window.AnimationEngine`, `window.togglePlay`, etc.).
 *
 * Per M03, no React feature module imports legacy globals directly. Every
 * runtime action — attach canvases, load/sync a project, render the static
 * frame, play/pause/restart, read progress — goes through this engine
 * interface. The adapter implementation MAY touch legacy globals (that is
 * its purpose); the rest of the app may not.
 *
 * Legacy globals are accessed through runtime guards (`requireLegacyState`,
 * `requireLegacyEngine`) — never bare non-null assertions — per M00 §17.
 */
import type { ProjectDocument } from '../../types/project'
import { requireLegacyState, applyProjectToLegacyState } from './legacy-state.adapter'
import type { CanvasHandles, PlaybackStatus } from './legacy-types'
import { renderStaticFrame } from '../renderer/canvas-renderer'
import { resScale, resPointScale, resSoftBlur } from '../renderer/resolution'
import { renderBackground } from '../renderer/background-renderer'
import { LegacyEventBus, type LegacyEngineListener } from './legacy-events'
import type { VideoExportConfig } from '@/types/export'
import { runLegacyExport, type ExportCallbacks } from './legacy-export'

/**
 * The engine surface new React code consumes. Mirrors the M03 plan contract:
 * attach canvases, load/sync project, render static frame, transport
 * controls, read progress/status, and tear down.
 *
 * Implementations must be behavior-preserving: every method delegates to the
 * legacy runtime exactly as the legacy UI did.
 */
export interface InkplainerEngine {
  /** Bind the four legacy canvas surfaces to the engine. */
  attachCanvases(canvases: CanvasHandles): void

  /** Load a domain project into the legacy runtime (full round-trip). */
  loadProject(project: ProjectDocument): Promise<void>

  /** Sync a domain project's serializable fields onto the live legacy state. */
  syncProject(project: ProjectDocument): void

  /** Render the current static frame (no animation). Equivalent to `fillBg` + draw layers. */
  renderStatic(): void

  /**
   * Resize the attached canvases to the given CSS display size (M09). The
   * legacy runtime derives internal bitmap size from `state.canvasW`/
   * `state.canvasH`; this applies the display-size scaling the legacy
   * `fitCanvas` does (legacy/index.html ~5660). No-op until canvases are
   * attached. The actual draw is wired in M19 (renderer migration).
   */
  resize(displayWidth: number, displayHeight: number): void

  /** Start/resume playback. Mirrors legacy `togglePlay` when `state.done` is false. */
  play(): void

  /** Pause playback. */
  pause(): void

  /** Restart from the beginning. Mirrors legacy `restartAnim`. */
  restart(): void

  /** Current animation progress in [0, 1]. */
  getProgress(): number

  /** Current playback status (playing / done / progress). */
  getStatus(): PlaybackStatus

  /** Subscribe to legacy runtime events. Returns an unsubscribe function. */
  subscribe(listener: LegacyEngineListener): () => void

  /**
   * Run a video export utilizing the legacy MediaRecorder / mp4-muxer pipeline.
   * Throws if the engine is destroyed or missing handles.
   */
  exportVideo(config: VideoExportConfig, callbacks: ExportCallbacks): Promise<void>

  /**
   * Hard teardown: release all held references and mark the adapter
   * permanently dead. Subsequent calls throw via {@link assertAlive}. Use
   * only when the engine singleton will never be used again.
   */
  destroy(): void

  /**
   * Soft teardown (M09). Release canvas refs and event listeners but keep
   * the adapter reusable — the React canvas host calls this on unmount so
   * the shared engine singleton can be re-attached on the next mount
   * (StrictMode double-invoke, test re-renders). Idempotent. Does NOT mark
   * the adapter destroyed; {@link attachCanvases} / {@link resize} / etc.
   * remain callable afterward.
   */
  dispose(): void
}

/**
 * Guard: ensure a legacy global function exists before calling it.
 */
function requireLegacyFn(name: 'togglePlay' | 'restartAnim'): () => void {
  const fn = typeof window !== 'undefined' ? window[name] : undefined
  if (typeof fn !== 'function') {
    throw new Error(`Legacy Inkplainer ${name}() is unavailable (window.${name} is not set).`)
  }
  return fn
}

/**
 * Concrete `InkplainerEngine` backed by the frozen legacy runtime.
 *
 * Construction does NOT touch the DOM; it only allocates the event bus. The
 * legacy globals are resolved lazily on each call so the adapter is safe to
 * construct before the legacy app has booted (e.g. during shell mount).
 */
export class LegacyEngineAdapter implements InkplainerEngine {
  private readonly events = new LegacyEventBus()
  private canvases: CanvasHandles | null = null
  private destroyed = false

  attachCanvases(canvases: CanvasHandles): void {
    this.assertAlive()
    this.canvases = canvases
    const context = buildAnimationContext(this.canvases)
    const factory = (window as any).createLegacyAnimationEngine
    if (typeof factory !== 'function') {
      throw new Error('Legacy AnimationEngine factory not found. Did legacy/animations.js load?')
    }
    ;(window as any).AnimationEngine = factory(context)
  }

  async loadProject(project: ProjectDocument): Promise<void> {
    this.assertAlive()
    const legacy = requireLegacyState()
    applyProjectToLegacyState(legacy, project)
    // Apply geometry done; structural layer creation happens in M08.
    this.events.emit({ type: 'project-loaded' })
  }

  syncProject(project: ProjectDocument): void {
    this.assertAlive()
    const legacy = requireLegacyState()
    applyProjectToLegacyState(legacy, project)
    this.events.emit({ type: 'layers-changed' })
  }

  renderStatic(): void {
    this.assertAlive()
    if (!this.canvases) {
      throw new Error('LegacyEngineAdapter.renderStatic: canvases not attached.')
    }
    const legacy = requireLegacyState()

    // The inline text editor overlay acts as the live preview for the currently
    // editing text layer. The legacy engine needs to know to hide that layer
    // during static frame rendering to avoid double-rendering text.
    const w = window as any
    const editingId = w._ts?.active ? w._ts.editingId : null

    renderStaticFrame(this.canvases, legacy, editingId)
  }

  resize(displayWidth: number, displayHeight: number): void {
    this.assertAlive()
    if (!this.canvases) return

    const legacy = requireLegacyState()

    // Extract padding/margins based on what `fitCanvas` does in legacy.
    // The viewport container naturally handles padding, so we just use the provided
    // content-box display dimensions (displayWidth x displayHeight) from the ResizeObserver
    // minus the legacy safe margin (24px).
    const safeMargin = 24
    const availableW = Math.max(160, displayWidth - safeMargin)
    const availableH = Math.max(160, displayHeight - safeMargin)

    const s = Math.min(availableW / legacy.canvasW, availableH / legacy.canvasH, 1)

    const sw = legacy.canvasW * s + 'px'
    const sh = legacy.canvasH * s + 'px'

    this.canvases.main.style.width = sw
    this.canvases.main.style.height = sh
    this.canvases.hand.style.width = sw
    this.canvases.hand.style.height = sh
    this.canvases.selection.style.width = sw
    this.canvases.selection.style.height = sh
    this.canvases.outlineOverlay.style.width = sw
    this.canvases.outlineOverlay.style.height = sh

    // Only redraw the static scene if we aren't playing
    if (!legacy.playing) {
      this.renderStatic()
    }
  }

  play(): void {
    this.assertAlive()
    const legacy = requireLegacyState()
    if (legacy.done) {
      this.restart()
      return
    }
    if (!legacy.playing) {
      requireLegacyFn('togglePlay')()
    }
    this.events.emit({ type: 'playback', playing: true, done: legacy.done })
  }

  pause(): void {
    this.assertAlive()
    const legacy = requireLegacyState()
    if (legacy.playing) {
      requireLegacyFn('togglePlay')()
    }
    this.events.emit({ type: 'playback', playing: false, done: legacy.done })
  }

  restart(): void {
    this.assertAlive()
    requireLegacyFn('restartAnim')()
    this.events.emit({ type: 'playback', playing: true, done: false })
  }

  getProgress(): number {
    this.assertAlive()
    const legacy = requireLegacyState()
    const raw = legacy._animProgress
    return typeof raw === 'number' ? Math.min(Math.max(raw, 0), 1) : 0
  }

  getStatus(): PlaybackStatus {
    this.assertAlive()
    const legacy = requireLegacyState()
    return {
      playing: legacy.playing,
      done: legacy.done,
      progress: this.getProgress(),
    }
  }

  subscribe(listener: LegacyEngineListener): () => void {
    this.assertAlive()
    return this.events.subscribe(listener)
  }

  async exportVideo(config: VideoExportConfig, callbacks: ExportCallbacks): Promise<void> {
    this.assertAlive()
    if (!this.canvases) throw new Error('Cannot export: canvases not attached')
    if (typeof window === 'undefined') throw new Error('Cannot export: window undefined')

    await runLegacyExport(this.canvases, requireLegacyState(), config, callbacks, () =>
      this.restart(),
    )
  }

  destroy(): void {
    if (this.destroyed) return
    this.events.clear()
    this.canvases = null
    this.destroyed = true
  }

  /**
   * Soft teardown (M09). Releases canvas refs but keeps the adapter reusable
   * so the shared engine singleton survives React unmount/remount. Unlike
   * {@link destroy}, this does NOT set `destroyed` — `attachCanvases` and
   * subsequent calls remain valid.
   */
  dispose(): void {
    this.canvases = null
  }

  private assertAlive(): void {
    if (this.destroyed) {
      throw new Error('LegacyEngineAdapter has been destroyed.')
    }
  }
}

/**
 * A pass-through random source for production that delegates to the global Math.random.
 * In tests, Math.random is patched by withSeededRandom.
 */
class NativeRandomSource {
  get seed(): number {
    return 0
  }
  next(): number {
    return Math.random()
  }
  nextInt(n: number): number {
    return Math.floor(Math.random() * n)
  }
  reset(): void {
    // No-op for native random
  }
}

/**
 * Builds the `AnimationContext` bridge (M17) for the legacy animation engine.
 * Maps DOM interactions (e.g. `document.getElementById('hand-speed-slider').value`)
 * to their corresponding values in the legacy state / active slot.
 */
function buildAnimationContext(canvases: CanvasHandles) {
  const w = window as any
  return {
    get state() {
      return requireLegacyState()
    },
    main: canvases.main.getContext('2d', { willReadFrequently: true }),
    hand: canvases.hand.getContext('2d', { willReadFrequently: true }),
    get offscreen() {
      return w.offscreen
    },
    get canvasWidth() {
      return w.state?.canvasW ?? 1280
    },
    get canvasHeight() {
      return w.state?.canvasH ?? 720
    },

    fillBackground: (c: CanvasRenderingContext2D) => {
      const state = w.state
      renderBackground(
        c,
        state?.canvasBg,
        state?.canvasW ?? 1280,
        state?.canvasH ?? 720,
        !!state?._slotMode,
        state?.bgCanvas,
      )
    },
    drawHand: (c: CanvasRenderingContext2D, x: number, y: number, dir: number, hand: string) => {
      if (typeof w.drawHand === 'function') w.drawHand(c, x, y, dir, hand)
    },
    setProgress: (p: number) => {
      if (typeof w.setProgress === 'function') w.setProgress(p)
    },
    finish: () => {
      if (typeof w.finishAnim === 'function') w.finishAnim()
    },
    resScale: () => {
      const state = w.state
      return resScale(state?.canvasW ?? 1280, state?.canvasH ?? 720)
    },
    resPointScale: () => {
      const state = w.state
      return resPointScale(state?.canvasW ?? 1280, state?.canvasH ?? 720)
    },
    resSoftBlur: (c: CanvasRenderingContext2D) => {
      const state = w.state
      const blur = resSoftBlur(state?.canvasW ?? 1280, state?.canvasH ?? 720)
      if (blur > 0) {
        c.shadowBlur = blur
        c.shadowColor = 'black' // Or whatever default is assumed
      }
    },
    random: new NativeRandomSource(),

    getSetting: (id: string) => {
      const state = w.state
      if (!state) return undefined
      const layer = state._currentSlot?.layer

      switch (id) {
        case 'hand-speed-slider':
          return layer?.handSpeed ?? state.handSpeed ?? 6
        case 'speed-slider':
          return layer?.speed ?? state.speed ?? 40
        case 'tile-slider':
          return layer?.chunks ?? state.chunks ?? 30
        case 'spec-tile-slider':
          return layer?.specChunks ?? state.specChunks ?? 35
        case 'image-reveal':
          return state._revealStyle !== 'instant'
        case 'reveal-duration-slider':
          return state.revealDuration ?? 1.2

        // Outline settings
        case 'of-outline-autocolor':
        case 'text-outline-autocolor':
        case 'outlineonly-autocolor':
          return (layer?.outlineAutoColor ?? state.outlineAutoColor) !== false

        case 'of-outline-color':
        case 'text-outline-color':
        case 'outlineonly-color':
          return layer?.outlineColor ?? state.outlineColor ?? '#000000'

        case 'of-outline-thickness':
        case 'text-outline-thickness':
        case 'outlineonly-thickness':
          return layer?.outlineThickness ?? state.outlineThickness ?? 2

        case 'outlineonly-colorregion':
          return (layer?.outlineMode ?? state.outlineMode) === 'colorregion'
        case 'outlineonly-realimage':
          return (layer?.outlineMode ?? state.outlineMode) === 'realimage'

        case 'outline-opacity':
        case 'outline-opacity-val':
          return layer?.outlineOpacity ?? state.outlineOpacity ?? 100
        case 'outline-visible':
          return (layer?.outlineVisible ?? state.outlineVisible) !== false
      }
      return undefined
    },
  }
}

/**
 * Resolve the legacy canvas elements by ID. Used by the adapter until M09
 * moves canvas lifecycle into React. Returns null for any surface the legacy
 * DOM does not expose (e.g. handCanvas is created dynamically, so callers
 * must resolve it separately once the legacy app has booted).
 */
export function resolveLegacyCanvasHandles(): CanvasHandles | null {
  if (typeof document === 'undefined') return null
  const main = document.getElementById('main-canvas')
  const selection = document.getElementById('select-canvas')
  const outlineOverlay = document.getElementById('outline-overlay')
  // handCanvas is created dynamically by the legacy runtime and inserted
  // after main-canvas (legacy/index.html line 5606). Resolve by tag order.
  const hand =
    main?.nextElementSibling instanceof HTMLCanvasElement ? main.nextElementSibling : null
  if (
    !(main instanceof HTMLCanvasElement) ||
    !(selection instanceof HTMLCanvasElement) ||
    !(outlineOverlay instanceof HTMLCanvasElement) ||
    hand === null
  ) {
    return null
  }
  return { main, selection, outlineOverlay, hand }
}

// Re-export the projection + enum helpers so feature code imports only from
// this module.
export {
  projectLegacyState,
  applyProjectToLegacyState,
  requireLegacyState,
} from './legacy-state.adapter'
export { legacyAnimationStyleToDomain } from './legacy-enum-mapping'
export type { LegacyStateAdapter, LegacyProjectionResult } from './legacy-state.adapter'
export type { CanvasHandles, PlaybackStatus, RenderResolution } from './legacy-types'
export type { LegacyEngineEvent, LegacyEngineListener } from './legacy-events'
export { LegacyEventBus } from './legacy-events'
