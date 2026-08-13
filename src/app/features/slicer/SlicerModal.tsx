/**
 * Slicer modal (M12).
 *
 * The slicer modal — a Dialog overlay with mode tabs (Grid / Rectangles /
 * Freehand), a preview canvas, per-mode controls, and a footer with the apply
 * button. Mirrors the legacy `#slicer-modal`
 * (`legacy/index.html:4134-4226`):
 *   - tabs `stab-grid`/`stab-rect`/`stab-freehand` → `switchSlicerTab(mode)`;
 *   - `#slicer-preview-canvas` where the user draws slice regions;
 *   - grid controls `#slicer-cols`/`#slicer-rows` (range 1–8, default 2);
 *   - rect/freehand slice lists with drag-to-reorder + clear-all;
 *   - footer `#slicer-footer-info` + `#slicer-apply-btn` (disabled until
 *     enough slices are defined).
 *
 * The modal is open while `editorMode === 'slicer'`. Cancel (close) exits
 * slicer mode with no mutation; Apply confirms the slices (replaces the
 * original layer with the new slices).
 */
import type { ReactElement } from 'react'
import { useRef, useSyncExternalStore } from 'react'
import { Scissors } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Slider } from '@/app/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/components/ui/dialog'
import { slicerService } from '@/app/services/slicer-service'
import { useSelectionStore } from '@/app/store'
import { useSlicerPreview } from './useSlicerPreview'
import { SLICE_COLORS, SLICER_GRID_MIN, SLICER_GRID_MAX } from '@/engine/image-processing/slicer'
import { useTranslation } from 'react-i18next'

/** Safe slice-color lookup (noUncheckedIndexedAccess guards the tuple). */
function sliceColor(i: number): string {
  return SLICE_COLORS[i % SLICE_COLORS.length] ?? SLICE_COLORS[0] ?? '#e74c3c'
}

export function SlicerModal(): ReactElement {
  const { t } = useTranslation(['tools', 'common'])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const editorMode = useSelectionStore((s) => s.editorMode)
  const slicerMode = useSelectionStore((s) => s.slicerMode)
  const open = editorMode === 'slicer'
  // Subscribe to the service's own session pub/sub (every service mutation
  // auto-notifies), so the lists + footer update live.
  useSyncExternalStore(
    (l) => slicerService.subscribe(l),
    () => slicerService.getSnapshot(),
  )
  useSlicerPreview(canvasRef, slicerMode)

  const session = slicerService.session
  const mode = session?.mode ?? 'grid'
  const gridCols = session?.gridCols ?? 2
  const gridRows = session?.gridRows ?? 2
  const rects = session?.rects ?? []
  const freehandPaths = session?.freehandPaths ?? []
  const canApply = slicerService.canApply()
  const footerText =
    mode === 'grid'
      ? t('slicer.footer.grid', { ns: 'tools', count: gridCols * gridRows })
      : mode === 'rect'
        ? rects.length > 0
          ? t('slicer.footer.rect', { ns: 'tools', count: rects.length })
          : t('slicer.footer.rectEmpty', { ns: 'tools' })
        : freehandPaths.length > 0
          ? t('slicer.footer.freehand', { ns: 'tools', count: freehandPaths.length })
          : t('slicer.footer.freehandEmpty', { ns: 'tools' })

  const onOpenChange = (next: boolean): void => {
    if (!next) slicerService.cancel()
  }
  const onModeChange = (next: string): void => {
    if (next === 'grid' || next === 'rect' || next === 'freehand') {
      slicerService.setMode(next)
    }
  }
  const onColsChange = (vals: number[]): void => {
    slicerService.setGrid(vals[0] ?? 2, gridRows)
  }
  const onRowsChange = (vals: number[]): void => {
    slicerService.setGrid(gridCols, vals[0] ?? 2)
  }
  const onRemoveRect = (i: number): void => {
    slicerService.removeRect(i)
  }
  const onRemoveFreehand = (i: number): void => {
    slicerService.removeFreehand(i)
  }
  const onClearRects = (): void => {
    slicerService.clearRects()
  }
  const onClearFreehand = (): void => {
    slicerService.clearFreehand()
  }
  const onApply = (): void => {
    slicerService.confirm()
  }
  const onCancel = (): void => {
    slicerService.cancel()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl gap-0 p-0"
        data-testid="slicer-modal"
        onEscapeKeyDown={onCancel}
        onPointerDownOutside={(e) => {
          // Legacy closes on backdrop click (4134: if(event.target===this)closeSlicerModal()).
          e.preventDefault()
          onCancel()
        }}
      >
        <DialogHeader className="border-b p-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scissors className="h-4 w-4" />
            {t('slicer.title', { ns: 'tools' })}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('slicer.description', { ns: 'tools' })}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={onModeChange} className="px-4 pt-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="grid" data-testid="slicer-tab-grid">
              {t('slicer.grid', { ns: 'tools' })}
            </TabsTrigger>
            <TabsTrigger value="rect" data-testid="slicer-tab-rect">
              {t('slicer.rectangles', { ns: 'tools' })}
            </TabsTrigger>
            <TabsTrigger value="freehand" data-testid="slicer-tab-freehand">
              {t('slicer.freehand', { ns: 'tools' })}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex min-h-[320px] gap-0 sm:flex-row flex-col">
          {/* Preview canvas */}
          <div
            className="flex flex-1 items-center justify-center bg-muted/30 p-4"
            data-testid="slicer-preview-wrap"
          >
            <canvas
              ref={canvasRef}
              id="slicer-preview-canvas"
              data-testid="slicer-preview-canvas"
              className="max-h-[320px] max-w-full touch-none rounded bg-neutral-700"
              style={{ cursor: mode === 'grid' ? 'default' : 'crosshair' }}
            />
          </div>

          {/* Controls panel */}
          <div className="w-full sm:w-64 space-y-3 border-t sm:border-t-0 sm:border-l p-4">
            {mode === 'grid' && (
              <div className="space-y-4" data-testid="slicer-pane-grid">
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    {t('slicer.columns', { ns: 'tools' })}:{' '}
                    <span data-testid="slicer-cols-val">{gridCols}</span>
                  </div>
                  <Slider
                    value={[gridCols]}
                    onValueChange={onColsChange}
                    min={SLICER_GRID_MIN}
                    max={SLICER_GRID_MAX}
                    step={1}
                    data-testid="slicer-cols"
                  />
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    {t('slicer.rows', { ns: 'tools' })}:{' '}
                    <span data-testid="slicer-rows-val">{gridRows}</span>
                  </div>
                  <Slider
                    value={[gridRows]}
                    onValueChange={onRowsChange}
                    min={SLICER_GRID_MIN}
                    max={SLICER_GRID_MAX}
                    step={1}
                    data-testid="slicer-rows"
                  />
                </div>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  {t('slicer.gridHelp', { ns: 'tools' })}
                </p>
              </div>
            )}

            {mode === 'rect' && (
              <div className="space-y-2" data-testid="slicer-pane-rect">
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  {t('slicer.rectHelp', { ns: 'tools' })}
                </p>
                <div className="text-xs font-medium text-muted-foreground">
                  {t('slicer.slices', { ns: 'tools', count: rects.length })}
                </div>
                <div className="space-y-1" data-testid="slicer-rect-list">
                  {rects.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded border px-2 py-1 text-xs"
                      data-testid={`slicer-rect-item-${i}`}
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ background: sliceColor(i) }}
                      />
                      <span className="flex-1 truncate">
                        {r.label} — {Math.round(r.w)}×{Math.round(r.h)}
                      </span>
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => onRemoveRect(i)}
                        aria-label={t('slicer.removeSlice', { ns: 'tools', number: i + 1 })}
                        data-testid={`slicer-rect-del-${i}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-full text-[10px]"
                  onClick={onClearRects}
                  disabled={rects.length === 0}
                  data-testid="slicer-rect-clear"
                >
                  {t('slicer.clearAll', { ns: 'tools' })}
                </Button>
              </div>
            )}

            {mode === 'freehand' && (
              <div className="space-y-2" data-testid="slicer-pane-freehand">
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  {t('slicer.freehandHelp', { ns: 'tools' })}
                </p>
                <div className="text-xs font-medium text-muted-foreground">
                  {t('slicer.slices', { ns: 'tools', count: freehandPaths.length })}
                </div>
                <div className="space-y-1" data-testid="slicer-fh-list">
                  {freehandPaths.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded border px-2 py-1 text-xs"
                      data-testid={`slicer-fh-item-${i}`}
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ background: sliceColor(i) }}
                      />
                      <span className="flex-1 truncate">
                        {p.label} — {Math.round(p.bounds.w)}×{Math.round(p.bounds.h)}
                      </span>
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => onRemoveFreehand(i)}
                        aria-label={t('slicer.removeRegion', { ns: 'tools', number: i + 1 })}
                        data-testid={`slicer-fh-del-${i}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-full text-[10px]"
                  onClick={onClearFreehand}
                  disabled={freehandPaths.length === 0}
                  data-testid="slicer-fh-clear"
                >
                  {t('slicer.clearAll', { ns: 'tools' })}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t p-4">
          <span className="text-xs text-muted-foreground" data-testid="slicer-footer-info">
            {footerText}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} data-testid="slicer-cancel-btn">
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button size="sm" onClick={onApply} disabled={!canApply} data-testid="slicer-apply-btn">
              {t('slicer.apply', { ns: 'tools' })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
