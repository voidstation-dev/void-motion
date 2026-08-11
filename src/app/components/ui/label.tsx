/**
 * shadcn/ui Label primitive (M02). Standard recipe wrapping @radix-ui/react-label.
 */
import type { ReactElement } from 'react'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/app/lib/cn'

export const Label = forwardRef<
  HTMLLabelElement,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(function Label({ className, ...props }, ref): ReactElement {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  )
})
