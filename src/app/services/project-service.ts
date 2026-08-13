/**
 * Project service (M05).
 *
 * Orchestrates the project lifecycle (create / rename / load / list / delete
 * / autosave) between the React Project UI, the Project Zustand store, and
 * the Legacy Storage Adapter. This is the M05 architecture middle layer:
 *
 * ```text
 * React Project UI
 *      ↓
 * Project Zustand Store
 *      ↓
 * Project Service        ← this module
 *      ↓
 * Legacy Storage Adapter
 * ```
 *
 * Per M05 "Do NOT yet migrate", IndexedDB stays the persistence engine and is
 * only touched through the legacy storage adapter. The service does NOT
 * re-implement persistence; it coordinates the typed store with the frozen
 * legacy persistence surface.
 *
 * Behavior preservation notes (vs legacy `legacy/index.html`):
 *   - `createNewProject` (4639): builds a clean default state, adds to DB,
 *     loads it, refreshes list. Here we delegate to the legacy
 *     `createNewProject` global (which already does all of that) and then
 *     hydrate the store from the resulting legacy state.
 *   - `loadProject` (4376): reads from DB, applies to `window.state`. The
 *     legacy `loadProject` is fire-and-forget (IDB callback), so we hydrate
 *     on a microtask after delegating. Hydration is idempotent — re-running
 *     it once the legacy state is settled is safe.
 *   - `finishRenaming` (4809): updates the DB record's `name`/`modifiedAt`,
 *     updates the display, schedules autosave. We rename by writing through
 *     the store (typed) and the legacy display, then schedule a save.
 *   - `scheduleAutoSave` (4876): clears any pending timer and sets a fresh
 *     5-second `setTimeout(saveProject)`. We reproduce the 5000ms debounce
 *     exactly.
 *   - Startup (5277): if no projects exist, create one; else load the most
 *     recently modified.
 */

import { useProjectStore, useUiStore } from '@/app/store'
import { hydrateStoresFromLegacyState } from '@/app/store/hydrate'
import {
  LegacyStorageAdapter,
  legacyProjectSizeBytes,
  readCurrentProjectId,
  readLegacyProjectRecords,
} from '@/engine/legacy/legacy-storage-adapter'
import { requireLegacyState } from '@/engine/legacy/legacy-state.adapter'
import { fromLegacyProjectId, toLegacyProjectId } from '@/engine/legacy/legacy-id'
import type { ProjectSummary } from '@/types/project'
import type { ProjectId } from '@/types/brand'
import { generateRandomName } from './project-name'

/** Legacy autosave debounce (legacy/index.html:4879). */
export const AUTOSAVE_DEBOUNCE_MS = 5000

/** Shared singleton storage adapter — one legacy boundary for the whole app. */
const storage = new LegacyStorageAdapter()

/**
 * Resolve the legacy current project id, falling back to a value derived
 * from the store's loaded project. The legacy `currentProjectId` global is
 * authoritative; the store id is a mirror.
 */
function resolveCurrentLegacyId(): number | null {
  const legacyId = readCurrentProjectId()
  if (legacyId !== null) return legacyId
  const doc = useProjectStore.getState().current
  return doc ? toLegacyProjectId(doc.id) : null
}

/** Build the typed summary list from the raw legacy IndexedDB records. */
async function buildSummaries(): Promise<ProjectSummary[]> {
  const records = await readLegacyProjectRecords()
  // Sort by modifiedAt descending — matches legacy refreshProjectsList (4753).
  const sorted = [...records].sort(
    (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
  )
  return sorted.map((r) => ({
    id: fromLegacyProjectId(r.id),
    name: r.name,
    createdAt: r.createdAt,
    modifiedAt: r.modifiedAt,
    sizeBytes: legacyProjectSizeBytes(r),
  }))
}

/**
 * Project service. A thin module of async functions — no class state beyond
 * the autosave timer. UI components call these; they must not touch the
 * legacy storage adapter or `window.*` directly.
 */
export const projectService = {
  /**
   * Load the most-recent project at startup, or create one if none exists.
   * Mirrors the legacy boot path (legacy/index.html:5277).
   */
  async bootstrap(): Promise<void> {
    if (!storage.ready()) {
      // Legacy storage not booted (tests / first paint). Create nothing yet.
      return
    }
    const records = await readLegacyProjectRecords()
    if (records.length === 0) {
      await this.createNew()
      return
    }
    const sorted = [...records].sort(
      (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
    )
    const first = sorted[0]
    if (first) {
      await this.load(fromLegacyProjectId(first.id))
    }
  },

  /**
   * Create a fresh project. Delegates to the legacy `createNewProject` (which
   * builds the clean-state record, inserts it, loads it, and refreshes the
   * list), then hydrates the typed store from the resulting legacy state.
   */
  async createNew(): Promise<ProjectId | null> {
    // Prime the store with a tentative name so the UI can render immediately.
    useProjectStore.getState().setName(generateRandomName())
    await storage.createNew()
    await this.hydrateCurrentFromLegacy()
    await this.refreshList()
    return useProjectStore.getState().current?.id ?? null
  },

  /**
   * Load a project by id. Delegates to the legacy `loadProject` (IDB read +
   * apply to `window.state`), then hydrates the typed store.
   *
   * Legacy `loadProject` is fire-and-forget over IDB, so hydration runs on a
   * microtask. Re-hydrating is idempotent.
   */
  async load(id: ProjectId): Promise<void> {
    const legacyId = toLegacyProjectId(id)
    await storage.load(legacyId)
    await this.hydrateCurrentFromLegacy()
  },

  /**
   * Rename the current project. Updates the typed store, pushes the new name
   * to the legacy display, and schedules an autosave (matching legacy
   * `finishRenaming` at legacy/index.html:4809).
   */
  rename(name: string): void {
    const trimmed = name.trim()
    if (!trimmed) return
    useProjectStore.getState().setName(trimmed)
    if (typeof window !== 'undefined' && typeof window.updateProjectNameDisplay === 'function') {
      window.updateProjectNameDisplay(trimmed)
    }
    const id = resolveCurrentLegacyId()
    if (id !== null && typeof window.renameProject === 'function') {
      void storage.rename(id, trimmed).then(() => this.refreshList())
    }
    this.scheduleAutosave()
  },

  /**
   * Delete a project after the React sheet has confirmed it. The adapter
   * resolves only after IndexedDB and any replacement current project settle,
   * preventing a stale list/current-project hydration race.
   */
  async delete(id: ProjectId): Promise<void> {
    const legacyId = toLegacyProjectId(id)
    const wasCurrent = readCurrentProjectId() === legacyId
    const deleted = await storage.delete(legacyId)
    if (!deleted) return
    if (wasCurrent) await this.hydrateCurrentFromLegacy()
    await this.refreshList()
  },

  /**
   * Rebuild the typed summary list from legacy IDB and push it to the store.
   */
  async refreshList(): Promise<void> {
    const summaries = await buildSummaries()
    useProjectStore.getState().setSummaries(summaries)
  },

  /**
   * Save the current project immediately (legacy `saveProject`).
   */
  saveNow(): void {
    const id = resolveCurrentLegacyId()
    if (id === null) return
    storage.save(id)
    useProjectStore.getState().markClean()
  },

  /**
   * Debounced autosave — 5s after the last change. Matches legacy
   * `scheduleAutoSave` (legacy/index.html:4876). Clears any pending timer.
   */
  scheduleAutosave(): void {
    this.clearAutosave()
    const id = resolveCurrentLegacyId()
    if (id === null) return
    useProjectStore.getState().markDirty()
    pendingTimer = setTimeout(() => {
      storage.save(id)
      useProjectStore.getState().markClean()
    }, AUTOSAVE_DEBOUNCE_MS)
  },

  /** Cancel any pending autosave timer. */
  clearAutosave(): void {
    if (pendingTimer !== null) {
      clearTimeout(pendingTimer)
      pendingTimer = null
    }
  },

  /** Open the projects list sheet. Mirrors legacy `openProjectsModal`. */
  openProjects(): Promise<void> {
    return this.refreshList().then(() => {
      useUiStore.getState().setProjectListOpen(true)
    })
  },

  /** Close the projects list sheet. Mirrors legacy `closeProjectsModal`. */
  closeProjects(): void {
    useUiStore.getState().setProjectListOpen(false)
  },

  /**
   * Hydrate the typed stores from the live legacy state + the current
   * project record. No-op if the legacy runtime has not booted. Uses the
   * storage adapter's readiness check + the legacy state adapter's guarded
   * accessor — never reads `window.state` directly.
   */
  async hydrateCurrentFromLegacy(): Promise<void> {
    if (!storage.ready()) return
    const id = readCurrentProjectId()
    if (id === null) return
    let name = 'Untitled'
    let createdAt = new Date().toISOString()
    let updatedAt = new Date().toISOString()
    try {
      const records = await readLegacyProjectRecords()
      const record = records.find((r) => r.id === id)
      if (record) {
        name = record.name
        createdAt = record.createdAt
        updatedAt = record.modifiedAt
      }
    } catch {
      // Fall back to defaults — legacy state is still authoritative.
    }
    // `requireLegacyState` throws if the legacy runtime isn't present; guard
    // with `storage.ready()` first so this is a no-op rather than a throw.
    const legacy = requireLegacyState()
    hydrateStoresFromLegacyState(legacy, id, name, createdAt, updatedAt)
  },
}

/** Module-scoped autosave timer. Null when idle. */
let pendingTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Test helper: reset the project service module state (clear the autosave
 * timer). Only for use in unit tests.
 */
export function resetProjectServiceForTests(): void {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer)
    pendingTimer = null
  }
}
