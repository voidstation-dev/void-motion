import type { LegacyCanvasBackground } from '../legacy/legacy-state.types'

/**
 * Shared background rendering ported from M19.
 */

const BG_GRADIENTS: Record<string, (ctx: CanvasRenderingContext2D, w: number, h: number) => void> =
  {
    notebook: (ctx, w, h) => {
      ctx.fillStyle = '#f4f8fc'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = '#c8d8e8'
      ctx.lineWidth = 1
      for (let y = 22; y < h; y += 22) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      ctx.strokeStyle = '#d0dae4'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(60, 0)
      ctx.lineTo(60, h)
      ctx.stroke()
    },
    graph: (ctx, w, h) => {
      ctx.fillStyle = '#f0f6fa'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = '#dde8ef'
      ctx.lineWidth = 0.5
      for (let x = 0; x < w; x += 20) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += 20) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      ctx.strokeStyle = '#c8d8e4'
      ctx.lineWidth = 1
      for (let x = 0; x < w; x += 100) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += 100) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
    },
    cream: (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.5, h * 0.5, w * 0.7)
      g.addColorStop(0, '#ede0c4')
      g.addColorStop(0.4, '#e8d5a0')
      g.addColorStop(1, '#d4b87a')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    },
    chalk: (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.7)
      g.addColorStop(0, '#2d4a3e')
      g.addColorStop(0.6, '#1a3328')
      g.addColorStop(1, '#0f2318')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    },
    softgrad: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, '#f5f0ff')
      g.addColorStop(0.5, '#e8f4ff')
      g.addColorStop(1, '#f0fff4')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    },
    warmwhite: (ctx, w, h) => {
      ctx.fillStyle = '#fafaf7'
      ctx.fillRect(0, 0, w, h)
    },
    blueprint: (ctx, w, h) => {
      ctx.fillStyle = '#1a3a5c'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = '#295b91'
      ctx.lineWidth = 0.5
      for (let x = 0; x < w; x += 20) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += 20) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      ctx.strokeStyle = '#3a81ce'
      ctx.lineWidth = 1
      for (let x = 0; x < w; x += 100) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += 100) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
    },
    dark: (ctx, w, h) => {
      ctx.fillStyle = '#0f0f11'
      ctx.fillRect(0, 0, w, h)
    },
    linen: (ctx, w, h) => {
      ctx.fillStyle = '#f5ede0'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(0,0,0,0.04)'
      ctx.lineWidth = 1
      for (let y = 0; y < h; y += 4) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      for (let x = 0; x < w; x += 4) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
    },
  }

/**
 * Renders the background styling and composites the bgCanvas if present.
 */
export function renderBackground(
  ctx: CanvasRenderingContext2D,
  canvasBg: LegacyCanvasBackground,
  width: number,
  height: number,
  slotMode: boolean,
  bgCanvas?: HTMLCanvasElement | null,
): void {
  // In slot mode each slot canvas is transparent — only the strokes/fills for that
  // layer are drawn onto it. The real background (+ bgCanvas) is composited once
  // per frame in _tickAllSlots at the _mainCtx level.
  if (slotMode) {
    ctx.clearRect(0, 0, width, height)
    return
  }

  if (canvasBg.type === 'solid') {
    if (canvasBg.val === 'transparent') {
      ctx.clearRect(0, 0, width, height)
    } else {
      ctx.fillStyle = canvasBg.val === 'white' ? '#ffffff' : canvasBg.val
      ctx.fillRect(0, 0, width, height)
    }
  } else if (canvasBg.type === 'gradient' && canvasBg.key && BG_GRADIENTS[canvasBg.key]) {
    ctx.save()
    const gradFunc = BG_GRADIENTS[canvasBg.key]
    if (gradFunc) {
      gradFunc(ctx, width, height)
    }
    ctx.restore()
  } else if (canvasBg.type === 'custom' && canvasBg.val) {
    ctx.fillStyle = canvasBg.val
    ctx.fillRect(0, 0, width, height)
  } else {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }

  // Always composite completed layers — this ensures edgeCanvas/revealCanvas
  // intermediates also carry previous layers when blitted to ctx
  if (bgCanvas) {
    ctx.drawImage(bgCanvas, 0, 0)
  }
}
