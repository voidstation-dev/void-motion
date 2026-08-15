import { useRef, useState, type DragEvent, type ReactElement } from 'react'
import { ImagePlus, Layers3, Upload } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { LayerPanel } from '@/app/components/layer/LayerPanel'
import { TextPanel } from '@/app/features/text/TextPanel'
import { layerService } from '@/app/services/layer-service'
import { inputService } from '@/app/services/input-service'
import { backgroundService } from '@/app/services/background-service'
import { useCanvasStore, useLayerStore, useSelectionStore } from '@/app/store'
import type { CanvasBackground, GradientKey } from '@/types/canvas'
import { useTranslation } from 'react-i18next'

const BACKGROUNDS: ReadonlyArray<{
  labelKey: string
  background: CanvasBackground
  className: string
}> = [
  {
    labelKey: 'notebook',
    background: { type: 'gradient', key: 'notebook' },
    className:
      'bg-[#f4f8fc] bg-[linear-gradient(#c8d8e8_1px,transparent_1px)] bg-[length:100%_9px]',
  },
  {
    labelKey: 'graph',
    background: { type: 'gradient', key: 'graph' },
    className:
      'bg-[#f0f6fa] bg-[linear-gradient(#d7e5ee_1px,transparent_1px),linear-gradient(90deg,#d7e5ee_1px,transparent_1px)] bg-[length:10px_10px]',
  },
  {
    labelKey: 'cream',
    background: { type: 'gradient', key: 'cream' },
    className: 'bg-gradient-to-br from-[#f1e6cc] to-[#d4b87a]',
  },
  {
    labelKey: 'chalk',
    background: { type: 'gradient', key: 'chalk' },
    className: 'bg-gradient-to-br from-[#2d4a3e] to-[#0f2318]',
  },
  {
    labelKey: 'softgrad',
    background: { type: 'gradient', key: 'softgrad' },
    className: 'bg-gradient-to-br from-[#f5f0ff] via-[#e8f4ff] to-[#f0fff4]',
  },
  {
    labelKey: 'warmwhite',
    background: { type: 'gradient', key: 'warmwhite' },
    className: 'bg-[#fafaf7]',
  },
  {
    labelKey: 'blueprint',
    background: { type: 'gradient', key: 'blueprint' },
    className:
      'bg-[#1a3a5c] bg-[linear-gradient(#285579_1px,transparent_1px),linear-gradient(90deg,#285579_1px,transparent_1px)] bg-[length:10px_10px]',
  },
  { labelKey: 'kraft', background: { type: 'gradient', key: 'kraft' }, className: 'bg-[#c8973a]' },
  { labelKey: 'dark', background: { type: 'gradient', key: 'dark' }, className: 'bg-[#0f0f11]' },
  { labelKey: 'linen', background: { type: 'gradient', key: 'linen' }, className: 'bg-[#f5ede0]' },
]

function isActiveBackground(
  current: CanvasBackground | undefined,
  candidate: CanvasBackground,
): boolean {
  if (!current || current.type !== candidate.type) return false
  if (current.type === 'gradient' && candidate.type === 'gradient')
    return current.key === candidate.key
  return 'val' in current && 'val' in candidate && current.val === candidate.val
}

export function Sidebar(): ReactElement {
  const { t } = useTranslation(['editor', 'projects'])
  const editorMode = useSelectionStore((state) => state.editorMode)
  const layers = useLayerStore((state) => state.layers)
  const background = useCanvasStore((state) => state.canvas?.background)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = (files: FileList): void => {
    inputService.addImages(files)
  }
  const onDrop = (event: DragEvent<HTMLLabelElement>): void => {
    event.preventDefault()
    setDragging(false)
    addFiles(event.dataTransfer.files)
  }

  return (
    <aside
      data-region="sidebar"
      className="flex h-full w-[336px] shrink-0 flex-col overflow-hidden bg-white border-l border-border"
    >
      <div className="flex items-center gap-3 border-b border-border px-3 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#dce8ee] text-[#183d59]">
          <Layers3 className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">{t('input.title')}</h2>
          <p className="text-[11px] text-muted-foreground">{t('input.subtitle')}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5 bg-[#fbfaf7]">
        <section
          className="rounded-[16px] border border-black/5 bg-white p-4 shadow-sm"
          aria-label={t('input.mode')}
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t('input.mode', 'INPUT MODE')}
            </div>
            <div className="flex-1 h-[1px] bg-border" />
          </div>
          <Tabs
            value={editorMode}
            onValueChange={(value) =>
              (value === 'image' || value === 'text') && layerService.switchTab(value)
            }
          >
            <TabsList className="w-full bg-[#f4f4f5] rounded-[10px] p-1 h-auto mb-4 border border-black/5">
              <TabsTrigger
                value="image"
                className="flex-1 rounded-[8px] py-1.5 text-xs font-semibold data-[state=active]:bg-[#171918] data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                {t('input.image', 'Image')}
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="flex-1 rounded-[8px] py-1.5 text-xs font-semibold data-[state=active]:bg-[#171918] data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                {t('input.text', 'Text')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="image" className="mt-0 outline-none">
              <input
                ref={inputRef}
                id="void-motion-image-upload"
                type="file"
                accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => {
                  if (event.target.files) addFiles(event.target.files)
                  event.target.value = ''
                }}
              />
              <label
                htmlFor="void-motion-image-upload"
                role="button"
                tabIndex={0}
                aria-label={t('input.drop')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    inputRef.current?.click()
                  }
                }}
                onDragEnter={(event) => {
                  event.preventDefault()
                  setDragging(true)
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex w-full flex-col items-center justify-center rounded-[12px] bg-transparent border-2 border-dashed border-black/15 px-4 py-8 text-center transition ${dragging ? 'bg-surface-2 ring-2 ring-black/10' : 'hover:bg-black/5'}`}
              >
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-foreground border border-black/10 shadow-sm">
                  {dragging ? <ImagePlus className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                </span>
                <span className="text-[13px] font-bold text-foreground">
                  {t('input.drop', 'Drop images or browse')}
                </span>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  {t('input.formats', 'PNG, JPG, GIF, SVG · Multiple files OK')}
                </span>
              </label>
            </TabsContent>
            <TabsContent value="text" className="mt-3">
              <TextPanel />
            </TabsContent>
          </Tabs>
        </section>

        <section
          className="mt-3 rounded-[16px] border border-black/5 bg-white p-4 shadow-sm"
          aria-label={t('input.background')}
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground border-l-[3px] border-l-black pl-2">
              {t('input.background', 'CANVAS BACKGROUND')}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {[
              { label: t('input.white', 'White'), value: { type: 'solid', val: 'white' } as const },
              {
                label: t('input.black', 'Black'),
                value: { type: 'solid', val: '#000000' } as const,
              },
              {
                label: t('input.none', 'None'),
                value: { type: 'solid', val: 'transparent' } as const,
              },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => backgroundService.setBackground(option.value)}
                className={`flex items-center justify-center rounded-[7px] border px-2 py-1.5 text-[11px] font-medium transition-all ${isActiveBackground(background, option.value) ? 'border-primary border-l-[3px] border-l-primary bg-black/5 text-foreground' : 'border-border bg-panel text-muted-foreground hover:-translate-y-[1px] hover:border-black/15 hover:text-foreground'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-3 text-xs font-medium text-foreground">
            <input
              type="color"
              value={background?.type === 'custom' ? background.val : '#ffffff'}
              onChange={(event) =>
                backgroundService.setBackground({ type: 'custom', val: event.target.value })
              }
              className={`h-7 w-7 cursor-pointer rounded-[8px] border border-black/10 p-0 transition-all outline-none ${background?.type === 'custom' ? 'ring-2 ring-foreground/20' : ''}`}
            />
            {t('input.customColor', 'Custom solid color')}
          </label>
          <div className="mt-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            {t('input.presets', 'PRESETS')}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {BACKGROUNDS.map((item) => (
              <button
                key={(item.background as { key?: GradientKey }).key ?? item.labelKey}
                type="button"
                title={t(`input.backgrounds.${item.labelKey}`)}
                aria-label={t(`input.backgrounds.${item.labelKey}`)}
                onClick={() => backgroundService.setBackground(item.background)}
                className={`aspect-square rounded-[10px] transition-all ${item.className} ${isActiveBackground(background, item.background) ? 'ring-2 ring-foreground ring-offset-1 shadow-sm' : 'border border-black/5 hover:opacity-80'}`}
              />
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[16px] border border-black/5 bg-white p-4 shadow-sm" aria-label={t('input.layerList')}>
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="text-[13px] font-bold text-foreground">{t('input.title', 'Layers')}</h3>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-[6px] border border-black/10 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-surface-2 transition-colors"
                onClick={() => layerService.createGroupFromSelected()}
              >
                <Layers3 className="h-3.5 w-3.5" />
                Group
              </button>
              <span className="rounded-full border border-black/10 bg-[#f4f4f5] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {t('layerCount', { ns: 'projects', count: layers.length })}
              </span>
            </div>
          </div>
          <LayerPanel showHeader={false} />
        </section>
      </div>
    </aside>
  )
}
