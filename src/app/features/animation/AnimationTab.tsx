import { useState } from 'react'
import { useAnimationStore } from '@/app/store'
import { animationService } from '@/app/services/animation-service'
import { Label } from '@/app/components/ui/label'
import { Slider } from '@/app/components/ui/slider'
import type { AnimationStyle } from '@/types/animation'
import { useTranslation } from 'react-i18next'

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

export function AnimationTab() {
  const { t } = useTranslation('animation')
  const activeMode = useAnimationStore((s) => s.activeMode)
  const defaults = useAnimationStore((s) => s.defaults)
  const [chunks, setChunks] = useState(30)
  const [specializedChunks, setSpecializedChunks] = useState(35)

  // Determine if activeMode is a basic/spec animation style (and not a drawing mode)
  // If it's a drawing mode, we probably shouldn't even show this tab, but just in case,
  // we check if it matches.
  const isSpec = typeof activeMode === 'string' && activeMode.startsWith('specialized-')
  const isScanner = activeMode === 'scanner'
  const isChunkLike = activeMode === 'chunk-jump' || activeMode === 'outline-chunks'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label className="text-xs uppercase text-muted-foreground tracking-wider">
          {t('basic')}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {BASIC_STYLES.map((style) => (
            <button
              key={style.id}
              className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                activeMode === style.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background hover:bg-muted border-border'
              }`}
              onClick={() => animationService.setAnimationStyle(style.id)}
            >
              {t(style.label)}
            </button>
          ))}
        </div>

        {isScanner && (
          <div className="flex items-center justify-between p-3 border rounded-md mt-2">
            <Label htmlFor="zigzag-toggle">{t('zigzag')}</Label>
            <input
              type="checkbox"
              id="zigzag-toggle"
              checked={defaults.zigzag}
              onChange={(e) => animationService.setZigzag(e.target.checked)}
              className="w-4 h-4 accent-foreground"
            />
          </div>
        )}

        {isChunkLike && (
          <div className="flex flex-col gap-2 p-3 border rounded-md mt-2">
            <div className="flex justify-between items-center">
              <Label>
                {t('chunks')}{' '}
                <span className="text-[9px] text-muted-foreground">({t('moreFiner')})</span>
              </Label>
              <span className="text-xs">{chunks}</span>
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
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs uppercase text-muted-foreground tracking-wider">
            {t('specialized')}
          </Label>
          <span className="text-[9px] text-muted-foreground leading-snug">{t('subjectAware')}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SPEC_STYLES.map((style) => (
            <button
              key={style.id}
              className={`px-2 py-2 text-xs border rounded-md transition-colors ${
                activeMode === style.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background hover:bg-muted border-border'
              }`}
              onClick={() => animationService.setAnimationStyle(style.id)}
            >
              {t(style.label)}
            </button>
          ))}
        </div>
        {isSpec && (
          <div className="flex flex-col gap-2 p-3 border rounded-md mt-2">
            <div className="flex justify-between items-center">
              <Label>{t('chunks')}</Label>
              <span className="text-xs">{specializedChunks}</span>
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
            />
          </div>
        )}
      </div>
    </div>
  )
}
