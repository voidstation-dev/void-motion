/**
 * shadcn/ui Textarea primitive (M02). Standard recipe; wired up in later
 * phases for the text-layer editor.
 */
import type { ReactElement } from 'react'
import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/app/lib/cn'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
): ReactElement {
  return (
    <textarea
      className={cn(
        'flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
