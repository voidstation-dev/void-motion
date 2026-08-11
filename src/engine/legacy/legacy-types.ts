/**
 * Legacy runtime canvas + playback types (M03).
 *
 * The legacy Inkplainer runtime owns four canvas surfaces and a playback
 * loop. These types let the new typed engine adapter (`legacy-adapter.ts`)
 * refer to those surfaces through a typed handle instead of reaching into
 * `document.getElementById` or `window` globals directly from feature code.
 *
 * Legacy canvas IDs (legacy/index.html lines 5603-5612, 3808-3823):
 *   - `main-canvas`        — the primary animation target
 *   - `select-canvas`      — selection / transform overlay
 *   - `outline-overlay`    — outline-only draw overlay (positioned over main)
 *   - `handCanvas`         — the moving hand; created dynamically and inserted
 *                            after main-canvas (legacy/index.html line 5606)
 */

/**
 * Handles to the four legacy canvas surfaces. React owns the <canvas>
 * element lifecycle (M09) and passes them in via `attachCanvases`; before
 * M09 the legacy adapter resolves them by ID from the DOM.
 */
export interface CanvasHandles {
  /** Primary animation target (`main-canvas`). */
  readonly main: HTMLCanvasElement
  /** Selection / transform overlay (`select-canvas`). */
  readonly selection: HTMLCanvasElement
  /** Outline-only draw overlay (`outline-overlay`). */
  readonly outlineOverlay: HTMLCanvasElement
  /** Moving-hand overlay; created dynamically by the legacy runtime. */
  readonly hand: HTMLCanvasElement
}

/**
 * Playback status as surfaced from the legacy runtime. Mirrors the three
 * flags the legacy UI reads: `state.playing`, `state.done`, and the derived
 * `state._animProgress` (legacy/index.html line 8571 `setProgress`).
 */
export interface PlaybackStatus {
  readonly playing: boolean
  readonly done: boolean
  readonly progress: number
}

/**
 * Render target resolution request. The legacy runtime derives canvas size
 * from `state.canvasW` / `state.canvasH`; the adapter applies these when
 * the caller wants to render at a specific size (export path, M42+).
 */
export interface RenderResolution {
  readonly width: number
  readonly height: number
}
