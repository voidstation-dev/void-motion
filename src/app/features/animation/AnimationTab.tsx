import { useState, useEffect } from 'react'
import { useAnimationStore } from '@/app/store'
import { animationService } from '@/app/services/animation-service'
import { Label } from '@/app/components/ui/label'
import { Slider } from '@/app/components/ui/slider'
import type { AnimationStyle, DrawDirection } from '@/types/animation'
import { useTranslation } from 'react-i18next'

const DRAW_DIRECTIONS: { id: DrawDirection; labelKey: string }[] = [
  { id: 'left-to-right', labelKey: 'ltr' },
  { id: 'right-to-left', labelKey: 'rtl' },
  { id: 'top-to-bottom', labelKey: 'ttb' },
  { id: 'bottom-to-top', labelKey: 'btt' },
]

const BASIC_STYLES: { id: AnimationStyle; label: string }[] = [
  { id: 'scanner', label: 'styles.scanner' },
  { id: 'contour', label: 'styles.contour' },
  { id: 'outline-chunks', label: 'styles.outlineChunks' },
  { id: 'chunk-jump', label: 'styles.chunkJump' },
]

const SPEC_STYLES: { id: AnimationStyle; label: string }[] = [
  { id: 'specialized-human', label: 'styles.human' },
  { id: 'specialized-animal', label: 'styles.animal' },
  { id: 'specialized-portrait', label: 'styles.portrait' },
  { id: 'specialized-vehicle', label: 'styles.vehicle' },
  { id: 'specialized-building', label: 'styles.building' },
  { id: 'specialized-landscape', label: 'styles.landscape' },
  { id: 'specialized-spiral', label: 'styles.spiral' },
]

const SPEC_NOTES: Record<string, { title: string; desc: string }> = {
  'specialized-human': { title: 'Human — Top-down anatomy', desc: 'Head first, then shoulders, torso, arms, and legs.' },
  'specialized-animal': { title: 'Animal — Head to tail', desc: 'Starts at the left (head) and flows right toward the tail.' },
  'specialized-portrait': { title: 'Portrait — Face inward', desc: 'Eyes and nose region first, spiralling outward.' },
  'specialized-vehicle': { title: 'Vehicle — Front to rear', desc: 'Draws from the front across the body to the rear.' },
  'specialized-building': { title: 'Building — Foundation up', desc: 'Starts at the base and rises floor by floor to the roof.' },
  'specialized-landscape': { title: 'Landscape — Sky to ground', desc: 'Top horizon and sky drawn first, then midground.' },
  'specialized-spiral': { title: 'Spiral — Centre outward', desc: 'Radiates from the visual centre in an outward spiral.' },
}

export function AnimationTab() {
  const { t } = useTranslation('animation')
  const activeMode = useAnimationStore((s) => s.activeMode)
  const defaults = useAnimationStore((s) => s.defaults)
  const [chunks, setChunks] = useState(30)
  const [specializedChunks, setSpecializedChunks] = useState(35)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.state) {
      const selectedId = window.state.selectedLayerId
      const layer = window.state.layers?.find((l) => l.id === selectedId)
      if (layer?.chunks !== undefined && typeof layer.chunks === 'number') {
        setChunks(layer.chunks)
      }
      if (layer?.specChunks !== undefined && typeof layer.specChunks === 'number') {
        setSpecializedChunks(layer.specChunks)
      } else if (typeof window.state.specChunks === 'number') {
        setSpecializedChunks(window.state.specChunks)
      }
    }
  }, [defaults])

  const isSpec = typeof activeMode === 'string' && activeMode.startsWith('specialized-')
  const isScanner = activeMode === 'scanner'
  const isChunkLike = activeMode === 'chunk-jump' || activeMode === 'outline-chunks'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {t('basic')}
          </Label>
          <div className="flex-1 h-[1px] bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {BASIC_STYLES.map((style) => (
            <button
              key={style.id}
              className={`flex items-center gap-1.5 rounded-[7px] border px-2 py-1.5 text-[11px] font-medium transition-all ${
                activeMode === style.id
                  ? 'border-primary border-l-[3px] border-l-primary bg-black/5 text-foreground'
                  : 'border-black/5 bg-panel text-muted-foreground hover:-translate-y-[1px] hover:border-black/15 hover:text-foreground shadow-sm'
              }`}
              onClick={() => animationService.setAnimationStyle(style.id)}
            >
              {t(style.label)}
            </button>
          ))}
        </div>

        {!isSpec && (
          <>
            <div className="flex items-center gap-3 mt-1">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {t('drawing.startDirection', { defaultValue: 'START DIRECTION' })}
              </Label>
              <div className="flex-1 h-[1px] bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DRAW_DIRECTIONS.map((dir) => (
                <button
                  key={dir.id}
                  className={`flex items-center gap-1.5 rounded-[7px] border px-3 py-1.5 text-[11px] font-medium transition-all ${
                    defaults.drawDirection === dir.id
                      ? 'border-primary border-l-[3px] border-l-primary bg-black/5 text-foreground'
                      : 'border-black/5 bg-panel text-muted-foreground hover:-translate-y-[1px] hover:border-black/15 hover:text-foreground shadow-sm'
                  }`}
                  onClick={() => animationService.setDrawDirection(dir.id)}
                >
                  {t(`drawing.options.${dir.labelKey}`, { defaultValue: dir.labelKey.toUpperCase() })}
                </button>
              ))}
            </div>

            {isScanner && (
              <div className="flex items-center justify-between mt-1 py-1 px-1">
                <Label htmlFor="zigzag-toggle" className="text-[12px] font-medium text-foreground">
                  {t('zigzag', 'Zigzag scan')}
                </Label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="zigzag-toggle"
                    className="sr-only peer"
                    checked={defaults.zigzag}
                    onChange={(e) => animationService.setZigzag(e.target.checked)}
                  />
                  <div className="w-[40px] h-[22px] bg-surface-2 border border-black/14 shadow-inner peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[18px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[2px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:shadow-[0_1px_3px_rgba(0,0,0,0.2)] after:transition-transform after:duration-200 peer-checked:bg-success peer-checked:border-success"></div>
                </label>
              </div>
            )}

            {isChunkLike && (
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-[12px] text-muted-foreground font-medium">
                    Chunks
                  </Label>
                  <span className="text-[11px] font-bold rounded-md bg-black/5 border border-black/10 px-2 py-1">{chunks}</span>
                </div>
                <Slider
                  value={[chunks]}
                  min={6}
                  max={80}
                  onValueChange={([value]) => {
                    if (value !== undefined) {
                      setChunks(value)
                      animationService.setChunks(value)
                    }
                  }}
                  className="py-1"
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t('specialized')}
            </Label>
            <div className="flex-1 h-[1px] bg-border" />
          </div>
          <span className="text-[11px] text-muted-foreground leading-snug">
            {t('subjectAware')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SPEC_STYLES.map((style) => (
            <button
              key={style.id}
              className={`flex items-center justify-center gap-1.5 rounded-[7px] border px-2 py-1.5 text-[11px] font-medium transition-all ${
                activeMode === style.id
                  ? 'border-primary border-l-[3px] border-l-primary bg-black/5 text-foreground'
                  : 'border-black/5 bg-panel text-muted-foreground hover:-translate-y-[1px] hover:border-black/15 hover:text-foreground shadow-sm'
              }`}
              onClick={() => animationService.setAnimationStyle(style.id)}
            >
              {t(style.label)}
            </button>
          ))}
        </div>
        
        {isSpec && (
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center px-1">
                <Label className="text-[12px] text-muted-foreground font-medium">
                  Chunks
                </Label>
                <span className="text-[11px] font-bold rounded-md bg-black/5 border border-black/10 px-2 py-1">{specializedChunks}</span>
              </div>
              <Slider
                value={[specializedChunks]}
                min={6}
                max={80}
                onValueChange={([value]) => {
                  if (value !== undefined) {
                    setSpecializedChunks(value)
                    animationService.setSpecializedChunks(value)
                  }
                }}
                className="py-1"
              />
            </div>
            
            <div className="rounded-[8px] bg-black/5 border border-black/10 p-3">
              <div className="text-[11.5px] font-bold text-foreground mb-1">
                {SPEC_NOTES[activeMode as string]?.title}
              </div>
              <div className="text-[11.5px] text-muted-foreground leading-relaxed">
                {SPEC_NOTES[activeMode as string]?.desc}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
