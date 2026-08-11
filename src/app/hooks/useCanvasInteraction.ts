/**
 * Canvas interaction hook (M10).
 *
 * Wires pointer-driven selection + transform onto the React canvas overlay.
 * Mirrors the legacy inline listeners attached to `selectCanvas`
 * (`legacy/index.html:6693-6804`), but driven through the typed
 * `interactionService` so React owns the interaction contract:
 *
 * ```text
 * React overlay → useCanvasInteraction → interactionService → store + adapter
 * ```
 *
 * The hook attaches `mousedown` + `mousemove` on the overlay element and a
 * document-level `mouseup` (so a drag completes even when the pointer leaves
 * the canvas mid-drag — legacy parity). It sets the overlay cursor from the
 * service's feedback. It is no-op while the animation is playing (the service
 * guards this, and the hook short-circuits the cursor to 'default').
 *
 * Per M10 exit criteria: pointer behavior parity, position parity, resize
 * parity, keyboard behavior parity, no new animation logic.
 */
import { useEffect, type RefObject } from 'react'
import { interactionService } from '@/app/services/interaction-service'
import { useCanvasStore } from '@/app/store'

/** A rect sufficient for `toCanvasCoords` (the overlay's bounding rect). */
interface RectLike {
  readonly width: number
  readonly left: number
  readonly top: number
}

/**
 * Attach canvas pointer interaction to the overlay element. Returns nothing;
 * the side effect is the listeners + cursor. `overlayRef` is the
 * `select-canvas` ref from `useCanvasHost`; `viewportRef` is the viewport
 * (used to read the display rect, matching the legacy `canvas.getBoundingClientRect()`
 * which is the main-canvas rect — the overlay is stacked exactly over it).
 */
export function useCanvasInteraction(
  overlayRef: RefObject<HTMLCanvasElement>,
  viewportRef: RefObject<HTMLDivElement>,
): void {
  const canvas = useCanvasStore((s) => s.canvas)

  useEffect(() => {
    const overlay = overlayRef.current
    const viewport = viewportRef.current
    if (!overlay || !viewport) return

    // The logical canvas width (state.canvasW). Legacy `toCanvasCoords` uses
    // the main-canvas rect; the overlay is stacked full-size over it, so the
    // viewport rect is the same display box. Default to 1280 when no canvas
    // project is loaded yet (M10 should still hit-test in the empty state).
    const canvasWidth = canvas?.size.width ?? 1280

    const rectOf = (): RectLike => {
      const r = viewport.getBoundingClientRect()
      return { width: r.width, left: r.left, top: r.top }
    }

    const onPointerDown = (e: MouseEvent): void => {
      interactionService.pointerDown(e.clientX, e.clientY, rectOf(), canvasWidth)
    }

    const onPointerMove = (e: MouseEvent): void => {
      const { cursor } = interactionService.pointerMove(
        e.clientX,
        e.clientY,
        rectOf(),
        canvasWidth,
        e.shiftKey,
      )
      overlay.style.cursor = cursor
    }

    const onPointerUp = (): void => {
      interactionService.pointerUp()
    }

    overlay.addEventListener('mousedown', onPointerDown)
    overlay.addEventListener('mousemove', onPointerMove)
    document.addEventListener('mouseup', onPointerUp)

    return () => {
      overlay.removeEventListener('mousedown', onPointerDown)
      overlay.removeEventListener('mousemove', onPointerMove)
      document.removeEventListener('mouseup', onPointerUp)
    }
  }, [overlayRef, viewportRef, canvas?.size.width])
}
