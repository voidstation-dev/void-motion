import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { TextFeature } from '@/app/features/text/TextFeature'
import { textService } from '@/app/services/text-service'
import { interactionService } from '@/app/services/interaction-service'
import { useLayerStore, useSelectionStore, usePlaybackStore, useCanvasStore } from '@/app/store'

function installLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  w.activateTextPlacement = vi.fn()
  w.deactivateTextPlacement = vi.fn()
  w.openTextEditor = vi.fn()
  w.closeTextEditor = vi.fn()
  w._commitTextLayer = vi.fn()
  w.scheduleAutoSave = vi.fn()
  w.selectLayer = vi.fn()
  w.state = {
    layers: [],
    canvasW: 1280,
    canvasH: 720,
    playing: false,
    selectedLayerId: null,
  }
}

function clearLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  delete w.activateTextPlacement
  delete w.deactivateTextPlacement
  delete w.openTextEditor
  delete w.closeTextEditor
  delete w._commitTextLayer
  delete w.scheduleAutoSave
  delete w.selectLayer
  delete w.state
}

describe('TextFeature on-canvas UI', () => {
  beforeEach(() => {
    useLayerStore.getState().clear()
    useSelectionStore.getState().clear()
    usePlaybackStore.getState().reset()
    useCanvasStore.getState().clear() // canvas is null initially
    textService.reset()
    installLegacy()
  })

  afterEach(() => {
    clearLegacy()
    vi.restoreAllMocks()
  })

  it('renders textarea when active, even if canvas store is initially null', () => {
    render(<TextFeature />)
    expect(screen.queryByPlaceholderText(/Type here/i)).toBeNull()

    // Open editor at (200, 300)
    act(() => {
      textService.openEditor(200, 300, null)
    })
    expect(screen.getByPlaceholderText(/Type here/i)).toBeInTheDocument()
  })

  it('allows typing and commits on Done button click', () => {
    render(<TextFeature />)
    act(() => {
      textService.openEditor(200, 300, null)
    })

    const textarea = screen.getByPlaceholderText(/Type here/i)
    fireEvent.change(textarea, { target: { value: 'Hello Canvas Text' } })
    expect(textService.getTextStyle()?.text).toBe('Hello Canvas Text')

    const doneBtn = screen.getByRole('button', { name: /Done/i })
    fireEvent.click(doneBtn)

    expect(textService.isActive()).toBe(false)
    expect(useLayerStore.getState().layers.length).toBe(1)
    expect(useLayerStore.getState().layers[0]?.name).toBe('Hello Canvas Text')
  })

  it('cancels on Cancel button click without creating a layer', () => {
    render(<TextFeature />)
    act(() => {
      textService.openEditor(200, 300, null)
    })

    const textarea = screen.getByPlaceholderText(/Type here/i)
    fireEvent.change(textarea, { target: { value: 'Draft Text' } })

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i })
    fireEvent.click(cancelBtn)

    expect(textService.isActive()).toBe(false)
    expect(useLayerStore.getState().layers.length).toBe(0)
  })

  it('clicking canvas in placement mode opens text editor', () => {
    textService.activatePlacement()
    expect(textService.isPlacing()).toBe(true)

    const rect = { width: 1280, left: 0, top: 0 }
    const res = interactionService.pointerDown(400, 300, rect, 1280)
    expect(res.type).toBe('blocked')
    expect(textService.isPlacing()).toBe(false)
    expect(textService.isActive()).toBe(true)
    expect(textService.getPosition()).toEqual({ x: 400, y: 300 })
  })

  it('double clicking empty canvas space immediately opens text editor', () => {
    const rect = { width: 1280, left: 0, top: 0 }
    interactionService.doubleClick(500, 250, rect, 1280)
    expect(useSelectionStore.getState().editorMode).toBe('text')
    expect(textService.isActive()).toBe(true)
    expect(textService.getPosition()).toEqual({ x: 500, y: 250 })
  })
})
