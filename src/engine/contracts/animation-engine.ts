/**
 * Engine contract: the animation engine interface.
 *
 * M00 declares the contract; the implementation is migrated in M17–M31.
 * During the parity phase the legacy engine runs behind the adapter
 * (`src/engine/legacy/`), and this interface is what the future React
 * application layer will program against.
 *
 * Per the master plan §4.3, the dependency direction is:
 *   React → Application → Engine → Canvas
 * The engine must never import React or Zustand.
 */

import type { ProjectDocument } from '../../types/project'
import type { PlaybackStatus } from '../../types/animation'
import type { CanvasRuntime } from '../../types/runtime'

/**
 * Handles to the runtime canvases the engine renders into.
 * React owns the DOM canvas elements; the engine owns rendering.
 */
export interface CanvasHandles {
  readonly mainCanvas: HTMLCanvasElement
  readonly selectionCanvas: HTMLCanvasElement
  readonly cropCanvas?: HTMLCanvasElement
}

/**
 * The engine API the application layer consumes.
 *
 * This is the target shape after the full engine migration. During M00–M16
 * the legacy adapter provides a thin implementation that delegates to the
 * legacy `window.AnimationEngine` globals.
 */
export interface AnimationEngine {
  attachCanvases(canvases: CanvasHandles): void

  loadProject(project: ProjectDocument): Promise<void>
  syncProject(project: ProjectDocument): void

  /** Render the current project state statically (no animation). */
  renderStatic(): void

  play(): void
  pause(): void
  restart(): void

  getProgress(): number
  getStatus(): PlaybackStatus

  destroy(): void
}

/**
 * Future deterministic frame renderer contract (M42). Declared now so the
 * export service contract (M41) can reference it; NOT implemented in M00.
 */
export interface FrameRenderer {
  renderFrame(project: ProjectDocument, timestampMs: number, runtime: CanvasRuntime): Promise<void>
}
