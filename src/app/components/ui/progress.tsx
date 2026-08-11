/**
 * shadcn/ui Progress primitive (M02). Standard recipe wrapping
 * @radix-ui/react-progress. Used by export progress UI (M15/M46).
 */
import type { ReactElement } from 'react'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/app/lib/cn'

export const Progress = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(function Progress({ className, value, ...props }, ref): ReactElement {
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-primary transition-transform"
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
})
