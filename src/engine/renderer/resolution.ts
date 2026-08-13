/**
 * Shared resolution scaling math ported from M19.
 */

/**
 * Resolution scale factor relative to the 720p baseline (1280×720).
 * All outline-algorithm pixel constants that were hand-tuned at 720p are
 * multiplied by this so they behave identically at every resolution.
 * 720p → 1.0 · 1080p → 1.5 · 1440p → 2.0
 */
export function resScale(width: number, height: number): number {
  return Math.sqrt((width * height) / (1280 * 720))
}

/**
 * Sub-linear scale used for perimeter point density.
 * Linear scaling (resScale) at 1440p gives 2× more outline points which traces
 * every pixel-level silhouette bump — looks crunchy. Raising to 0.6 keeps the
 * outline smooth at all resolutions while still adding enough points for clarity.
 *   720p → 1.0 · 1080p → 1.31 · 1440p → 1.57
 */
export function resPointScale(width: number, height: number): number {
  return Math.pow(resScale(width, height), 0.6)
}

/**
 * Stroke softening blur — the tiny amount of shadowBlur that restores the
 * hand-drawn softness that canvas anti-aliasing provides naturally at 720p
 * but loses at higher resolutions where lines become pixel-crisp.
 *   720p → 0 · 1080p → 0.75 · 1440p → 1.5
 */
export function resSoftBlur(width: number, height: number): number {
  return Math.max(0, (resScale(width, height) - 1) * 1.5)
}
