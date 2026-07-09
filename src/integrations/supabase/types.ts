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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      invoice_tap_nonces: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          invoice_id: string
          nonce: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          invoice_id: string
          nonce: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invoice_id?: string
          nonce?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_tap_nonces_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
      leads: {
        Row: {
          admin_notes: string | null
          assignee: string | null
          created_at: string
          email: string
          id: string
          interest: string
          ip_address: string | null
          market: string
          message: string | null
          name: string
          source: string | null
          status: string
          telegram: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          admin_notes?: string | null
          assignee?: string | null
          created_at?: string
          email: string
          id?: string
          interest: string
          ip_address?: string | null
          market: string
          message?: string | null
          name: string
          source?: string | null
          status?: string
          telegram?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_notes?: string | null
          assignee?: string | null
          created_at?: string
          email?: string
          id?: string
          interest?: string
          ip_address?: string | null
          market?: string
          message?: string | null
          name?: string
          source?: string | null
          status?: string
          telegram?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      members_geo: {
        Row: {
          city: string | null
          country: string
          created_at: string
          id: number
          lat: number
          lng: number
          source: string | null
          state: string | null
          zip: string | null
        }
        Insert: {
          city?: string | null
          country?: string
          created_at?: string
          id?: number
          lat: number
          lng: number
          source?: string | null
          state?: string | null
          zip?: string | null
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string
          id?: number
          lat?: number
          lng?: number
          source?: string | null
          state?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      merchant_alerts: {
        Row: {
          country: string
          created_at: string
          email: string | null
          id: string
          lat: number | null
          lng: number | null
          postal_code: string
          radius_miles: number
          status: string
          telegram: string | null
        }
        Insert: {
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          postal_code: string
          radius_miles?: number
          status?: string
          telegram?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          postal_code?: string
          radius_miles?: number
          status?: string
          telegram?: string | null
        }
        Relationships: []
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
      pos_releases: {
        Row: {
          apk_path: string
          created_at: string
          id: string
          notes: string | null
          published_at: string
          sha256: string
          version: string
        }
        Insert: {
          apk_path: string
          created_at?: string
          id?: string
          notes?: string | null
          published_at?: string
          sha256: string
          version: string
        }
        Update: {
          apk_path?: string
          created_at?: string
          id?: string
          notes?: string | null
          published_at?: string
          sha256?: string
          version?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          onboarding_completed_at: string | null
          onboarding_step: string | null
          terminal_order_clicked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          terminal_order_clicked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          terminal_order_clicked_at?: string | null
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
          admin_market: string | null
          admin_notes: string | null
          admin_rep: string | null
          business_address: string | null
          business_category: string | null
          business_city: string | null
          business_country: string | null
          business_description: string | null
          business_lat: number | null
          business_lng: number | null
          business_logo_url: string | null
          business_region: string | null
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
          listing_visibility: string
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
          pos_tip_presets_bps: number[]
          pos_void_enabled: boolean
          preferred_evm_chain: string
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
          usdc_payout_address_eth: string | null
          webhook_secret: string | null
          webhook_secret_hash: string | null
          webhook_url: string | null
          website: string | null
        }
        Insert: {
          admin_market?: string | null
          admin_notes?: string | null
          admin_rep?: string | null
          business_address?: string | null
          business_category?: string | null
          business_city?: string | null
          business_country?: string | null
          business_description?: string | null
          business_lat?: number | null
          business_lng?: number | null
          business_logo_url?: string | null
          business_region?: string | null
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
          listing_visibility?: string
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
          pos_tip_presets_bps?: number[]
          pos_void_enabled?: boolean
          preferred_evm_chain?: string
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
          usdc_payout_address_eth?: string | null
          webhook_secret?: string | null
          webhook_secret_hash?: string | null
          webhook_url?: string | null
          website?: string | null
        }
        Update: {
          admin_market?: string | null
          admin_notes?: string | null
          admin_rep?: string | null
          business_address?: string | null
          business_category?: string | null
          business_city?: string | null
          business_country?: string | null
          business_description?: string | null
          business_lat?: number | null
          business_lng?: number | null
          business_logo_url?: string | null
          business_region?: string | null
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
          listing_visibility?: string
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
          pos_tip_presets_bps?: number[]
          pos_void_enabled?: boolean
          preferred_evm_chain?: string
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
          usdc_payout_address_eth?: string | null
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
          chosen_plan_at: string | null
          chosen_plan_id: string | null
          chosen_plan_source: string | null
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
          terminal_kit_ordered_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          chosen_plan_at?: string | null
          chosen_plan_id?: string | null
          chosen_plan_source?: string | null
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
          terminal_kit_ordered_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          chosen_plan_at?: string | null
          chosen_plan_id?: string | null
          chosen_plan_source?: string | null
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
          terminal_kit_ordered_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_chosen_plan_id_fkey"
            columns: ["chosen_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tangem_pay_intents: {
        Row: {
          amount_usdc_units: number
          broadcast_tx_hash: string | null
          card_address: string
          card_id: string | null
          card_public_key: string
          chain_id: number
          created_at: string
          error_message: string | null
          expires_at: string
          id: string
          invoice_id: string
          merchant_payout_address: string
          onchain_nonce: number
          signature_hex: string | null
          signed_raw_tx: string | null
          status: Database["public"]["Enums"]["tangem_pay_intent_status"]
          store_id: string
          tx_hash_to_sign: string
          unsigned_tx_json: Json
          updated_at: string
          usdc_contract: string
        }
        Insert: {
          amount_usdc_units: number
          broadcast_tx_hash?: string | null
          card_address: string
          card_id?: string | null
          card_public_key: string
          chain_id?: number
          created_at?: string
          error_message?: string | null
          expires_at?: string
          id?: string
          invoice_id: string
          merchant_payout_address: string
          onchain_nonce: number
          signature_hex?: string | null
          signed_raw_tx?: string | null
          status?: Database["public"]["Enums"]["tangem_pay_intent_status"]
          store_id: string
          tx_hash_to_sign: string
          unsigned_tx_json: Json
          updated_at?: string
          usdc_contract: string
        }
        Update: {
          amount_usdc_units?: number
          broadcast_tx_hash?: string | null
          card_address?: string
          card_id?: string | null
          card_public_key?: string
          chain_id?: number
          created_at?: string
          error_message?: string | null
          expires_at?: string
          id?: string
          invoice_id?: string
          merchant_payout_address?: string
          onchain_nonce?: number
          signature_hex?: string | null
          signed_raw_tx?: string | null
          status?: Database["public"]["Enums"]["tangem_pay_intent_status"]
          store_id?: string
          tx_hash_to_sign?: string
          unsigned_tx_json?: Json
          updated_at?: string
          usdc_contract?: string
        }
        Relationships: [
          {
            foreignKeyName: "tangem_pay_intents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tangem_pay_intents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
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
          geoip_updated_at: string | null
          hmac_secret_hash: string
          id: string
          label: string
          last_seen_at: string | null
          last_seen_city: string | null
          last_seen_country: string | null
          last_seen_ip: unknown
          last_seen_lat: number | null
          last_seen_lng: number | null
          revoked_at: string | null
          store_id: string
        }
        Insert: {
          created_at?: string
          geoip_updated_at?: string | null
          hmac_secret_hash: string
          id?: string
          label?: string
          last_seen_at?: string | null
          last_seen_city?: string | null
          last_seen_country?: string | null
          last_seen_ip?: unknown
          last_seen_lat?: number | null
          last_seen_lng?: number | null
          revoked_at?: string | null
          store_id: string
        }
        Update: {
          created_at?: string
          geoip_updated_at?: string | null
          hmac_secret_hash?: string
          id?: string
          label?: string
          last_seen_at?: string | null
          last_seen_city?: string | null
          last_seen_country?: string | null
          last_seen_ip?: unknown
          last_seen_lat?: number | null
          last_seen_lng?: number | null
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
          allow_new_wallet: boolean
          code_hash: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          store_id: string
          used_at: string | null
        }
        Insert: {
          allow_new_wallet?: boolean
          code_hash: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          store_id: string
          used_at?: string | null
        }
        Update: {
          allow_new_wallet?: boolean
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_merchant_map_pins: {
        Args: never
        Returns: {
          address: string
          category: string
          city: string
          country: string
          description: string
          lat: number
          listing_visibility: string
          lng: number
          logo_url: string
          name: string
          store_id: string
          website: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_subscription_active: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_txc_deposit_index: { Args: never; Returns: number }
      owns_store: { Args: { _store_id: string }; Returns: boolean }
      purge_expired_wallet_challenges: { Args: never; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
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
      tangem_pay_intent_status:
        | "pending"
        | "signed"
        | "broadcast"
        | "confirmed"
        | "failed"
        | "expired"
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
      tangem_pay_intent_status: [
        "pending",
        "signed",
        "broadcast",
        "confirmed",
        "failed",
        "expired",
      ],
      wallet_challenge_status: ["pending", "signed", "consumed", "expired"],
    },
  },
} as const
