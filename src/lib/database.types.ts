// Generated types placeholder. Replace with output of:
//   bunx supabase gen types typescript --linked > src/lib/database.types.ts
// after the project is linked and migrations are applied.

export type Database = {
  public: {
    Tables: {
      firms: {
        Row: { id: string; name: string; owner_user_id: string; created_at: string }
        Insert: { id?: string; name: string; owner_user_id: string; created_at?: string }
        Update: Partial<{ id: string; name: string; owner_user_id: string; created_at: string }>
      }
      clients: {
        Row: {
          id: string
          firm_id: string
          name: string
          pib: string | null
          mb: string | null
          notes: string | null
          is_recurring: boolean
          created_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          firm_id: string
          name: string
          pib?: string | null
          mb?: string | null
          notes?: string | null
          is_recurring?: boolean
          created_at?: string
          archived_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
      }
      columns: {
        Row: {
          id: string
          firm_id: string
          name: string
          position: number
          client_visible_mapping: 'primljeno' | 'u_radu' | 'ceka_tebe' | 'gotovo' | 'hidden'
          is_done: boolean
        }
        Insert: {
          id?: string
          firm_id: string
          name: string
          position: number
          client_visible_mapping: 'primljeno' | 'u_radu' | 'ceka_tebe' | 'gotovo' | 'hidden'
          is_done?: boolean
        }
        Update: Partial<Database['public']['Tables']['columns']['Insert']>
      }
      tickets: {
        Row: {
          id: string
          firm_id: string
          client_id: string
          column_id: string
          created_by_user_id: string
          created_via: 'voice' | 'manual' | 'portal' | 'recurring'
          type: 'pitanje' | 'zaduzenje' | 'javicu_se'
          title: string
          description: string | null
          rok: string | null
          planirano_za: string | null
          voice_transcript: string | null
          recurrence_rule_id: string | null
          created_at: string
          updated_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          firm_id: string
          client_id: string
          column_id: string
          created_by_user_id: string
          created_via: 'voice' | 'manual' | 'portal' | 'recurring'
          type: 'pitanje' | 'zaduzenje' | 'javicu_se'
          title: string
          description?: string | null
          rok?: string | null
          planirano_za?: string | null
          voice_transcript?: string | null
          recurrence_rule_id?: string | null
          created_at?: string
          updated_at?: string
          closed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['tickets']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
