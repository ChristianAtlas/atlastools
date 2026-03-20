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
      invoice_line_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          is_markup: boolean
          markup_rate: number | null
          markup_type: string | null
          quantity: number
          tier_slug: string | null
          total_cents: number
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          is_markup?: boolean
          markup_rate?: number | null
          markup_type?: string | null
          quantity?: number
          tier_slug?: string | null
          total_cents: number
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          is_markup?: boolean
          markup_rate?: number | null
          markup_type?: string | null
          quantity?: number
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
          company_id: string
          company_name: string
          created_at: string
          due_date: string
          id: string
          invoice_number: string
          markup_cents: number
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          stripe_invoice_id: string | null
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          company_id: string
          company_name: string
          created_at?: string
          due_date: string
          id?: string
          invoice_number: string
          markup_cents?: number
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          stripe_invoice_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          company_name?: string
          created_at?: string
          due_date?: string
          id?: string
          invoice_number?: string
          markup_cents?: number
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          stripe_invoice_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      nsf_events: {
        Row: {
          amount_cents: number
          company_id: string
          created_at: string
          fee_cents: number
          id: string
          invoice_id: string | null
          notes: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          amount_cents: number
          company_id: string
          created_at?: string
          fee_cents?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          amount_cents?: number
          company_id?: string
          created_at?: string
          fee_cents?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          resolved_at?: string | null
          status?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
