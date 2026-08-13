import type { CanvasHandles } from './legacy-types'
import type { LegacyAnimationEngineApi, LegacyInkplainerState } from './legacy-state.types'

type RuntimeWindow = Window & {
  state?: LegacyInkplainerState
  AnimationEngine?: LegacyAnimationEngineApi
  __VOID_MOTION_RUNTIME_READY__?: boolean
  __VOID_MOTION_STORAGE_READY__?: boolean
}

const FUNCTION_NAMES = [
  'activateCropTool',
  'applySlices',
  'applyMigrationCrop',
  'applyMigrationSlices',
  'cancelCrop',
  'closeExportBanner',
  'closeProjectsModal',
  'closeSlicerModal',
  'confirmCrop',
  'createGroupFromSelected',
  'createNewProject',
  'deleteProject',
  'dissolveGroup',
  'drawHand',
  'finishAnim',
  'fitCanvas',
  'generate',
  'handleFiles',
  'loadProject',
  'loadImageFile',
  'onBgColorInput',
  'openExportBanner',
  'openProjectsModal',
  'openSlicerModal',
  'pushUndoSnapshot',
  'redo',
  'redrawLayersOnCanvas',
  'redrawWithBg',
  'refreshProjectsList',
  'renameProject',
  'removeLayer',
  'renameGroup',
  'renderLayerList',
  'resetCropRect',
  'restartAnim',
  'saveProject',
  'scheduleAutoSave',
  'selectAnim',
  'selectBgPreset',
  'selectHand',
  'selectLayer',
  'selectRatio',
  'selectRes',
  'selectRevealAnim',
  'setLayerOpacity',
  'setLayerOrder',
  'setLayerPos',
  'setLayerResize',
  'setOutlineOpacity',
  'setOutlineVisible',
  'setProgress',
  'showToast',
  'switchTab',
  'toggleGroupCollapse',
  'toggleGroupVisibility',
  'toggleLayerVisibility',
  'togglePlay',
  'undo',
  'updateProjectNameDisplay',
] as const

let runtimeWindow: RuntimeWindow | null = null
let canvasHandles: CanvasHandles | null = null
let mirrorFrame: number | null = null
const listeners = new Set<() => void>()

function runtimeRecord(runtime: RuntimeWindow): Record<string, unknown> {
  return runtime as unknown as Record<string, unknown>
}

function topRecord(): Record<string, unknown> {
  return window as unknown as Record<string, unknown>
}

function proxyRuntimeFunctions(runtime: RuntimeWindow): void {
  const source = runtimeRecord(runtime)
  const target = topRecord()
  for (const name of FUNCTION_NAMES) {
    const candidate = source[name]
    if (typeof candidate !== 'function') continue
    target[name] = (...args: unknown[]) => {
      const forwarded = [...args]
      const control = resolveRuntimeControl(runtime, name, forwarded[0])
      if (control) forwarded[0] = control
      return Reflect.apply(candidate, runtime, forwarded)
    }
  }
}

function resolveRuntimeControl(
  runtime: RuntimeWindow,
  name: string,
  value: unknown,
): Element | null {
  if (!value || typeof value !== 'object') return null
  const dataset = (value as { dataset?: Record<string, string> }).dataset
  if (!dataset) return null
  const keyByFunction: Readonly<Record<string, string>> = {
    selectAnim: 'anim',
    selectHand: 'hand',
    selectRatio: 'ratio',
    selectRes: 'res',
    selectRevealAnim: 'reveal',
  }
  const key = keyByFunction[name]
  const expected = key ? dataset[key] : undefined
  if (!key || expected === undefined) return null
  return (
    Array.from(runtime.document.querySelectorAll(`[data-${key}]`)).find(
      (element) => (element as HTMLElement).dataset[key] === expected,
    ) ?? null
  )
}

function proxyRuntimeProperty(runtime: RuntimeWindow, name: string): void {
  Object.defineProperty(window, name, {
    configurable: true,
    get: () => runtimeRecord(runtime)[name],
    set: (value: unknown) => {
      runtimeRecord(runtime)[name] = value
    },
  })
}

function sourceCanvases(runtime: RuntimeWindow): CanvasHandles | null {
  const main = runtime.document.getElementById('main-canvas')
  const selection = runtime.document.getElementById('select-canvas')
  const outlineOverlay = runtime.document.getElementById('outline-overlay')
  const hand = main?.nextElementSibling
  if (
    main?.tagName !== 'CANVAS' ||
    hand?.tagName !== 'CANVAS' ||
    selection?.tagName !== 'CANVAS' ||
    outlineOverlay?.tagName !== 'CANVAS'
  ) {
    return null
  }
  return {
    main: main as HTMLCanvasElement,
    hand: hand as HTMLCanvasElement,
    selection: selection as HTMLCanvasElement,
    outlineOverlay: outlineOverlay as HTMLCanvasElement,
  }
}

function copyCanvas(source: HTMLCanvasElement, target: HTMLCanvasElement): void {
  if (target.width !== source.width) target.width = source.width
  if (target.height !== source.height) target.height = source.height
  const context = target.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, target.width, target.height)
  context.drawImage(source, 0, 0)
}

function mirrorCanvases(): void {
  mirrorFrame = null
  const runtime = runtimeWindow
  const target = canvasHandles
  if (runtime && target) {
    const source = sourceCanvases(runtime)
    if (source) {
      copyCanvas(source.main, target.main)
      copyCanvas(source.hand, target.hand)
      copyCanvas(source.selection, target.selection)
      copyCanvas(source.outlineOverlay, target.outlineOverlay)
    }
  }
  if (runtimeWindow && canvasHandles) mirrorFrame = requestAnimationFrame(mirrorCanvases)
}

function ensureMirrorLoop(): void {
  if (mirrorFrame === null && runtimeWindow && canvasHandles) {
    mirrorFrame = requestAnimationFrame(mirrorCanvases)
  }
}

export function connectLegacyRuntime(runtime: Window): boolean {
  const candidate = runtime as RuntimeWindow
  if (!candidate.__VOID_MOTION_RUNTIME_READY__ || !candidate.state) return false
  runtimeWindow = candidate
  window.state = candidate.state
  if (candidate.AnimationEngine) window.AnimationEngine = candidate.AnimationEngine
  proxyRuntimeFunctions(candidate)
  proxyRuntimeProperty(candidate, 'currentProjectId')
  proxyRuntimeProperty(candidate, '_layerIdCounter')
  proxyRuntimeProperty(candidate, '__VOID_MOTION_STORAGE_READY__')
  ensureMirrorLoop()
  for (const listener of listeners) listener()
  return true
}

export function disconnectLegacyRuntime(runtime: Window): void {
  if (runtimeWindow !== runtime) return
  runtimeWindow = null
  if (mirrorFrame !== null) cancelAnimationFrame(mirrorFrame)
  mirrorFrame = null
}

export function getLegacyRuntimeWindow(): Window | null {
  return runtimeWindow
}

export function getLegacyRuntimeDocument(): Document | null {
  return runtimeWindow?.document ?? null
}

export function callLegacyRuntime(name: string, ...args: unknown[]): unknown {
  const runtime = runtimeWindow
  if (!runtime) return undefined
  const candidate = runtimeRecord(runtime)[name]
  return typeof candidate === 'function' ? Reflect.apply(candidate, runtime, args) : undefined
}

export function registerLegacyCanvasMirror(handles: CanvasHandles): () => void {
  canvasHandles = handles
  ensureMirrorLoop()
  return () => {
    if (canvasHandles === handles) canvasHandles = null
    if (mirrorFrame !== null) cancelAnimationFrame(mirrorFrame)
    mirrorFrame = null
  }
}

export function subscribeLegacyRuntime(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setLegacyControlValue(id: string, value: string | boolean): void {
  const runtime = runtimeWindow
  const element = runtime?.document.getElementById(id)
  if (runtime && element?.tagName === 'INPUT') {
    const input = element as HTMLInputElement
    if (typeof value === 'boolean') input.checked = value
    else input.value = value
  }
}
