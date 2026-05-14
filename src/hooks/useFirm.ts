import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type FirmRow = Database['public']['Tables']['firms']['Row']

/**
 * Returns the firm row the current owner manages. Returns null if the user is
 * a klijent member (no firm) or if the firm row hasn't been seeded yet.
 * Cached aggressively — firm metadata rarely changes.
 */
export function useFirm() {
  return useQuery({
    queryKey: ['firm'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<FirmRow | null> => {
      const { data, error } = await supabase
        .from('firms')
        .select('*')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
