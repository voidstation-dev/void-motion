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

export function CropActionBar(): ReactElement {
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
      className="flex items-center justify-center gap-2"
      role="toolbar"
      aria-label="Crop actions"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        aria-label="Reset crop"
        title="Reset"
        data-testid="crop-reset-btn"
      >
        <RotateCcw className="h-4 w-4" />
        Reset
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onCancel}
        aria-label="Cancel crop"
        title="Cancel"
        data-testid="crop-cancel-btn"
      >
        <X className="h-4 w-4" />
        Cancel
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={onConfirm}
        aria-label="Apply crop"
        title="Apply Crop"
        data-testid="crop-confirm-btn"
      >
        <Check className="h-4 w-4" />
        Apply Crop
      </Button>
    </div>
  )
}
