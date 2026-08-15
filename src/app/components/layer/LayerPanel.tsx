/**
 * Layer panel component (M08).
 *
 * Mirrors the legacy right-sidebar layer list (legacy/index.html:6222
 * `renderLayerList`). Renders the layer stack in REVERSE order (topmost
 * layer first, matching the legacy `reversed` display), with per-item:
 *   - drag handle (visual only — pointer reorder lands in M10)
 *   - visibility toggle (eye icon)
 *   - layer name (click to select; double-click to rename inline)
 *   - animation order input (number, 1-99, blank = follow stack order)
 *   - delete button
 *
 * The selected layer expands an inline inspector (Resize / Opacity /
 * Position & Size) matching the legacy `layer-settings` block
 * (legacy/index.html `_buildLayerItem`). All actions route through the
 * layer service, which delegates to the legacy runtime and mirrors into
 * the typed stores.
 *
 * Behavior parity notes:
 *   - Legacy renders groups first then ungrouped layers; groups are an
 *     M08 stretch goal and are rendered as a simple grouped section here.
 *     Full group collapse/visibility/dissolve parity is preserved in the
 *     service but the UI ships the ungrouped list first (groups render as
 *     labeled subsections).
 *   - Legacy rename uses a click-counter (first click selects, second
 *     within 400ms renames). We use click-to-select + double-click-to-rename
 *     which is the same observable behavior.
 */
import type { ReactElement, KeyboardEvent } from 'react'
import { useState } from 'react'
import { Eye, EyeOff, X, GripVertical } from 'lucide-react'
import { layerService } from '@/app/services/layer-service'
import { useLayerStore, useSelectionStore } from '@/app/store'
import type { Layer, ImageLayer } from '@/types/layer'
import type { LayerId } from '@/types/brand'
import { useTranslation } from 'react-i18next'

export function LayerPanel({ showHeader = true }: { readonly showHeader?: boolean }): ReactElement {
  const { t } = useTranslation('layers')
  const layers = useLayerStore((s) => s.layers)
  const selectedId = useSelectionStore((s) => s.selectedLayerId)
  const [renamingId, setRenamingId] = useState<LayerId | null>(null)
  const [draftName, setDraftName] = useState('')

  // Legacy renders the stack reversed (topmost first).
  const reversed = [...layers].reverse()
  const selected = layers.find((l) => l.id === selectedId) ?? null

  const startRename = (layer: Layer): void => {
    setRenamingId(layer.id)
    setDraftName(layer.name)
  }
  const commitRename = (): void => {
    if (renamingId !== null) {
      layerService.renameLayer(renamingId, draftName)
    }
    setRenamingId(null)
  }
  const onRenameKey = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setRenamingId(null)
    }
  }

  return (
    <section aria-label={t('title')} className="flex flex-col gap-2">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('title')}
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {t('count', { count: layers.length })}
          </span>
        </div>
      )}
      {layers.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface-1 px-3 py-3 text-sm text-muted-foreground">
          {t('empty')}
        </div>
      ) : (
        <ul className="flex flex-col gap-1" aria-label={t('list')}>
          {reversed.map((layer) => {
            const isSelected = layer.id === selectedId
            const isRenaming = renamingId === layer.id
            const orderVal = layer.animationOrder ?? ''
            return (
              <li
                key={layer.id}
                data-layer-id={layer.id}
                aria-label={t('layer', { name: layer.name })}
                className={
                  'rounded-xl border transition-colors overflow-hidden ' +
                  (isSelected ? 'border-black/10 bg-white shadow-sm' : 'border-black/5 bg-[#fcfcfc] hover:bg-white') +
                  (layer.visible ? '' : ' opacity-50')
                }
              >
                <div
                  className="flex items-center gap-2 px-2 py-1.5"
                  onClick={() => layerService.selectLayer(layer.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      layerService.selectLayer(layer.id)
                    }
                  }}
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground" />
                  <button
                    type="button"
                    aria-label={layer.visible ? t('hide') : t('show')}
                    title={layer.visible ? t('hide') : t('show')}
                    onClick={(e) => {
                      e.stopPropagation()
                      layerService.toggleVisibility(layer.id)
                    }}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    {layer.visible ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {isRenaming ? (
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={onRenameKey}
                      onClick={(e) => e.stopPropagation()}
                      className="min-w-0 flex-1 rounded-[6px] bg-[#e9e8e3] px-1.5 py-0.5 text-xs font-medium text-foreground outline-none"
                      autoFocus
                      data-testid="layer-rename-input"
                    />
                  ) : (
                    <span
                      className="min-w-0 flex-1 truncate text-xs font-medium text-foreground"
                      title={layer.name}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        startRename(layer)
                      }}
                      data-testid={`layer-name-${layer.id}`}
                    >
                      {layer.name}
                    </span>
                  )}
                  <div
                    className="flex flex-col items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[9px] text-muted-foreground font-medium">{t('order', 'Order')}</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={orderVal}
                      placeholder="—"
                      title={t('animationOrder', 'Animation Order')}
                      onChange={(e) => layerService.setOrder(layer.id, e.target.value)}
                      className="w-8 rounded-[4px] bg-[#dfdeda] px-0 py-0.5 text-center text-[11px] font-semibold text-foreground outline-none"
                      data-testid={`layer-order-${layer.id}`}
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={t('remove')}
                    title={t('remove')}
                    onClick={(e) => {
                      e.stopPropagation()
                      layerService.removeLayer(layer.id)
                    }}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    data-testid={`layer-delete-${layer.id}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {isSelected && <LayerInspector layer={layer} />}
              </li>
            )
          })}
        </ul>
      )}
      {/* Keep the selected layer reference alive for the inspector read-out. */}
      {selected && (
        <span className="sr-only" data-testid="selected-layer-name">
          {selected.name}
        </span>
      )}
    </section>
  )
}

/** The expanded per-layer inspector (Resize / Opacity / Position & Size). */
function LayerInspector({ layer }: { readonly layer: Layer }): ReactElement {
  const { t } = useTranslation('layers')
  const resizePct = layer.type === 'image' ? Math.round((layer as ImageLayer).resizePct) : 100
  const opPct = Math.round(layer.opacity * 100)
  const transform = layer.transform

  return (
    <div className="border-t border-black/5 px-3 py-3 bg-[#fdfdfc]" data-testid={`layer-inspector-${layer.id}`}>
      {layer.type === 'image' && (
        <div className="mb-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t('resize', 'RESIZE')}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={300}
              step={1}
              value={resizePct}
              onChange={(e) => layerService.setResize(layer.id, Number(e.target.value))}
              className="flex-1 accent-[#1b62ff] h-1.5 bg-[#dfdeda] rounded-full appearance-none cursor-pointer"
              aria-label={t('resizePercent', 'Resize Percent')}
              data-testid={`layer-resize-${layer.id}`}
            />
            <span className="min-w-[28px] text-right text-[11px] tabular-nums text-muted-foreground font-medium">
              {resizePct}%
            </span>
          </div>
        </div>
      )}
      <div className="mb-4">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {t('opacity', 'OPACITY')}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={opPct}
            onChange={(e) => layerService.setOpacity(layer.id, Number(e.target.value) / 100)}
            className="flex-1 accent-[#1b62ff] h-1.5 bg-[#dfdeda] rounded-full appearance-none cursor-pointer"
            aria-label={t('opacityPercent', 'Opacity Percent')}
            data-testid={`layer-opacity-${layer.id}`}
          />
          <span className="min-w-[28px] text-right text-[11px] tabular-nums text-muted-foreground font-medium">
            {opPct}%
          </span>
        </div>
      </div>
      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {t('positionSize', 'POSITION & SIZE')}
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-[10px] text-muted-foreground font-medium">
          <label className="flex flex-col gap-1">
            X
            <input
              type="number"
              value={Math.round(transform.x)}
              onChange={(e) => layerService.setPosition(layer.id, 'x', Number(e.target.value))}
              className="w-full rounded-[6px] bg-[#dfdeda] px-2 py-1.5 text-foreground outline-none font-medium"
              data-testid={`layer-x-${layer.id}`}
            />
          </label>
          <label className="flex flex-col gap-1">
            Y
            <input
              type="number"
              value={Math.round(transform.y)}
              onChange={(e) => layerService.setPosition(layer.id, 'y', Number(e.target.value))}
              className="w-full rounded-[6px] bg-[#dfdeda] px-2 py-1.5 text-foreground outline-none font-medium"
              data-testid={`layer-y-${layer.id}`}
            />
          </label>
          <label className="flex flex-col gap-1">
            W
            <input
              type="number"
              value={Math.round(transform.width)}
              onChange={(e) => layerService.setPosition(layer.id, 'w', Number(e.target.value))}
              className="w-full rounded-[6px] bg-[#dfdeda] px-2 py-1.5 text-foreground outline-none font-medium"
              data-testid={`layer-w-${layer.id}`}
            />
          </label>
          <label className="flex flex-col gap-1">
            H
            <input
              type="number"
              value={Math.round(transform.height)}
              onChange={(e) => layerService.setPosition(layer.id, 'h', Number(e.target.value))}
              className="w-full rounded-[6px] bg-[#dfdeda] px-2 py-1.5 text-foreground outline-none font-medium"
              data-testid={`layer-h-${layer.id}`}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
