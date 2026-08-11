/**
 * Legacy runtime glue.
 *
 * M00 ships this as a thin, typed entry point for tests that need to drive
 * the legacy app. The full live adapter (wiring `window.state` to
 * `LegacyStateAdapter`) is M03. Here we only expose the pure projection
 * helpers from the adapter module so fixtures and behavior tests can build
 * domain documents from legacy-shaped inputs without a browser.
 */

export {
  projectLegacyState,
  applyProjectToLegacyState,
  requireLegacyState,
} from './legacy-state.adapter'
export type { LegacyStateAdapter, LegacyProjectionResult } from './legacy-state.adapter'
export * from './legacy-enum-mapping'
export * from './legacy-id'
