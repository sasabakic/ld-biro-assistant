import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type TicketInsert = Database['public']['Tables']['tickets']['Insert']
type TicketRow = Database['public']['Tables']['tickets']['Row']

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: TicketInsert): Promise<TicketRow> => {
      const { data, error } = await supabase
        .from('tickets')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['tickets'] })
      void qc.invalidateQueries({
        queryKey: ['tickets', 'by-client', data.client_id],
      })
    },
  })
}
