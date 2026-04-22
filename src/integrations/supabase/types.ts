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
      absence_appeals: {
        Row: {
          appeal_reason: string | null
          appeal_status: string
          appeal_submitted_at: string | null
          created_at: string
          deduction_amount: number
          deduction_date: string
          employee_email: string
          employee_id: string
          employee_name: string
          id: string
          ledger_reference: string
          reason: string | null
          refund_ledger_reference: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sms_sent: boolean | null
          updated_at: string
        }
        Insert: {
          appeal_reason?: string | null
          appeal_status?: string
          appeal_submitted_at?: string | null
          created_at?: string
          deduction_amount?: number
          deduction_date: string
          employee_email: string
          employee_id: string
          employee_name: string
          id?: string
          ledger_reference: string
          reason?: string | null
          refund_ledger_reference?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sms_sent?: boolean | null
          updated_at?: string
        }
        Update: {
          appeal_reason?: string | null
          appeal_status?: string
          appeal_submitted_at?: string | null
          created_at?: string
          deduction_amount?: number
          deduction_date?: string
          employee_email?: string
          employee_id?: string
          employee_name?: string
          id?: string
          ledger_reference?: string
          reason?: string | null
          refund_ledger_reference?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sms_sent?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_initiated_withdrawals: {
        Row: {
          amount: number
          created_at: string
          employee_email: string
          employee_id: string
          employee_name: string
          id: string
          initiated_by: string
          initiated_by_name: string
          ledger_reference: string | null
          pin_code: string
          pin_expires_at: string
          reason: string
          status: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          employee_email: string
          employee_id: string
          employee_name: string
          id?: string
          initiated_by: string
          initiated_by_name: string
          ledger_reference?: string | null
          pin_code: string
          pin_expires_at: string
          reason: string
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          employee_email?: string
          employee_id?: string
          employee_name?: string
          id?: string
          initiated_by?: string
          initiated_by_name?: string
          ledger_reference?: string | null
          pin_code?: string
          pin_expires_at?: string
          reason?: string
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
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
          {
            foreignKeyName: "advance_recoveries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "supplier_payments_report"
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
          admin_final_approval: boolean | null
          admin_final_approval_at: string | null
          admin_final_approval_by: string | null
          amount: number
          approval_notes: string | null
          approval_stage: string | null
          created_at: string
          daterequested: string
          department: string
          description: string
          details: Json | null
          disbursement_account_name: string | null
          disbursement_account_number: string | null
          disbursement_bank_name: string | null
          disbursement_method: string | null
          disbursement_phone: string | null
          finance_approved: boolean | null
          finance_approved_at: string | null
          finance_approved_by: string | null
          finance_review_at: string | null
          finance_review_by: string | null
          finance_reviewed: boolean | null
          id: string
          payment_method: string | null
          priority: string
          rejection_comments: string | null
          rejection_reason: string | null
          requestedby: string
          requestedby_name: string | null
          requestedby_position: string | null
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
          admin_final_approval?: boolean | null
          admin_final_approval_at?: string | null
          admin_final_approval_by?: string | null
          amount: number
          approval_notes?: string | null
          approval_stage?: string | null
          created_at?: string
          daterequested: string
          department: string
          description: string
          details?: Json | null
          disbursement_account_name?: string | null
          disbursement_account_number?: string | null
          disbursement_bank_name?: string | null
          disbursement_method?: string | null
          disbursement_phone?: string | null
          finance_approved?: boolean | null
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          finance_review_at?: string | null
          finance_review_by?: string | null
          finance_reviewed?: boolean | null
          id?: string
          payment_method?: string | null
          priority?: string
          rejection_comments?: string | null
          rejection_reason?: string | null
          requestedby: string
          requestedby_name?: string | null
          requestedby_position?: string | null
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
          admin_final_approval?: boolean | null
          admin_final_approval_at?: string | null
          admin_final_approval_by?: string | null
          amount?: number
          approval_notes?: string | null
          approval_stage?: string | null
          created_at?: string
          daterequested?: string
          department?: string
          description?: string
          details?: Json | null
          disbursement_account_name?: string | null
          disbursement_account_number?: string | null
          disbursement_bank_name?: string | null
          disbursement_method?: string | null
          disbursement_phone?: string | null
          finance_approved?: boolean | null
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          finance_review_at?: string | null
          finance_review_by?: string | null
          finance_reviewed?: boolean | null
          id?: string
          payment_method?: string | null
          priority?: string
          rejection_comments?: string | null
          rejection_reason?: string | null
          requestedby?: string
          requestedby_name?: string | null
          requestedby_position?: string | null
          requires_three_approvals?: boolean | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
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
      attendance_time_records: {
        Row: {
          arrival_time: string | null
          created_at: string
          departure_time: string | null
          employee_email: string
          employee_id: string
          employee_name: string
          id: string
          is_late: boolean | null
          is_overtime: boolean | null
          late_minutes: number | null
          notes: string | null
          overtime_minutes: number | null
          record_date: string
          recorded_by: string
          standard_end: string
          standard_start: string
          status: string
          support_document_name: string | null
          support_document_url: string | null
          updated_at: string
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string
          departure_time?: string | null
          employee_email: string
          employee_id: string
          employee_name: string
          id?: string
          is_late?: boolean | null
          is_overtime?: boolean | null
          late_minutes?: number | null
          notes?: string | null
          overtime_minutes?: number | null
          record_date?: string
          recorded_by: string
          standard_end?: string
          standard_start?: string
          status?: string
          support_document_name?: string | null
          support_document_url?: string | null
          updated_at?: string
        }
        Update: {
          arrival_time?: string | null
          created_at?: string
          departure_time?: string | null
          employee_email?: string
          employee_id?: string
          employee_name?: string
          id?: string
          is_late?: boolean | null
          is_overtime?: boolean | null
          late_minutes?: number | null
          notes?: string | null
          overtime_minutes?: number | null
          record_date?: string
          recorded_by?: string
          standard_end?: string
          standard_start?: string
          status?: string
          support_document_name?: string | null
          support_document_url?: string | null
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
      bonuses: {
        Row: {
          allocated_at: string
          allocated_by: string
          amount: number
          claimed_at: string | null
          created_at: string
          employee_email: string
          employee_id: string
          employee_name: string
          id: string
          reason: string
          status: string
          updated_at: string
        }
        Insert: {
          allocated_at?: string
          allocated_by: string
          amount: number
          claimed_at?: string | null
          created_at?: string
          employee_email: string
          employee_id: string
          employee_name: string
          id?: string
          reason: string
          status?: string
          updated_at?: string
        }
        Update: {
          allocated_at?: string
          allocated_by?: string
          amount?: number
          claimed_at?: string | null
          created_at?: string
          employee_email?: string
          employee_id?: string
          employee_name?: string
          id?: string
          reason?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      buyer_contracts: {
        Row: {
          allocated_quantity: number
          buyer_address: string | null
          buyer_name: string
          buyer_phone: string | null
          buyer_ref: string | null
          contract_ref: string
          created_at: string
          created_by: string | null
          delivery_period_end: string | null
          delivery_period_start: string | null
          delivery_terms: string | null
          id: string
          notes: string | null
          packaging: string | null
          price_per_kg: number
          quality: string
          quality_terms: string | null
          seller_name: string | null
          status: string
          total_quantity: number
          updated_at: string
        }
        Insert: {
          allocated_quantity?: number
          buyer_address?: string | null
          buyer_name: string
          buyer_phone?: string | null
          buyer_ref?: string | null
          contract_ref: string
          created_at?: string
          created_by?: string | null
          delivery_period_end?: string | null
          delivery_period_start?: string | null
          delivery_terms?: string | null
          id?: string
          notes?: string | null
          packaging?: string | null
          price_per_kg: number
          quality: string
          quality_terms?: string | null
          seller_name?: string | null
          status?: string
          total_quantity: number
          updated_at?: string
        }
        Update: {
          allocated_quantity?: number
          buyer_address?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          buyer_ref?: string | null
          contract_ref?: string
          created_at?: string
          created_by?: string | null
          delivery_period_end?: string | null
          delivery_period_start?: string | null
          delivery_terms?: string | null
          id?: string
          notes?: string | null
          packaging?: string | null
          price_per_kg?: number
          quality?: string
          quality_terms?: string | null
          seller_name?: string | null
          status?: string
          total_quantity?: number
          updated_at?: string
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
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          category: string | null
          created_at: string
          current_balance: number
          description: string | null
          id: string
          is_active: boolean
          opening_balance: number
          parent_account_id: string | null
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          category?: string | null
          created_at?: string
          current_balance?: number
          description?: string | null
          id?: string
          is_active?: boolean
          opening_balance?: number
          parent_account_id?: string | null
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          category?: string | null
          created_at?: string
          current_balance?: number
          description?: string | null
          id?: string
          is_active?: boolean
          opening_balance?: number
          parent_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cheques: {
        Row: {
          amount: number
          bank_account: string | null
          cheque_number: string
          cleared_date: string | null
          created_at: string
          id: string
          issue_date: string
          notes: string | null
          payee_name: string
          purpose: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          bank_account?: string | null
          cheque_number: string
          cleared_date?: string | null
          created_at?: string
          id?: string
          issue_date: string
          notes?: string | null
          payee_name: string
          purpose?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account?: string | null
          cheque_number?: string
          cleared_date?: string | null
          created_at?: string
          id?: string
          issue_date?: string
          notes?: string | null
          payee_name?: string
          purpose?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      christmas_vouchers: {
        Row: {
          christmas_message: string
          claimed_at: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          employee_email: string
          employee_id: string
          employee_name: string
          id: string
          performance_rank: number
          performance_score: number
          status: string
          voucher_amount: number
          voucher_code: string
          year: number
        }
        Insert: {
          christmas_message: string
          claimed_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_email: string
          employee_id: string
          employee_name: string
          id?: string
          performance_rank: number
          performance_score: number
          status?: string
          voucher_amount: number
          voucher_code?: string
          year?: number
        }
        Update: {
          christmas_message?: string
          claimed_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_email?: string
          employee_id?: string
          employee_name?: string
          id?: string
          performance_rank?: number
          performance_score?: number
          status?: string
          voucher_amount?: number
          voucher_code?: string
          year?: number
        }
        Relationships: []
      }
      coffee_booking_deliveries: {
        Row: {
          booking_id: string
          coffee_record_id: string | null
          created_at: string
          created_by: string
          delivered_kg: number
          delivery_date: string
          id: string
          notes: string | null
        }
        Insert: {
          booking_id: string
          coffee_record_id?: string | null
          created_at?: string
          created_by: string
          delivered_kg: number
          delivery_date?: string
          id?: string
          notes?: string | null
        }
        Update: {
          booking_id?: string
          coffee_record_id?: string | null
          created_at?: string
          created_by?: string
          delivered_kg?: number
          delivery_date?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coffee_booking_deliveries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "coffee_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_bookings: {
        Row: {
          booked_price_per_kg: number
          booked_quantity_kg: number
          booking_date: string
          coffee_type: string
          created_at: string
          created_by: string
          delivered_quantity_kg: number
          expected_delivery_date: string | null
          expiry_date: string
          id: string
          notes: string | null
          remaining_quantity_kg: number | null
          status: string
          supplier_id: string | null
          supplier_name: string
          supplier_phone: string | null
          updated_at: string
        }
        Insert: {
          booked_price_per_kg: number
          booked_quantity_kg: number
          booking_date?: string
          coffee_type: string
          created_at?: string
          created_by: string
          delivered_quantity_kg?: number
          expected_delivery_date?: string | null
          expiry_date: string
          id?: string
          notes?: string | null
          remaining_quantity_kg?: number | null
          status?: string
          supplier_id?: string | null
          supplier_name: string
          supplier_phone?: string | null
          updated_at?: string
        }
        Update: {
          booked_price_per_kg?: number
          booked_quantity_kg?: number
          booking_date?: string
          coffee_type?: string
          created_at?: string
          created_by?: string
          delivered_quantity_kg?: number
          expected_delivery_date?: string | null
          expiry_date?: string
          id?: string
          notes?: string | null
          remaining_quantity_kg?: number | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string
          supplier_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coffee_bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coffee_bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_records: {
        Row: {
          bags: number
          batch_number: string
          coffee_type: string
          created_at: string
          created_by: string | null
          date: string
          discretion_bought: boolean | null
          grn_printed_at: string | null
          grn_printed_by: string | null
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
          discretion_bought?: boolean | null
          grn_printed_at?: string | null
          grn_printed_by?: string | null
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
          discretion_bought?: boolean | null
          grn_printed_at?: string | null
          grn_printed_by?: string | null
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
            referencedRelation: "supplier_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coffee_records_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_allocations: {
        Row: {
          allocated_by: string
          allocated_kg: number
          contract_id: string
          created_at: string | null
          id: string
          notes: string | null
          sale_id: string
        }
        Insert: {
          allocated_by: string
          allocated_kg: number
          contract_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          sale_id: string
        }
        Update: {
          allocated_by?: string
          allocated_kg?: number
          contract_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_allocations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "buyer_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_allocations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id"]
          },
        ]
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
          buyer_contract_id: string | null
          buyer_ref: string
          contract_type: string | null
          created_at: string | null
          file_name: string
          file_url: string
          id: string
          status: string
          uploaded_at: string | null
        }
        Insert: {
          buyer: string
          buyer_contract_id?: string | null
          buyer_ref: string
          contract_type?: string | null
          created_at?: string | null
          file_name: string
          file_url: string
          id?: string
          status?: string
          uploaded_at?: string | null
        }
        Update: {
          buyer?: string
          buyer_contract_id?: string | null
          buyer_ref?: string
          contract_type?: string | null
          created_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          status?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_files_buyer_contract_id_fkey"
            columns: ["buyer_contract_id"]
            isOneToOne: false
            referencedRelation: "buyer_contracts"
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
      defect_library: {
        Row: {
          added_by: string
          category: string
          created_at: string | null
          defect_name: string
          description: string | null
          id: string
          image_url: string | null
          severity: string
          updated_at: string | null
        }
        Insert: {
          added_by: string
          category: string
          created_at?: string | null
          defect_name: string
          description?: string | null
          id?: string
          image_url?: string | null
          severity?: string
          updated_at?: string | null
        }
        Update: {
          added_by?: string
          category?: string
          created_at?: string | null
          defect_name?: string
          description?: string | null
          id?: string
          image_url?: string | null
          severity?: string
          updated_at?: string | null
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
      device_sessions: {
        Row: {
          auth_user_id: string | null
          browser: string | null
          created_at: string | null
          device_fingerprint: string
          first_seen_at: string | null
          id: string
          is_trusted: boolean | null
          last_seen_at: string | null
          os: string | null
          token_expires_at: string | null
          token_used_at: string | null
          user_agent: string | null
          user_email: string
          verification_token: string | null
        }
        Insert: {
          auth_user_id?: string | null
          browser?: string | null
          created_at?: string | null
          device_fingerprint: string
          first_seen_at?: string | null
          id?: string
          is_trusted?: boolean | null
          last_seen_at?: string | null
          os?: string | null
          token_expires_at?: string | null
          token_used_at?: string | null
          user_agent?: string | null
          user_email: string
          verification_token?: string | null
        }
        Update: {
          auth_user_id?: string | null
          browser?: string | null
          created_at?: string | null
          device_fingerprint?: string
          first_seen_at?: string | null
          id?: string
          is_trusted?: boolean | null
          last_seen_at?: string | null
          os?: string | null
          token_expires_at?: string | null
          token_used_at?: string | null
          user_agent?: string | null
          user_email?: string
          verification_token?: string | null
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
      email_verification_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      employee_contracts: {
        Row: {
          contract_duration_months: number | null
          contract_end_date: string | null
          contract_start_date: string
          contract_type: string
          created_at: string | null
          created_by: string | null
          department: string
          document_url: string | null
          employee_email: string
          employee_gac_id: string | null
          employee_id: string
          employee_name: string
          id: string
          notes: string | null
          position: string
          renewal_count: number | null
          renewed_from_id: string | null
          salary: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          contract_duration_months?: number | null
          contract_end_date?: string | null
          contract_start_date: string
          contract_type?: string
          created_at?: string | null
          created_by?: string | null
          department: string
          document_url?: string | null
          employee_email: string
          employee_gac_id?: string | null
          employee_id: string
          employee_name: string
          id?: string
          notes?: string | null
          position: string
          renewal_count?: number | null
          renewed_from_id?: string | null
          salary?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          contract_duration_months?: number | null
          contract_end_date?: string | null
          contract_start_date?: string
          contract_type?: string
          created_at?: string | null
          created_by?: string | null
          department?: string
          document_url?: string | null
          employee_email?: string
          employee_gac_id?: string | null
          employee_id?: string
          employee_name?: string
          id?: string
          notes?: string | null
          position?: string
          renewal_count?: number | null
          renewed_from_id?: string | null
          salary?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_contracts_renewed_from_id_fkey"
            columns: ["renewed_from_id"]
            isOneToOne: false
            referencedRelation: "employee_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_daily_reports: {
        Row: {
          created_at: string
          department: string
          employee_email: string
          employee_id: string
          employee_name: string
          id: string
          report_data: Json
          report_date: string
          report_number: number | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department: string
          employee_email: string
          employee_id: string
          employee_name: string
          id?: string
          report_data?: Json
          report_date?: string
          report_number?: number | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          employee_email?: string
          employee_id?: string
          employee_name?: string
          id?: string
          report_data?: Json
          report_date?: string
          report_number?: number | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employee_login_tracker: {
        Row: {
          auth_user_id: string
          created_at: string
          employee_email: string | null
          employee_id: string | null
          employee_name: string | null
          id: string
          login_date: string
          login_time: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          employee_email?: string | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          login_date?: string
          login_time?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          employee_email?: string | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          login_date?: string
          login_time?: string
        }
        Relationships: []
      }
      employee_of_the_month: {
        Row: {
          bonus_amount: number | null
          bonus_awarded: boolean | null
          created_at: string
          created_by: string | null
          department: string | null
          email_scheduled_at: string | null
          email_sent: boolean | null
          employee_avatar_url: string | null
          employee_email: string
          employee_id: string
          employee_name: string
          id: string
          is_active: boolean | null
          month: number
          position: string | null
          rank: number
          reason: string | null
          year: number
        }
        Insert: {
          bonus_amount?: number | null
          bonus_awarded?: boolean | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email_scheduled_at?: string | null
          email_sent?: boolean | null
          employee_avatar_url?: string | null
          employee_email: string
          employee_id: string
          employee_name: string
          id?: string
          is_active?: boolean | null
          month: number
          position?: string | null
          rank?: number
          reason?: string | null
          year: number
        }
        Update: {
          bonus_amount?: number | null
          bonus_awarded?: boolean | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email_scheduled_at?: string | null
          email_sent?: boolean | null
          employee_avatar_url?: string | null
          employee_email?: string
          employee_id?: string
          employee_name?: string
          id?: string
          is_active?: boolean | null
          month?: number
          position?: string | null
          rank?: number
          reason?: string | null
          year?: number
        }
        Relationships: []
      }
      employee_salary_advances: {
        Row: {
          created_at: string
          created_by: string | null
          employee_email: string
          employee_name: string
          id: string
          minimum_payment: number
          original_amount: number
          reason: string | null
          remaining_balance: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_email: string
          employee_name: string
          id?: string
          minimum_payment?: number
          original_amount: number
          reason?: string | null
          remaining_balance: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_email?: string
          employee_name?: string
          id?: string
          minimum_payment?: number
          original_amount?: number
          reason?: string | null
          remaining_balance?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_salary_payments: {
        Row: {
          advance_deduction: number
          advance_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          employee_email: string
          employee_id: string
          employee_name: string
          employee_phone: string | null
          gross_salary: number
          id: string
          net_salary: number
          notes: string | null
          payment_label: string | null
          payment_method: string
          payment_month: string
          processed_by: string
          processed_by_email: string
          salary_amount: number
          sms_sent: boolean | null
          status: string
          time_deduction: number
          time_deduction_hours: number
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          advance_deduction?: number
          advance_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_email: string
          employee_id: string
          employee_name: string
          employee_phone?: string | null
          gross_salary?: number
          id?: string
          net_salary?: number
          notes?: string | null
          payment_label?: string | null
          payment_method?: string
          payment_month: string
          processed_by: string
          processed_by_email: string
          salary_amount?: number
          sms_sent?: boolean | null
          status?: string
          time_deduction?: number
          time_deduction_hours?: number
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          advance_deduction?: number
          advance_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_email?: string
          employee_id?: string
          employee_name?: string
          employee_phone?: string | null
          gross_salary?: number
          id?: string
          net_salary?: number
          notes?: string | null
          payment_label?: string | null
          payment_method?: string
          payment_month?: string
          processed_by?: string
          processed_by_email?: string
          salary_amount?: number
          sms_sent?: boolean | null
          status?: string
          time_deduction?: number
          time_deduction_hours?: number
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          account_name: string | null
          account_number: string | null
          address: string | null
          alternative_bank: string | null
          auth_user_id: string | null
          avatar_url: string | null
          bank_email: string | null
          bank_name: string | null
          bank_phone: string | null
          bypass_sms_verification: boolean | null
          created_at: string
          date_of_birth: string | null
          department: string
          disabled: boolean | null
          disabled_at: string | null
          disabled_reason: string | null
          district: string | null
          email: string
          emergency_contact: string | null
          employee_id: string | null
          gender: string | null
          id: string
          is_training_account: boolean | null
          join_date: string
          last_notified_role: string | null
          marital_status: string | null
          name: string
          national_id_name: string | null
          national_id_number: string | null
          next_of_kin_name: string | null
          next_of_kin_phone: string | null
          next_of_kin_relationship: string | null
          permissions: string[]
          phone: string | null
          position: string
          profile_completed: boolean | null
          role: string
          role_notification_shown_at: string | null
          salary: number
          status: string
          training_progress: number | null
          tribe: string | null
          updated_at: string
          wallet_frozen: boolean | null
          wallet_frozen_at: string | null
          wallet_frozen_by: string | null
          wallet_frozen_reason: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          address?: string | null
          alternative_bank?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          bank_email?: string | null
          bank_name?: string | null
          bank_phone?: string | null
          bypass_sms_verification?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          department: string
          disabled?: boolean | null
          disabled_at?: string | null
          disabled_reason?: string | null
          district?: string | null
          email: string
          emergency_contact?: string | null
          employee_id?: string | null
          gender?: string | null
          id?: string
          is_training_account?: boolean | null
          join_date?: string
          last_notified_role?: string | null
          marital_status?: string | null
          name: string
          national_id_name?: string | null
          national_id_number?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          permissions?: string[]
          phone?: string | null
          position: string
          profile_completed?: boolean | null
          role?: string
          role_notification_shown_at?: string | null
          salary?: number
          status?: string
          training_progress?: number | null
          tribe?: string | null
          updated_at?: string
          wallet_frozen?: boolean | null
          wallet_frozen_at?: string | null
          wallet_frozen_by?: string | null
          wallet_frozen_reason?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          address?: string | null
          alternative_bank?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          bank_email?: string | null
          bank_name?: string | null
          bank_phone?: string | null
          bypass_sms_verification?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          department?: string
          disabled?: boolean | null
          disabled_at?: string | null
          disabled_reason?: string | null
          district?: string | null
          email?: string
          emergency_contact?: string | null
          employee_id?: string | null
          gender?: string | null
          id?: string
          is_training_account?: boolean | null
          join_date?: string
          last_notified_role?: string | null
          marital_status?: string | null
          name?: string
          national_id_name?: string | null
          national_id_number?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          permissions?: string[]
          phone?: string | null
          position?: string
          profile_completed?: boolean | null
          role?: string
          role_notification_shown_at?: string | null
          salary?: number
          status?: string
          training_progress?: number | null
          tribe?: string | null
          updated_at?: string
          wallet_frozen?: boolean | null
          wallet_frozen_at?: string | null
          wallet_frozen_by?: string | null
          wallet_frozen_reason?: string | null
        }
        Relationships: []
      }
      eudr_batch_sales: {
        Row: {
          attached_by: string
          batch_id: string
          created_at: string
          id: string
          kilograms_allocated: number
          notes: string | null
          sale_transaction_id: string
        }
        Insert: {
          attached_by: string
          batch_id: string
          created_at?: string
          id?: string
          kilograms_allocated?: number
          notes?: string | null
          sale_transaction_id: string
        }
        Update: {
          attached_by?: string
          batch_id?: string
          created_at?: string
          id?: string
          kilograms_allocated?: number
          notes?: string | null
          sale_transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eudr_batch_sales_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "eudr_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eudr_batch_sales_sale_transaction_id_fkey"
            columns: ["sale_transaction_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id"]
          },
        ]
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
      eudr_dispatch_reports: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          bags_deducted: number | null
          buyer_quality_remarks: string | null
          buyer_verification: Json
          coffee_type: string
          created_at: string
          created_by: string
          created_by_name: string
          deduction_reasons: string[] | null
          destination_buyer: string
          dispatch_date: string
          dispatch_location: string
          dispatch_supervisor: string
          id: string
          quality_checked_by_buyer: boolean | null
          remarks: string | null
          status: string
          total_deducted_weight: number | null
          trucks: Json
          updated_at: string
          vehicle_registrations: string | null
          weighbridge_tickets: Json | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          bags_deducted?: number | null
          buyer_quality_remarks?: string | null
          buyer_verification?: Json
          coffee_type: string
          created_at?: string
          created_by: string
          created_by_name: string
          deduction_reasons?: string[] | null
          destination_buyer: string
          dispatch_date: string
          dispatch_location: string
          dispatch_supervisor: string
          id?: string
          quality_checked_by_buyer?: boolean | null
          remarks?: string | null
          status?: string
          total_deducted_weight?: number | null
          trucks?: Json
          updated_at?: string
          vehicle_registrations?: string | null
          weighbridge_tickets?: Json | null
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          bags_deducted?: number | null
          buyer_quality_remarks?: string | null
          buyer_verification?: Json
          coffee_type?: string
          created_at?: string
          created_by?: string
          created_by_name?: string
          deduction_reasons?: string[] | null
          destination_buyer?: string
          dispatch_date?: string
          dispatch_location?: string
          dispatch_supervisor?: string
          id?: string
          quality_checked_by_buyer?: boolean | null
          remarks?: string | null
          status?: string
          total_deducted_weight?: number | null
          trucks?: Json
          updated_at?: string
          vehicle_registrations?: string | null
          weighbridge_tickets?: Json | null
        }
        Relationships: []
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
      expense_categories: {
        Row: {
          cost_centre: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          cost_centre?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          cost_centre?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
      field_assessment_prices: {
        Row: {
          assessment_id: string | null
          coffee_type: string
          common_price_ugx: number | null
          created_at: string | null
          highest_price_ugx: number | null
          id: string
          lowest_price_ugx: number | null
          notes: string | null
          who_is_buying: string | null
        }
        Insert: {
          assessment_id?: string | null
          coffee_type: string
          common_price_ugx?: number | null
          created_at?: string | null
          highest_price_ugx?: number | null
          id?: string
          lowest_price_ugx?: number | null
          notes?: string | null
          who_is_buying?: string | null
        }
        Update: {
          assessment_id?: string | null
          coffee_type?: string
          common_price_ugx?: number | null
          created_at?: string | null
          highest_price_ugx?: number | null
          id?: string
          lowest_price_ugx?: number | null
          notes?: string | null
          who_is_buying?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_assessment_prices_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "field_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      field_assessment_suppliers: {
        Row: {
          assessment_id: string | null
          created_at: string | null
          estimated_kgs: number | null
          expected_selling_date: string | null
          id: string
          phone: string | null
          supplier_name: string
          village: string | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string | null
          estimated_kgs?: number | null
          expected_selling_date?: string | null
          id?: string
          phone?: string | null
          supplier_name: string
          village?: string | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string | null
          estimated_kgs?: number | null
          expected_selling_date?: string | null
          id?: string
          phone?: string | null
          supplier_name?: string
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_assessment_suppliers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "field_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      field_assessment_traders: {
        Row: {
          assessment_id: string | null
          contact: string | null
          created_at: string | null
          id: string
          notes: string | null
          trader_name: string
        }
        Insert: {
          assessment_id?: string | null
          contact?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          trader_name: string
        }
        Update: {
          assessment_id?: string | null
          contact?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          trader_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_assessment_traders_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "field_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      field_assessments: {
        Row: {
          area_village: string
          coffee_on_trees_percent: number | null
          coffee_variety: string | null
          common_defects: string | null
          competitor_names: string | null
          competitor_price_advantage: string | null
          competitors_active: boolean | null
          contamination_risk: string | null
          created_at: string | null
          crop_condition: string | null
          district: string | null
          drying_method: string | null
          end_time: string | null
          estimated_harvest_potential_kg: number | null
          expected_peak_harvest: string | null
          farmer_action_advised: string | null
          farmer_group_association: string | null
          farmers_visited: number | null
          farmers_willing_reason: string | null
          farmers_willing_to_sell: string | null
          gps_landmark: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          green_bean_available_kg: number | null
          harvest_handling_method: string | null
          harvest_ongoing: boolean | null
          id: string
          key_risks: string | null
          market_behavior_notes: string | null
          new_suppliers_identified: number | null
          next_followup_date: string | null
          opportunities: string | null
          pest_disease_level: string | null
          pest_disease_names: string | null
          photo_references: string | null
          photos_taken: boolean | null
          prepared_by: string
          prepared_by_signature: string | null
          price_manipulation: boolean | null
          price_movement: string | null
          price_movement_reason: string | null
          quality_recommendations: string | null
          recommended_action: string | null
          recommended_buying_price_ugx: number | null
          reviewed_by_supervisor: string | null
          sample_reference_code: string | null
          sample_type_weight: string | null
          samples_collected: boolean | null
          soil_condition: string | null
          soil_testing_locations: string | null
          start_time: string | null
          status: string | null
          storage_method: string | null
          sub_county: string | null
          submitted_by: string | null
          supervisor_signature: string | null
          team_members: string
          traders_active: boolean | null
          updated_at: string | null
          visit_date: string
        }
        Insert: {
          area_village: string
          coffee_on_trees_percent?: number | null
          coffee_variety?: string | null
          common_defects?: string | null
          competitor_names?: string | null
          competitor_price_advantage?: string | null
          competitors_active?: boolean | null
          contamination_risk?: string | null
          created_at?: string | null
          crop_condition?: string | null
          district?: string | null
          drying_method?: string | null
          end_time?: string | null
          estimated_harvest_potential_kg?: number | null
          expected_peak_harvest?: string | null
          farmer_action_advised?: string | null
          farmer_group_association?: string | null
          farmers_visited?: number | null
          farmers_willing_reason?: string | null
          farmers_willing_to_sell?: string | null
          gps_landmark?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          green_bean_available_kg?: number | null
          harvest_handling_method?: string | null
          harvest_ongoing?: boolean | null
          id?: string
          key_risks?: string | null
          market_behavior_notes?: string | null
          new_suppliers_identified?: number | null
          next_followup_date?: string | null
          opportunities?: string | null
          pest_disease_level?: string | null
          pest_disease_names?: string | null
          photo_references?: string | null
          photos_taken?: boolean | null
          prepared_by: string
          prepared_by_signature?: string | null
          price_manipulation?: boolean | null
          price_movement?: string | null
          price_movement_reason?: string | null
          quality_recommendations?: string | null
          recommended_action?: string | null
          recommended_buying_price_ugx?: number | null
          reviewed_by_supervisor?: string | null
          sample_reference_code?: string | null
          sample_type_weight?: string | null
          samples_collected?: boolean | null
          soil_condition?: string | null
          soil_testing_locations?: string | null
          start_time?: string | null
          status?: string | null
          storage_method?: string | null
          sub_county?: string | null
          submitted_by?: string | null
          supervisor_signature?: string | null
          team_members: string
          traders_active?: boolean | null
          updated_at?: string | null
          visit_date?: string
        }
        Update: {
          area_village?: string
          coffee_on_trees_percent?: number | null
          coffee_variety?: string | null
          common_defects?: string | null
          competitor_names?: string | null
          competitor_price_advantage?: string | null
          competitors_active?: boolean | null
          contamination_risk?: string | null
          created_at?: string | null
          crop_condition?: string | null
          district?: string | null
          drying_method?: string | null
          end_time?: string | null
          estimated_harvest_potential_kg?: number | null
          expected_peak_harvest?: string | null
          farmer_action_advised?: string | null
          farmer_group_association?: string | null
          farmers_visited?: number | null
          farmers_willing_reason?: string | null
          farmers_willing_to_sell?: string | null
          gps_landmark?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          green_bean_available_kg?: number | null
          harvest_handling_method?: string | null
          harvest_ongoing?: boolean | null
          id?: string
          key_risks?: string | null
          market_behavior_notes?: string | null
          new_suppliers_identified?: number | null
          next_followup_date?: string | null
          opportunities?: string | null
          pest_disease_level?: string | null
          pest_disease_names?: string | null
          photo_references?: string | null
          photos_taken?: boolean | null
          prepared_by?: string
          prepared_by_signature?: string | null
          price_manipulation?: boolean | null
          price_movement?: string | null
          price_movement_reason?: string | null
          quality_recommendations?: string | null
          recommended_action?: string | null
          recommended_buying_price_ugx?: number | null
          reviewed_by_supervisor?: string | null
          sample_reference_code?: string | null
          sample_type_weight?: string | null
          samples_collected?: boolean | null
          soil_condition?: string | null
          soil_testing_locations?: string | null
          start_time?: string | null
          status?: string | null
          storage_method?: string | null
          sub_county?: string | null
          submitted_by?: string | null
          supervisor_signature?: string | null
          team_members?: string
          traders_active?: boolean | null
          updated_at?: string | null
          visit_date?: string
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
          singleton: boolean
          updated_by: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          id?: string
          last_updated?: string
          singleton?: boolean
          updated_by: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          id?: string
          last_updated?: string
          singleton?: boolean
          updated_by?: string
        }
        Relationships: []
      }
      finance_cash_transactions: {
        Row: {
          amount: number
          approval_role: string | null
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
          approval_role?: string | null
          balance_after?: number
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
          approval_role?: string | null
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
          batch_number: string | null
          coffee_record_id: string | null
          created_at: string
          finance_notes: string | null
          finance_status: Database["public"]["Enums"]["lot_finance_status"]
          grn_file_name: string | null
          grn_file_url: string | null
          grn_number: string | null
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
          batch_number?: string | null
          coffee_record_id?: string | null
          created_at?: string
          finance_notes?: string | null
          finance_status?: Database["public"]["Enums"]["lot_finance_status"]
          grn_file_name?: string | null
          grn_file_url?: string | null
          grn_number?: string | null
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
          batch_number?: string | null
          coffee_record_id?: string | null
          created_at?: string
          finance_notes?: string | null
          finance_status?: Database["public"]["Enums"]["lot_finance_status"]
          grn_file_name?: string | null
          grn_file_url?: string | null
          grn_number?: string | null
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
            referencedRelation: "supplier_balances"
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
          approval_request_id: string | null
          category: string
          created_at: string
          date: string
          department: string | null
          description: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          approval_request_id?: string | null
          category: string
          created_at?: string
          date: string
          department?: string | null
          description: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approval_request_id?: string | null
          category?: string
          created_at?: string
          date?: string
          department?: string | null
          description?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_expenses_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
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
      gosentepay_balance: {
        Row: {
          balance: number
          created_at: string
          id: string
          last_transaction_ref: string | null
          last_transaction_type: string | null
          last_updated_by: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          last_transaction_ref?: string | null
          last_transaction_type?: string | null
          last_updated_by?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          last_transaction_ref?: string | null
          last_transaction_type?: string | null
          last_updated_by?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gosentepay_balance_log: {
        Row: {
          change_amount: number
          change_type: string
          created_at: string
          created_by: string | null
          id: string
          new_balance: number
          notes: string | null
          previous_balance: number
          reference: string | null
        }
        Insert: {
          change_amount: number
          change_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_balance: number
          notes?: string | null
          previous_balance: number
          reference?: string | null
        }
        Update: {
          change_amount?: number
          change_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_balance?: number
          notes?: string | null
          previous_balance?: number
          reference?: string | null
        }
        Relationships: []
      }
      instant_withdrawals: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          id: string
          ledger_reference: string | null
          payout_ref: string | null
          payout_status: string | null
          phone_number: string
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          ledger_reference?: string | null
          payout_ref?: string | null
          payout_status?: string | null
          phone_number: string
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          ledger_reference?: string | null
          payout_ref?: string | null
          payout_status?: string | null
          phone_number?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_batch_sales: {
        Row: {
          batch_id: string
          created_at: string
          customer_name: string | null
          id: string
          kilograms_deducted: number
          sale_date: string
          sale_transaction_id: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          customer_name?: string | null
          id?: string
          kilograms_deducted: number
          sale_date?: string
          sale_transaction_id?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          customer_name?: string | null
          id?: string
          kilograms_deducted?: number
          sale_date?: string
          sale_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batch_sales_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batch_sales_sale_transaction_id_fkey"
            columns: ["sale_transaction_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_batch_sources: {
        Row: {
          batch_id: string
          coffee_record_id: string
          created_at: string
          eudr_batch_id: string | null
          eudr_document_id: string | null
          eudr_traced: boolean | null
          eudr_traced_at: string | null
          id: string
          kilograms: number
          purchase_date: string
          supplier_name: string
        }
        Insert: {
          batch_id: string
          coffee_record_id: string
          created_at?: string
          eudr_batch_id?: string | null
          eudr_document_id?: string | null
          eudr_traced?: boolean | null
          eudr_traced_at?: string | null
          id?: string
          kilograms: number
          purchase_date: string
          supplier_name: string
        }
        Update: {
          batch_id?: string
          coffee_record_id?: string
          created_at?: string
          eudr_batch_id?: string | null
          eudr_document_id?: string | null
          eudr_traced?: boolean | null
          eudr_traced_at?: string | null
          id?: string
          kilograms?: number
          purchase_date?: string
          supplier_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batch_sources_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batch_sources_eudr_batch_id_fkey"
            columns: ["eudr_batch_id"]
            isOneToOne: false
            referencedRelation: "eudr_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batch_sources_eudr_document_id_fkey"
            columns: ["eudr_document_id"]
            isOneToOne: false
            referencedRelation: "eudr_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_batches: {
        Row: {
          batch_code: string
          batch_date: string
          coffee_type: string
          created_at: string
          id: string
          remaining_kilograms: number
          sold_out_at: string | null
          status: string
          target_capacity: number
          total_kilograms: number
          updated_at: string
        }
        Insert: {
          batch_code: string
          batch_date?: string
          coffee_type: string
          created_at?: string
          id?: string
          remaining_kilograms?: number
          sold_out_at?: string | null
          status?: string
          target_capacity?: number
          total_kilograms?: number
          updated_at?: string
        }
        Update: {
          batch_code?: string
          batch_date?: string
          coffee_type?: string
          created_at?: string
          id?: string
          remaining_kilograms?: number
          sold_out_at?: string | null
          status?: string
          target_capacity?: number
          total_kilograms?: number
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
      investments: {
        Row: {
          amount: number
          created_at: string
          earned_interest: number
          employee_name: string
          id: string
          interest_rate: number
          maturity_date: string
          maturity_months: number
          reduced_rate: number
          start_date: string
          status: string
          total_payout: number
          updated_at: string
          user_email: string
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          earned_interest?: number
          employee_name?: string
          id?: string
          interest_rate?: number
          maturity_date?: string
          maturity_months?: number
          reduced_rate?: number
          start_date?: string
          status?: string
          total_payout?: number
          updated_at?: string
          user_email: string
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          earned_interest?: number
          employee_name?: string
          id?: string
          interest_rate?: number
          maturity_date?: string
          maturity_months?: number
          reduced_rate?: number
          start_date?: string
          status?: string
          total_payout?: number
          updated_at?: string
          user_email?: string
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_paid: number
          balance: number
          created_at: string
          customer_name: string
          description: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          balance?: number
          created_at?: string
          customer_name: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          balance?: number
          created_at?: string
          customer_name?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applicant_name: string
          created_at: string
          created_by: string
          cv_filename: string | null
          cv_url: string | null
          email: string | null
          id: string
          job_applied_for: string
          notes: string | null
          phone: string
          ref_code: string
          status: string
          updated_at: string
        }
        Insert: {
          applicant_name: string
          created_at?: string
          created_by: string
          cv_filename?: string | null
          cv_url?: string | null
          email?: string | null
          id?: string
          job_applied_for: string
          notes?: string | null
          phone: string
          ref_code: string
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_name?: string
          created_at?: string
          created_by?: string
          cv_filename?: string | null
          cv_url?: string | null
          email?: string | null
          id?: string
          job_applied_for?: string
          notes?: string | null
          phone?: string
          ref_code?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          id: string
          reference: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          reference?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          reference?: string | null
        }
        Relationships: []
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          credit: number
          debit: number
          id: string
          journal_entry_id: string
          line_description: string | null
        }
        Insert: {
          account_id: string
          credit?: number
          debit?: number
          id?: string
          journal_entry_id: string
          line_description?: string | null
        }
        Update: {
          account_id?: string
          credit?: number
          debit?: number
          id?: string
          journal_entry_id?: string
          line_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount: number
          created_at: string
          entry_type: string
          id: string
          metadata: Json | null
          reference: string
          source_category: string | null
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
          source_category?: string | null
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
          source_category?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loan_repayments: {
        Row: {
          amount_due: number
          amount_paid: number | null
          created_at: string
          deducted_from: string | null
          due_date: string
          id: string
          installment_number: number
          loan_id: string
          overdue_days: number | null
          paid_date: string | null
          payment_reference: string | null
          penalty_applied: number | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          created_at?: string
          deducted_from?: string | null
          due_date: string
          id?: string
          installment_number: number
          loan_id: string
          overdue_days?: number | null
          paid_date?: string | null
          payment_reference?: string | null
          penalty_applied?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          created_at?: string
          deducted_from?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          loan_id?: string
          overdue_days?: number | null
          paid_date?: string | null
          payment_reference?: string | null
          penalty_applied?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          admin_approved: boolean | null
          admin_approved_at: string | null
          admin_approved_by: string | null
          admin_rejection_reason: string | null
          counter_offer_amount: number | null
          counter_offer_at: string | null
          counter_offer_by: string | null
          counter_offer_comments: string | null
          created_at: string
          daily_interest_rate: number | null
          disbursed_amount: number | null
          duration_months: number
          employee_email: string
          employee_id: string
          employee_name: string
          employee_phone: string | null
          end_date: string | null
          guarantor_approval_code: string | null
          guarantor_approved: boolean | null
          guarantor_approved_at: string | null
          guarantor_declined: boolean | null
          guarantor_email: string | null
          guarantor_id: string | null
          guarantor_name: string | null
          guarantor_phone: string | null
          id: string
          interest_rate: number
          is_defaulted: boolean | null
          is_topup: boolean | null
          loan_amount: number
          loan_type: string
          missed_installments: number | null
          monthly_installment: number
          next_deduction_date: string | null
          original_loan_amount: number | null
          paid_amount: number | null
          parent_loan_id: string | null
          penalty_amount: number | null
          remaining_balance: number
          repayment_frequency: string
          start_date: string | null
          status: string
          total_repayable: number
          total_weeks: number | null
          updated_at: string
          weekly_installment: number | null
        }
        Insert: {
          admin_approved?: boolean | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_rejection_reason?: string | null
          counter_offer_amount?: number | null
          counter_offer_at?: string | null
          counter_offer_by?: string | null
          counter_offer_comments?: string | null
          created_at?: string
          daily_interest_rate?: number | null
          disbursed_amount?: number | null
          duration_months: number
          employee_email: string
          employee_id: string
          employee_name: string
          employee_phone?: string | null
          end_date?: string | null
          guarantor_approval_code?: string | null
          guarantor_approved?: boolean | null
          guarantor_approved_at?: string | null
          guarantor_declined?: boolean | null
          guarantor_email?: string | null
          guarantor_id?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          id?: string
          interest_rate: number
          is_defaulted?: boolean | null
          is_topup?: boolean | null
          loan_amount: number
          loan_type?: string
          missed_installments?: number | null
          monthly_installment: number
          next_deduction_date?: string | null
          original_loan_amount?: number | null
          paid_amount?: number | null
          parent_loan_id?: string | null
          penalty_amount?: number | null
          remaining_balance: number
          repayment_frequency?: string
          start_date?: string | null
          status?: string
          total_repayable: number
          total_weeks?: number | null
          updated_at?: string
          weekly_installment?: number | null
        }
        Update: {
          admin_approved?: boolean | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_rejection_reason?: string | null
          counter_offer_amount?: number | null
          counter_offer_at?: string | null
          counter_offer_by?: string | null
          counter_offer_comments?: string | null
          created_at?: string
          daily_interest_rate?: number | null
          disbursed_amount?: number | null
          duration_months?: number
          employee_email?: string
          employee_id?: string
          employee_name?: string
          employee_phone?: string | null
          end_date?: string | null
          guarantor_approval_code?: string | null
          guarantor_approved?: boolean | null
          guarantor_approved_at?: string | null
          guarantor_declined?: boolean | null
          guarantor_email?: string | null
          guarantor_id?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          id?: string
          interest_rate?: number
          is_defaulted?: boolean | null
          is_topup?: boolean | null
          loan_amount?: number
          loan_type?: string
          missed_installments?: number | null
          monthly_installment?: number
          next_deduction_date?: string | null
          original_loan_amount?: number | null
          paid_amount?: number | null
          parent_loan_id?: string | null
          penalty_amount?: number | null
          remaining_balance?: number
          repayment_frequency?: string
          start_date?: string | null
          status?: string
          total_repayable?: number
          total_weeks?: number | null
          updated_at?: string
          weekly_installment?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loans_parent_loan_id_fkey"
            columns: ["parent_loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      location_tracking_logs: {
        Row: {
          created_at: string
          device_model: string | null
          employee_email: string | null
          employee_name: string | null
          id: string
          ip_address: string | null
          latitude: number
          location_address: string | null
          longitude: number
          recorded_at: string
          tracking_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_model?: string | null
          employee_email?: string | null
          employee_name?: string | null
          id?: string
          ip_address?: string | null
          latitude: number
          location_address?: string | null
          longitude: number
          recorded_at?: string
          tracking_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_model?: string | null
          employee_email?: string | null
          employee_name?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number
          location_address?: string | null
          longitude?: number
          recorded_at?: string
          tracking_date?: string
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
      login_verification_codes: {
        Row: {
          attempts: number | null
          created_at: string | null
          expires_at: string
          id: string
          phone_number: string
          user_id: string
          verification_code: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          phone_number: string
          user_id: string
          verification_code: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          phone_number?: string
          user_id?: string
          verification_code?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      logistics_shipments: {
        Row: {
          actual_arrival: string | null
          buyer_name: string
          contract_ref: string | null
          created_at: string
          destination: string
          dispatch_date: string | null
          expected_arrival: string | null
          id: string
          notes: string | null
          origin: string
          shipment_ref: string
          status: string
          total_bags: number
          total_kg: number
          transporter: string | null
          updated_at: string
          vehicle: string | null
        }
        Insert: {
          actual_arrival?: string | null
          buyer_name: string
          contract_ref?: string | null
          created_at?: string
          destination: string
          dispatch_date?: string | null
          expected_arrival?: string | null
          id?: string
          notes?: string | null
          origin: string
          shipment_ref: string
          status?: string
          total_bags?: number
          total_kg?: number
          transporter?: string | null
          updated_at?: string
          vehicle?: string | null
        }
        Update: {
          actual_arrival?: string | null
          buyer_name?: string
          contract_ref?: string | null
          created_at?: string
          destination?: string
          dispatch_date?: string | null
          expected_arrival?: string | null
          id?: string
          notes?: string | null
          origin?: string
          shipment_ref?: string
          status?: string
          total_bags?: number
          total_kg?: number
          transporter?: string | null
          updated_at?: string
          vehicle?: string | null
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
      market_intelligence_reports: {
        Row: {
          analyst_name: string
          approved_at: string | null
          buyer_aggressiveness: string | null
          buyer_demand_level: string | null
          closing_price: number | null
          coffee_type: string
          compliance_risks: string | null
          created_at: string
          factory_intake_volume: number | null
          global_supply_trend: string | null
          highest_price: number | null
          id: string
          key_market_drivers: string[] | null
          lowest_price: number | null
          market_direction: string
          market_momentum: string | null
          market_reference: string
          market_risks: string | null
          market_screenshot_url: string | null
          medium_term_outlook: string | null
          monthly_comparison: string | null
          narrative_summary: string | null
          opening_price: number | null
          operational_risks: string | null
          outlook_supporting_reasons: string | null
          prepared_by: string
          price_change_percent: number | null
          price_movement_interpretation: string | null
          recommended_action: string | null
          recommended_price_range_max: number | null
          recommended_price_range_min: number | null
          regional_supply_trend: string | null
          report_date: string
          reporting_period: string
          reviewed_by: string | null
          risk_level: string | null
          selling_pressure: string | null
          short_term_outlook: string | null
          updated_at: string
          volume_strategy: string | null
          weekly_comparison: string | null
          yesterday_comparison: string | null
        }
        Insert: {
          analyst_name: string
          approved_at?: string | null
          buyer_aggressiveness?: string | null
          buyer_demand_level?: string | null
          closing_price?: number | null
          coffee_type: string
          compliance_risks?: string | null
          created_at?: string
          factory_intake_volume?: number | null
          global_supply_trend?: string | null
          highest_price?: number | null
          id?: string
          key_market_drivers?: string[] | null
          lowest_price?: number | null
          market_direction?: string
          market_momentum?: string | null
          market_reference?: string
          market_risks?: string | null
          market_screenshot_url?: string | null
          medium_term_outlook?: string | null
          monthly_comparison?: string | null
          narrative_summary?: string | null
          opening_price?: number | null
          operational_risks?: string | null
          outlook_supporting_reasons?: string | null
          prepared_by: string
          price_change_percent?: number | null
          price_movement_interpretation?: string | null
          recommended_action?: string | null
          recommended_price_range_max?: number | null
          recommended_price_range_min?: number | null
          regional_supply_trend?: string | null
          report_date: string
          reporting_period?: string
          reviewed_by?: string | null
          risk_level?: string | null
          selling_pressure?: string | null
          short_term_outlook?: string | null
          updated_at?: string
          volume_strategy?: string | null
          weekly_comparison?: string | null
          yesterday_comparison?: string | null
        }
        Update: {
          analyst_name?: string
          approved_at?: string | null
          buyer_aggressiveness?: string | null
          buyer_demand_level?: string | null
          closing_price?: number | null
          coffee_type?: string
          compliance_risks?: string | null
          created_at?: string
          factory_intake_volume?: number | null
          global_supply_trend?: string | null
          highest_price?: number | null
          id?: string
          key_market_drivers?: string[] | null
          lowest_price?: number | null
          market_direction?: string
          market_momentum?: string | null
          market_reference?: string
          market_risks?: string | null
          market_screenshot_url?: string | null
          medium_term_outlook?: string | null
          monthly_comparison?: string | null
          narrative_summary?: string | null
          opening_price?: number | null
          operational_risks?: string | null
          outlook_supporting_reasons?: string | null
          prepared_by?: string
          price_change_percent?: number | null
          price_movement_interpretation?: string | null
          recommended_action?: string | null
          recommended_price_range_max?: number | null
          recommended_price_range_min?: number | null
          regional_supply_trend?: string | null
          report_date?: string
          reporting_period?: string
          reviewed_by?: string | null
          risk_level?: string | null
          selling_pressure?: string | null
          short_term_outlook?: string | null
          updated_at?: string
          volume_strategy?: string | null
          weekly_comparison?: string | null
          yesterday_comparison?: string | null
        }
        Relationships: []
      }
      market_prices: {
        Row: {
          arabica_buying_price: number | null
          arabica_fm: number | null
          arabica_moisture: number | null
          arabica_outturn: number | null
          created_at: string | null
          drugar_local: number
          exchange_rate: number
          ice_arabica: number
          id: string
          last_updated: string | null
          price_type: string
          robusta: number
          robusta_buying_price: number | null
          robusta_faq_local: number
          robusta_fm: number | null
          robusta_moisture: number | null
          robusta_outturn: number | null
          sorted_price: number | null
          updated_at: string | null
          wugar_local: number
        }
        Insert: {
          arabica_buying_price?: number | null
          arabica_fm?: number | null
          arabica_moisture?: number | null
          arabica_outturn?: number | null
          created_at?: string | null
          drugar_local?: number
          exchange_rate?: number
          ice_arabica?: number
          id?: string
          last_updated?: string | null
          price_type?: string
          robusta?: number
          robusta_buying_price?: number | null
          robusta_faq_local?: number
          robusta_fm?: number | null
          robusta_moisture?: number | null
          robusta_outturn?: number | null
          sorted_price?: number | null
          updated_at?: string | null
          wugar_local?: number
        }
        Update: {
          arabica_buying_price?: number | null
          arabica_fm?: number | null
          arabica_moisture?: number | null
          arabica_outturn?: number | null
          created_at?: string | null
          drugar_local?: number
          exchange_rate?: number
          ice_arabica?: number
          id?: string
          last_updated?: string | null
          price_type?: string
          robusta?: number
          robusta_buying_price?: number | null
          robusta_faq_local?: number
          robusta_fm?: number | null
          robusta_moisture?: number | null
          robusta_outturn?: number | null
          sorted_price?: number | null
          updated_at?: string | null
          wugar_local?: number
        }
        Relationships: []
      }
      market_reports: {
        Row: {
          analysis_notes: string | null
          arabica_price: number | null
          created_at: string
          created_by: string
          ice_arabica: number | null
          ice_robusta: number | null
          id: string
          market_trend: string | null
          recommendations: string | null
          report_date: string
          report_type: string
          robusta_price: number | null
          updated_at: string
        }
        Insert: {
          analysis_notes?: string | null
          arabica_price?: number | null
          created_at?: string
          created_by: string
          ice_arabica?: number | null
          ice_robusta?: number | null
          id?: string
          market_trend?: string | null
          recommendations?: string | null
          report_date: string
          report_type?: string
          robusta_price?: number | null
          updated_at?: string
        }
        Update: {
          analysis_notes?: string | null
          arabica_price?: number | null
          created_at?: string
          created_by?: string
          ice_arabica?: number | null
          ice_robusta?: number | null
          id?: string
          market_trend?: string | null
          recommendations?: string | null
          report_date?: string
          report_type?: string
          robusta_price?: number | null
          updated_at?: string
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
      meal_disbursements: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          initiated_by: string
          initiated_by_name: string
          receiver_name: string | null
          receiver_phone: string
          total_amount: number
          updated_at: string
          withdraw_charge: number
          yo_raw_response: string | null
          yo_reference: string | null
          yo_status: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          initiated_by: string
          initiated_by_name: string
          receiver_name?: string | null
          receiver_phone: string
          total_amount: number
          updated_at?: string
          withdraw_charge?: number
          yo_raw_response?: string | null
          yo_reference?: string | null
          yo_status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          initiated_by?: string
          initiated_by_name?: string
          receiver_name?: string | null
          receiver_phone?: string
          total_amount?: number
          updated_at?: string
          withdraw_charge?: number
          yo_raw_response?: string | null
          yo_reference?: string | null
          yo_status?: string
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
      milling_customer_accounts: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string | null
          id: string
          last_visit: string | null
          notes: string | null
          outstanding_balance: number
          total_charged: number
          total_jobs: number
          total_milled_kg: number
          total_paid: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          last_visit?: string | null
          notes?: string | null
          outstanding_balance?: number
          total_charged?: number
          total_jobs?: number
          total_milled_kg?: number
          total_paid?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          last_visit?: string | null
          notes?: string | null
          outstanding_balance?: number
          total_charged?: number
          total_jobs?: number
          total_milled_kg?: number
          total_paid?: number
          updated_at?: string
        }
        Relationships: []
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
      milling_jobs: {
        Row: {
          amount_paid: number
          balance: number | null
          coffee_type: string
          completed_at: string | null
          created_at: string
          customer_name: string
          customer_phone: string | null
          id: string
          input_weight_kg: number
          job_number: string
          loss_kg: number | null
          milled_by: string | null
          notes: string | null
          output_weight_kg: number | null
          price_per_kg: number
          started_at: string | null
          status: string
          total_cost: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          balance?: number | null
          coffee_type?: string
          completed_at?: string | null
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          input_weight_kg: number
          job_number: string
          loss_kg?: number | null
          milled_by?: string | null
          notes?: string | null
          output_weight_kg?: number | null
          price_per_kg?: number
          started_at?: string | null
          status?: string
          total_cost?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          balance?: number | null
          coffee_type?: string
          completed_at?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          input_weight_kg?: number
          job_number?: string
          loss_kg?: number | null
          milled_by?: string | null
          notes?: string | null
          output_weight_kg?: number | null
          price_per_kg?: number
          started_at?: string | null
          status?: string
          total_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      milling_momo_transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          customer_id: string
          customer_name: string
          id: string
          initiated_by: string
          phone: string
          reference: string
          status: string
          updated_at: string
          yo_reference: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          customer_id: string
          customer_name: string
          id?: string
          initiated_by: string
          phone: string
          reference: string
          status?: string
          updated_at?: string
          yo_reference?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string
          id?: string
          initiated_by?: string
          phone?: string
          reference?: string
          status?: string
          updated_at?: string
          yo_reference?: string | null
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
      mobile_money_transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          deposit_rate: number | null
          id: string
          phone: string
          provider: string
          provider_response: Json | null
          status: string
          transaction_ref: string
          transaction_type: string
          updated_at: string
          user_id: string
          withdrawal_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          deposit_rate?: number | null
          id?: string
          phone: string
          provider?: string
          provider_response?: Json | null
          status?: string
          transaction_ref: string
          transaction_type?: string
          updated_at?: string
          user_id: string
          withdrawal_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          deposit_rate?: number | null
          id?: string
          phone?: string
          provider?: string
          provider_response?: Json | null
          status?: string
          transaction_ref?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
          withdrawal_id?: string | null
        }
        Relationships: []
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
      monthly_allowance_log: {
        Row: {
          allowance_type: string
          amount: number
          employee_email: string
          employee_name: string
          id: string
          ledger_reference: string | null
          month_year: string
          processed_at: string | null
          sms_sent: boolean | null
        }
        Insert: {
          allowance_type: string
          amount: number
          employee_email: string
          employee_name: string
          id?: string
          ledger_reference?: string | null
          month_year: string
          processed_at?: string | null
          sms_sent?: boolean | null
        }
        Update: {
          allowance_type?: string
          amount?: number
          employee_email?: string
          employee_name?: string
          id?: string
          ledger_reference?: string | null
          month_year?: string
          processed_at?: string | null
          sms_sent?: boolean | null
        }
        Relationships: []
      }
      monthly_allowances: {
        Row: {
          allowance_type: string
          amount: number
          created_at: string | null
          employee_email: string
          employee_name: string
          id: string
          is_active: boolean
          updated_at: string | null
        }
        Insert: {
          allowance_type: string
          amount?: number
          created_at?: string | null
          employee_email: string
          employee_name: string
          id?: string
          is_active?: boolean
          updated_at?: string | null
        }
        Update: {
          allowance_type?: string
          amount?: number
          created_at?: string | null
          employee_email?: string
          employee_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      monthly_overtime_reviews: {
        Row: {
          adjusted_overtime_minutes: number | null
          adjusted_pay: number | null
          admin_notes: string | null
          calculated_pay: number
          created_at: string
          employee_email: string
          employee_id: string
          employee_name: string
          id: string
          month: number
          net_overtime_minutes: number
          overtime_rate_per_hour: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          total_late_minutes: number
          total_overtime_minutes: number
          updated_at: string
          year: number
        }
        Insert: {
          adjusted_overtime_minutes?: number | null
          adjusted_pay?: number | null
          admin_notes?: string | null
          calculated_pay?: number
          created_at?: string
          employee_email: string
          employee_id: string
          employee_name: string
          id?: string
          month: number
          net_overtime_minutes?: number
          overtime_rate_per_hour?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          total_late_minutes?: number
          total_overtime_minutes?: number
          updated_at?: string
          year: number
        }
        Update: {
          adjusted_overtime_minutes?: number | null
          adjusted_pay?: number | null
          admin_notes?: string | null
          calculated_pay?: number
          created_at?: string
          employee_email?: string
          employee_id?: string
          employee_name?: string
          id?: string
          month?: number
          net_overtime_minutes?: number
          overtime_rate_per_hour?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          total_late_minutes?: number
          total_overtime_minutes?: number
          updated_at?: string
          year?: number
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
      payment_receipts: {
        Row: {
          created_at: string | null
          id: string
          lot_id: string
          notes: string | null
          receipt_name: string
          receipt_type: string | null
          receipt_url: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lot_id: string
          notes?: string | null
          receipt_name: string
          receipt_type?: string | null
          receipt_url: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lot_id?: string
          notes?: string | null
          receipt_name?: string
          receipt_type?: string | null
          receipt_url?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "finance_coffee_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "pending_payments_aging"
            referencedColumns: ["lot_id"]
          },
        ]
      }
      per_diem_awards: {
        Row: {
          amount: number
          awarded_at: string
          awarded_by: string
          created_at: string
          employee_email: string
          employee_id: string
          employee_name: string
          id: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          awarded_at?: string
          awarded_by: string
          created_at?: string
          employee_email: string
          employee_id: string
          employee_name: string
          id?: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          awarded_at?: string
          awarded_by?: string
          created_at?: string
          employee_email?: string
          employee_id?: string
          employee_name?: string
          id?: string
          reason?: string | null
          updated_at?: string
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
      price_approval_requests: {
        Row: {
          arabica_buying_price: number
          arabica_fm: number | null
          arabica_moisture: number | null
          arabica_outturn: number | null
          created_at: string
          drugar_local: number | null
          exchange_rate: number | null
          ice_arabica: number | null
          id: string
          is_correction: boolean | null
          notify_suppliers: boolean | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_email: string | null
          robusta: number | null
          robusta_buying_price: number
          robusta_faq_local: number | null
          robusta_fm: number | null
          robusta_moisture: number | null
          robusta_outturn: number | null
          sorted_price: number | null
          status: string
          submitted_at: string
          submitted_by: string
          submitted_by_email: string
          suggested_arabica_price: number | null
          suggested_robusta_price: number | null
          target_date: string | null
          updated_at: string
          wugar_local: number | null
        }
        Insert: {
          arabica_buying_price: number
          arabica_fm?: number | null
          arabica_moisture?: number | null
          arabica_outturn?: number | null
          created_at?: string
          drugar_local?: number | null
          exchange_rate?: number | null
          ice_arabica?: number | null
          id?: string
          is_correction?: boolean | null
          notify_suppliers?: boolean | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_email?: string | null
          robusta?: number | null
          robusta_buying_price: number
          robusta_faq_local?: number | null
          robusta_fm?: number | null
          robusta_moisture?: number | null
          robusta_outturn?: number | null
          sorted_price?: number | null
          status?: string
          submitted_at?: string
          submitted_by: string
          submitted_by_email: string
          suggested_arabica_price?: number | null
          suggested_robusta_price?: number | null
          target_date?: string | null
          updated_at?: string
          wugar_local?: number | null
        }
        Update: {
          arabica_buying_price?: number
          arabica_fm?: number | null
          arabica_moisture?: number | null
          arabica_outturn?: number | null
          created_at?: string
          drugar_local?: number | null
          exchange_rate?: number | null
          ice_arabica?: number | null
          id?: string
          is_correction?: boolean | null
          notify_suppliers?: boolean | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_email?: string | null
          robusta?: number | null
          robusta_buying_price?: number
          robusta_faq_local?: number | null
          robusta_fm?: number | null
          robusta_moisture?: number | null
          robusta_outturn?: number | null
          sorted_price?: number | null
          status?: string
          submitted_at?: string
          submitted_by?: string
          submitted_by_email?: string
          suggested_arabica_price?: number | null
          suggested_robusta_price?: number | null
          target_date?: string | null
          updated_at?: string
          wugar_local?: number | null
        }
        Relationships: []
      }
      price_calculation_history: {
        Row: {
          calculated_at: string
          calculated_by: string
          coffee_type: string
          created_at: string
          gpcf_price: number
          ice_price: number
          id: string
          market_price: number
          multiplier: number
        }
        Insert: {
          calculated_at?: string
          calculated_by: string
          coffee_type: string
          created_at?: string
          gpcf_price: number
          ice_price: number
          id?: string
          market_price: number
          multiplier: number
        }
        Update: {
          calculated_at?: string
          calculated_by?: string
          coffee_type?: string
          created_at?: string
          gpcf_price?: number
          ice_price?: number
          id?: string
          market_price?: number
          multiplier?: number
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
      price_history: {
        Row: {
          arabica_buying_price: number | null
          arabica_fm: number | null
          arabica_moisture: number | null
          arabica_outturn: number | null
          created_at: string | null
          drugar_local: number | null
          exchange_rate: number | null
          ice_arabica: number | null
          id: string
          price_date: string
          recorded_by: string | null
          robusta_buying_price: number | null
          robusta_faq_local: number | null
          robusta_fm: number | null
          robusta_international: number | null
          robusta_moisture: number | null
          robusta_outturn: number | null
          sorted_price: number | null
          wugar_local: number | null
        }
        Insert: {
          arabica_buying_price?: number | null
          arabica_fm?: number | null
          arabica_moisture?: number | null
          arabica_outturn?: number | null
          created_at?: string | null
          drugar_local?: number | null
          exchange_rate?: number | null
          ice_arabica?: number | null
          id?: string
          price_date?: string
          recorded_by?: string | null
          robusta_buying_price?: number | null
          robusta_faq_local?: number | null
          robusta_fm?: number | null
          robusta_international?: number | null
          robusta_moisture?: number | null
          robusta_outturn?: number | null
          sorted_price?: number | null
          wugar_local?: number | null
        }
        Update: {
          arabica_buying_price?: number | null
          arabica_fm?: number | null
          arabica_moisture?: number | null
          arabica_outturn?: number | null
          created_at?: string | null
          drugar_local?: number | null
          exchange_rate?: number | null
          ice_arabica?: number | null
          id?: string
          price_date?: string
          recorded_by?: string | null
          robusta_buying_price?: number | null
          robusta_faq_local?: number | null
          robusta_fm?: number | null
          robusta_international?: number | null
          robusta_moisture?: number | null
          robusta_outturn?: number | null
          sorted_price?: number | null
          wugar_local?: number | null
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
      public_holidays: {
        Row: {
          bg_gradient_from: string
          bg_gradient_to: string
          created_at: string
          created_by: string | null
          emoji: string
          gradient_from: string
          gradient_to: string
          greeting_message: string
          greeting_title: string
          holiday_date: string
          id: string
          is_active: boolean
          is_recurring: boolean
          name: string
          updated_at: string
        }
        Insert: {
          bg_gradient_from?: string
          bg_gradient_to?: string
          created_at?: string
          created_by?: string | null
          emoji?: string
          gradient_from?: string
          gradient_to?: string
          greeting_message: string
          greeting_title: string
          holiday_date: string
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          bg_gradient_from?: string
          bg_gradient_to?: string
          created_at?: string
          created_by?: string | null
          emoji?: string
          gradient_from?: string
          gradient_to?: string
          greeting_message?: string
          greeting_title?: string
          holiday_date?: string
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          name?: string
          updated_at?: string
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
            referencedRelation: "supplier_balances"
            referencedColumns: ["id"]
          },
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
          admin_discretion_at: string | null
          admin_discretion_buy: boolean | null
          admin_discretion_by: string | null
          admin_discretion_notes: string | null
          admin_discretion_price: number | null
          assessed_by: string
          batch_number: string
          below12: number | null
          clean_d14: number | null
          comments: string | null
          created_at: string
          date_assessed: string
          final_price: number | null
          fm: number | null
          grn_printed: boolean | null
          grn_printed_at: string | null
          grn_printed_by: string | null
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
          admin_discretion_at?: string | null
          admin_discretion_buy?: boolean | null
          admin_discretion_by?: string | null
          admin_discretion_notes?: string | null
          admin_discretion_price?: number | null
          assessed_by: string
          batch_number: string
          below12?: number | null
          clean_d14?: number | null
          comments?: string | null
          created_at?: string
          date_assessed?: string
          final_price?: number | null
          fm?: number | null
          grn_printed?: boolean | null
          grn_printed_at?: string | null
          grn_printed_by?: string | null
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
          admin_discretion_at?: string | null
          admin_discretion_buy?: boolean | null
          admin_discretion_by?: string | null
          admin_discretion_notes?: string | null
          admin_discretion_price?: number | null
          assessed_by?: string
          batch_number?: string
          below12?: number | null
          clean_d14?: number | null
          comments?: string | null
          created_at?: string
          date_assessed?: string
          final_price?: number | null
          fm?: number | null
          grn_printed?: boolean | null
          grn_printed_at?: string | null
          grn_printed_by?: string | null
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
      quality_daily_checklists: {
        Row: {
          batch_reviews_count: number | null
          calibration_done: boolean | null
          checklist_date: string
          completion_percentage: number | null
          created_at: string | null
          daily_report_submitted: boolean | null
          employee_email: string
          employee_name: string
          id: string
          reevaluations_count: number | null
          supplier_analysis_updated: boolean | null
          updated_at: string | null
        }
        Insert: {
          batch_reviews_count?: number | null
          calibration_done?: boolean | null
          checklist_date?: string
          completion_percentage?: number | null
          created_at?: string | null
          daily_report_submitted?: boolean | null
          employee_email: string
          employee_name: string
          id?: string
          reevaluations_count?: number | null
          supplier_analysis_updated?: boolean | null
          updated_at?: string | null
        }
        Update: {
          batch_reviews_count?: number | null
          calibration_done?: boolean | null
          checklist_date?: string
          completion_percentage?: number | null
          created_at?: string | null
          daily_report_submitted?: boolean | null
          employee_email?: string
          employee_name?: string
          id?: string
          reevaluations_count?: number | null
          supplier_analysis_updated?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quality_performance_tracking: {
        Row: {
          accuracy_score: number | null
          assessments_count: number | null
          created_at: string | null
          employee_email: string
          employee_name: string
          id: string
          issues_flagged: number | null
          overall_score: number | null
          period_end: string
          period_start: string
          reevaluations_count: number | null
          reports_submitted: number | null
          updated_at: string | null
        }
        Insert: {
          accuracy_score?: number | null
          assessments_count?: number | null
          created_at?: string | null
          employee_email: string
          employee_name: string
          id?: string
          issues_flagged?: number | null
          overall_score?: number | null
          period_end: string
          period_start: string
          reevaluations_count?: number | null
          reports_submitted?: number | null
          updated_at?: string | null
        }
        Update: {
          accuracy_score?: number | null
          assessments_count?: number | null
          created_at?: string | null
          employee_email?: string
          employee_name?: string
          id?: string
          issues_flagged?: number | null
          overall_score?: number | null
          period_end?: string
          period_start?: string
          reevaluations_count?: number | null
          reports_submitted?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quality_recommendations: {
        Row: {
          created_at: string | null
          expected_impact: string | null
          id: string
          issue_identified: string
          recommendation: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          supplier_id: string | null
          supplier_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expected_impact?: string | null
          id?: string
          issue_identified: string
          recommendation: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          supplier_id?: string | null
          supplier_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expected_impact?: string | null
          id?: string
          issue_identified?: string
          recommendation?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          supplier_id?: string | null
          supplier_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_recommendations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_recommendations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_reevaluations: {
        Row: {
          batch_number: string
          comment: string | null
          created_at: string | null
          evaluated_at: string | null
          evaluated_by: string
          id: string
          moisture_variance: number | null
          new_fm: number | null
          new_group1: number | null
          new_group2: number | null
          new_husks: number | null
          new_moisture: number
          new_outturn: number
          new_pods: number | null
          original_assessment_id: string
          original_fm: number | null
          original_group1: number | null
          original_group2: number | null
          original_husks: number | null
          original_moisture: number | null
          original_outturn: number | null
          original_pods: number | null
          outturn_variance: number | null
        }
        Insert: {
          batch_number: string
          comment?: string | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluated_by: string
          id?: string
          moisture_variance?: number | null
          new_fm?: number | null
          new_group1?: number | null
          new_group2?: number | null
          new_husks?: number | null
          new_moisture: number
          new_outturn: number
          new_pods?: number | null
          original_assessment_id: string
          original_fm?: number | null
          original_group1?: number | null
          original_group2?: number | null
          original_husks?: number | null
          original_moisture?: number | null
          original_outturn?: number | null
          original_pods?: number | null
          outturn_variance?: number | null
        }
        Update: {
          batch_number?: string
          comment?: string | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluated_by?: string
          id?: string
          moisture_variance?: number | null
          new_fm?: number | null
          new_group1?: number | null
          new_group2?: number | null
          new_husks?: number | null
          new_moisture?: number
          new_outturn?: number
          new_pods?: number | null
          original_assessment_id?: string
          original_fm?: number | null
          original_group1?: number | null
          original_group2?: number | null
          original_husks?: number | null
          original_moisture?: number | null
          original_outturn?: number | null
          original_pods?: number | null
          outturn_variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_reevaluations_original_assessment_id_fkey"
            columns: ["original_assessment_id"]
            isOneToOne: false
            referencedRelation: "quality_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_analyses: {
        Row: {
          actual_ott: number | null
          clean_d14: number | null
          coffee_type: string
          created_at: string | null
          created_by: string
          discretion: number | null
          final_price: number | null
          fm: number | null
          gp1: number | null
          gp2: number | null
          husks: number | null
          id: string
          is_rejected: boolean | null
          less12: number | null
          moisture: number | null
          outturn: number | null
          outturn_price: number | null
          pods: number | null
          quality_note: string | null
          ref_price: number
          stones: number | null
          supplier_name: string
          updated_at: string | null
        }
        Insert: {
          actual_ott?: number | null
          clean_d14?: number | null
          coffee_type: string
          created_at?: string | null
          created_by: string
          discretion?: number | null
          final_price?: number | null
          fm?: number | null
          gp1?: number | null
          gp2?: number | null
          husks?: number | null
          id?: string
          is_rejected?: boolean | null
          less12?: number | null
          moisture?: number | null
          outturn?: number | null
          outturn_price?: number | null
          pods?: number | null
          quality_note?: string | null
          ref_price: number
          stones?: number | null
          supplier_name: string
          updated_at?: string | null
        }
        Update: {
          actual_ott?: number | null
          clean_d14?: number | null
          coffee_type?: string
          created_at?: string | null
          created_by?: string
          discretion?: number | null
          final_price?: number | null
          fm?: number | null
          gp1?: number | null
          gp2?: number | null
          husks?: number | null
          id?: string
          is_rejected?: boolean | null
          less12?: number | null
          moisture?: number | null
          outturn?: number | null
          outturn_price?: number | null
          pods?: number | null
          quality_note?: string | null
          ref_price?: number
          stones?: number | null
          supplier_name?: string
          updated_at?: string | null
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
      requisitions: {
        Row: {
          account_code: string | null
          additional_approver_name: string | null
          additional_approver_position: string | null
          additional_approver_signature_date: string | null
          admin_approved: boolean | null
          admin_name: string | null
          admin_position: string | null
          admin_signature_date: string | null
          amount: number
          budget_code: string | null
          cost_center: string | null
          created_at: string
          created_by_department: string | null
          created_by_email: string
          created_by_employee_id: string | null
          created_by_name: string
          created_by_position: string | null
          currency: string | null
          deleted_at: string | null
          deleted_by: string | null
          department: string
          description: string | null
          disbursement_account_name: string | null
          disbursement_account_number: string | null
          disbursement_bank_name: string | null
          disbursement_method: string | null
          disbursement_phone: string | null
          finance_approved: boolean | null
          finance_name: string | null
          finance_notes: string | null
          finance_position: string | null
          finance_signature_date: string | null
          general_notes: string | null
          id: string
          journal_entry_created: boolean | null
          journal_entry_created_at: string | null
          journal_entry_created_by: string | null
          journal_entry_number: string | null
          metadata: Json | null
          original_requester_department: string | null
          original_requester_name: string | null
          original_requester_position: string | null
          original_requester_signature_date: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_processed: boolean | null
          payment_processed_at: string | null
          payment_processed_by: string | null
          payment_processed_by_id: string | null
          payment_reference_number: string | null
          priority: string | null
          project_code: string | null
          receipts: Json | null
          receipts_count: number | null
          rejected: boolean | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_by_id: string | null
          rejection_reason: string | null
          requisition_number: string
          stamp_issuing_authority: string | null
          stamp_received_date: string | null
          stamp_reference_number: string | null
          stamped_document_name: string
          stamped_document_size: number | null
          stamped_document_type: string | null
          stamped_document_uploaded_at: string | null
          stamped_document_url: string
          status: string | null
          supervisor_approved: boolean | null
          supervisor_name: string | null
          supervisor_position: string | null
          supervisor_signature_date: string | null
          supporting_documents: Json | null
          tax_amount: number | null
          tax_rate: number | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          account_code?: string | null
          additional_approver_name?: string | null
          additional_approver_position?: string | null
          additional_approver_signature_date?: string | null
          admin_approved?: boolean | null
          admin_name?: string | null
          admin_position?: string | null
          admin_signature_date?: string | null
          amount: number
          budget_code?: string | null
          cost_center?: string | null
          created_at?: string
          created_by_department?: string | null
          created_by_email: string
          created_by_employee_id?: string | null
          created_by_name: string
          created_by_position?: string | null
          currency?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department: string
          description?: string | null
          disbursement_account_name?: string | null
          disbursement_account_number?: string | null
          disbursement_bank_name?: string | null
          disbursement_method?: string | null
          disbursement_phone?: string | null
          finance_approved?: boolean | null
          finance_name?: string | null
          finance_notes?: string | null
          finance_position?: string | null
          finance_signature_date?: string | null
          general_notes?: string | null
          id?: string
          journal_entry_created?: boolean | null
          journal_entry_created_at?: string | null
          journal_entry_created_by?: string | null
          journal_entry_number?: string | null
          metadata?: Json | null
          original_requester_department?: string | null
          original_requester_name?: string | null
          original_requester_position?: string | null
          original_requester_signature_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_processed?: boolean | null
          payment_processed_at?: string | null
          payment_processed_by?: string | null
          payment_processed_by_id?: string | null
          payment_reference_number?: string | null
          priority?: string | null
          project_code?: string | null
          receipts?: Json | null
          receipts_count?: number | null
          rejected?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_by_id?: string | null
          rejection_reason?: string | null
          requisition_number: string
          stamp_issuing_authority?: string | null
          stamp_received_date?: string | null
          stamp_reference_number?: string | null
          stamped_document_name: string
          stamped_document_size?: number | null
          stamped_document_type?: string | null
          stamped_document_uploaded_at?: string | null
          stamped_document_url: string
          status?: string | null
          supervisor_approved?: boolean | null
          supervisor_name?: string | null
          supervisor_position?: string | null
          supervisor_signature_date?: string | null
          supporting_documents?: Json | null
          tax_amount?: number | null
          tax_rate?: number | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          account_code?: string | null
          additional_approver_name?: string | null
          additional_approver_position?: string | null
          additional_approver_signature_date?: string | null
          admin_approved?: boolean | null
          admin_name?: string | null
          admin_position?: string | null
          admin_signature_date?: string | null
          amount?: number
          budget_code?: string | null
          cost_center?: string | null
          created_at?: string
          created_by_department?: string | null
          created_by_email?: string
          created_by_employee_id?: string | null
          created_by_name?: string
          created_by_position?: string | null
          currency?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string
          description?: string | null
          disbursement_account_name?: string | null
          disbursement_account_number?: string | null
          disbursement_bank_name?: string | null
          disbursement_method?: string | null
          disbursement_phone?: string | null
          finance_approved?: boolean | null
          finance_name?: string | null
          finance_notes?: string | null
          finance_position?: string | null
          finance_signature_date?: string | null
          general_notes?: string | null
          id?: string
          journal_entry_created?: boolean | null
          journal_entry_created_at?: string | null
          journal_entry_created_by?: string | null
          journal_entry_number?: string | null
          metadata?: Json | null
          original_requester_department?: string | null
          original_requester_name?: string | null
          original_requester_position?: string | null
          original_requester_signature_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_processed?: boolean | null
          payment_processed_at?: string | null
          payment_processed_by?: string | null
          payment_processed_by_id?: string | null
          payment_reference_number?: string | null
          priority?: string | null
          project_code?: string | null
          receipts?: Json | null
          receipts_count?: number | null
          rejected?: boolean | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_by_id?: string | null
          rejection_reason?: string | null
          requisition_number?: string
          stamp_issuing_authority?: string | null
          stamp_received_date?: string | null
          stamp_reference_number?: string | null
          stamped_document_name?: string
          stamped_document_size?: number | null
          stamped_document_type?: string | null
          stamped_document_uploaded_at?: string | null
          stamped_document_url?: string
          status?: string | null
          supervisor_approved?: boolean | null
          supervisor_name?: string | null
          supervisor_position?: string | null
          supervisor_signature_date?: string | null
          supporting_documents?: Json | null
          tax_amount?: number | null
          tax_rate?: number | null
          title?: string
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
      salary_advance_payments: {
        Row: {
          advance_id: string
          amount_paid: number
          approved_by: string | null
          created_at: string
          employee_email: string
          id: string
          payment_date: string
          salary_request_id: string | null
          status: string
        }
        Insert: {
          advance_id: string
          amount_paid: number
          approved_by?: string | null
          created_at?: string
          employee_email: string
          id?: string
          payment_date?: string
          salary_request_id?: string | null
          status?: string
        }
        Update: {
          advance_id?: string
          amount_paid?: number
          approved_by?: string | null
          created_at?: string
          employee_email?: string
          id?: string
          payment_date?: string
          salary_request_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_advance_payments_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "employee_salary_advances"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_auto_invest: {
        Row: {
          created_at: string
          employee_name: string
          fixed_amount: number | null
          id: string
          invest_type: string
          is_enabled: boolean
          last_processed_at: string | null
          percentage: number | null
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_name: string
          fixed_amount?: number | null
          id?: string
          invest_type?: string
          is_enabled?: boolean
          last_processed_at?: string | null
          percentage?: number | null
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          created_at?: string
          employee_name?: string
          fixed_amount?: number | null
          id?: string
          invest_type?: string
          is_enabled?: boolean
          last_processed_at?: string | null
          percentage?: number | null
          updated_at?: string
          user_email?: string
          user_id?: string
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
        Relationships: []
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
          notes: string | null
          payment_method: string | null
          price_per_kg: number | null
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
          notes?: string | null
          payment_method?: string | null
          price_per_kg?: number | null
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
          notes?: string | null
          payment_method?: string | null
          price_per_kg?: number | null
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
      sent_emails_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          recipient_email: string
          status: string | null
          subject: string | null
          template_name: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          recipient_email: string
          status?: string | null
          subject?: string | null
          template_name: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string | null
          subject?: string | null
          template_name?: string
        }
        Relationships: []
      }
      service_provider_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          initiated_by: string
          initiated_by_name: string
          notes: string | null
          receiver_name: string | null
          receiver_phone: string
          service_description: string
          total_amount: number
          updated_at: string
          withdraw_charge: number
          yo_raw_response: string | null
          yo_reference: string | null
          yo_status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          initiated_by: string
          initiated_by_name: string
          notes?: string | null
          receiver_name?: string | null
          receiver_phone: string
          service_description: string
          total_amount?: number
          updated_at?: string
          withdraw_charge?: number
          yo_raw_response?: string | null
          yo_reference?: string | null
          yo_status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          initiated_by?: string
          initiated_by_name?: string
          notes?: string | null
          receiver_name?: string | null
          receiver_phone?: string
          service_description?: string
          total_amount?: number
          updated_at?: string
          withdraw_charge?: number
          yo_raw_response?: string | null
          yo_reference?: string | null
          yo_status?: string
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          account_name: string | null
          account_number: string | null
          alternative_phone: string | null
          bank_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          alternative_phone?: string | null
          bank_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          alternative_phone?: string | null
          bank_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
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
          last_retry_at: string | null
          max_retries: number | null
          message_content: string
          message_type: string
          next_retry_at: string | null
          provider: string | null
          provider_response: Json | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string
          request_id: string | null
          retry_count: number | null
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
          last_retry_at?: string | null
          max_retries?: number | null
          message_content: string
          message_type?: string
          next_retry_at?: string | null
          provider?: string | null
          provider_response?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone: string
          request_id?: string | null
          retry_count?: number | null
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
          last_retry_at?: string | null
          max_retries?: number | null
          message_content?: string
          message_type?: string
          next_retry_at?: string | null
          provider?: string | null
          provider_response?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          request_id?: string | null
          retry_count?: number | null
          status?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sms_notification_queue: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message: string
          notification_type: string
          recipient_email: string
          recipient_phone: string | null
          reference_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          notification_type: string
          recipient_email: string
          recipient_phone?: string | null
          reference_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          notification_type?: string
          recipient_email?: string
          recipient_phone?: string | null
          reference_id?: string | null
          sent_at?: string | null
          status?: string
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
      store_damaged_bags: {
        Row: {
          action_taken: string | null
          bags_affected: number
          batch_number: string
          coffee_record_id: string | null
          created_at: string
          damage_type: string
          estimated_loss_kg: number
          id: string
          notes: string | null
          reported_by: string
          reported_date: string
          status: string
        }
        Insert: {
          action_taken?: string | null
          bags_affected?: number
          batch_number: string
          coffee_record_id?: string | null
          created_at?: string
          damage_type: string
          estimated_loss_kg?: number
          id?: string
          notes?: string | null
          reported_by: string
          reported_date?: string
          status?: string
        }
        Update: {
          action_taken?: string | null
          bags_affected?: number
          batch_number?: string
          coffee_record_id?: string | null
          created_at?: string
          damage_type?: string
          estimated_loss_kg?: number
          id?: string
          notes?: string | null
          reported_by?: string
          reported_date?: string
          status?: string
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
      store_stock_verifications: {
        Row: {
          created_at: string
          discrepancy_bags: number | null
          discrepancy_kg: number | null
          id: string
          notes: string | null
          physical_total_bags: number
          physical_total_kg: number
          status: string
          system_total_bags: number
          system_total_kg: number
          verification_date: string
          verified_by: string
        }
        Insert: {
          created_at?: string
          discrepancy_bags?: number | null
          discrepancy_kg?: number | null
          id?: string
          notes?: string | null
          physical_total_bags?: number
          physical_total_kg?: number
          status?: string
          system_total_bags?: number
          system_total_kg?: number
          verification_date?: string
          verified_by: string
        }
        Update: {
          created_at?: string
          discrepancy_bags?: number | null
          discrepancy_kg?: number | null
          id?: string
          notes?: string | null
          physical_total_bags?: number
          physical_total_kg?: number
          status?: string
          system_total_bags?: number
          system_total_kg?: number
          verification_date?: string
          verified_by?: string
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
            referencedRelation: "supplier_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_advances_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contract_deliveries: {
        Row: {
          coffee_record_id: string | null
          contract_id: string
          created_at: string | null
          created_by: string
          delivered_kg: number
          delivery_date: string
          id: string
          notes: string | null
        }
        Insert: {
          coffee_record_id?: string | null
          contract_id: string
          created_at?: string | null
          created_by: string
          delivered_kg: number
          delivery_date?: string
          id?: string
          notes?: string | null
        }
        Update: {
          coffee_record_id?: string | null
          contract_id?: string
          created_at?: string | null
          created_by?: string
          delivered_kg?: number
          delivery_date?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contract_deliveries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "supplier_contracts"
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
          external_reference: string | null
          gross_payable_ugx: number
          id: string
          is_duplicate: boolean | null
          lot_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          payment_date: string
          processed_at: string | null
          provider_message: string | null
          provider_name: string | null
          provider_response: Json | null
          provider_status: string | null
          reference: string | null
          requested_at: string
          requested_by: string
          status: Database["public"]["Enums"]["payment_status"]
          supplier_id: string | null
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          advance_recovered_ugx?: number
          amount_paid_ugx: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          external_reference?: string | null
          gross_payable_ugx: number
          id?: string
          is_duplicate?: boolean | null
          lot_id?: string | null
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_date?: string
          processed_at?: string | null
          provider_message?: string | null
          provider_name?: string | null
          provider_response?: Json | null
          provider_status?: string | null
          reference?: string | null
          requested_at?: string
          requested_by: string
          status?: Database["public"]["Enums"]["payment_status"]
          supplier_id?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          advance_recovered_ugx?: number
          amount_paid_ugx?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          external_reference?: string | null
          gross_payable_ugx?: number
          id?: string
          is_duplicate?: boolean | null
          lot_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_date?: string
          processed_at?: string | null
          provider_message?: string | null
          provider_name?: string | null
          provider_response?: Json | null
          provider_status?: string | null
          reference?: string | null
          requested_at?: string
          requested_by?: string
          status?: Database["public"]["Enums"]["payment_status"]
          supplier_id?: string | null
          transaction_id?: string | null
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
            foreignKeyName: "supplier_payments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "pending_payments_aging"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
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
      supplier_subcontracts: {
        Row: {
          buyer_contract_id: string | null
          contract_ref: string
          contract_size: string
          created_at: string
          created_by: string | null
          cuttings: string | null
          delivery_station: string
          duration: string | null
          id: string
          moisture: number | null
          net_weight: number
          outturn: number | null
          price_per_kg: number
          price_subject_to_uprisal: boolean | null
          status: string | null
          supplier_id: string | null
          supplier_name: string
          terms: string | null
          total_fm: number | null
          updated_at: string
        }
        Insert: {
          buyer_contract_id?: string | null
          contract_ref: string
          contract_size: string
          created_at?: string
          created_by?: string | null
          cuttings?: string | null
          delivery_station: string
          duration?: string | null
          id?: string
          moisture?: number | null
          net_weight: number
          outturn?: number | null
          price_per_kg: number
          price_subject_to_uprisal?: boolean | null
          status?: string | null
          supplier_id?: string | null
          supplier_name: string
          terms?: string | null
          total_fm?: number | null
          updated_at?: string
        }
        Update: {
          buyer_contract_id?: string | null
          contract_ref?: string
          contract_size?: string
          created_at?: string
          created_by?: string | null
          cuttings?: string | null
          delivery_station?: string
          duration?: string | null
          id?: string
          moisture?: number | null
          net_weight?: number
          outturn?: number | null
          price_per_kg?: number
          price_subject_to_uprisal?: boolean | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string
          terms?: string | null
          total_fm?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_subcontracts_buyer_contract_id_fkey"
            columns: ["buyer_contract_id"]
            isOneToOne: false
            referencedRelation: "buyer_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_subcontracts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_subcontracts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          account_name: string | null
          account_number: string | null
          alternative_phone: string | null
          bank_name: string | null
          code: string
          created_at: string
          date_registered: string
          email: string | null
          id: string
          name: string
          opening_balance: number
          origin: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          alternative_phone?: string | null
          bank_name?: string | null
          code: string
          created_at?: string
          date_registered?: string
          email?: string | null
          id?: string
          name: string
          opening_balance?: number
          origin: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          alternative_phone?: string | null
          bank_name?: string | null
          code?: string
          created_at?: string
          date_registered?: string
          email?: string | null
          id?: string
          name?: string
          opening_balance?: number
          origin?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_console_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json | null
          source: string | null
          stack_trace: string | null
          url: string | null
          user_agent: string | null
          user_department: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          message: string
          metadata?: Json | null
          source?: string | null
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_department?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          source?: string | null
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_department?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      system_errors: {
        Row: {
          component: string
          created_at: string
          description: string
          error_type: string
          id: string
          metadata: Json | null
          recommendation: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          stack_trace: string | null
          status: string
          title: string
          updated_at: string
          url: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          component: string
          created_at?: string
          description: string
          error_type: string
          id?: string
          metadata?: Json | null
          recommendation?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          stack_trace?: string | null
          status?: string
          title: string
          updated_at?: string
          url?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          component?: string
          created_at?: string
          description?: string
          error_type?: string
          id?: string
          metadata?: Json | null
          recommendation?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          stack_trace?: string | null
          status?: string
          title?: string
          updated_at?: string
          url?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_maintenance: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          created_at: string
          id: string
          is_active: boolean
          reason: string | null
          recovery_key: string | null
          recovery_phone: string | null
          recovery_pin: string | null
          recovery_sms_sent: boolean | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          recovery_key?: string | null
          recovery_phone?: string | null
          recovery_pin?: string | null
          recovery_sms_sent?: boolean | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          recovery_key?: string | null
          recovery_phone?: string | null
          recovery_pin?: string | null
          recovery_sms_sent?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      time_deductions: {
        Row: {
          created_at: string
          created_by: string
          deducted_in_payment_id: string | null
          employee_email: string
          employee_id: string
          employee_name: string
          employee_phone: string | null
          hours_missed: number
          id: string
          month: string
          rate_per_hour: number
          reason: string | null
          sms_sent: boolean | null
          total_deduction: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deducted_in_payment_id?: string | null
          employee_email: string
          employee_id: string
          employee_name: string
          employee_phone?: string | null
          hours_missed?: number
          id?: string
          month: string
          rate_per_hour?: number
          reason?: string | null
          sms_sent?: boolean | null
          total_deduction?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deducted_in_payment_id?: string | null
          employee_email?: string
          employee_id?: string
          employee_name?: string
          employee_phone?: string | null
          hours_missed?: number
          id?: string
          month?: string
          rate_per_hour?: number
          reason?: string | null
          sms_sent?: boolean | null
          total_deduction?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      training_simulations: {
        Row: {
          batch_number: string
          coffee_type: string
          completed_at: string | null
          correct_decision: string | null
          correct_price: number | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          score: number | null
          simulated_defects: Json | null
          simulated_moisture: number
          simulated_outturn: number
          trainee_decision: string | null
          trainee_email: string
          trainee_name: string
          trainee_price: number | null
        }
        Insert: {
          batch_number: string
          coffee_type?: string
          completed_at?: string | null
          correct_decision?: string | null
          correct_price?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          score?: number | null
          simulated_defects?: Json | null
          simulated_moisture: number
          simulated_outturn: number
          trainee_decision?: string | null
          trainee_email: string
          trainee_name: string
          trainee_price?: number | null
        }
        Update: {
          batch_number?: string
          coffee_type?: string
          completed_at?: string | null
          correct_decision?: string | null
          correct_price?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          score?: number | null
          simulated_defects?: Json | null
          simulated_moisture?: number
          simulated_outturn?: number
          trainee_decision?: string | null
          trainee_email?: string
          trainee_name?: string
          trainee_price?: number | null
        }
        Relationships: []
      }
      transfer_reversal_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_partial: boolean | null
          ledger_entry_id: string
          pending_remainder: number | null
          reason: string
          receiver_email: string | null
          receiver_name: string | null
          receiver_user_id: string
          requested_at: string
          reversed_amount: number | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_email: string | null
          sender_name: string | null
          sender_user_id: string
          status: string
          tx_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_partial?: boolean | null
          ledger_entry_id: string
          pending_remainder?: number | null
          reason: string
          receiver_email?: string | null
          receiver_name?: string | null
          receiver_user_id: string
          requested_at?: string
          reversed_amount?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sender_user_id: string
          status?: string
          tx_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_partial?: boolean | null
          ledger_entry_id?: string
          pending_remainder?: number | null
          reason?: string
          receiver_email?: string | null
          receiver_name?: string | null
          receiver_user_id?: string
          requested_at?: string
          reversed_amount?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sender_user_id?: string
          status?: string
          tx_id?: string
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
      user_fraud_locks: {
        Row: {
          created_at: string | null
          id: string
          is_locked: boolean | null
          locked_at: string | null
          reason: string | null
          unlock_code: string
          unlocked_at: string | null
          unlocked_by: string | null
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          reason?: string | null
          unlock_code: string
          unlocked_at?: string | null
          unlocked_by?: string | null
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          reason?: string | null
          unlock_code?: string
          unlocked_at?: string | null
          unlocked_by?: string | null
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          device_model: string | null
          device_type: string | null
          ip_address: string | null
          last_seen: string
          latitude: number | null
          location_address: string | null
          longitude: number | null
          os: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device_model?: string | null
          device_type?: string | null
          ip_address?: string | null
          last_seen?: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          os?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device_model?: string | null
          device_type?: string | null
          ip_address?: string | null
          last_seen?: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          os?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          can_approve_transactions: boolean | null
          can_fully_approve: boolean | null
          can_record_deposits: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          max_approval_amount: number | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_approve_transactions?: boolean | null
          can_fully_approve?: boolean | null
          can_record_deposits?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          max_approval_amount?: number | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_approve_transactions?: boolean | null
          can_fully_approve?: boolean | null
          can_record_deposits?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          max_approval_amount?: number | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_security_questions: {
        Row: {
          answer_1_hash: string
          answer_2_hash: string
          answer_3_hash: string
          created_at: string | null
          id: string
          is_active: boolean | null
          question_1: string
          question_2: string
          question_3: string
          updated_at: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          answer_1_hash: string
          answer_2_hash: string
          answer_3_hash: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question_1: string
          question_2: string
          question_3: string
          updated_at?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          answer_1_hash?: string
          answer_2_hash?: string
          answer_3_hash?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question_1?: string
          question_2?: string
          question_3?: string
          updated_at?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      user_session_logs: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_model: string | null
          device_type: string | null
          employee_email: string | null
          employee_name: string | null
          id: string
          ip_address: string | null
          latitude: number | null
          location_address: string | null
          login_at: string
          logout_at: string | null
          longitude: number | null
          os: string | null
          session_date: string | null
          session_duration_minutes: number | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_model?: string | null
          device_type?: string | null
          employee_email?: string | null
          employee_name?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          location_address?: string | null
          login_at?: string
          logout_at?: string | null
          longitude?: number | null
          os?: string | null
          session_date?: string | null
          session_duration_minutes?: number | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_model?: string | null
          device_type?: string | null
          employee_email?: string | null
          employee_name?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          location_address?: string | null
          login_at?: string
          logout_at?: string | null
          longitude?: number | null
          os?: string | null
          session_date?: string | null
          session_duration_minutes?: number | null
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
      ussd_payment_logs: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          narrative: string | null
          phone: string | null
          raw_payload: string | null
          reference: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          narrative?: string | null
          phone?: string | null
          raw_payload?: string | null
          reference: string
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          narrative?: string | null
          phone?: string | null
          raw_payload?: string | null
          reference?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
      vehicle_trips: {
        Row: {
          arrival_time: string | null
          cargo_description: string | null
          cargo_weight_kg: number | null
          created_at: string
          delay_minutes: number | null
          delay_reason: string | null
          departure_time: string | null
          destination: string
          driver_name: string
          fuel_cost: number | null
          id: string
          notes: string | null
          origin: string
          route: string
          status: string
          vehicle_name: string
        }
        Insert: {
          arrival_time?: string | null
          cargo_description?: string | null
          cargo_weight_kg?: number | null
          created_at?: string
          delay_minutes?: number | null
          delay_reason?: string | null
          departure_time?: string | null
          destination: string
          driver_name: string
          fuel_cost?: number | null
          id?: string
          notes?: string | null
          origin: string
          route: string
          status?: string
          vehicle_name: string
        }
        Update: {
          arrival_time?: string | null
          cargo_description?: string | null
          cargo_weight_kg?: number | null
          created_at?: string
          delay_minutes?: number | null
          delay_reason?: string | null
          departure_time?: string | null
          destination?: string
          driver_name?: string
          fuel_cost?: number | null
          id?: string
          notes?: string | null
          origin?: string
          route?: string
          status?: string
          vehicle_name?: string
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
      verification_audit_logs: {
        Row: {
          action: string
          admin_email: string
          admin_user: string | null
          code: string
          details: Json | null
          id: string
          timestamp: string | null
        }
        Insert: {
          action: string
          admin_email: string
          admin_user?: string | null
          code: string
          details?: Json | null
          id?: string
          timestamp?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          admin_user?: string | null
          code?: string
          details?: Json | null
          id?: string
          timestamp?: string | null
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
      verifications: {
        Row: {
          access_pin_hash: string | null
          code: string
          created_at: string | null
          created_by: string | null
          department: string | null
          employee_no: string | null
          file_url: string | null
          id: string
          issued_at: string
          issued_to_name: string
          meta: Json | null
          photo_url: string | null
          position: string | null
          reference_no: string | null
          revoked_reason: string | null
          status: string
          subtype: string
          type: string
          updated_at: string | null
          valid_until: string | null
          workstation: string | null
        }
        Insert: {
          access_pin_hash?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          employee_no?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string
          issued_to_name: string
          meta?: Json | null
          photo_url?: string | null
          position?: string | null
          reference_no?: string | null
          revoked_reason?: string | null
          status?: string
          subtype: string
          type: string
          updated_at?: string | null
          valid_until?: string | null
          workstation?: string | null
        }
        Update: {
          access_pin_hash?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          employee_no?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string
          issued_to_name?: string
          meta?: Json | null
          photo_url?: string | null
          position?: string | null
          reference_no?: string | null
          revoked_reason?: string | null
          status?: string
          subtype?: string
          type?: string
          updated_at?: string | null
          valid_until?: string | null
          workstation?: string | null
        }
        Relationships: []
      }
      warehouse_quality_monitoring: {
        Row: {
          batch_number: string
          created_at: string | null
          current_moisture: number
          humidity: number | null
          id: string
          mold_risk: string
          monitored_by: string
          remarks: string | null
          storage_date: string
          temperature: number | null
          weight_loss_estimate: number | null
        }
        Insert: {
          batch_number: string
          created_at?: string | null
          current_moisture: number
          humidity?: number | null
          id?: string
          mold_risk?: string
          monitored_by: string
          remarks?: string | null
          storage_date?: string
          temperature?: number | null
          weight_loss_estimate?: number | null
        }
        Update: {
          batch_number?: string
          created_at?: string | null
          current_moisture?: number
          humidity?: number | null
          id?: string
          mold_risk?: string
          monitored_by?: string
          remarks?: string | null
          storage_date?: string
          temperature?: number | null
          weight_loss_estimate?: number | null
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
      weighbridge_scan_sessions: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          report_context: Json | null
          session_code: string
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          report_context?: Json | null
          session_code?: string
          status?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          report_context?: Json | null
          session_code?: string
          status?: string
        }
        Relationships: []
      }
      weighbridge_scanned_tickets: {
        Row: {
          id: string
          photo_url: string | null
          qr_data: string
          scanned_at: string | null
          session_id: string
        }
        Insert: {
          id?: string
          photo_url?: string | null
          qr_data: string
          scanned_at?: string | null
          session_id: string
        }
        Update: {
          id?: string
          photo_url?: string | null
          qr_data?: string
          scanned_at?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weighbridge_scanned_tickets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "weighbridge_scan_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_approval_logs: {
        Row: {
          action: string
          approver_email: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          verification_method: string | null
          withdrawal_request_id: string
        }
        Insert: {
          action: string
          approver_email: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          verification_method?: string | null
          withdrawal_request_id: string
        }
        Update: {
          action?: string
          approver_email?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          verification_method?: string | null
          withdrawal_request_id?: string
        }
        Relationships: []
      }
      withdrawal_verification_codes: {
        Row: {
          approver_email: string
          approver_phone: string
          attempts: number | null
          code_expires_at: string
          created_at: string | null
          id: string
          max_attempts: number | null
          verification_code: string
          verified: boolean | null
          verified_at: string | null
          withdrawal_request_id: string
        }
        Insert: {
          approver_email: string
          approver_phone: string
          attempts?: number | null
          code_expires_at: string
          created_at?: string | null
          id?: string
          max_attempts?: number | null
          verification_code: string
          verified?: boolean | null
          verified_at?: string | null
          withdrawal_request_id: string
        }
        Update: {
          approver_email?: string
          approver_phone?: string
          attempts?: number | null
          code_expires_at?: string
          created_at?: string | null
          id?: string
          max_attempts?: number | null
          verification_code?: string
          verified?: boolean | null
          verified_at?: string | null
          withdrawal_request_id?: string
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
      daily_finance_summary: {
        Row: {
          date: string | null
          expenses: number | null
          income: number | null
          net_cash: number | null
        }
        Relationships: []
      }
      department_requisitions: {
        Row: {
          amount_paid: number | null
          amount_pending: number | null
          department: string | null
          month: string | null
          paid_requests: number | null
          total_amount: number | null
          total_requests: number | null
        }
        Relationships: []
      }
      finance_requisitions_dashboard: {
        Row: {
          amount: number | null
          created_at: string | null
          department: string | null
          id: string | null
          original_requester_name: string | null
          payment_processed: boolean | null
          priority_status: string | null
          requisition_number: string | null
          stamp_received_date: string | null
          stamp_reference_number: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          department?: string | null
          id?: string | null
          original_requester_name?: string | null
          payment_processed?: boolean | null
          priority_status?: never
          requisition_number?: string | null
          stamp_received_date?: string | null
          stamp_reference_number?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          department?: string | null
          id?: string | null
          original_requester_name?: string | null
          payment_processed?: boolean | null
          priority_status?: never
          requisition_number?: string | null
          stamp_received_date?: string | null
          stamp_reference_number?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: []
      }
      monthly_payment_summary: {
        Row: {
          average_payment: number | null
          month: string | null
          total_amount: number | null
          total_payments: number | null
          unique_suppliers: number | null
        }
        Relationships: []
      }
      pending_payments_aging: {
        Row: {
          aging_bucket: string | null
          assessed_at: string | null
          days_since_assessment: number | null
          lot_id: string | null
          supplier_code: string | null
          supplier_name: string | null
          total_amount_ugx: number | null
        }
        Relationships: []
      }
      requisition_statistics: {
        Row: {
          awaiting_payment: number | null
          month: string | null
          payment_completed: number | null
          pending_amount: number | null
          pending_payment: number | null
          processed_amount: number | null
          rejected: number | null
          total_amount: number | null
          total_requisitions: number | null
        }
        Relationships: []
      }
      supplier_balances: {
        Row: {
          balance: number | null
          id: string | null
          name: string | null
          total_paid: number | null
          total_payable: number | null
        }
        Relationships: []
      }
      supplier_payments_report: {
        Row: {
          advance_recovered_ugx: number | null
          amount_paid_ugx: number | null
          batch_number: string | null
          coffee_type: string | null
          created_at: string | null
          gross_payable_ugx: number | null
          id: string | null
          lot_id: string | null
          lot_quantity: number | null
          lot_total_amount: number | null
          notes: string | null
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          reference: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          supplier_code: string | null
          supplier_id: string | null
          supplier_name: string | null
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
            foreignKeyName: "supplier_payments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "pending_payments_aging"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
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
      withdrawal_requests: {
        Row: {
          admin_approved: boolean | null
          admin_approved_1: boolean | null
          admin_approved_1_at: string | null
          admin_approved_1_by: string | null
          admin_approved_2: boolean | null
          admin_approved_2_at: string | null
          admin_approved_2_by: string | null
          admin_approved_3: boolean | null
          admin_approved_3_at: string | null
          admin_approved_3_by: string | null
          admin_final_approval: boolean | null
          admin_final_approval_at: string | null
          admin_final_approval_by: string | null
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          channel: string | null
          created_at: string | null
          disbursement_account_name: string | null
          disbursement_account_number: string | null
          disbursement_bank_name: string | null
          disbursement_method: string | null
          disbursement_phone: string | null
          finance_approved_at: string | null
          finance_approved_by: string | null
          finance_review_at: string | null
          finance_review_by: string | null
          finance_reviewed: boolean | null
          id: string | null
          payment_channel: string | null
          payout_attempted_at: string | null
          payout_error: string | null
          payout_ref: string | null
          payout_reference: string | null
          payout_status: string | null
          phone_number: string | null
          reason: string | null
          rejection_reason: string | null
          request_ref: string | null
          request_type: string | null
          requested_by: string | null
          requester_email: string | null
          requester_name: string | null
          requires_three_approvals: boolean | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          wallet_balance_at_approval: number | null
          wallet_balance_verified: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_all_system_data: { Args: never; Returns: Json }
      approve_transfer_reversal:
        | { Args: { p_notes?: string; p_request_id: string }; Returns: Json }
        | { Args: { p_notes?: string; p_request_id: string }; Returns: Json }
      award_activity_reward: {
        Args: { activity_name: string; user_uuid: string }
        Returns: Json
      }
      backfill_missing_inventory_batch_sources: { Args: never; Returns: Json }
      bulk_deduct_unprocessed_sales: {
        Args: { p_coffee_type?: string }
        Returns: {
          sales_processed: number
          sales_short: number
          total_deducted: number
        }[]
      }
      calculate_daily_salary_credit: {
        Args: { employee_salary: number }
        Returns: number
      }
      can_bypass_sms_verification: {
        Args: { user_email: string }
        Returns: boolean
      }
      can_manage_quality_assessments: { Args: never; Returns: boolean }
      can_perform_action: { Args: { action_type: string }; Returns: boolean }
      check_auth_user_exists: { Args: { user_uuid: string }; Returns: Json }
      check_unread_messages_for_sms: { Args: never; Returns: undefined }
      cleanup_expired_email_verification_codes: {
        Args: never
        Returns: undefined
      }
      cleanup_expired_login_codes: { Args: never; Returns: undefined }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      cleanup_inactive_sessions: { Args: never; Returns: undefined }
      cleanup_old_price_calculations: { Args: never; Returns: undefined }
      confirm_cash_transaction: {
        Args: {
          p_approval_role: string
          p_confirmed_by: string
          p_transaction_id: string
        }
        Returns: Json
      }
      create_timothy_auth_account: { Args: never; Returns: Json }
      create_withdrawal_verification_code: {
        Args: {
          p_approver_email: string
          p_approver_phone: string
          p_withdrawal_request_id: string
        }
        Returns: Json
      }
      deduct_from_inventory_batches: {
        Args: {
          p_coffee_type: string
          p_customer?: string
          p_quantity_kg: number
          p_sale_id?: string
        }
        Returns: {
          batch_code: string
          batch_id: string
          deducted_kg: number
        }[]
      }
      ensure_inventory_batch_source_for_record: {
        Args: { p_coffee_record_id: string }
        Returns: Json
      }
      expire_old_bookings: { Args: never; Returns: undefined }
      fix_denis_auth_final: { Args: never; Returns: Json }
      generate_verification_code: { Args: never; Returns: string }
      get_all_wallet_balances: {
        Args: never
        Returns: {
          user_id: string
          wallet_balance: number
        }[]
      }
      get_auth_users_by_emails: {
        Args: { emails: string[] }
        Returns: {
          email: string
          id: string
        }[]
      }
      get_available_to_request: { Args: { user_uuid: string }; Returns: number }
      get_available_to_request_safe: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_available_to_request_text: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_current_user_email: { Args: never; Returns: string }
      get_guarantor_candidates: {
        Args: never
        Returns: {
          email: string
          id: string
          name: string
          phone: string
        }[]
      }
      get_instant_withdrawal_eligibility: {
        Args: { p_user_email: string }
        Returns: Json
      }
      get_or_create_inventory_batch_for_day: {
        Args: { p_batch_date: string; p_coffee_type: string }
        Returns: string
      }
      get_payment_summary_by_date: {
        Args: { end_date: string; start_date: string }
        Returns: {
          avg_payment_ugx: number
          bank_transfer_count: number
          cash_count: number
          cheque_count: number
          mobile_money_count: number
          payment_date: string
          total_amount_ugx: number
          total_payments: number
        }[]
      }
      get_pending_withdrawals: { Args: { user_uuid: string }; Returns: number }
      get_pending_withdrawals_safe: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_pending_withdrawals_text: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_public_employee_profile: {
        Args: { _lookup: string }
        Returns: {
          emp_avatar_url: string
          emp_department: string
          emp_email: string
          emp_employee_id: string
          emp_join_date: string
          emp_name: string
          emp_phone: string
          emp_position: string
          emp_status: string
        }[]
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
      get_user_role:
        | { Args: never; Returns: string }
        | {
            Args: { _user_id: string }
            Returns: Database["public"]["Enums"]["app_role"]
          }
      get_wallet_balance: { Args: { user_uuid: string }; Returns: number }
      get_wallet_balance_safe: { Args: { user_uuid: string }; Returns: number }
      get_wallet_balance_text: { Args: { user_uuid: string }; Returns: number }
      "great pearl": { Args: { conversation_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_quality_assessment: {
        Args: { assessment_data: Json }
        Returns: Json
      }
      invalidate_other_sessions: {
        Args: { p_current_session_token: string; p_user_id: string }
        Returns: undefined
      }
      invalidate_request_tokens: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_current_user_administrator: { Args: never; Returns: boolean }
      is_ip_whitelisted: { Args: { check_ip: string }; Returns: boolean }
      is_manager_or_above: { Args: never; Returns: boolean }
      is_supervisor_or_above: { Args: never; Returns: boolean }
      is_user_role: { Args: never; Returns: boolean }
      log_audit_action: {
        Args: {
          p_action: string
          p_reason?: string
          p_record_data?: Json
          p_record_id: string
          p_table_name: string
        }
        Returns: string
      }
      migrate_approved_assessments_to_finance: { Args: never; Returns: number }
      migrate_batch_numbers_to_new_format: { Args: never; Returns: Json }
      process_daily_salary_credits: { Args: never; Returns: Json }
      process_salary_credits_for_date: {
        Args: { target_date: string }
        Returns: Json
      }
      promote_assessed_to_inventory: {
        Args: never
        Returns: {
          batches_created: number
          records_linked: number
          records_updated: number
          total_kg: number
        }[]
      }
      rebuild_inventory_batches: {
        Args: never
        Returns: {
          batches_created: number
          records_linked: number
          total_kg: number
        }[]
      }
      refresh_current_week_allowances: { Args: never; Returns: Json }
      refresh_monthly_payment_summary: { Args: never; Returns: undefined }
      reject_transfer_reversal: {
        Args: { p_notes?: string; p_request_id: string }
        Returns: Json
      }
      request_transfer_reversal: {
        Args: { p_ledger_entry_id: string; p_reason: string }
        Returns: Json
      }
      reset_money_requests_to_pending_admin: {
        Args: never
        Returns: {
          amount: number
          id: string
          new_stage: string
          old_stage: string
          request_type: string
        }[]
      }
      reverse_wallet_transfer:
        | {
            Args: { p_admin_reason: string; p_ledger_entry_id: string }
            Returns: Json
          }
        | {
            Args: { p_admin_reason: string; p_ledger_entry_id: string }
            Returns: Json
          }
      sync_unlinked_coffee_to_batches: {
        Args: { p_coffee_type?: string }
        Returns: {
          batches_created: number
          records_linked: number
          total_kg: number
        }[]
      }
      test_rls_auth_context: {
        Args: never
        Returns: {
          current_uid: string
          employee_email: string
          employee_found: boolean
          employee_role: string
          employee_status: string
          has_qc_create: boolean
          has_qc_general: boolean
        }[]
      }
      transfer_wallet_funds: {
        Args: {
          p_amount: number
          p_receiver_email: string
          p_receiver_name: string
          p_receiver_user_id: string
          p_reference: string
          p_sender_email: string
          p_sender_name: string
          p_sender_user_id: string
        }
        Returns: Json
      }
      transfer_wallet_funds_secure: {
        Args: {
          p_amount: number
          p_receiver_email: string
          p_reference: string
        }
        Returns: Json
      }
      trigger_daily_salary_processing: { Args: never; Returns: Json }
      update_inventory_batch_source_for_record: {
        Args: { p_coffee_record_id: string }
        Returns: Json
      }
      user_has_permission: {
        Args: { permission_name: string }
        Returns: boolean
      }
      user_is_conversation_participant: {
        Args: { conversation_uuid: string }
        Returns: boolean
      }
      validate_withdrawal_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: boolean
      }
      verify_withdrawal_code: {
        Args: { p_code: string; p_code_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "Super Admin"
        | "Administrator"
        | "Manager"
        | "User"
        | "Supervisor"
        | "finance_assistant"
        | "finance_manager"
        | "accountant"
        | "viewer"
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
        "finance_assistant",
        "finance_manager",
        "accountant",
        "viewer",
      ],
      expense_status: ["PENDING_APPROVAL", "APPROVED", "REJECTED", "POSTED"],
      lot_finance_status: ["READY_FOR_FINANCE", "APPROVED_FOR_PAYMENT", "PAID"],
      payment_method: ["CASH", "CHEQUE", "BANK_TRANSFER"],
      payment_status: ["PENDING_ADMIN_APPROVAL", "POSTED", "VOID"],
    },
  },
} as const
