import { useState, useEffect } from 'react'
import { useAnimationStore } from '@/app/store'
import { animationService } from '@/app/services/animation-service'
import { Label } from '@/app/components/ui/label'
import { Slider } from '@/app/components/ui/slider'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/app/components/ui/accordion'
import { setLegacyControlValue } from '@/engine/legacy/legacy-runtime-bridge'
import type {
  DrawingMode,
  StrokeStyle,
  ColoringStyle,
  DetectionAlgorithm,
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

const STROKE_STYLES: { id: StrokeStyle; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'charcoal', label: 'Charcoal' },
  { id: 'sketch', label: 'Sketch' },
  { id: 'fountain', label: 'Fountain' },
  { id: 'blueprint', label: 'Blueprint' },
]

const STROKE_HINTS: Record<StrokeStyle, string> = {
  default: 'Standard whiteboard marker with clean, even lines.',
  charcoal: 'Soft, dusty charcoal strokes with heavier texture and shadow.',
  sketch: 'Layered sketch lines that feel exploratory and hand-drawn.',
  fountain: 'Variable line weight that thickens on curves and lightens on faster strokes.',
  blueprint: 'Crisp drafting lines designed to read best on darker blueprint-style backgrounds.',
}

const COLORING_STYLES: { id: ColoringStyle; label: string }[] = [
  { id: 'sparse', label: 'Sparse' },
  { id: 'filled', label: 'Filled' },
  { id: 'watercolor', label: 'Watercolor' },
]

const COLOR_HINTS: Record<ColoringStyle, string> = {
  sparse: 'Default whiteboard coloring with sparse coverage.',
  filled: 'Filled coloring — detects and fills empty spots for complete coverage.',
  watercolor: 'Watercolor — soft translucent color bleeding (reduced from stroke watercolor).',
}

const DETECTION_ALGORITHMS: { id: DetectionAlgorithm; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'adaptive', label: 'Adaptive' },
  { id: 'morph-shell', label: 'Morph Shell' },
  { id: 'canny-plus', label: 'Canny+' },
]

const ALG_HINTS: Record<DetectionAlgorithm, string> = {
  classic: 'Balanced edge pickup tuned for dark and neutral outlines.',
  adaptive: 'Adjusts to local contrast so textured or uneven inputs stay readable.',
  'morph-shell': 'Builds borders from shape erosion, useful for bold enclosed regions.',
  'canny-plus': 'Links edges into cleaner continuous outlines on crisp artwork.',
}

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
  const { t } = useTranslation('animation')
  const activeMode = useAnimationStore((s) => s.activeMode)
  const defaults = useAnimationStore((s) => s.defaults)

  // Fill Options state
  const [imageReveal, setImageReveal] = useState(false)
  const [outlineVisible, setOutlineVisible] = useState(true)
  const [outlineOpacity, setOutlineOpacity] = useState(100)
  const [outlineColor, setOutlineColor] = useState('#000000')
  const [outlineAutoColor, setOutlineAutoColor] = useState(false)
  const [outlineThickness, setOutlineThickness] = useState(2)

  // Outline Only Options state
  const [outlineOnlyColor, setOutlineOnlyColor] = useState('#000000')
  const [outlineOnlyAutoColor, setOutlineOnlyAutoColor] = useState(false)
  const [outlineOnlyThickness, setOutlineOnlyThickness] = useState(2)
  const [outlineOnlyColorRegion, setOutlineOnlyColorRegion] = useState(false)
  const [outlineOnlyRealImage, setOutlineOnlyRealImage] = useState(false)

  // Text Draw Options state
  const [textOutlineColor, setTextOutlineColor] = useState('#000000')
  const [textOutlineAutoColor, setTextOutlineAutoColor] = useState(false)
  const [textOutlineThickness, setTextOutlineThickness] = useState(2)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const elImageReveal = document.getElementById('image-reveal') as HTMLInputElement | null
      if (elImageReveal) setImageReveal(elImageReveal.checked)

      const elOutlineColor = document.getElementById('of-outline-color') as HTMLInputElement | null
      if (elOutlineColor?.value) setOutlineColor(elOutlineColor.value)

      const elOutlineThickness = document.getElementById('of-outline-thickness') as HTMLInputElement | null
      if (elOutlineThickness?.value) setOutlineThickness(parseFloat(elOutlineThickness.value))

      const elOutlineAutoColor = document.getElementById('of-outline-autocolor') as HTMLInputElement | null
      if (elOutlineAutoColor) setOutlineAutoColor(elOutlineAutoColor.checked)
    }
  }, [defaults])

  const isDrawingMode =
    activeMode === 'outline-fill' ||
    activeMode === 'illust-fill' ||
    activeMode === 'outline-only' ||
    activeMode === 'text-draw'

  const isOutlineFillOrIllust = activeMode === 'outline-fill' || activeMode === 'illust-fill'
  const isOutlineOnly = activeMode === 'outline-only'
  const isTextDraw = activeMode === 'text-draw'

  const handleModeClick = (modeId: DrawingMode) => {
    if (activeMode === modeId) {
      animationService.setAnimationStyle('scanner')
    } else {
      animationService.setDrawingMode(modeId)
    }
  }

  const currentStroke = defaults.strokeStyle || 'default'
  const currentColorStyle = defaults.coloringStyle || 'filled'
  const currentAlgorithm = defaults.detectionAlgorithm || 'classic'
  const currentTextDir = defaults.drawDirection || 'left-to-right'
  const currentTextDrawStyle = defaults.textDrawStyle || 'reveal'

  return (
    <div className="flex flex-col gap-3.5">
      {/* Drawing Mode 4-Grid Selector */}
      <div className="grid grid-cols-2 gap-2">
        {DRAWING_MODES.map((mode) => {
          const active = activeMode === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              className={`flex items-center justify-center h-10 px-3 rounded-[10px] text-xs font-semibold transition-all ${
                active
                  ? 'border-[1.5px] border-black bg-[#f4f4f5] text-foreground shadow-sm'
                  : 'border border-black/10 bg-[#fbfaf7] text-foreground hover:bg-black/5'
              }`}
              onClick={() => handleModeClick(mode.id)}
            >
              {t(`drawing.${mode.labelKey}`)}
            </button>
          )
        })}
      </div>

      {/* Options only appear when an outline animation mode is selected */}
      {isDrawingMode && (
        <>
          {/* Main Outline Settings Card (for Outline Fill, Illust Fill, and Outline Only) */}
          {!isTextDraw && (
            <div className="flex flex-col gap-4 rounded-[16px] border border-black/10 bg-white p-3.5 shadow-sm">
              {/* Stroke Style */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground font-medium">
                  {t('drawing.strokeStyle', 'Stroke Style')}
                </Label>
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    {STROKE_STYLES.slice(0, 3).map((style) => {
                      const active = currentStroke === style.id
                      return (
                        <button
                          key={style.id}
                          type="button"
                          className={`flex h-9 items-center justify-center rounded-[8px] text-xs font-semibold transition-all ${
                            active
                              ? 'border-[1.5px] border-black bg-[#f4f4f5] text-foreground shadow-sm'
                              : 'border border-black/10 bg-[#fbfaf7] text-muted-foreground hover:bg-black/5 hover:text-foreground'
                          }`}
                          onClick={() => animationService.setStrokeStyle(style.id)}
                        >
                          {style.label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {STROKE_STYLES.slice(3).map((style) => {
                      const active = currentStroke === style.id
                      return (
                        <button
                          key={style.id}
                          type="button"
                          className={`flex h-9 items-center justify-center rounded-[8px] text-xs font-semibold transition-all ${
                            active
                              ? 'border-[1.5px] border-black bg-[#f4f4f5] text-foreground shadow-sm'
                              : 'border border-black/10 bg-[#fbfaf7] text-muted-foreground hover:bg-black/5 hover:text-foreground'
                          }`}
                          onClick={() => animationService.setStrokeStyle(style.id)}
                        >
                          {style.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {/* Dynamic Stroke Description */}
                <div className="rounded-[8px] bg-[#f8f9fa] border border-black/5 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
                  {STROKE_HINTS[currentStroke] || STROKE_HINTS.default}
                </div>
              </div>

              {/* Coloring Style (only for Outline Fill and Illust Fill) */}
              {isOutlineFillOrIllust && (
                <div className="flex flex-col gap-2 pt-3 border-t border-border">
                  <Label className="text-xs text-muted-foreground font-medium">
                    {t('drawing.coloringStyle', 'Coloring Style')}
                  </Label>
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      {COLORING_STYLES.slice(0, 2).map((style) => {
                        const active = currentColorStyle === style.id
                        return (
                          <button
                            key={style.id}
                            type="button"
                            className={`flex h-9 items-center justify-center rounded-[8px] text-xs font-semibold transition-all ${
                              active
                                ? 'border-[1.5px] border-black bg-[#f4f4f5] text-foreground shadow-sm'
                                : 'border border-black/10 bg-[#fbfaf7] text-muted-foreground hover:bg-black/5 hover:text-foreground'
                            }`}
                            onClick={() => animationService.setColoringStyle(style.id)}
                          >
                            {style.label}
                          </button>
                        )
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {COLORING_STYLES.slice(2).map((style) => {
                        const active = currentColorStyle === style.id
                        return (
                          <button
                            key={style.id}
                            type="button"
                            className={`flex h-9 items-center justify-center rounded-[8px] text-xs font-semibold transition-all ${
                              active
                                ? 'border-[1.5px] border-black bg-[#f4f4f5] text-foreground shadow-sm'
                                : 'border border-black/10 bg-[#fbfaf7] text-muted-foreground hover:bg-black/5 hover:text-foreground'
                            }`}
                            onClick={() => animationService.setColoringStyle(style.id)}
                          >
                            {style.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {/* Dynamic Color Description */}
                  <div className="rounded-[8px] bg-[#f8f9fa] border border-black/5 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
                    {COLOR_HINTS[currentColorStyle] || COLOR_HINTS.filled}
                  </div>
                </div>
              )}

              {/* Outline Detection */}
              <div className="flex flex-col gap-2 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground font-medium">
                    {t('drawing.outlineDetection', 'Outline Detection')}
                  </Label>
                </div>
                <span className="text-[10px] text-muted-foreground leading-snug">
                  {t('drawing.detectionHint', 'Strict = bold lines only · Fine = catches thin & light strokes')}
                </span>
                <div className="flex items-center gap-3 pt-1">
                  <Slider
                    value={[defaults.outlineDetect]}
                    min={0}
                    max={100}
                    onValueChange={(vals) => {
                      if (vals[0] !== undefined) animationService.setOutlineDetect(vals[0])
                    }}
                    className="flex-1"
                  />
                  <span className="rounded bg-[#e5e5e7] px-2 py-0.5 text-xs font-bold text-foreground tabular-nums">
                    {defaults.outlineDetect}
                  </span>
                </div>
              </div>

              {/* Detection Algorithm */}
              <div className="flex flex-col gap-2 pt-3 border-t border-border">
                <Label className="text-xs text-muted-foreground font-medium">
                  {t('drawing.detectionAlgorithm', 'Detection Algorithm')}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {DETECTION_ALGORITHMS.map((algo) => {
                    const active = currentAlgorithm === algo.id
                    return (
                      <button
                        key={algo.id}
                        type="button"
                        className={`flex h-9 items-center justify-center rounded-[8px] text-xs font-semibold transition-all ${
                          active
                            ? 'border-[1.5px] border-black bg-[#f4f4f5] text-foreground shadow-sm'
                            : 'border border-black/10 bg-[#fbfaf7] text-muted-foreground hover:bg-black/5 hover:text-foreground'
                        }`}
                        onClick={() => animationService.setDetectionAlgorithm(algo.id)}
                      >
                        {algo.label}
                      </button>
                    )
                  })}
                </div>
                {/* Dynamic Algorithm Description */}
                <div className="rounded-[8px] bg-[#f8f9fa] border border-black/5 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
                  {ALG_HINTS[currentAlgorithm] || ALG_HINTS.classic}
                </div>
              </div>
            </div>
          )}

          {/* FILL OPTIONS Accordion Section (only for Outline Fill & Illust Fill) */}
          {isOutlineFillOrIllust && (
            <Accordion type="single" collapsible defaultValue="fill-options">
              <AccordionItem
                value="fill-options"
                className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm"
              >
                <AccordionTrigger className="bg-transparent px-3 py-3 hover:no-underline">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-[2px] bg-foreground rounded-full" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
                      FILL OPTIONS
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3.5 pb-3.5 pt-1 flex flex-col gap-3.5">
                  {/* Image Reveal */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">
                      Image Reveal
                    </Label>
                    <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        id="image-reveal"
                        checked={imageReveal}
                        onChange={(e) => {
                          setImageReveal(e.target.checked)
                          setLegacyControlValue('image-reveal', String(e.target.checked))
                          const el = document.getElementById('image-reveal') as HTMLInputElement
                          if (el) el.checked = e.target.checked
                        }}
                        className="w-4 h-4 rounded accent-[#171918] cursor-pointer"
                      />
                      <span className="text-xs font-medium text-foreground">
                        Reveal original image at end
                      </span>
                    </label>
                    <span className="text-[10px] text-muted-foreground leading-snug">
                      Off → only the drawn strokes &amp; fills remain as the final result.
                    </span>
                  </div>

                  {/* Outline overlay */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-border">
                    <Label className="text-xs text-muted-foreground font-medium">
                      Outline overlay
                    </Label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="outline-visible"
                        checked={outlineVisible}
                        onChange={(e) => {
                          setOutlineVisible(e.target.checked)
                          animationService.setOutlineVisible(e.target.checked)
                        }}
                        className="w-4 h-4 rounded accent-[#171918] cursor-pointer"
                      />
                      <span className="text-xs font-medium text-foreground">
                        Show outlines on export
                      </span>
                    </label>
                    <div className="flex flex-col gap-1 pt-1">
                      <Label className="text-xs text-muted-foreground font-medium">
                        Opacity
                      </Label>
                      <div className="flex items-center gap-3">
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
                          className="flex-1"
                        />
                        <span className="rounded bg-[#e5e5e7] px-2 py-0.5 text-xs font-bold text-foreground tabular-nums">
                          {outlineOpacity}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Outline color */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-border">
                    <Label className="text-xs text-muted-foreground font-medium">
                      Outline color
                    </Label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        id="of-outline-color"
                        value={outlineColor}
                        disabled={outlineAutoColor}
                        onChange={(e) => {
                          setOutlineColor(e.target.value)
                          const el = document.getElementById('of-outline-color') as HTMLInputElement
                          if (el) el.value = e.target.value
                        }}
                        className={`w-9 h-8 p-0 border-0 cursor-pointer rounded-[6px] transition-opacity ${
                          outlineAutoColor ? 'opacity-40 pointer-events-none' : 'opacity-100'
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">
                        Pick a color or enable auto-detect below
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        id="of-outline-autocolor"
                        checked={outlineAutoColor}
                        onChange={(e) => {
                          setOutlineAutoColor(e.target.checked)
                          const el = document.getElementById('of-outline-autocolor') as HTMLInputElement
                          if (el) el.checked = e.target.checked
                        }}
                        className="w-4 h-4 rounded accent-[#171918] cursor-pointer"
                      />
                      <span className="text-xs font-medium text-foreground">
                        Auto-detect color from image
                      </span>
                    </label>
                  </div>

                  {/* Outline thickness */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-border">
                    <Label className="text-xs text-muted-foreground font-medium">
                      Outline thickness
                    </Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[outlineThickness]}
                        min={0.5}
                        max={8}
                        step={0.5}
                        onValueChange={(vals) => {
                          if (vals[0] !== undefined) {
                            setOutlineThickness(vals[0])
                            const el = document.getElementById('of-outline-thickness') as HTMLInputElement
                            if (el) el.value = String(vals[0])
                          }
                        }}
                        className="flex-1"
                      />
                      <span className="rounded bg-[#e5e5e7] px-2 py-0.5 text-xs font-bold text-foreground tabular-nums">
                        {outlineThickness}px
                      </span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* OUTLINE ONLY OPTIONS Accordion Section (only for Outline Only mode) */}
          {isOutlineOnly && (
            <Accordion type="single" collapsible defaultValue="outline-only-options">
              <AccordionItem
                value="outline-only-options"
                className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm"
              >
                <AccordionTrigger className="bg-transparent px-3 py-3 hover:no-underline">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-[2px] bg-foreground rounded-full" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
                      OUTLINE ONLY OPTIONS
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3.5 pb-3.5 pt-1 flex flex-col gap-3.5">
                  {/* Outline color */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground font-medium">
                      Outline color
                    </Label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        id="outlineonly-color"
                        value={outlineOnlyColor}
                        disabled={outlineOnlyAutoColor}
                        onChange={(e) => {
                          setOutlineOnlyColor(e.target.value)
                          animationService.setColor(e.target.value)
                          const el = document.getElementById('outlineonly-color') as HTMLInputElement
                          if (el) el.value = e.target.value
                        }}
                        className={`w-9 h-8 p-0 border-0 cursor-pointer rounded-[6px] transition-opacity ${
                          outlineOnlyAutoColor ? 'opacity-40 pointer-events-none' : 'opacity-100'
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">
                        Pick a color or enable auto-detect below
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        id="outlineonly-autocolor"
                        checked={outlineOnlyAutoColor}
                        onChange={(e) => {
                          setOutlineOnlyAutoColor(e.target.checked)
                          const el = document.getElementById('outlineonly-autocolor') as HTMLInputElement
                          if (el) el.checked = e.target.checked
                        }}
                        className="w-4 h-4 rounded accent-[#171918] cursor-pointer"
                      />
                      <span className="text-xs font-medium text-foreground">
                        Auto-detect color from image
                      </span>
                    </label>
                  </div>

                  {/* Outline thickness */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-border">
                    <Label className="text-xs text-muted-foreground font-medium">
                      Outline thickness
                    </Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[outlineOnlyThickness]}
                        min={0.5}
                        max={8}
                        step={0.5}
                        onValueChange={(vals) => {
                          if (vals[0] !== undefined) {
                            setOutlineOnlyThickness(vals[0])
                            const el = document.getElementById('outlineonly-thickness') as HTMLInputElement
                            if (el) el.value = String(vals[0])
                          }
                        }}
                        className="flex-1"
                      />
                      <span className="rounded bg-[#e5e5e7] px-2 py-0.5 text-xs font-bold text-foreground tabular-nums">
                        {outlineOnlyThickness}px
                      </span>
                    </div>
                  </div>

                  {/* Color Region Outlines */}
                  <div className="flex flex-col gap-1.5 pt-3 border-t border-border">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="outlineonly-colorregion"
                        checked={outlineOnlyColorRegion}
                        onChange={(e) => {
                          setOutlineOnlyColorRegion(e.target.checked)
                          if (e.target.checked) setOutlineOnlyRealImage(false)
                          const el = document.getElementById('outlineonly-colorregion') as HTMLInputElement
                          if (el) el.checked = e.target.checked
                          const elReal = document.getElementById('outlineonly-realimage') as HTMLInputElement
                          if (elReal && e.target.checked) elReal.checked = false
                        }}
                        className="w-4 h-4 rounded accent-[#171918] cursor-pointer"
                      />
                      <span className="text-xs font-bold text-foreground">
                        Color Region Outlines
                      </span>
                    </label>
                    <span className="text-[10px] text-muted-foreground leading-snug">
                      Detects solid color chunks and draws outlines around their edges — works great on cartoons &amp; anime where ink strokes are hard to find.
                    </span>
                  </div>

                  {/* Real Image Edges */}
                  <div className="flex flex-col gap-1.5 pt-3 border-t border-border">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="outlineonly-realimage"
                        checked={outlineOnlyRealImage}
                        onChange={(e) => {
                          setOutlineOnlyRealImage(e.target.checked)
                          if (e.target.checked) setOutlineOnlyColorRegion(false)
                          const el = document.getElementById('outlineonly-realimage') as HTMLInputElement
                          if (el) el.checked = e.target.checked
                          const elColor = document.getElementById('outlineonly-colorregion') as HTMLInputElement
                          if (elColor && e.target.checked) elColor.checked = false
                        }}
                        className="w-4 h-4 rounded accent-[#171918] cursor-pointer"
                      />
                      <span className="text-xs font-bold text-foreground">
                        Real Image Edges
                      </span>
                    </label>
                    <span className="text-[10px] text-muted-foreground leading-snug">
                      Uses gradient-based edge detection tuned for photos — finds object boundaries, facial features, and structural contours in real-world images.
                    </span>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* TEXT DRAW OPTIONS (only for Text Draw mode) */}
          {isTextDraw && (
            <Accordion type="single" collapsible defaultValue="text-draw-options">
              <AccordionItem
                value="text-draw-options"
                className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm"
              >
                <AccordionTrigger className="bg-transparent px-3 py-3 hover:no-underline">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-[2px] bg-foreground rounded-full" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
                      TEXT DRAW OPTIONS
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3.5 pb-3.5 pt-1 flex flex-col gap-3.5">
                  {/* Start Direction */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground font-medium">
                      Start Direction
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {TEXT_DIRECTIONS.map((dir) => {
                        const active = currentTextDir === dir.id
                        return (
                          <button
                            key={dir.id}
                            type="button"
                            className={`h-9 rounded-[8px] text-xs font-semibold transition-all ${
                              active
                                ? 'border-[1.5px] border-black bg-[#f4f4f5] text-foreground shadow-sm'
                                : 'border border-black/10 bg-[#fbfaf7] text-muted-foreground hover:bg-black/5 hover:text-foreground'
                            }`}
                            onClick={() => animationService.setDrawDirection(dir.id)}
                          >
                            {dir.label}
                          </button>
                        )
                      })}
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-snug">
                      Sets the order characters are drawn. Works best on flat text images — logos, title cards, handwritten words.
                    </span>
                  </div>

                  {/* Fill Style */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-border">
                    <Label className="text-xs text-muted-foreground font-medium">
                      Fill Style
                    </Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {TEXT_DRAW_STYLES.map((style) => {
                        const active = currentTextDrawStyle === style.id
                        return (
                          <button
                            key={style.id}
                            type="button"
                            className={`h-9 rounded-[8px] text-xs font-semibold transition-all ${
                              active
                                ? 'border-[1.5px] border-black bg-[#f4f4f5] text-foreground shadow-sm'
                                : 'border border-black/10 bg-[#fbfaf7] text-muted-foreground hover:bg-black/5 hover:text-foreground'
                            }`}
                            onClick={() => animationService.setTextDrawStyle(style.id)}
                          >
                            {style.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Outline Color & Thickness for Text (when Fill Style is outline or outline-fill) */}
                  {(currentTextDrawStyle === 'outline' || currentTextDrawStyle === 'outline-fill') && (
                    <>
                      <div className="flex flex-col gap-2 pt-3 border-t border-border">
                        <Label className="text-xs text-muted-foreground font-medium">
                          Outline color
                        </Label>
                        <div className="flex items-center gap-2.5">
                          <input
                            type="color"
                            id="text-outline-color"
                            value={textOutlineColor}
                            disabled={textOutlineAutoColor}
                            onChange={(e) => {
                              setTextOutlineColor(e.target.value)
                              const el = document.getElementById('text-outline-color') as HTMLInputElement
                              if (el) el.value = e.target.value
                            }}
                            className={`w-9 h-8 p-0 border-0 cursor-pointer rounded-[6px] transition-opacity ${
                              textOutlineAutoColor ? 'opacity-40 pointer-events-none' : 'opacity-100'
                            }`}
                          />
                          <span className="text-xs text-muted-foreground">
                            Pick a color or auto-detect
                          </span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            id="text-outline-autocolor"
                            checked={textOutlineAutoColor}
                            onChange={(e) => {
                              setTextOutlineAutoColor(e.target.checked)
                              const el = document.getElementById('text-outline-autocolor') as HTMLInputElement
                              if (el) el.checked = e.target.checked
                            }}
                            className="w-4 h-4 rounded accent-[#171918] cursor-pointer"
                          />
                          <span className="text-xs font-medium text-foreground">
                            Auto-detect color from image
                          </span>
                        </label>
                      </div>

                      <div className="flex flex-col gap-2 pt-3 border-t border-border">
                        <Label className="text-xs text-muted-foreground font-medium">
                          Outline thickness
                        </Label>
                        <div className="flex items-center gap-3">
                          <Slider
                            value={[textOutlineThickness]}
                            min={0.5}
                            max={8}
                            step={0.5}
                            onValueChange={(vals) => {
                              if (vals[0] !== undefined) {
                                setTextOutlineThickness(vals[0])
                                const el = document.getElementById('text-outline-thickness') as HTMLInputElement
                                if (el) el.value = String(vals[0])
                              }
                            }}
                            className="flex-1"
                          />
                          <span className="rounded bg-[#e5e5e7] px-2 py-0.5 text-xs font-bold text-foreground tabular-nums">
                            {textOutlineThickness}px
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </>
      )}
    </div>
  )
}
