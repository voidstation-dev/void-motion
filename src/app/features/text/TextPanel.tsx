import type { ReactElement } from 'react'
import { useSyncExternalStore } from 'react'
import { textService } from '@/app/services/text-service'
import { TEXT_FONTS, TEXT_COLOR_SWATCHES } from '@/engine/image-processing/text'
import { Button } from '@/app/components/ui/button'
import { Slider } from '@/app/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/app/components/ui/toggle-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Label } from '@/app/components/ui/label'
import { Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function TextPanel(): ReactElement {
  const { t } = useTranslation('tools')
  useSyncExternalStore(textService.subscribe, textService.getSnapshot)
  const placing = textService.isPlacing()
  const active = textService.isActive()
  const style = textService.getTextStyle()

  const onActivate = () => {
    if (!placing && !active) {
      textService.activatePlacement()
    } else {
      textService.cancelPlacement()
      if (active) textService.closeEditor(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 py-2" data-text-controls>
      <Button
        variant={placing || active ? 'default' : 'outline'}
        className="w-full justify-start gap-2"
        onClick={onActivate}
      >
        <Type className="h-4 w-4" />
        {placing ? t('text.placing') : active ? t('text.editing') : t('text.add')}
      </Button>

      {style && (
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>{t('text.font')}</Label>
            <Select value={style.fontFamily} onValueChange={(v) => textService.setFont(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_FONTS.map((font) => (
                  <SelectItem key={font.family} value={font.family}>
                    <span style={{ fontFamily: font.family }}>{font.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('text.size')}</Label>
              <span className="text-xs tabular-nums text-muted-foreground">{style.fontSize}px</span>
            </div>
            <Slider
              value={[style.fontSize]}
              min={10}
              max={400}
              step={1}
              onValueChange={([v]) => {
                if (v !== undefined) textService.setSize(v)
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <ToggleGroup
              type="multiple"
              value={[...(style.bold ? ['bold'] : []), ...(style.italic ? ['italic'] : [])]}
              onValueChange={(v) => {
                if (v.includes('bold') !== style.bold) textService.toggleBold()
                if (v.includes('italic') !== style.italic) textService.toggleItalic()
              }}
            >
              <ToggleGroupItem value="bold" aria-label={t('text.bold')}>
                <Bold className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="italic" aria-label={t('text.italic')}>
                <Italic className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <ToggleGroup
              type="single"
              value={style.align}
              onValueChange={(v) => {
                if (v) textService.setAlign(v as 'left' | 'center' | 'right')
              }}
            >
              <ToggleGroupItem value="left" aria-label={t('text.alignLeft')}>
                <AlignLeft className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="center" aria-label={t('text.alignCenter')}>
                <AlignCenter className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="right" aria-label={t('text.alignRight')}>
                <AlignRight className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label>{t('text.color')}</Label>
            <div className="flex flex-wrap gap-2">
              {TEXT_COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-6 w-6 rounded-full border border-border shadow-sm transition-transform hover:scale-110 ${
                    style.color === color
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                      : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => textService.setColor(color)}
                  aria-label={t('text.selectColor', { color })}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('text.lineHeight')}</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {style.lineHeight.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[style.lineHeight]}
              min={0.8}
              max={2.5}
              step={0.05}
              onValueChange={([v]) => {
                if (v !== undefined) textService.setLineHeight(v)
              }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('text.letterSpacing')}</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {style.letterSpacing.toFixed(1)}px
              </span>
            </div>
            <Slider
              value={[style.letterSpacing]}
              min={-5}
              max={30}
              step={0.5}
              onValueChange={([v]) => {
                if (v !== undefined) textService.setLetterSpacing(v)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
