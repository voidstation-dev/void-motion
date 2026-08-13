import { useState } from 'react'
import { useAnimationStore } from '@/app/store'
import { animationService } from '@/app/services/animation-service'
import { Label } from '@/app/components/ui/label'
import { Slider } from '@/app/components/ui/slider'
import type {
  DrawingMode,
  StrokeStyle,
  ColoringStyle,
  DetectionAlgorithm,
  RevealStyle,
  DrawDirection,
  TextDrawStyle,
} from '@/types/animation'
import { useTranslation } from 'react-i18next'

const DRAWING_MODES: { id: DrawingMode; labelKey: string }[] = [
  { id: 'outline-fill', labelKey: 'outlineFill' },
  { id: 'illust-fill', labelKey: 'illustFill' },
  { id: 'outline-only', labelKey: 'outlineOnly' },
  { id: 'text-draw', labelKey: 'text' },
]

const STROKE_STYLES: { id: StrokeStyle; labelKey: string; icon: string }[] = [
  { id: 'default', labelKey: 'default', icon: '🖊' },
  { id: 'charcoal', labelKey: 'charcoal', icon: '✏️' },
  { id: 'sketch', labelKey: 'sketch', icon: '〰' },
  { id: 'fountain', labelKey: 'fountain', icon: '🪶' },
  { id: 'blueprint', labelKey: 'blueprint', icon: '📐' },
]

const COLORING_STYLES: { id: ColoringStyle; labelKey: string }[] = [
  { id: 'sparse', labelKey: 'sparse' },
  { id: 'filled', labelKey: 'filled' },
  { id: 'watercolor', labelKey: 'watercolor' },
]

const DETECTION_ALGORITHMS: { id: DetectionAlgorithm; labelKey: string; descKey: string }[] = [
  { id: 'classic', labelKey: 'classic', descKey: 'darkNeutral' },
  { id: 'adaptive', labelKey: 'adaptive', descKey: 'localContrast' },
  { id: 'morph-shell', labelKey: 'morphShell', descKey: 'erosionBorder' },
  { id: 'canny-plus', labelKey: 'cannyPlus', descKey: 'edgeLinking' },
]

const REVEAL_STYLES: { id: RevealStyle; labelKey: string; icon: string }[] = [
  { id: 'instant', labelKey: 'instant', icon: '⚡' },
  { id: 'fade', labelKey: 'fade', icon: '🌫' },
  { id: 'dissolve', labelKey: 'dissolve', icon: '✦' },
  { id: 'wipe-right', labelKey: 'wipe', icon: '→' },
  { id: 'iris', labelKey: 'iris', icon: '◎' },
  { id: 'scan-lines', labelKey: 'scanlines', icon: '≡' },
]

const TEXT_DIRECTIONS: { id: DrawDirection; labelKey: string }[] = [
  { id: 'left-to-right', labelKey: 'leftRight' },
  { id: 'right-to-left', labelKey: 'rightLeft' },
  { id: 'top-to-bottom', labelKey: 'topBottom' },
  { id: 'bottom-to-top', labelKey: 'bottomTop' },
]

const TEXT_DRAW_STYLES: { id: TextDrawStyle; labelKey: string }[] = [
  { id: 'reveal', labelKey: 'reveal' },
  { id: 'outline', labelKey: 'outline' },
  { id: 'outline-fill', labelKey: 'outlineAndFill' },
]

export function DrawingTab() {
  const { t } = useTranslation('animation')
  const activeMode = useAnimationStore((s) => s.activeMode)
  const defaults = useAnimationStore((s) => s.defaults)
  const revealStyle = useAnimationStore((s) => s.revealStyle)
  const [revealDuration, setRevealDuration] = useState(1.2)
  const [outlineOpacity, setOutlineOpacity] = useState(100)

  const isOutlineFillOrIllust = activeMode === 'outline-fill' || activeMode === 'illust-fill'
  const isOutlineOnly = activeMode === 'outline-only'
  const isTextDraw = activeMode === 'text-draw'

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Drawing Mode Selector */}
      <div className="flex flex-col gap-3">
        <Label className="text-xs uppercase text-muted-foreground tracking-wider">
          {t('drawing.mode')}
        </Label>
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
              {t(`drawing.${mode.labelKey}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Mode-specific settings */}

      {/* General Outline Settings (shown for all drawing modes) */}
      <div className="flex flex-col gap-4 p-3 border rounded-md bg-muted/20">
        {/* Stroke Style */}
        <div className="flex flex-col gap-2">
          <Label>{t('drawing.strokeStyle')}</Label>
          <div className="grid grid-cols-5 gap-1">
            {STROKE_STYLES.map((style) => (
              <button
                key={style.id}
                title={t(`drawing.options.${style.labelKey}`)}
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
          <Label>{t('drawing.coloringStyle')}</Label>
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
                {t(`drawing.options.${style.labelKey}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Outline Detection */}
        <div className="flex flex-col gap-2 pt-4 border-t">
          <div className="flex justify-between">
            <Label>{t('drawing.outlineDetection')}</Label>
            <span className="text-xs">{defaults.outlineDetect}</span>
          </div>
          <span className="text-[10px] text-muted-foreground leading-snug">
            {t('drawing.detectionHint')}
          </span>
          <Slider
            value={[defaults.outlineDetect]}
            min={0}
            max={100}
            onValueChange={(vals) => {
              if (vals[0] !== undefined) animationService.setOutlineDetect(vals[0])
            }}
          />

          <Label className="mt-2">{t('drawing.detectionAlgorithm')}</Label>
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
                <span>{t(`drawing.options.${algo.labelKey}`)}</span>
                <span className="text-[9px] opacity-70">
                  {t(`drawing.options.${algo.descKey}`)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {isOutlineFillOrIllust && (
        <div className="flex flex-col gap-4 p-3 border rounded-md">
          <Label className="text-xs uppercase text-muted-foreground tracking-wider">
            {t('drawing.fillOptions')}
          </Label>
          <div className="flex flex-col gap-2">
            <Label>{t('drawing.revealAnimation')}</Label>
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
                  <span>{t(`drawing.options.${style.labelKey}`)}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center mt-2">
              <Label>{t('drawing.duration')}</Label>
              <span className="text-xs">{revealDuration.toFixed(1)}s</span>
            </div>
            <Slider
              value={[revealDuration]}
              min={0.3}
              max={4}
              step={0.1}
              onValueChange={([value]) => {
                if (value !== undefined) {
                  setRevealDuration(value)
                  animationService.setRevealDuration(value)
                }
              }}
            />
          </div>
        </div>
      )}

      {isOutlineOnly && (
        <div className="flex flex-col gap-4 p-3 border rounded-md">
          <Label className="text-xs uppercase text-muted-foreground tracking-wider">
            {t('drawing.outlineOnlyOptions')}
          </Label>
          <div className="flex flex-col gap-2">
            <Label>{t('drawing.outlineColor')}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={defaults.color}
                onChange={(e) => animationService.setColor(e.target.value)}
                className="w-10 h-8 p-0 border-0 cursor-pointer rounded-sm"
              />
              <span className="text-xs text-muted-foreground">{t('drawing.pickColor')}</span>
            </div>
          </div>
        </div>
      )}

      {isTextDraw && (
        <div className="flex flex-col gap-4 p-3 border rounded-md">
          <Label className="text-xs uppercase text-muted-foreground tracking-wider">
            {t('drawing.textOptions')}
          </Label>

          <div className="flex flex-col gap-2">
            <Label>{t('drawing.startDirection')}</Label>
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
                  {t(`drawing.options.${dir.labelKey}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t">
            <Label>{t('drawing.fillStyle')}</Label>
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
                  {t(`drawing.options.${style.labelKey}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Outline Overlay settings (Not typed yet) */}
      <div className="flex flex-col gap-2 p-3 border rounded-md">
        <Label className="text-xs uppercase text-muted-foreground tracking-wider">
          {t('drawing.exportOutlines')}
        </Label>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="outline-overlay-vis"
            defaultChecked
            className="w-4 h-4 accent-foreground"
            onChange={(e) => {
              animationService.setOutlineVisible(e.target.checked)
            }}
          />
          <Label htmlFor="outline-overlay-vis">{t('drawing.showOutlines')}</Label>
        </div>
        <div className="flex justify-between items-center mt-2">
          <Label>{t('drawing.opacity')}</Label>
          <span className="text-xs">{outlineOpacity}%</span>
        </div>
        <Slider
          value={[outlineOpacity]}
          min={0}
          max={100}
          onValueChange={(vals) => {
            if (vals[0] !== undefined) {
              setOutlineOpacity(vals[0])
              animationService.setOutlineOpacity(vals[0])
            }
          }}
        />
      </div>
    </div>
  )
}
