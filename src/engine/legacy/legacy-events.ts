/**
 * Legacy runtime event bridge (M03).
 *
 * The legacy Inkplainer app fires state changes through direct DOM mutation
 * and a handful of ad-hoc callbacks; it has no formal event bus. The new
 * typed engine adapter exposes a small subscribe/unsubscribe surface so
 * React state stores can react to legacy-driven changes (e.g. progress
 * advanced by the rAF loop, or the legacy UI flipped `state.playing`)
 * without polling.
 *
 * M03 only defines the contract and a minimal in-process emitter. The
 * concrete legacy → emitter wiring (hooking `setProgress`, `finishAnim`,
 * `updatePlayIcons`) is added in later migrations as each feature moves
 * over. No behavior changes here — this is pure plumbing.
 */

/** Kinds of legacy runtime events the adapter can surface. */
export type LegacyEngineEvent =
  | { readonly type: 'progress'; readonly value: number }
  | { readonly type: 'playback'; readonly playing: boolean; readonly done: boolean }
  | { readonly type: 'layers-changed' }
  | { readonly type: 'selection-changed'; readonly layerId: number | null }
  | { readonly type: 'project-loaded' }

/** Listener signature. */
export type LegacyEngineListener = (event: LegacyEngineEvent) => void

/**
 * Minimal in-process event emitter. The engine adapter owns one instance
 * and exposes `subscribe` through the `InkplainerEngine` interface.
 */
export class LegacyEventBus {
  private readonly listeners = new Set<LegacyEngineListener>()

  subscribe(listener: LegacyEngineListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(event: LegacyEngineEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}
