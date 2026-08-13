/**
 * Legacy runtime bootstrapper (M16).
 *
 * This file injects the initial legacy `window.state` object and any polyfills
 * required by `legacy/animations.js`. It replaces the inline `<script>` block
 * from the legacy `index.html` (lines 5557-5600) so that the React application
 * can co-host the legacy engine natively.
 */



// ─── POLYFILL ───
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x: number, y: number, w: number, h: number, r: number = 0) {
    this.beginPath()
    this.moveTo(x + r, y)
    this.lineTo(x + w - r, y)
    this.quadraticCurveTo(x + w, y, x + w, y + r)
    this.lineTo(x + w, y + h - r)
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    this.lineTo(x + r, y + h)
    this.quadraticCurveTo(x, y + h, x, y + h - r)
    this.lineTo(x, y + r)
    this.quadraticCurveTo(x, y, x + r, y)
    this.closePath()
    return this as any
  }
}

// ─── STATE ───
const initialState = {
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
  // scanner
  curX: 0,
  curY: 0,
  scanDir: 1,
  // handsketch
  strokeList: [],
  strokeIdx: 0,
  // typewriter
  tyLine: 0,
  // spiral
  spiralAngle: 0,
  spiralR: 0,
  // curtain
  curtainX: 0,
  // dissolve
  dissolveBlocks: [],
  dissolveIdx: 0,
  // shared
  contentBounds: { x: 0, y: 0, w: 1280, h: 720 },
  recording: false,
  mediaRecorder: null,
  chunks: [],

  // ─── MULTI-LAYER ───
  layers: [],
  selectedLayerId: null,
  activeLayerIndex: 0,
  groups: [],
  _groupIdCounter: 0,
  // ─── PRESETS ───
  activePresetId: null,
}

if (typeof window !== 'undefined') {
  window.state = initialState as any
}
