import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type ClientRow = Database['public']['Tables']['clients']['Row']
type ClientInsert = Database['public']['Tables']['clients']['Insert']
type ClientUpdate = Database['public']['Tables']['clients']['Update']

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async (): Promise<ClientRow[]> => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .is('archived_at', null)
        .order('name', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ['client', id],
    enabled: !!id,
    queryFn: async (): Promise<ClientRow | null> => {
      if (!id) return null
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ClientInsert): Promise<ClientRow> => {
      const { data, error } = await supabase
        .from('clients')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: ClientUpdate
    }): Promise<ClientRow> => {
      const { data, error } = await supabase
        .from('clients')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['clients'] })
      void qc.invalidateQueries({ queryKey: ['client', data.id] })
    },
  })
}
