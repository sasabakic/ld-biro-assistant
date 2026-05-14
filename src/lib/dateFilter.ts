import {
  addDays,
  addWeeks,
  endOfDay,
  endOfWeek,
  isAfter,
  isBefore,
  startOfDay,
  startOfWeek,
} from 'date-fns'

export type TabFilter =
  | { type: 'sve' }
  | { type: 'danas' }
  | { type: 'sutra' }
  | { type: 'week'; weekOffset: number }

type TicketDates = {
  rok: string | null
  planirano_za: string | null
}

const WEEK_OPTS = { weekStartsOn: 1 as const } // Monday

/**
 * Returns the Monday-start/Sunday-end range for a given weekOffset.
 *   0  → current week
 *  -1  → last week
 *  +1  → next week
 */
export function weekRange(weekOffset: number): { start: Date; end: Date } {
  const anchor = addWeeks(new Date(), weekOffset)
  return {
    start: startOfWeek(anchor, WEEK_OPTS),
    end: endOfWeek(anchor, WEEK_OPTS),
  }
}

/**
 * A ticket matches a filter if its `rok` OR `planirano_za` falls in the
 * filter's date range. Uses browser local time (Europe/Belgrade for users).
 *
 * Tickets with no `rok` and no `planirano_za` only match the `sve` filter.
 */
export function matchesFilter(t: TicketDates, filter: TabFilter): boolean {
  if (filter.type === 'sve') return true

  const candidates = [t.rok, t.planirano_za]
    .filter((d): d is string => !!d)
    .map((d) => new Date(d))
  if (candidates.length === 0) return false

  const inRange = (start: Date, end: Date) =>
    candidates.some((d) => !isBefore(d, start) && !isAfter(d, end))

  const now = new Date()

  if (filter.type === 'danas') return inRange(startOfDay(now), endOfDay(now))

  if (filter.type === 'sutra') {
    const t = addDays(now, 1)
    return inRange(startOfDay(t), endOfDay(t))
  }

  if (filter.type === 'week') {
    const { start, end } = weekRange(filter.weekOffset)
    return inRange(start, end)
  }

  return false
}

const dayFmt = new Intl.DateTimeFormat('sr-Latn', { day: 'numeric' })
const monthFmt = new Intl.DateTimeFormat('sr-Latn', { month: 'long' })

/**
 * Format a week range as a human-readable Serbian Latin label.
 *  - Same month: "12. — 18. maj 2026"
 *  - Different months: "30. apr — 5. maj 2026"
 *  - Different years: "30. dec 2025 — 5. jan 2026"
 */
export function formatWeekRangeLabel(start: Date, end: Date): string {
  const startD = dayFmt.format(start)
  const startM = monthFmt.format(start)
  const startY = start.getFullYear()
  const endD = dayFmt.format(end)
  const endM = monthFmt.format(end)
  const endY = end.getFullYear()

  if (startY !== endY) {
    return `${startD}. ${startM} ${startY} — ${endD}. ${endM} ${endY}`
  }
  if (startM !== endM) {
    return `${startD}. ${startM} — ${endD}. ${endM} ${endY}`
  }
  return `${startD}. — ${endD}. ${endM} ${endY}`
}
