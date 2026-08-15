import type { ReactElement } from 'react'
import { useSyncExternalStore } from 'react'
import { textService } from '@/app/services/text-service'
import { TEXT_FONTS, TEXT_COLOR_SWATCHES } from '@/engine/image-processing/text'
import { Button } from '@/app/components/ui/button'
import { Slider } from '@/app/components/ui/slider'
import { Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function TextPanel(): ReactElement {
  const { t } = useTranslation('tools')
  useSyncExternalStore(textService.subscribe, textService.getSnapshot)
  const placing = textService.isPlacing()
  const active = textService.isActive()
  const style = textService.getTextStyle()

  const onActivate = () => {
    textService.activatePlacement()
  }

  return (
    <div className="flex flex-col pb-6" data-text-controls>
      <div className="rounded-[10px] bg-surface-2/60 border border-black/10 px-3 py-3 text-[11px] leading-relaxed text-muted-foreground flex gap-3 items-center mb-4">
        <div className="mt-0.5"><Type className="w-4 h-4 text-foreground/70" /></div>
        <div>Click anywhere on the canvas to place text. Double-click a text layer to edit.</div>
      </div>

      {style && (
        <div className="flex flex-col">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            {t('text.font', 'FONT')}
          </div>
          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
            {TEXT_FONTS.map((font) => (
              <button
                key={font.family}
                className={`flex items-center rounded-[8px] border px-4 py-2 transition-all shrink-0 ${
                  style.fontFamily === font.family
                    ? 'bg-surface-1/50 border-black shadow-sm'
                    : 'bg-white border-black/10 hover:border-black/20'
                }`}
                onClick={() => textService.setFont(font.family)}
              >
                <span style={{ fontFamily: font.family }} className="text-xl w-14 text-left text-foreground">
                  {font.preview}
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-[12px] font-bold text-foreground leading-tight">{font.label}</span>
                  <span className="text-[10px] text-muted-foreground">{font.desc}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            {t('text.style', 'STYLE')}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="w-[50px] rounded-[8px] border border-black/15 px-2 py-1.5 text-xs text-foreground bg-white outline-none focus:ring-1 focus:ring-black"
                value={style.fontSize}
                onChange={(e) => {
                  const v = parseInt(e.target.value)
                  if (!isNaN(v)) textService.setSize(v)
                }}
              />
              <span className="text-[11px] text-muted-foreground font-medium">px</span>
            </div>
            
            <div className="flex gap-1.5 ml-1">
              <button
                className={`flex items-center justify-center w-7 h-7 rounded-[8px] border transition-all ${style.bold ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-black/15 hover:bg-surface-2'}`}
                onClick={() => textService.toggleBold()}
                title={t('text.bold')}
              >
                <Bold className="w-3.5 h-3.5" strokeWidth={3} />
              </button>
              <button
                className={`flex items-center justify-center w-7 h-7 rounded-[8px] border transition-all ${style.italic ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-black/15 hover:bg-surface-2'}`}
                onClick={() => textService.toggleItalic()}
                title={t('text.italic')}
              >
                <Italic className="w-3.5 h-3.5" strokeWidth={3} />
              </button>
            </div>
            
            <div className="flex-1" />
            
            <div className="flex gap-1.5">
              <button
                className={`flex items-center justify-center w-7 h-7 rounded-[8px] border transition-all ${style.align === 'left' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-black/15 hover:bg-surface-2'}`}
                onClick={() => textService.setAlign('left')}
                title={t('text.alignLeft')}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                className={`flex items-center justify-center w-7 h-7 rounded-[8px] border transition-all ${style.align === 'center' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-black/15 hover:bg-surface-2'}`}
                onClick={() => textService.setAlign('center')}
                title={t('text.alignCenter')}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                className={`flex items-center justify-center w-7 h-7 rounded-[8px] border transition-all ${style.align === 'right' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-black/15 hover:bg-surface-2'}`}
                onClick={() => textService.setAlign('right')}
                title={t('text.alignRight')}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center justify-between">
                <span>{t('text.lineHeight', 'LINE HEIGHT')}</span>
              </div>
              <Slider
                value={[style.lineHeight]}
                min={0.8}
                max={2.5}
                step={0.05}
                onValueChange={([v]) => {
                  if (v !== undefined) textService.setLineHeight(v)
                }}
                className="py-1"
              />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center justify-between">
                <span>{t('text.letterSpacing', 'SPACING')}</span>
                <span className="text-[10px] text-muted-foreground/70 font-medium normal-case tracking-normal">{style.letterSpacing.toFixed(2)}</span>
              </div>
              <Slider
                value={[style.letterSpacing]}
                min={-5}
                max={30}
                step={0.5}
                onValueChange={([v]) => {
                  if (v !== undefined) textService.setLetterSpacing(v)
                }}
                className="py-1"
              />
            </div>
          </div>

          <div className="mt-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            {t('text.color', 'COLOR')}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {TEXT_COLOR_SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                className={`h-7 w-7 rounded-full shadow-sm transition-transform hover:scale-110 ${color === '#ffffff' ? 'border border-black/15' : 'border border-black/5'} ${
                  style.color === color
                    ? 'ring-2 ring-primary ring-offset-2'
                    : ''
                }`}
                style={{ backgroundColor: color }}
                onClick={() => textService.setColor(color)}
                aria-label={t('text.selectColor', { color })}
              />
            ))}
            
            {/* Custom Color Button (mock representation for the gradient circle) */}
            <label className={`h-7 w-7 rounded-full shadow-sm transition-transform hover:scale-110 flex items-center justify-center cursor-pointer ${
                  !TEXT_COLOR_SWATCHES.includes(style.color) ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                style={{ background: 'conic-gradient(from 180deg at 50% 50%, #ff0000 0deg, #ff8a00 60deg, #ffe600 120deg, #14ff00 180deg, #00a3ff 240deg, #0500ff 300deg, #ff0000 360deg)' }}>
              <input
                type="color"
                value={!TEXT_COLOR_SWATCHES.includes(style.color) ? style.color : '#000000'}
                onChange={(e) => textService.setColor(e.target.value)}
                className="sr-only"
              />
              <div className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center text-black">
                <span className="text-[10px] font-bold">+</span>
              </div>
            </label>
          </div>

          <Button
            className={`w-full mt-6 rounded-lg py-2.5 font-bold shadow-sm transition-all ${
              placing || active
                ? 'bg-primary text-primary-foreground animate-pulse'
                : 'bg-[#171918] hover:bg-[#252826] text-white'
            }`}
            onClick={onActivate}
          >
            {placing || active ? (
              <span className="flex items-center gap-1.5"><Type className="w-3.5 h-3.5" /> {t('text.placing', 'Click canvas to place text…')}</span>
            ) : (
              <span className="flex items-center gap-1.5"><span className="text-[13px] mr-0.5">+</span> {t('text.add', 'Click canvas to place text')}</span>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
