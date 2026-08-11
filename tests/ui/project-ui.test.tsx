/**
 * M05 project UI tests.
 *
 * Renders the React project-lifecycle components under jsdom and asserts
 * they wire to the store + service correctly: the name editor commits on
 * Enter / cancels on Escape, the Projects button opens the sheet, and the
 * SaveIndicator reflects dirty/saved state.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ProjectNameEditor } from '@/app/components/project/ProjectNameEditor'
import { ProjectsButton } from '@/app/components/project/ProjectsButton'
import { SaveIndicator } from '@/app/components/project/SaveIndicator'
import { useProjectStore, useUiStore } from '@/app/store'
import { projectService, resetProjectServiceForTests } from '@/app/services/project-service'
import type { ProjectDocument } from '@/types/project'

function makeDoc(name: string, updatedAt: string): ProjectDocument {
  return {
    schemaVersion: 1,
    id: 'p1' as never,
    name,
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
    updatedAt,
  }
}

beforeEach(() => {
  useProjectStore.getState().clear()
  useUiStore.getState().setProjectListOpen(false)
  resetProjectServiceForTests()
  // Stub legacy display so rename does not throw.
  ;(window as unknown as Record<string, unknown>).updateProjectNameDisplay = vi.fn()
  ;(window as unknown as Record<string, unknown>).saveProject = vi.fn()
  window.currentProjectId = 1
})

afterEach(() => {
  cleanup()
  resetProjectServiceForTests()
  delete (window as unknown as Record<string, unknown>).updateProjectNameDisplay
  delete (window as unknown as Record<string, unknown>).saveProject
  window.currentProjectId = null
  vi.useRealTimers()
})

describe('M05 ProjectNameEditor', () => {
  it('renders the current project name', () => {
    useProjectStore.getState().setCurrent(makeDoc('My Project', '2026-01-01T00:00:00.000Z'))
    render(<ProjectNameEditor />)
    expect(screen.getByText('My Project')).toBeTruthy()
  })

  it('enters edit mode on click and commits on Enter', () => {
    useProjectStore.getState().setCurrent(makeDoc('Old', '2026-01-01T00:00:00.000Z'))
    const renameSpy = vi.spyOn(projectService, 'rename')
    render(<ProjectNameEditor />)
    fireEvent.click(screen.getByRole('button', { name: /project name/i }))
    const input = screen.getByLabelText('Project name')
    fireEvent.change(input, { target: { value: 'New' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(renameSpy).toHaveBeenCalledWith('New')
    renameSpy.mockRestore()
  })

  it('cancels on Escape without committing', () => {
    useProjectStore.getState().setCurrent(makeDoc('Keep', '2026-01-01T00:00:00.000Z'))
    const renameSpy = vi.spyOn(projectService, 'rename')
    render(<ProjectNameEditor />)
    fireEvent.click(screen.getByRole('button', { name: /project name/i }))
    const input = screen.getByLabelText('Project name')
    fireEvent.change(input, { target: { value: 'Discarded' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(renameSpy).not.toHaveBeenCalled()
    expect(screen.getByText('Keep')).toBeTruthy()
    renameSpy.mockRestore()
  })

  it('discards empty input on commit', () => {
    useProjectStore.getState().setCurrent(makeDoc('Keep', '2026-01-01T00:00:00.000Z'))
    const renameSpy = vi.spyOn(projectService, 'rename')
    render(<ProjectNameEditor />)
    fireEvent.click(screen.getByRole('button', { name: /project name/i }))
    const input = screen.getByLabelText('Project name')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(renameSpy).not.toHaveBeenCalled()
    renameSpy.mockRestore()
  })
})

describe('M05 ProjectsButton', () => {
  it('opens the projects sheet via the service', () => {
    const openSpy = vi.spyOn(projectService, 'openProjects').mockResolvedValue(undefined)
    render(<ProjectsButton />)
    fireEvent.click(screen.getByRole('button', { name: /open projects list/i }))
    expect(openSpy).toHaveBeenCalled()
    openSpy.mockRestore()
  })
})

describe('M05 SaveIndicator', () => {
  it('shows "● unsaved" when the project is dirty', () => {
    useProjectStore.getState().setCurrent(makeDoc('P', '2026-01-01T00:00:00.000Z'))
    useProjectStore.getState().markDirty()
    render(<SaveIndicator />)
    expect(screen.getByLabelText('Unsaved changes')).toBeTruthy()
  })

  it('shows the saved timestamp when clean', () => {
    useProjectStore.getState().setCurrent(makeDoc('P', '2026-01-10T09:30:05.000Z'))
    render(<SaveIndicator />)
    expect(screen.getByLabelText(/last saved/i)).toBeTruthy()
  })
})
