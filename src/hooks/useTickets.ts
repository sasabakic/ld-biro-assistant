import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type TicketRow = Database['public']['Tables']['tickets']['Row']

export type TicketWithClient = TicketRow & {
  client: { name: string } | null
}

export function useTickets() {
  return useQuery({
    queryKey: ['tickets'],
    queryFn: async (): Promise<TicketWithClient[]> => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, client:clients(name)')
        .is('closed_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as TicketWithClient[]
    },
  })
}
