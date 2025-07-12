
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable. Please set up your Supabase environment variables.')
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable. Please set up your Supabase environment variables.')
}

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
