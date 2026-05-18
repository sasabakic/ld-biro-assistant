import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TicketWithClient } from './useTickets'

export type ArchiveFilters = {
  clientId: string | null
  /** YYYY-MM-DD inclusive (Belgrade time). */
  from: string | null
  /** YYYY-MM-DD inclusive (Belgrade time). */
  to: string | null
  /** Free-text query. ILIKE'd against title + description + voice_transcript. */
  query: string
}

export type ArchivePage = {
  rows: TicketWithClient[]
  totalCount: number
  totalPages: number
}

const DEFAULT_PAGE_SIZE = 50

export function useArchivedTickets(
  filters: ArchiveFilters,
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
) {
  return useQuery({
    queryKey: ['archive', filters, page, pageSize],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<ArchivePage> => {
      let q = supabase
        .from('tickets')
        .select('*, client:clients(name)', { count: 'exact' })
        .not('closed_at', 'is', null)

      if (filters.clientId) {
        q = q.eq('client_id', filters.clientId)
      }
      if (filters.from) {
        // from is YYYY-MM-DD; treat as start-of-day local.
        q = q.gte('closed_at', `${filters.from}T00:00:00`)
      }
      if (filters.to) {
        // Inclusive end-of-day.
        q = q.lte('closed_at', `${filters.to}T23:59:59.999`)
      }
      const term = filters.query.trim()
      if (term) {
        // PostgREST `or` accepts a comma-separated list of conditions.
        // Escape % and , just in case — the user types Serbian, not SQL.
        const safe = term.replace(/[%,]/g, '')
        q = q.or(
          [
            `title.ilike.%${safe}%`,
            `description.ilike.%${safe}%`,
            `voice_transcript.ilike.%${safe}%`,
          ].join(','),
        )
      }

      const from = page * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await q
        .order('closed_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const totalCount = count ?? 0
      return {
        rows: (data ?? []) as TicketWithClient[],
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      }
    },
  })
}
