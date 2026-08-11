/**
 * shadcn/ui AlertDialog primitive (M02). Standard recipe wrapping
 * @radix-ui/react-alert-dialog. Used for delete confirmations, etc.
 */
import type { ReactElement } from 'react'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { cn } from '@/app/lib/cn'
import { buttonVariants } from '@/app/components/ui/button'

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger
export const AlertDialogPortal = AlertDialogPrimitive.Portal

export const AlertDialogOverlay = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(function AlertDialogOverlay({ className, ...props }, ref): ReactElement {
  return (
    <AlertDialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  )
})

export const AlertDialogContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(function AlertDialogContent({ className, ...props }, ref): ReactElement {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg',
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
})

export const AlertDialogHeader = function AlertDialogHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>): ReactElement {
  return (
    <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
  )
}

export const AlertDialogFooter = function AlertDialogFooter({
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>): ReactElement {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  )
}

export const AlertDialogTitle = forwardRef<
  HTMLHeadingElement,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(function AlertDialogTitle({ className, ...props }, ref): ReactElement {
  return (
    <AlertDialogPrimitive.Title
      ref={ref}
      className={cn('text-lg font-semibold', className)}
      {...props}
    />
  )
})

export const AlertDialogDescription = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(function AlertDialogDescription({ className, ...props }, ref): ReactElement {
  return (
    <AlertDialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
})

export const AlertDialogAction = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(function AlertDialogAction({ className, ...props }, ref): ReactElement {
  return (
    <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
  )
})

export const AlertDialogCancel = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(function AlertDialogCancel({ className, ...props }, ref): ReactElement {
  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      className={cn(buttonVariants({ variant: 'outline' }), 'mt-2 sm:mt-0', className)}
      {...props}
    />
  )
})
