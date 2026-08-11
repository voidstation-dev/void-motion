/**
 * Export domain types.
 *
 * Derived from the legacy implementation:
 * - `state.exportFormat` (`legacy/index.html:9000`) — `'webm'` (default) or
 *   `'mp4'`. MP4 requires WebCodecs `VideoEncoder`; otherwise forced back to
 *   webm (`legacy/index.html:8984`).
 * - `state.exportQuality` (`legacy/index.html:8971`) — `'medium'` (default),
 *   `'high'`, `'low'`. Bitrate map (`legacy/index.html:9210`):
 *   high=8 Mbps, medium=4 Mbps, low=2 Mbps.
 * - `state.exportPNG` (`legacy/index.html:8972`) — whether to also export a
 *   final PNG after the video.
 * - FPS is hardcoded to `30` in BOTH paths (WebM `captureStream(30)` at
 *   `:9124`; MP4 `const FPS = 30` at `:9212`). Per MIGRATION_00 §13, `fps`
 *   remains the literal `30` — do NOT generalize to `number` yet.
 *
 * Quirks (see `KNOWN_QUIRKS.md`): WebM/MP4 export are real-time
 * `requestAnimationFrame`-driven (not frame-accurate); MP4 muxer is loaded
 * from a remote CDN at runtime; PNG is a single snapshot of the live main
 * canvas with no hand composited.
 */

/** Container format. */
export type ExportFormat = 'webm' | 'mp4'

/** Export quality tier. Maps to a bitrate via {@link EXPORT_BITRATE_MAP}. */
export type ExportQuality = 'low' | 'medium' | 'high'

/** Default export quality. Legacy default is `medium`. */
export const DEFAULT_EXPORT_QUALITY: ExportQuality = 'medium'

/** Default export format. Legacy default is `webm`. */
export const DEFAULT_EXPORT_FORMAT: ExportFormat = 'webm'

/**
 * Quality → bitrate map. Reproduced verbatim from the legacy
 * `qualityMap` (`legacy/index.html:9210`, also `:9098`).
 */
export const EXPORT_BITRATE_MAP: Readonly<Record<ExportQuality, number>> = {
  high: 8_000_000,
  medium: 4_000_000,
  low: 2_000_000,
}

/**
 * The export frame rate.
 *
 * Per MIGRATION_00 §13, this is the LITERAL `30` during the parity phase
 * because current behavior is 30 FPS. It is a union of one element so the
 * type system can later widen to `30 | 60` (M44) without an immediate
 * breaking change to call sites that pattern-match on it.
 */
export type ExportFps = 30

/** The fixed export frame rate. */
export const EXPORT_FPS: ExportFps = 30

/** Video export configuration. */
export interface VideoExportConfig {
  readonly format: ExportFormat
  readonly quality: ExportQuality
  /** Whether to also export a final PNG after the video. Legacy `exportPNG`. */
  readonly includeFinalPng: boolean
  /** Frame rate. Literal `30` during M00. */
  readonly fps: ExportFps
}

/** Default video export config (matches legacy defaults). */
export const DEFAULT_VIDEO_EXPORT_CONFIG: VideoExportConfig = {
  format: DEFAULT_EXPORT_FORMAT,
  quality: DEFAULT_EXPORT_QUALITY,
  includeFinalPng: false,
  fps: EXPORT_FPS,
}

/**
 * Exported-file naming behavior.
 *
 * Legacy (`legacy/index.html:9137, 9337, 9395`): all three formats use
 * `whiteboard-${timestamp}.${ext}` where `timestamp` is
 * `new Date().toISOString().slice(0,19).replace(/:/g,'-')`. No project name
 * is included. This is preserved verbatim — it is a known quirk.
 */
export interface ExportFileNameBehavior {
  readonly prefix: 'whiteboard'
  readonly timestampFormat: 'iso-no-colons'
}

export const EXPORT_FILE_NAME_BEHAVIOR: ExportFileNameBehavior = {
  prefix: 'whiteboard',
  timestampFormat: 'iso-no-colons',
}
