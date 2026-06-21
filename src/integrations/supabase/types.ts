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
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          label: string
          last_used_at: string | null
          prefix: string
          revoked_at: string | null
          secret_hash: string
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          prefix: string
          revoked_at?: string | null
          secret_hash: string
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          prefix?: string
          revoked_at?: string | null
          secret_hash?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_configs: {
        Row: {
          chain: Database["public"]["Enums"]["chain_kind"]
          confirmations_required: number
          created_at: string
          derivation_path: string | null
          enabled: boolean
          id: string
          next_derivation_index: number
          store_id: string
          updated_at: string
          xpub_or_address: string
        }
        Insert: {
          chain: Database["public"]["Enums"]["chain_kind"]
          confirmations_required?: number
          created_at?: string
          derivation_path?: string | null
          enabled?: boolean
          id?: string
          next_derivation_index?: number
          store_id: string
          updated_at?: string
          xpub_or_address: string
        }
        Update: {
          chain?: Database["public"]["Enums"]["chain_kind"]
          confirmations_required?: number
          created_at?: string
          derivation_path?: string | null
          enabled?: boolean
          id?: string
          next_derivation_index?: number
          store_id?: string
          updated_at?: string
          xpub_or_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_configs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          address: string
          chain: Database["public"]["Enums"]["chain_kind"]
          created_at: string
          crypto_amount: number
          derivation_index: number
          description: string | null
          expires_at: string
          external_order_id: string | null
          fiat_amount: number
          fiat_currency: string
          id: string
          rate: number
          redirect_url: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          store_id: string
          updated_at: string
        }
        Insert: {
          address: string
          chain: Database["public"]["Enums"]["chain_kind"]
          created_at?: string
          crypto_amount: number
          derivation_index: number
          description?: string | null
          expires_at: string
          external_order_id?: string | null
          fiat_amount: number
          fiat_currency: string
          id?: string
          rate: number
          redirect_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          store_id: string
          updated_at?: string
        }
        Update: {
          address?: string
          chain?: Database["public"]["Enums"]["chain_kind"]
          created_at?: string
          crypto_amount?: number
          derivation_index?: number
          description?: string | null
          expires_at?: string
          external_order_id?: string | null
          fiat_amount?: number
          fiat_currency?: string
          id?: string
          rate?: number
          redirect_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rates_cache: {
        Row: {
          chain: Database["public"]["Enums"]["chain_kind"]
          fetched_at: string
          fiat: string
          rate: number
        }
        Insert: {
          chain: Database["public"]["Enums"]["chain_kind"]
          fetched_at?: string
          fiat: string
          rate: number
        }
        Update: {
          chain?: Database["public"]["Enums"]["chain_kind"]
          fetched_at?: string
          fiat?: string
          rate?: number
        }
        Relationships: []
      }
      stores: {
        Row: {
          created_at: string
          fiat_currency: string
          id: string
          invoice_ttl_seconds: number
          name: string
          owner_id: string
          updated_at: string
          webhook_secret_hash: string | null
          webhook_url: string | null
          website: string | null
        }
        Insert: {
          created_at?: string
          fiat_currency?: string
          id?: string
          invoice_ttl_seconds?: number
          name: string
          owner_id: string
          updated_at?: string
          webhook_secret_hash?: string | null
          webhook_url?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string
          fiat_currency?: string
          id?: string
          invoice_ttl_seconds?: number
          name?: string
          owner_id?: string
          updated_at?: string
          webhook_secret_hash?: string | null
          webhook_url?: string | null
          website?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          block_height: number | null
          confirmations: number
          confirmed_at: string | null
          first_seen_at: string
          id: string
          invoice_id: string
          raw: Json | null
          tx_hash: string
        }
        Insert: {
          amount: number
          block_height?: number | null
          confirmations?: number
          confirmed_at?: string | null
          first_seen_at?: string
          id?: string
          invoice_id: string
          raw?: Json | null
          tx_hash: string
        }
        Update: {
          amount?: number
          block_height?: number | null
          confirmations?: number
          confirmed_at?: string | null
          first_seen_at?: string
          id?: string
          invoice_id?: string
          raw?: Json | null
          tx_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt: number
          created_at: string
          delivered_at: string | null
          id: string
          invoice_id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          signature: string
          status_code: number | null
          url: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          id?: string
          invoice_id: string
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          signature: string
          status_code?: number | null
          url: string
        }
        Update: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          id?: string
          invoice_id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          signature?: string
          status_code?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_store: { Args: { _store_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "merchant"
      chain_kind: "btc" | "eth" | "base" | "txc" | "doge" | "isk" | "zcu"
      invoice_status:
        | "pending"
        | "detected"
        | "confirmed"
        | "underpaid"
        | "overpaid"
        | "expired"
        | "cancelled"
        | "failed"
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
  public: {
    Enums: {
      app_role: ["admin", "merchant"],
      chain_kind: ["btc", "eth", "base", "txc", "doge", "isk", "zcu"],
      invoice_status: [
        "pending",
        "detected",
        "confirmed",
        "underpaid",
        "overpaid",
        "expired",
        "cancelled",
        "failed",
      ],
    },
  },
} as const
