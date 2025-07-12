export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      approval_requests: {
        Row: {
          amount: string
          created_at: string
          daterequested: string
          department: string
          description: string
          details: Json | null
          id: string
          priority: string
          requestedby: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: string
          created_at?: string
          daterequested: string
          department: string
          description: string
          details?: Json | null
          id?: string
          priority?: string
          requestedby: string
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: string
          created_at?: string
          daterequested?: string
          department?: string
          description?: string
          details?: Json | null
          id?: string
          priority?: string
          requestedby?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      coffee_records: {
        Row: {
          bags: number
          batch_number: string
          coffee_type: string
          created_at: string
          date: string
          id: string
          kilograms: number
          status: string
          supplier_id: string | null
          supplier_name: string
          updated_at: string
        }
        Insert: {
          bags: number
          batch_number: string
          coffee_type: string
          created_at?: string
          date: string
          id?: string
          kilograms: number
          status?: string
          supplier_id?: string | null
          supplier_name: string
          updated_at?: string
        }
        Update: {
          bags?: number
          batch_number?: string
          coffee_type?: string
          created_at?: string
          date?: string
          id?: string
          kilograms?: number
          status?: string
          supplier_id?: string | null
          supplier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coffee_records_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          created_at: string
          department: string
          email: string
          emergency_contact: string | null
          employee_id: string | null
          id: string
          join_date: string
          name: string
          permissions: string[]
          phone: string | null
          position: string
          role: string
          salary: number
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          department: string
          email: string
          emergency_contact?: string | null
          employee_id?: string | null
          id?: string
          join_date?: string
          name: string
          permissions?: string[]
          phone?: string | null
          position: string
          role?: string
          salary?: number
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          department?: string
          email?: string
          emergency_contact?: string | null
          employee_id?: string | null
          id?: string
          join_date?: string
          name?: string
          permissions?: string[]
          phone?: string | null
          position?: string
          role?: string
          salary?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      metrics: {
        Row: {
          category: string | null
          change_percentage: number | null
          color: string | null
          created_at: string
          date_recorded: string
          icon: string | null
          id: string
          label: string
          trend: string
          value: string
        }
        Insert: {
          category?: string | null
          change_percentage?: number | null
          color?: string | null
          created_at?: string
          date_recorded?: string
          icon?: string | null
          id?: string
          label: string
          trend: string
          value: string
        }
        Update: {
          category?: string | null
          change_percentage?: number | null
          color?: string | null
          created_at?: string
          date_recorded?: string
          icon?: string | null
          id?: string
          label?: string
          trend?: string
          value?: string
        }
        Relationships: []
      }
      performance_data: {
        Row: {
          category: string
          change_percentage: string | null
          created_at: string
          id: string
          month: string | null
          percentage: number
          target: number
          trend: string
          value: number
        }
        Insert: {
          category: string
          change_percentage?: string | null
          created_at?: string
          id?: string
          month?: string | null
          percentage: number
          target: number
          trend: string
          value: number
        }
        Update: {
          category?: string
          change_percentage?: string | null
          created_at?: string
          id?: string
          month?: string | null
          percentage?: number
          target?: number
          trend?: string
          value?: number
        }
        Relationships: []
      }
      quality_assessments: {
        Row: {
          assessed_by: string
          batch_number: string
          below12: number | null
          comments: string | null
          created_at: string
          date_assessed: string
          group1_defects: number | null
          group2_defects: number | null
          husks: number | null
          id: string
          moisture: number
          pods: number | null
          status: string
          stones: number | null
          store_record_id: string | null
          suggested_price: number
          updated_at: string
        }
        Insert: {
          assessed_by: string
          batch_number: string
          below12?: number | null
          comments?: string | null
          created_at?: string
          date_assessed?: string
          group1_defects?: number | null
          group2_defects?: number | null
          husks?: number | null
          id?: string
          moisture: number
          pods?: number | null
          status?: string
          stones?: number | null
          store_record_id?: string | null
          suggested_price: number
          updated_at?: string
        }
        Update: {
          assessed_by?: string
          batch_number?: string
          below12?: number | null
          comments?: string | null
          created_at?: string
          date_assessed?: string
          group1_defects?: number | null
          group2_defects?: number | null
          husks?: number | null
          id?: string
          moisture?: number
          pods?: number | null
          status?: string
          stones?: number | null
          store_record_id?: string | null
          suggested_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_assessments_store_record_id_fkey"
            columns: ["store_record_id"]
            isOneToOne: false
            referencedRelation: "coffee_records"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          category: string
          created_at: string
          description: string | null
          downloads: number | null
          file_size: string | null
          format: string
          generated_by: string | null
          id: string
          name: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          downloads?: number | null
          file_size?: string | null
          format?: string
          generated_by?: string | null
          id?: string
          name: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          downloads?: number | null
          file_size?: string | null
          format?: string
          generated_by?: string | null
          id?: string
          name?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      salary_payments: {
        Row: {
          bonuses: number
          created_at: string
          deductions: number
          employee_count: number
          employee_details: Json
          id: string
          month: string
          notes: string | null
          payment_method: string
          processed_by: string
          processed_date: string
          status: string
          total_pay: number
        }
        Insert: {
          bonuses?: number
          created_at?: string
          deductions?: number
          employee_count?: number
          employee_details?: Json
          id?: string
          month: string
          notes?: string | null
          payment_method?: string
          processed_by: string
          processed_date?: string
          status?: string
          total_pay?: number
        }
        Update: {
          bonuses?: number
          created_at?: string
          deductions?: number
          employee_count?: number
          employee_details?: Json
          id?: string
          month?: string
          notes?: string | null
          payment_method?: string
          processed_by?: string
          processed_date?: string
          status?: string
          total_pay?: number
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          code: string
          created_at: string
          date_registered: string
          id: string
          name: string
          opening_balance: number
          origin: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          date_registered?: string
          id?: string
          name: string
          opening_balance?: number
          origin: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          date_registered?: string
          id?: string
          name?: string
          opening_balance?: number
          origin?: string
          phone?: string | null
          updated_at?: string
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
