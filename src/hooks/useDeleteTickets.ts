import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useDeleteTickets() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]): Promise<void> => {
      if (ids.length === 0) return
      const { error } = await supabase.from('tickets').delete().in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
