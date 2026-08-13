/**
 * Human-readable relative-time formatter (M05).
 *
 * Mirrors the legacy `refreshProjectsList` time-ago computation
 * (legacy/index.html:4737) so the React project list shows the same
 * relative strings ("Just now", "12m ago", "3h ago", "4d ago") as the legacy
 * UI. The legacy code uses `Date.now()`-style arithmetic; this helper takes
 * an explicit `now` so it can be unit-tested deterministically.
 */

/**
 * Format the elapsed time between `now` and `then` as a legacy-matching
 * relative string.
 *
 * @param now    reference timestamp (ms since epoch)
 * @param then   ISO timestamp string of the project's `modifiedAt`
 */
export function formatTimeAgo(now: number, then: string, locale = 'en'): string {
  const modifiedDate = new Date(then).getTime()
  if (Number.isNaN(modifiedDate)) return ''
  const diffMs = now - modifiedDate
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (locale.startsWith('vi')) {
    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins} phút trước`
    if (diffHours < 24) return `${diffHours} giờ trước`
    return `${diffDays} ngày trước`
  }
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

/**
 * Format a serialized byte count as a human-readable size string, matching
 * the legacy `refreshProjectsList` size formatting (legacy/index.html:4759).
 */
export function formatSizeBytes(sizeBytes: number, locale = 'en'): string {
  const number = (value: number, decimals: number): string =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  if (sizeBytes < 1024) return `${number(sizeBytes, 0)} B`
  if (sizeBytes < 1024 * 1024) return `${number(sizeBytes / 1024, 1)} KB`
  return `${number(sizeBytes / (1024 * 1024), 1)} MB`
}

/**
 * Format the save-indicator time as `HH:MM:SS` (24h), matching the legacy
 * `updateLastSaveTime` (legacy/index.html:4862).
 */
export function formatSaveTime(isoString: string, locale = 'en-US'): string {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
