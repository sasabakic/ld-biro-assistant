import { isToday, isTomorrow } from 'date-fns'

const dayMonthFmt = new Intl.DateTimeFormat('sr-Latn', {
  day: 'numeric',
  month: 'long',
})

/**
 * Format a date for display on kanban cards.
 *  - Today          → "Danas"
 *  - Tomorrow       → "Sutra"
 *  - Other days     → "15. maj"
 * Uses browser local time (Europe/Belgrade for all our users).
 */
export function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (isToday(d)) return 'Danas'
  if (isTomorrow(d)) return 'Sutra'
  return dayMonthFmt.format(d)
}
