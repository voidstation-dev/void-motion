/**
 * Test fixture builders.
 *
 * Minimal builders for legacy-shaped `state` objects and domain
 * `ProjectDocument`s, used by behavior and golden tests. These do NOT load
 * the legacy browser app — they construct plain data so the adapter
 * projection can be exercised in Node/jsdom.
 */

import type { ProjectDocument, ProjectDocumentV1 } from '../types/project'
import type { Layer } from '../types/layer'
import type { CanvasSettings } from '../types/canvas'
import { PROJECT_SCHEMA_VERSION, DEFAULT_PROJECT_ANIMATION } from '../types/project'
import type { LegacyInkplainerState, LegacyLayer } from '../engine/legacy/legacy-state.types'
import { fromLegacyProjectId } from '../engine/legacy/legacy-id'

/**
 * Build a minimal legacy `state` object for tests. Fields default to the
 * legacy defaults (`legacy/index.html:5571`); callers override via the patch.
 */
export function buildLegacyState(
  patch: Partial<LegacyInkplainerState> = {},
): LegacyInkplainerState {
  return {
    mode: 'image',
    canvasBg: { type: 'solid', val: 'white' },
    color: '#1a1a1a',
    hand: 'custom1',
    animStyle: 'chunkjump',
    zigzag: true,
    textAnimDir: 'ltr',
    textDrawStyle: 'reveal',
    outlineDetect: 50,
    outlineAlgorithm: 'classic',
    colorStyle: 'filled',
    canvasW: 1280,
    canvasH: 720,
    playing: false,
    animFrame: null,
    done: false,
    layers: [],
    selectedLayerId: null,
    activeLayerIndex: 0,
    groups: [],
    activePresetId: null,
    recording: false,
    mediaRecorder: null,
    chunks: [],
    ...patch,
  }
}

/**
 * Build a legacy image layer with the `addLayer` defaults
 * (`legacy/index.html:5814`). `img` is required by the legacy type but is
 * not used by the pure projection; pass a placeholder.
 */
export function buildLegacyImageLayer(id: number, patch: Partial<LegacyLayer> = {}): LegacyLayer {
  return {
    id,
    name: `Layer ${id}`,
    img: null as unknown as HTMLImageElement,
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    baseW: 100,
    baseH: 100,
    resizePct: 100,
    animStyle: 'chunkjump',
    hand: 'custom1',
    animOrder: null,
    opacity: 1,
    visible: true,
    groupId: null,
    speed: 40,
    handSpeed: 6,
    chunks: 30,
    specChunks: 35,
    hasPngAlpha: false,
    ...patch,
  }
}

/**
 * Build a legacy text layer with the text-commit defaults
 * (`legacy/index.html:8325`).
 */
export function buildLegacyTextLayer(id: number, patch: Partial<LegacyLayer> = {}): LegacyLayer {
  return {
    ...buildLegacyImageLayer(id, patch),
    kind: 'text',
    _textContent: 'Hello',
    _textFont: 'Caveat',
    _textSize: 72,
    _textBold: false,
    _textItalic: false,
    _textAlign: 'left',
    _textColor: '#1a1a1a',
    _textLineHeight: 1.3,
    _textSpacing: 0,
    hasPngAlpha: true,
    ...patch,
  }
}

/**
 * Build a domain `ProjectDocument` with the given layers and defaults.
 */
export function buildProjectDocument(
  layers: readonly Layer[],
  patch: Partial<ProjectDocumentV1> = {},
): ProjectDocument {
  const canvas: CanvasSettings = {
    size: { width: 1280, height: 720 },
    aspectRatio: '16:9',
    resolutionPreset: '720p',
    background: { type: 'solid', val: 'white' },
  }
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: fromLegacyProjectId(1),
    name: 'Test Project',
    canvas,
    layers,
    groups: [],
    animation: DEFAULT_PROJECT_ANIMATION,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch,
  }
}
