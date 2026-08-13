import type { ReactElement, KeyboardEvent } from 'react'
import { useRef, useEffect, useSyncExternalStore } from 'react'
import { textService } from '@/app/services/text-service'
import { useCanvasStore } from '@/app/store'

export function TextFeature(): ReactElement | null {
  useSyncExternalStore(textService.subscribe, textService.getSnapshot)
  const active = textService.isActive()
  const style = textService.getTextStyle()
  const pos = textService.getPosition()
  const canvas = useCanvasStore((s) => s.canvas)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (active && textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to the end
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [active])

  if (!active || !style || !pos || !canvas) return null

  // We need to position the textarea over the canvas at pos.x, pos.y.
  // The viewport CSS scales it, so we render the textarea absolutely positioned
  // relative to the CanvasViewport using the same logical coordinates as the canvas width/height.
  // To do this properly, the TextFeature should be rendered inside CanvasViewport which has `relative` positioning.
  // Since the canvas scales visually via CSS `width: 100%; height: 100%`, we might need to map coordinates.
  // Wait, CanvasViewport renders children inside a relative container.
  // The CanvasStage itself uses `width: 100%` but its internal size is logical.
  // But actually, we can render the textarea with absolute positioning inside a container that exactly matches the canvas scale,
  // OR we can render it inside the CanvasViewport and rely on % positioning.
  
  // Actually, CanvasViewport provides a `relative` container that matches the DOM element size.
  // `pos.x`, `pos.y` are logical canvas coordinates. We need to scale them to % of the logical width/height.
  const canvasW = canvas.size.width
  const canvasH = canvas.size.height
  const leftPct = (pos.x / canvasW) * 100
  const topPct = (pos.y / canvasH) * 100

  // The font size in the textarea needs to be scaled by the current view scale.
  // Alternatively, we use CSS `transform: scale(...)` or render inside a div that uses viewBox-like scaling.
  // The simplest way to perfectly match canvas scale is to render the textarea in a container with the same aspect ratio
  // and logical size as the canvas, scaled with CSS, similar to how the SVG outline overlay might do it.
  
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      textService.closeEditor(false)
      e.stopPropagation()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      textService.closeEditor(true)
      e.stopPropagation()
    }
  }

  // To make the textarea scale exactly like the canvas, we can apply a transform.
  // Or we can just render a full logical-sized div absolute, scaled to 100% width/height, 
  // and put the textarea inside it using logical px values.
  
  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none', // pass through
      }}
    >
      {/* We create a nested div with the exact logical size of the canvas, then scale it to fit.
          Wait, if the parent is already exactly the same aspect ratio and we just want to match the CSS scale...
          Actually, we can just position using % and use `calc` or CSS vars if we knew the scale.
          Let's use a trick: the parent `CanvasViewport` is a flex container, but the `CanvasStage` is absolute inset-0.
          We can render an SVG-like viewBox using a wrapper with `width: 100%; height: 100%` and a container inside with `transform: scale`.
          Instead, since we only have the canvasW/H, let's just use CSS `container-type: size` or calculate the scale. 
      */}
      <div
        style={{
          position: 'absolute',
          left: `${leftPct}%`,
          top: `${topPct}%`,
          pointerEvents: 'auto',
          transform: 'translate(-50%, -50%)', // center it roughly for now or top-left?
          // Legacy editor is usually top-left or center? 
          // Legacy: 8140-8153 `textarea.style.left = ...` 
          // We'll refine the exact CSS matching shortly.
        }}
        className="flex flex-col gap-1 items-start"
      >
        <textarea
          ref={textareaRef}
          value={style.text}
          onChange={(e) => textService.setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => textService.closeEditor(true)}
          style={{
            fontFamily: style.fontFamily,
            fontSize: `${style.fontSize}px`, // This needs to be scaled by viewport scale! 
            // Wait, we can use a CSS transform to scale the whole textarea down by the inverse of its logical size
            fontWeight: style.bold ? 'bold' : 'normal',
            fontStyle: style.italic ? 'italic' : 'normal',
            textAlign: style.align,
            color: style.color,
            lineHeight: style.lineHeight,
            letterSpacing: `${style.letterSpacing}px`,
            background: 'transparent',
            border: '1px dashed #888',
            outline: 'none',
            padding: '4px',
            minWidth: '200px',
            minHeight: '1em',
            resize: 'both',
            whiteSpace: 'pre',
            overflow: 'hidden',
          }}
          placeholder="Enter text..."
        />
        <div className="text-xs bg-black/50 text-white px-2 py-1 rounded shadow-sm pointer-events-none whitespace-nowrap">
          Ctrl+Enter to save, Esc to cancel
        </div>
      </div>
    </div>
  )
}
