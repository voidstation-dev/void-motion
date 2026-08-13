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
      className="flex h-full w-[336px] shrink-0 flex-col overflow-hidden rounded-[14px] border border-black/10 bg-sidebar shadow-[0_8px_24px_rgba(24,28,26,0.06)]"
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

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        <section
          className="rounded-[12px] border border-border bg-[#fbfaf7] p-3"
          aria-label={t('input.mode')}
        >
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t('input.mode')}
          </div>
          <Tabs
            value={editorMode}
            onValueChange={(value) =>
              (value === 'image' || value === 'text') && layerService.switchTab(value)
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="image">{t('input.image')}</TabsTrigger>
              <TabsTrigger value="text">{t('input.text')}</TabsTrigger>
            </TabsList>
            <TabsContent value="image" className="mt-3">
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
                className={`flex w-full flex-col items-center rounded-[12px] border border-dashed px-4 py-5 text-center transition ${dragging ? 'border-[#d3a13a] bg-[#fbf7ed]' : 'border-border bg-background hover:border-[#d3a13a]/50 hover:bg-[#fbf7ed]'}`}
              >
                <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2">
                  {dragging ? <ImagePlus className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                </span>
                <span className="text-xs font-semibold">{t('input.drop')}</span>
                <span className="mt-1 text-[10px] text-muted-foreground">{t('input.formats')}</span>
              </label>
            </TabsContent>
            <TabsContent value="text" className="mt-3">
              <TextPanel />
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t('input.background')}
          </div>
          <div className="mt-2 flex gap-1.5">
            {[
              { label: t('input.white'), value: { type: 'solid', val: 'white' } as const },
              { label: t('input.black'), value: { type: 'solid', val: '#000000' } as const },
              { label: t('input.none'), value: { type: 'solid', val: 'transparent' } as const },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => backgroundService.setBackground(option.value)}
                className={`rounded-full border px-3 py-1 text-[10px] ${isActiveBackground(background, option.value) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="color"
              value={background?.type === 'custom' ? background.val : '#ffffff'}
              onChange={(event) =>
                backgroundService.setBackground({ type: 'custom', val: event.target.value })
              }
              className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
            />
            {t('input.customColor')}
          </label>
          <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t('input.presets')}
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {BACKGROUNDS.map((item) => (
              <button
                key={(item.background as { key?: GradientKey }).key ?? item.labelKey}
                type="button"
                title={t(`input.backgrounds.${item.labelKey}`)}
                aria-label={t(`input.backgrounds.${item.labelKey}`)}
                onClick={() => backgroundService.setBackground(item.background)}
                className={`aspect-square rounded-lg border-2 ${item.className} ${isActiveBackground(background, item.background) ? 'border-primary shadow-sm' : 'border-transparent ring-1 ring-border'}`}
              />
            ))}
          </div>
        </section>

        <section className="mt-4" aria-label={t('input.layerList')}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold">{t('input.title')}</h3>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted-foreground">
              {t('layerCount', { ns: 'projects', count: layers.length })}
            </span>
          </div>
          <LayerPanel showHeader={false} />
        </section>
      </div>
    </aside>
  )
}
