/**
 * shadcn/ui Slider primitive (M02). Standard recipe wrapping
 * @radix-ui/react-slider. Used for speed / hand speed / opacity / size, etc.
 */
import type { ReactElement } from 'react'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/app/lib/cn'

export const Slider = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(function Slider({ className, ...props }, ref): ReactElement {
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn('relative flex w-full touch-none select-none items-center', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  )
})
