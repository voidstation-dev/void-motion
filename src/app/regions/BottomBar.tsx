/**
 * Bottom bar region (M07).
 *
 * Mirrors the legacy bottom bar (legacy/index.html ~line 3850): hand style
 * picker, speed sliders, aspect/resolution controls. M07 wires all three
 * sections to the canvas-controls service, which delegates to the legacy
 * `selectHand`/`selectRatio`/`selectRes` globals and mirrors the result into
 * the typed animation + canvas + playback stores.
 *
 * Legacy behavior parity:
 *   - Hand pills (3857): `data-hand` ∈ `ghost`/`custom1..4`; click →
 *     `bbSelectHand(this)` → `selectHand`. Labels: Ghost / Hand 1 / Hand 2 /
 *     Hand 3 / Pen. The domain uses `ghost`/`hand-1..3`/`pen`; the service
 *     maps domain → legacy before calling the legacy fn.
 *   - Speed sliders (3888+): `speed-slider` (reveal) min 1 max 100 val 40;
 *     `hand-speed-slider` min 1 max 20 val 6. `oninput` updates
 *     `state.speed`/`layer.speed` (reveal) and `state.handSpeed`/`layer.handSpeed`.
 *     The service mirrors into the playback store; the legacy rAF loop reads
 *     the slider value each tick, so legacy stays authoritative for actual
 *     playback speed.
 *   - Aspect ratio (3920): `data-ratio` ∈ `16:9`/`9:16`/`1:1`; click →
 *     `bbSelectRatio` → `selectRatio`.
 *   - Resolution (3934): `data-res` ∈ `720`/`1080`/`1440`; click →
 *     `bbSelectRes` → `selectRes`.
 */
import type { ReactElement } from 'react'
import { Separator } from '@/app/components/ui/separator'
import { Slider } from '@/app/components/ui/slider'
import { canvasControlsService } from '@/app/services/canvas-controls-service'
import {
  useAnimationStore,
  useCanvasStore,
  usePlaybackStore,
  selectRevealSpeed,
  selectHandSpeed,
} from '@/app/store'
import type { HandStyle } from '@/types/animation'
import type { AspectRatio, ResolutionPreset } from '@/types/canvas'

/** Hand style option rows (domain value → display label). Legacy labels. */
const HAND_OPTIONS: ReadonlyArray<{ readonly value: HandStyle; readonly label: string }> = [
  { value: 'ghost', label: 'Ghost' },
  { value: 'hand-1', label: 'Hand 1' },
  { value: 'hand-2', label: 'Hand 2' },
  { value: 'hand-3', label: 'Hand 3' },
  { value: 'pen', label: 'Pen' },
]

/** Aspect ratio options. Domain values match legacy `data-ratio` strings. */
const RATIO_OPTIONS: ReadonlyArray<AspectRatio> = ['16:9', '9:16', '1:1']

/** Resolution options. Domain preset → display label. */
const RES_OPTIONS: ReadonlyArray<{ readonly value: ResolutionPreset; readonly label: string }> = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '1440p', label: '1440p' },
]

export function BottomBar(): ReactElement {
  const hand = useAnimationStore((s) => s.defaults.handStyle)
  const revealSpeed = usePlaybackStore(selectRevealSpeed)
  const handSpeed = usePlaybackStore(selectHandSpeed)
  const ratio = useCanvasStore((s) => s.canvas?.aspectRatio ?? '16:9')
  const res = useCanvasStore((s) => s.canvas?.resolutionPreset ?? '720p')

  const onHand = (h: HandStyle) => canvasControlsService.setHand(h)
  const onRevealSpeed = (v: number[]) => canvasControlsService.setRevealSpeed(v[0] ?? 1)
  const onHandSpeed = (v: number[]) => canvasControlsService.setHandSpeed(v[0] ?? 1)
  const onRatio = (r: AspectRatio) => canvasControlsService.setAspectRatio(r)
  const onRes = (p: ResolutionPreset) => canvasControlsService.setResolutionPreset(p)

  return (
    <footer
      data-region="bottombar"
      className="flex h-[48px] items-center gap-6 border-t border-border bg-sidebar px-4"
    >
      {/* Hand style */}
      <div className="flex min-w-0 items-center gap-2" aria-label="Hand style">
        <span className="text-xs font-semibold text-muted-foreground">Hand</span>
        <div className="flex items-center gap-1" role="group" aria-label="Hand style options">
          {HAND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onHand(opt.value)}
              aria-pressed={hand === opt.value}
              data-hand={opt.value}
              data-testid={`hand-pill-${opt.value}`}
              className={
                'rounded-md border px-2 py-0.5 text-xs transition-colors ' +
                (hand === opt.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent')
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Speed sliders */}
      <div className="flex items-center gap-3" aria-label="Speed">
        <span className="text-xs font-semibold text-muted-foreground">Speed</span>
        <div className="flex items-center gap-2">
          <span className="w-10 text-xs text-muted-foreground">Reveal</span>
          <Slider
            min={1}
            max={100}
            step={1}
            value={[revealSpeed]}
            onValueChange={onRevealSpeed}
            className="w-24"
            aria-label="Reveal speed"
            data-testid="speed-slider"
          />
          <span
            className="w-8 text-right text-xs tabular-nums text-muted-foreground"
            data-testid="speed-val"
          >
            {revealSpeed}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-10 text-xs text-muted-foreground">Hand</span>
          <Slider
            min={1}
            max={20}
            step={1}
            value={[handSpeed]}
            onValueChange={onHandSpeed}
            className="w-20"
            aria-label="Hand speed"
            data-testid="hand-speed-slider"
          />
          <span
            className="w-8 text-right text-xs tabular-nums text-muted-foreground"
            data-testid="hand-speed-val"
          >
            {handSpeed}
          </span>
        </div>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Canvas size */}
      <div className="flex items-center gap-2" aria-label="Canvas size">
        <span className="text-xs font-semibold text-muted-foreground">Canvas</span>
        <div className="flex items-center gap-1" role="group" aria-label="Aspect ratio">
          {RATIO_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRatio(r)}
              aria-pressed={ratio === r}
              data-ratio={r}
              data-testid={`ratio-btn-${r}`}
              className={
                'rounded-md border px-2 py-0.5 text-xs transition-colors ' +
                (ratio === r
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent')
              }
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Resolution">
          {RES_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onRes(opt.value)}
              aria-pressed={res === opt.value}
              data-res={opt.value}
              data-testid={`res-btn-${opt.value}`}
              className={
                'rounded-md border px-2 py-0.5 text-xs transition-colors ' +
                (res === opt.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent')
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </footer>
  )
}
