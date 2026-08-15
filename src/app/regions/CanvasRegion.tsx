import { type ReactElement, useRef, useState, useLayoutEffect } from 'react'
import { Crop, Grid3X3 } from 'lucide-react'
import { CanvasViewport } from '@/app/components/canvas/CanvasViewport'
import { CanvasStage } from '@/app/components/canvas/CanvasStage'
import { CanvasOverlay } from '@/app/components/canvas/CanvasOverlay'
import { PlaybackTransport } from '@/app/components/canvas/PlaybackTransport'
import { BottomBar } from '@/app/regions/BottomBar'
import { useCanvasHost } from '@/app/hooks/useCanvasHost'
import { useCanvasInteraction } from '@/app/hooks/useCanvasInteraction'
import { CropFeature } from '@/app/features/crop/CropFeature'
import { SlicerFeature } from '@/app/features/slicer/SlicerFeature'
import { TextFeature } from '@/app/features/text/TextFeature'
import { cropService } from '@/app/services/crop-service'
import { slicerService } from '@/app/services/slicer-service'
import { playbackService } from '@/app/services/playback-service'
import {
  selectIsPlaying,
  useAnimationStore,
  useCanvasStore,
  useLayerStore,
  usePlaybackStore,
  useSelectionStore,
} from '@/app/store'
import { useTranslation } from 'react-i18next'

const LABEL_KEYS: Readonly<Record<string, string>> = {
  scanner: 'styles.scanner',
  contour: 'styles.contour',
  'outline-chunks': 'styles.outlineChunks',
  'chunk-jump': 'styles.chunkJump',
  'specialized-human': 'styles.human',
  'specialized-animal': 'styles.animal',
  'specialized-portrait': 'styles.portrait',
  'specialized-vehicle': 'styles.vehicle',
  'specialized-building': 'styles.building',
  'specialized-landscape': 'styles.landscape',
  'specialized-spiral': 'styles.spiral',
  'outline-fill': 'drawing.outlineFill',
  'illust-fill': 'drawing.illustFill',
  'outline-only': 'drawing.outlineOnly',
  'text-draw': 'drawing.text',
}

export function CanvasRegion(): ReactElement {
  const { t } = useTranslation(['editor', 'common', 'animation'])
  const refs = useCanvasHost()
  useCanvasInteraction(refs.selection, refs.viewport)
  const hasLayers = useLayerStore((state) => state.layers.length > 0)
  const isPlaying = usePlaybackStore(selectIsPlaying)
  const editorMode = useSelectionStore((state) => state.editorMode)
  const activeMode = useAnimationStore((state) => state.activeMode)
  const canvas = useCanvasStore((state) => state.canvas)
  const ratio = canvas?.aspectRatio ?? '16:9'
  const size = canvas?.size ?? DEFAULT_CANVAS_SIZE
  const cropActive = editorMode === 'crop'
  const slicerActive = editorMode === 'slicer'
  const canPlay = hasLayers && playbackService.canPlay()

  const containerRef = useRef<HTMLDivElement>(null)
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateSize = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0 && size.width > 0 && size.height > 0) {
        const scale = Math.min(rect.width / size.width, rect.height / size.height)
        setDisplaySize({
          width: Math.max(1, Math.floor(size.width * scale)),
          height: Math.max(1, Math.floor(size.height * scale)),
        })
      }
    }
    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(el)
    return () => ro.disconnect()
  }, [size.width, size.height])

  return (
    <main
      data-region="canvas"
      className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-black/10 bg-background shadow-[0_8px_24px_rgba(24,28,26,0.06)]"
    >
      <div className="canvas-workspace relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 pb-10 sm:p-5 sm:pb-12 2xl:p-7">
        <div ref={containerRef} className="relative flex h-full w-full items-center justify-center">
          <CanvasViewport
            viewportRef={refs.viewport}
            width={displaySize.width}
            height={displaySize.height}
            aspectRatio={`${size.width} / ${size.height}`}
          >
            <CanvasStage mainRef={refs.main} handRef={refs.hand} />
            <CanvasOverlay selectionRef={refs.selection} outlineOverlayRef={refs.outlineOverlay} />
            <TextFeature />
            {cropActive && <CropFeature />}
            {slicerActive && <SlicerFeature />}
            <span
              data-testid="animation-mode-badge"
              className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-black/10 bg-[#fffdf8]/95 px-3 py-1 text-[10px] font-semibold text-black shadow-sm"
            >
              {LABEL_KEYS[activeMode]
                ? t(LABEL_KEYS[activeMode], { ns: 'animation' })
                : t('canvas.animation')}
            </span>
          </CanvasViewport>

          {!isPlaying && (
            <div
              data-testid="canvas-edit-toolbar"
              className={`absolute left-1/2 top-3 z-10 flex -translate-x-1/2 gap-2 rounded-full border border-black/5 bg-white p-2 shadow-lg transition-opacity duration-300 ${hasLayers ? '' : 'pointer-events-none opacity-0'}`}
            >
              <button
                type="button"
                onClick={() => cropService.activate()}
                disabled={!hasLayers || cropActive || slicerActive}
                data-testid="crop-activate-btn"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-[#f8f9fa] px-4 text-[13px] font-semibold text-foreground transition hover:bg-black/5 hover:border-black/20 disabled:opacity-40"
              >
                <Crop className="h-4 w-4 opacity-70" />
                {t('canvas.crop')}
              </button>
              <div className="my-1 w-px bg-black/10" />
              <button
                type="button"
                onClick={() => slicerService.activate()}
                disabled={!hasLayers || cropActive || slicerActive}
                data-testid="slicer-activate-btn"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-[#f8f9fa] px-4 text-[13px] font-semibold text-foreground transition hover:bg-black/5 hover:border-black/20 disabled:opacity-40"
              >
                <Grid3X3 className="h-4 w-4 opacity-70" />
                {t('canvas.slicer', 'Slicer')}
              </button>
            </div>
          )}

          <PlaybackTransport canPlay={canPlay} isPlaying={isPlaying} />
        </div>
        <div className="absolute right-3 top-3 rounded-full border border-black/5 bg-[#fffdf8]/85 px-2.5 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur">
          {size.width} × {size.height} · {ratio}
        </div>
      </div>
      <BottomBar />
    </main>
  )
}

const DEFAULT_CANVAS_SIZE = { width: 1280, height: 720 } as const
