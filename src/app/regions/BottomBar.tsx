import type { ReactElement } from 'react'
import { canvasControlsService } from '@/app/services/canvas-controls-service'
import {
  selectHandSpeed,
  selectRevealSpeed,
  useAnimationStore,
  useCanvasStore,
  usePlaybackStore,
} from '@/app/store'
import type { HandStyle } from '@/types/animation'
import type { AspectRatio, ResolutionPreset } from '@/types/canvas'
import { useTranslation } from 'react-i18next'

const HANDS: ReadonlyArray<{ value: HandStyle; label: string; image?: string }> = [
  { value: 'ghost', label: 'bottom.ghost' },
  { value: 'hand-1', label: 'bottom.hand1', image: '/legacy/images/hand1-720p.png' },
  { value: 'hand-2', label: 'bottom.hand2', image: '/legacy/images/hand2-720p.png' },
  { value: 'hand-3', label: 'bottom.hand3', image: '/legacy/images/hand3-720p.png' },
  { value: 'pen', label: 'bottom.pen', image: '/legacy/images/hand4-720p.png' },
]
const RATIOS: ReadonlyArray<AspectRatio> = ['16:9', '9:16', '1:1']
const RESOLUTIONS: ReadonlyArray<ResolutionPreset> = ['720p', '1080p', '1440p']



export function BottomBar(): ReactElement {
  const { t } = useTranslation('editor')
  const hand = useAnimationStore((state) => state.defaults.handStyle)
  const revealSpeed = usePlaybackStore(selectRevealSpeed)
  const handSpeed = usePlaybackStore(selectHandSpeed)
  const canvas = useCanvasStore((state) => state.canvas)
  const ratio = canvas?.aspectRatio ?? '16:9'
  const resolution = canvas?.resolutionPreset ?? '720p'
  const size = canvas?.size ?? DEFAULT_CANVAS_SIZE

  return (
    <footer
      data-region="bottombar"
      className="grid h-[124px] shrink-0 grid-cols-[1.05fr_1fr_1.35fr] overflow-x-auto border-t border-border bg-[#fffdf9] max-sm:flex max-sm:h-[126px]"
    >
      <section
        className="min-w-0 border-r border-border px-3 py-2.5 max-sm:w-[260px] max-sm:shrink-0 sm:px-4"
        aria-label={t('bottom.handStyle')}
      >
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t('bottom.handStyle')}
        </div>
        <div className="grid grid-cols-5 gap-1.5 h-[56px]">
          {HANDS.map((option) => {
            const active = hand === option.value;
            return (
              <button
                key={option.value}
                type="button"
                title={t(option.label)}
                onClick={() => canvasControlsService.setHand(option.value)}
                aria-pressed={active}
                data-testid={`hand-pill-${option.value}`}
                className={`relative flex items-center justify-center overflow-hidden rounded-[8px] border transition ${
                  active
                    ? 'border-[#171918] ring-1 ring-[#171918] bg-white shadow-sm'
                    : 'border-border bg-[#fbfaf7] hover:border-black/20 hover:bg-white'
                }`}
              >
                {option.image ? (
                  <img 
                    src={option.image} 
                    alt={t(option.label)} 
                    className={`h-[200%] w-full object-cover object-top transition-transform ${active ? 'scale-110' : ''}`} 
                    style={{ objectPosition: 'center top' }}
                  />
                ) : (
                  <span className={`text-[9px] font-medium ${active ? 'text-[#171918]' : 'text-muted-foreground'}`}>
                    {t(option.label)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section
        className="min-w-0 border-r border-border px-3 py-2.5 max-sm:w-[250px] max-sm:shrink-0"
        aria-label={t('bottom.speed')}
      >
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t('bottom.speed')}
        </div>
        <div className="grid grid-cols-[38px_minmax(56px,1fr)_28px] items-center gap-1 text-[11px]">
          <span className="text-muted-foreground">{t('bottom.reveal')}</span>
          <span data-testid="speed-slider" className="flex min-w-0 items-center">
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={revealSpeed}
              onChange={(event) => canvasControlsService.setRevealSpeed(Number(event.target.value))}
              aria-label={t('bottom.revealSpeed')}
              className="motion-range h-1.5 min-w-0 w-full accent-black"
            />
          </span>
          <span className="rounded bg-surface-2 py-1 text-center tabular-nums">{revealSpeed}</span>
          <span className="text-muted-foreground">{t('bottom.hand')}</span>
          <span className="flex min-w-0 items-center">
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={handSpeed}
              onChange={(event) => canvasControlsService.setHandSpeed(Number(event.target.value))}
              aria-label={t('bottom.handSpeed')}
              className="motion-range h-1.5 min-w-0 w-full accent-black"
            />
          </span>
          <span className="rounded bg-surface-2 py-1 text-center tabular-nums">{handSpeed}</span>
        </div>
      </section>

      <section
        className="min-w-0 px-3 py-2.5 max-sm:w-[390px] max-sm:shrink-0 sm:px-4 flex items-center"
        aria-label={t('bottom.canvasSize')}
      >
        <div className="flex-1 rounded-[16px] border border-black/5 bg-white p-3 shadow-sm flex flex-col justify-center h-full max-h-[108px]">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground">
              {t('bottom.canvasSize')}
            </h3>
            <span className="text-right text-[10px] font-medium tabular-nums text-muted-foreground">
              {size.width} × {size.height}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_1fr] items-center gap-3">
            <div>
              <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('bottom.aspectRatio', 'Ratio')}
              </div>
              <div className="flex w-full bg-[#f4f4f5] rounded-[10px] p-1 border border-black/5">
                {RATIOS.map((item) => {
                  const active = ratio === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => canvasControlsService.setAspectRatio(item)}
                      aria-pressed={active}
                      data-testid={`ratio-btn-${item}`}
                      className={`flex-1 h-7 rounded-[8px] text-[10px] font-semibold transition ${
                        active
                          ? 'bg-[#171918] text-white shadow-sm'
                          : 'text-muted-foreground hover:bg-black/5 hover:text-foreground'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('bottom.resolution', 'Resolution')}
              </div>
              <div className="flex w-full bg-[#f4f4f5] rounded-[10px] p-1 border border-black/5">
                {RESOLUTIONS.map((item) => {
                  const active = resolution === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => canvasControlsService.setResolutionPreset(item)}
                      aria-pressed={active}
                      data-testid={`res-btn-${item}`}
                      className={`flex-1 h-7 rounded-[8px] text-[10px] font-semibold transition ${
                        active
                          ? 'bg-[#171918] text-white shadow-sm'
                          : 'text-muted-foreground hover:bg-black/5 hover:text-foreground'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </footer>
  )
}

const DEFAULT_CANVAS_SIZE = { width: 1280, height: 720 } as const
