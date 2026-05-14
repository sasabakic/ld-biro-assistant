import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TicketWithClient } from './useTickets'

type Args = { id: string; columnId: string }

export function useMoveTicket() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, columnId }: Args) => {
      const { error } = await supabase
        .from('tickets')
        .update({ column_id: columnId })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, columnId }) => {
      await qc.cancelQueries({ queryKey: ['tickets'] })
      const previous = qc.getQueryData<TicketWithClient[]>(['tickets'])
      qc.setQueryData<TicketWithClient[]>(['tickets'], (old) =>
        old?.map((t) => (t.id === id ? { ...t, column_id: columnId } : t)),
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['tickets'], ctx.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
