/**
 * Legacy ↔ domain ID conversion.
 *
 * Legacy IDs are bare numbers: layer IDs come from a `let _layerIdCounter`
 * incremented per layer (`legacy/index.html:5791`); group IDs from a
 * separate counter (`legacy/index.html:6461`); project IDs are IndexedDB
 * auto-increment keys. The new domain model uses branded string IDs.
 *
 * Conversion happens exclusively here (and in the adapter). Per MIGRATION_00
 * §6, legacy numeric IDs must not leak into the new domain model.
 */

import type { AnimationGroupId, AssetId, LayerGroupId, LayerId, ProjectId } from '../../types/brand'

/** Convert a legacy numeric layer ID to a branded domain `LayerId`. */
export function fromLegacyLayerId(id: number): LayerId {
  return String(id) as LayerId
}

/** Convert a domain `LayerId` back to the legacy numeric layer ID. */
export function toLegacyLayerId(id: LayerId): number {
  return Number(id)
}

/** Convert a legacy numeric group ID to a branded domain `LayerGroupId`. */
export function fromLegacyGroupId(id: number): LayerGroupId {
  return String(id) as LayerGroupId
}

/** Convert a domain `LayerGroupId` back to the legacy numeric group ID. */
export function toLegacyGroupId(id: LayerGroupId): number {
  return Number(id)
}

/** Convert a legacy numeric animation-group ID to a branded `AnimationGroupId`. */
export function fromLegacyAnimationGroupId(id: number): AnimationGroupId {
  return String(id) as AnimationGroupId
}

/** Convert a legacy IndexedDB project key to a branded `ProjectId`. */
export function fromLegacyProjectId(id: number): ProjectId {
  return String(id) as ProjectId
}

/** Convert a domain `ProjectId` back to the legacy IndexedDB key. */
export function toLegacyProjectId(id: ProjectId): number {
  return Number(id)
}

/**
 * Mint a fresh `AssetId` for a runtime asset. Asset IDs are opaque strings;
 * the legacy app has no equivalent (it stores `HTMLImageElement` directly on
 * the layer). New assets use `crypto.randomUUID` when available, falling
 * back to a counter-based ID.
 */
export function mintAssetId(): AssetId {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID() as AssetId
  }
  return `asset-${Date.now()}-${Math.floor(Math.random() * 1e9)}` as AssetId
}
