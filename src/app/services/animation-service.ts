/**
 * Animation and drawing configuration service (M14).
 *
 * Coordinates animation styles, drawing modes, and reveal settings between
 * the React UI, the typed `AnimationStore`, and the legacy runtime.
 *
 * Per the M14 flow:
 * ```text
 * React UI → Zustand → Animation service → Legacy adapter
 * ```
 */

import { useAnimationStore } from '@/app/store'
import type {
  AnimationStyle,
  DrawingMode,
  DrawDirection,
  TextDrawStyle,
  DetectionAlgorithm,
  StrokeStyle,
  ColoringStyle,
  RevealStyle,
  OutlineDetect,
} from '@/types/animation'
import { requireLegacyState } from '@/engine/legacy/legacy-state.adapter'
import {
  domainAnimationStyleToLegacy,
  domainDrawingModeToLegacy,
  domainDrawDirectionToLegacy,
  domainTextDrawStyleToLegacy,
  domainDetectionAlgorithmToLegacy,
  domainStrokeStyleToLegacy,
  domainColoringStyleToLegacy,
  domainRevealStyleToLegacy,
} from '@/engine/legacy/legacy-enum-mapping'
import type { LegacyControlElement } from '@/engine/legacy/legacy-state.types'
import {
  getLegacyRuntimeWindow,
  setLegacyControlValue,
} from '@/engine/legacy/legacy-runtime-bridge'

/** True when the legacy globals are present. */
function legacyReady(): boolean {
  return typeof window !== 'undefined' && typeof window.selectAnim === 'function'
}

/** Build a minimal stub element for legacy element-based controls. */
function stubElement(dataset: Record<string, string>): LegacyControlElement {
  return {
    dataset,
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
  }
}

export const animationService = {
  /**
   * Set the animation style. Delegates to legacy `selectAnim` and updates store.
   */
  setAnimationStyle(style: AnimationStyle): void {
    if (legacyReady()) {
      window.selectAnim?.(stubElement({ anim: domainAnimationStyleToLegacy(style) }))
    }
    useAnimationStore.getState().setAnimationStyle(style)
  },

  /**
   * Set the drawing mode. Delegates to legacy `selectAnim` and updates store.
   */
  setDrawingMode(mode: DrawingMode): void {
    if (legacyReady()) {
      window.selectAnim?.(stubElement({ anim: domainDrawingModeToLegacy(mode) }))
    }
    useAnimationStore.getState().setActiveMode(mode)
  },

  /**
   * Set the zigzag scan toggle. Sets `zigzag` on legacy state + selected layer.
   */
  setZigzag(zigzag: boolean): void {
    if (legacyReady()) {
      const legacy = requireLegacyState()
      legacy.zigzag = zigzag
      const layerId = legacy.selectedLayerId
      const layer =
        layerId !== null && layerId !== undefined
          ? legacy.layers?.find((l) => l.id === layerId)
          : null
      if (layer) layer.zigzag = zigzag
      window.scheduleAutoSave?.()
    }
    useAnimationStore.getState().setZigzag(zigzag)
  },

  /**
   * Set text draw direction. Delegates to legacy `selectTextDir`.
   */
  setDrawDirection(dir: DrawDirection): void {
    if (legacyReady()) {
      const legacy = requireLegacyState()
      const val = domainDrawDirectionToLegacy(dir)
      legacy.textAnimDir = val
      const layerId = legacy.selectedLayerId
      const layer =
        layerId !== null && layerId !== undefined
          ? legacy.layers?.find((l) => l.id === layerId)
          : null
      if (layer) layer.textAnimDir = val
      window.scheduleAutoSave?.()
    }
    useAnimationStore.getState().setDrawDirection(dir)
  },

  /**
   * Set text draw style. Delegates to legacy `selectTextDrawStyle`.
   */
  setTextDrawStyle(style: TextDrawStyle): void {
    if (legacyReady()) {
      const legacy = requireLegacyState()
      const val = domainTextDrawStyleToLegacy(style)
      legacy.textDrawStyle = val
      const layerId = legacy.selectedLayerId
      const layer =
        layerId !== null && layerId !== undefined
          ? legacy.layers?.find((l) => l.id === layerId)
          : null
      if (layer) layer.textDrawStyle = val
      window.scheduleAutoSave?.()
    }
    useAnimationStore.getState().setTextDrawStyle(style)
  },

  /**
   * Set outline detection threshold. Sets value on legacy state + selected layer.
   */
  setOutlineDetect(value: OutlineDetect): void {
    if (legacyReady()) {
      const legacy = requireLegacyState()
      legacy.outlineDetect = value
      const layerId = legacy.selectedLayerId
      const layer =
        layerId !== null && layerId !== undefined
          ? legacy.layers?.find((l) => l.id === layerId)
          : null
      if (layer) layer.outlineDetect = value
      window.scheduleAutoSave?.()
    }
    useAnimationStore.getState().setOutlineDetect(value)
  },

  /**
   * Set outline detection algorithm. Delegates to legacy `selectDetectAlg`.
   */
  setDetectionAlgorithm(algo: DetectionAlgorithm): void {
    if (legacyReady()) {
      const legacy = requireLegacyState()
      const val = domainDetectionAlgorithmToLegacy(algo)
      legacy.outlineAlgorithm = val
      const layerId = legacy.selectedLayerId
      const layer =
        layerId !== null && layerId !== undefined
          ? legacy.layers?.find((l) => l.id === layerId)
          : null
      if (layer) layer.outlineAlgorithm = val
      window.scheduleAutoSave?.()
    }
    useAnimationStore.getState().setDetectionAlgorithm(algo)
  },

  /**
   * Set outline stroke style. Delegates to legacy `selectOutlineStroke`.
   */
  setStrokeStyle(style: StrokeStyle): void {
    if (legacyReady()) {
      const legacy = requireLegacyState()
      const val = domainStrokeStyleToLegacy(style)
      legacy.outlineStrokeStyle = val
      const layerId = legacy.selectedLayerId
      const layer =
        layerId !== null && layerId !== undefined
          ? legacy.layers?.find((l) => l.id === layerId)
          : null
      if (layer) layer.outlineStrokeStyle = val
      window.scheduleAutoSave?.()
    }
    useAnimationStore.getState().setStrokeStyle(style)
  },

  /**
   * Set outline coloring style. Delegates to legacy `selectColorStyle`.
   */
  setColoringStyle(style: ColoringStyle): void {
    if (legacyReady()) {
      const legacy = requireLegacyState()
      const val = domainColoringStyleToLegacy(style)
      legacy.colorStyle = val
      const layerId = legacy.selectedLayerId
      const layer =
        layerId !== null && layerId !== undefined
          ? legacy.layers?.find((l) => l.id === layerId)
          : null
      if (layer) layer.colorStyle = val
      window.scheduleAutoSave?.()
    }
    useAnimationStore.getState().setColoringStyle(style)
  },

  /**
   * Set outline/text color. Sets value on legacy state + selected layer.
   */
  setColor(color: string): void {
    if (legacyReady()) {
      const legacy = requireLegacyState()
      legacy.color = color
      const layerId = legacy.selectedLayerId
      const layer =
        layerId !== null && layerId !== undefined
          ? legacy.layers?.find((l) => l.id === layerId)
          : null
      if (layer) layer.outlineColor = color
      window.scheduleAutoSave?.()
    }
    useAnimationStore.getState().setColor(color)
  },

  /**
   * Set final image reveal style. Delegates to legacy `selectRevealAnim`.
   */
  setRevealStyle(style: RevealStyle): void {
    if (legacyReady()) {
      const val = domainRevealStyleToLegacy(style)
      const runtime = getLegacyRuntimeWindow()
      const selectReveal = runtime
        ? (window as unknown as Record<string, unknown>).selectRevealAnim
        : undefined
      if (runtime && typeof selectReveal === 'function') {
        Reflect.apply(selectReveal, window, [stubElement({ reveal: val })])
      } else {
        // Pre-cohost/test fallback retained for the original M14 contract.
        const legacy = requireLegacyState()
        legacy.animStyle = val as unknown as typeof legacy.animStyle
        const layer = legacy.layers.find((item) => item.id === legacy.selectedLayerId)
        if (layer) layer.animStyle = val as unknown as typeof layer.animStyle
      }
      window.scheduleAutoSave?.()
    }
    useAnimationStore.getState().setRevealStyle(style)
  },

  setChunks(value: number): void {
    if (typeof window !== 'undefined' && window.state) {
      const layer = window.state.layers.find((item) => item.id === window.state?.selectedLayerId)
      if (layer) layer.chunks = value
      setLegacyControlValue('tile-slider', String(value))
      window.scheduleAutoSave?.()
    }
  },

  setSpecializedChunks(value: number): void {
    if (typeof window !== 'undefined' && window.state) {
      window.state.specChunks = value
      const layer = window.state.layers.find((item) => item.id === window.state?.selectedLayerId)
      if (layer) layer.specChunks = value
      setLegacyControlValue('spec-tile-slider', String(value))
      window.scheduleAutoSave?.()
    }
  },

  setRevealDuration(value: number): void {
    if (typeof window !== 'undefined' && window.state) window.state.revealDuration = value
    setLegacyControlValue('reveal-duration-slider', String(value))
    window.scheduleAutoSave?.()
  },

  setOutlineVisible(value: boolean): void {
    const candidate = (window as unknown as Record<string, unknown>).setOutlineVisible
    if (typeof candidate === 'function') Reflect.apply(candidate, window, [value])
  },

  setOutlineOpacity(value: number): void {
    const candidate = (window as unknown as Record<string, unknown>).setOutlineOpacity
    if (typeof candidate === 'function') Reflect.apply(candidate, window, [value])
  },
}
