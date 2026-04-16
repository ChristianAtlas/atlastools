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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ach_transactions: {
        Row: {
          amount_cents: number
          collection_date: string
          created_at: string
          created_by: string | null
          direction: string
          entity_id: string
          entity_label: string
          entity_type: string
          id: string
          internal_note: string | null
          nacha_generated_at: string | null
          settle_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          collection_date: string
          created_at?: string
          created_by?: string | null
          direction: string
          entity_id: string
          entity_label: string
          entity_type: string
          id?: string
          internal_note?: string | null
          nacha_generated_at?: string | null
          settle_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          collection_date?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          entity_id?: string
          entity_label?: string
          entity_type?: string
          id?: string
          internal_note?: string | null
          nacha_generated_at?: string | null
          settle_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          changed_fields: string[] | null
          company_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      billing_profiles: {
        Row: {
          account_hold: boolean | null
          ach_authorization_status: string | null
          backup_payment_method: string | null
          billing_contact_email: string | null
          billing_contact_name: string | null
          billing_emails: string[] | null
          collections_status: string | null
          company_id: string
          created_at: string
          credit_limit_cents: number | null
          current_ar_balance_cents: number | null
          default_payment_method: string | null
          id: string
          invoice_delivery_preference: string | null
          legal_billing_name: string | null
          monthly_service_charge_cents: number | null
          nsf_risk_status: string | null
          past_due_balance_cents: number | null
          sui_billing_method: string | null
          sui_markup_rate: number | null
          updated_at: string
          wire_required: boolean | null
          workers_comp_billing_method: string | null
          workers_comp_markup_rate: number | null
        }
        Insert: {
          account_hold?: boolean | null
          ach_authorization_status?: string | null
          backup_payment_method?: string | null
          billing_contact_email?: string | null
          billing_contact_name?: string | null
          billing_emails?: string[] | null
          collections_status?: string | null
          company_id: string
          created_at?: string
          credit_limit_cents?: number | null
          current_ar_balance_cents?: number | null
          default_payment_method?: string | null
          id?: string
          invoice_delivery_preference?: string | null
          legal_billing_name?: string | null
          monthly_service_charge_cents?: number | null
          nsf_risk_status?: string | null
          past_due_balance_cents?: number | null
          sui_billing_method?: string | null
          sui_markup_rate?: number | null
          updated_at?: string
          wire_required?: boolean | null
          workers_comp_billing_method?: string | null
          workers_comp_markup_rate?: number | null
        }
        Update: {
          account_hold?: boolean | null
          ach_authorization_status?: string | null
          backup_payment_method?: string | null
          billing_contact_email?: string | null
          billing_contact_name?: string | null
          billing_emails?: string[] | null
          collections_status?: string | null
          company_id?: string
          created_at?: string
          credit_limit_cents?: number | null
          current_ar_balance_cents?: number | null
          default_payment_method?: string | null
          id?: string
          invoice_delivery_preference?: string | null
          legal_billing_name?: string | null
          monthly_service_charge_cents?: number | null
          nsf_risk_status?: string | null
          past_due_balance_cents?: number | null
          sui_billing_method?: string | null
          sui_markup_rate?: number | null
          updated_at?: string
          wire_required?: boolean | null
          workers_comp_billing_method?: string | null
          workers_comp_markup_rate?: number | null
        }
        Relationships: []
      }
      client_earning_deduction_overrides: {
        Row: {
          company_id: string
          created_at: string
          display_label_override: string | null
          earning_deduction_type_id: string
          frequency_eligibility: string[] | null
          gl_code_override: string | null
          id: string
          is_enabled: boolean
          notes: string | null
          pay_run_types_override: string[] | null
          updated_at: string
          updated_by: string | null
          worker_type_override: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          display_label_override?: string | null
          earning_deduction_type_id: string
          frequency_eligibility?: string[] | null
          gl_code_override?: string | null
          id?: string
          is_enabled?: boolean
          notes?: string | null
          pay_run_types_override?: string[] | null
          updated_at?: string
          updated_by?: string | null
          worker_type_override?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          display_label_override?: string | null
          earning_deduction_type_id?: string
          frequency_eligibility?: string[] | null
          gl_code_override?: string | null
          id?: string
          is_enabled?: boolean
          notes?: string | null
          pay_run_types_override?: string[] | null
          updated_at?: string
          updated_by?: string | null
          worker_type_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_earning_deduction_overrid_earning_deduction_type_id_fkey"
            columns: ["earning_deduction_type_id"]
            isOneToOne: false
            referencedRelation: "earning_deduction_types"
            referencedColumns: ["id"]
          },
        ]
      }
      client_onboarding_wizards: {
        Row: {
          company_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          current_step: number
          id: string
          launched_at: string | null
          mode: string
          status: string
          updated_at: string
          wizard_data: Json
        }
        Insert: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          current_step?: number
          id?: string
          launched_at?: string | null
          mode?: string
          status?: string
          updated_at?: string
          wizard_data?: Json
        }
        Update: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          current_step?: number
          id?: string
          launched_at?: string | null
          mode?: string
          status?: string
          updated_at?: string
          wizard_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "client_onboarding_wizards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_setting_overrides: {
        Row: {
          company_id: string
          created_at: string
          id: string
          inherited: boolean
          override_value: Json
          setting_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          inherited?: boolean
          override_value?: Json
          setting_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          inherited?: boolean
          override_value?: Json
          setting_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_setting_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sui_rates: {
        Row: {
          account_number: string | null
          company_id: string
          created_at: string
          created_by: string | null
          effective_date: string
          end_date: string | null
          id: string
          notes: string | null
          rate: number
          rate_notice_path: string | null
          state_code: string
          updated_at: string
          uploaded_via: string | null
        }
        Insert: {
          account_number?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_date: string
          end_date?: string | null
          id?: string
          notes?: string | null
          rate: number
          rate_notice_path?: string | null
          state_code: string
          updated_at?: string
          uploaded_via?: string | null
        }
        Update: {
          account_number?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          rate?: number
          rate_notice_path?: string | null
          state_code?: string
          updated_at?: string
          uploaded_via?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_sui_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_recipients: {
        Row: {
          communication_id: string
          created_at: string
          delivery_status: string
          email: string
          entity_id: string
          entity_label: string
          entity_type: string
          id: string
        }
        Insert: {
          communication_id: string
          created_at?: string
          delivery_status?: string
          email: string
          entity_id: string
          entity_label: string
          entity_type: string
          id?: string
        }
        Update: {
          communication_id?: string
          created_at?: string
          delivery_status?: string
          email?: string
          entity_id?: string
          entity_label?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_recipients_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          attachments: Json | null
          audience_type: string
          body_html: string
          cancelled_at: string | null
          contact_type: string
          created_at: string
          created_by: string | null
          creator_name: string | null
          from_name: string
          id: string
          lock_minutes: number
          recipient_count: number
          reply_to: string | null
          scheduled_at: string | null
          segment_id: string | null
          segment_name: string | null
          selection_method: string
          sent_at: string | null
          status: string
          subject: string
          timezone: string
          updated_at: string
          upload_summary: Json | null
        }
        Insert: {
          attachments?: Json | null
          audience_type: string
          body_html?: string
          cancelled_at?: string | null
          contact_type?: string
          created_at?: string
          created_by?: string | null
          creator_name?: string | null
          from_name?: string
          id?: string
          lock_minutes?: number
          recipient_count?: number
          reply_to?: string | null
          scheduled_at?: string | null
          segment_id?: string | null
          segment_name?: string | null
          selection_method?: string
          sent_at?: string | null
          status?: string
          subject?: string
          timezone?: string
          updated_at?: string
          upload_summary?: Json | null
        }
        Update: {
          attachments?: Json | null
          audience_type?: string
          body_html?: string
          cancelled_at?: string | null
          contact_type?: string
          created_at?: string
          created_by?: string | null
          creator_name?: string | null
          from_name?: string
          id?: string
          lock_minutes?: number
          recipient_count?: number
          reply_to?: string | null
          scheduled_at?: string | null
          segment_id?: string | null
          segment_name?: string | null
          selection_method?: string
          sent_at?: string | null
          status?: string
          subject?: string
          timezone?: string
          updated_at?: string
          upload_summary?: Json | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          business_description: string | null
          cid: string
          city: string | null
          created_at: string
          date_of_incorporation: string | null
          dba_name: string | null
          deleted_at: string | null
          ein: string
          employee_count: number
          entity_type: string | null
          id: string
          is_demo: boolean
          legal_name: string | null
          mailing_address_line1: string | null
          mailing_address_line2: string | null
          mailing_city: string | null
          mailing_state: string | null
          mailing_zip: string | null
          naics_code: string | null
          name: string
          premier_date: string | null
          primary_contact_email: string | null
          primary_contact_name: string
          primary_contact_phone: string | null
          settings: Json
          state: string
          status: Database["public"]["Enums"]["company_status"]
          updated_at: string
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          business_description?: string | null
          cid?: string
          city?: string | null
          created_at?: string
          date_of_incorporation?: string | null
          dba_name?: string | null
          deleted_at?: string | null
          ein: string
          employee_count?: number
          entity_type?: string | null
          id?: string
          is_demo?: boolean
          legal_name?: string | null
          mailing_address_line1?: string | null
          mailing_address_line2?: string | null
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_zip?: string | null
          naics_code?: string | null
          name: string
          premier_date?: string | null
          primary_contact_email?: string | null
          primary_contact_name: string
          primary_contact_phone?: string | null
          settings?: Json
          state: string
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          business_description?: string | null
          cid?: string
          city?: string | null
          created_at?: string
          date_of_incorporation?: string | null
          dba_name?: string | null
          deleted_at?: string | null
          ein?: string
          employee_count?: number
          entity_type?: string | null
          id?: string
          is_demo?: boolean
          legal_name?: string | null
          mailing_address_line1?: string | null
          mailing_address_line2?: string | null
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_zip?: string | null
          naics_code?: string | null
          name?: string
          premier_date?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string
          primary_contact_phone?: string | null
          settings?: Json
          state?: string
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      company_addons: {
        Row: {
          company_plan_id: string
          created_at: string
          id: string
          quantity: number
          tier_id: string
        }
        Insert: {
          company_plan_id: string
          created_at?: string
          id?: string
          quantity?: number
          tier_id: string
        }
        Update: {
          company_plan_id?: string
          created_at?: string
          id?: string
          quantity?: number
          tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_addons_company_plan_id_fkey"
            columns: ["company_plan_id"]
            isOneToOne: false
            referencedRelation: "company_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addons_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      company_holidays: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          is_paid: boolean
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          is_paid?: boolean
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          is_paid?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          is_primary: boolean
          local_jurisdiction: string | null
          name: string
          state: string
          updated_at: string
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          local_jurisdiction?: string | null
          name: string
          state: string
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          local_jurisdiction?: string | null
          name?: string
          state?: string
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      company_plans: {
        Row: {
          company_id: string
          contractor_count: number
          created_at: string
          employee_count: number
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          contractor_count?: number
          created_at?: string
          employee_count?: number
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          contractor_count?: number
          created_at?: string
          employee_count?: number
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_plans_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      company_tax_accounts: {
        Row: {
          account_number: string | null
          company_id: string
          created_at: string
          effective_date: string | null
          end_date: string | null
          filing_frequency: string | null
          id: string
          notes: string | null
          registration_status: string
          state_code: string
          tax_type: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          company_id: string
          created_at?: string
          effective_date?: string | null
          end_date?: string | null
          filing_frequency?: string | null
          id?: string
          notes?: string | null
          registration_status?: string
          state_code: string
          tax_type: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          company_id?: string
          created_at?: string
          effective_date?: string | null
          end_date?: string | null
          filing_frequency?: string | null
          id?: string
          notes?: string | null
          registration_status?: string
          state_code?: string
          tax_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      compensation_records: {
        Row: {
          annual_salary_cents: number | null
          approved_by: string | null
          change_amount_cents: number | null
          change_percentage: number | null
          company_id: string
          created_at: string
          effective_date: string
          employee_id: string
          end_date: string | null
          hourly_rate_cents: number | null
          id: string
          notes: string | null
          overtime_eligible: boolean | null
          pay_frequency: Database["public"]["Enums"]["pay_frequency"]
          pay_type: Database["public"]["Enums"]["pay_type"]
          reason: Database["public"]["Enums"]["compensation_reason"]
          standard_hours: number | null
        }
        Insert: {
          annual_salary_cents?: number | null
          approved_by?: string | null
          change_amount_cents?: number | null
          change_percentage?: number | null
          company_id: string
          created_at?: string
          effective_date: string
          employee_id: string
          end_date?: string | null
          hourly_rate_cents?: number | null
          id?: string
          notes?: string | null
          overtime_eligible?: boolean | null
          pay_frequency?: Database["public"]["Enums"]["pay_frequency"]
          pay_type: Database["public"]["Enums"]["pay_type"]
          reason: Database["public"]["Enums"]["compensation_reason"]
          standard_hours?: number | null
        }
        Update: {
          annual_salary_cents?: number | null
          approved_by?: string | null
          change_amount_cents?: number | null
          change_percentage?: number | null
          company_id?: string
          created_at?: string
          effective_date?: string
          employee_id?: string
          end_date?: string | null
          hourly_rate_cents?: number | null
          id?: string
          notes?: string | null
          overtime_eligible?: boolean | null
          pay_frequency?: Database["public"]["Enums"]["pay_frequency"]
          pay_type?: Database["public"]["Enums"]["pay_type"]
          reason?: Database["public"]["Enums"]["compensation_reason"]
          standard_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compensation_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensation_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          company_id: string | null
          compliance_item_id: string | null
          compliance_license_id: string | null
          created_at: string
          due_date: string | null
          entity_id: string
          entity_type: string
          escalated: boolean | null
          escalated_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          company_id?: string | null
          compliance_item_id?: string | null
          compliance_license_id?: string | null
          created_at?: string
          due_date?: string | null
          entity_id: string
          entity_type: string
          escalated?: boolean | null
          escalated_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          company_id?: string | null
          compliance_item_id?: string | null
          compliance_license_id?: string | null
          created_at?: string
          due_date?: string | null
          entity_id?: string
          entity_type?: string
          escalated?: boolean | null
          escalated_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_alerts_compliance_item_id_fkey"
            columns: ["compliance_item_id"]
            isOneToOne: false
            referencedRelation: "compliance_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_alerts_compliance_license_id_fkey"
            columns: ["compliance_license_id"]
            isOneToOne: false
            referencedRelation: "compliance_licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_documents: {
        Row: {
          company_id: string | null
          compliance_item_id: string | null
          compliance_license_id: string | null
          created_at: string
          description: string | null
          document_type: string
          entity_id: string
          entity_type: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          uploaded_by: string
          uploaded_by_name: string | null
          version: number | null
        }
        Insert: {
          company_id?: string | null
          compliance_item_id?: string | null
          compliance_license_id?: string | null
          created_at?: string
          description?: string | null
          document_type: string
          entity_id: string
          entity_type: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          uploaded_by: string
          uploaded_by_name?: string | null
          version?: number | null
        }
        Update: {
          company_id?: string | null
          compliance_item_id?: string | null
          compliance_license_id?: string | null
          created_at?: string
          description?: string | null
          document_type?: string
          entity_id?: string
          entity_type?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          uploaded_by?: string
          uploaded_by_name?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_documents_compliance_item_id_fkey"
            columns: ["compliance_item_id"]
            isOneToOne: false
            referencedRelation: "compliance_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_documents_compliance_license_id_fkey"
            columns: ["compliance_license_id"]
            isOneToOne: false
            referencedRelation: "compliance_licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_items: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          blocker: boolean | null
          category: string
          company_id: string | null
          completed_at: string | null
          completed_by: string | null
          compliance_score: number | null
          created_at: string
          description: string | null
          due_date: string | null
          entity_id: string
          entity_type: string
          id: string
          is_recurring: boolean | null
          metadata: Json | null
          next_recurrence_date: string | null
          notes: string | null
          parent_item_id: string | null
          priority: string
          recurrence_interval: string | null
          risk_level: string | null
          state_code: string | null
          status: string
          subcategory: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          blocker?: boolean | null
          category?: string
          company_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          compliance_score?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_recurring?: boolean | null
          metadata?: Json | null
          next_recurrence_date?: string | null
          notes?: string | null
          parent_item_id?: string | null
          priority?: string
          recurrence_interval?: string | null
          risk_level?: string | null
          state_code?: string | null
          status?: string
          subcategory?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          blocker?: boolean | null
          category?: string
          company_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          compliance_score?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_recurring?: boolean | null
          metadata?: Json | null
          next_recurrence_date?: string | null
          notes?: string | null
          parent_item_id?: string | null
          priority?: string
          recurrence_interval?: string | null
          risk_level?: string | null
          state_code?: string | null
          status?: string
          subcategory?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "compliance_items"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_licenses: {
        Row: {
          account_number: string | null
          company_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          expiration_date: string | null
          filing_frequency: string | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          license_number: string | null
          license_type: string
          metadata: Json | null
          notes: string | null
          owner_id: string | null
          owner_name: string | null
          renewal_date: string | null
          renewal_status: string | null
          state_code: string | null
          status: string
          sui_rate: number | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          company_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          expiration_date?: string | null
          filing_frequency?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          license_number?: string | null
          license_type: string
          metadata?: Json | null
          notes?: string | null
          owner_id?: string | null
          owner_name?: string | null
          renewal_date?: string | null
          renewal_status?: string | null
          state_code?: string | null
          status?: string
          sui_rate?: number | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          company_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          expiration_date?: string | null
          filing_frequency?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          license_number?: string | null
          license_type?: string
          metadata?: Json | null
          notes?: string | null
          owner_id?: string | null
          owner_name?: string | null
          renewal_date?: string | null
          renewal_status?: string | null
          state_code?: string | null
          status?: string
          sui_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      earning_deduction_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          slug: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          slug: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      earning_deduction_types: {
        Row: {
          annual_limit_cents: number | null
          archived_at: string | null
          availability: string | null
          calculation_method: string | null
          catch_up_eligible: boolean | null
          catch_up_limit_cents: number | null
          category: string
          category_id: string | null
          code: string
          company_id: string | null
          created_at: string
          created_by: string | null
          deduction_side: string | null
          default_multiplier: number | null
          default_rate: number | null
          description: string | null
          garnishment_settings: Json | null
          gl_code: string | null
          goal_amount_cents: number | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          pay_behavior: string | null
          pay_run_types: string[] | null
          priority_order: number | null
          reporting_1099_type: string | null
          reporting_box_code: string | null
          reporting_box14_literal: string | null
          reporting_w2_box: string | null
          scope: string
          sort_order: number
          special_flags: string[] | null
          stop_at_goal: boolean | null
          subcategory: string
          tax_federal_income: boolean | null
          tax_futa: boolean | null
          tax_local: boolean | null
          tax_medicare: boolean | null
          tax_social_security: boolean | null
          tax_state_income: boolean | null
          tax_state_unemployment: boolean | null
          tax_treatment: string | null
          taxable: boolean
          updated_at: string
          used_by_clients_count: number | null
          worker_type: string | null
        }
        Insert: {
          annual_limit_cents?: number | null
          archived_at?: string | null
          availability?: string | null
          calculation_method?: string | null
          catch_up_eligible?: boolean | null
          catch_up_limit_cents?: number | null
          category: string
          category_id?: string | null
          code: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deduction_side?: string | null
          default_multiplier?: number | null
          default_rate?: number | null
          description?: string | null
          garnishment_settings?: Json | null
          gl_code?: string | null
          goal_amount_cents?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          pay_behavior?: string | null
          pay_run_types?: string[] | null
          priority_order?: number | null
          reporting_1099_type?: string | null
          reporting_box_code?: string | null
          reporting_box14_literal?: string | null
          reporting_w2_box?: string | null
          scope?: string
          sort_order?: number
          special_flags?: string[] | null
          stop_at_goal?: boolean | null
          subcategory?: string
          tax_federal_income?: boolean | null
          tax_futa?: boolean | null
          tax_local?: boolean | null
          tax_medicare?: boolean | null
          tax_social_security?: boolean | null
          tax_state_income?: boolean | null
          tax_state_unemployment?: boolean | null
          tax_treatment?: string | null
          taxable?: boolean
          updated_at?: string
          used_by_clients_count?: number | null
          worker_type?: string | null
        }
        Update: {
          annual_limit_cents?: number | null
          archived_at?: string | null
          availability?: string | null
          calculation_method?: string | null
          catch_up_eligible?: boolean | null
          catch_up_limit_cents?: number | null
          category?: string
          category_id?: string | null
          code?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deduction_side?: string | null
          default_multiplier?: number | null
          default_rate?: number | null
          description?: string | null
          garnishment_settings?: Json | null
          gl_code?: string | null
          goal_amount_cents?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          pay_behavior?: string | null
          pay_run_types?: string[] | null
          priority_order?: number | null
          reporting_1099_type?: string | null
          reporting_box_code?: string | null
          reporting_box14_literal?: string | null
          reporting_w2_box?: string | null
          scope?: string
          sort_order?: number
          special_flags?: string[] | null
          stop_at_goal?: boolean | null
          subcategory?: string
          tax_federal_income?: boolean | null
          tax_futa?: boolean | null
          tax_local?: boolean | null
          tax_medicare?: boolean | null
          tax_social_security?: boolean | null
          tax_state_income?: boolean | null
          tax_state_unemployment?: boolean | null
          tax_treatment?: string | null
          taxable?: boolean
          updated_at?: string
          used_by_clients_count?: number | null
          worker_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earning_deduction_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "earning_deduction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earning_deduction_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          address_type: string
          city: string
          created_at: string
          effective_date: string
          employee_id: string
          end_date: string | null
          id: string
          is_primary: boolean
          state: string
          updated_at: string
          zip: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          address_type: string
          city: string
          created_at?: string
          effective_date?: string
          employee_id: string
          end_date?: string | null
          id?: string
          is_primary?: boolean
          state: string
          updated_at?: string
          zip: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          address_type?: string
          city?: string
          created_at?: string
          effective_date?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          is_primary?: boolean
          state?: string
          updated_at?: string
          zip?: string
        }
        Relationships: []
      }
      employee_deductions: {
        Row: {
          amount_cents: number | null
          company_id: string
          created_at: string
          earning_deduction_type_id: string
          employee_id: string
          end_date: string | null
          id: string
          is_active: boolean
          notes: string | null
          percent: number | null
          start_date: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number | null
          company_id: string
          created_at?: string
          earning_deduction_type_id: string
          employee_id: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          percent?: number | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number | null
          company_id?: string
          created_at?: string
          earning_deduction_type_id?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          percent?: number | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_deductions_earning_deduction_type_id_fkey"
            columns: ["earning_deduction_type_id"]
            isOneToOne: false
            referencedRelation: "earning_deduction_types"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_direct_deposits: {
        Row: {
          account_last4: string | null
          account_number_encrypted: string
          account_type: string
          allocation_type: string
          allocation_value: number | null
          bank_name: string | null
          created_at: string
          employee_id: string
          id: string
          is_active: boolean
          priority: number
          routing_number: string
          updated_at: string
        }
        Insert: {
          account_last4?: string | null
          account_number_encrypted: string
          account_type: string
          allocation_type?: string
          allocation_value?: number | null
          bank_name?: string | null
          created_at?: string
          employee_id: string
          id?: string
          is_active?: boolean
          priority?: number
          routing_number: string
          updated_at?: string
        }
        Update: {
          account_last4?: string | null
          account_number_encrypted?: string
          account_type?: string
          allocation_type?: string
          allocation_value?: number | null
          bank_name?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          is_active?: boolean
          priority?: number
          routing_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_invitations: {
        Row: {
          activated_at: string | null
          company_id: string
          created_at: string
          email: string
          employee_id: string
          error_message: string | null
          full_name: string
          id: string
          invited_at: string | null
          invited_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          company_id: string
          created_at?: string
          email: string
          employee_id: string
          error_message?: string | null
          full_name: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          employee_id?: string
          error_message?: string | null
          full_name?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invitations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_wc_assignments: {
        Row: {
          company_id: string
          created_at: string
          effective_date: string
          employee_id: string
          end_date: string | null
          id: string
          is_active: boolean
          updated_at: string
          wc_code_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          effective_date?: string
          employee_id: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          wc_code_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          effective_date?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          wc_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_wc_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_wc_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_wc_assignments_wc_code_id_fkey"
            columns: ["wc_code_id"]
            isOneToOne: false
            referencedRelation: "workers_comp_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          annual_salary_cents: number | null
          avatar_url: string | null
          city: string | null
          company_id: string
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          department: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          gender: string | null
          hourly_rate_cents: number | null
          id: string
          is_demo: boolean
          last_name: string
          manager_id: string | null
          mid: string
          pay_frequency: Database["public"]["Enums"]["pay_frequency"]
          pay_type: Database["public"]["Enums"]["pay_type"]
          personal_email: string | null
          phone: string | null
          provider_employee_id: string | null
          ssn_encrypted: string | null
          start_date: string
          state: string | null
          status: Database["public"]["Enums"]["employee_status"]
          termination_date: string | null
          termination_reason: string | null
          title: string | null
          updated_at: string
          user_id: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          annual_salary_cents?: number | null
          avatar_url?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          department?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          gender?: string | null
          hourly_rate_cents?: number | null
          id?: string
          is_demo?: boolean
          last_name: string
          manager_id?: string | null
          mid?: string
          pay_frequency?: Database["public"]["Enums"]["pay_frequency"]
          pay_type?: Database["public"]["Enums"]["pay_type"]
          personal_email?: string | null
          phone?: string | null
          provider_employee_id?: string | null
          ssn_encrypted?: string | null
          start_date: string
          state?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          termination_reason?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          annual_salary_cents?: number | null
          avatar_url?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          gender?: string | null
          hourly_rate_cents?: number | null
          id?: string
          is_demo?: boolean
          last_name?: string
          manager_id?: string | null
          mid?: string
          pay_frequency?: Database["public"]["Enums"]["pay_frequency"]
          pay_type?: Database["public"]["Enums"]["pay_type"]
          personal_email?: string | null
          phone?: string | null
          provider_employee_id?: string | null
          ssn_encrypted?: string | null
          start_date?: string
          state?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          termination_reason?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_records: {
        Row: {
          action: Database["public"]["Enums"]["employment_action"]
          approved_by: string | null
          benefit_eligibility_class: string | null
          company_id: string
          created_at: string
          department: string | null
          effective_date: string
          employee_id: string
          employee_type: string | null
          end_date: string | null
          flsa_status: string | null
          hire_date: string | null
          id: string
          location_id: string | null
          manager_id: string | null
          notes: string | null
          original_hire_date: string | null
          pay_group_id: string | null
          reason: string | null
          rehire_date: string | null
          resident_state: string | null
          status: Database["public"]["Enums"]["employee_status"]
          termination_date: string | null
          termination_reason: string | null
          title: string
          work_state: string | null
          worker_type: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["employment_action"]
          approved_by?: string | null
          benefit_eligibility_class?: string | null
          company_id: string
          created_at?: string
          department?: string | null
          effective_date: string
          employee_id: string
          employee_type?: string | null
          end_date?: string | null
          flsa_status?: string | null
          hire_date?: string | null
          id?: string
          location_id?: string | null
          manager_id?: string | null
          notes?: string | null
          original_hire_date?: string | null
          pay_group_id?: string | null
          reason?: string | null
          rehire_date?: string | null
          resident_state?: string | null
          status: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          termination_reason?: string | null
          title: string
          work_state?: string | null
          worker_type?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["employment_action"]
          approved_by?: string | null
          benefit_eligibility_class?: string | null
          company_id?: string
          created_at?: string
          department?: string | null
          effective_date?: string
          employee_id?: string
          employee_type?: string | null
          end_date?: string | null
          flsa_status?: string | null
          hire_date?: string | null
          id?: string
          location_id?: string | null
          manager_id?: string | null
          notes?: string | null
          original_hire_date?: string | null
          pay_group_id?: string | null
          reason?: string | null
          rehire_date?: string | null
          resident_state?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          termination_reason?: string | null
          title?: string
          work_state?: string | null
          worker_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employment_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_records_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_records_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_records_pay_group_id_fkey"
            columns: ["pay_group_id"]
            isOneToOne: false
            referencedRelation: "pay_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_settings: {
        Row: {
          category: string
          created_at: string
          data_type: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          data_type?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          created_at?: string
          data_type?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      external_benefit_deductions: {
        Row: {
          carrier_name: string
          company_id: string
          created_at: string
          ee_deduction_cents: number
          employee_id: string
          er_contribution_cents: number
          er_verified: boolean
          id: string
          is_active: boolean
          plan_type: string
          updated_at: string
        }
        Insert: {
          carrier_name?: string
          company_id: string
          created_at?: string
          ee_deduction_cents?: number
          employee_id: string
          er_contribution_cents?: number
          er_verified?: boolean
          id?: string
          is_active?: boolean
          plan_type?: string
          updated_at?: string
        }
        Update: {
          carrier_name?: string
          company_id?: string
          created_at?: string
          ee_deduction_cents?: number
          employee_id?: string
          er_contribution_cents?: number
          er_verified?: boolean
          id?: string
          is_active?: boolean
          plan_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_benefit_deductions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_benefit_deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      form_8973_filings: {
        Row: {
          client_address_line1: string | null
          client_address_line2: string | null
          client_city: string | null
          client_contact_email: string | null
          client_contact_name: string | null
          client_contact_phone: string | null
          client_ein: string | null
          client_legal_name: string | null
          client_state: string | null
          client_zip: string | null
          company_id: string
          contract_begin_date: string
          contract_end_date: string | null
          cpeo_ein: string
          cpeo_name: string
          created_at: string
          created_by: string | null
          id: string
          irs_confirmation_number: string | null
          irs_response_date: string | null
          is_new_contract: boolean
          notes: string | null
          signature_requested_at: string | null
          signature_requested_by: string | null
          signed_at: string | null
          signer_name: string | null
          signer_title: string | null
          status: string
          submitted_to_irs_at: string | null
          updated_at: string
        }
        Insert: {
          client_address_line1?: string | null
          client_address_line2?: string | null
          client_city?: string | null
          client_contact_email?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          client_ein?: string | null
          client_legal_name?: string | null
          client_state?: string | null
          client_zip?: string | null
          company_id: string
          contract_begin_date: string
          contract_end_date?: string | null
          cpeo_ein?: string
          cpeo_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          irs_confirmation_number?: string | null
          irs_response_date?: string | null
          is_new_contract?: boolean
          notes?: string | null
          signature_requested_at?: string | null
          signature_requested_by?: string | null
          signed_at?: string | null
          signer_name?: string | null
          signer_title?: string | null
          status?: string
          submitted_to_irs_at?: string | null
          updated_at?: string
        }
        Update: {
          client_address_line1?: string | null
          client_address_line2?: string | null
          client_city?: string | null
          client_contact_email?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          client_ein?: string | null
          client_legal_name?: string | null
          client_state?: string | null
          client_zip?: string | null
          company_id?: string
          contract_begin_date?: string
          contract_end_date?: string | null
          cpeo_ein?: string
          cpeo_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          irs_confirmation_number?: string | null
          irs_response_date?: string | null
          is_new_contract?: boolean
          notes?: string | null
          signature_requested_at?: string | null
          signature_requested_by?: string | null
          signed_at?: string | null
          signer_name?: string | null
          signer_title?: string | null
          status?: string
          submitted_to_irs_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_8973_filings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_events: {
        Row: {
          amount_cents: number
          company_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          method: string
          notes: string | null
          payroll_run_id: string
          status: string
          updated_at: string
          wire_reference: string | null
        }
        Insert: {
          amount_cents?: number
          company_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          payroll_run_id: string
          status?: string
          updated_at?: string
          wire_reference?: string | null
        }
        Update: {
          amount_cents?: number
          company_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          payroll_run_id?: string
          status?: string
          updated_at?: string
          wire_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_events_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_notes: {
        Row: {
          author_id: string
          author_name: string
          author_role: string
          content: string
          created_at: string
          id: string
          jira_ref: string | null
          record_id: string
          record_type: string
        }
        Insert: {
          author_id: string
          author_name: string
          author_role: string
          content: string
          created_at?: string
          id?: string
          jira_ref?: string | null
          record_id: string
          record_type: string
        }
        Update: {
          author_id?: string
          author_name?: string
          author_role?: string
          content?: string
          created_at?: string
          id?: string
          jira_ref?: string | null
          record_id?: string
          record_type?: string
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string
          employee_id: string | null
          id: string
          invoice_id: string
          is_markup: boolean
          line_type: string | null
          markup_rate: number | null
          markup_type: string | null
          payroll_run_employee_id: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          tier_slug: string | null
          total_cents: number
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          description: string
          employee_id?: string | null
          id?: string
          invoice_id: string
          is_markup?: boolean
          line_type?: string | null
          markup_rate?: number | null
          markup_type?: string | null
          payroll_run_employee_id?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          tier_slug?: string | null
          total_cents: number
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          description?: string
          employee_id?: string | null
          id?: string
          invoice_id?: string
          is_markup?: boolean
          line_type?: string | null
          markup_rate?: number | null
          markup_type?: string | null
          payroll_run_employee_id?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          tier_slug?: string | null
          total_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          balance_due_cents: number
          billing_period_end: string | null
          billing_period_start: string | null
          billing_profile_id: string | null
          catch_up_cents: number | null
          catch_up_count: number | null
          company_id: string
          company_name: string
          created_at: string
          delivery_status: string | null
          due_date: string
          employee_count: number | null
          id: string
          invoice_number: string
          invoice_type: string
          issued_at: string | null
          markup_cents: number
          paid_amount_cents: number
          paid_at: string | null
          payroll_run_id: string | null
          period_end: string
          period_start: string
          sent_at: string | null
          status: string
          stripe_invoice_id: string | null
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          balance_due_cents?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          billing_profile_id?: string | null
          catch_up_cents?: number | null
          catch_up_count?: number | null
          company_id: string
          company_name: string
          created_at?: string
          delivery_status?: string | null
          due_date: string
          employee_count?: number | null
          id?: string
          invoice_number: string
          invoice_type?: string
          issued_at?: string | null
          markup_cents?: number
          paid_amount_cents?: number
          paid_at?: string | null
          payroll_run_id?: string | null
          period_end: string
          period_start: string
          sent_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          balance_due_cents?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          billing_profile_id?: string | null
          catch_up_cents?: number | null
          catch_up_count?: number | null
          company_id?: string
          company_name?: string
          created_at?: string
          delivery_status?: string | null
          due_date?: string
          employee_count?: number | null
          id?: string
          invoice_number?: string
          invoice_type?: string
          issued_at?: string | null
          markup_cents?: number
          paid_amount_cents?: number
          paid_at?: string | null
          payroll_run_id?: string | null
          period_end?: string
          period_start?: string
          sent_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      monthly_employee_billing: {
        Row: {
          billing_month: string
          catch_up_billed: boolean | null
          catch_up_invoice_id: string | null
          catch_up_needed: boolean | null
          charge_cents: number
          company_id: string
          created_at: string
          employee_id: string
          id: string
          invoice_id: string | null
          status: string
          tier_id: string | null
        }
        Insert: {
          billing_month: string
          catch_up_billed?: boolean | null
          catch_up_invoice_id?: string | null
          catch_up_needed?: boolean | null
          charge_cents?: number
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          invoice_id?: string | null
          status?: string
          tier_id?: string | null
        }
        Update: {
          billing_month?: string
          catch_up_billed?: boolean | null
          catch_up_invoice_id?: string | null
          catch_up_needed?: boolean | null
          charge_cents?: number
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          invoice_id?: string | null
          status?: string
          tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_employee_billing_catch_up_invoice_id_fkey"
            columns: ["catch_up_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_employee_billing_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_employee_billing_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      nsf_events: {
        Row: {
          account_hold_applied: boolean | null
          amount_cents: number
          client_notified_at: string | null
          company_id: string
          created_at: string
          escalated_at: string | null
          failure_code: string | null
          failure_type: string | null
          fee_cents: number
          id: string
          invoice_id: string | null
          max_retries: number | null
          notes: string | null
          owner_id: string | null
          owner_name: string | null
          required_resolution_method: string | null
          resolved_at: string | null
          retry_count: number | null
          retry_eligible: boolean | null
          retry_scheduled_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          account_hold_applied?: boolean | null
          amount_cents: number
          client_notified_at?: string | null
          company_id: string
          created_at?: string
          escalated_at?: string | null
          failure_code?: string | null
          failure_type?: string | null
          fee_cents?: number
          id?: string
          invoice_id?: string | null
          max_retries?: number | null
          notes?: string | null
          owner_id?: string | null
          owner_name?: string | null
          required_resolution_method?: string | null
          resolved_at?: string | null
          retry_count?: number | null
          retry_eligible?: boolean | null
          retry_scheduled_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          account_hold_applied?: boolean | null
          amount_cents?: number
          client_notified_at?: string | null
          company_id?: string
          created_at?: string
          escalated_at?: string | null
          failure_code?: string | null
          failure_type?: string | null
          fee_cents?: number
          id?: string
          invoice_id?: string | null
          max_retries?: number | null
          notes?: string | null
          owner_id?: string | null
          owner_name?: string | null
          required_resolution_method?: string | null
          resolved_at?: string | null
          retry_count?: number | null
          retry_eligible?: boolean | null
          retry_scheduled_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nsf_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_sessions: {
        Row: {
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          due_date: string | null
          employee_id: string
          id: string
          notes: string | null
          started_at: string | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          assigned_role: string
          category: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          notes: string | null
          session_id: string
          sort_order: number
          status: string
          template_item_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_role?: string
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          notes?: string | null
          session_id: string
          sort_order?: number
          status?: string
          template_item_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_role?: string
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          notes?: string | null
          session_id?: string
          sort_order?: number
          status?: string
          template_item_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "onboarding_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "onboarding_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_template_items: {
        Row: {
          assigned_role: string
          category: string
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          sort_order: number
          template_id: string
          title: string
        }
        Insert: {
          assigned_role?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          sort_order?: number
          template_id: string
          title: string
        }
        Update: {
          assigned_role?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          sort_order?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      pay_groups: {
        Row: {
          company_id: string
          created_at: string
          default_flag: boolean
          id: string
          is_active: boolean
          name: string
          pay_frequency: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          default_flag?: boolean
          id?: string
          is_active?: boolean
          name: string
          pay_frequency: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          default_flag?: boolean
          id?: string
          is_active?: boolean
          name?: string
          pay_frequency?: string
          updated_at?: string
        }
        Relationships: []
      }
      pay_schedules: {
        Row: {
          approval_deadline: string | null
          check_date: string
          created_at: string
          id: string
          pay_group_id: string
          period_end_date: string
          period_start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approval_deadline?: string | null
          check_date: string
          created_at?: string
          id?: string
          pay_group_id: string
          period_end_date: string
          period_start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approval_deadline?: string | null
          check_date?: string
          created_at?: string
          id?: string
          pay_group_id?: string
          period_end_date?: string
          period_start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_schedules_pay_group_id_fkey"
            columns: ["pay_group_id"]
            isOneToOne: false
            referencedRelation: "pay_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          amount_cents: number
          attempt_date: string
          company_id: string
          created_at: string
          id: string
          invoice_id: string
          method: string
          notes: string | null
          processor_response_code: string | null
          processor_response_message: string | null
          status: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_cents?: number
          attempt_date?: string
          company_id: string
          created_at?: string
          id?: string
          invoice_id: string
          method?: string
          notes?: string | null
          processor_response_code?: string | null
          processor_response_message?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_cents?: number
          attempt_date?: string
          company_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          processor_response_code?: string | null
          processor_response_message?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_markups: {
        Row: {
          created_at: string
          general_markup_cents: number
          general_markup_rate: number
          gross_wages_cents: number
          id: string
          invoice_id: string
          payroll_run_id: string
          sui_markup_cents: number
          sui_markup_rate: number
          total_markup_cents: number
        }
        Insert: {
          created_at?: string
          general_markup_cents: number
          general_markup_rate?: number
          gross_wages_cents: number
          id?: string
          invoice_id: string
          payroll_run_id: string
          sui_markup_cents: number
          sui_markup_rate?: number
          total_markup_cents: number
        }
        Update: {
          created_at?: string
          general_markup_cents?: number
          general_markup_rate?: number
          gross_wages_cents?: number
          id?: string
          invoice_id?: string
          payroll_run_id?: string
          sui_markup_cents?: number
          sui_markup_rate?: number
          total_markup_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_markups_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_run_employee_contributions: {
        Row: {
          amount_cents: number
          contribution_code: string
          created_at: string
          description: string | null
          earning_deduction_type_id: string | null
          id: string
          payroll_run_employee_id: string
        }
        Insert: {
          amount_cents?: number
          contribution_code: string
          created_at?: string
          description?: string | null
          earning_deduction_type_id?: string | null
          id?: string
          payroll_run_employee_id: string
        }
        Update: {
          amount_cents?: number
          contribution_code?: string
          created_at?: string
          description?: string | null
          earning_deduction_type_id?: string | null
          id?: string
          payroll_run_employee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_run_employee_contributio_earning_deduction_type_id_fkey"
            columns: ["earning_deduction_type_id"]
            isOneToOne: false
            referencedRelation: "earning_deduction_types"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_run_employee_deductions: {
        Row: {
          amount_cents: number
          created_at: string
          deduction_code: string
          description: string | null
          earning_deduction_type_id: string | null
          id: string
          payroll_run_employee_id: string
          pre_tax: boolean
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          deduction_code: string
          description?: string | null
          earning_deduction_type_id?: string | null
          id?: string
          payroll_run_employee_id: string
          pre_tax?: boolean
        }
        Update: {
          amount_cents?: number
          created_at?: string
          deduction_code?: string
          description?: string | null
          earning_deduction_type_id?: string | null
          id?: string
          payroll_run_employee_id?: string
          pre_tax?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payroll_run_employee_deductions_earning_deduction_type_id_fkey"
            columns: ["earning_deduction_type_id"]
            isOneToOne: false
            referencedRelation: "earning_deduction_types"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_run_employee_earnings: {
        Row: {
          amount_cents: number
          created_at: string
          description: string | null
          earning_code: string
          earning_deduction_type_id: string | null
          hours: number | null
          id: string
          payroll_run_employee_id: string
          rate_cents: number | null
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          description?: string | null
          earning_code: string
          earning_deduction_type_id?: string | null
          hours?: number | null
          id?: string
          payroll_run_employee_id: string
          rate_cents?: number | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string | null
          earning_code?: string
          earning_deduction_type_id?: string | null
          hours?: number | null
          id?: string
          payroll_run_employee_id?: string
          rate_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_run_employee_earnings_earning_deduction_type_id_fkey"
            columns: ["earning_deduction_type_id"]
            isOneToOne: false
            referencedRelation: "earning_deduction_types"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_run_employee_taxes: {
        Row: {
          amount_cents: number
          created_at: string
          ee_or_er: string
          id: string
          jurisdiction: string
          payroll_run_employee_id: string
          state_code: string | null
          tax_type: string
          taxable_wages_cents: number | null
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          ee_or_er?: string
          id?: string
          jurisdiction: string
          payroll_run_employee_id: string
          state_code?: string | null
          tax_type: string
          taxable_wages_cents?: number | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          ee_or_er?: string
          id?: string
          jurisdiction?: string
          payroll_run_employee_id?: string
          state_code?: string | null
          tax_type?: string
          taxable_wages_cents?: number | null
        }
        Relationships: []
      }
      payroll_run_employees: {
        Row: {
          benefits_deduction_cents: number
          bonus_cents: number
          commission_cents: number
          company_id: string
          created_at: string
          employee_id: string
          employer_benefits_cents: number
          employer_fica_cents: number
          employer_futa_cents: number
          employer_sui_cents: number
          federal_tax_cents: number
          garnishment_cents: number
          gross_pay_cents: number
          holiday_hours: number
          id: string
          local_tax_cents: number
          medicare_cents: number
          net_pay_cents: number
          notes: string | null
          other_deductions_cents: number
          other_earnings_cents: number
          overtime_hours: number
          overtime_pay_cents: number
          payroll_run_id: string
          provider_employee_id: string | null
          provider_line_id: string | null
          provider_status: string | null
          pto_hours: number
          regular_hours: number
          regular_pay_cents: number
          reimbursement_cents: number
          retirement_deduction_cents: number
          social_security_cents: number
          state_tax_cents: number
          status: Database["public"]["Enums"]["payroll_employee_status"]
          total_deductions_cents: number
          total_employer_cost_cents: number
          updated_at: string
          workers_comp_cents: number
        }
        Insert: {
          benefits_deduction_cents?: number
          bonus_cents?: number
          commission_cents?: number
          company_id: string
          created_at?: string
          employee_id: string
          employer_benefits_cents?: number
          employer_fica_cents?: number
          employer_futa_cents?: number
          employer_sui_cents?: number
          federal_tax_cents?: number
          garnishment_cents?: number
          gross_pay_cents?: number
          holiday_hours?: number
          id?: string
          local_tax_cents?: number
          medicare_cents?: number
          net_pay_cents?: number
          notes?: string | null
          other_deductions_cents?: number
          other_earnings_cents?: number
          overtime_hours?: number
          overtime_pay_cents?: number
          payroll_run_id: string
          provider_employee_id?: string | null
          provider_line_id?: string | null
          provider_status?: string | null
          pto_hours?: number
          regular_hours?: number
          regular_pay_cents?: number
          reimbursement_cents?: number
          retirement_deduction_cents?: number
          social_security_cents?: number
          state_tax_cents?: number
          status?: Database["public"]["Enums"]["payroll_employee_status"]
          total_deductions_cents?: number
          total_employer_cost_cents?: number
          updated_at?: string
          workers_comp_cents?: number
        }
        Update: {
          benefits_deduction_cents?: number
          bonus_cents?: number
          commission_cents?: number
          company_id?: string
          created_at?: string
          employee_id?: string
          employer_benefits_cents?: number
          employer_fica_cents?: number
          employer_futa_cents?: number
          employer_sui_cents?: number
          federal_tax_cents?: number
          garnishment_cents?: number
          gross_pay_cents?: number
          holiday_hours?: number
          id?: string
          local_tax_cents?: number
          medicare_cents?: number
          net_pay_cents?: number
          notes?: string | null
          other_deductions_cents?: number
          other_earnings_cents?: number
          overtime_hours?: number
          overtime_pay_cents?: number
          payroll_run_id?: string
          provider_employee_id?: string | null
          provider_line_id?: string | null
          provider_status?: string | null
          pto_hours?: number
          regular_hours?: number
          regular_pay_cents?: number
          reimbursement_cents?: number
          retirement_deduction_cents?: number
          social_security_cents?: number
          state_tax_cents?: number
          status?: Database["public"]["Enums"]["payroll_employee_status"]
          total_deductions_cents?: number
          total_employer_cost_cents?: number
          updated_at?: string
          workers_comp_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_run_employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_employees_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          admin_approved_at: string | null
          admin_approved_by: string | null
          approval_deadline: string | null
          auto_approved: boolean
          check_date: string | null
          client_approved_at: string | null
          client_approved_by: string | null
          company_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          employee_count: number
          employer_benefits_cents: number
          employer_taxes_cents: number
          exception_count: number
          expedited_deadline: string | null
          funding_status: string
          gross_pay_cents: number
          id: string
          invoice_status: string
          is_expedited: boolean
          is_manual_check: boolean
          manual_check_count: number
          net_pay_cents: number
          notes: string | null
          parent_run_id: string | null
          pay_date: string
          pay_frequency: Database["public"]["Enums"]["pay_frequency"]
          pay_period_end: string
          pay_period_start: string
          provider_batch_id: string | null
          provider_response: Json | null
          provider_status: string | null
          readiness_score: number
          run_type: Database["public"]["Enums"]["payroll_run_type"]
          status: Database["public"]["Enums"]["payroll_run_status"]
          submission_deadline: string | null
          submitted_at: string | null
          timecard_deadline: string | null
          total_employer_cost_cents: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          workers_comp_cents: number
        }
        Insert: {
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          approval_deadline?: string | null
          auto_approved?: boolean
          check_date?: string | null
          client_approved_at?: string | null
          client_approved_by?: string | null
          company_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          employee_count?: number
          employer_benefits_cents?: number
          employer_taxes_cents?: number
          exception_count?: number
          expedited_deadline?: string | null
          funding_status?: string
          gross_pay_cents?: number
          id?: string
          invoice_status?: string
          is_expedited?: boolean
          is_manual_check?: boolean
          manual_check_count?: number
          net_pay_cents?: number
          notes?: string | null
          parent_run_id?: string | null
          pay_date: string
          pay_frequency?: Database["public"]["Enums"]["pay_frequency"]
          pay_period_end: string
          pay_period_start: string
          provider_batch_id?: string | null
          provider_response?: Json | null
          provider_status?: string | null
          readiness_score?: number
          run_type?: Database["public"]["Enums"]["payroll_run_type"]
          status?: Database["public"]["Enums"]["payroll_run_status"]
          submission_deadline?: string | null
          submitted_at?: string | null
          timecard_deadline?: string | null
          total_employer_cost_cents?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          workers_comp_cents?: number
        }
        Update: {
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          approval_deadline?: string | null
          auto_approved?: boolean
          check_date?: string | null
          client_approved_at?: string | null
          client_approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          employee_count?: number
          employer_benefits_cents?: number
          employer_taxes_cents?: number
          exception_count?: number
          expedited_deadline?: string | null
          funding_status?: string
          gross_pay_cents?: number
          id?: string
          invoice_status?: string
          is_expedited?: boolean
          is_manual_check?: boolean
          manual_check_count?: number
          net_pay_cents?: number
          notes?: string | null
          parent_run_id?: string | null
          pay_date?: string
          pay_frequency?: Database["public"]["Enums"]["pay_frequency"]
          pay_period_end?: string
          pay_period_start?: string
          provider_batch_id?: string | null
          provider_response?: Json | null
          provider_status?: string | null
          readiness_score?: number
          run_type?: Database["public"]["Enums"]["payroll_run_type"]
          status?: Database["public"]["Enums"]["payroll_run_status"]
          submission_deadline?: string | null
          submitted_at?: string | null
          timecard_deadline?: string | null
          total_employer_cost_cents?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          workers_comp_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_parent_run_id_fkey"
            columns: ["parent_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_schedules: {
        Row: {
          approval_deadline_days_before: number | null
          approval_deadline_time: string | null
          auto_approve_enabled: boolean
          company_id: string
          created_at: string
          expedited_wire_deadline_day: string | null
          expedited_wire_deadline_time: string | null
          id: string
          is_active: boolean
          pay_frequency: Database["public"]["Enums"]["pay_frequency"]
          timecard_deadline_day: string | null
          timecard_deadline_time: string | null
          updated_at: string
        }
        Insert: {
          approval_deadline_days_before?: number | null
          approval_deadline_time?: string | null
          auto_approve_enabled?: boolean
          company_id: string
          created_at?: string
          expedited_wire_deadline_day?: string | null
          expedited_wire_deadline_time?: string | null
          id?: string
          is_active?: boolean
          pay_frequency: Database["public"]["Enums"]["pay_frequency"]
          timecard_deadline_day?: string | null
          timecard_deadline_time?: string | null
          updated_at?: string
        }
        Update: {
          approval_deadline_days_before?: number | null
          approval_deadline_time?: string | null
          auto_approve_enabled?: boolean
          company_id?: string
          created_at?: string
          expedited_wire_deadline_day?: string | null
          expedited_wire_deadline_time?: string | null
          id?: string
          is_active?: boolean
          pay_frequency?: Database["public"]["Enums"]["pay_frequency"]
          timecard_deadline_day?: string | null
          timecard_deadline_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      peo_sui_rates: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          end_date: string | null
          id: string
          notes: string | null
          rate: number
          state_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date: string
          end_date?: string | null
          id?: string
          notes?: string | null
          rate: number
          state_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          rate?: number
          state_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_tiers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_addon: boolean
          name: string
          per_employee: boolean
          slug: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_addon?: boolean
          name: string
          per_employee?: boolean
          slug: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_addon?: boolean
          name?: string
          per_employee?: boolean
          slug?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          unit_price_cents?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pto_balance_ledger: {
        Row: {
          balance_after: number
          company_id: string
          created_at: string
          created_by: string | null
          effective_date: string
          employee_id: string
          entry_type: Database["public"]["Enums"]["pto_ledger_type"]
          hours: number
          id: string
          notes: string | null
          policy_id: string
          reference_id: string | null
        }
        Insert: {
          balance_after: number
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          employee_id: string
          entry_type: Database["public"]["Enums"]["pto_ledger_type"]
          hours: number
          id?: string
          notes?: string | null
          policy_id: string
          reference_id?: string | null
        }
        Update: {
          balance_after?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          employee_id?: string
          entry_type?: Database["public"]["Enums"]["pto_ledger_type"]
          hours?: number
          id?: string
          notes?: string | null
          policy_id?: string
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pto_balance_ledger_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pto_balance_ledger_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pto_balance_ledger_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "pto_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      pto_policies: {
        Row: {
          accrual_frequency: Database["public"]["Enums"]["pto_accrual_frequency"]
          accrual_rate: number
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          max_accrual_hours: number
          max_carryover_hours: number
          name: string
          pto_type: Database["public"]["Enums"]["pto_type"]
          updated_at: string
          waiting_period_days: number
        }
        Insert: {
          accrual_frequency?: Database["public"]["Enums"]["pto_accrual_frequency"]
          accrual_rate?: number
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_accrual_hours?: number
          max_carryover_hours?: number
          name: string
          pto_type?: Database["public"]["Enums"]["pto_type"]
          updated_at?: string
          waiting_period_days?: number
        }
        Update: {
          accrual_frequency?: Database["public"]["Enums"]["pto_accrual_frequency"]
          accrual_rate?: number
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_accrual_hours?: number
          max_carryover_hours?: number
          name?: string
          pto_type?: Database["public"]["Enums"]["pto_type"]
          updated_at?: string
          waiting_period_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "pto_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pto_requests: {
        Row: {
          cancelled_at: string | null
          company_id: string
          created_at: string
          employee_id: string
          end_date: string
          hours: number
          id: string
          policy_id: string
          reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["pto_request_status"]
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          end_date: string
          hours: number
          id?: string
          policy_id: string
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["pto_request_status"]
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          end_date?: string
          hours?: number
          id?: string
          policy_id?: string
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["pto_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pto_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pto_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pto_requests_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "pto_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_segments: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          filters: Json
          id: string
          is_system: boolean
          name: string
          recipient_count_cache: number | null
          target_type: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          id?: string
          is_system?: boolean
          name: string
          recipient_count_cache?: number | null
          target_type: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          id?: string
          is_system?: boolean
          name?: string
          recipient_count_cache?: number | null
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      setting_audit_logs: {
        Row: {
          changed_by: string | null
          changed_by_email: string | null
          company_id: string | null
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          scope: string
          setting_key: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_email?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          scope?: string
          setting_key: string
        }
        Update: {
          changed_by?: string | null
          changed_by_email?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          scope?: string
          setting_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "setting_audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      state_sick_leave_rules: {
        Row: {
          accrual_per_hours_worked: number
          accrual_rate_hours: number
          carryover_allowed: boolean
          created_at: string
          effective_date: string | null
          id: string
          is_active: boolean
          law_name: string
          max_use_hours_per_year: number | null
          notes: string | null
          state_code: string
          state_name: string
          updated_at: string
        }
        Insert: {
          accrual_per_hours_worked?: number
          accrual_rate_hours?: number
          carryover_allowed?: boolean
          created_at?: string
          effective_date?: string | null
          id?: string
          is_active?: boolean
          law_name: string
          max_use_hours_per_year?: number | null
          notes?: string | null
          state_code: string
          state_name: string
          updated_at?: string
        }
        Update: {
          accrual_per_hours_worked?: number
          accrual_rate_hours?: number
          carryover_allowed?: boolean
          created_at?: string
          effective_date?: string | null
          id?: string
          is_active?: boolean
          law_name?: string
          max_use_hours_per_year?: number | null
          notes?: string | null
          state_code?: string
          state_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sui_adjustments: {
        Row: {
          adjustment_cents: number
          adjustment_type: string
          company_id: string
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          invoice_id: string | null
          new_rate: number
          notes: string | null
          old_rate: number
          period_end: string
          period_start: string
          state_code: string
          status: string
          taxable_wages_cents: number
          updated_at: string
        }
        Insert: {
          adjustment_cents?: number
          adjustment_type: string
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_date: string
          id?: string
          invoice_id?: string | null
          new_rate: number
          notes?: string | null
          old_rate: number
          period_end: string
          period_start: string
          state_code: string
          status?: string
          taxable_wages_cents?: number
          updated_at?: string
        }
        Update: {
          adjustment_cents?: number
          adjustment_type?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          invoice_id?: string | null
          new_rate?: number
          notes?: string | null
          old_rate?: number
          period_end?: string
          period_start?: string
          state_code?: string
          status?: string
          taxable_wages_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sui_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_policies: {
        Row: {
          accrual_method: string
          accrual_rate: number
          annual_accrual_cap_hours: number | null
          balance_cap_hours: number | null
          carryover_max_hours: number | null
          company_id: string
          created_at: string
          created_by: string | null
          custom_reset_date: string | null
          eligible_earning_codes: string[]
          id: string
          is_active: boolean
          name: string
          policy_type: string
          reset_schedule: string
          unused_hours_policy: string
          updated_at: string
          waiting_period_days: number
        }
        Insert: {
          accrual_method?: string
          accrual_rate?: number
          annual_accrual_cap_hours?: number | null
          balance_cap_hours?: number | null
          carryover_max_hours?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          custom_reset_date?: string | null
          eligible_earning_codes?: string[]
          id?: string
          is_active?: boolean
          name: string
          policy_type?: string
          reset_schedule?: string
          unused_hours_policy?: string
          updated_at?: string
          waiting_period_days?: number
        }
        Update: {
          accrual_method?: string
          accrual_rate?: number
          annual_accrual_cap_hours?: number | null
          balance_cap_hours?: number | null
          carryover_max_hours?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          custom_reset_date?: string | null
          eligible_earning_codes?: string[]
          id?: string
          is_active?: boolean
          name?: string
          policy_type?: string
          reset_schedule?: string
          unused_hours_policy?: string
          updated_at?: string
          waiting_period_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "time_off_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      timecards: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          employee_id: string
          holiday_hours: number
          id: string
          notes: string | null
          overtime_hours: number
          payroll_run_id: string
          pto_hours: number
          regular_hours: number
          submitted_at: string | null
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          holiday_hours?: number
          id?: string
          notes?: string | null
          overtime_hours?: number
          payroll_run_id: string
          pto_hours?: number
          regular_hours?: number
          submitted_at?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          holiday_hours?: number
          id?: string
          notes?: string | null
          overtime_hours?: number
          payroll_run_id?: string
          pto_hours?: number
          regular_hours?: number
          submitted_at?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timecards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timecards_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timecards_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      us_holidays: {
        Row: {
          created_at: string
          holiday_date: string
          id: string
          is_banking_holiday: boolean
          name: string
        }
        Insert: {
          created_at?: string
          holiday_date: string
          id?: string
          is_banking_holiday?: boolean
          name: string
        }
        Update: {
          created_at?: string
          holiday_date?: string
          id?: string
          is_banking_holiday?: boolean
          name?: string
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
      wc_code_rates: {
        Row: {
          created_at: string
          effective_date: string
          end_date: string | null
          id: string
          rate: number
          wc_code_id: string
        }
        Insert: {
          created_at?: string
          effective_date: string
          end_date?: string | null
          id?: string
          rate: number
          wc_code_id: string
        }
        Update: {
          created_at?: string
          effective_date?: string
          end_date?: string | null
          id?: string
          rate?: number
          wc_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wc_code_rates_wc_code_id_fkey"
            columns: ["wc_code_id"]
            isOneToOne: false
            referencedRelation: "wc_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_codes: {
        Row: {
          code: string
          created_at: string
          description: string
          hazard_group: string | null
          id: string
          state_code: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          hazard_group?: string | null
          id?: string
          state_code?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          hazard_group?: string | null
          id?: string
          state_code?: string | null
        }
        Relationships: []
      }
      wc_invoice_items: {
        Row: {
          base_premium_cents: number
          company_id: string
          created_at: string
          employee_count: number
          id: string
          invoice_id: string | null
          markup_cents: number
          payroll_run_id: string
          total_charge_cents: number
        }
        Insert: {
          base_premium_cents?: number
          company_id: string
          created_at?: string
          employee_count?: number
          id?: string
          invoice_id?: string | null
          markup_cents?: number
          payroll_run_id: string
          total_charge_cents?: number
        }
        Update: {
          base_premium_cents?: number
          company_id?: string
          created_at?: string
          employee_count?: number
          id?: string
          invoice_id?: string | null
          markup_cents?: number
          payroll_run_id?: string
          total_charge_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "wc_invoice_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_payroll_calculations: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string
          id: string
          markup_cents: number
          markup_rate: number
          payroll_run_id: string
          premium_cents: number
          rate_per_hundred: number
          total_charge_cents: number
          wages_cents: number
          wc_code: string
          wc_code_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          markup_cents?: number
          markup_rate?: number
          payroll_run_id: string
          premium_cents?: number
          rate_per_hundred?: number
          total_charge_cents?: number
          wages_cents?: number
          wc_code: string
          wc_code_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          markup_cents?: number
          markup_rate?: number
          payroll_run_id?: string
          premium_cents?: number
          rate_per_hundred?: number
          total_charge_cents?: number
          wages_cents?: number
          wc_code?: string
          wc_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wc_payroll_calculations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_payroll_calculations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_payroll_calculations_wc_code_id_fkey"
            columns: ["wc_code_id"]
            isOneToOne: false
            referencedRelation: "workers_comp_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_policies: {
        Row: {
          carrier: string
          company_id: string
          created_at: string
          effective_date: string
          expiration_date: string | null
          id: string
          is_active: boolean
          notes: string | null
          policy_number: string
          state_code: string
          updated_at: string
        }
        Insert: {
          carrier: string
          company_id: string
          created_at?: string
          effective_date: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          policy_number: string
          state_code: string
          updated_at?: string
        }
        Update: {
          carrier?: string
          company_id?: string
          created_at?: string
          effective_date?: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          policy_number?: string
          state_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      workers_comp_codes: {
        Row: {
          code: string
          company_id: string
          created_at: string
          description: string
          effective_date: string
          expiration_date: string | null
          id: string
          internal_markup_rate: number
          is_active: boolean
          policy_id: string
          rate_basis: string
          rate_per_hundred: number
          state: string
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          description: string
          effective_date: string
          expiration_date?: string | null
          id?: string
          internal_markup_rate?: number
          is_active?: boolean
          policy_id: string
          rate_basis?: string
          rate_per_hundred?: number
          state: string
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          description?: string
          effective_date?: string
          expiration_date?: string | null
          id?: string
          internal_markup_rate?: number
          is_active?: boolean
          policy_id?: string
          rate_basis?: string
          rate_per_hundred?: number
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_comp_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_comp_codes_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "workers_comp_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      workers_comp_policies: {
        Row: {
          carrier_name: string
          company_id: string
          created_at: string
          effective_date: string
          experience_mod: number
          expiration_date: string
          id: string
          is_monopolistic: boolean
          last_report_submitted_at: string | null
          markup_flat_cents: number | null
          markup_rate: number
          markup_type: string
          minimum_premium_cents: number | null
          notes: string | null
          policy_number: string
          reporting_frequency: string | null
          state_fund_account: string | null
          states_covered: string[]
          status: string
          updated_at: string
        }
        Insert: {
          carrier_name: string
          company_id: string
          created_at?: string
          effective_date: string
          experience_mod?: number
          expiration_date: string
          id?: string
          is_monopolistic?: boolean
          last_report_submitted_at?: string | null
          markup_flat_cents?: number | null
          markup_rate?: number
          markup_type?: string
          minimum_premium_cents?: number | null
          notes?: string | null
          policy_number: string
          reporting_frequency?: string | null
          state_fund_account?: string | null
          states_covered?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          carrier_name?: string
          company_id?: string
          created_at?: string
          effective_date?: string
          experience_mod?: number
          expiration_date?: string
          id?: string
          is_monopolistic?: boolean
          last_report_submitted_at?: string | null
          markup_flat_cents?: number | null
          markup_rate?: number
          markup_type?: string
          minimum_premium_cents?: number | null
          notes?: string | null
          policy_number?: string
          reporting_frequency?: string | null
          state_fund_account?: string | null
          states_covered?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_comp_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company: { Args: { _user_id: string }; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "client_admin" | "employee"
      company_status: "active" | "onboarding" | "suspended" | "terminated"
      compensation_reason:
        | "hire"
        | "annual_review"
        | "promotion"
        | "market_adjustment"
        | "correction"
        | "demotion"
        | "role_change"
      employee_status:
        | "active"
        | "onboarding"
        | "on_leave"
        | "terminated"
        | "suspended"
      employment_action:
        | "hire"
        | "promotion"
        | "transfer"
        | "demotion"
        | "title_change"
        | "department_change"
        | "rehire"
        | "termination"
        | "leave_start"
        | "leave_end"
      pay_frequency: "weekly" | "biweekly" | "semimonthly" | "monthly"
      pay_type: "salary" | "hourly"
      payroll_employee_status:
        | "pending"
        | "included"
        | "excluded"
        | "error"
        | "completed"
      payroll_run_status:
        | "draft"
        | "time_review"
        | "editing"
        | "preview"
        | "pending_client_approval"
        | "client_approved"
        | "funding"
        | "pending_admin_approval"
        | "admin_approved"
        | "submitting"
        | "submitted"
        | "processing"
        | "completed"
        | "failed"
        | "voided"
        | "reversed"
        | "upcoming"
        | "open"
        | "open_for_timecards"
        | "awaiting_timecard_approval"
        | "timecards_approved"
        | "awaiting_approval"
        | "auto_approved"
        | "late_submission"
        | "expedited_funding_required"
        | "expedited_processing"
        | "manual_check_required"
        | "funded"
        | "paid"
        | "blocked"
      payroll_run_type:
        | "regular"
        | "off_cycle"
        | "bonus"
        | "commission"
        | "reimbursement"
        | "correction"
      pto_accrual_frequency:
        | "per_pay_period"
        | "monthly"
        | "annually"
        | "upfront"
      pto_ledger_type:
        | "accrual"
        | "used"
        | "adjustment"
        | "carryover"
        | "forfeited"
        | "payout"
      pto_request_status:
        | "pending"
        | "approved"
        | "denied"
        | "cancelled"
        | "taken"
      pto_type:
        | "vacation"
        | "sick"
        | "personal"
        | "bereavement"
        | "jury_duty"
        | "holiday"
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
      app_role: ["super_admin", "client_admin", "employee"],
      company_status: ["active", "onboarding", "suspended", "terminated"],
      compensation_reason: [
        "hire",
        "annual_review",
        "promotion",
        "market_adjustment",
        "correction",
        "demotion",
        "role_change",
      ],
      employee_status: [
        "active",
        "onboarding",
        "on_leave",
        "terminated",
        "suspended",
      ],
      employment_action: [
        "hire",
        "promotion",
        "transfer",
        "demotion",
        "title_change",
        "department_change",
        "rehire",
        "termination",
        "leave_start",
        "leave_end",
      ],
      pay_frequency: ["weekly", "biweekly", "semimonthly", "monthly"],
      pay_type: ["salary", "hourly"],
      payroll_employee_status: [
        "pending",
        "included",
        "excluded",
        "error",
        "completed",
      ],
      payroll_run_status: [
        "draft",
        "time_review",
        "editing",
        "preview",
        "pending_client_approval",
        "client_approved",
        "funding",
        "pending_admin_approval",
        "admin_approved",
        "submitting",
        "submitted",
        "processing",
        "completed",
        "failed",
        "voided",
        "reversed",
        "upcoming",
        "open",
        "open_for_timecards",
        "awaiting_timecard_approval",
        "timecards_approved",
        "awaiting_approval",
        "auto_approved",
        "late_submission",
        "expedited_funding_required",
        "expedited_processing",
        "manual_check_required",
        "funded",
        "paid",
        "blocked",
      ],
      payroll_run_type: [
        "regular",
        "off_cycle",
        "bonus",
        "commission",
        "reimbursement",
        "correction",
      ],
      pto_accrual_frequency: [
        "per_pay_period",
        "monthly",
        "annually",
        "upfront",
      ],
      pto_ledger_type: [
        "accrual",
        "used",
        "adjustment",
        "carryover",
        "forfeited",
        "payout",
      ],
      pto_request_status: [
        "pending",
        "approved",
        "denied",
        "cancelled",
        "taken",
      ],
      pto_type: [
        "vacation",
        "sick",
        "personal",
        "bereavement",
        "jury_duty",
        "holiday",
      ],
    },
  },
} as const
