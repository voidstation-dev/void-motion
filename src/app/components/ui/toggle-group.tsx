/**
 * shadcn/ui ToggleGroup primitive (M02). Standard recipe wrapping
 * @radix-ui/react-toggle-group, sharing the Toggle variants. Only the variant
 * options are layered onto the Radix props (not the full Toggle prop bag, which
 * includes `asChild` etc. that the group root does not accept).
 */
import type { ReactElement } from 'react'
import { createContext, forwardRef, useContext, type ComponentPropsWithoutRef } from 'react'
import type { VariantProps } from 'class-variance-authority'
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { cn } from '@/app/lib/cn'
import { toggleVariants } from '@/app/components/ui/toggle'

type ToggleVariantProps = VariantProps<typeof toggleVariants>

const ToggleGroupContext = createContext<ToggleVariantProps>({
  size: 'default',
  variant: 'default',
})

export const ToggleGroup = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & ToggleVariantProps
>(function ToggleGroup({ className, variant, size, children, ...props }, ref): ReactElement {
  return (
    <ToggleGroupPrimitive.Root
      ref={ref}
      className={cn('flex items-center justify-center gap-1', className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
})

export const ToggleGroupItem = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & ToggleVariantProps
>(function ToggleGroupItem({ className, children, variant, size, ...props }, ref): ReactElement {
  const context = useContext(ToggleGroupContext)
  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant ?? variant,
          size: context.size ?? size,
        }),
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
})
