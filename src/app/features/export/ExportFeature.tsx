import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { Progress } from '@/app/components/ui/progress'
import { Button } from '@/app/components/ui/button'
import { Label } from '@/app/components/ui/label'
import { useExportStore, useUiStore } from '@/app/store'
import { exportService } from '@/app/services/export-service'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

import { cn } from '@/app/lib/cn'
import { useTranslation } from 'react-i18next'

export function ExportFeature() {
  const { t } = useTranslation('export')
  const open = useUiStore((s) => s.exportDialogOpen)
  const config = useExportStore((s) => s.config)
  const status = useExportStore((s) => s.jobStatus)
  const progress = useExportStore((s) => s.jobProgress)
  const error = useExportStore((s) => s.error)

  const [hasWebCodecs, setHasWebCodecs] = useState(true)

  useEffect(() => {
    setHasWebCodecs(
      typeof (window as unknown as { VideoEncoder?: unknown }).VideoEncoder !== 'undefined',
    )
  }, [open])

  const isExporting =
    status !== 'idle' && status !== 'done' && status !== 'failed' && status !== 'cancelled'

  return (
    <Dialog open={open} onOpenChange={(val) => !val && exportService.closeDialog()}>
      <DialogContent className="sm:max-w-[320px] p-0 overflow-hidden gap-0 bg-surface-1 border-border">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="text-base font-semibold">{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-5">
          {/* Format Section */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('format')}
            </Label>
            <div className="flex gap-2">
              <FormatPill
                selected={config.format === 'webm'}
                onClick={() => exportService.setFormat('webm')}
                label="WebM"
                desc={t('allBrowsers')}
                badge={t('recommended')}
                badgeColor="bg-success/20 text-success"
                disabled={isExporting}
              />
              <FormatPill
                selected={config.format === 'mp4'}
                onClick={() => exportService.setFormat('mp4')}
                label="MP4"
                desc={t('chromeEdge')}
                badge="H.264"
                disabled={isExporting || !hasWebCodecs}
              />
            </div>
            {config.format === 'mp4' && hasWebCodecs && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-600 leading-relaxed">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p>{t('mp4Warning')}</p>
              </div>
            )}
            {!hasWebCodecs && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-panel border border-border text-[10px] text-muted-foreground leading-relaxed">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p>{t('mp4Unsupported')}</p>
              </div>
            )}
          </div>

          {/* Quality Section */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('quality')}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <QualityPill
                selected={config.quality === 'high'}
                onClick={() => exportService.setQuality('high')}
                label={t('high')}
                desc="8 Mbps"
                disabled={isExporting}
              />
              <QualityPill
                selected={config.quality === 'medium'}
                onClick={() => exportService.setQuality('medium')}
                label={t('medium')}
                desc="4 Mbps"
                disabled={isExporting}
              />
              <QualityPill
                selected={config.quality === 'low'}
                onClick={() => exportService.setQuality('low')}
                label={t('low')}
                desc="2 Mbps"
                disabled={isExporting}
              />
            </div>
          </div>

          {/* Options Section */}
          <div className="pt-1">
            <label className="flex items-center gap-2.5 group cursor-pointer">
              <input
                type="checkbox"
                checked={config.includeFinalPng}
                onChange={(e) => exportService.setIncludePng(e.target.checked)}
                disabled={isExporting}
                className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-accent checked:border-accent"
              />
              <span className="text-sm font-medium group-hover:text-accent transition-colors">
                {t('includePng')}
              </span>
            </label>
          </div>

          {/* Actions / Progress */}
          <div className="pt-2">
            {!isExporting && status !== 'done' && (
              <Button
                className="w-full relative group overflow-hidden bg-accent hover:bg-accent/90 text-white font-medium shadow-sm transition-all h-10"
                onClick={() => exportService.startExport()}
                disabled={status === 'failed'} // Can close and reopen to try again, but let's just keep it simple. Actually, let's allow retry.
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform ease-out duration-300" />
                <span className="relative flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {t('start')}
                </span>
              </Button>
            )}

            {status === 'failed' && (
              <div className="mt-2 text-xs text-danger font-medium text-center break-words">
                {t('failed', { error })}
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => useExportStore.getState().resetJob()}
                    className="w-full"
                  >
                    {t('retry')}
                  </Button>
                </div>
              </div>
            )}

            {isExporting && (
              <div className="space-y-2.5 p-3 rounded-lg bg-panel border border-border">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {status === 'preparing' && t('preparing')}
                    {status === 'rendering' && t('recording')}
                    {status === 'encoding' &&
                      t('encoding', {
                        format: config.format.toUpperCase(),
                        progress: Math.round(progress * 100),
                      })}
                    {status === 'finalizing' && t('finalizing')}
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
                <Progress value={progress * 100} className="h-1.5" />
              </div>
            )}

            {status === 'done' && (
              <div className="flex flex-col items-center justify-center py-3 text-success gap-1.5 animate-in fade-in zoom-in duration-300">
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-sm font-semibold">
                  {t('success', {
                    format: config.format.toUpperCase(),
                    png: config.includeFinalPng ? t('pngSuffix') : '',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FormatPill({
  selected,
  onClick,
  label,
  desc,
  badge,
  badgeColor,
  disabled,
}: {
  selected: boolean
  onClick: () => void
  label: string
  desc: string
  badge: string
  badgeColor?: string
  disabled?: boolean
}) {
  return (
    <button
      className={cn(
        'flex-1 flex flex-col items-start p-2.5 rounded-lg border text-left transition-all',
        selected
          ? 'border-accent bg-accent/5 ring-1 ring-accent/20'
          : 'border-border bg-panel hover:bg-surface-2 hover:border-border/80',
        disabled && 'opacity-50 pointer-events-none',
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex items-center justify-between w-full mb-1">
        <span className={cn('text-sm font-semibold', selected ? 'text-accent' : 'text-foreground')}>
          {label}
        </span>
        <span
          className={cn(
            'text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full',
            badgeColor || 'bg-muted text-muted-foreground',
          )}
        >
          {badge}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground">{desc}</span>
    </button>
  )
}

function QualityPill({
  selected,
  onClick,
  label,
  desc,
  disabled,
}: {
  selected: boolean
  onClick: () => void
  label: string
  desc: string
  disabled?: boolean
}) {
  return (
    <button
      className={cn(
        'flex flex-col items-center justify-center p-2 rounded-lg border transition-all',
        selected
          ? 'border-accent bg-accent/5 text-accent ring-1 ring-accent/20'
          : 'border-border bg-panel text-foreground hover:bg-surface-2 hover:border-border/80',
        disabled && 'opacity-50 pointer-events-none',
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className={cn('text-[10px]', selected ? 'text-accent/80' : 'text-muted-foreground')}>
        {desc}
      </span>
    </button>
  )
}
