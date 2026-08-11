/**
 * Legacy → Zustand hydration (M04 exit criterion).
 *
 * Projects the frozen legacy `state` object (via the M03 adapter boundary)
 * into the bounded Zustand stores so the React shell can render against a
 * typed, serializable view of the legacy runtime. The legacy runtime remains
 * authoritative; this is a one-way read used at shell mount time.
 *
 * The reverse direction (store → legacy) happens through the engine adapter
 * (`LegacyEngineAdapter.syncProject`) once React becomes the source of truth
 * in later migrations.
 */
import type { LegacyInkplainerState } from '@/engine/legacy/legacy-state.types'
import { projectLegacyState } from '@/engine/legacy/legacy-state.adapter'
import { fromLegacyProjectId } from '@/engine/legacy/legacy-id'
import type { ProjectId } from '@/types/brand'
import { useProjectStore } from './project.store'
import { useLayerStore } from './layer.store'
import { useCanvasStore } from './canvas.store'
import { useAnimationStore } from './animation.store'

/**
 * Hydrate the bounded stores from the live legacy `state`. Reads the legacy
 * state through the adapter projection, then writes each slice into its store.
 *
 * @param legacy the legacy `window.state` object (NOT `window` itself)
 * @param projectId numeric legacy DB key → branded ProjectId
 * @param name project display name
 * @param createdAt ISO timestamp
 * @param updatedAt ISO timestamp
 */
export function hydrateStoresFromLegacyState(
  legacy: LegacyInkplainerState,
  projectId: number,
  name: string,
  createdAt: string,
  updatedAt: string,
): ProjectId {
  const { project } = projectLegacyState(
    legacy,
    fromLegacyProjectId(projectId),
    name,
    createdAt,
    updatedAt,
  )

  useProjectStore.getState().setCurrent(project)
  useLayerStore.getState().setLayers(project.layers)
  useLayerStore.getState().setGroups(project.groups)
  useCanvasStore.getState().setCanvas(project.canvas)
  useAnimationStore.getState().setDefaults(project.animation)
  return project.id
}
