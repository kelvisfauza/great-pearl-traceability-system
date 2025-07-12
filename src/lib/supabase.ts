
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://pudfybkyfedeggmokhco.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          position: string
          department: string
          salary: number
          employee_id: string | null
          address: string | null
          emergency_contact: string | null
          role: string
          permissions: string[]
          status: string
          join_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          position: string
          department: string
          salary: number
          employee_id?: string | null
          address?: string | null
          emergency_contact?: string | null
          role?: string
          permissions?: string[]
          status?: string
          join_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          position?: string
          department?: string
          salary?: number
          employee_id?: string | null
          address?: string | null
          emergency_contact?: string | null
          role?: string
          permissions?: string[]
          status?: string
          join_date?: string
          updated_at?: string
        }
      }
      salary_payments: {
        Row: {
          id: string
          month: string
          total_pay: number
          bonuses: number
          deductions: number
          employee_count: number
          status: string
          processed_by: string
          processed_date: string
          payment_method: string
          notes: string | null
          employee_details: any[]
          created_at: string
        }
        Insert: {
          id?: string
          month: string
          total_pay: number
          bonuses?: number
          deductions?: number
          employee_count: number
          status?: string
          processed_by: string
          processed_date: string
          payment_method: string
          notes?: string | null
          employee_details?: any[]
          created_at?: string
        }
        Update: {
          id?: string
          month?: string
          total_pay?: number
          bonuses?: number
          deductions?: number
          employee_count?: number
          status?: string
          processed_by?: string
          processed_date?: string
          payment_method?: string
          notes?: string | null
          employee_details?: any[]
        }
      }
    }
  }
}
