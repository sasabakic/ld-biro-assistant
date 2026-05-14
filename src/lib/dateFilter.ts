import { addDays, endOfDay, isAfter, isBefore, startOfDay } from 'date-fns'

export type DayFilter = 'sve' | 'danas' | 'sutra' | 'nedelja'

type TicketDates = {
  rok: string | null
  planirano_za: string | null
}

/**
 * A ticket matches a day filter if its `rok` OR `planirano_za` falls inside
 * the filter's date range. Uses browser local time, which is correct here
 * because every user is in Europe/Belgrade.
 *
 * - `sve`: always match
 * - `danas`: rok or planirano_za is today
 * - `sutra`: rok or planirano_za is tomorrow
 * - `nedelja`: rok or planirano_za is within the next 7 days (today..today+6)
 *
 * Tickets with no rok and no planirano_za only match `sve`.
 */
export function matchesDayFilter(t: TicketDates, filter: DayFilter): boolean {
  if (filter === 'sve') return true

  const candidates = [t.rok, t.planirano_za]
    .filter((d): d is string => !!d)
    .map((d) => new Date(d))
  if (candidates.length === 0) return false

  const now = new Date()
  const inRange = (start: Date, end: Date) =>
    candidates.some((d) => !isBefore(d, start) && !isAfter(d, end))

  if (filter === 'danas') return inRange(startOfDay(now), endOfDay(now))
  if (filter === 'sutra') {
    const t = addDays(now, 1)
    return inRange(startOfDay(t), endOfDay(t))
  }
  if (filter === 'nedelja') {
    return inRange(startOfDay(now), endOfDay(addDays(now, 6)))
  }
  return false
}
