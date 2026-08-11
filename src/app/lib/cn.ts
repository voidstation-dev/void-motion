/**
 * Class-name merge utility (M02).
 *
 * Standard shadcn/ui helper: `clsx` for conditional classes, `tailwind-merge`
 * to resolve conflicting Tailwind utilities. Used by every UI primitive so
 * consumer-provided className always wins over the default variants.
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
