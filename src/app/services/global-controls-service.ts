/**
 * Global editor controls service (M06).
 *
 * Coordinates the Header's global controls — undo, redo, export trigger —
 * between the React UI, the typed Zustand stores (for the depth badges +
 * dirty state), and the legacy runtime (which owns the actual snapshot /
 * restore / export pipeline until later migrations).
 *
 * Per the M06 plan: "no direct DOM mutation". The service never touches
 * `document.getElementById` or `innerHTML`; it reaches the legacy runtime
 * exclusively through guarded `window.*` calls. The store is the single
 * source of truth for button *enabled* state and badge counts; the legacy
 * runtime performs the side-effect.
 *
 * Behavior parity (vs legacy `legacy/index.html`):
 *   - `undo()` (5110): no-op if restoring or stack empty; pushes current
 *     onto redo, pops + applies snapshot. We delegate to `window.undo`.
 *   - `redo()` (5118): symmetric. We delegate to `window.redo`.
 *   - `openExportBanner()` (8974): shows the export banner. We delegate to
 *     `window.openExportBanner`.
 *   - Keyboard shortcuts (5167): Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or Y =
 *     redo, Space = play/pause, Delete/Backspace = remove selected layer.
 *     Space/Delete land in later migrations (M07/M10) once playback + layer
 *     selection are wired; M06 wires undo/redo shortcuts only.
 *
 * The undo/redo stack depth comes from the layer store, which is the typed
 * mirror of the legacy `_undoStack`/`_redoStack`. The legacy runtime remains
 * authoritative for the actual snapshot content; the store mirrors the
 * counts so the React badge UI can render without polling the legacy stack.
 */

import { useLayerStore } from '@/app/store'
import { exportService } from './export-service'

/** Guarded legacy function call. Throws a typed error if not booted. */
function callLegacy(
  name: 'undo' | 'redo' | 'openExportBanner' | 'closeExportBanner' | 'generate',
): void {
  if (typeof window === 'undefined') {
    throw new Error(`Legacy Inkplainer ${name} is unavailable (no window).`)
  }
  const fn = window[name]
  if (typeof fn !== 'function') {
    throw new Error(`Legacy Inkplainer ${name} is unavailable (window.${name} is not set).`)
  }
  fn()
}

/** True when the legacy `undo` global is present (i.e. legacy runtime booted). */
function legacyReady(): boolean {
  return typeof window !== 'undefined' && typeof window.undo === 'function'
}

/**
 * Global controls service. Each method is a thin delegate to the legacy
 * runtime + a store sync for the badge/enabled state.
 */
export const globalControlsService = {
  /** True when undo can run (stack non-empty + legacy booted). */
  canUndo(): boolean {
    return legacyReady() && useLayerStore.getState().canUndo()
  },

  /** True when redo can run. */
  canRedo(): boolean {
    return legacyReady() && useLayerStore.getState().canRedo()
  },

  /** Undo depth for the badge (legacy shows `_undoStack.length`). */
  undoDepth(): number {
    return useLayerStore.getState().undoStack.length
  },

  /** Redo depth for the badge. */
  redoDepth(): number {
    return useLayerStore.getState().redoStack.length
  },

  /**
   * Perform undo. Delegates to the legacy `undo` global (which owns the
   * snapshot/restore pipeline), then mirrors the stack depth into the typed
   * store so the badge updates. No-op if the legacy runtime is not booted.
   */
  undo(): void {
    if (!this.canUndo()) return
    callLegacy('undo')
    // The legacy undo/redo swaps the stacks internally; we mirror the depth
    // by popping undo + pushing redo in the store (matches legacy 5113-5114).
    useLayerStore.getState().undo()
  },

  /** Perform redo. Symmetric to `undo`. */
  redo(): void {
    if (!this.canRedo()) return
    callLegacy('redo')
    useLayerStore.getState().redo()
  },

  /**
   * Open the export banner. Delegates to the new export service (M15).
   */
  openExport(): void {
    if (!legacyReady()) return
    exportService.openDialog()
  },

  /** Close the export banner (also stops in-flight recording). */
  closeExport(): void {
    exportService.closeDialog()
  },

  /**
   * Regenerate the animation. Delegates to the legacy `generate` global
   * (legacy/index.html:5977). The new runtime will own this in M17+.
   */
  generate(): void {
    if (typeof window === 'undefined' || typeof window.generate !== 'function') return
    window.generate()
  },
}
