import type { ReactElement, ReactNode } from 'react'
import { TooltipProvider } from '@/app/components/ui/tooltip'

export interface ProvidersProps {
  readonly children: ReactNode
}

export function Providers({ children }: ProvidersProps): ReactElement {
  return <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
}
