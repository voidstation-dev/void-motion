/**
 * Legacy state adapter — the single typed boundary between new code and the
 * legacy Inkplainer global `state` object.
 *
 * Per MIGRATION_00 §16, all new code interacts with legacy globals through
 * this boundary. Future React components must NOT call `window.state`,
 * `window.selectLayer`, `window.restartAnim`, etc. directly.
 *
 * The adapter implementation MAY call legacy globals (that is its purpose),
 * but it presents a typed `LegacyStateAdapter` interface to the rest of the
 * application. It reads the legacy `state` and projects it into the domain
 * `ProjectDocument`; it also applies a `ProjectDocument` back onto the
 * legacy `state`.
 *
 * NOTE: This module is the M00 contract. The full read/apply round-trip is
 * intentionally minimal here — it maps the fields the parity phase needs
 * and leaves engine-internal slot state (`_SLOT_KEYS`) untouched. It is
 * expanded in later migrations as features move over.
 */

import type { ProjectDocument, ProjectDocumentV1 } from '../../types/project'
import type { Layer } from '../../types/layer'
import type { ImageLayer, TextLayer } from '../../types/layer'
import type { LayerTransform, LayerAnimationOverrides } from '../../types/layer'
import type { TextStyle } from '../../types/layer'
import type { ProjectAnimationDefaults } from '../../types/project'
import type { CanvasSettings } from '../../types/canvas'
import type { CanvasBackground, GradientKey } from '../../types/canvas'
import type { AssetId, LayerId, ProjectId } from '../../types/brand'
import type { LegacyInkplainerState, LegacyLayer } from './legacy-state.types'
import type {
  LegacyCanvasBackground,
  LegacyDrawDirection,
  LegacyStrokeStyle,
} from './legacy-state.types'
import {
  classifyLegacyAnimStyle,
  domainAnimationStyleToLegacy,
  domainColoringStyleToLegacy,
  domainDetectionAlgorithmToLegacy,
  domainDrawDirectionToLegacy,
  domainHandStyleToLegacy,
  domainStrokeStyleToLegacy,
  domainTextDrawStyleToLegacy,
  legacyColoringStyleToDomain,
  legacyDetectionAlgorithmToDomain,
  legacyDrawDirectionToDomain,
  legacyHandStyleToDomain,
  legacyStrokeStyleToDomain,
  legacyTextDrawStyleToDomain,
} from './legacy-enum-mapping'
import { fromLegacyGroupId, fromLegacyLayerId, toLegacyLayerId, mintAssetId } from './legacy-id'
import { PROJECT_SCHEMA_VERSION } from '../../types/project'
import { DEFAULT_PROJECT_ANIMATION } from '../../types/project'

/**
 * The adapter interface. M03 provides a concrete implementation that wires
 * this to the live legacy `window.state`; M00 ships the type plus a pure
 * projection helper (`projectLegacyState`) used by tests and fixtures.
 */
export interface LegacyStateAdapter {
  readProject(): ProjectDocument
  applyProject(project: ProjectDocument): void

  selectLayer(id: LayerId | null): void
  updateLayer(id: LayerId, patch: Partial<Layer>): void

  play(): void
  pause(): void
  restart(): void
}

// ─── Pure projection: legacy state → domain project ──────────────────────────

/**
 * Map a legacy canvas background to the domain `CanvasBackground`.
 *
 * Legacy shape (`legacy/index.html:5572`): `{ type, val, key? }`.
 */
function mapCanvasBackground(legacy: LegacyCanvasBackground): CanvasBackground {
  if (legacy.type === 'solid') {
    return { type: 'solid', val: legacy.val }
  }
  if (legacy.type === 'gradient') {
    return { type: 'gradient', key: (legacy.key ?? 'notebook') as GradientKey }
  }
  return { type: 'custom', val: legacy.val }
}

/**
 * Map a legacy `state.animStyle` (which conflates animation styles and
 * drawing modes) into the project animation defaults. Drawing modes are
 * classified separately; the `animationStyle` field holds the animation
 * value, and if the legacy value was a drawing mode, the default falls back
 * to `chunk-jump` (the legacy default).
 */
function mapAnimationDefaults(legacy: LegacyInkplainerState): ProjectAnimationDefaults {
  const classified = classifyLegacyAnimStyle(legacy.animStyle)
  const animationStyle =
    classified?.kind === 'animation' ? classified.value : DEFAULT_PROJECT_ANIMATION.animationStyle

  return {
    animationStyle,
    handStyle: legacyHandStyleToDomain(legacy.hand),
    zigzag: legacy.zigzag,
    drawDirection: legacyDrawDirectionToDomain(legacy.textAnimDir),
    textDrawStyle: legacyTextDrawStyleToDomain(legacy.textDrawStyle),
    outlineDetect: legacy.outlineDetect,
    detectionAlgorithm: legacyDetectionAlgorithmToDomain(legacy.outlineAlgorithm),
    strokeStyle: legacyStrokeStyleToDomain(
      (legacy.outlineStrokeStyle ?? 'default') as LegacyStrokeStyle,
    ),
    coloringStyle: legacyColoringStyleToDomain(legacy.colorStyle),
    color: legacy.color,
    revealStyle: 'fade', // legacy stores this on a top-level global, not state
  }
}

/**
 * Map a legacy layer to a domain `Layer` (ImageLayer or TextLayer).
 *
 * The legacy `img` (`HTMLImageElement`) is NOT carried into the domain
 * model; instead a fresh `AssetId` is minted and the caller is expected to
 * register the runtime image in a `RuntimeAssetRegistry`. The asset-id
 * mapping is tracked in the returned `assetMap` so the caller can register
 * images after the projection.
 */
function mapLayer(legacy: LegacyLayer, assetMap: Map<AssetId, HTMLImageElement>): Layer {
  const transform: LayerTransform = {
    x: legacy.x,
    y: legacy.y,
    width: legacy.w,
    height: legacy.h,
    rotation: 0, // legacy has no layer rotation
  }

  const classified = classifyLegacyAnimStyle(legacy.animStyle)
  const animationStyle = classified?.kind === 'animation' ? classified.value : undefined

  const animation: LayerAnimationOverrides = {
    animationStyle,
    handStyle: legacyHandStyleToDomain(legacy.hand),
    zigzag: legacy.zigzag,
    drawDirection: legacy.textAnimDir ? legacyDrawDirectionToDomain(legacy.textAnimDir) : undefined,
    textDrawStyle: legacy.textDrawStyle
      ? legacyTextDrawStyleToDomain(legacy.textDrawStyle)
      : undefined,
    outlineDetect: legacy.outlineDetect,
    detectionAlgorithm: legacy.outlineAlgorithm
      ? legacyDetectionAlgorithmToDomain(legacy.outlineAlgorithm)
      : undefined,
    strokeStyle: legacy.outlineStrokeStyle
      ? legacyStrokeStyleToDomain(legacy.outlineStrokeStyle)
      : undefined,
    coloringStyle: legacy.colorStyle ? legacyColoringStyleToDomain(legacy.colorStyle) : undefined,
    outlineColor: legacy.outlineColor,
    outlineThickness: legacy.outlineThickness,
    speed: legacy.speed,
    handSpeed: legacy.handSpeed,
    chunks: legacy.chunks,
    specChunks: legacy.specChunks,
  }

  const base = {
    id: fromLegacyLayerId(legacy.id),
    name: legacy.name,
    visible: legacy.visible,
    opacity: legacy.opacity,
    transform,
    animationOrder: legacy.animOrder,
    animation,
  }

  if (legacy.kind === 'text') {
    const textStyle: TextStyle = {
      text: legacy._textContent ?? '',
      fontFamily: legacy._textFont ?? 'Caveat',
      fontSize: legacy._textSize ?? 72,
      bold: legacy._textBold ?? false,
      italic: legacy._textItalic ?? false,
      align: legacy._textAlign ?? 'left',
      color: legacy._textColor ?? '#1a1a1a',
      lineHeight: legacy._textLineHeight ?? 1.3,
      letterSpacing: legacy._textSpacing ?? 0,
    }
    const assetId = mintAssetId()
    if (legacy.img) assetMap.set(assetId, legacy.img)
    const textLayer: TextLayer = {
      ...base,
      type: 'text',
      assetId,
      textStyle,
    }
    return textLayer
  }

  const assetId = mintAssetId()
  if (legacy.img) assetMap.set(assetId, legacy.img)
  const sourceMetadata = legacy._origW
    ? {
        naturalWidth: legacy.baseW,
        naturalHeight: legacy.baseH,
        hasPngAlpha: legacy.hasPngAlpha,
        cropSource: {
          x: legacy._origX ?? 0,
          y: legacy._origY ?? 0,
          width: legacy._origW,
          height: legacy._origH ?? 0,
        },
      }
    : {
        naturalWidth: legacy.baseW,
        naturalHeight: legacy.baseH,
        hasPngAlpha: legacy.hasPngAlpha,
      }
  const imageLayer: ImageLayer = {
    ...base,
    type: 'image',
    assetId,
    resizePct: legacy.resizePct,
    sourceMetadata,
  }
  return imageLayer
}

/**
 * Result of projecting legacy state into a domain project: the document plus
 * a map of minted asset IDs to the runtime images they reference, so the
 * caller can populate a `RuntimeAssetRegistry`.
 */
export interface LegacyProjectionResult {
  readonly project: ProjectDocument
  readonly assetMap: ReadonlyMap<AssetId, HTMLImageElement>
}

/**
 * Pure projection: read a legacy `state` object and produce a domain
 * `ProjectDocument`. Does NOT touch `window` — the caller passes the legacy
 * state in. Used by tests, fixtures, and the live adapter.
 */
export function projectLegacyState(
  legacy: LegacyInkplainerState,
  projectId: ProjectId,
  name: string,
  createdAt: string,
  updatedAt: string,
): LegacyProjectionResult {
  const assetMap = new Map<AssetId, HTMLImageElement>()
  const layers = legacy.layers.map((l) => mapLayer(l, assetMap))

  const canvas: CanvasSettings = {
    size: { width: legacy.canvasW, height: legacy.canvasH },
    aspectRatio: '16:9', // legacy stores this on a top-level global; adapter infers
    resolutionPreset: '720p', // ditto; inferred from size in the live adapter
    background: mapCanvasBackground(legacy.canvasBg),
  }

  const doc: ProjectDocumentV1 = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: projectId,
    name,
    canvas,
    layers,
    groups: legacy.groups.map((g) => ({
      id: fromLegacyGroupId(g.id),
      name: g.name,
      collapsed: g.collapsed,
      visible: g.visible,
      layerIds: g.layerIds.map((id) => String(id)),
    })),
    animation: mapAnimationDefaults(legacy),
    createdAt,
    updatedAt,
  }

  return { project: doc, assetMap }
}

// ─── Reverse projection: domain project → legacy state patch ────────────────

/**
 * Apply a domain `ProjectDocument`'s serializable fields onto a legacy
 * `state` object (in place). Runtime images are NOT touched — the caller is
 * responsible for ensuring the legacy `layer.img` references are valid
 * before/after this call. This only syncs settings + geometry + ordering.
 *
 * Per the parity rule, this must not change observable behavior; it only
 * translates the typed model back into the legacy field names.
 */
export function applyProjectToLegacyState(
  legacy: LegacyInkplainerState,
  project: ProjectDocument,
): void {
  legacy.canvasW = project.canvas.size.width
  legacy.canvasH = project.canvas.size.height
  const bg = project.canvas.background
  legacy.canvasBg =
    bg.type === 'gradient'
      ? { type: 'gradient', val: '', key: bg.key }
      : { type: bg.type, val: bg.val }
  legacy.color = project.animation.color
  legacy.hand = domainHandStyleToLegacy(project.animation.handStyle)
  legacy.zigzag = project.animation.zigzag
  legacy.textAnimDir = domainDrawDirectionToLegacy(
    project.animation.drawDirection,
  ) as LegacyDrawDirection
  legacy.textDrawStyle = domainTextDrawStyleToLegacy(project.animation.textDrawStyle)
  legacy.outlineDetect = project.animation.outlineDetect
  legacy.outlineAlgorithm = domainDetectionAlgorithmToLegacy(project.animation.detectionAlgorithm)
  legacy.colorStyle = domainColoringStyleToLegacy(project.animation.coloringStyle)
  legacy.outlineStrokeStyle = domainStrokeStyleToLegacy(project.animation.strokeStyle)
  // Legacy `animStyle` holds the animation-style raw value.
  legacy.animStyle = domainAnimationStyleToLegacy(project.animation.animationStyle)

  // Layers: update geometry/settings for layers that already exist in the
  // legacy array. This does NOT create/delete layers — structural changes go
  // through dedicated adapter methods in M08.
  for (const domainLayer of project.layers) {
    const legacyLayer = legacy.layers.find((l) => l.id === toLegacyLayerId(domainLayer.id))
    if (!legacyLayer) continue
    legacyLayer.x = domainLayer.transform.x
    legacyLayer.y = domainLayer.transform.y
    legacyLayer.w = domainLayer.transform.width
    legacyLayer.h = domainLayer.transform.height
    legacyLayer.opacity = domainLayer.opacity
    legacyLayer.visible = domainLayer.visible
    legacyLayer.animOrder = domainLayer.animationOrder
    if (domainLayer.animation.handStyle) {
      legacyLayer.hand = domainHandStyleToLegacy(domainLayer.animation.handStyle)
    }
  }
}

/**
 * Guard: ensure the legacy `window.state` is available before use.
 * Per MIGRATION_00 §17, use runtime guards, not bare non-null assertions.
 */
export function requireLegacyState(): LegacyInkplainerState {
  if (typeof window === 'undefined' || !window.state) {
    throw new Error('Legacy Inkplainer state is unavailable (window.state is not set).')
  }
  return window.state
}
