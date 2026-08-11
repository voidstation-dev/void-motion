/**
 * shadcn/ui Separator primitive (M02). Standard recipe wrapping
 * @radix-ui/react-separator.
 */
import type { ReactElement } from 'react'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { cn } from '@/app/lib/cn'

export const Separator = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(function Separator(
  { className, orientation = 'horizontal', decorative = true, ...props },
  ref,
): ReactElement {
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'vertical' ? 'h-full w-px' : 'h-px w-full',
        className,
      )}
      {...props}
    />
  )
})
