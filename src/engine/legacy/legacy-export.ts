import type { VideoExportConfig } from '@/types/export'
import type { CanvasHandles } from './legacy-adapter'
import type { LegacyInkplainerState } from './legacy-state.types'

export interface ExportCallbacks {
  onProgress: (progress: number, label: string) => void
  onComplete: () => void
  onError: (err: Error) => void
}

/**
 * Executes a legacy video export. Ported directly from legacy/index.html.
 * Maintains the exact `requestAnimationFrame` sync loop and `MediaRecorder` /
 * `mp4-muxer` logic, but without touching DOM elements for progress.
 */
export async function runLegacyExport(
  handles: CanvasHandles,
  state: LegacyInkplainerState,
  config: VideoExportConfig,
  callbacks: ExportCallbacks,
  restartAnim: () => void,
): Promise<void> {
  const { onProgress, onComplete, onError } = callbacks

  // Provide progress updates based on animation state
  function getProgress(): number {
    const groups = state._animGroups
    if (!groups || !groups.length) return state.done ? 1 : 0
    if (isComplete()) return 1
    const total = groups.length
    const groupPos = Math.max(
      0,
      Math.min(total - 1, Number.isFinite(state._groupPos) ? (state._groupPos as number) : 0),
    )
    const completedGroups = Math.max(0, Math.min(total, groupPos + (state.done ? 1 : 0)))
    const currentGroupFraction = state.done
      ? 0
      : Math.max(0, Math.min(1, (state._animProgress as number) || 0))
    return Math.max(0, Math.min(1, (completedGroups + currentGroupFraction) / total))
  }

  function isComplete(): boolean {
    if (!state.done) return false
    const groups = state._animGroups
    if (!groups || !groups.length) return !!state.done
    const groupPos = Number.isFinite(state._groupPos) ? (state._groupPos as number) : 0
    return groupPos >= groups.length - 1 && !state.playing
  }

  try {
    if (config.format === 'mp4' && typeof (window as any).VideoEncoder !== 'undefined') {
      await recordMP4(handles, state, config, getProgress, isComplete, restartAnim, onProgress)
    } else {
      await recordWebM(handles, state, config, getProgress, isComplete, restartAnim, onProgress)
    }

    if (config.includeFinalPng) {
      onProgress(1, 'Exporting PNG...')
      await exportPNG(handles, state)
    }

    onComplete()
  } catch (err) {
    state.recording = false
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}

function recordWebM(
  handles: CanvasHandles,
  state: LegacyInkplainerState,
  config: VideoExportConfig,
  getProgress: () => number,
  isComplete: () => boolean,
  restartAnim: () => void,
  onProgress: (p: number, label: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const qualityMap: Record<string, number> = {
        high: 8000000,
        medium: 4000000,
        low: 2000000,
      }
      const bitrate = qualityMap[config.quality] || 4000000

      const mimes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm;codecs=h264',
        'video/webm',
      ]
      const mime = mimes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm'

      const rec = document.createElement('canvas')
      rec.width = state.canvasW
      rec.height = state.canvasH
      const rctx = rec.getContext('2d')
      if (!rctx) throw new Error('Failed to create composite canvas context')

      state.recording = true
      state.chunks = []

      const stream = (rec as any).captureStream(30)
      const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate })

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) state.chunks.push(e.data)
      }

      mr.onstop = () => {
        const blob = new Blob(state.chunks, { type: 'video/webm' })
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
        downloadBlob(blob, `whiteboard-${timestamp}.webm`)

        resolve()
      }

      ;(function syncLoop() {
        if (!state.recording) return
        rctx.clearRect(0, 0, state.canvasW, state.canvasH)
        rctx.drawImage(handles.main, 0, 0)
        rctx.drawImage(handles.hand, 0, 0)
        requestAnimationFrame(syncLoop)
      })()

      mr.start(100)
      state.mediaRecorder = mr

      onProgress(0, 'Recording animation...')

      restartAnim()

      const checkComplete = setInterval(() => {
        if (!state.recording) {
          clearInterval(checkComplete)
          return
        }

        const progress = getProgress()
        onProgress(progress, isComplete() ? 'Finalizing...' : 'Recording...')

        if (isComplete()) {
          clearInterval(checkComplete)
          setTimeout(() => {
            state.recording = false
            if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
              state.mediaRecorder.stop()
            }
          }, 600)
        }
      }, 200)
    } catch (err) {
      state.recording = false
      reject(err)
    }
  })
}

function recordMP4(
  handles: CanvasHandles,
  state: LegacyInkplainerState,
  config: VideoExportConfig,
  getProgress: () => number,
  isComplete: () => boolean,
  restartAnim: () => void,
  onProgress: (p: number, label: string) => void,
): Promise<void> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      let Muxer, ArrayBufferTarget
      try {
        // @ts-ignore
        const mod = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/build/mp4-muxer.mjs')
        Muxer = mod.Muxer || mod.default?.Muxer
        ArrayBufferTarget = mod.ArrayBufferTarget || mod.default?.ArrayBufferTarget
        if (!Muxer) throw new Error('Muxer not found in module exports')
      } catch (importErr: any) {
        throw new Error(
          'Could not load mp4-muxer v5.2.2. Check your internet connection. (' +
            importErr.message +
            ')',
        )
      }

      const qualityMap: Record<string, number> = { high: 8000000, medium: 4000000, low: 2000000 }
      const bitrate = qualityMap[config.quality] || 4000000
      const FPS = 30

      const W = state.canvasW % 2 === 0 ? state.canvasW : state.canvasW + 1
      const H = state.canvasH % 2 === 0 ? state.canvasH : state.canvasH + 1

      const target = new ArrayBufferTarget()
      const muxer = new Muxer({
        target,
        video: { codec: 'avc', width: W, height: H },
        fastStart: 'in-memory',
      })

      const isHighRes = W > 1280 || H > 720
      const h264Codec = isHighRes ? 'avc1.640033' : 'avc1.42001f'

      let encoderConfig: any = {
        codec: h264Codec,
        width: W,
        height: H,
        bitrate,
        framerate: FPS,
        latencyMode: 'quality',
        ...(isHighRes ? { hardwareAcceleration: 'prefer-software' } : {}),
      }

      let support
      try {
        support = await (window as any).VideoEncoder.isConfigSupported(encoderConfig)
      } catch (e) {
        support = { supported: false }
      }

      if (!support.supported) {
        encoderConfig = {
          codec: 'vp09.00.51.08',
          width: W,
          height: H,
          bitrate,
          framerate: FPS,
          latencyMode: 'quality',
        }
        muxer._config = muxer._config || {}
      }

      const videoEncoder = new (window as any).VideoEncoder({
        output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
        error: (e: Error) => {
          state.recording = false
          reject(e)
        },
      })
      videoEncoder.configure(encoderConfig)

      const rec = document.createElement('canvas')
      rec.width = W
      rec.height = H
      const rctx = rec.getContext('2d', { willReadFrequently: true })
      if (!rctx) throw new Error('Failed to create mp4 composite canvas context')

      state.recording = true
      let frameCount = 0
      let rafId: number | null = null
      let encodingDone = false

      onProgress(0, 'Encoding MP4…')

      restartAnim()

      function captureFrame() {
        if (!state.recording || encodingDone) return

        if (videoEncoder.encodeQueueSize > 12) {
          rafId = requestAnimationFrame(captureFrame)
          return
        }

        rctx!.clearRect(0, 0, W, H)
        rctx!.drawImage(handles.main, 0, 0, state.canvasW, state.canvasH, 0, 0, W, H)
        rctx!.drawImage(handles.hand, 0, 0, state.canvasW, state.canvasH, 0, 0, W, H)

        const ts = Math.round((frameCount / FPS) * 1_000_000)
        const duration = Math.round(1_000_000 / FPS)
        const frame = new (window as any).VideoFrame(rec, { timestamp: ts, duration })
        videoEncoder.encode(frame, { keyFrame: frameCount % (FPS * 2) === 0 })
        frame.close()
        frameCount++

        rafId = requestAnimationFrame(captureFrame)
      }
      rafId = requestAnimationFrame(captureFrame)

      const checkComplete = setInterval(async () => {
        if (!state.recording) {
          clearInterval(checkComplete)
          return
        }

        const progress = getProgress()
        const label = isComplete() ? 'Muxing MP4…' : `Encoding MP4… ${Math.round(progress * 100)}%`
        onProgress(progress * 0.88, label)

        if (isComplete() && !encodingDone) {
          encodingDone = true
          clearInterval(checkComplete)
          state.recording = false
          if (rafId) cancelAnimationFrame(rafId)

          setTimeout(async () => {
            try {
              await videoEncoder.flush()
              muxer.finalize()
              videoEncoder.close()

              onProgress(1, 'Muxing MP4…')

              const blob = new Blob([target.buffer], { type: 'video/mp4' })
              const tsString = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
              downloadBlob(blob, `whiteboard-${tsString}.mp4`, 2000)
              resolve()
            } catch (finalErr) {
              reject(finalErr)
            }
          }, 800)
        }
      }, 200)
    } catch (err) {
      state.recording = false
      reject(err)
    }
  })
}

function exportPNG(handles: CanvasHandles, state: LegacyInkplainerState): Promise<void> {
  return new Promise((resolve) => {
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = state.canvasW
    exportCanvas.height = state.canvasH
    const exportCtx = exportCanvas.getContext('2d')
    if (!exportCtx) return resolve()

    exportCtx.drawImage(handles.main, 0, 0)

    exportCanvas.toBlob((blob) => {
      if (!blob) return resolve()
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      downloadBlob(blob, `whiteboard-${timestamp}.png`)
      resolve()
    }, 'image/png')
  })
}

function downloadBlob(blob: Blob, filename: string, revokeDelay = 1000): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), revokeDelay)
}
