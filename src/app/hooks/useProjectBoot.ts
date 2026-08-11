/**
 * Project boot hook (M05).
 *
 * On mount, loads the most-recent project (or creates one) — the React
 * equivalent of the legacy startup path (legacy/index.html:5277). Behavior
 * parity: if no projects exist, create a fresh one; otherwise load the one
 * with the newest `modifiedAt`.
 *
 * The hook is defensive: if the legacy storage adapter has not booted (no
 * `window.saveProject`/`loadProject`), it does nothing, so the shell renders
 * without a loaded project. This keeps the hook safe in jsdom tests where
 * the legacy runtime is not present.
 */
import { useEffect } from 'react'
import { projectService } from '@/app/services/project-service'

export function useProjectBoot(): void {
  useEffect(() => {
    // Run once at mount. `projectService.bootstrap` is a stable module
    // method with no external deps, so an empty dep array is correct.
    void projectService.bootstrap()
  }, [])
}
