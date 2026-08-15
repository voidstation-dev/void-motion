import type { ReactElement, KeyboardEvent } from 'react'
import { useRef, useEffect, useState, useSyncExternalStore } from 'react'
import { textService } from '@/app/services/text-service'
import { useTranslation } from 'react-i18next'
import { useCanvasStore } from '@/app/store'

export function TextFeature(): ReactElement | null {
  const { t } = useTranslation('tools')
  useSyncExternalStore(textService.subscribe, textService.getSnapshot)
  const active = textService.isActive()
  const style = textService.getTextStyle()
  const pos = textService.getPosition()
  const canvas = useCanvasStore((s) => s.canvas)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const canvasW =
    canvas?.size.width ??
    (typeof window !== 'undefined' &&
    (window as unknown as Record<string, unknown>).state &&
    typeof ((window as unknown as Record<string, unknown>).state as Record<string, unknown>).canvasW === 'number'
      ? (((window as unknown as Record<string, unknown>).state as Record<string, unknown>).canvasW as number)
      : 1280)
  const canvasH =
    canvas?.size.height ??
    (typeof window !== 'undefined' &&
    (window as unknown as Record<string, unknown>).state &&
    typeof ((window as unknown as Record<string, unknown>).state as Record<string, unknown>).canvasH === 'number'
      ? (((window as unknown as Record<string, unknown>).state as Record<string, unknown>).canvasH as number)
      : 720)

  useEffect(() => {
    if (active && textareaRef.current) {
      textareaRef.current.focus()
      autoResize(textareaRef.current)
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [active])

  useEffect(() => {
    const parent = containerRef.current?.closest('[data-testid="canvas-viewport"]') as HTMLElement | null
    if (parent) {
      const updateScale = () => {
        const rect = parent.getBoundingClientRect()
        if (rect.width > 0) {
          setScale(rect.width / canvasW)
        }
      }
      updateScale()
      const ro = new ResizeObserver(updateScale)
      ro.observe(parent)
      return () => ro.disconnect()
    }
  }, [canvasW])

  if (!active || !style || !pos) return null

  const leftPct = Math.max(2, Math.min(92, (pos.x / canvasW) * 100))
  const topPct = Math.max(2, Math.min(90, (pos.y / canvasH) * 100))
  const scaledFontSize = Math.max(14, Math.min(80, Math.round(style.fontSize * scale)))

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      textService.closeEditor(false)
      e.stopPropagation()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
      textService.closeEditor(true)
      e.stopPropagation()
      e.preventDefault()
    }
  }

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.max(24, el.scrollHeight)}px`
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      <div
        data-text-editor="true"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: `${leftPct}%`,
          top: `${topPct}%`,
          pointerEvents: 'auto',
          minWidth: `${Math.max(120, 140 * scale)}px`,
          maxWidth: `${Math.max(220, (canvasW - pos.x) * scale)}px`,
          border: '1.5px dashed rgba(23, 25, 24, 0.45)',
          borderRadius: '6px',
          padding: '4px 8px',
          background: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(2px)',
          boxSizing: 'border-box',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
        className="flex flex-col gap-1 items-start"
      >
        <textarea
          ref={textareaRef}
          value={style.text}
          onChange={(e) => {
            textService.setText(e.target.value)
            autoResize(e.target)
          }}
          onKeyDown={onKeyDown}
          style={{
            fontFamily: `'${style.fontFamily}', cursive, sans-serif`,
            fontSize: `${scaledFontSize}px`,
            fontWeight: style.bold ? '700' : '400',
            fontStyle: style.italic ? 'italic' : 'normal',
            textAlign: style.align,
            color: style.color || '#171918',
            lineHeight: 1.25,
            letterSpacing: `${style.letterSpacing * scale}px`,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: 0,
            margin: 0,
            width: '100%',
            minHeight: '1.2em',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            caretColor: style.color || '#171918',
          }}
          placeholder={t('text.placeholder', 'Type here...')}
        />
        <div className="flex items-center gap-1.5 bg-[#171918] text-white px-2 py-0.5 rounded-[5px] shadow-sm text-[10px] font-medium select-none pointer-events-auto mt-0.5">
          <button
            type="button"
            className="px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white font-semibold cursor-pointer transition-colors"
            onClick={() => textService.closeEditor(true)}
          >
            ✓ {t('text.done', 'Done')}
          </button>
          <button
            type="button"
            className="px-1.5 py-0.5 rounded hover:bg-white/10 text-white/80 cursor-pointer transition-colors"
            onClick={() => textService.closeEditor(false)}
          >
            ✕ {t('text.cancel', 'Cancel')}
          </button>
          <span className="text-[9px] text-white/50 ml-0.5 font-mono">↵ Enter</span>
        </div>
      </div>
    </div>
  )
}
