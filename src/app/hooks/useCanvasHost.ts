/**
 * Canvas host hook (M09).
 *
 * Owns the `<canvas>` element lifecycle for the React shell and hands the
 * surfaces to the engine via `attachCanvases`. Per the M09 plan:
 * ```text
 * React owns DOM canvas creation.
 * Engine owns rendering.
 * ```
 *
 * The four legacy surfaces (legacy/index.html:3808):
 *   - `main-canvas`        — primary animation target
 *   - `select-canvas`      — selection / transform overlay
 *   - `outline-overlay`    — outline-only draw overlay
 *   - `handCanvas`         — moving-hand overlay (legacy creates it
 *                            dynamically; React creates it statically here)
 *
 * The hook attaches refs to the engine on mount, calls `resize` on container
 * resize (ResizeObserver), and `dispose` on unmount. The actual render is a
 * no-op until the legacy runtime is co-hosted (M16) + the renderer is
 * migrated (M19); the contract (React owns the canvas DOM, engine owns the
 * draw) is in place.
 *
 * Per M09 exit criterion: no canvas element is looked up globally by ID from
 * new code. The refs are created here and passed to the engine; nothing calls
 * `document.getElementById('main-canvas')`.
 */
import { useEffect, useRef } from 'react'
import { engine } from '@/engine/engine'
import type { CanvasHandles } from '@/engine/legacy/legacy-types'
import { registerLegacyCanvasMirror } from '@/engine/legacy/legacy-runtime-bridge'

export interface CanvasHostRefs {
  readonly viewport: React.RefObject<HTMLDivElement>
  readonly main: React.RefObject<HTMLCanvasElement>
  readonly hand: React.RefObject<HTMLCanvasElement>
  readonly selection: React.RefObject<HTMLCanvasElement>
  readonly outlineOverlay: React.RefObject<HTMLCanvasElement>
}

/**
 * Create the canvas refs + attach them to the engine. Returns the refs to
 * spread onto the `<canvas>` elements. Resizes the engine when the viewport
 * changes and disposes on unmount.
 */
export function useCanvasHost(): CanvasHostRefs {
  const viewport = useRef<HTMLDivElement>(null)
  const main = useRef<HTMLCanvasElement>(null)
  const hand = useRef<HTMLCanvasElement>(null)
  const selection = useRef<HTMLCanvasElement>(null)
  const outlineOverlay = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const mainEl = main.current
    const handEl = hand.current
    const selEl = selection.current
    const ovEl = outlineOverlay.current
    if (!mainEl || !handEl || !selEl || !ovEl) return
    const handles: CanvasHandles = {
      main: mainEl,
      hand: handEl,
      selection: selEl,
      outlineOverlay: ovEl,
    }
    engine.attachCanvases(handles)
    const stopMirror = registerLegacyCanvasMirror(handles)

    // Resize the engine when the viewport changes. Legacy `fitCanvas`
    // (legacy/index.html ~5660) scales the wrapper to the viewport; we
    // observe the viewport element and forward its content-box size.
    const vp = viewport.current
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect
        if (cr.width > 0 && cr.height > 0) {
          engine.resize(cr.width, cr.height)
        }
      }
    })
    if (vp) ro.observe(vp)

    return () => {
      ro.disconnect()
      stopMirror()
      engine.dispose()
    }
  }, [])

  return { viewport, main, hand, selection, outlineOverlay }
}
