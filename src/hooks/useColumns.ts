import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type ColumnRow = Database['public']['Tables']['columns']['Row']

export function useColumns() {
  return useQuery({
    queryKey: ['columns'],
    queryFn: async (): Promise<ColumnRow[]> => {
      const { data, error } = await supabase
        .from('columns')
        .select('*')
        .order('position', { ascending: true })
      if (error) throw error
      return data
    },
  })
}
