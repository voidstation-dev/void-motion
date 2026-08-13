/**
 * Legacy storage adapter (M05).
 *
 * The typed boundary between the new Project Service and the frozen legacy
 * IndexedDB persistence layer. Per the M05 architecture:
 *
 * ```text
 * React Project UI
 *      ↓
 * Project Zustand Store
 *      ↓
 * Project Service
 *      ↓
 * Legacy Storage Adapter   ← this module
 *      ↓
 * legacy window.* + IndexedDB
 * ```
 *
 * The adapter implementation MAY touch the legacy IndexedDB globals (that is
 * its purpose); the rest of the application may not. It exposes a typed
 * `LegacyProjectStorage` interface so the Project Service never reaches for
 * `window.saveProject`, the raw IDB object store, or `currentProjectId`
 * directly.
 *
 * Persistence itself is NOT migrated here — per M05 "Do NOT yet migrate",
 * the IndexedDB implementation stays legacy. This adapter only presents the
 * legacy storage surface through a typed, guarded boundary. The native
 * filesystem + project file format land in M32.
 *
 * Legacy references:
 *   - `saveProject`            (legacy/index.html:4272)
 *   - `loadProject`            (legacy/index.html:4376)
 *   - `createNewProject`      (legacy/index.html:4639)
 *   - `deleteProject`         (legacy/index.html:4685)
 *   - `refreshProjectsList`   (legacy/index.html:4709)
 *   - `currentProjectId`      (legacy/index.html:4234)
 *   - `generateRandomName`    (legacy/index.html:4241)
 *   - `scheduleAutoSave`      (legacy/index.html:4876)
 *   - `updateLastSaveTime`    (legacy/index.html:4862)
 *   - `updateProjectNameDisplay` (legacy/index.html:4848)
 */
import type { LegacyProjectRecord } from './legacy-state.types'

/**
 * Guarded accessor for a legacy `window` function. Returns the function or
 * throws a typed error if the legacy runtime has not booted. Mirrors the
 * `requireLegacyFn` pattern from `legacy-adapter.ts` but is local to the
 * storage surface so the two stay independently testable.
 */
function requireWindowFn<
  K extends keyof Pick<
    Window,
    | 'saveProject'
    | 'loadProject'
    | 'createNewProject'
    | 'deleteProject'
    | 'refreshProjectsList'
    | 'renameProject'
  >,
>(name: K): NonNullable<Window[K]> {
  if (typeof window === 'undefined') {
    throw new Error(`Legacy Inkplainer ${String(name)} is unavailable (no window).`)
  }
  const fn = window[name]
  if (typeof fn !== 'function') {
    throw new Error(
      `Legacy Inkplainer ${String(name)} is unavailable (window.${String(name)} is not set).`,
    )
  }
  return fn as NonNullable<Window[K]>
}

/** Read the legacy `currentProjectId` global, guarded. */
export function readCurrentProjectId(): number | null {
  if (typeof window === 'undefined') return null
  const id = window.currentProjectId
  return typeof id === 'number' ? id : null
}

/** Read the legacy `db` readiness by probing `saveProject` presence. */
export function isLegacyStorageReady(): boolean {
  if (typeof window === 'undefined') return false
  return (
    typeof window.saveProject === 'function' &&
    typeof window.loadProject === 'function' &&
    window.__VOID_MOTION_STORAGE_READY__ !== false
  )
}

/**
 * The typed project storage surface the Project Service consumes.
 *
 * Every method maps 1:1 to a legacy global function so behavior is
 * preserved exactly — including the legacy quirk that `saveProject` /
 * `loadProject` are fire-and-forget (no return value), and that
 * `createNewProject` returns a Promise (legacy `async function`).
 */
export interface LegacyProjectStorage {
  /** Save the currently-loaded project (legacy `saveProject`). */
  save(projectId?: number): void
  /** Load a project by IndexedDB key (legacy `loadProject`). */
  load(projectId: number): Promise<void>
  /** Create + load a fresh project (legacy `createNewProject`). */
  createNew(): Promise<void>
  /** Persist a project name immediately. */
  rename(projectId: number, name: string): Promise<boolean>
  /** Delete a project by key (legacy `deleteProject`). */
  delete(projectId: number): Promise<boolean>
  /** Rebuild the project list UI + return nothing (legacy `refreshProjectsList`). */
  refreshList(): void
  /** True when the legacy IndexedDB runtime has booted. */
  ready(): boolean
  /** The legacy `currentProjectId`, or null. */
  currentId(): number | null
}

/**
 * Concrete storage adapter backed by the legacy globals.
 *
 * Construction does NOT touch the DOM; legacy globals are resolved lazily on
 * each call so the adapter is safe to construct before the legacy app boots.
 */
export class LegacyStorageAdapter implements LegacyProjectStorage {
  save(projectId?: number): void {
    const fn = requireWindowFn('saveProject')
    // Legacy signature is `saveProject(projectId = currentProjectId)`.
    if (projectId === undefined) {
      fn()
    } else {
      fn(projectId)
    }
  }

  load(projectId: number): Promise<void> {
    const fn = requireWindowFn('loadProject')
    return new Promise((resolve) => {
      fn(projectId, () => resolve())
    })
  }

  async createNew(): Promise<void> {
    const fn = requireWindowFn('createNewProject')
    await fn()
  }

  async rename(projectId: number, name: string): Promise<boolean> {
    return Boolean(await requireWindowFn('renameProject')(projectId, name))
  }

  delete(projectId: number): Promise<boolean> {
    const fn = requireWindowFn('deleteProject')
    return new Promise((resolve) => {
      // React owns the confirmation prompt, so skip the duplicate legacy
      // prompt and resolve only after IndexedDB (and any replacement project)
      // has settled.
      fn(projectId, { stopPropagation() {} }, (deleted) => resolve(deleted), true)
    })
  }

  refreshList(): void {
    requireWindowFn('refreshProjectsList')()
  }

  ready(): boolean {
    return isLegacyStorageReady()
  }

  currentId(): number | null {
    return readCurrentProjectId()
  }
}

/**
 * Read the legacy project records straight from IndexedDB. Used by the
 * Project Service to build the typed `ProjectSummary[]` list without going
 * through the legacy DOM-rendering path (`refreshProjectsList` writes to
 * `innerHTML`, which the new UI does not consume).
 *
 * Opens its own short-lived read transaction against the legacy DB
 * `WhiteboardAnimatorDB` / `projects` store (legacy/index.html:4250). This
 * does NOT mutate anything — it is a read. Resolves to an empty array when
 * IndexedDB is unavailable (e.g. in tests / before legacy boot).
 */
export function readLegacyProjectRecords(): Promise<LegacyProjectRecord[]> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined' || typeof indexedDB.open !== 'function') {
      resolve([])
      return
    }
    let db: IDBDatabase | null = null
    const open = indexedDB.open('WhiteboardAnimatorDB')
    open.onerror = () => resolve([])
    open.onupgradeneeded = () => {
      // The legacy app creates the store; if we are first to open (legacy not
      // booted), do nothing — resolve empty. Close without creating.
      db = open.result
      db.close()
      resolve([])
    }
    open.onsuccess = () => {
      db = open.result
      // Guard: the legacy DB may exist without the `projects` store if the
      // legacy app never ran in this origin.
      if (!db.objectStoreNames.contains('projects')) {
        db.close()
        resolve([])
        return
      }
      try {
        const tx = db.transaction(['projects'], 'readonly')
        const store = tx.objectStore('projects')
        const req = store.getAll()
        req.onsuccess = () => {
          const result = Array.isArray(req.result) ? (req.result as LegacyProjectRecord[]) : []
          db?.close()
          resolve(result)
        }
        req.onerror = () => {
          db?.close()
          resolve([])
        }
      } catch {
        db?.close()
        resolve([])
      }
    }
  })
}

/**
 * Compute the serialized size of a legacy project record, matching the
 * legacy `refreshProjectsList` calculation (legacy/index.html:4755):
 * `new Blob([JSON.stringify(project.state || {})]).size`.
 *
 * Exposed for the Project Service so the summary list shows the same byte
 * count as the legacy UI without duplicating the formula.
 */
export function legacyProjectSizeBytes(record: LegacyProjectRecord): number {
  const json = JSON.stringify(record.state ?? {})
  if (typeof Blob === 'function') {
    return new Blob([json]).size
  }
  // Node/jsdom without Blob — fall back to UTF-8 byte length.
  return new TextEncoder().encode(json).length
}
