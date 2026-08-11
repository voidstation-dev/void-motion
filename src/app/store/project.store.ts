/**
 * Project store (M04) — bounded Zustand domain store for project-level state.
 *
 * Holds the currently-loaded project document (id, name, canvas, groups,
 * animation defaults, timestamps) and the project-list summaries. Per the
 * M04 rule: no non-serializable browser runtime objects live in Zustand —
 * runtime images live in the asset registry (M00 §14), the engine handles
 * playback. This store holds only serializable domain state.
 *
 * State changes that must reach the legacy runtime go through the engine
 * adapter (M03); this store does not import `window.*` directly.
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { WritableDraft } from 'immer'
import type {
  ProjectDocument,
  ProjectSummary,
  ProjectAnimationDefaults,
  LayerGroup,
} from '@/types/project'
import { DEFAULT_PROJECT_ANIMATION } from '@/types/project'
import type { ProjectId } from '@/types/brand'
import type { CanvasSettings } from '@/types/canvas'

/**
 * Coerce a readonly-shape domain value into a mutable draft for immer.
 * Domain documents use `readonly` arrays/fields (so consumers can't mutate
 * them); immer needs a mutable draft on assignment. This is a structural
 * cast only — immer freezes the draft after `set`, so no mutation escapes.
 */
function asDraft<T>(value: readonly T[]): T[] {
  return [...value] as T[]
}

/** The project domain slice. */
export interface ProjectState {
  /** The full document of the currently-loaded project, or null if none. */
  current: ProjectDocument | null
  /** Project-list summaries for the open/recent list UI. */
  summaries: ProjectSummary[]
  /** Dirty flag — set when unsaved edits exist. Legacy autosave at 5000ms. */
  dirty: boolean
  /** True while a load/save is in flight. */
  saving: boolean

  // ── actions ──
  setCurrent(project: ProjectDocument): void
  setName(name: string): void
  setCanvas(canvas: CanvasSettings): void
  setAnimationDefaults(defaults: Partial<ProjectAnimationDefaults>): void
  setGroups(groups: readonly LayerGroup[]): void
  setSummaries(summaries: readonly ProjectSummary[]): void
  markDirty(): void
  markClean(): void
  setSaving(saving: boolean): void
  clear(): void
}

/** Empty project summary list state — no project loaded. */
export const EMPTY_PROJECT_STATE: Pick<ProjectState, 'current' | 'summaries' | 'dirty' | 'saving'> =
  {
    current: null,
    summaries: [],
    dirty: false,
    saving: false,
  }

/** Build a fresh empty project document for "New Project". */
export function buildNewProject(
  id: ProjectId,
  name: string,
  now: string,
  canvas: CanvasSettings,
): ProjectDocument {
  return {
    schemaVersion: 1,
    id,
    name,
    canvas,
    layers: [],
    groups: [],
    animation: DEFAULT_PROJECT_ANIMATION,
    createdAt: now,
    updatedAt: now,
  }
}

export const useProjectStore = create<ProjectState>()(
  immer((set) => ({
    ...EMPTY_PROJECT_STATE,

    setCurrent(project) {
      set((s) => {
        s.current = {
          ...project,
          layers: asDraft(project.layers),
          groups: asDraft(project.groups),
        } as WritableDraft<ProjectDocument>
        s.dirty = false
      })
    },
    setName(name) {
      set((s) => {
        if (s.current) {
          s.current = { ...s.current, name }
          s.dirty = true
        }
      })
    },
    setCanvas(canvas) {
      set((s) => {
        if (s.current) {
          s.current = { ...s.current, canvas }
          s.dirty = true
        }
      })
    },
    setAnimationDefaults(defaults) {
      set((s) => {
        if (s.current) {
          s.current = {
            ...s.current,
            animation: { ...s.current.animation, ...defaults },
          }
          s.dirty = true
        }
      })
    },
    setGroups(groups) {
      set((s) => {
        if (s.current) {
          s.current = { ...s.current, groups: asDraft(groups) } as WritableDraft<ProjectDocument>
          s.dirty = true
        }
      })
    },
    setSummaries(summaries) {
      set((s) => {
        s.summaries = asDraft(summaries)
      })
    },
    markDirty() {
      set((s) => {
        s.dirty = true
      })
    },
    markClean() {
      set((s) => {
        s.dirty = false
      })
    },
    setSaving(saving) {
      set((s) => {
        s.saving = saving
      })
    },
    clear() {
      set((s) => {
        s.current = null
        s.dirty = false
        s.saving = false
      })
    },
  })),
)

// ── selectors ──

export function selectCurrentProject(s: ProjectState): ProjectDocument | null {
  return s.current
}

export function selectProjectName(s: ProjectState): string {
  return s.current?.name ?? 'Untitled'
}

export function selectIsDirty(s: ProjectState): boolean {
  return s.dirty
}

export function selectIsSaving(s: ProjectState): boolean {
  return s.saving
}

export function selectProjectSummaries(s: ProjectState): readonly ProjectSummary[] {
  return s.summaries
}
