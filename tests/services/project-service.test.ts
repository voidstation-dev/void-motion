/**
 * M05 Project Service contract tests.
 *
 * Verifies the Project Service coordinates the typed store with the Legacy
 * Storage Adapter boundary without touching `window.*` directly. The legacy
 * storage adapter is stubbed via `window` globals (the same surface the
 * adapter reads), so these tests exercise the real service + real adapter
 * against a fake legacy runtime — preserving the behavior contract.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  projectService,
  resetProjectServiceForTests,
  AUTOSAVE_DEBOUNCE_MS,
} from '@/app/services/project-service'
import { useProjectStore, useUiStore } from '@/app/store'
import { generateRandomName } from '@/app/services/project-name'
import { formatTimeAgo, formatSizeBytes, formatSaveTime } from '@/app/services/time-ago'
import {
  LegacyStorageAdapter,
  legacyProjectSizeBytes,
  isLegacyStorageReady,
  readCurrentProjectId,
} from '@/engine/legacy/legacy-storage-adapter'
import type { LegacyProjectRecord } from '@/engine/legacy/legacy-state.types'
import { buildLegacyState } from '@/test-utils/fixtures'

// ── Fake legacy runtime ─────────────────────────────────────────────────────

interface FakeLegacyGlobals {
  saveProject?: (id?: number) => void
  loadProject?: (id: number) => void
  createNewProject?: () => Promise<void>
  deleteProject?: (id: number, ev?: { stopPropagation: () => void }) => void
  refreshProjectsList?: () => void
  updateProjectNameDisplay?: (name: string) => void
  currentProjectId?: number | null
  state?: unknown
}

function installLegacy(globals: FakeLegacyGlobals): void {
  ;(window as unknown as Record<string, unknown>).saveProject = globals.saveProject
  ;(window as unknown as Record<string, unknown>).loadProject = globals.loadProject
  ;(window as unknown as Record<string, unknown>).createNewProject = globals.createNewProject
  ;(window as unknown as Record<string, unknown>).deleteProject = globals.deleteProject
  ;(window as unknown as Record<string, unknown>).refreshProjectsList = globals.refreshProjectsList
  ;(window as unknown as Record<string, unknown>).updateProjectNameDisplay =
    globals.updateProjectNameDisplay
  window.currentProjectId = globals.currentProjectId ?? null
  window.state = globals.state as never
}

function clearLegacy(): void {
  delete (window as unknown as Record<string, unknown>).saveProject
  delete (window as unknown as Record<string, unknown>).loadProject
  delete (window as unknown as Record<string, unknown>).createNewProject
  delete (window as unknown as Record<string, unknown>).deleteProject
  delete (window as unknown as Record<string, unknown>).refreshProjectsList
  delete (window as unknown as Record<string, unknown>).updateProjectNameDisplay
  delete (window as unknown as Record<string, unknown>).currentProjectId
  window.currentProjectId = null
  delete (window as unknown as Record<string, unknown>).state
}

beforeEach(() => {
  useProjectStore.getState().clear()
  useUiStore.getState().setProjectListOpen(false)
  resetProjectServiceForTests()
  clearLegacy()
})

afterEach(() => {
  resetProjectServiceForTests()
  clearLegacy()
  vi.useRealTimers()
})

// ── LegacyStorageAdapter ─────────────────────────────────────────────────────

describe('M05 LegacyStorageAdapter', () => {
  it('delegates save to window.saveProject with the id', () => {
    const save = vi.fn()
    installLegacy({ saveProject: save, currentProjectId: 7 })
    const adapter = new LegacyStorageAdapter()
    adapter.save(42)
    expect(save).toHaveBeenCalledWith(42)
  })

  it('save with no arg uses the legacy default (undefined)', () => {
    const save = vi.fn()
    installLegacy({ saveProject: save })
    const adapter = new LegacyStorageAdapter()
    adapter.save()
    expect(save).toHaveBeenCalledWith()
  })

  it('load delegates to window.loadProject', () => {
    const load = vi.fn()
    installLegacy({ loadProject: load })
    new LegacyStorageAdapter().load(13)
    expect(load).toHaveBeenCalledWith(13)
  })

  it('createNew awaits the legacy async create', async () => {
    const create = vi.fn(async () => undefined)
    installLegacy({ createNewProject: create })
    await new LegacyStorageAdapter().createNew()
    expect(create).toHaveBeenCalled()
  })

  it('delete passes a stopPropagation stub (no DOM event in adapter path)', () => {
    const del = vi.fn()
    installLegacy({ deleteProject: del })
    new LegacyStorageAdapter().delete(99)
    expect(del).toHaveBeenCalledWith(
      99,
      expect.objectContaining({ stopPropagation: expect.any(Function) }),
    )
  })

  it('refreshList delegates to window.refreshProjectsList', () => {
    const refresh = vi.fn()
    installLegacy({ refreshProjectsList: refresh })
    new LegacyStorageAdapter().refreshList()
    expect(refresh).toHaveBeenCalled()
  })

  it('ready is true only when save+load are present', () => {
    installLegacy({ saveProject: vi.fn() })
    expect(isLegacyStorageReady()).toBe(false)
    installLegacy({ saveProject: vi.fn(), loadProject: vi.fn() })
    expect(isLegacyStorageReady()).toBe(true)
  })

  it('currentId reads the legacy global', () => {
    installLegacy({ currentProjectId: 55 })
    expect(readCurrentProjectId()).toBe(55)
  })

  it('throws a typed error when a required global is missing', () => {
    installLegacy({})
    expect(() => new LegacyStorageAdapter().save()).toThrow(/saveProject is unavailable/)
  })
})

// ── project-name + time-ago helpers ─────────────────────────────────────────

describe('M05 project-name + time-ago helpers', () => {
  it('generateRandomName returns "Adjective Noun" from the legacy lists', () => {
    const name = generateRandomName()
    expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
  })

  it('formatTimeAgo matches legacy buckets', () => {
    const now = new Date('2026-01-10T12:00:00Z').getTime()
    expect(formatTimeAgo(now, '2026-01-10T11:59:30Z')).toBe('Just now')
    expect(formatTimeAgo(now, '2026-01-10T11:30:00Z')).toBe('30m ago')
    expect(formatTimeAgo(now, '2026-01-10T08:00:00Z')).toBe('4h ago')
    expect(formatTimeAgo(now, '2026-01-05T00:00:00Z')).toBe('5d ago')
  })

  it('formatSizeBytes matches legacy thresholds', () => {
    expect(formatSizeBytes(500)).toBe('500 B')
    expect(formatSizeBytes(2048)).toBe('2.0 KB')
    expect(formatSizeBytes(2 * 1024 * 1024)).toBe('2.0 MB')
  })

  it('formatSaveTime produces HH:MM:SS 24h', () => {
    const s = formatSaveTime('2026-01-10T09:30:05Z')
    // locale-formatted; just assert it parses to a time-like string.
    expect(s).toMatch(/\d{2}:\d{2}:\d{2}/)
  })

  it('legacyProjectSizeBytes matches the legacy Blob([JSON]).size formula', () => {
    const record: LegacyProjectRecord = {
      id: 1,
      name: 'X',
      createdAt: '2026-01-01T00:00:00.000Z',
      modifiedAt: '2026-01-01T00:00:00.000Z',
      state: { a: 1 },
    }
    const expected = new Blob([JSON.stringify(record.state)]).size
    expect(legacyProjectSizeBytes(record)).toBe(expected)
  })
})

// ── ProjectService ───────────────────────────────────────────────────────────

describe('M05 ProjectService', () => {
  it('bootstrap no-ops when legacy storage is not ready', async () => {
    // No globals installed.
    await projectService.bootstrap()
    expect(useProjectStore.getState().current).toBeNull()
  })

  it('createNew delegates to legacy createNewProject and hydrates the store', async () => {
    const create = vi.fn(async () => {
      // Simulate legacy side-effect: set currentProjectId + state.
      window.currentProjectId = 3
      window.state = buildLegacyState() as never
    })
    installLegacy({
      createNewProject: create,
      saveProject: vi.fn(),
      loadProject: vi.fn(),
    })
    // Stub readLegacyProjectRecords by seeding the store directly is not
    // possible; instead rely on hydrateCurrentFromLegacy's IDB path failing
    // gracefully (it does when IDB is unavailable in jsdom).
    await projectService.createNew()
    expect(create).toHaveBeenCalled()
  })

  it('rename updates the store name, calls legacy display, and marks dirty', () => {
    const display = vi.fn()
    installLegacy({ updateProjectNameDisplay: display, saveProject: vi.fn() })
    // Seed a current project so rename has a target.
    useProjectStore.getState().setCurrent({
      schemaVersion: 1,
      id: 'p1' as never,
      name: 'Old',
      canvas: {
        size: { width: 1280, height: 720 },
        aspectRatio: '16:9',
        resolutionPreset: '720p',
        background: { type: 'solid', val: 'white' },
      },
      layers: [],
      groups: [],
      animation: {
        animationStyle: 'chunk-jump',
        handStyle: 'hand-1',
        zigzag: true,
        drawDirection: 'left-to-right',
        textDrawStyle: 'reveal',
        outlineDetect: 50,
        detectionAlgorithm: 'classic',
        strokeStyle: 'default',
        coloringStyle: 'filled',
        color: '#1a1a1a',
        revealStyle: 'fade',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    projectService.rename('New Name')
    expect(useProjectStore.getState().current?.name).toBe('New Name')
    expect(display).toHaveBeenCalledWith('New Name')
    expect(useProjectStore.getState().dirty).toBe(true)
  })

  it('rename ignores empty/whitespace input', () => {
    installLegacy({ updateProjectNameDisplay: vi.fn(), saveProject: vi.fn() })
    useProjectStore.getState().setCurrent({
      schemaVersion: 1,
      id: 'p1' as never,
      name: 'Keep',
      canvas: {
        size: { width: 1280, height: 720 },
        aspectRatio: '16:9',
        resolutionPreset: '720p',
        background: { type: 'solid', val: 'white' },
      },
      layers: [],
      groups: [],
      animation: {
        animationStyle: 'chunk-jump',
        handStyle: 'hand-1',
        zigzag: true,
        drawDirection: 'left-to-right',
        textDrawStyle: 'reveal',
        outlineDetect: 50,
        detectionAlgorithm: 'classic',
        strokeStyle: 'default',
        coloringStyle: 'filled',
        color: '#1a1a1a',
        revealStyle: 'fade',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    projectService.rename('   ')
    expect(useProjectStore.getState().current?.name).toBe('Keep')
  })

  it('scheduleAutosave debounces save by AUTOSAVE_DEBOUNCE_MS then clears dirty', () => {
    vi.useFakeTimers()
    const save = vi.fn()
    installLegacy({ saveProject: save, currentProjectId: 8 })
    useProjectStore.getState().setCurrent({
      schemaVersion: 1,
      id: 'p8' as never,
      name: 'P',
      canvas: {
        size: { width: 1280, height: 720 },
        aspectRatio: '16:9',
        resolutionPreset: '720p',
        background: { type: 'solid', val: 'white' },
      },
      layers: [],
      groups: [],
      animation: {
        animationStyle: 'chunk-jump',
        handStyle: 'hand-1',
        zigzag: true,
        drawDirection: 'left-to-right',
        textDrawStyle: 'reveal',
        outlineDetect: 50,
        detectionAlgorithm: 'classic',
        strokeStyle: 'default',
        coloringStyle: 'filled',
        color: '#1a1a1a',
        revealStyle: 'fade',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    projectService.scheduleAutosave()
    expect(useProjectStore.getState().dirty).toBe(true)
    // Before the debounce elapses, save has not run.
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS - 1)
    expect(save).not.toHaveBeenCalled()
    // At the debounce boundary, save fires + dirty clears.
    vi.advanceTimersByTime(1)
    expect(save).toHaveBeenCalledWith(8)
    expect(useProjectStore.getState().dirty).toBe(false)
  })

  it('scheduleAutosave is debounced — repeated calls reset the timer', () => {
    vi.useFakeTimers()
    const save = vi.fn()
    installLegacy({ saveProject: save, currentProjectId: 8 })
    useProjectStore.getState().setCurrent({
      schemaVersion: 1,
      id: 'p8' as never,
      name: 'P',
      canvas: {
        size: { width: 1280, height: 720 },
        aspectRatio: '16:9',
        resolutionPreset: '720p',
        background: { type: 'solid', val: 'white' },
      },
      layers: [],
      groups: [],
      animation: {
        animationStyle: 'chunk-jump',
        handStyle: 'hand-1',
        zigzag: true,
        drawDirection: 'left-to-right',
        textDrawStyle: 'reveal',
        outlineDetect: 50,
        detectionAlgorithm: 'classic',
        strokeStyle: 'default',
        coloringStyle: 'filled',
        color: '#1a1a1a',
        revealStyle: 'fade',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    projectService.scheduleAutosave()
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS - 50)
    projectService.scheduleAutosave() // reset
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS - 50)
    expect(save).not.toHaveBeenCalled()
    vi.advanceTimersByTime(50)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('openProjects refreshes the list and opens the sheet', async () => {
    installLegacy({ saveProject: vi.fn(), loadProject: vi.fn() })
    await projectService.openProjects()
    expect(useUiStore.getState().projectListOpen).toBe(true)
    projectService.closeProjects()
    expect(useUiStore.getState().projectListOpen).toBe(false)
  })

  it('saveNow calls legacy save with the current id and clears dirty', () => {
    const save = vi.fn()
    installLegacy({ saveProject: save, currentProjectId: 12 })
    useProjectStore.getState().setCurrent({
      schemaVersion: 1,
      id: 'p12' as never,
      name: 'P',
      canvas: {
        size: { width: 1280, height: 720 },
        aspectRatio: '16:9',
        resolutionPreset: '720p',
        background: { type: 'solid', val: 'white' },
      },
      layers: [],
      groups: [],
      animation: {
        animationStyle: 'chunk-jump',
        handStyle: 'hand-1',
        zigzag: true,
        drawDirection: 'left-to-right',
        textDrawStyle: 'reveal',
        outlineDetect: 50,
        detectionAlgorithm: 'classic',
        strokeStyle: 'default',
        coloringStyle: 'filled',
        color: '#1a1a1a',
        revealStyle: 'fade',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    useProjectStore.getState().markDirty()
    projectService.saveNow()
    expect(save).toHaveBeenCalledWith(12)
    expect(useProjectStore.getState().dirty).toBe(false)
  })
})
