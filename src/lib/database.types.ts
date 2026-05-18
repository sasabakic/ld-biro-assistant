export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          from_value: Json | null
          id: string
          ticket_id: string
          to_value: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          from_value?: Json | null
          id?: string
          ticket_id: string
          to_value?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          from_value?: Json | null
          id?: string
          ticket_id?: string
          to_value?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          comment_id: string | null
          created_at: string
          file_name: string
          file_size: number
          file_url: string
          id: string
          ticket_id: string | null
          uploaded_by_user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          file_name: string
          file_size: number
          file_url: string
          id?: string
          ticket_id?: string | null
          uploaded_by_user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          ticket_id?: string | null
          uploaded_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      client_memberships: {
        Row: {
          accepted_at: string | null
          client_id: string
          invited_at: string
          invited_by_user_id: string | null
          role: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          client_id: string
          invited_at?: string
          invited_by_user_id?: string | null
          role?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          client_id?: string
          invited_at?: string
          invited_by_user_id?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_memberships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          archived_at: string | null
          created_at: string
          firm_id: string
          id: string
          is_recurring: boolean
          mb: string | null
          name: string
          notes: string | null
          pdv_cadence: string
          pib: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          firm_id: string
          id?: string
          is_recurring?: boolean
          mb?: string | null
          name: string
          notes?: string | null
          pdv_cadence?: string
          pib?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          is_recurring?: boolean
          mb?: string | null
          name?: string
          notes?: string | null
          pdv_cadence?: string
          pib?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      columns: {
        Row: {
          client_visible_mapping: Database["public"]["Enums"]["column_visibility"]
          firm_id: string
          id: string
          is_done: boolean
          name: string
          position: number
        }
        Insert: {
          client_visible_mapping?: Database["public"]["Enums"]["column_visibility"]
          firm_id: string
          id?: string
          is_done?: boolean
          name: string
          position: number
        }
        Update: {
          client_visible_mapping?: Database["public"]["Enums"]["column_visibility"]
          firm_id?: string
          id?: string
          is_done?: boolean
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "columns_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          client_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by_user_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          client_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by_user_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          client_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by_user_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_periods: {
        Row: {
          chosen_rok: string | null
          created_at: string
          decided_at: string | null
          firm_id: string
          id: string
          month: number
          status: string
          tickets_generated_at: string | null
          year: number
        }
        Insert: {
          chosen_rok?: string | null
          created_at?: string
          decided_at?: string | null
          firm_id: string
          id?: string
          month: number
          status?: string
          tickets_generated_at?: string | null
          year: number
        }
        Update: {
          chosen_rok?: string | null
          created_at?: string
          decided_at?: string | null
          firm_id?: string
          id?: string
          month?: number
          status?: string
          tickets_generated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pdv_periods_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrence_rules: {
        Row: {
          cadence: Database["public"]["Enums"]["cadence"]
          client_id: string
          created_at: string
          day_of_period: number
          enabled: boolean
          id: string
          last_generated_at: string | null
          rok_offset_days: number
          template_title: string
          template_type: string
        }
        Insert: {
          cadence: Database["public"]["Enums"]["cadence"]
          client_id: string
          created_at?: string
          day_of_period: number
          enabled?: boolean
          id?: string
          last_generated_at?: string | null
          rok_offset_days?: number
          template_title: string
          template_type?: string
        }
        Update: {
          cadence?: Database["public"]["Enums"]["cadence"]
          client_id?: string
          created_at?: string
          day_of_period?: number
          enabled?: boolean
          id?: string
          last_generated_at?: string | null
          rok_offset_days?: number
          template_title?: string
          template_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          client_id: string
          closed_at: string | null
          column_id: string
          created_at: string
          created_by_user_id: string
          created_via: Database["public"]["Enums"]["created_via_t"]
          description: string | null
          firm_id: string
          id: string
          pdv_period_id: string | null
          planirano_za: string | null
          recurrence_rule_id: string | null
          rok: string | null
          title: string
          type: Database["public"]["Enums"]["ticket_type"]
          updated_at: string
          voice_transcript: string | null
        }
        Insert: {
          client_id: string
          closed_at?: string | null
          column_id: string
          created_at?: string
          created_by_user_id: string
          created_via: Database["public"]["Enums"]["created_via_t"]
          description?: string | null
          firm_id: string
          id?: string
          pdv_period_id?: string | null
          planirano_za?: string | null
          recurrence_rule_id?: string | null
          rok?: string | null
          title: string
          type: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
          voice_transcript?: string | null
        }
        Update: {
          client_id?: string
          closed_at?: string | null
          column_id?: string
          created_at?: string
          created_by_user_id?: string
          created_via?: Database["public"]["Enums"]["created_via_t"]
          description?: string | null
          firm_id?: string
          id?: string
          pdv_period_id?: string | null
          planirano_za?: string | null
          recurrence_rule_id?: string | null
          rok?: string | null
          title?: string
          type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
          voice_transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_pdv_period_id_fkey"
            columns: ["pdv_period_id"]
            isOneToOne: false
            referencedRelation: "pdv_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_recurrence_rule_id_fkey"
            columns: ["recurrence_rule_id"]
            isOneToOne: false
            referencedRelation: "recurrence_rules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_client_ids: { Args: never; Returns: string[] }
      current_user_firm_id: { Args: never; Returns: string }
    }
    Enums: {
      cadence: "monthly" | "quarterly" | "annually"
      column_visibility:
        | "primljeno"
        | "u_radu"
        | "ceka_tebe"
        | "gotovo"
        | "hidden"
      created_via_t: "voice" | "manual" | "portal" | "recurring"
      ticket_type: "pitanje" | "zaduzenje" | "javicu_se"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cadence: ["monthly", "quarterly", "annually"],
      column_visibility: [
        "primljeno",
        "u_radu",
        "ceka_tebe",
        "gotovo",
        "hidden",
      ],
      created_via_t: ["voice", "manual", "portal", "recurring"],
      ticket_type: ["pitanje", "zaduzenje", "javicu_se"],
    },
  },
} as const
