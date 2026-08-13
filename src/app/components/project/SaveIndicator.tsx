/**
 * Save indicator (M05).
 *
 * Mirrors the legacy `project-save-indicator` (legacy/index.html:3213): a
 * small timestamp read-out of the last save time. Legacy updates it via
 * `updateLastSaveTime` (legacy/index.html:4862) on save. The new component
 * subscribes to the project store's `dirty`/`saving` flags and renders the
 * last-save timestamp through `formatSaveTime` (same `HH:MM:SS` format).
 */
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { useProjectStore } from '@/app/store'
import { formatSaveTime } from '@/app/services/time-ago'
import { useTranslation } from 'react-i18next'

export function SaveIndicator(): ReactElement {
  const { t, i18n } = useTranslation('editor')
  const dirty = useProjectStore((s) => s.dirty)
  const saving = useProjectStore((s) => s.saving)
  const updatedAt = useProjectStore((s) => s.current?.updatedAt ?? null)
  const [label, setLabel] = useState<string>('')

  // Reformat whenever the saved timestamp changes (and on a 1s tick so the
  // indicator stays live, mirroring the legacy visible-state behavior).
  useEffect(() => {
    if (updatedAt) {
      setLabel(formatSaveTime(updatedAt, i18n.resolvedLanguage))
    } else {
      setLabel('')
    }
  }, [i18n.resolvedLanguage, updatedAt])

  if (saving) {
    return (
      <span className="text-xs text-muted-foreground" aria-label={t('project.savingLabel')}>
        {t('project.saving')}
      </span>
    )
  }
  if (dirty) {
    return (
      <span className="text-xs text-muted-foreground" aria-label={t('project.unsavedLabel')}>
        {t('project.unsaved')}
      </span>
    )
  }
  if (!label) return <span className="text-xs text-muted-foreground">●</span>
  return (
    <span
      className="text-xs text-muted-foreground"
      aria-label={t('project.lastSaved', { time: label })}
    >
      {label}
    </span>
  )
}
