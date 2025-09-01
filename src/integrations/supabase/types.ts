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
          created_at: string
          department: string
          disabled: boolean | null
          email: string
          emergency_contact: string | null
          employee_id: string | null
          id: string
          is_training_account: boolean | null
          join_date: string
          name: string
          permissions: string[]
          phone: string | null
          position: string
          role: string
          salary: number
          status: string
          training_progress: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          created_at?: string
          department: string
          disabled?: boolean | null
          email: string
          emergency_contact?: string | null
          employee_id?: string | null
          id?: string
          is_training_account?: boolean | null
          join_date?: string
          name: string
          permissions?: string[]
          phone?: string | null
          position: string
          role?: string
          salary?: number
          status?: string
          training_progress?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          created_at?: string
          department?: string
          disabled?: boolean | null
          email?: string
          emergency_contact?: string | null
          employee_id?: string | null
          id?: string
          is_training_account?: boolean | null
          join_date?: string
          name?: string
          permissions?: string[]
          phone?: string | null
          position?: string
          role?: string
          salary?: number
          status?: string
          training_progress?: number | null
          updated_at?: string
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
          sender_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          sender_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          sender_id?: string | null
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
        ]
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
      calculate_daily_salary_credit: {
        Args: { employee_salary: number }
        Returns: number
      }
      check_auth_user_exists: {
        Args: { user_uuid: string }
        Returns: Json
      }
      cleanup_inactive_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fix_denis_auth_final: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
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
      get_unified_user_id: {
        Args: { input_email: string }
        Returns: string
      }
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
      get_wallet_balance_safe: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_wallet_balance_text: {
        Args: { user_uuid: string }
        Returns: number
      }
      "great pearl": {
        Args: { conversation_id: string }
        Returns: boolean
      }
      invalidate_other_sessions: {
        Args: { p_current_session_token: string; p_user_id: string }
        Returns: undefined
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      process_daily_salary_credits: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      process_salary_credits_for_date: {
        Args: { target_date: string }
        Returns: Json
      }
      trigger_daily_salary_processing: {
        Args: Record<PropertyKey, never>
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
