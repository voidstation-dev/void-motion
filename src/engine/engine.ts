/**
 * Engine singleton (M09).
 *
 * The single `InkplainerEngine` instance the React app consumes. Until M16
 * (legacy co-hosting) the legacy runtime is NOT loaded in the React shell,
 * so adapter calls are no-ops — but the singleton + `attachCanvases`/
 * `resize`/`render`/`dispose` contract is in place so the React canvas host
 * owns the `<canvas>` element lifecycle and hands them to the engine.
 *
 * Feature code imports the engine from here (never constructs its own
 * adapter), keeping one engine boundary for the whole app.
 */
import { LegacyEngineAdapter } from '@/engine/legacy/legacy-adapter'
import type { InkplainerEngine } from '@/engine/legacy/legacy-adapter'

/** The single engine instance for the React app. */
export const engine: InkplainerEngine = new LegacyEngineAdapter()
