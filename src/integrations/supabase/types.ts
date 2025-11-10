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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      advance_recoveries: {
        Row: {
          advance_id: string
          created_at: string
          id: string
          payment_id: string
          recovered_ugx: number
        }
        Insert: {
          advance_id: string
          created_at?: string
          id?: string
          payment_id: string
          recovered_ugx: number
        }
        Update: {
          advance_id?: string
          created_at?: string
          id?: string
          payment_id?: string
          recovered_ugx?: number
        }
        Relationships: [
          {
            foreignKeyName: "advance_recoveries_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "supplier_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_recoveries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "supplier_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string
          id: string
          message: string
          priority: string
          recipients_count: number | null
          send_sms: boolean
          sent_at: string | null
          sms_sent_count: number | null
          status: string
          target_departments: string[] | null
          target_roles: string[] | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          message: string
          priority?: string
          recipients_count?: number | null
          send_sms?: boolean
          sent_at?: string | null
          sms_sent_count?: number | null
          status?: string
          target_departments?: string[] | null
          target_roles?: string[] | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          priority?: string
          recipients_count?: number | null
          send_sms?: boolean
          sent_at?: string | null
          sms_sent_count?: number | null
          status?: string
          target_departments?: string[] | null
          target_roles?: string[] | null
          title?: string
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          admin_approved: boolean | null
          admin_approved_1: boolean | null
          admin_approved_1_at: string | null
          admin_approved_1_by: string | null
          admin_approved_2: boolean | null
          admin_approved_2_at: string | null
          admin_approved_2_by: string | null
          admin_approved_at: string | null
          admin_approved_by: string | null
          admin_comments: string | null
          amount: number
          approval_stage: string | null
          created_at: string
          daterequested: string
          department: string
          description: string
          details: Json | null
          finance_approved: boolean | null
          finance_approved_at: string | null
          finance_approved_by: string | null
          id: string
          payment_method: string | null
          priority: string
          rejection_comments: string | null
          rejection_reason: string | null
          requestedby: string
          requires_three_approvals: boolean | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          admin_approved?: boolean | null
          admin_approved_1?: boolean | null
          admin_approved_1_at?: string | null
          admin_approved_1_by?: string | null
          admin_approved_2?: boolean | null
          admin_approved_2_at?: string | null
          admin_approved_2_by?: string | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_comments?: string | null
          amount: number
          approval_stage?: string | null
          created_at?: string
          daterequested: string
          department: string
          description: string
          details?: Json | null
          finance_approved?: boolean | null
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          id?: string
          payment_method?: string | null
          priority?: string
          rejection_comments?: string | null
          rejection_reason?: string | null
          requestedby: string
          requires_three_approvals?: boolean | null
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          admin_approved?: boolean | null
          admin_approved_1?: boolean | null
          admin_approved_1_at?: string | null
          admin_approved_1_by?: string | null
          admin_approved_2?: boolean | null
          admin_approved_2_at?: string | null
          admin_approved_2_by?: string | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_comments?: string | null
          amount?: number
          approval_stage?: string | null
          created_at?: string
          daterequested?: string
          department?: string
          description?: string
          details?: Json | null
          finance_approved?: boolean | null
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          id?: string
          payment_method?: string | null
          priority?: string
          rejection_comments?: string | null
          rejection_reason?: string | null
          requestedby?: string
          requires_three_approvals?: boolean | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      archive_history: {
        Row: {
          archive_date: string | null
          archive_period: string
          archived_by: string
          created_at: string | null
          id: string
          notes: string | null
          records_archived: Json | null
        }
        Insert: {
          archive_date?: string | null
          archive_period: string
          archived_by: string
          created_at?: string | null
          id?: string
          notes?: string | null
          records_archived?: Json | null
        }
        Update: {
          archive_date?: string | null
          archive_period?: string
          archived_by?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          records_archived?: Json | null
        }
        Relationships: []
      }
      archived_approval_requests: {
        Row: {
          admin_approved: boolean | null
          admin_approved_at: string | null
          admin_approved_by: string | null
          amount: number
          archive_period: string
          archived_at: string | null
          archived_by: string | null
          created_at: string | null
          daterequested: string
          description: string | null
          details: Json | null
          finance_approved: boolean | null
          finance_approved_at: string | null
          finance_approved_by: string | null
          id: string
          original_id: string
          priority: string | null
          requestedby: string
          status: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          admin_approved?: boolean | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          amount: number
          archive_period: string
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          daterequested: string
          description?: string | null
          details?: Json | null
          finance_approved?: boolean | null
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          id?: string
          original_id: string
          priority?: string | null
          requestedby: string
          status: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          admin_approved?: boolean | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          amount?: number
          archive_period?: string
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          daterequested?: string
          description?: string | null
          details?: Json | null
          finance_approved?: boolean | null
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          id?: string
          original_id?: string
          priority?: string | null
          requestedby?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      archived_finance_cash_transactions: {
        Row: {
          amount: number
          archive_period: string
          archived_at: string | null
          archived_by: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          original_id: string
          reference: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          archive_period: string
          archived_at?: string | null
          archived_by?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          original_id: string
          reference?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          archive_period?: string
          archived_at?: string | null
          archived_by?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          original_id?: string
          reference?: string | null
          transaction_type?: string
        }
        Relationships: []
      }
      archived_money_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          archive_period: string
          archived_at: string | null
          archived_by: string | null
          created_at: string | null
          employee_id: string | null
          employee_name: string | null
          id: string
          original_id: string
          reason: string | null
          request_type: string | null
          status: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          archive_period: string
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          original_id: string
          reason?: string | null
          request_type?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          archive_period?: string
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          original_id?: string
          reason?: string | null
          request_type?: string | null
          status?: string | null
        }
        Relationships: []
      }
      archived_payment_records: {
        Row: {
          amount: number
          archive_period: string
          archived_at: string | null
          archived_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          original_id: string
          payment_date: string | null
          payment_method: string | null
          recorded_by: string | null
          reference: string | null
          supplier_name: string | null
        }
        Insert: {
          amount: number
          archive_period: string
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          original_id: string
          payment_date?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          reference?: string | null
          supplier_name?: string | null
        }
        Update: {
          amount?: number
          archive_period?: string
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          original_id?: string
          payment_date?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          reference?: string | null
          supplier_name?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string | null
          date: string
          employee_email: string
          employee_id: string
          employee_name: string
          id: string
          is_locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          marked_at: string | null
          marked_by: string
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          employee_email: string
          employee_id: string
          employee_name: string
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          marked_at?: string | null
          marked_by: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          employee_email?: string
          employee_id?: string
          employee_name?: string
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          marked_at?: string | null
          marked_by?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          department: string | null
          id: string
          performed_by: string
          reason: string | null
          record_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          created_at?: string
          department?: string | null
          id?: string
          performed_by: string
          reason?: string | null
          record_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          created_at?: string
          department?: string | null
          id?: string
          performed_by?: string
          reason?: string | null
          record_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      biometric_credentials: {
        Row: {
          created_at: string | null
          credential_id: string
          email: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credential_id: string
          email: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credential_id?: string
          email?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      buying_stations: {
        Row: {
          capacity: number
          created_at: string
          current_occupancy: number | null
          id: string
          location: string
          manager_name: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          capacity: number
          created_at?: string
          current_occupancy?: number | null
          id?: string
          location: string
          manager_name: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          current_occupancy?: number | null
          id?: string
          location?: string
          manager_name?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          caller_id: string
          caller_name: string
          created_at: string
          duration: number | null
          ended_at: string | null
          id: string
          recipient_id: string
          recipient_name: string
          started_at: string
          status: string
        }
        Insert: {
          caller_id: string
          caller_name: string
          created_at?: string
          duration?: number | null
          ended_at?: string | null
          id?: string
          recipient_id: string
          recipient_name: string
          started_at?: string
          status?: string
        }
        Update: {
          caller_id?: string
          caller_name?: string
          created_at?: string
          duration?: number | null
          ended_at?: string | null
          id?: string
          recipient_id?: string
          recipient_name?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          amount_ugx: number
          created_at: string
          description: string | null
          direction: string
          id: string
          occurred_at: string
          session_id: string
          source_id: string
          source_type: string
        }
        Insert: {
          amount_ugx: number
          created_at?: string
          description?: string | null
          direction: string
          id?: string
          occurred_at?: string
          session_id: string
          source_id: string
          source_type: string
        }
        Update: {
          amount_ugx?: number
          created_at?: string
          description?: string | null
          direction?: string
          id?: string
          occurred_at?: string
          session_id?: string
          source_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          declared_cash_on_hand_ugx: number | null
          id: string
          is_closed: boolean
          opened_at: string
          opened_by: string
          opening_float_ugx: number
          session_date: string
          system_closing_balance_ugx: number | null
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          declared_cash_on_hand_ugx?: number | null
          id?: string
          is_closed?: boolean
          opened_at?: string
          opened_by: string
          opening_float_ugx: number
          session_date: string
          system_closing_balance_ugx?: number | null
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          declared_cash_on_hand_ugx?: number | null
          id?: string
          is_closed?: boolean
          opened_at?: string
          opened_by?: string
          opening_float_ugx?: number
          session_date?: string
          system_closing_balance_ugx?: number | null
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
      company_employees: {
        Row: {
          address: string | null
          allowances: number
          base_salary: number
          created_at: string
          deductions: number
          department: string
          employee_id: string
          full_name: string
          hire_date: string
          id: string
          phone: string | null
          position: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          allowances?: number
          base_salary?: number
          created_at?: string
          deductions?: number
          department: string
          employee_id: string
          full_name: string
          hire_date?: string
          id?: string
          phone?: string | null
          position: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          allowances?: number
          base_salary?: number
          created_at?: string
          deductions?: number
          department?: string
          employee_id?: string
          full_name?: string
          hire_date?: string
          id?: string
          phone?: string | null
          position?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_approvals: {
        Row: {
          action_type: string
          approved_at: string | null
          approved_by: string | null
          contract_id: string | null
          created_at: string | null
          id: string
          reason: string
          rejection_reason: string | null
          requested_at: string | null
          requested_by: string
          status: string | null
        }
        Insert: {
          action_type: string
          approved_at?: string | null
          approved_by?: string | null
          contract_id?: string | null
          created_at?: string | null
          id?: string
          reason: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by: string
          status?: string | null
        }
        Update: {
          action_type?: string
          approved_at?: string | null
          approved_by?: string | null
          contract_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_approvals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "supplier_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_files: {
        Row: {
          buyer: string
          buyer_ref: string
          created_at: string | null
          file_name: string
          file_url: string
          id: string
          status: string
          uploaded_at: string | null
        }
        Insert: {
          buyer: string
          buyer_ref: string
          created_at?: string | null
          file_name: string
          file_url: string
          id?: string
          status?: string
          uploaded_at?: string | null
        }
        Update: {
          buyer?: string
          buyer_ref?: string
          created_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          status?: string
          uploaded_at?: string | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string | null
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          country: string
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          status: string
          total_orders: number | null
          total_value: number | null
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          status?: string
          total_orders?: number | null
          total_value?: number | null
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          status?: string
          total_orders?: number | null
          total_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          actions_needed: string | null
          challenges: string | null
          created_at: string | null
          district: string
          farmers_visited: string[] | null
          id: string
          report_date: string | null
          submitted_at: string | null
          submitted_by: string
          total_kgs_mobilized: number
          villages_visited: string
        }
        Insert: {
          actions_needed?: string | null
          challenges?: string | null
          created_at?: string | null
          district: string
          farmers_visited?: string[] | null
          id?: string
          report_date?: string | null
          submitted_at?: string | null
          submitted_by: string
          total_kgs_mobilized?: number
          villages_visited: string
        }
        Update: {
          actions_needed?: string | null
          challenges?: string | null
          created_at?: string | null
          district?: string
          farmers_visited?: string[] | null
          id?: string
          report_date?: string | null
          submitted_at?: string | null
          submitted_by?: string
          total_kgs_mobilized?: number
          villages_visited?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          amount: number | null
          batch_number: string | null
          completed_at: string
          completed_by: string
          created_at: string
          date: string
          department: string
          description: string
          id: string
          task_type: string
        }
        Insert: {
          amount?: number | null
          batch_number?: string | null
          completed_at?: string
          completed_by: string
          created_at?: string
          date?: string
          department?: string
          description: string
          id?: string
          task_type: string
        }
        Update: {
          amount?: number | null
          batch_number?: string | null
          completed_at?: string
          completed_by?: string
          created_at?: string
          date?: string
          department?: string
          description?: string
          id?: string
          task_type?: string
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          admin_comments: string | null
          created_at: string | null
          id: string
          reason: string
          record_data: Json
          record_id: string
          requested_at: string | null
          requested_by: string
          requested_by_department: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          table_name: string
          updated_at: string | null
        }
        Insert: {
          admin_comments?: string | null
          created_at?: string | null
          id?: string
          reason: string
          record_data: Json
          record_id: string
          requested_at?: string | null
          requested_by: string
          requested_by_department: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          table_name: string
          updated_at?: string | null
        }
        Update: {
          admin_comments?: string | null
          created_at?: string | null
          id?: string
          reason?: string
          record_data?: Json
          record_id?: string
          requested_at?: string | null
          requested_by?: string
          requested_by_department?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_routes: {
        Row: {
          active_vehicles: number | null
          created_at: string | null
          distance_km: number
          estimated_hours: number | null
          frequency: string
          id: string
          locations: string[]
          name: string
          updated_at: string | null
        }
        Insert: {
          active_vehicles?: number | null
          created_at?: string | null
          distance_km: number
          estimated_hours?: number | null
          frequency: string
          id?: string
          locations: string[]
          name: string
          updated_at?: string | null
        }
        Update: {
          active_vehicles?: number | null
          created_at?: string | null
          distance_km?: number
          estimated_hours?: number | null
          frequency?: string
          id?: string
          locations?: string[]
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      edit_requests: {
        Row: {
          created_at: string
          id: string
          original_data: Json
          proposed_changes: Json
          reason: string
          record_id: string
          requested_by: string
          requested_by_department: string
          status: string
          table_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_data: Json
          proposed_changes: Json
          reason: string
          record_id: string
          requested_by: string
          requested_by_department?: string
          status?: string
          table_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          original_data?: Json
          proposed_changes?: Json
          reason?: string
          record_id?: string
          requested_by?: string
          requested_by_department?: string
          status?: string
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          address: string | null
          auth_user_id: string | null
          avatar_url: string | null
          bypass_sms_verification: boolean | null
          created_at: string
          department: string
          disabled: boolean | null
          email: string
          emergency_contact: string | null
          employee_id: string | null
          id: string
          is_training_account: boolean | null
          join_date: string
          last_notified_role: string | null
          name: string
          permissions: string[]
          phone: string | null
          position: string
          role: string
          role_notification_shown_at: string | null
          salary: number
          status: string
          training_progress: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          bypass_sms_verification?: boolean | null
          created_at?: string
          department: string
          disabled?: boolean | null
          email: string
          emergency_contact?: string | null
          employee_id?: string | null
          id?: string
          is_training_account?: boolean | null
          join_date?: string
          last_notified_role?: string | null
          name: string
          permissions?: string[]
          phone?: string | null
          position: string
          role?: string
          role_notification_shown_at?: string | null
          salary?: number
          status?: string
          training_progress?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          bypass_sms_verification?: boolean | null
          created_at?: string
          department?: string
          disabled?: boolean | null
          email?: string
          emergency_contact?: string | null
          employee_id?: string | null
          id?: string
          is_training_account?: boolean | null
          join_date?: string
          last_notified_role?: string | null
          name?: string
          permissions?: string[]
          phone?: string | null
          position?: string
          role?: string
          role_notification_shown_at?: string | null
          salary?: number
          status?: string
          training_progress?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      eudr_batches: {
        Row: {
          available_kilograms: number
          batch_identifier: string
          batch_sequence: number
          created_at: string | null
          document_id: string
          id: string
          kilograms: number
          receipts: string[]
          status: string
          updated_at: string | null
        }
        Insert: {
          available_kilograms?: number
          batch_identifier: string
          batch_sequence: number
          created_at?: string | null
          document_id: string
          id?: string
          kilograms?: number
          receipts?: string[]
          status?: string
          updated_at?: string | null
        }
        Update: {
          available_kilograms?: number
          batch_identifier?: string
          batch_sequence?: number
          created_at?: string | null
          document_id?: string
          id?: string
          kilograms?: number
          receipts?: string[]
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eudr_batches_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "eudr_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      eudr_documents: {
        Row: {
          available_kilograms: number
          batch_number: string
          coffee_type: string
          created_at: string | null
          date: string
          documentation_notes: string | null
          id: string
          status: string
          total_bulked_coffee: number | null
          total_kilograms: number
          total_receipts: number
          updated_at: string | null
        }
        Insert: {
          available_kilograms: number
          batch_number: string
          coffee_type: string
          created_at?: string | null
          date: string
          documentation_notes?: string | null
          id?: string
          status?: string
          total_bulked_coffee?: number | null
          total_kilograms: number
          total_receipts?: number
          updated_at?: string | null
        }
        Update: {
          available_kilograms?: number
          batch_number?: string
          coffee_type?: string
          created_at?: string | null
          date?: string
          documentation_notes?: string | null
          id?: string
          status?: string
          total_bulked_coffee?: number | null
          total_kilograms?: number
          total_receipts?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      eudr_sales: {
        Row: {
          batch_id: string
          batch_identifier: string
          coffee_type: string
          created_at: string | null
          document_id: string
          id: string
          kilograms: number
          remaining_batch_kilograms: number
          sale_date: string
          sale_price: number
          sold_to: string
        }
        Insert: {
          batch_id: string
          batch_identifier: string
          coffee_type: string
          created_at?: string | null
          document_id: string
          id?: string
          kilograms: number
          remaining_batch_kilograms: number
          sale_date: string
          sale_price: number
          sold_to: string
        }
        Update: {
          batch_id?: string
          batch_identifier?: string
          coffee_type?: string
          created_at?: string | null
          document_id?: string
          id?: string
          kilograms?: number
          remaining_batch_kilograms?: number
          sale_date?: string
          sale_price?: number
          sold_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "eudr_sales_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "eudr_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eudr_sales_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "eudr_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      facilitation_requests: {
        Row: {
          amount_requested: number
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          date_needed: string
          evidence_url: string | null
          id: string
          purpose: string
          rejection_reason: string | null
          request_type: string
          requested_by: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount_requested: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          date_needed: string
          evidence_url?: string | null
          id?: string
          purpose: string
          rejection_reason?: string | null
          request_type: string
          requested_by: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount_requested?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          date_needed?: string
          evidence_url?: string | null
          id?: string
          purpose?: string
          rejection_reason?: string | null
          request_type?: string
          requested_by?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      farmer_profiles: {
        Row: {
          coffee_type: string
          created_at: string | null
          created_by: string
          full_name: string
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          id_photo_url: string | null
          notes: string | null
          outstanding_advance: number | null
          parish: string | null
          phone: string
          photo_url: string | null
          subcounty: string | null
          total_purchases_kg: number | null
          updated_at: string | null
          village: string
        }
        Insert: {
          coffee_type: string
          created_at?: string | null
          created_by: string
          full_name: string
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          id_photo_url?: string | null
          notes?: string | null
          outstanding_advance?: number | null
          parish?: string | null
          phone: string
          photo_url?: string | null
          subcounty?: string | null
          total_purchases_kg?: number | null
          updated_at?: string | null
          village: string
        }
        Update: {
          coffee_type?: string
          created_at?: string | null
          created_by?: string
          full_name?: string
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          id_photo_url?: string | null
          notes?: string | null
          outstanding_advance?: number | null
          parish?: string | null
          phone?: string
          photo_url?: string | null
          subcounty?: string | null
          total_purchases_kg?: number | null
          updated_at?: string | null
          village?: string
        }
        Relationships: []
      }
      field_agents: {
        Row: {
          collections_count: number | null
          created_at: string
          id: string
          last_report_date: string | null
          name: string
          phone: string | null
          region: string
          status: string
          updated_at: string
        }
        Insert: {
          collections_count?: number | null
          created_at?: string
          id?: string
          last_report_date?: string | null
          name: string
          phone?: string | null
          region: string
          status?: string
          updated_at?: string
        }
        Update: {
          collections_count?: number | null
          created_at?: string
          id?: string
          last_report_date?: string | null
          name?: string
          phone?: string | null
          region?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      field_attendance_logs: {
        Row: {
          check_in_gps_latitude: number | null
          check_in_gps_longitude: number | null
          check_in_time: string | null
          check_out_gps_latitude: number | null
          check_out_gps_longitude: number | null
          check_out_time: string | null
          created_at: string | null
          date: string | null
          duration_minutes: number | null
          field_agent: string
          id: string
          location_name: string | null
        }
        Insert: {
          check_in_gps_latitude?: number | null
          check_in_gps_longitude?: number | null
          check_in_time?: string | null
          check_out_gps_latitude?: number | null
          check_out_gps_longitude?: number | null
          check_out_time?: string | null
          created_at?: string | null
          date?: string | null
          duration_minutes?: number | null
          field_agent: string
          id?: string
          location_name?: string | null
        }
        Update: {
          check_in_gps_latitude?: number | null
          check_in_gps_longitude?: number | null
          check_in_time?: string | null
          check_out_gps_latitude?: number | null
          check_out_gps_longitude?: number | null
          check_out_time?: string | null
          created_at?: string | null
          date?: string | null
          duration_minutes?: number | null
          field_agent?: string
          id?: string
          location_name?: string | null
        }
        Relationships: []
      }
      field_collections: {
        Row: {
          agent_id: string | null
          agent_name: string
          bags: number
          batch_number: string | null
          collection_date: string
          created_at: string
          farmer_name: string
          id: string
          location: string
          quality_grade: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          agent_name: string
          bags: number
          batch_number?: string | null
          collection_date?: string
          created_at?: string
          farmer_name: string
          id?: string
          location: string
          quality_grade: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          agent_name?: string
          bags?: number
          batch_number?: string | null
          collection_date?: string
          created_at?: string
          farmer_name?: string
          id?: string
          location?: string
          quality_grade?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_collections_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "field_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      field_purchases: {
        Row: {
          advance_deducted: number | null
          category: string
          coffee_type: string
          created_at: string | null
          created_by: string
          delivery_slip_generated: boolean | null
          farmer_id: string | null
          farmer_name: string
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          image_url: string | null
          kgs_purchased: number
          moisture_percentage: number | null
          purchase_date: string | null
          quality_notes: string | null
          status: string | null
          total_value: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          advance_deducted?: number | null
          category: string
          coffee_type: string
          created_at?: string | null
          created_by: string
          delivery_slip_generated?: boolean | null
          farmer_id?: string | null
          farmer_name: string
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          image_url?: string | null
          kgs_purchased: number
          moisture_percentage?: number | null
          purchase_date?: string | null
          quality_notes?: string | null
          status?: string | null
          total_value: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          advance_deducted?: number | null
          category?: string
          coffee_type?: string
          created_at?: string | null
          created_by?: string
          delivery_slip_generated?: boolean | null
          farmer_id?: string | null
          farmer_name?: string
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          image_url?: string | null
          kgs_purchased?: number
          moisture_percentage?: number | null
          purchase_date?: string | null
          quality_notes?: string | null
          status?: string | null
          total_value?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_purchases_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_advances: {
        Row: {
          amount: number
          cleared_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          reference: string | null
          status: string | null
        }
        Insert: {
          amount?: number
          cleared_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reference?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          cleared_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reference?: string | null
          status?: string | null
        }
        Relationships: []
      }
      finance_cash_balance: {
        Row: {
          created_at: string
          current_balance: number
          id: string
          last_updated: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          id?: string
          last_updated?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          id?: string
          last_updated?: string
          updated_by?: string
        }
        Relationships: []
      }
      finance_cash_transactions: {
        Row: {
          amount: number
          balance_after: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          reference: string | null
          status: string
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          reference?: string | null
          status?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          reference?: string | null
          status?: string
          transaction_type?: string
        }
        Relationships: []
      }
      finance_coffee_lots: {
        Row: {
          assessed_at: string
          assessed_by: string
          coffee_record_id: string | null
          created_at: string
          finance_notes: string | null
          finance_status: Database["public"]["Enums"]["lot_finance_status"]
          id: string
          quality_assessment_id: string | null
          quality_json: Json
          quantity_kg: number
          supplier_id: string | null
          total_amount_ugx: number | null
          unit_price_ugx: number
          updated_at: string
        }
        Insert: {
          assessed_at?: string
          assessed_by: string
          coffee_record_id?: string | null
          created_at?: string
          finance_notes?: string | null
          finance_status?: Database["public"]["Enums"]["lot_finance_status"]
          id?: string
          quality_assessment_id?: string | null
          quality_json: Json
          quantity_kg: number
          supplier_id?: string | null
          total_amount_ugx?: number | null
          unit_price_ugx: number
          updated_at?: string
        }
        Update: {
          assessed_at?: string
          assessed_by?: string
          coffee_record_id?: string | null
          created_at?: string
          finance_notes?: string | null
          finance_status?: Database["public"]["Enums"]["lot_finance_status"]
          id?: string
          quality_assessment_id?: string | null
          quality_json?: Json
          quantity_kg?: number
          supplier_id?: string | null
          total_amount_ugx?: number | null
          unit_price_ugx?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_coffee_lots_coffee_record_id_fkey"
            columns: ["coffee_record_id"]
            isOneToOne: false
            referencedRelation: "coffee_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_coffee_lots_quality_assessment_id_fkey"
            columns: ["quality_assessment_id"]
            isOneToOne: true
            referencedRelation: "quality_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_coffee_lots_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date: string
          description: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_ledgers: {
        Row: {
          balance: number | null
          credit: number | null
          date: string | null
          debit: number | null
          id: string
          ref: string | null
          type: string | null
        }
        Insert: {
          balance?: number | null
          credit?: number | null
          date?: string | null
          debit?: number | null
          id?: string
          ref?: string | null
          type?: string | null
        }
        Update: {
          balance?: number | null
          credit?: number | null
          date?: string | null
          debit?: number | null
          id?: string
          ref?: string | null
          type?: string | null
        }
        Relationships: []
      }
      finance_payments: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          method: string | null
          notes: string | null
          reference: string | null
          status: string | null
          supplier: string | null
          supplier_code: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          reference?: string | null
          status?: string | null
          supplier?: string | null
          supplier_code?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          reference?: string | null
          status?: string | null
          supplier?: string | null
          supplier_code?: string | null
        }
        Relationships: []
      }
      finance_prices: {
        Row: {
          base_price: number | null
          coffee_type: string
          created_at: string | null
          created_by: string | null
          differential: number | null
          grade: string | null
          id: string
          notes: string | null
        }
        Insert: {
          base_price?: number | null
          coffee_type: string
          created_at?: string | null
          created_by?: string | null
          differential?: number | null
          grade?: string | null
          id?: string
          notes?: string | null
        }
        Update: {
          base_price?: number | null
          coffee_type?: string
          created_at?: string | null
          created_by?: string | null
          differential?: number | null
          grade?: string | null
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      finance_transactions: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string
          id: string
          time: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          description: string
          id?: string
          time: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string
          id?: string
          time?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          batch_numbers: string[] | null
          coffee_type: string
          created_at: string
          id: string
          last_updated: string
          location: string
          status: string
          total_bags: number
          total_kilograms: number
          updated_at: string
        }
        Insert: {
          batch_numbers?: string[] | null
          coffee_type: string
          created_at?: string
          id?: string
          last_updated?: string
          location?: string
          status?: string
          total_bags?: number
          total_kilograms?: number
          updated_at?: string
        }
        Update: {
          batch_numbers?: string[] | null
          coffee_type?: string
          created_at?: string
          id?: string
          last_updated?: string
          location?: string
          status?: string
          total_bags?: number
          total_kilograms?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          coffee_record_id: string
          created_at: string
          created_by: string
          id: string
          movement_type: string
          notes: string | null
          quantity_kg: number
          reference_id: string | null
          reference_type: string | null
          updated_at: string
        }
        Insert: {
          coffee_record_id: string
          created_at?: string
          created_by: string
          id?: string
          movement_type: string
          notes?: string | null
          quantity_kg: number
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string
        }
        Update: {
          coffee_record_id?: string
          created_at?: string
          created_by?: string
          id?: string
          movement_type?: string
          notes?: string | null
          quantity_kg?: number
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount: number
          created_at: string
          entry_type: string
          id: string
          metadata: Json | null
          reference: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          entry_type: string
          id?: string
          metadata?: Json | null
          reference: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          entry_type?: string
          id?: string
          metadata?: Json | null
          reference?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      login_tokens: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          phone: string
          token: string
          used: boolean
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          phone: string
          token: string
          used?: boolean
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          phone?: string
          token?: string
          used?: boolean
        }
        Relationships: []
      }
      market_data: {
        Row: {
          change_percentage: number | null
          coffee_type: string
          created_at: string
          date_recorded: string
          exchange_rate: number
          id: string
          market_source: string
          price_ugx: number
          price_usd: number
          trend: string | null
        }
        Insert: {
          change_percentage?: number | null
          coffee_type: string
          created_at?: string
          date_recorded?: string
          exchange_rate: number
          id?: string
          market_source: string
          price_ugx: number
          price_usd: number
          trend?: string | null
        }
        Update: {
          change_percentage?: number | null
          coffee_type?: string
          created_at?: string
          date_recorded?: string
          exchange_rate?: number
          id?: string
          market_source?: string
          price_ugx?: number
          price_usd?: number
          trend?: string | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          budget: number
          created_at: string
          end_date: string
          id: string
          name: string
          roi_percentage: number | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          budget: number
          created_at?: string
          end_date: string
          id?: string
          name: string
          roi_percentage?: number | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          roi_percentage?: number | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          read_at: string | null
          reply_to_id: string | null
          sender_id: string | null
          sender_name: string | null
          sms_notification_sent: boolean | null
          sms_notification_sent_at: string | null
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sms_notification_sent?: boolean | null
          sms_notification_sent_at?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sms_notification_sent?: boolean | null
          sms_notification_sent_at?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          category: string
          change_percentage: number | null
          color: string | null
          created_at: string | null
          date_recorded: string | null
          icon: string | null
          id: string
          label: string | null
          metric_type: string
          month: string | null
          percentage: number | null
          target: number | null
          trend: string | null
          updated_at: string | null
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          category: string
          change_percentage?: number | null
          color?: string | null
          created_at?: string | null
          date_recorded?: string | null
          icon?: string | null
          id?: string
          label?: string | null
          metric_type: string
          month?: string | null
          percentage?: number | null
          target?: number | null
          trend?: string | null
          updated_at?: string | null
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          category?: string
          change_percentage?: number | null
          color?: string | null
          created_at?: string | null
          date_recorded?: string | null
          icon?: string | null
          id?: string
          label?: string | null
          metric_type?: string
          month?: string | null
          percentage?: number | null
          target?: number | null
          trend?: string | null
          updated_at?: string | null
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: []
      }
      milling_cash_transactions: {
        Row: {
          amount_paid: number
          created_at: string
          created_by: string
          customer_id: string
          customer_name: string
          date: string
          id: string
          new_balance: number
          notes: string | null
          payment_method: string
          previous_balance: number
        }
        Insert: {
          amount_paid: number
          created_at?: string
          created_by: string
          customer_id: string
          customer_name: string
          date?: string
          id?: string
          new_balance: number
          notes?: string | null
          payment_method?: string
          previous_balance: number
        }
        Update: {
          amount_paid?: number
          created_at?: string
          created_by?: string
          customer_id?: string
          customer_name?: string
          date?: string
          id?: string
          new_balance?: number
          notes?: string | null
          payment_method?: string
          previous_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "milling_cash_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "milling_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      milling_customers: {
        Row: {
          address: string | null
          created_at: string
          current_balance: number
          full_name: string
          id: string
          opening_balance: number
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          current_balance?: number
          full_name: string
          id?: string
          opening_balance?: number
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          current_balance?: number
          full_name?: string
          id?: string
          opening_balance?: number
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      milling_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          date: string
          description: string
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          created_by: string
          date?: string
          description: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          date?: string
          description?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      milling_transactions: {
        Row: {
          amount_paid: number
          balance: number
          created_at: string
          created_by: string
          customer_id: string
          customer_name: string
          date: string
          id: string
          kgs_hulled: number
          notes: string | null
          rate_per_kg: number
          total_amount: number
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          balance?: number
          created_at?: string
          created_by: string
          customer_id: string
          customer_name: string
          date?: string
          id?: string
          kgs_hulled: number
          notes?: string | null
          rate_per_kg?: number
          total_amount: number
          transaction_type?: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          balance?: number
          created_at?: string
          created_by?: string
          customer_id?: string
          customer_name?: string
          date?: string
          id?: string
          kgs_hulled?: number
          notes?: string | null
          rate_per_kg?: number
          total_amount?: number
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milling_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "milling_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      modification_requests: {
        Row: {
          batch_number: string | null
          comments: string | null
          completed_at: string | null
          created_at: string
          id: string
          original_payment_id: string
          quality_assessment_id: string | null
          reason: string
          requested_by: string
          requested_by_department: string
          status: string
          target_department: string
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          comments?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          original_payment_id: string
          quality_assessment_id?: string | null
          reason: string
          requested_by: string
          requested_by_department: string
          status?: string
          target_department: string
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          comments?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          original_payment_id?: string
          quality_assessment_id?: string | null
          reason?: string
          requested_by?: string
          requested_by_department?: string
          status?: string
          target_department?: string
          updated_at?: string
        }
        Relationships: []
      }
      money_requests: {
        Row: {
          admin_approved_at: string | null
          admin_approved_by: string | null
          amount: number
          approval_stage: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          finance_approved_at: string | null
          finance_approved_by: string | null
          id: string
          payment_slip_generated: boolean | null
          payment_slip_number: string | null
          reason: string
          rejection_reason: string | null
          request_type: string
          requested_by: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          amount: number
          approval_stage?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          id?: string
          payment_slip_generated?: boolean | null
          payment_slip_number?: string | null
          reason: string
          rejection_reason?: string | null
          request_type?: string
          requested_by: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          amount?: number
          approval_stage?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          id?: string
          payment_slip_generated?: boolean | null
          payment_slip_number?: string | null
          reason?: string
          rejection_reason?: string | null
          request_type?: string
          requested_by?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      network_whitelist: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          ip_address: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          ip_address: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          priority: string
          read_at: string | null
          target_department: string | null
          target_role: string | null
          target_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          priority?: string
          read_at?: string | null
          target_department?: string | null
          target_role?: string | null
          target_user_id?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          priority?: string
          read_at?: string | null
          target_department?: string | null
          target_role?: string | null
          target_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      overtime_awards: {
        Row: {
          claimed_at: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          department: string
          employee_email: string
          employee_id: string
          employee_name: string
          hours: number
          id: string
          minutes: number
          notes: string | null
          reference_number: string | null
          status: string
          total_amount: number
        }
        Insert: {
          claimed_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          department: string
          employee_email: string
          employee_id: string
          employee_name: string
          hours?: number
          id?: string
          minutes?: number
          notes?: string | null
          reference_number?: string | null
          status?: string
          total_amount: number
        }
        Update: {
          claimed_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          department?: string
          employee_email?: string
          employee_id?: string
          employee_name?: string
          hours?: number
          id?: string
          minutes?: number
          notes?: string | null
          reference_number?: string | null
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "overtime_awards_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          amount: number
          batch_number: string | null
          created_at: string
          date: string
          id: string
          method: string
          quality_assessment_id: string | null
          status: string
          supplier: string
          updated_at: string
        }
        Insert: {
          amount: number
          batch_number?: string | null
          created_at?: string
          date: string
          id?: string
          method?: string
          quality_assessment_id?: string | null
          status?: string
          supplier: string
          updated_at?: string
        }
        Update: {
          amount?: number
          batch_number?: string | null
          created_at?: string
          date?: string
          id?: string
          method?: string
          quality_assessment_id?: string | null
          status?: string
          supplier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_quality_assessment_id_fkey"
            columns: ["quality_assessment_id"]
            isOneToOne: false
            referencedRelation: "quality_assessments"
            referencedColumns: ["id"]
          },
        ]
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
      price_data: {
        Row: {
          created_at: string
          currency: string
          id: string
          market_source: string | null
          price_type: string
          price_value: number
          recorded_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          market_source?: string | null
          price_type: string
          price_value: number
          recorded_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          market_source?: string | null
          price_type?: string
          price_value?: number
          recorded_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_forecasts: {
        Row: {
          coffee_type: string
          confidence_level: number
          created_at: string
          forecast_date: string
          id: string
          model_used: string
          predicted_price: number
        }
        Insert: {
          coffee_type: string
          confidence_level: number
          created_at?: string
          forecast_date: string
          id?: string
          model_used: string
          predicted_price: number
        }
        Update: {
          coffee_type?: string
          confidence_level?: number
          created_at?: string
          forecast_date?: string
          id?: string
          model_used?: string
          predicted_price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          emergency_contact: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          emergency_contact?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          emergency_contact?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          coffee_type: string
          created_at: string
          delivery_date: string
          id: string
          notes: string | null
          order_date: string
          quantity: number
          received: number | null
          status: string
          supplier_id: string | null
          supplier_name: string
          total_amount: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          coffee_type: string
          created_at?: string
          delivery_date: string
          id?: string
          notes?: string | null
          order_date?: string
          quantity: number
          received?: number | null
          status?: string
          supplier_id?: string | null
          supplier_name: string
          total_amount: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          coffee_type?: string
          created_at?: string
          delivery_date?: string
          id?: string
          notes?: string | null
          order_date?: string
          quantity?: number
          received?: number | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_assessments: {
        Row: {
          assessed_by: string
          batch_number: string
          below12: number | null
          clean_d14: number | null
          comments: string | null
          created_at: string
          date_assessed: string
          final_price: number | null
          fm: number | null
          group1_defects: number | null
          group2_defects: number | null
          husks: number | null
          id: string
          moisture: number
          outturn: number | null
          outturn_price: number | null
          pods: number | null
          quality_note: string | null
          reject_final: boolean | null
          reject_outturn_price: boolean | null
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
          clean_d14?: number | null
          comments?: string | null
          created_at?: string
          date_assessed?: string
          final_price?: number | null
          fm?: number | null
          group1_defects?: number | null
          group2_defects?: number | null
          husks?: number | null
          id?: string
          moisture: number
          outturn?: number | null
          outturn_price?: number | null
          pods?: number | null
          quality_note?: string | null
          reject_final?: boolean | null
          reject_outturn_price?: boolean | null
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
          clean_d14?: number | null
          comments?: string | null
          created_at?: string
          date_assessed?: string
          final_price?: number | null
          fm?: number | null
          group1_defects?: number | null
          group2_defects?: number | null
          husks?: number | null
          id?: string
          moisture?: number
          outturn?: number | null
          outturn_price?: number | null
          pods?: number | null
          quality_note?: string | null
          reject_final?: boolean | null
          reject_outturn_price?: boolean | null
          status?: string
          stones?: number | null
          store_record_id?: string | null
          suggested_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          created_at: string
          doc_id: string
          doc_type: string
          id: string
          issued_at: string
          issued_by: string
          receipt_no: string
        }
        Insert: {
          created_at?: string
          doc_id: string
          doc_type: string
          id?: string
          issued_at?: string
          issued_by: string
          receipt_no: string
        }
        Update: {
          created_at?: string
          doc_id?: string
          doc_type?: string
          id?: string
          issued_at?: string
          issued_by?: string
          receipt_no?: string
        }
        Relationships: []
      }
      rejected_coffee: {
        Row: {
          action_taken: string
          created_at: string | null
          farmer_id: string | null
          farmer_name: string
          id: string
          kgs_rejected: number
          notes: string | null
          photo_url: string | null
          reason: string
          rejected_date: string | null
          reported_by: string
        }
        Insert: {
          action_taken: string
          created_at?: string | null
          farmer_id?: string | null
          farmer_name: string
          id?: string
          kgs_rejected: number
          notes?: string | null
          photo_url?: string | null
          reason: string
          rejected_date?: string | null
          reported_by: string
        }
        Update: {
          action_taken?: string
          created_at?: string | null
          farmer_id?: string | null
          farmer_name?: string
          id?: string
          kgs_rejected?: number
          notes?: string | null
          photo_url?: string | null
          reason?: string
          rejected_date?: string | null
          reported_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "rejected_coffee_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          category: string
          created_at: string
          data_sources: Json
          description: string
          frequency: string
          id: string
          is_active: boolean
          name: string
          supported_formats: string[]
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          data_sources?: Json
          description: string
          frequency: string
          id?: string
          is_active?: boolean
          name: string
          supported_formats?: string[]
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          data_sources?: Json
          description?: string
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          supported_formats?: string[]
          updated_at?: string
        }
        Relationships: []
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
      risk_assessments: {
        Row: {
          assessment_content: string
          created_at: string
          data_summary: Json | null
          generated_at: string
          generated_by_name: string
          generated_by_role: string | null
          generated_by_user_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          assessment_content: string
          created_at?: string
          data_summary?: Json | null
          generated_at?: string
          generated_by_name: string
          generated_by_role?: string | null
          generated_by_user_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          assessment_content?: string
          created_at?: string
          data_summary?: Json | null
          generated_at?: string
          generated_by_name?: string
          generated_by_role?: string | null
          generated_by_user_id?: string | null
          id?: string
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
      salary_payslips: {
        Row: {
          allowances: number
          base_salary: number
          created_at: string
          deductions: number
          employee_id: string
          employee_id_number: string
          employee_name: string
          generated_date: string
          gross_salary: number
          id: string
          net_salary: number
          pay_period_month: number
          pay_period_year: number
          status: string
          updated_at: string
        }
        Insert: {
          allowances?: number
          base_salary?: number
          created_at?: string
          deductions?: number
          employee_id: string
          employee_id_number: string
          employee_name: string
          generated_date?: string
          gross_salary?: number
          id?: string
          net_salary?: number
          pay_period_month: number
          pay_period_year: number
          status?: string
          updated_at?: string
        }
        Update: {
          allowances?: number
          base_salary?: number
          created_at?: string
          deductions?: number
          employee_id?: string
          employee_id_number?: string
          employee_name?: string
          generated_date?: string
          gross_salary?: number
          id?: string
          net_salary?: number
          pay_period_month?: number
          pay_period_year?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "company_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_contracts: {
        Row: {
          contract_date: string
          created_at: string
          customer_id: string | null
          customer_name: string
          delivery_date: string
          id: string
          price: number
          quantity: string
          status: string
          updated_at: string
        }
        Insert: {
          contract_date?: string
          created_at?: string
          customer_id?: string | null
          customer_name: string
          delivery_date: string
          id?: string
          price: number
          quantity: string
          status?: string
          updated_at?: string
        }
        Update: {
          contract_date?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          delivery_date?: string
          id?: string
          price?: number
          quantity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_inventory_tracking: {
        Row: {
          batch_number: string | null
          coffee_record_id: string
          coffee_type: string
          created_at: string | null
          created_by: string | null
          customer_name: string | null
          id: string
          quantity_kg: number
          sale_date: string | null
          sale_id: string
        }
        Insert: {
          batch_number?: string | null
          coffee_record_id: string
          coffee_type: string
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          id?: string
          quantity_kg: number
          sale_date?: string | null
          sale_id: string
        }
        Update: {
          batch_number?: string | null
          coffee_record_id?: string
          coffee_type?: string
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          id?: string
          quantity_kg?: number
          sale_date?: string | null
          sale_id?: string
        }
        Relationships: []
      }
      sales_transactions: {
        Row: {
          coffee_type: string
          created_at: string
          customer: string
          date: string
          driver_details: string
          grn_file_name: string | null
          grn_file_url: string | null
          id: string
          moisture: string | null
          status: string
          total_amount: number
          truck_details: string
          unit_price: number
          updated_at: string
          weight: number
        }
        Insert: {
          coffee_type: string
          created_at?: string
          customer: string
          date: string
          driver_details: string
          grn_file_name?: string | null
          grn_file_url?: string | null
          id?: string
          moisture?: string | null
          status?: string
          total_amount: number
          truck_details: string
          unit_price: number
          updated_at?: string
          weight: number
        }
        Update: {
          coffee_type?: string
          created_at?: string
          customer?: string
          date?: string
          driver_details?: string
          grn_file_name?: string | null
          grn_file_url?: string | null
          id?: string
          moisture?: string | null
          status?: string
          total_amount?: number
          truck_details?: string
          unit_price?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          result_count: number
          search_term: string
          searched_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          result_count?: number
          search_term: string
          searched_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          result_count?: number
          search_term?: string
          searched_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          bags: number
          created_at: string | null
          customer_name: string
          departure_date: string | null
          destination: string
          eta: string | null
          id: string
          status: string
          updated_at: string | null
          vessel_name: string | null
        }
        Insert: {
          bags: number
          created_at?: string | null
          customer_name: string
          departure_date?: string | null
          destination: string
          eta?: string | null
          id?: string
          status?: string
          updated_at?: string | null
          vessel_name?: string | null
        }
        Update: {
          bags?: number
          created_at?: string | null
          customer_name?: string
          departure_date?: string | null
          destination?: string
          eta?: string | null
          id?: string
          status?: string
          updated_at?: string | null
          vessel_name?: string | null
        }
        Relationships: []
      }
      sms_failures: {
        Row: {
          created_at: string
          department: string | null
          failure_reason: string | null
          id: string
          role: string | null
          user_email: string
          user_name: string | null
          user_phone: string
          verification_code: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          failure_reason?: string | null
          id?: string
          role?: string | null
          user_email: string
          user_name?: string | null
          user_phone: string
          verification_code: string
        }
        Update: {
          created_at?: string
          department?: string | null
          failure_reason?: string | null
          id?: string
          role?: string | null
          user_email?: string
          user_name?: string | null
          user_phone?: string
          verification_code?: string
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          created_at: string
          credits_used: number | null
          department: string | null
          failure_reason: string | null
          id: string
          message_content: string
          message_type: string
          provider: string | null
          provider_response: Json | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string
          request_id: string | null
          status: string
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_used?: number | null
          department?: string | null
          failure_reason?: string | null
          id?: string
          message_content: string
          message_type?: string
          provider?: string | null
          provider_response?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone: string
          request_id?: string | null
          status?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_used?: number | null
          department?: string | null
          failure_reason?: string | null
          id?: string
          message_content?: string
          message_type?: string
          provider?: string | null
          provider_response?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          request_id?: string | null
          status?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      storage_locations: {
        Row: {
          capacity: number
          created_at: string
          current_occupancy: number | null
          id: string
          name: string
          occupancy_percentage: number | null
          updated_at: string
        }
        Insert: {
          capacity: number
          created_at?: string
          current_occupancy?: number | null
          id?: string
          name: string
          occupancy_percentage?: number | null
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          current_occupancy?: number | null
          id?: string
          name?: string
          occupancy_percentage?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      store_records: {
        Row: {
          batch_number: string | null
          buyer_name: string | null
          created_at: string
          created_by: string
          from_location: string | null
          id: string
          inventory_item_id: string | null
          notes: string | null
          price_per_kg: number | null
          quantity_bags: number
          quantity_kg: number
          reference_number: string | null
          status: string
          supplier_name: string | null
          to_location: string | null
          total_value: number | null
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          buyer_name?: string | null
          created_at?: string
          created_by: string
          from_location?: string | null
          id?: string
          inventory_item_id?: string | null
          notes?: string | null
          price_per_kg?: number | null
          quantity_bags?: number
          quantity_kg?: number
          reference_number?: string | null
          status?: string
          supplier_name?: string | null
          to_location?: string | null
          total_value?: number | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          buyer_name?: string | null
          created_at?: string
          created_by?: string
          from_location?: string | null
          id?: string
          inventory_item_id?: string | null
          notes?: string | null
          price_per_kg?: number | null
          quantity_bags?: number
          quantity_kg?: number
          reference_number?: string | null
          status?: string
          supplier_name?: string | null
          to_location?: string | null
          total_value?: number | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_records_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      store_reports: {
        Row: {
          advances_given: number
          attachment_name: string | null
          attachment_url: string | null
          average_buying_price: number
          bags_left: number
          bags_sold: number
          coffee_type: string
          comments: string | null
          created_at: string
          date: string
          delivery_note_name: string | null
          delivery_note_url: string | null
          dispatch_report_name: string | null
          dispatch_report_url: string | null
          id: string
          input_by: string
          kilograms_bought: number
          kilograms_left: number
          kilograms_sold: number
          kilograms_unbought: number
          scanner_used: string | null
          sold_to: string | null
          updated_at: string
        }
        Insert: {
          advances_given?: number
          attachment_name?: string | null
          attachment_url?: string | null
          average_buying_price?: number
          bags_left?: number
          bags_sold?: number
          coffee_type: string
          comments?: string | null
          created_at?: string
          date?: string
          delivery_note_name?: string | null
          delivery_note_url?: string | null
          dispatch_report_name?: string | null
          dispatch_report_url?: string | null
          id?: string
          input_by: string
          kilograms_bought?: number
          kilograms_left?: number
          kilograms_sold?: number
          kilograms_unbought?: number
          scanner_used?: string | null
          sold_to?: string | null
          updated_at?: string
        }
        Update: {
          advances_given?: number
          attachment_name?: string | null
          attachment_url?: string | null
          average_buying_price?: number
          bags_left?: number
          bags_sold?: number
          coffee_type?: string
          comments?: string | null
          created_at?: string
          date?: string
          delivery_note_name?: string | null
          delivery_note_url?: string | null
          dispatch_report_name?: string | null
          dispatch_report_url?: string | null
          id?: string
          input_by?: string
          kilograms_bought?: number
          kilograms_left?: number
          kilograms_sold?: number
          kilograms_unbought?: number
          scanner_used?: string | null
          sold_to?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      supplier_advances: {
        Row: {
          amount_ugx: number
          created_at: string
          description: string | null
          id: string
          is_closed: boolean
          issued_at: string
          issued_by: string
          outstanding_ugx: number
          supplier_id: string
          updated_at: string
        }
        Insert: {
          amount_ugx: number
          created_at?: string
          description?: string | null
          id?: string
          is_closed?: boolean
          issued_at?: string
          issued_by: string
          outstanding_ugx: number
          supplier_id: string
          updated_at?: string
        }
        Update: {
          amount_ugx?: number
          created_at?: string
          description?: string | null
          id?: string
          is_closed?: boolean
          issued_at?: string
          issued_by?: string
          outstanding_ugx?: number
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_advances_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contracts: {
        Row: {
          advance_given: number | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          contract_type: string
          created_at: string | null
          date: string
          id: string
          kilograms_expected: number
          price_per_kg: number
          status: string | null
          supplier_id: string | null
          supplier_name: string
          updated_at: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          advance_given?: number | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          contract_type: string
          created_at?: string | null
          date: string
          id?: string
          kilograms_expected: number
          price_per_kg: number
          status?: string | null
          supplier_id?: string | null
          supplier_name: string
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          advance_given?: number | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          contract_type?: string
          created_at?: string | null
          date?: string
          id?: string
          kilograms_expected?: number
          price_per_kg?: number
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: []
      }
      supplier_payments: {
        Row: {
          advance_recovered_ugx: number
          amount_paid_ugx: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          gross_payable_ugx: number
          id: string
          lot_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          reference: string | null
          requested_at: string
          requested_by: string
          status: Database["public"]["Enums"]["payment_status"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          advance_recovered_ugx?: number
          amount_paid_ugx: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          gross_payable_ugx: number
          id?: string
          lot_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          reference?: string | null
          requested_at?: string
          requested_by: string
          status?: Database["public"]["Enums"]["payment_status"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          advance_recovered_ugx?: number
          amount_paid_ugx?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          gross_payable_ugx?: number
          id?: string
          lot_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          reference?: string | null
          requested_at?: string
          requested_by?: string
          status?: Database["public"]["Enums"]["payment_status"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "finance_coffee_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
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
      user_accounts: {
        Row: {
          created_at: string
          current_balance: number
          id: string
          salary_approved: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          id?: string
          salary_approved?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          id?: string
          salary_approved?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string
          id: string
          reward_amount: number | null
          user_id: string
        }
        Insert: {
          activity_date?: string
          activity_type: string
          created_at?: string
          id?: string
          reward_amount?: number | null
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          id?: string
          reward_amount?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          last_seen: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          last_activity: string
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity?: string
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string | null
          current_load: string | null
          driver_name: string
          driver_phone: string | null
          eta: string | null
          id: string
          last_location: string | null
          load_capacity_bags: number | null
          name: string
          route: string
          status: string
          updated_at: string | null
          vehicle_type: string
        }
        Insert: {
          created_at?: string | null
          current_load?: string | null
          driver_name: string
          driver_phone?: string | null
          eta?: string | null
          id?: string
          last_location?: string | null
          load_capacity_bags?: number | null
          name: string
          route: string
          status?: string
          updated_at?: string | null
          vehicle_type: string
        }
        Update: {
          created_at?: string | null
          current_load?: string | null
          driver_name?: string
          driver_phone?: string | null
          eta?: string | null
          id?: string
          last_location?: string | null
          load_capacity_bags?: number | null
          name?: string
          route?: string
          status?: string
          updated_at?: string | null
          vehicle_type?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          capacity_bags: number
          created_at: string | null
          current_bags: number | null
          id: string
          location: string
          status: string
          updated_at: string | null
          utilization_percentage: number | null
        }
        Insert: {
          capacity_bags: number
          created_at?: string | null
          current_bags?: number | null
          id?: string
          location: string
          status?: string
          updated_at?: string | null
          utilization_percentage?: number | null
        }
        Update: {
          capacity_bags?: number
          created_at?: string | null
          current_bags?: number | null
          id?: string
          location?: string
          status?: string
          updated_at?: string | null
          utilization_percentage?: number | null
        }
        Relationships: []
      }
      weekly_allowances: {
        Row: {
          amount_requested: number | null
          balance_available: number | null
          created_at: string | null
          days_attended: number | null
          employee_email: string
          employee_id: string
          employee_name: string
          id: string
          total_eligible_amount: number | null
          updated_at: string | null
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          amount_requested?: number | null
          balance_available?: number | null
          created_at?: string | null
          days_attended?: number | null
          employee_email: string
          employee_id: string
          employee_name: string
          id?: string
          total_eligible_amount?: number | null
          updated_at?: string | null
          week_end_date: string
          week_start_date: string
        }
        Update: {
          amount_requested?: number | null
          balance_available?: number | null
          created_at?: string | null
          days_attended?: number | null
          employee_email?: string
          employee_id?: string
          employee_name?: string
          id?: string
          total_eligible_amount?: number | null
          updated_at?: string | null
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          created_at: string | null
          facilitation_used: number | null
          id: string
          management_issues: string | null
          submitted_at: string | null
          submitted_by: string
          total_farmers_visited: number
          total_kgs_sourced: number
          total_rejected_coffee: number | null
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          created_at?: string | null
          facilitation_used?: number | null
          id?: string
          management_issues?: string | null
          submitted_at?: string | null
          submitted_by: string
          total_farmers_visited?: number
          total_kgs_sourced?: number
          total_rejected_coffee?: number | null
          week_end_date: string
          week_start_date: string
        }
        Update: {
          created_at?: string | null
          facilitation_used?: number | null
          id?: string
          management_issues?: string | null
          submitted_at?: string | null
          submitted_by?: string
          total_farmers_visited?: number
          total_kgs_sourced?: number
          total_rejected_coffee?: number | null
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          channel: string | null
          created_at: string
          failure_reason: string | null
          id: string
          payment_voucher: string | null
          phone_number: string
          printed_at: string | null
          processed_at: string | null
          provider_fee: number | null
          provider_ref: string | null
          request_ref: string | null
          status: string
          transaction_id: string | null
          transaction_reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          channel?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          payment_voucher?: string | null
          phone_number: string
          printed_at?: string | null
          processed_at?: string | null
          provider_fee?: number | null
          provider_ref?: string | null
          request_ref?: string | null
          status?: string
          transaction_id?: string | null
          transaction_reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          channel?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          payment_voucher?: string | null
          phone_number?: string
          printed_at?: string | null
          processed_at?: string | null
          provider_fee?: number | null
          provider_ref?: string | null
          request_ref?: string | null
          status?: string
          transaction_id?: string | null
          transaction_reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_steps: {
        Row: {
          action: string
          comments: string | null
          created_at: string
          from_department: string
          id: string
          payment_id: string
          processed_by: string
          quality_assessment_id: string | null
          reason: string | null
          status: string
          timestamp: string
          to_department: string
          updated_at: string
        }
        Insert: {
          action: string
          comments?: string | null
          created_at?: string
          from_department: string
          id?: string
          payment_id: string
          processed_by: string
          quality_assessment_id?: string | null
          reason?: string | null
          status?: string
          timestamp?: string
          to_department: string
          updated_at?: string
        }
        Update: {
          action?: string
          comments?: string | null
          created_at?: string
          from_department?: string
          id?: string
          payment_id?: string
          processed_by?: string
          quality_assessment_id?: string | null
          reason?: string | null
          status?: string
          timestamp?: string
          to_department?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_all_system_data: { Args: never; Returns: Json }
      calculate_daily_salary_credit: {
        Args: { employee_salary: number }
        Returns: number
      }
      can_bypass_sms_verification: {
        Args: { user_email: string }
        Returns: boolean
      }
      can_perform_action: { Args: { action_type: string }; Returns: boolean }
      check_auth_user_exists: { Args: { user_uuid: string }; Returns: Json }
      check_unread_messages_for_sms: { Args: never; Returns: undefined }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      cleanup_inactive_sessions: { Args: never; Returns: undefined }
      create_timothy_auth_account: { Args: never; Returns: Json }
      fix_denis_auth_final: { Args: never; Returns: Json }
      get_available_to_request_safe: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_available_to_request_text: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_pending_withdrawals_safe: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_pending_withdrawals_text: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_unified_user_id: { Args: { input_email: string }; Returns: string }
      get_user_balance_data: {
        Args: { user_email: string }
        Returns: {
          auth_user_id: string
          available_balance: number
          email: string
          name: string
          pending_withdrawals: number
          wallet_balance: number
        }[]
      }
      get_user_balance_safe: {
        Args: { user_email: string }
        Returns: {
          auth_user_id: string
          available_balance: number
          email: string
          name: string
          pending_withdrawals: number
          wallet_balance: number
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      get_wallet_balance_safe: { Args: { user_uuid: string }; Returns: number }
      get_wallet_balance_text: { Args: { user_uuid: string }; Returns: number }
      "great pearl": { Args: { conversation_id: string }; Returns: boolean }
      invalidate_other_sessions: {
        Args: { p_current_session_token: string; p_user_id: string }
        Returns: undefined
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_current_user_administrator: { Args: never; Returns: boolean }
      is_ip_whitelisted: { Args: { check_ip: string }; Returns: boolean }
      is_manager_or_above: { Args: never; Returns: boolean }
      is_supervisor_or_above: { Args: never; Returns: boolean }
      is_user_role: { Args: never; Returns: boolean }
      migrate_approved_assessments_to_finance: { Args: never; Returns: number }
      process_daily_salary_credits: { Args: never; Returns: Json }
      process_salary_credits_for_date: {
        Args: { target_date: string }
        Returns: Json
      }
      refresh_current_week_allowances: { Args: never; Returns: Json }
      trigger_daily_salary_processing: { Args: never; Returns: Json }
      user_has_permission: {
        Args: { permission_name: string }
        Returns: boolean
      }
      user_is_conversation_participant: {
        Args: { conversation_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "Super Admin"
        | "Administrator"
        | "Manager"
        | "User"
        | "Supervisor"
      expense_status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "POSTED"
      lot_finance_status: "READY_FOR_FINANCE" | "APPROVED_FOR_PAYMENT" | "PAID"
      payment_method: "CASH" | "CHEQUE" | "BANK_TRANSFER"
      payment_status: "PENDING_ADMIN_APPROVAL" | "POSTED" | "VOID"
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
      app_role: [
        "Super Admin",
        "Administrator",
        "Manager",
        "User",
        "Supervisor",
      ],
      expense_status: ["PENDING_APPROVAL", "APPROVED", "REJECTED", "POSTED"],
      lot_finance_status: ["READY_FOR_FINANCE", "APPROVED_FOR_PAYMENT", "PAID"],
      payment_method: ["CASH", "CHEQUE", "BANK_TRANSFER"],
      payment_status: ["PENDING_ADMIN_APPROVAL", "POSTED", "VOID"],
    },
  },
} as const
