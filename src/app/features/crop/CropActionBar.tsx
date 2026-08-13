/**
 * Crop action bar (M11).
 *
 * The three crop-tool buttons: Reset, Cancel, Apply. Mirrors the legacy
 * `#crop-action-bar` (`legacy/index.html:3826-3833`):
 *   - `Reset` → `resetCropRect()` (reset the rect to the layer bounds).
 *   - `Cancel` → `cancelCrop()` (exit without applying, no mutation).
 *   - `Apply Crop` → `confirmCrop()` (apply + rasterize + autosave).
 *
 * The bar is mounted by `CanvasRegion` when `editorMode === 'crop'`.
 */
import type { ReactElement } from 'react'
import { RotateCcw, X, Check } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { cropService } from '@/app/services/crop-service'
import { useTranslation } from 'react-i18next'

export function CropActionBar(): ReactElement {
  const { t } = useTranslation(['tools', 'common'])
  const onReset = () => {
    cropService.reset()
  }
  const onCancel = () => {
    cropService.cancel()
  }
  const onConfirm = () => {
    cropService.confirm()
  }

  return (
    <div
      data-testid="crop-action-bar"
      className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center justify-center gap-2 rounded-lg bg-white/95 p-2 shadow-lg"
      role="toolbar"
      aria-label={t('crop.actions', { ns: 'tools' })}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        aria-label={t('crop.reset', { ns: 'tools' })}
        title={t('actions.reset', { ns: 'common' })}
        data-testid="crop-reset-btn"
      >
        <RotateCcw className="h-4 w-4" />
        {t('actions.reset', { ns: 'common' })}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onCancel}
        aria-label={t('crop.cancel', { ns: 'tools' })}
        title={t('actions.cancel', { ns: 'common' })}
        data-testid="crop-cancel-btn"
      >
        <X className="h-4 w-4" />
        {t('actions.cancel', { ns: 'common' })}
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={onConfirm}
        aria-label={t('crop.applyLabel', { ns: 'tools' })}
        title={t('crop.apply', { ns: 'tools' })}
        data-testid="crop-confirm-btn"
      >
        <Check className="h-4 w-4" />
        {t('crop.apply', { ns: 'tools' })}
      </Button>
    </div>
  )
}
