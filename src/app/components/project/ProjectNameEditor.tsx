/**
 * Project name editor (M05).
 *
 * Inline-editable project name shown in the Header, mirroring the legacy
 * `project-name-editor` (legacy/index.html:3209). Behavior parity:
 *   - Click the display span to start editing (legacy `startRenaming` 4798).
 *   - Enter commits (legacy `handleRenameKey` 4842).
 *   - Escape cancels (legacy `handleRenameKey` 4845).
 *   - Blur commits (legacy `finishRenaming` 4809).
 *   - Empty/whitespace input is discarded (legacy guards on `newName`).
 *
 * The commit goes through `projectService.rename`, which writes the typed
 * store, updates the legacy display, and schedules an autosave — exactly
 * the legacy `finishRenaming` side-effects.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactElement } from 'react'
import { Input } from '@/app/components/ui/input'
import { projectService } from '@/app/services/project-service'
import { useProjectStore } from '@/app/store'
import { selectProjectName } from '@/app/store/project.store'

export function ProjectNameEditor(): ReactElement {
  // Subscribe to the project name via the store selector.
  const name = useProjectStore((s) => selectProjectName(s))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  // When the store name changes externally (load/create), sync the draft.
  useEffect(() => {
    if (!editing) setDraft(name)
  }, [name, editing])

  const start = useCallback(() => {
    setDraft(name)
    setEditing(true)
  }, [name])

  const commit = useCallback(() => {
    const trimmed = draft.trim()
    setEditing(false)
    // Legacy discards empty/whitespace input and no-op renames.
    if (trimmed && trimmed !== name) {
      projectService.rename(trimmed)
    } else {
      setDraft(name)
    }
  }, [draft, name])

  const cancel = useCallback(() => {
    setEditing(false)
    setDraft(name)
  }, [name])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        cancel()
      }
    },
    [commit, cancel],
  )

  // Focus + select on entering edit mode (legacy input.focus() + input.select()).
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className="h-7 w-[200px] text-sm"
        aria-label="Project name"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={start}
      className="flex-1 truncate rounded px-1 py-0.5 text-left text-sm hover:bg-surface-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      aria-label="Project name — click to rename"
      title="Click to rename"
    >
      {name}
    </button>
  )
}
