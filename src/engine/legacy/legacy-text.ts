import { requireLegacyState } from './legacy-adapter'
import type { LegacyInkplainerState, LegacyLayer } from './legacy-state.types'

/**
 * Renders and commits text as a legacy layer. Ported from `legacy/index.html`
 * `_commitTextLayer` for M16 co-hosting.
 * 
 * @param text The text to render
 * @param style Text styling parameters
 * @param sessionState Canvas placement state
 * @returns true if successful
 */
export function commitLegacyTextLayer(
  text: string,
  style: {
    font: string
    size: number
    bold: boolean
    italic: boolean
    color: string
    align: 'left' | 'center' | 'right'
    lineHeight: number
    spacing: number
  },
  sessionState: {
    editingId: number | null
    canvasX: number
    canvasY: number
  }
): boolean {
  if (typeof document === 'undefined') return false

  try {
    const state = requireLegacyState() as LegacyInkplainerState & { _layerIdCounter?: number }
    if (state._layerIdCounter === undefined) {
      // Find max ID
      let maxN = 0
      for (const l of state.layers) {
        if (l && l.id > maxN) maxN = l.id
      }
      state._layerIdCounter = maxN
    }

    const lines = text.split('\n')
    const probe = document.createElement('canvas')
    probe.width = state.canvasW
    probe.height = 4
    const pctx = probe.getContext('2d')
    if (!pctx) return false

    const fontStr = `${style.italic ? 'italic ' : ''} ${style.bold ? 'bold ' : ''} ${style.size}px '${style.font}'`
    pctx.font = fontStr
    pctx.letterSpacing = style.spacing + 'px'
    const maxW = Math.min(state.canvasW, Math.max(...lines.map((l) => pctx.measureText(l).width)) + style.size * 0.4)
    const lineH = style.size * style.lineHeight
    const totalH = lines.length * lineH + style.size * 0.3

    const tc = document.createElement('canvas')
    tc.width = Math.ceil(maxW)
    tc.height = Math.ceil(totalH)
    const tctx = tc.getContext('2d')
    if (!tctx) return false

    tctx.font = fontStr
    tctx.letterSpacing = style.spacing + 'px'
    tctx.fillStyle = style.color
    tctx.textBaseline = 'top'
    tctx.textAlign = style.align
    const tx = style.align === 'center' ? tc.width / 2 : style.align === 'right' ? tc.width : 0
    lines.forEach((ln, i) => tctx.fillText(ln, tx, i * lineH + style.size * 0.1))

    const _editingId = sessionState.editingId
    const _placeX = sessionState.canvasX
    const _placeY = sessionState.canvasY
    const _oldLayer = _editingId !== null ? state.layers.find((l) => l && l.id === _editingId) || null : null

    const img = new Image()
    img.onload = () => {
      let finalX = _placeX
      let finalY = _placeY

      if (_editingId !== null) {
        const idx = state.layers.findIndex((l) => l && l.id === _editingId)
        if (idx !== -1) {
          const oldLayer = state.layers[idx]
          if (oldLayer) {
            finalX = oldLayer.x
            finalY = oldLayer.y
          }
          if ((window as any).pushUndoSnapshot) (window as any).pushUndoSnapshot()
          ;(state.layers as any[]).splice(idx, 1, null)
        }
      } else {
        if ((window as any).pushUndoSnapshot) (window as any).pushUndoSnapshot()
      }

      state._layerIdCounter = (state._layerIdCounter || 0) + 1
      const id = state._layerIdCounter!

      const layer = {
        id,
        name: text.split('\n')[0]!.slice(0, 24) || 'Text',
        img,
        x: Math.round(finalX),
        y: Math.round(finalY),
        w: Math.ceil(maxW),
        h: Math.ceil(totalH),
        baseW: Math.ceil(maxW),
        baseH: Math.ceil(totalH),
        resizePct: 100,
        animStyle: _oldLayer ? _oldLayer.animStyle : (state.animStyle || 'spec-text'),
        hand: _oldLayer ? _oldLayer.hand : (state.hand || 'custom1'),
        animOrder: _oldLayer ? _oldLayer.animOrder : null,
        opacity: _oldLayer ? _oldLayer.opacity : 1,
        visible: _oldLayer ? _oldLayer.visible : true,
        groupId: _oldLayer ? _oldLayer.groupId : null,
        speed: _oldLayer ? _oldLayer.speed : 40,
        handSpeed: _oldLayer ? _oldLayer.handSpeed : 6,
        chunks: _oldLayer ? _oldLayer.chunks : 30,
        specChunks: _oldLayer ? _oldLayer.specChunks : 35,
        hasPngAlpha: true,
        kind: 'text',
        _textContent: text,
        _textFont: style.font,
        _textSize: style.size,
        _textBold: style.bold,
        _textItalic: style.italic,
        _textAlign: style.align,
        _textColor: style.color,
        _textLineHeight: style.lineHeight,
        _textSpacing: style.spacing,
      } as unknown as LegacyLayer

      const phIdx = state.layers.findIndex((l) => l === null as unknown as LegacyLayer)
      if (phIdx !== -1) {
        state.layers[phIdx] = layer
      } else {
        state.layers.push(layer)
      }

      if ((window as any).fitCanvas) (window as any).fitCanvas()
      if ((window as any).renderLayerList) (window as any).renderLayerList()
      if (window.selectLayer) window.selectLayer(id)
      if ((window as any).redrawLayersOnCanvas) (window as any).redrawLayersOnCanvas()
      if (window.scheduleAutoSave) window.scheduleAutoSave()
    }
    img.src = tc.toDataURL()

    return true
  } catch (e) {
    console.error('Failed to commit legacy text layer', e)
    return false
  }
}
