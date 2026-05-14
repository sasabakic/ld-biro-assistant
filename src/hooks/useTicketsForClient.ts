import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type TicketRow = Database['public']['Tables']['tickets']['Row']

export function useTicketsForClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['tickets', 'by-client', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<TicketRow[]> => {
      if (!clientId) return []
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}
