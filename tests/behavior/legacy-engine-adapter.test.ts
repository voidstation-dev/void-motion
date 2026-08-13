/**
 * M03 engine adapter contract tests.
 *
 * Verifies the `LegacyEngineAdapter` (the concrete `InkplainerEngine`) is a
 * faithful typed facade over the legacy runtime:
 *  - play/pause/restart delegate to the legacy `window.togglePlay` /
 *    `window.restartAnim` (guarded).
 *  - `getStatus` / `getProgress` read the legacy `state.playing` / `state.done`
 *    / `state._animProgress` and clamp progress to [0,1].
 *  - `attachCanvases` stores the four handles; `renderStatic` requires them.
 *  - `subscribe` receives playback + progress events the adapter emits.
 *  - `destroy` clears listeners and makes further calls throw.
 *
 * No behavior is changed — the legacy runtime remains authoritative. These
 * tests stub `window.state` / `window.togglePlay` / `window.restartAnim`
 * because jsdom does not load the legacy app.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LegacyEngineAdapter, type CanvasHandles } from '../../src/engine/legacy/legacy-adapter'
import { buildLegacyState } from '../../src/test-utils/fixtures'

/** Minimal canvas stub sufficient for `attachCanvases` storage. */
function stubCanvas(id: string): HTMLCanvasElement {
  const el = document.createElement('canvas')
  el.id = id
  return el
}

function stubCanvasHandles(): CanvasHandles {
  return {
    main: stubCanvas('main-canvas'),
    selection: stubCanvas('select-canvas'),
    outlineOverlay: stubCanvas('outline-overlay'),
    hand: stubCanvas('hand-canvas'),
  }
}

/** Install a fresh legacy `window.state` for each test. */
function installLegacyState(): void {
  ;(window as unknown as { state: unknown }).state = buildLegacyState()
}

afterEach(() => {
  // jsdom retains window globals between tests; clear what we installed.
  delete (window as unknown as { state?: unknown }).state
  delete (window as unknown as { togglePlay?: unknown }).togglePlay
  delete (window as unknown as { restartAnim?: unknown }).restartAnim
  delete (window as unknown as { createLegacyAnimationEngine?: unknown }).createLegacyAnimationEngine
})

beforeEach(() => {
  // Mock the M17 context factory injected by legacy/animations.js
  ;(window as unknown as { createLegacyAnimationEngine: unknown }).createLegacyAnimationEngine = () => ({
    // Mock the engine exports returned by the factory
  })
})

describe('M03 LegacyEngineAdapter — transport delegation', () => {
  it('play() calls window.togglePlay when not already playing', () => {
    installLegacyState()
    const togglePlay = vi.fn()
    ;(window as unknown as { togglePlay: unknown }).togglePlay = togglePlay
    const engine = new LegacyEngineAdapter()

    engine.play()
    expect(togglePlay).toHaveBeenCalledTimes(1)
    engine.destroy()
  })

  it('play() does not call togglePlay when already playing', () => {
    installLegacyState()
    ;(window as unknown as { state: unknown }).state = buildLegacyState({ playing: true })
    const togglePlay = vi.fn()
    ;(window as unknown as { togglePlay: unknown }).togglePlay = togglePlay
    const engine = new LegacyEngineAdapter()

    engine.play()
    expect(togglePlay).not.toHaveBeenCalled()
    engine.destroy()
  })

  it('play() restarts when done', () => {
    installLegacyState()
    ;(window as unknown as { state: unknown }).state = buildLegacyState({ done: true })
    const togglePlay = vi.fn()
    const restartAnim = vi.fn()
    ;(window as unknown as { togglePlay: unknown }).togglePlay = togglePlay
    ;(window as unknown as { restartAnim: unknown }).restartAnim = restartAnim
    const engine = new LegacyEngineAdapter()

    engine.play()
    // done → restart is invoked, and togglePlay is NOT (restart handles it).
    expect(restartAnim).toHaveBeenCalledTimes(1)
    expect(togglePlay).not.toHaveBeenCalled()
    engine.destroy()
  })

  it('pause() calls togglePlay when playing', () => {
    installLegacyState()
    ;(window as unknown as { state: unknown }).state = buildLegacyState({ playing: true })
    const togglePlay = vi.fn()
    ;(window as unknown as { togglePlay: unknown }).togglePlay = togglePlay
    const engine = new LegacyEngineAdapter()

    engine.pause()
    expect(togglePlay).toHaveBeenCalledTimes(1)
    engine.destroy()
  })

  it('pause() does nothing when already paused', () => {
    installLegacyState()
    const togglePlay = vi.fn()
    ;(window as unknown as { togglePlay: unknown }).togglePlay = togglePlay
    const engine = new LegacyEngineAdapter()

    engine.pause()
    expect(togglePlay).not.toHaveBeenCalled()
    engine.destroy()
  })

  it('restart() calls window.restartAnim', () => {
    installLegacyState()
    const restartAnim = vi.fn()
    ;(window as unknown as { restartAnim: unknown }).restartAnim = restartAnim
    const engine = new LegacyEngineAdapter()

    engine.restart()
    expect(restartAnim).toHaveBeenCalledTimes(1)
    engine.destroy()
  })

  it('transport methods throw a clear error when the legacy global is missing', () => {
    installLegacyState()
    // No togglePlay / restartAnim installed.
    const engine = new LegacyEngineAdapter()
    expect(() => engine.play()).toThrow(/togglePlay/)
    expect(() => engine.restart()).toThrow(/restartAnim/)
    engine.destroy()
  })
})

describe('M03 LegacyEngineAdapter — status + progress', () => {
  it('getStatus reads playing/done from legacy state', () => {
    installLegacyState()
    ;(window as unknown as { state: unknown }).state = buildLegacyState({
      playing: true,
      done: false,
    })
    const engine = new LegacyEngineAdapter()
    expect(engine.getStatus()).toEqual({ playing: true, done: false, progress: 0 })
    engine.destroy()
  })

  it('getProgress reads and clamps _animProgress to [0,1]', () => {
    installLegacyState()
    ;(window as unknown as { state: unknown }).state = buildLegacyState({
      _animProgress: 0.42,
    })
    const engine = new LegacyEngineAdapter()
    expect(engine.getProgress()).toBeCloseTo(0.42)
    engine.destroy()
  })

  it('getProgress clamps values above 1', () => {
    installLegacyState()
    ;(window as unknown as { state: unknown }).state = buildLegacyState({
      _animProgress: 1.5,
    })
    const engine = new LegacyEngineAdapter()
    expect(engine.getProgress()).toBe(1)
    engine.destroy()
  })

  it('getProgress returns 0 when _animProgress is unset', () => {
    installLegacyState()
    const engine = new LegacyEngineAdapter()
    expect(engine.getProgress()).toBe(0)
    engine.destroy()
  })
})

describe('M03 LegacyEngineAdapter — canvases + lifecycle', () => {
  it('renderStatic throws before canvases are attached', () => {
    installLegacyState()
    const engine = new LegacyEngineAdapter()
    expect(() => engine.renderStatic()).toThrow(/canvases not attached/)
    engine.destroy()
  })

  it('renderStatic does not throw after attachCanvases', () => {
    installLegacyState()
    const engine = new LegacyEngineAdapter()
    engine.attachCanvases(stubCanvasHandles())
    expect(() => engine.renderStatic()).not.toThrow()
    engine.destroy()
  })

  it('destroy makes further calls throw and clears listeners', () => {
    installLegacyState()
    const engine = new LegacyEngineAdapter()
    engine.destroy()
    expect(() => engine.getStatus()).toThrow(/destroyed/)
  })

  it('destroy is idempotent', () => {
    installLegacyState()
    const engine = new LegacyEngineAdapter()
    engine.destroy()
    expect(() => engine.destroy()).not.toThrow()
  })
})

describe('M03 LegacyEngineAdapter — subscribe', () => {
  it('subscribe receives playback events from transport methods', () => {
    installLegacyState()
    ;(window as unknown as { state: unknown }).state = buildLegacyState({ playing: false })
    const togglePlay = vi.fn()
    ;(window as unknown as { togglePlay: unknown }).togglePlay = togglePlay
    const engine = new LegacyEngineAdapter()
    const events: string[] = []
    const unsub = engine.subscribe((e) => events.push(e.type))

    engine.play() // playing=false → togglePlay called → emits playback
    expect(events).toContain('playback')
    unsub()
    engine.destroy()
  })

  it('unsubscribe stops receiving events', () => {
    installLegacyState()
    ;(window as unknown as { state: unknown }).state = buildLegacyState({ playing: true })
    const togglePlay = vi.fn()
    ;(window as unknown as { togglePlay: unknown }).togglePlay = togglePlay
    const engine = new LegacyEngineAdapter()
    const events: string[] = []
    const unsub = engine.subscribe((e) => events.push(e.type))

    engine.pause()
    expect(events).toContain('playback')
    const before = events.length
    unsub()
    engine.pause()
    expect(events.length).toBe(before)
    engine.destroy()
  })
})
