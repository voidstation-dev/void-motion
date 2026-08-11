/**
 * Engine contract: project runtime.
 *
 * Bridges serializable project state and the runtime asset registry. The
 * application layer uses this to load a project into the engine without
 * touching legacy globals directly (M03 scope).
 */

import type { ProjectDocument } from '../../types/project'
import type { RuntimeAssetRegistry } from '../../types/runtime'

/** Manages the runtime resources backing a loaded project. */
export interface ProjectRuntime {
  /** The currently loaded project document, or null if none. */
  getProject(): ProjectDocument | null
  /** Asset registry holding the runtime images for the loaded project. */
  getAssetRegistry(): RuntimeAssetRegistry
  /** Replace the active project. */
  setProject(project: ProjectDocument): void
  /** Release all runtime resources. */
  dispose(): void
}
