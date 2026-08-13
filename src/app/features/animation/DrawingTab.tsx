import { useAnimationStore } from '@/app/store'
import { animationService } from '@/app/services/animation-service'
import { Label } from '@/app/components/ui/label'
import { Slider } from '@/app/components/ui/slider'
import type { DrawingMode, StrokeStyle, ColoringStyle, DetectionAlgorithm, RevealStyle, DrawDirection, TextDrawStyle } from '@/types/animation'

const DRAWING_MODES: { id: DrawingMode; label: string; icon?: string }[] = [
  { id: 'outline-fill', label: 'Outline Fill' },
  { id: 'illust-fill', label: 'Illust Fill' },
  { id: 'outline-only', label: 'Outline Only' },
  { id: 'text-draw', label: '✏ Text' },
]

const STROKE_STYLES: { id: StrokeStyle; label: string; icon: string }[] = [
  { id: 'default', label: 'Default', icon: '🖊' },
  { id: 'charcoal', label: 'Charcoal', icon: '✏️' },
  { id: 'sketch', label: 'Sketch', icon: '〰' },
  { id: 'fountain', label: 'Fountain', icon: '🪶' },
  { id: 'blueprint', label: 'Blueprint', icon: '📐' },
]

const COLORING_STYLES: { id: ColoringStyle; label: string }[] = [
  { id: 'sparse', label: 'Sparse' },
  { id: 'filled', label: 'Filled' },
  { id: 'watercolor', label: 'Watercolor' },
]

const DETECTION_ALGORITHMS: { id: DetectionAlgorithm; label: string; desc: string }[] = [
  { id: 'classic', label: 'Classic', desc: 'dark + neutral' },
  { id: 'adaptive', label: 'Adaptive', desc: 'local contrast' },
  { id: 'morph-shell', label: 'Morph Shell', desc: 'erosion border' },
  { id: 'canny-plus', label: 'Canny+', desc: 'edge linking' },
]

const REVEAL_STYLES: { id: RevealStyle; label: string; icon: string }[] = [
  { id: 'instant', label: 'Instant', icon: '⚡' },
  { id: 'fade', label: 'Fade', icon: '🌫' },
  { id: 'dissolve', label: 'Dissolve', icon: '✦' },
  { id: 'wipe-right', label: 'Wipe', icon: '→' },
  { id: 'iris', label: 'Iris', icon: '◎' },
  { id: 'scan-lines', label: 'Scanlines', icon: '≡' },
]

const TEXT_DIRECTIONS: { id: DrawDirection; label: string }[] = [
  { id: 'left-to-right', label: '← Left → Right' },
  { id: 'right-to-left', label: 'Right → Left →' },
  { id: 'top-to-bottom', label: '↓ Top → Bottom' },
  { id: 'bottom-to-top', label: '↑ Bottom → Top' },
]

const TEXT_DRAW_STYLES: { id: TextDrawStyle; label: string }[] = [
  { id: 'reveal', label: 'Reveal' },
  { id: 'outline', label: 'Outline' },
  { id: 'outline-fill', label: 'Outline + Fill' },
]

export function DrawingTab() {
  const activeMode = useAnimationStore((s) => s.activeMode)
  const defaults = useAnimationStore((s) => s.defaults)
  const revealStyle = useAnimationStore((s) => s.revealStyle)

  const isOutlineFillOrIllust = activeMode === 'outline-fill' || activeMode === 'illust-fill'
  const isOutlineOnly = activeMode === 'outline-only'
  const isTextDraw = activeMode === 'text-draw'

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Drawing Mode Selector */}
      <div className="flex flex-col gap-3">
        <Label className="text-xs uppercase text-muted-foreground tracking-wider">Drawing Mode</Label>
        <div className="grid grid-cols-2 gap-2">
          {DRAWING_MODES.map((mode) => (
            <button
              key={mode.id}
              className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                activeMode === mode.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background hover:bg-muted border-border'
              }`}
              onClick={() => animationService.setDrawingMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode-specific settings */}
      
      {/* General Outline Settings (shown for all drawing modes) */}
      <div className="flex flex-col gap-4 p-3 border rounded-md bg-muted/20">
        
        {/* Stroke Style */}
        <div className="flex flex-col gap-2">
          <Label>Stroke Style</Label>
          <div className="grid grid-cols-5 gap-1">
            {STROKE_STYLES.map((style) => (
              <button
                key={style.id}
                title={style.label}
                className={`flex flex-col items-center justify-center p-2 text-xs border rounded transition-colors ${
                  defaults.strokeStyle === style.id
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background hover:bg-muted border-border'
                }`}
                onClick={() => animationService.setStrokeStyle(style.id)}
              >
                <span className="text-lg">{style.icon}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Coloring Style */}
        <div className="flex flex-col gap-2 pt-4 border-t">
          <Label>Coloring Style</Label>
          <div className="grid grid-cols-3 gap-2">
            {COLORING_STYLES.map((style) => (
              <button
                key={style.id}
                className={`py-1 text-xs border rounded transition-colors ${
                  defaults.coloringStyle === style.id
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background hover:bg-muted border-border'
                }`}
                onClick={() => animationService.setColoringStyle(style.id)}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Outline Detection */}
        <div className="flex flex-col gap-2 pt-4 border-t">
          <div className="flex justify-between">
            <Label>Outline Detection</Label>
            <span className="text-xs">{defaults.outlineDetect}</span>
          </div>
          <span className="text-[10px] text-muted-foreground leading-snug">Strict = bold lines only · Fine = catches thin & light strokes</span>
          <Slider
            value={[defaults.outlineDetect]}
            min={0}
            max={100}
            onValueChange={(vals) => { if (vals[0] !== undefined) animationService.setOutlineDetect(vals[0]) }}
          />

          <Label className="mt-2">Detection Algorithm</Label>
          <div className="grid grid-cols-2 gap-2">
            {DETECTION_ALGORITHMS.map((algo) => (
              <button
                key={algo.id}
                className={`flex flex-col items-center justify-center py-1 text-xs border rounded transition-colors ${
                  defaults.detectionAlgorithm === algo.id
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background hover:bg-muted border-border'
                }`}
                onClick={() => animationService.setDetectionAlgorithm(algo.id)}
              >
                <span>{algo.label}</span>
                <span className="text-[9px] opacity-70">{algo.desc}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {isOutlineFillOrIllust && (
        <div className="flex flex-col gap-4 p-3 border rounded-md">
          <Label className="text-xs uppercase text-muted-foreground tracking-wider">Fill Options</Label>
          <div className="flex flex-col gap-2">
            <Label>Reveal Animation</Label>
            <div className="grid grid-cols-3 gap-2">
              {REVEAL_STYLES.map((style) => (
                <button
                  key={style.id}
                  className={`flex items-center gap-1 p-1 text-xs justify-center border rounded transition-colors ${
                    revealStyle === style.id
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background hover:bg-muted border-border'
                  }`}
                  onClick={() => animationService.setRevealStyle(style.id)}
                >
                  <span>{style.icon}</span>
                  <span>{style.label}</span>
                </button>
              ))}
            </div>
            
            <div className="flex justify-between items-center mt-2">
              <Label>Duration</Label>
              <span className="text-xs">1.2s (Not typed)</span>
            </div>
            <Slider disabled value={[1.2]} min={0.3} max={4} step={0.1} />
          </div>
        </div>
      )}

      {isOutlineOnly && (
        <div className="flex flex-col gap-4 p-3 border rounded-md">
          <Label className="text-xs uppercase text-muted-foreground tracking-wider">Outline Only Options</Label>
          <div className="flex flex-col gap-2">
            <Label>Outline Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={defaults.color}
                onChange={(e) => animationService.setColor(e.target.value)}
                className="w-10 h-8 p-0 border-0 cursor-pointer rounded-sm"
              />
              <span className="text-xs text-muted-foreground">Pick a color</span>
            </div>
          </div>
        </div>
      )}

      {isTextDraw && (
        <div className="flex flex-col gap-4 p-3 border rounded-md">
          <Label className="text-xs uppercase text-muted-foreground tracking-wider">Text Draw Options</Label>
          
          <div className="flex flex-col gap-2">
            <Label>Start Direction</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEXT_DIRECTIONS.map((dir) => (
                <button
                  key={dir.id}
                  className={`py-1 text-xs border rounded transition-colors ${
                    defaults.drawDirection === dir.id
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background hover:bg-muted border-border'
                  }`}
                  onClick={() => animationService.setDrawDirection(dir.id)}
                >
                  {dir.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t">
            <Label>Fill Style</Label>
            <div className="grid grid-cols-3 gap-2">
              {TEXT_DRAW_STYLES.map((style) => (
                <button
                  key={style.id}
                  className={`py-1 text-[10px] border rounded transition-colors ${
                    defaults.textDrawStyle === style.id
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background hover:bg-muted border-border'
                  }`}
                  onClick={() => animationService.setTextDrawStyle(style.id)}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Outline Overlay settings (Not typed yet) */}
      <div className="flex flex-col gap-2 p-3 border rounded-md">
        <Label className="text-xs uppercase text-muted-foreground tracking-wider">Export Outlines</Label>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="outline-overlay-vis" defaultChecked className="w-4 h-4 accent-foreground" 
                 onChange={(e) => {
                   if (typeof window !== 'undefined' && typeof (window as any).setOutlineVisible === 'function') {
                     (window as any).setOutlineVisible(e.target.checked)
                   }
                 }}
          />
          <Label htmlFor="outline-overlay-vis">Show outlines on export</Label>
        </div>
        <div className="flex justify-between items-center mt-2">
          <Label>Opacity</Label>
          <span className="text-xs">100%</span>
        </div>
        <Slider defaultValue={[100]} min={0} max={100} 
                onValueChange={(vals) => {
                  if (typeof window !== 'undefined' && typeof (window as any).setOutlineOpacity === 'function') {
                    if (vals[0] !== undefined) (window as any).setOutlineOpacity(vals[0])
                  }
                }}
        />
      </div>
    </div>
  )
}
