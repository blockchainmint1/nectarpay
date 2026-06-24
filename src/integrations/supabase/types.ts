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
      alchemy_webhooks: {
        Row: {
          callback_url: string
          chain: string
          created_at: string
          signing_key: string
          updated_at: string
          webhook_id: string
        }
        Insert: {
          callback_url: string
          chain: string
          created_at?: string
          signing_key: string
          updated_at?: string
          webhook_id: string
        }
        Update: {
          callback_url?: string
          chain?: string
          created_at?: string
          signing_key?: string
          updated_at?: string
          webhook_id?: string
        }
        Relationships: []
      }
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
      chain_config_audit: {
        Row: {
          action: string
          chain: Database["public"]["Enums"]["chain_kind"]
          created_at: string
          id: string
          new_xpub: string | null
          new_xpub_or_address: string | null
          notified_at: string | null
          old_xpub: string | null
          old_xpub_or_address: string | null
          source: string | null
          store_id: string
        }
        Insert: {
          action: string
          chain: Database["public"]["Enums"]["chain_kind"]
          created_at?: string
          id?: string
          new_xpub?: string | null
          new_xpub_or_address?: string | null
          notified_at?: string | null
          old_xpub?: string | null
          old_xpub_or_address?: string | null
          source?: string | null
          store_id: string
        }
        Update: {
          action?: string
          chain?: Database["public"]["Enums"]["chain_kind"]
          created_at?: string
          id?: string
          new_xpub?: string | null
          new_xpub_or_address?: string | null
          notified_at?: string | null
          old_xpub?: string | null
          old_xpub_or_address?: string | null
          source?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_config_audit_store_id_fkey"
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
          created_at: string
          derivation_path: string | null
          display_order: number
          enabled: boolean
          id: string
          network: string
          next_address_index: number
          next_derivation_index: number
          qr_address_only: boolean
          stables: string[]
          store_id: string
          updated_at: string
          xpub: string | null
          xpub_or_address: string
        }
        Insert: {
          chain: Database["public"]["Enums"]["chain_kind"]
          created_at?: string
          derivation_path?: string | null
          display_order?: number
          enabled?: boolean
          id?: string
          network?: string
          next_address_index?: number
          next_derivation_index?: number
          qr_address_only?: boolean
          stables?: string[]
          store_id: string
          updated_at?: string
          xpub?: string | null
          xpub_or_address: string
        }
        Update: {
          chain?: Database["public"]["Enums"]["chain_kind"]
          created_at?: string
          derivation_path?: string | null
          display_order?: number
          enabled?: boolean
          id?: string
          network?: string
          next_address_index?: number
          next_derivation_index?: number
          qr_address_only?: boolean
          stables?: string[]
          store_id?: string
          updated_at?: string
          xpub?: string | null
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
      derived_addresses: {
        Row: {
          address: string
          address_index: number
          chain_config_id: string
          created_at: string
          id: string
          store_id: string
        }
        Insert: {
          address: string
          address_index: number
          chain_config_id: string
          created_at?: string
          id?: string
          store_id: string
        }
        Update: {
          address?: string
          address_index?: number
          chain_config_id?: string
          created_at?: string
          id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "derived_addresses_chain_config_id_fkey"
            columns: ["chain_config_id"]
            isOneToOne: false
            referencedRelation: "chain_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "derived_addresses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          address: string | null
          address_index: number | null
          buyer_email: string | null
          chain: Database["public"]["Enums"]["chain_kind"] | null
          created_at: string
          crypto_amount: number | null
          customer_email: string | null
          derivation_index: number | null
          description: string | null
          expires_at: string
          external_order_id: string | null
          fiat_amount: number
          fiat_currency: string
          id: string
          kyc_level_override: Database["public"]["Enums"]["kyc_level"] | null
          kyc_reference: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          rate: number | null
          redirect_url: string | null
          signature_data_url: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          store_id: string
          token_symbol: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_index?: number | null
          buyer_email?: string | null
          chain?: Database["public"]["Enums"]["chain_kind"] | null
          created_at?: string
          crypto_amount?: number | null
          customer_email?: string | null
          derivation_index?: number | null
          description?: string | null
          expires_at: string
          external_order_id?: string | null
          fiat_amount: number
          fiat_currency: string
          id?: string
          kyc_level_override?: Database["public"]["Enums"]["kyc_level"] | null
          kyc_reference?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          rate?: number | null
          redirect_url?: string | null
          signature_data_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          store_id: string
          token_symbol?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_index?: number | null
          buyer_email?: string | null
          chain?: Database["public"]["Enums"]["chain_kind"] | null
          created_at?: string
          crypto_amount?: number | null
          customer_email?: string | null
          derivation_index?: number | null
          description?: string | null
          expires_at?: string
          external_order_id?: string | null
          fiat_amount?: number
          fiat_currency?: string
          id?: string
          kyc_level_override?: Database["public"]["Enums"]["kyc_level"] | null
          kyc_reference?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          rate?: number | null
          redirect_url?: string | null
          signature_data_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          store_id?: string
          token_symbol?: string | null
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
      kyc_verifications: {
        Row: {
          country_code: string | null
          created_at: string
          email_verified: boolean | null
          id: string
          invoice_id: string
          ip_blocked: boolean | null
          level: Database["public"]["Enums"]["kyc_level"]
          notes: string | null
          provider: Database["public"]["Enums"]["kyc_provider"]
          reference: string | null
          risk_label: string | null
          risk_score: number | null
          sanctions_flag: boolean | null
          status: Database["public"]["Enums"]["kyc_status"]
          updated_at: string
          wallet_address: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          email_verified?: boolean | null
          id?: string
          invoice_id: string
          ip_blocked?: boolean | null
          level: Database["public"]["Enums"]["kyc_level"]
          notes?: string | null
          provider?: Database["public"]["Enums"]["kyc_provider"]
          reference?: string | null
          risk_label?: string | null
          risk_score?: number | null
          sanctions_flag?: boolean | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          wallet_address?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          email_verified?: boolean | null
          id?: string
          invoice_id?: string
          ip_blocked?: boolean | null
          level?: Database["public"]["Enums"]["kyc_level"]
          notes?: string | null
          provider?: Database["public"]["Enums"]["kyc_provider"]
          reference?: string | null
          risk_label?: string | null
          risk_score?: number | null
          sanctions_flag?: boolean | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_verifications_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          error: string | null
          event: string
          id: string
          metadata: Json | null
          recipient: string
          status: string
          subject: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string
          error?: string | null
          event: string
          id?: string
          metadata?: Json | null
          recipient: string
          status?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          error?: string | null
          event?: string
          id?: string
          metadata?: Json | null
          recipient?: string
          status?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          created_at: string
          email_address: string | null
          email_enabled: boolean
          events: Json
          telegram_chat_id: string | null
          telegram_enabled: boolean
          telegram_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean
          events?: Json
          telegram_chat_id?: string | null
          telegram_enabled?: boolean
          telegram_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean
          events?: Json
          telegram_chat_id?: string | null
          telegram_enabled?: boolean
          telegram_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          features: Json
          id: string
          invoice_limit: number | null
          monthly_price_usd: number
          name: string
          sort_order: number
          volume_limit_usd: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          features?: Json
          id: string
          invoice_limit?: number | null
          monthly_price_usd?: number
          name: string
          sort_order?: number
          volume_limit_usd?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          features?: Json
          id?: string
          invoice_limit?: number | null
          monthly_price_usd?: number
          name?: string
          sort_order?: number
          volume_limit_usd?: number | null
        }
        Relationships: []
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
          default_allowed_chains: string[] | null
          default_confirmations_required: number
          default_display_currency: string | null
          ext_ref_label: string | null
          ext_ref_mode: string
          ext_ref_required: boolean
          ext_ref_scan_mode: boolean
          fiat_currency: string
          id: string
          invoice_ttl_seconds: number
          kyc_advanced_api_key: string | null
          kyc_advanced_app_token: string | null
          kyc_advanced_provider: Database["public"]["Enums"]["kyc_provider"]
          kyc_basic_checks: string[]
          kyc_basic_require_email: boolean
          kyc_level: Database["public"]["Enums"]["kyc_level"]
          kyc_threshold_usd: number | null
          mempool_accept_fast: boolean
          mempool_accept_slow: boolean
          mempool_max_usd: number | null
          name: string
          owner_id: string
          pos_custom_tenders: Json
          pos_email_receipt_enabled: boolean
          pos_eod_enabled: boolean
          pos_hold_enabled: boolean
          pos_other_tender_enabled: boolean
          pos_quick_items: Json
          pos_refund_enabled: boolean
          pos_refund_reasons: string[]
          pos_require_cashier_pin: boolean
          pos_signature_enabled: boolean
          pos_tip_enabled: boolean
          pos_void_enabled: boolean
          receipt_address: string | null
          receipt_business_name: string | null
          receipt_email_enabled: boolean
          receipt_footer: string | null
          receipt_logo_url: string | null
          receipt_reprint_enabled: boolean
          receipt_sms_enabled: boolean
          receipt_tax_id: string | null
          tax_bps: number
          tax_mode: string
          updated_at: string
          webhook_secret: string | null
          webhook_secret_hash: string | null
          webhook_url: string | null
          website: string | null
        }
        Insert: {
          created_at?: string
          default_allowed_chains?: string[] | null
          default_confirmations_required?: number
          default_display_currency?: string | null
          ext_ref_label?: string | null
          ext_ref_mode?: string
          ext_ref_required?: boolean
          ext_ref_scan_mode?: boolean
          fiat_currency?: string
          id?: string
          invoice_ttl_seconds?: number
          kyc_advanced_api_key?: string | null
          kyc_advanced_app_token?: string | null
          kyc_advanced_provider?: Database["public"]["Enums"]["kyc_provider"]
          kyc_basic_checks?: string[]
          kyc_basic_require_email?: boolean
          kyc_level?: Database["public"]["Enums"]["kyc_level"]
          kyc_threshold_usd?: number | null
          mempool_accept_fast?: boolean
          mempool_accept_slow?: boolean
          mempool_max_usd?: number | null
          name: string
          owner_id: string
          pos_custom_tenders?: Json
          pos_email_receipt_enabled?: boolean
          pos_eod_enabled?: boolean
          pos_hold_enabled?: boolean
          pos_other_tender_enabled?: boolean
          pos_quick_items?: Json
          pos_refund_enabled?: boolean
          pos_refund_reasons?: string[]
          pos_require_cashier_pin?: boolean
          pos_signature_enabled?: boolean
          pos_tip_enabled?: boolean
          pos_void_enabled?: boolean
          receipt_address?: string | null
          receipt_business_name?: string | null
          receipt_email_enabled?: boolean
          receipt_footer?: string | null
          receipt_logo_url?: string | null
          receipt_reprint_enabled?: boolean
          receipt_sms_enabled?: boolean
          receipt_tax_id?: string | null
          tax_bps?: number
          tax_mode?: string
          updated_at?: string
          webhook_secret?: string | null
          webhook_secret_hash?: string | null
          webhook_url?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string
          default_allowed_chains?: string[] | null
          default_confirmations_required?: number
          default_display_currency?: string | null
          ext_ref_label?: string | null
          ext_ref_mode?: string
          ext_ref_required?: boolean
          ext_ref_scan_mode?: boolean
          fiat_currency?: string
          id?: string
          invoice_ttl_seconds?: number
          kyc_advanced_api_key?: string | null
          kyc_advanced_app_token?: string | null
          kyc_advanced_provider?: Database["public"]["Enums"]["kyc_provider"]
          kyc_basic_checks?: string[]
          kyc_basic_require_email?: boolean
          kyc_level?: Database["public"]["Enums"]["kyc_level"]
          kyc_threshold_usd?: number | null
          mempool_accept_fast?: boolean
          mempool_accept_slow?: boolean
          mempool_max_usd?: number | null
          name?: string
          owner_id?: string
          pos_custom_tenders?: Json
          pos_email_receipt_enabled?: boolean
          pos_eod_enabled?: boolean
          pos_hold_enabled?: boolean
          pos_other_tender_enabled?: boolean
          pos_quick_items?: Json
          pos_refund_enabled?: boolean
          pos_refund_reasons?: string[]
          pos_require_cashier_pin?: boolean
          pos_signature_enabled?: boolean
          pos_tip_enabled?: boolean
          pos_void_enabled?: boolean
          receipt_address?: string | null
          receipt_business_name?: string | null
          receipt_email_enabled?: boolean
          receipt_footer?: string | null
          receipt_logo_url?: string | null
          receipt_reprint_enabled?: boolean
          receipt_sms_enabled?: boolean
          receipt_tax_id?: string | null
          tax_bps?: number
          tax_mode?: string
          updated_at?: string
          webhook_secret?: string | null
          webhook_secret_hash?: string | null
          webhook_url?: string | null
          website?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          free_tier_metric: string | null
          free_tier_started_at: string
          grace_period_ends_at: string | null
          id: string
          last_charged_at: string | null
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          free_tier_metric?: string | null
          free_tier_started_at?: string
          grace_period_ends_at?: string | null
          id?: string
          last_charged_at?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          free_tier_metric?: string | null
          free_tier_started_at?: string
          grace_period_ends_at?: string | null
          id?: string
          last_charged_at?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_bind_codes: {
        Row: {
          code: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          user_id: string
        }
        Insert: {
          code: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          user_id: string
        }
        Update: {
          code?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          user_id?: string
        }
        Relationships: []
      }
      terminal_pairing_codes: {
        Row: {
          code: string
          consumed_at: string | null
          consumed_terminal_id: string | null
          created_at: string
          expires_at: string
          id: string
          label: string
          store_id: string
        }
        Insert: {
          code: string
          consumed_at?: string | null
          consumed_terminal_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          label?: string
          store_id: string
        }
        Update: {
          code?: string
          consumed_at?: string | null
          consumed_terminal_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          label?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "terminal_pairing_codes_consumed_terminal_id_fkey"
            columns: ["consumed_terminal_id"]
            isOneToOne: false
            referencedRelation: "terminals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terminal_pairing_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      terminals: {
        Row: {
          created_at: string
          hmac_secret_hash: string
          id: string
          label: string
          last_seen_at: string | null
          revoked_at: string | null
          store_id: string
        }
        Insert: {
          created_at?: string
          hmac_secret_hash: string
          id?: string
          label?: string
          last_seen_at?: string | null
          revoked_at?: string | null
          store_id: string
        }
        Update: {
          created_at?: string
          hmac_secret_hash?: string
          id?: string
          label?: string
          last_seen_at?: string | null
          revoked_at?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "terminals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
          token_symbol: string | null
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
          token_symbol?: string | null
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
          token_symbol?: string | null
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
      txc_credit_ledger: {
        Row: {
          amount_txc: number
          created_at: string
          id: string
          kind: string
          notes: string | null
          reference: string | null
          txc_usd_rate: number | null
          usd_value: number | null
          user_id: string
        }
        Insert: {
          amount_txc: number
          created_at?: string
          id?: string
          kind: string
          notes?: string | null
          reference?: string | null
          txc_usd_rate?: number | null
          usd_value?: number | null
          user_id: string
        }
        Update: {
          amount_txc?: number
          created_at?: string
          id?: string
          kind?: string
          notes?: string | null
          reference?: string | null
          txc_usd_rate?: number | null
          usd_value?: number | null
          user_id?: string
        }
        Relationships: []
      }
      txc_deposit_addresses: {
        Row: {
          address: string
          address_index: number | null
          created_at: string
          memo: string | null
          user_id: string
        }
        Insert: {
          address: string
          address_index?: number | null
          created_at?: string
          memo?: string | null
          user_id: string
        }
        Update: {
          address?: string
          address_index?: number | null
          created_at?: string
          memo?: string | null
          user_id?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          created_at: string
          id: string
          invoice_count: number
          period_end: string | null
          period_start: string
          updated_at: string
          user_id: string
          volume_usd: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_count?: number
          period_end?: string | null
          period_start: string
          updated_at?: string
          user_id: string
          volume_usd?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_count?: number
          period_end?: string | null
          period_start?: string
          updated_at?: string
          user_id?: string
          volume_usd?: number
        }
        Relationships: []
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
      wallet_accounts: {
        Row: {
          chain: string
          first_seen_at: string
          last_login_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          chain?: string
          first_seen_at?: string
          last_login_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          chain?: string
          first_seen_at?: string
          last_login_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      wallet_link_codes: {
        Row: {
          code_hash: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          store_id: string
          used_at: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          store_id: string
          used_at?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          store_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_link_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_login_challenges: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          nonce: string
          one_time_token: string | null
          signature: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["wallet_challenge_status"]
          user_agent: string | null
          wallet_address: string | null
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          nonce: string
          one_time_token?: string | null
          signature?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["wallet_challenge_status"]
          user_agent?: string | null
          wallet_address?: string | null
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          nonce?: string
          one_time_token?: string | null
          signature?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["wallet_challenge_status"]
          user_agent?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      watcher_cursors: {
        Row: {
          chain: string
          last_error: string | null
          last_height: number
          last_run_at: string
          last_status: string | null
          updated_at: string
        }
        Insert: {
          chain: string
          last_error?: string | null
          last_height?: number
          last_run_at?: string
          last_status?: string | null
          updated_at?: string
        }
        Update: {
          chain?: string
          last_error?: string | null
          last_height?: number
          last_run_at?: string
          last_status?: string | null
          updated_at?: string
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
      is_subscription_active: { Args: { _user_id: string }; Returns: boolean }
      next_txc_deposit_index: { Args: never; Returns: number }
      owns_store: { Args: { _store_id: string }; Returns: boolean }
      purge_expired_wallet_challenges: { Args: never; Returns: undefined }
      txc_balance: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "merchant"
      chain_kind:
        | "btc"
        | "eth"
        | "base"
        | "txc"
        | "doge"
        | "isk"
        | "zcu"
        | "tron"
        | "sol"
        | "bsc"
        | "ltc"
        | "bch"
      invoice_status:
        | "pending"
        | "detected"
        | "confirmed"
        | "underpaid"
        | "overpaid"
        | "expired"
        | "cancelled"
        | "failed"
      kyc_level: "none" | "basic" | "advanced"
      kyc_provider: "none" | "sumsub" | "persona" | "didit" | "veriff"
      kyc_status: "not_required" | "pending" | "passed" | "failed"
      wallet_challenge_status: "pending" | "signed" | "consumed" | "expired"
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
      chain_kind: [
        "btc",
        "eth",
        "base",
        "txc",
        "doge",
        "isk",
        "zcu",
        "tron",
        "sol",
        "bsc",
        "ltc",
        "bch",
      ],
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
      kyc_level: ["none", "basic", "advanced"],
      kyc_provider: ["none", "sumsub", "persona", "didit", "veriff"],
      kyc_status: ["not_required", "pending", "passed", "failed"],
      wallet_challenge_status: ["pending", "signed", "consumed", "expired"],
    },
  },
} as const
