/**
 * Legacy runtime glue — public barrel for the legacy adapter boundary.
 *
 * This module is the single import path new code uses to reach the legacy
 * Inkplainer runtime. It re-exports the `InkplainerEngine` interface, the
 * concrete `LegacyEngineAdapter`, and the pure projection helpers from the
 * state adapter. Feature modules import from here (or from the adapter
 * directly); they must NOT import legacy globals (`window.state`,
 * `window.AnimationEngine`) directly.
 *
 * M03 establishes this boundary. The legacy app remains authoritative; this
 * barrel only presents a typed facade.
 */
export {
  type InkplainerEngine,
  LegacyEngineAdapter,
  resolveLegacyCanvasHandles,
  projectLegacyState,
  applyProjectToLegacyState,
  requireLegacyState,
  legacyAnimationStyleToDomain,
  type LegacyStateAdapter,
  type LegacyProjectionResult,
  type CanvasHandles,
  type PlaybackStatus,
  type RenderResolution,
  type LegacyEngineEvent,
  type LegacyEngineListener,
  LegacyEventBus,
} from './legacy-adapter'
export * from './legacy-enum-mapping'
export * from './legacy-id'
export * from './legacy-types'
