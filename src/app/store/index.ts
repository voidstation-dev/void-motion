/**
 * Bounded Zustand store barrel (M04).
 *
 * Exports the 8 domain stores + their selectors. Per the M04 rule, no single
 * `useAppStore` with 200 fields; each domain has its own bounded store, and
 * feature code imports only the slice it needs.
 */
export * from './project.store'
export * from './layer.store'
export * from './canvas.store'
export * from './selection.store'
export * from './animation.store'
export * from './playback.store'
export * from './export.store'
export * from './ui.store'
export * from './hydrate'
