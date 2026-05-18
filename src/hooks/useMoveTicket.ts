import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ColumnRow } from './useColumns'
import type { TicketWithClient } from './useTickets'

type Args = { id: string; columnId: string }

export function useMoveTicket() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, columnId }: Args) => {
      const columns = qc.getQueryData<ColumnRow[]>(['columns']) ?? []
      const target = columns.find((c) => c.id === columnId)
      const movingIntoDone = target?.is_done ?? false

      // Optimistic update already toggled closed_at locally (see onMutate),
      // but the network update must match: when she drags into the "Gotovo"
      // column, set closed_at; when she drags back out, clear it. This is
      // what makes the auto-archive rule work — the Arhiva page filters on
      // closed_at IS NOT NULL, the kanban hides rows closed before today.
      const { error } = await supabase
        .from('tickets')
        .update({
          column_id: columnId,
          closed_at: movingIntoDone ? new Date().toISOString() : null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, columnId }) => {
      await qc.cancelQueries({ queryKey: ['tickets'] })
      const previous = qc.getQueryData<TicketWithClient[]>(['tickets'])
      const columns = qc.getQueryData<ColumnRow[]>(['columns']) ?? []
      const target = columns.find((c) => c.id === columnId)
      const closedAt = target?.is_done ? new Date().toISOString() : null
      qc.setQueryData<TicketWithClient[]>(['tickets'], (old) =>
        old?.map((t) =>
          t.id === id ? { ...t, column_id: columnId, closed_at: closedAt } : t,
        ),
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
