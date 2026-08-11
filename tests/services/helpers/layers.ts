/**
 * Shared layer fixture builder for service tests.
 *
 * Builds a minimal domain `ImageLayer` with the given numeric id. Kept in a
 * shared helper so service + UI tests can construct layers without
 * duplicating the 12-field default.
 */
import type { Layer, ImageLayer } from '@/types/layer'
import type { LayerId } from '@/types/brand'

export function makeLayer(n: number): Layer {
  return {
    id: `layer-${n}` as LayerId,
    name: `Layer ${n}`,
    type: 'image',
    visible: true,
    opacity: 1,
    transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
    animationOrder: null,
    animation: {
      animationStyle: undefined,
      handStyle: undefined,
      zigzag: undefined,
      drawDirection: undefined,
      textDrawStyle: undefined,
      outlineDetect: undefined,
      detectionAlgorithm: undefined,
      strokeStyle: undefined,
      coloringStyle: undefined,
      outlineColor: undefined,
      outlineThickness: undefined,
      speed: undefined,
      handSpeed: undefined,
      chunks: undefined,
      specChunks: undefined,
    },
    assetId: `asset-${n}` as never,
    resizePct: 100,
    sourceMetadata: { naturalWidth: 100, naturalHeight: 100, hasPngAlpha: false },
  } as ImageLayer
}
