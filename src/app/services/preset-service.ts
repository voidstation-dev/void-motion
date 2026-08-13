/**
 * Preset configuration service (M14).
 *
 * Coordinates saving, loading, and applying presets (batches of animation
 * and drawing settings) in the React shell. Matches legacy `renderPresets`
 * and `applyPreset` logic.
 */

import type { Preset, PresetSettings } from '@/types/project'
import { CUSTOM_PRESETS_STORAGE_KEY, MAX_CUSTOM_PRESETS } from '@/types/project'
import { animationService } from './animation-service'
import { canvasControlsService } from './canvas-controls-service'
import type { ActiveAnimationMode } from '@/types/animation'

/**
 * Built-in presets ported from legacy `BUILT_IN_PRESETS`.
 */
export const BUILT_IN_PRESETS: readonly Preset[] = [
  {
    id: 'preset-quick-reveal',
    name: 'Quick Reveal',
    desc: 'Fast scanner, ghost hand, high speed — ideal for fast demos.',
    kind: 'built-in',
    settings: {
      animationStyle: 'scanner',
      handStyle: 'ghost',
      zigzag: true,
      speed: 80,
      handSpeed: 10,
      outlineDetect: 50,
      detectionAlgorithm: 'classic',
      strokeStyle: 'default',
      coloringStyle: 'filled',
      drawDirection: 'left-to-right',
      textDrawStyle: 'reveal',
    },
  },
  {
    id: 'preset-sketch-artist',
    name: 'Sketch Artist',
    desc: 'Contour animation with charcoal stroke and natural hand speed.',
    kind: 'built-in',
    settings: {
      animationStyle: 'contour',
      handStyle: 'hand-1',
      zigzag: true,
      speed: 40,
      handSpeed: 6,
      outlineDetect: 55,
      detectionAlgorithm: 'classic',
      strokeStyle: 'charcoal',
      coloringStyle: 'filled',
      drawDirection: 'left-to-right',
      textDrawStyle: 'reveal',
    },
  },
  {
    id: 'preset-blueprint',
    name: 'Blueprint',
    desc: 'Outline only with blueprint stroke — best on dark backgrounds.',
    kind: 'built-in',
    settings: {
      animationStyle: 'outline-only',
      handStyle: 'ghost',
      zigzag: false,
      speed: 25,
      handSpeed: 4,
      outlineDetect: 60,
      detectionAlgorithm: 'canny-plus',
      strokeStyle: 'blueprint',
      coloringStyle: 'filled',
      drawDirection: 'left-to-right',
      textDrawStyle: 'outline',
    },
  },
  {
    id: 'preset-illustrated',
    name: 'Illustrated',
    desc: 'Illust Fill with full color coverage and a visible hand.',
    kind: 'built-in',
    settings: {
      animationStyle: 'illust-fill',
      handStyle: 'hand-1',
      zigzag: true,
      speed: 20,
      handSpeed: 5,
      outlineDetect: 50,
      detectionAlgorithm: 'classic',
      strokeStyle: 'default',
      coloringStyle: 'filled',
      drawDirection: 'left-to-right',
      textDrawStyle: 'reveal',
    },
  },
]

export const presetService = {
  /**
   * Load custom presets from localStorage.
   */
  loadCustomPresets(): Preset[] {
    try {
      if (typeof window === 'undefined') return []
      const raw = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  },

  /**
   * Save a new custom preset with the current settings.
   */
  saveCustomPreset(name: string, currentSettings: PresetSettings): boolean {
    const trimmed = name.trim()
    if (!trimmed) return false

    const arr = this.loadCustomPresets()
    if (arr.length >= MAX_CUSTOM_PRESETS) {
      // Reached max custom presets limit
      return false
    }

    const preset: Preset = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: trimmed,
      kind: 'custom',
      settings: currentSettings,
    }
    arr.push(preset)

    try {
      localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(arr))
      return true
    } catch {
      return false
    }
  },

  /**
   * Delete a custom preset by ID.
   */
  deleteCustomPreset(id: string): void {
    const arr = this.loadCustomPresets().filter((p) => p.id !== id)
    try {
      localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(arr))
    } catch {
      // Ignore storage errors on deletion
    }
  },

  /**
   * Apply a batch of settings from a preset.
   */
  applyPreset(settings: PresetSettings): void {
    // 1. Push an undo snapshot (delegated through legacy adapter)
    const pushUndo = (window as unknown as Record<string, unknown>).pushUndoSnapshot
    if (typeof pushUndo === 'function') {
      Reflect.apply(pushUndo, window, [])
    }

    // 2. Dispatch animation/drawing settings
    const animStyle = settings.animationStyle as ActiveAnimationMode
    const isDrawingMode =
      animStyle === 'outline-fill' ||
      animStyle === 'illust-fill' ||
      animStyle === 'outline-only' ||
      animStyle === 'text-draw'

    if (isDrawingMode) {
      animationService.setDrawingMode(animStyle)
    } else {
      animationService.setAnimationStyle(animStyle)
    }

    // Hand style goes through canvasControlsService since it owns the hand
    canvasControlsService.setHand(settings.handStyle)

    animationService.setZigzag(settings.zigzag)
    animationService.setOutlineDetect(settings.outlineDetect)
    animationService.setDetectionAlgorithm(settings.detectionAlgorithm)
    animationService.setStrokeStyle(settings.strokeStyle)
    animationService.setColoringStyle(settings.coloringStyle)
    animationService.setDrawDirection(settings.drawDirection)
    animationService.setTextDrawStyle(settings.textDrawStyle)

    // 3. Dispatch speed settings
    canvasControlsService.setRevealSpeed(settings.speed)
    canvasControlsService.setHandSpeed(settings.handSpeed)

    if (typeof window !== 'undefined' && typeof window.scheduleAutoSave === 'function') {
      window.scheduleAutoSave()
    }
  },
}
