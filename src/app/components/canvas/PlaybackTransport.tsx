import { useCallback, useEffect, useRef, type MouseEvent, type ReactElement } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { playbackService } from '@/app/services/playback-service'

interface PlaybackTransportProps {
  readonly canPlay: boolean
  readonly isPlaying: boolean
}

export function PlaybackTransport({ canPlay, isPlaying }: PlaybackTransportProps): ReactElement {
  const { t } = useTranslation(['editor', 'common'])
  const initialProgress = useRef(playbackService.getVisualProgress())
  const fillRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const lastProgressRef = useRef(-1)
  const lastPercentRef = useRef(-1)

  const paintProgress = useCallback((rawProgress: number): void => {
    const progress = Math.min(Math.max(rawProgress, 0), 1)
    if (Math.abs(progress - lastProgressRef.current) >= 0.0001) {
      lastProgressRef.current = progress
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${progress})`
    }

    const percent = Math.round(progress * 100)
    if (percent !== lastPercentRef.current) {
      lastPercentRef.current = percent
      trackRef.current?.setAttribute('aria-valuenow', String(percent))
      if (labelRef.current) labelRef.current.textContent = `${percent}%`
    }
  }, [])

  useEffect(() => {
    let frame = 0
    const tick = (): void => {
      paintProgress(playbackService.getVisualProgress())
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [paintProgress])

  const onSeek = (event: MouseEvent<HTMLDivElement>): void => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = bounds.width > 0 ? (event.clientX - bounds.left) / bounds.width : 0
    playbackService.seek(ratio)
    paintProgress(ratio)
  }

  const initialPercent = Math.round(initialProgress.current * 100)

  return (
    <div className="absolute bottom-0 left-1/2 flex h-[52px] max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-black/10 bg-[#fffdf8]/95 px-3 shadow-[0_14px_34px_rgba(24,28,26,0.2)] backdrop-blur sm:h-[56px] sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={() => playbackService.restart()}
        disabled={!canPlay}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-accent disabled:opacity-35"
        aria-label={t('actions.restart', { ns: 'common' })}
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => playbackService.playPause()}
        disabled={!canPlay}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#171918] text-white shadow-sm transition hover:scale-[1.04] disabled:opacity-35"
        aria-label={
          isPlaying ? t('actions.pause', { ns: 'common' }) : t('actions.play', { ns: 'common' })
        }
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        )}
      </button>
      <div
        ref={trackRef}
        role="slider"
        aria-label={t('canvas.progress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={initialPercent}
        tabIndex={0}
        onClick={onSeek}
        data-testid="progress-track"
        className="relative h-2 w-[clamp(72px,20vw,160px)] cursor-pointer overflow-hidden rounded-full bg-secondary"
      >
        <div
          ref={fillRef}
          data-testid="progress-fill"
          className="h-full w-full origin-left rounded-full bg-[#d3a13a] will-change-transform"
          style={{ transform: `scaleX(${initialProgress.current})` }}
        />
      </div>
      <span
        ref={labelRef}
        aria-label={t('canvas.timeDisplay')}
        className="w-9 text-right text-[11px] tabular-nums text-muted-foreground"
      >
        {initialPercent}%
      </span>
    </div>
  )
}
