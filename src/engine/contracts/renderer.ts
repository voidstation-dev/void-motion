/**
 * Engine contract: the renderer.
 *
 * Migrates in M19 (Core Renderer Migration to TypeScript). Declared here so
 * the engine boundary is stable from M00; not implemented in this phase.
 */

import type { ProjectDocument } from '../../types/project'
import type { CanvasRuntime } from '../../types/runtime'

/** Static project rendering (no animation). Migrates in M19. */
export interface ProjectRenderer {
  render(project: ProjectDocument, runtime: CanvasRuntime): void
  renderBackground(project: ProjectDocument, ctx: CanvasRenderingContext2D): void
  renderLayers(project: ProjectDocument, ctx: CanvasRenderingContext2D): void
  renderSelection(
    project: ProjectDocument,
    ctx: CanvasRenderingContext2D,
    selectedLayerId: string | null,
  ): void
}

/** Resolution scaling helpers. Legacy `resScale`/`resPointScale`/`resSoftBlur`
 * (`legacy/index.html:5637`). Migrated in M19. */
export interface ResolutionScaler {
  /** Factor relative to the 720p baseline. */
  scale(): number
  pointScale(): number
  softBlur(): number
}
