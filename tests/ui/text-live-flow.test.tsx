import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { App } from '@/app/App'
import { textService } from '@/app/services/text-service'
import { useSelectionStore, useLayerStore, useCanvasStore, usePlaybackStore } from '@/app/store'

function installLegacy(): void {
  const w = window as unknown as Record<string, unknown>
  w.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
  w.activateTextPlacement = vi.fn()
  w.deactivateTextPlacement = vi.fn()
  w.openTextEditor = vi.fn()
  w.closeTextEditor = vi.fn()
  w._commitTextLayer = vi.fn()
  w.scheduleAutoSave = vi.fn()
  w.selectLayer = vi.fn()
  w.pushUndoSnapshot = vi.fn()
  w.fitCanvas = vi.fn()
  w.redrawLayersOnCanvas = vi.fn()
  w.renderLayerList = vi.fn()
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
  delete w.pushUndoSnapshot
  delete w.fitCanvas
  delete w.redrawLayersOnCanvas
  delete w.renderLayerList
  delete w.state
}

describe('Text Placement live flow inside App', () => {
  beforeEach(() => {
    useLayerStore.getState().clear()
    useSelectionStore.getState().clear()
    usePlaybackStore.getState().reset()
    useCanvasStore.getState().clear()
    textService.reset()
    installLegacy()
  })

  afterEach(() => {
    clearLegacy()
    vi.restoreAllMocks()
  })

  it('user flow: double click canvas -> type in dashed box -> commit', async () => {
    const { container } = render(<App />)

    // 1. Switch to text tab
    const textTab = container.querySelector('[data-value="text"]') as HTMLElement
    if (textTab) {
      fireEvent.click(textTab)
    } else {
      act(() => {
        useSelectionStore.getState().setEditorMode('text')
      })
    }

    expect(useSelectionStore.getState().editorMode).toBe('text')

    // 2. Double-click on the select-canvas overlay
    const selectCanvas = container.querySelector('#select-canvas') as HTMLCanvasElement
    expect(selectCanvas).toBeInTheDocument()

    // Mock getBoundingClientRect for selectCanvas
    vi.spyOn(selectCanvas, 'getBoundingClientRect').mockReturnValue({
      width: 800,
      height: 450,
      left: 100,
      top: 100,
      right: 900,
      bottom: 550,
      x: 100,
      y: 100,
      toJSON: () => {},
    })

    // Simulate double-clicking in the canvas at clientX=500, clientY=300
    fireEvent.doubleClick(selectCanvas, { clientX: 500, clientY: 300 })

    // Verify text editor is active
    expect(textService.isActive()).toBe(true)

    // Verify on-canvas textarea with placeholder "Type here..." appears in the DOM
    const textarea = screen.getByPlaceholderText(/Type here/i) as HTMLTextAreaElement
    expect(textarea).toBeInTheDocument()

    // 3. User types on the canvas
    fireEvent.change(textarea, { target: { value: 'Hello Canvas!' } })
    expect(textService.getTextStyle()?.text).toBe('Hello Canvas!')

    // 4. User clicks Done
    const doneBtn = screen.getByRole('button', { name: /Done/i })
    fireEvent.click(doneBtn)

    expect(textService.isActive()).toBe(false)
    expect(useLayerStore.getState().layers.length).toBe(1)
    expect(useLayerStore.getState().layers[0]?.name).toBe('Hello Canvas!')
  })

  it('single click and drag to resize an existing layer does NOT create a new text input', async () => {
    const { container } = render(<App />)

    // Add a text layer
    act(() => {
      useLayerStore.getState().addLayer({
        id: 'layer-text-1' as any,
        name: 'Existing Text',
        type: 'text',
        transform: { x: 200, y: 200, width: 300, height: 100 },
        visible: true,
        opacity: 1,
        animationOrder: 1,
      } as any)
      useSelectionStore.getState().selectLayer('layer-text-1' as any)
      useSelectionStore.getState().setEditorMode('text')
    })

    const selectCanvas = container.querySelector('#select-canvas') as HTMLCanvasElement
    vi.spyOn(selectCanvas, 'getBoundingClientRect').mockReturnValue({
      width: 1280,
      height: 720,
      left: 0,
      top: 0,
      right: 1280,
      bottom: 720,
      x: 0,
      y: 0,
      toJSON: () => {},
    })

    // Single click on a resize handle (e.g. SE corner: x=500, y=300)
    fireEvent.mouseDown(selectCanvas, { clientX: 500, clientY: 300 })

    // Must NOT create a new text session
    expect(textService.isActive()).toBe(false)
    expect(screen.queryByPlaceholderText(/Type here/i)).toBeNull()
  })
})
