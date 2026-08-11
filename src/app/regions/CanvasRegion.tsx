/**
 * Canvas region (M07).
 *
 * Mirrors the legacy canvas area (legacy/index.html ~line 3680): the main
 * drawing surface and the play/restart transport. The transport controls
 * (Restart / Play-Pause / progress bar) are wired in M07 to the playback
 * service, which delegates to the legacy `togglePlay`/`restartAnim`/
 * `setProgress` globals and mirrors status into the typed playback store.
 *
 * The actual `<canvas>` elements mount in M09 (Canvas Host); until then the
 * surface is a placeholder. The transport UI is fully wired so the React
 * shell reflects playback state from the store, and user actions route
 * through the service → legacy adapter (no-ops until the legacy runtime is
 * co-hosted).
 *
 * Legacy behavior parity:
 *   - `play-pause-btn` (3836): `onclick="togglePlay()"`, disabled until a
 *     layer exists. Shows play/pause icon based on `state.playing`.
 *   - `restart-btn` (3835): `onclick="restartAnim()"`.
 *   - `progress-track` (3843): `onclick="seekAnim(event)"` — ratio =
 *     `offsetX / clientWidth`. We compute the ratio from the click and call
 *     `playbackService.seek`.
 *   - `time-display` (3846): `${round(progress*100)}%`.
 */
import type { ReactElement, MouseEvent } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { playbackService } from '@/app/services/playback-service'
import { usePlaybackStore, selectIsPlaying, selectProgress } from '@/app/store'
import { useLayerStore } from '@/app/store'

export function CanvasRegion(): ReactElement {
  const hasLayers = useLayerStore((s) => s.layers.length > 0)
  const isPlaying = usePlaybackStore(selectIsPlaying)
  const status = usePlaybackStore((s) => s.status)
  const progress = usePlaybackStore(selectProgress)
  const canPlay = hasLayers && playbackService.canPlay()

  const onPlayPause = () => playbackService.playPause()
  const onRestart = () => playbackService.restart()

  const onSeek = (e: MouseEvent<HTMLDivElement>) => {
    const track = e.currentTarget
    const rect = track.getBoundingClientRect()
    // Legacy uses `e.offsetX / clientWidth`; getBoundingClientRect gives the
    // same ratio for a left-aligned fill and is robust to padding/borders.
    const ratio = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0
    playbackService.seek(ratio)
  }

  const pct = Math.round(progress * 100)

  return (
    <main data-region="canvas" className="flex min-w-0 flex-1 flex-col gap-3 p-4">
      <div
        aria-label="Canvas surface"
        className="flex flex-1 items-center justify-center rounded-md border border-border bg-card min-h-0"
      >
        <span className="text-lg text-muted-foreground">Canvas</span>
      </div>
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRestart}
          disabled={!canPlay}
          aria-label="Restart"
          title="Restart"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onPlayPause}
          disabled={!canPlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <div
          role="slider"
          aria-label="Animation progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={`${pct}%`}
          tabIndex={0}
          onClick={onSeek}
          className="group relative h-2 w-48 cursor-pointer overflow-hidden rounded-full bg-secondary"
          data-testid="progress-track"
        >
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${pct}%` }}
            data-testid="progress-fill"
          />
        </div>
        <span
          className="w-10 text-right text-xs tabular-nums text-muted-foreground"
          aria-label="Time display"
        >
          {pct}%
        </span>
      </div>
      <span className="sr-only" data-testid="playback-status">
        {status}
      </span>
    </main>
  )
}
