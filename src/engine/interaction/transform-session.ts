/**
 * Transform-session geometry (M10).
 *
 * Pure functions that compute the next layer geometry from an in-flight pointer
 * session, ported verbatim from the legacy mousemove handler
 * (`legacy/index.html:6730-6762`). These do NOT mutate state; the interaction
 * service applies the computed geometry to the store + legacy adapter.
 *
 * Legacy behavior preserved exactly:
 *   - Move: absolute-from-orig math — `x = orig.x + (cur.x - start.x)`,
 *     `y = orig.y + (cur.y - start.y)`. Recomputed from the original capture
 *     each move (robust against lost events), NOT per-frame deltas.
 *   - Resize: per-handle math — `e`/`s` grow the far edge; `w`/`n` move the
 *     near edge and shrink width/height; every branch clamps to a 20px
 *     minimum on both w and h. The opposite corner/edge is the implicit
 *     anchor (held fixed via the `orig` math).
 *   - Shift = aspect-ratio lock to the ORIGINAL `orig.w/orig.h` ratio, applied
 *     to BOTH edge and corner handles, using the "shrink the larger axis to
 *     match" rule: `if (nw/nh > ar) nh = nw/ar else nw = nh*ar`.
 *
 * Per M10 "no new animation logic": these are interaction primitives only.
 */
import type { ResizeHandle } from './hit-test'

/** The minimum layer width/height. Legacy `Math.max(20, …)` floor. */
export const MIN_LAYER_SIZE = 20

/** A captured layer geometry (the `orig` snapshot at session start). */
export interface SessionGeometry {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** The kind of in-flight pointer session. */
export type SessionType = 'move' | 'resize'

/**
 * An in-flight pointer session. Mirrors the legacy `_interact` object
 * (`legacy/index.html:6651`): `type`, `handle` (resize only), the pointer
 * start point, and the captured `orig` geometry.
 */
export interface PointerSession {
  readonly type: SessionType
  readonly handle: ResizeHandle | null
  readonly startX: number
  readonly startY: number
  readonly orig: SessionGeometry
  readonly snapshotPushed?: boolean
}

/**
 * Create a move session. Mirrors the legacy mousedown body-hit branch
 * (`legacy/index.html:6719`): captures the layer's current x/y/w/h as `orig`.
 */
export function startMoveSession(
  startX: number,
  startY: number,
  orig: SessionGeometry,
): PointerSession {
  return { type: 'move', handle: null, startX, startY, orig }
}

/**
 * Create a resize session. Mirrors the legacy mousedown handle-hit branch
 * (`legacy/index.html:6714`): captures the handle + `orig` geometry.
 */
export function startResizeSession(
  handle: ResizeHandle,
  startX: number,
  startY: number,
  orig: SessionGeometry,
): PointerSession {
  return { type: 'resize', handle, startX, startY, orig }
}

/**
 * Apply a move session: absolute-from-orig reposition. Mirrors legacy
 * `sel.x = _interact.orig.x + dx; sel.y = _interact.orig.y + dy`
 * (`legacy/index.html:6745-6746`). No clamping, no snapping — the layer can
 * be dragged off-canvas (legacy parity).
 */
export function applyMove(session: PointerSession, curX: number, curY: number): SessionGeometry {
  const dx = curX - session.startX
  const dy = curY - session.startY
  return {
    x: session.orig.x + dx,
    y: session.orig.y + dy,
    w: session.orig.w,
    h: session.orig.h,
  }
}

/**
 * Apply a resize session: per-handle geometry with a 20px minimum on both
 * axes, plus optional Shift aspect-ratio lock. Mirrors the legacy resize
 * branch (`legacy/index.html:6747-6762`) exactly.
 *
 * Anchor semantics (implicit via `orig`):
 *   - `e` grows width from the west edge (x fixed).
 *   - `s` grows height from the north edge (y fixed).
 *   - `w` moves the west edge (x moves, width shrinks by dx).
 *   - `n` moves the north edge (y moves, height shrinks by dy).
 *   - Corners combine two axes; the opposite corner is the anchor.
 *
 * Shift constraint: locks `nw/nh` to the original `orig.w/orig.h` ratio using
 * the legacy "shrink the larger axis" rule.
 */
export function applyResize(
  session: PointerSession,
  curX: number,
  curY: number,
  shiftKey: boolean,
): SessionGeometry {
  if (session.type !== 'resize' || session.handle === null) {
    return session.orig
  }
  const o = session.orig
  const dx = curX - session.startX
  const dy = curY - session.startY
  const h2 = session.handle
  let nx = o.x
  let ny = o.y
  let nw = o.w
  let nh = o.h
  if (h2.includes('e')) nw = Math.max(MIN_LAYER_SIZE, o.w + dx)
  if (h2.includes('s')) nh = Math.max(MIN_LAYER_SIZE, o.h + dy)
  if (h2.includes('w')) {
    nx = o.x + dx
    nw = Math.max(MIN_LAYER_SIZE, o.w - dx)
  }
  if (h2.includes('n')) {
    ny = o.y + dy
    nh = Math.max(MIN_LAYER_SIZE, o.h - dy)
  }
  if (shiftKey) {
    const ar = o.w / o.h
    if (nw / nh > ar) {
      nh = nw / ar
    } else {
      nw = nh * ar
    }
  }
  return { x: nx, y: ny, w: nw, h: nh }
}

/**
 * Determine whether a session produced a geometry change worth an undo
 * snapshot. Mirrors the legacy mouseup guard (`legacy/index.html:6791`):
 * resize checks x/y/w/h; move checks x/y only. A no-op click (pointer down +
 * up with no movement) does NOT push a snapshot.
 */
export function sessionChanged(session: PointerSession, next: SessionGeometry): boolean {
  if (session.type === 'resize') {
    return (
      next.x !== session.orig.x ||
      next.y !== session.orig.y ||
      next.w !== session.orig.w ||
      next.h !== session.orig.h
    )
  }
  return next.x !== session.orig.x || next.y !== session.orig.y
}
