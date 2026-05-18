import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfTodayBelgradeIso } from '@/lib/dateFilter'
import type { Database } from '@/lib/database.types'

type TicketRow = Database['public']['Tables']['tickets']['Row']

export type TicketWithClient = TicketRow & {
  client: { name: string } | null
}

/**
 * Returns kanban-visible tickets: anything still open, plus anything that was
 * closed *today* in Belgrade time (so the Gotovo column shows today's wins).
 * Anything closed before today is treated as archived and only appears on
 * the Arhiva page.
 */
export function useTickets() {
  return useQuery({
    queryKey: ['tickets'],
    queryFn: async (): Promise<TicketWithClient[]> => {
      const todayIso = startOfTodayBelgradeIso()
      const { data, error } = await supabase
        .from('tickets')
        .select('*, client:clients(name)')
        .or(`closed_at.is.null,closed_at.gte.${todayIso}`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as TicketWithClient[]
    },
  })
}
