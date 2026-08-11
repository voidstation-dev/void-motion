/**
 * Slicer feature container (M12).
 *
 * Hosts the slicer modal: a preview canvas where the user draws slice regions
 * (rect or freehand) + mode tabs (Grid / Rectangles / Freehand) + the grid
 * sliders / slice lists + the apply bar. Mounted by `CanvasRegion` when
 * `editorMode === 'slicer'`.
 *
 * Per M12: the slice accumulators are temporary tool state in
 * `slicerService.session`; the modal reads them through the service. `confirm`
 * is the only path that writes to the layer store (replacing the original
 * layer with the new slices).
 *
 * Mirrors the legacy `#slicer-modal` (`legacy/index.html:4134-4226`): modal
 * window with tabs (`stab-grid`/`stab-rect`/`stab-freehand`), a preview
 * canvas (`#slicer-preview-canvas`), per-mode controls, and a footer with the
 * apply button (`#slicer-apply-btn`).
 */
import type { ReactElement } from 'react'
import { SlicerModal } from './SlicerModal'

export function SlicerFeature(): ReactElement {
  return <SlicerModal />
}
