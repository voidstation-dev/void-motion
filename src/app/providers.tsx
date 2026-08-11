/**
 * Void Motion providers (M02).
 *
 * Wraps the React shell in the providers that exist at this phase. M02 adds
 * the Radix TooltipProvider (required so any Tooltip primitive can mount
 * without per-instance boilerplate). Later migrations compose theme and
 * store providers into the inner tree here.
 */
import type { ReactElement, ReactNode } from 'react'
import { TooltipProvider } from '@/app/components/ui/tooltip'

export interface ProvidersProps {
  readonly children: ReactNode
}

export function Providers({ children }: ProvidersProps): ReactElement {
  // M02: TooltipProvider is a no-op context wrapper; no behavior migrated yet.
  return <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
}
