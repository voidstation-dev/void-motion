import { resolvedLocale } from './index'

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(resolvedLocale()).format(value)
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat(resolvedLocale(), {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatClock(date: Date): string {
  return new Intl.DateTimeFormat(resolvedLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}
