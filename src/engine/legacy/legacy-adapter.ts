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
import { LegacyEventBus, type LegacyEngineListener } from './legacy-events'

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
    // The legacy runtime renders the static frame as part of setupStyle/reset
    // before playback. There is no standalone legacy `renderStatic`; M03 only
    // surfaces the contract. The concrete call is wired in M19 (renderer
    // migration). For now we require canvases to be attached (so the
    // contract is honest) and no-op the actual draw until the renderer is
    // migrated.
    if (this.canvases === null) {
      throw new Error('LegacyEngineAdapter.renderStatic: canvases not attached.')
    }
  }

  resize(displayWidth: number, displayHeight: number): void {
    this.assertAlive()
    // No-op until canvases are attached (M09 contract honesty). The legacy
    // `fitCanvas` (legacy/index.html ~5660) scales the canvas-wrapper to the
    // viewport while keeping the internal bitmap at state.canvasW/H; the
    // concrete resize is wired in M19 (renderer migration).
    if (this.canvases === null) return
    void displayWidth
    void displayHeight
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
