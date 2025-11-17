# FarmFlow Data Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Firebase Firestore Structure](#firebase-firestore-structure)
3. [Supabase PostgreSQL Structure](#supabase-postgresql-structure)
4. [Data Synchronization](#data-synchronization)
5. [Security & Access Control](#security--access-control)
6. [Migration Strategy](#migration-strategy)
7. [Developer Guidelines](#developer-guidelines)
8. [Data Flow Diagrams](#data-flow-diagrams)

---

## System Overview

### Architecture Pattern
FarmFlow uses a **hybrid dual-database architecture**:
- **Firebase Firestore** (NoSQL) - Legacy system, gradual deprecation
- **Supabase PostgreSQL** (SQL) - Modern system with Row-Level Security (RLS)

### Why Dual Storage?
1. **Legacy Support**: Firebase contains historical data and powers older modules
2. **Modern Security**: Supabase provides RLS policies for granular access control
3. **Transaction Integrity**: PostgreSQL ensures ACID compliance for financial data
4. **Gradual Migration**: Phased transition without system downtime

---

## Firebase Firestore Structure

### Overview
Firebase is used primarily for:
- Legacy employee records
- Coffee inventory tracking (being migrated)
- Payment records (dual-stored)
- Daily operational tasks
- Historical reports

### Collections

#### 1. `employees`
**Purpose**: Staff and user management (legacy system)

**Schema**:
```javascript
{
  id: string,                    // Auto-generated document ID
  name: string,                  // Full name
  email: string,                 // Unique email (login identifier)
  phone: string,                 // Contact number
  position: string,              // Job title
  department: string,            // Department name
  role: string,                  // User, Supervisor, Manager, Administrator, Super Admin
  permissions: string[],         // Array of permission strings
  salary: number,                // Monthly salary in UGX
  status: string,                // Active, Inactive, Suspended
  authUserId: string,            // Firebase Auth UID
  join_date: timestamp,          // Employment start date
  created_at: timestamp,
  updated_at: timestamp,
  isOneTimePassword: boolean,    // Temporary password flag
  mustChangePassword: boolean    // Force password change on login
}
```

**Indexes**:
- `email` (ascending) - For login queries
- `authUserId` (ascending) - For auth lookups
- `status` (ascending) - For filtering active employees

**Access Patterns**:
- Authentication: Query by `email`
- User profile: Query by `authUserId`
- Department filtering: Query by `department` + `status`

---

#### 2. `payment_records`
**Purpose**: Coffee supplier payment tracking

**Schema**:
```javascript
{
  id: string,
  batchNumber: string,           // Links to coffee_records
  supplier: string,              // Supplier name
  amount: number,                // Total amount owed (UGX)
  paid_amount: number,           // Amount paid so far (UGX)
  balance: number,               // Remaining balance (UGX)
  status: string,                // Pending, Partial, Paid, Completed
  method: string,                // Cash, Bank Transfer, Mobile Money
  notes: string,                 // Payment notes
  created_at: timestamp,
  updated_at: timestamp,
  processed_by: string           // Employee who processed payment
}
```

**Indexes**:
- `batchNumber` (ascending)
- `status` (ascending)
- `updated_at` (descending) - For recent payments

**Business Rules**:
- `balance = amount - paid_amount`
- Status changes: Pending → Partial → Paid/Completed
- Cannot delete once status is "Paid"

---

#### 3. `supplier_advances`
**Purpose**: Track advances given to suppliers

**Schema**:
```javascript
{
  id: string,
  supplier_name: string,
  supplier_id: string,           // Links to suppliers collection
  amount: number,                // Advance amount in UGX
  date: timestamp,               // Date advance was given
  status: string,                // Active, Recovered, Partial
  notes: string,
  outstanding_balance: number,   // Remaining to be recovered
  created_at: timestamp,
  updated_at: timestamp
}
```

**Recovery Logic**:
- Advances are recovered from subsequent coffee purchases
- Each payment can recover multiple advances (FIFO order)

---

#### 4. `coffee_records`
**Purpose**: Coffee purchase and inventory tracking

**Schema**:
```javascript
{
  id: string,
  batch_number: string,          // Unique identifier (GRN number)
  supplier_name: string,
  supplier_id: string,
  coffee_type: string,           // FAQ, Screen 18, Screen 15, Screen 12, Kiboko
  bags: number,                  // Number of bags
  kilograms: number,             // Total weight
  date: timestamp,               // Purchase date
  status: string,                // pending, approved, paid, sold
  created_by: string,            // Employee who recorded
  created_at: timestamp,
  updated_at: timestamp
}
```

**Indexes**:
- `batch_number` (ascending, unique)
- `status` (ascending)
- `date` (descending)
- `supplier_id` (ascending)

**Lifecycle**:
1. Created → `status: pending`
2. Quality assessed → Still pending
3. Quality approved → Migrates to Supabase `finance_coffee_lots`
4. Payment processed → `status: paid`
5. Sold to customer → `status: sold`

---

#### 5. `daily_tasks`
**Purpose**: Log daily operational activities

**Schema**:
```javascript
{
  id: string,
  task_type: string,             // purchase, payment, sale, transfer
  description: string,
  amount: number,                // Optional monetary value
  batch_number: string,          // Optional reference
  completed_by: string,          // Employee email
  completed_at: timestamp,
  department: string,
  date: date,                    // Task date (YYYY-MM-DD)
  created_at: timestamp
}
```

**Use Cases**:
- Day book generation
- Activity tracking
- Performance metrics

---

#### 6. `reports`
**Purpose**: Generated business reports

**Schema**:
```javascript
{
  id: string,
  name: string,
  type: string,                  // daily, monthly, annual, custom
  status: string,                // Ready, Generating, Failed
  downloads: number,
  generated_by: string,
  created_at: timestamp,
  updated_at: timestamp,
  file_url: string,              // Optional: stored in Firebase Storage
  metadata: object               // Report parameters
}
```

---

## Supabase PostgreSQL Structure

### Overview
Supabase is the **primary system** for:
- All approval workflows
- Financial transactions and ledger
- HR and payroll
- New feature development
- Real-time features (messaging, notifications)

---

### Core Tables

#### Authentication & User Management

##### `employees`
**Purpose**: Primary employee table with Supabase Auth integration

**Schema**:
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id),  -- Links to Supabase Auth
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  position TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT DEFAULT 'User',                     -- User, Supervisor, Manager, Administrator, Super Admin
  permissions TEXT[] DEFAULT '{}',
  salary NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Active',
  employee_id TEXT,                             -- Employee number
  address TEXT,
  emergency_contact TEXT,
  avatar_url TEXT,
  join_date TIMESTAMP DEFAULT NOW(),
  disabled BOOLEAN DEFAULT FALSE,
  bypass_sms_verification BOOLEAN DEFAULT FALSE,
  is_training_account BOOLEAN DEFAULT FALSE,
  training_progress INTEGER DEFAULT 0,
  last_notified_role TEXT,
  role_notification_shown_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**RLS Policies**:
- SELECT: Anyone authenticated can view (for lookups)
- INSERT: System/HR only
- UPDATE: Self (own profile) + HR/Admin
- DELETE: Super Admin only

**Triggers**:
- `update_updated_at_column` - Auto-updates `updated_at` on changes
- `sync_employee_to_firebase` - Logs changes for Firebase sync

---

##### `email_verification_codes`
**Purpose**: Email verification for account security

**Schema**:
```sql
CREATE TABLE email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,                           -- 6-digit code
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Lifecycle**:
- Code valid for 10 minutes
- Max 3 attempts
- Auto-cleanup via cron job

---

##### `biometric_credentials`
**Purpose**: Store biometric authentication data

**Schema**:
```sql
CREATE TABLE biometric_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  credential_id TEXT NOT NULL,                  -- WebAuthn credential ID
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `user_sessions`
**Purpose**: Track active user sessions for security

**Schema**:
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Session Management**:
- Auto-logout after 24 hours inactivity
- Force logout on password change
- One active session per device (optional)

---

#### Approval Workflow System

##### `approval_requests`
**Purpose**: Central table for all approval workflows

**Schema**:
```sql
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,                           -- Expense Request, Money Request, Requisition, etc.
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  priority TEXT DEFAULT 'Medium',               -- Low, Medium, High, Urgent
  status TEXT DEFAULT 'Pending',                -- Pending, Pending Finance, Approved, Rejected
  
  -- Requester Info
  requestedby TEXT NOT NULL,                    -- Email
  requestedby_name TEXT,
  requestedby_position TEXT,
  department TEXT NOT NULL,
  daterequested TIMESTAMP NOT NULL,
  
  -- Approval Stage Tracking
  approval_stage TEXT DEFAULT 'pending_admin',  -- pending_admin, pending_finance, completed
  requires_three_approvals BOOLEAN DEFAULT FALSE,
  
  -- Admin Approvals
  admin_approved BOOLEAN,
  admin_approved_by TEXT,
  admin_approved_at TIMESTAMP,
  admin_approved_1 BOOLEAN,
  admin_approved_1_by TEXT,
  admin_approved_1_at TIMESTAMP,
  admin_approved_2 BOOLEAN,
  admin_approved_2_by TEXT,
  admin_approved_2_at TIMESTAMP,
  admin_comments TEXT,
  
  -- Finance Approval
  finance_approved BOOLEAN,
  finance_approved_by TEXT,
  finance_approved_at TIMESTAMP,
  
  -- Rejection
  rejection_reason TEXT,
  rejection_comments TEXT,
  
  -- Additional Data
  payment_method TEXT,                          -- Cash, Bank Transfer, Mobile Money
  details JSONB,                                -- Flexible field for extra data
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Approval Flow Logic**:

1. **Standard 2-Tier** (amounts ≤ threshold):
   - Admin approves → `approval_stage = 'pending_finance'`
   - Finance approves → `status = 'Approved'`

2. **3-Tier** (high amounts):
   - `requires_three_approvals = TRUE`
   - Admin 1 approves → `admin_approved_1 = TRUE`
   - Admin 2 approves → `admin_approved_2 = TRUE`
   - Finance approves → `status = 'Approved'`

**Thresholds**:
- Salary requests > 150,000 UGX → 3-tier
- Expense/Money requests > 70,000 UGX → 3-tier

**RLS Policies**:
- SELECT: All authenticated users (see own + approval queue)
- INSERT: All authenticated users
- UPDATE: Admins (for admin approval), Finance (for finance approval)
- DELETE: Super Admin only (soft delete preferred via archiving)

**Triggers**:
- `process_money_request_three_tier_approval` - Automatically sets status based on approval completion

---

##### `edit_requests`
**Purpose**: Request modifications to locked/approved records

**Schema**:
```sql
CREATE TABLE edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,                     -- Target table
  record_id TEXT NOT NULL,                      -- Target record UUID
  original_data JSONB NOT NULL,                 -- Current data snapshot
  proposed_changes JSONB NOT NULL,              -- Requested changes
  reason TEXT NOT NULL,                         -- Justification
  requested_by TEXT NOT NULL,
  requested_by_department TEXT DEFAULT 'General',
  status TEXT DEFAULT 'pending',                -- pending, approved, rejected
  reviewed_by TEXT,
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Use Cases**:
- Modify locked attendance records
- Update approved payment amounts
- Change completed transaction details

---

##### `deletion_requests`
**Purpose**: Request deletion of important records (audit trail)

**Schema**:
```sql
CREATE TABLE deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  record_data JSONB NOT NULL,                   -- Snapshot before deletion
  reason TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  requested_by_department TEXT NOT NULL,
  requested_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'pending',                -- pending, approved, rejected
  reviewed_by TEXT,
  reviewed_at TIMESTAMP,
  admin_comments TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Trigger**:
- `execute_approved_deletion` - Automatically deletes record when status = 'approved'
- Prevents deletion if payments have been made
- Creates audit log entry

---

#### Finance Operations

##### `finance_coffee_lots`
**Purpose**: Coffee batches approved by quality and ready for payment

**Schema**:
```sql
CREATE TABLE finance_coffee_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_assessment_id UUID UNIQUE,
  coffee_record_id TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  assessed_by TEXT NOT NULL,
  assessed_at TIMESTAMP NOT NULL,
  quality_json JSONB NOT NULL,                  -- Quality parameters
  unit_price_ugx NUMERIC NOT NULL,              -- Price per kg
  quantity_kg NUMERIC NOT NULL,
  finance_status TEXT DEFAULT 'READY_FOR_FINANCE', -- READY_FOR_FINANCE, PAYMENT_INITIATED, PAID
  payment_reference TEXT,
  paid_at TIMESTAMP,
  paid_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Migration Trigger**:
- `auto_migrate_to_finance` - Automatically inserts from `quality_assessments` when status = 'approved'

**Payment Flow**:
1. Quality assessment approved → Auto-migrates here
2. Finance reviews → Initiates payment
3. Payment confirmed → Updates to `PAID`
4. Creates entries in `payment_records` and `supplier_payments`

---

##### `finance_cash_transactions`
**Purpose**: Cash deposits and withdrawals at finance desk

**Schema**:
```sql
CREATE TABLE finance_cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL,               -- DEPOSIT, WITHDRAWAL
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',                -- pending, confirmed, rejected
  reference TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,                     -- Who initiated
  confirmed_by TEXT,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Use Case**:
- Field agents deposit cash collected
- Finance withdraws cash for payments
- Bank deposits/withdrawals
- Petty cash management

---

##### `cash_sessions`
**Purpose**: Daily cash register management

**Schema**:
```sql
CREATE TABLE cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date DATE NOT NULL,
  opened_by TEXT NOT NULL,
  opened_at TIMESTAMP DEFAULT NOW(),
  opening_float_ugx NUMERIC NOT NULL,           -- Starting cash
  closed_by TEXT,
  closed_at TIMESTAMP,
  system_closing_balance_ugx NUMERIC,           -- Calculated from transactions
  declared_cash_on_hand_ugx NUMERIC,            -- Physical count
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Daily Workflow**:
1. Finance opens session with float (e.g., 500,000 UGX)
2. All cash transactions link to session
3. End of day: Physical count vs system balance
4. Variance investigation if mismatch
5. Close session

---

##### `cash_movements`
**Purpose**: Detailed cash flow tracking

**Schema**:
```sql
CREATE TABLE cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES cash_sessions(id),
  source_type TEXT NOT NULL,                    -- payment, deposit, withdrawal, advance
  source_id TEXT NOT NULL,                      -- Reference to source record
  direction TEXT NOT NULL,                      -- IN, OUT
  amount_ugx NUMERIC NOT NULL,
  description TEXT,
  occurred_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `money_requests`
**Purpose**: Employee salary/advance requests (distinct from approval_requests)

**Schema**:
```sql
CREATE TABLE money_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,                        -- Employee identifier
  employee_name TEXT NOT NULL,
  employee_id TEXT,
  request_type TEXT NOT NULL,                   -- salary_advance, lunch_refreshment, emergency
  amount NUMERIC NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',                -- pending, approved, rejected, completed
  approval_stage TEXT DEFAULT 'pending_admin',
  
  -- Two-stage approval
  admin_approved BOOLEAN DEFAULT FALSE,
  admin_approved_by TEXT,
  admin_approved_at TIMESTAMP,
  finance_approved BOOLEAN DEFAULT FALSE,
  finance_approved_by TEXT,
  finance_approved_at TIMESTAMP,
  
  -- Payment tracking
  payment_slip_number TEXT,
  payment_slip_generated BOOLEAN DEFAULT FALSE,
  
  approved_by TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Trigger**:
- `process_money_request_two_step_approval` - Updates user wallet when fully approved

---

##### `ledger_entries`
**Purpose**: Double-entry accounting ledger

**Schema**:
```sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,                        -- Employee UUID as text
  entry_type TEXT NOT NULL,                     -- DAILY_SALARY, WITHDRAWAL, BONUS, DEDUCTION
  amount NUMERIC NOT NULL,                      -- Positive = credit, Negative = debit
  reference TEXT NOT NULL,                      -- Unique transaction reference
  metadata JSONB,                               -- Additional context
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Balance Calculation**:
```sql
SELECT SUM(amount) as balance 
FROM ledger_entries 
WHERE user_id = 'user_uuid';
```

**Entry Types**:
- `DAILY_SALARY`: Daily salary credit (Mon-Sat)
- `WITHDRAWAL`: Money request deduction
- `BONUS`: Performance/overtime bonus
- `DEDUCTION`: Penalties/recoveries

---

##### `withdrawal_requests`
**Purpose**: Employee withdrawal from wallet

**Schema**:
```sql
CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  phone_number TEXT NOT NULL,
  channel TEXT DEFAULT 'mobile_money',          -- mobile_money, bank_transfer, cash
  status TEXT DEFAULT 'pending',                -- pending, approved, processing, completed, failed
  approved_by TEXT,
  approved_at TIMESTAMP,
  processed_at TIMESTAMP,
  transaction_reference TEXT,                   -- External payment reference
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Trigger**:
- `process_withdrawal_approval` - Deducts from ledger when status = 'approved'

---

##### `supplier_payments`
**Purpose**: Track payments made to suppliers

**Schema**:
```sql
CREATE TABLE supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  amount_ugx NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  payment_date DATE NOT NULL,
  recorded_by TEXT NOT NULL,
  reference TEXT,                               -- Check number, transfer ID
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `advance_recoveries`
**Purpose**: Link payments to advance recovery

**Schema**:
```sql
CREATE TABLE advance_recoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id UUID REFERENCES supplier_advances(id),
  payment_id UUID REFERENCES supplier_payments(id),
  recovered_ugx NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Recovery Logic**:
```
Payment Amount: 1,000,000 UGX
Outstanding Advances:
  - Advance 1: 300,000 UGX
  - Advance 2: 500,000 UGX
  
Recovery:
  - Advance 1: Fully recovered (300,000)
  - Advance 2: Partially recovered (500,000)
  - Net to Supplier: 200,000 UGX
```

---

#### HR & Payroll

##### `company_employees`
**Purpose**: Official company payroll records

**Schema**:
```sql
CREATE TABLE company_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT UNIQUE NOT NULL,             -- Official employee number
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  position TEXT NOT NULL,
  department TEXT NOT NULL,
  base_salary NUMERIC DEFAULT 0,
  allowances NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  hire_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Difference from `employees`**:
- `employees`: System users (can login)
- `company_employees`: All staff on payroll (may not have system access)

---

##### `salary_payments`
**Purpose**: Bulk salary processing records

**Schema**:
```sql
CREATE TABLE salary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,                          -- 'January 2024'
  employee_count INTEGER NOT NULL,
  total_pay NUMERIC NOT NULL,
  bonuses NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  employee_details JSONB NOT NULL,              -- Array of payment details
  status TEXT DEFAULT 'Pending',                -- Pending, Processed, Completed
  payment_method TEXT DEFAULT 'Bank Transfer',
  processed_by TEXT NOT NULL,
  processed_date TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**employee_details JSONB structure**:
```json
[
  {
    "employee_id": "EMP001",
    "name": "John Doe",
    "base_salary": 800000,
    "allowances": 150000,
    "deductions": 50000,
    "net_pay": 900000,
    "account_number": "1234567890"
  }
]
```

---

##### `salary_payslips`
**Purpose**: Individual payslip generation

**Schema**:
```sql
CREATE TABLE salary_payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES company_employees(id),
  employee_name TEXT NOT NULL,
  employee_id_number TEXT NOT NULL,
  pay_period_month INTEGER NOT NULL,            -- 1-12
  pay_period_year INTEGER NOT NULL,
  base_salary NUMERIC NOT NULL,
  allowances NUMERIC NOT NULL,
  gross_salary NUMERIC NOT NULL,
  deductions NUMERIC NOT NULL,
  net_salary NUMERIC NOT NULL,
  generated_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Generated',              -- Generated, Sent, Printed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `attendance`
**Purpose**: Daily attendance tracking

**Schema**:
```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'present',                -- present, absent, leave, half_day
  marked_by TEXT NOT NULL,
  marked_at TIMESTAMP,
  notes TEXT,
  is_locked BOOLEAN DEFAULT FALSE,              -- Prevents editing
  locked_by TEXT,
  locked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(employee_id, date)
);
```

**Trigger**:
- `lock_attendance_on_mark` - Auto-locks attendance when marked
- `calculate_weekly_allowance` - Updates weekly allowances based on attendance

---

##### `weekly_allowances`
**Purpose**: Attendance-based lunch allowances

**Schema**:
```sql
CREATE TABLE weekly_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  week_start_date DATE NOT NULL,                -- Monday
  week_end_date DATE NOT NULL,                  -- Saturday
  days_attended INTEGER NOT NULL,               -- 0-6 (Mon-Sat only)
  total_eligible_amount NUMERIC NOT NULL,       -- days_attended * 2500
  balance_available NUMERIC NOT NULL,           -- total - requested
  amount_requested NUMERIC DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(employee_id, week_start_date)
);
```

**Rules**:
- 2,500 UGX per day attended
- Monday to Saturday only (Sundays excluded)
- Auto-calculated via trigger
- Employees request through `money_requests` with type `lunch_refreshment`

**Trigger**:
- `check_weekly_allowance_limit` - Prevents over-requesting

---

##### `overtime_awards`
**Purpose**: Overtime tracking and payment

**Schema**:
```sql
CREATE TABLE overtime_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  department TEXT NOT NULL,
  hours INTEGER DEFAULT 0,
  minutes INTEGER DEFAULT 0,
  total_amount NUMERIC NOT NULL,                -- Calculated rate
  status TEXT DEFAULT 'pending',                -- pending, claimed, completed
  reference_number TEXT,
  created_by TEXT NOT NULL,                     -- HR who awarded
  claimed_at TIMESTAMP,
  completed_by TEXT,
  completed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Status Flow**:
1. HR creates award → `pending`
2. Employee claims → `claimed`
3. Finance processes → `completed`

---

#### Procurement & Inventory

##### `suppliers`
**Purpose**: Supplier master data

**Schema**:
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,                    -- Auto-generated (SUP-001)
  phone TEXT,
  origin TEXT NOT NULL,                         -- District/region
  opening_balance NUMERIC DEFAULT 0,
  date_registered DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `supplier_contracts`
**Purpose**: Procurement contracts with suppliers

**Schema**:
```sql
CREATE TABLE supplier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT NOT NULL,
  contract_type TEXT NOT NULL,                  -- Forward Contract, Spot Purchase
  date DATE NOT NULL,
  kilograms_expected NUMERIC NOT NULL,
  price_per_kg NUMERIC NOT NULL,
  advance_given NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Active',                 -- Active, Completed, Voided
  approval_status TEXT DEFAULT 'approved',
  approved_by TEXT,
  approved_at TIMESTAMP DEFAULT NOW(),
  voided_by TEXT,
  voided_at TIMESTAMP,
  void_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `contract_approvals`
**Purpose**: Approve contract modifications

**Schema**:
```sql
CREATE TABLE contract_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES supplier_contracts(id),
  action_type TEXT NOT NULL,                    -- void, modify, extend
  reason TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'pending',                -- pending, approved, rejected
  approved_by TEXT,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `quality_assessments`
**Purpose**: Coffee quality grading

**Schema**:
```sql
CREATE TABLE quality_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_record_id TEXT NOT NULL,                -- Links to coffee_records
  batch_number TEXT NOT NULL,
  moisture NUMERIC NOT NULL,                    -- Percentage
  group1_defects INTEGER NOT NULL,              -- Primary defects
  group2_defects INTEGER NOT NULL,              -- Secondary defects
  below12 NUMERIC NOT NULL,                     -- Screen 12 rejects (%)
  pods NUMERIC NOT NULL,                        -- Pod count
  husks NUMERIC NOT NULL,                       -- Husk count
  stones NUMERIC NOT NULL,                      -- Stone count
  suggested_price NUMERIC NOT NULL,             -- Price per kg
  status TEXT DEFAULT 'pending',                -- pending, approved, rejected
  assessed_by TEXT NOT NULL,
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Trigger**:
- `auto_migrate_to_finance` - When status = 'approved', creates `finance_coffee_lots` entry

---

##### `inventory_items`
**Purpose**: Aggregated inventory by coffee type

**Schema**:
```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coffee_type TEXT UNIQUE NOT NULL,
  total_bags INTEGER DEFAULT 0,
  total_kilograms NUMERIC DEFAULT 0,
  location TEXT DEFAULT 'Main Warehouse',
  status TEXT DEFAULT 'available',              -- available, reserved, sold
  batch_numbers TEXT[],                         -- Array of batch numbers
  last_updated DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Auto-Update**:
- Updated when coffee_records inserted/updated
- Reduced when sales_transactions created

---

##### `inventory_movements`
**Purpose**: Track all inventory changes

**Schema**:
```sql
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_type TEXT NOT NULL,                  -- purchase, sale, transfer, adjustment
  coffee_record_id TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL,
  reference_type TEXT,                          -- sale_id, transfer_id, etc.
  reference_id TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

#### Field Operations

##### `farmer_profiles`
**Purpose**: Farmer registration database

**Schema**:
```sql
CREATE TABLE farmer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_name TEXT NOT NULL,
  phone TEXT,
  village TEXT NOT NULL,
  district TEXT NOT NULL,
  gps_coordinates TEXT,                         -- lat,lng
  farm_size_acres NUMERIC,
  coffee_trees INTEGER,
  registered_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `field_purchases`
**Purpose**: Coffee purchases by field agents

**Schema**:
```sql
CREATE TABLE field_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT UNIQUE NOT NULL,
  farmer_id UUID REFERENCES farmer_profiles(id),
  farmer_name TEXT NOT NULL,
  kilograms NUMERIC NOT NULL,
  price_per_kg NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  purchase_date DATE NOT NULL,
  location TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  payment_status TEXT DEFAULT 'pending',        -- pending, paid
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Flow**:
1. Field agent records purchase
2. Creates `coffee_records` entry
3. Updates `inventory_items`

---

##### `daily_reports`
**Purpose**: Field agent daily activity reports

**Schema**:
```sql
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by TEXT NOT NULL,                   -- Agent email
  report_date DATE DEFAULT CURRENT_DATE,
  district TEXT NOT NULL,
  villages_visited TEXT NOT NULL,               -- Comma-separated
  farmers_visited TEXT[],                       -- Array of farmer names
  total_kgs_mobilized NUMERIC DEFAULT 0,
  challenges TEXT,
  actions_needed TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `field_attendance_logs`
**Purpose**: Field agent GPS check-in/out

**Schema**:
```sql
CREATE TABLE field_attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_agent TEXT NOT NULL,
  location_name TEXT,
  date DATE DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMP DEFAULT NOW(),
  check_in_gps_latitude NUMERIC,
  check_in_gps_longitude NUMERIC,
  check_out_time TIMESTAMP,
  check_out_gps_latitude NUMERIC,
  check_out_gps_longitude NUMERIC,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `facilitation_requests`
**Purpose**: Field financing requests

**Schema**:
```sql
CREATE TABLE facilitation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by TEXT NOT NULL,
  request_type TEXT NOT NULL,                   -- transport, tools, advance
  purpose TEXT NOT NULL,
  amount_requested NUMERIC NOT NULL,
  date_needed DATE NOT NULL,
  status TEXT DEFAULT 'Pending',                -- Pending, Approved, Rejected
  approved_by TEXT,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  evidence_url TEXT,                            -- Receipt/proof upload
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

#### Sales & Marketing

##### `customers`
**Purpose**: Customer master data

**Schema**:
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  country TEXT NOT NULL,
  status TEXT DEFAULT 'Active',
  total_orders INTEGER DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `sales_transactions`
**Purpose**: Coffee sales records

**Schema**:
```sql
CREATE TABLE sales_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer TEXT NOT NULL,
  coffee_type TEXT NOT NULL,
  date DATE NOT NULL,
  weight NUMERIC NOT NULL,                      -- Kilograms
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  moisture TEXT,                                -- Quality at sale
  truck_details TEXT NOT NULL,
  driver_details TEXT NOT NULL,
  status TEXT DEFAULT 'Completed',
  grn_file_url TEXT,                            -- GRN document
  grn_file_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Auto-Actions**:
- Creates `sales_inventory_tracking` entry
- Reduces `inventory_items`
- Creates `inventory_movements` record

---

##### `sales_inventory_tracking`
**Purpose**: Link sales to inventory batches

**Schema**:
```sql
CREATE TABLE sales_inventory_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id TEXT NOT NULL,
  coffee_record_id TEXT NOT NULL,
  batch_number TEXT,
  coffee_type TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL,
  customer_name TEXT,
  sale_date TIMESTAMP DEFAULT NOW(),
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `sales_contracts`
**Purpose**: Sales agreements with buyers

**Schema**:
```sql
CREATE TABLE sales_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  coffee_type TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL,
  price_per_kg NUMERIC NOT NULL,
  total_value NUMERIC NOT NULL,
  contract_date DATE NOT NULL,
  delivery_deadline DATE,
  status TEXT DEFAULT 'Active',                 -- Active, Fulfilled, Cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `marketing_campaigns`
**Purpose**: Marketing activity tracking

**Schema**:
```sql
CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  budget NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'Planning',               -- Planning, Active, Completed
  roi_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

#### Milling Operations

##### `milling_customers`
**Purpose**: Milling service customers

**Schema**:
```sql
CREATE TABLE milling_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  phone TEXT,
  location TEXT,
  current_balance NUMERIC DEFAULT 0,            -- Outstanding debt
  total_kgs_hulled NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `milling_transactions`
**Purpose**: Hulling service transactions

**Schema**:
```sql
CREATE TABLE milling_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES milling_customers(id),
  customer_name TEXT NOT NULL,
  transaction_type TEXT DEFAULT 'hulling',      -- hulling, payment
  date DATE DEFAULT CURRENT_DATE,
  kgs_hulled NUMERIC NOT NULL,
  rate_per_kg NUMERIC DEFAULT 150,              -- Hulling rate
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `milling_cash_transactions`
**Purpose**: Milling payment tracking

**Schema**:
```sql
CREATE TABLE milling_cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES milling_customers(id),
  transaction_type TEXT NOT NULL,               -- PAYMENT, CHARGE
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'Cash',
  reference TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

#### EUDR Compliance

##### `eudr_documents`
**Purpose**: Due diligence documentation

**Schema**:
```sql
CREATE TABLE eudr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT UNIQUE NOT NULL,
  total_kilograms NUMERIC NOT NULL,
  available_kilograms NUMERIC NOT NULL,
  status TEXT DEFAULT 'documented',             -- documented, partially_sold, sold_out
  documentation_date DATE DEFAULT CURRENT_DATE,
  farmer_details JSONB NOT NULL,                -- Farmer information
  gps_coordinates JSONB NOT NULL,               -- Farm coordinates
  risk_assessment TEXT DEFAULT 'low_risk',      -- low_risk, medium_risk, high_risk
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Trigger**:
- `create_eudr_batches` - Auto-creates 5-tonne batches on insert

---

##### `eudr_batches`
**Purpose**: 5-tonne batch tracking for EU sales

**Schema**:
```sql
CREATE TABLE eudr_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES eudr_documents(id),
  batch_sequence INTEGER NOT NULL,              -- 1, 2, 3...
  batch_identifier TEXT UNIQUE NOT NULL,        -- GRN-001-BATCH-1
  kilograms NUMERIC NOT NULL,                   -- Max 5000
  available_kilograms NUMERIC NOT NULL,
  receipts TEXT[],                              -- Sales receipts
  status TEXT DEFAULT 'available',              -- available, sold
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Trigger**:
- `update_document_status_from_batches` - Updates parent document when batches sold

---

##### `eudr_polygons`
**Purpose**: Farm GPS boundary data

**Schema**:
```sql
CREATE TABLE eudr_polygons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES eudr_documents(id),
  farm_id TEXT NOT NULL,
  polygon_coordinates JSONB NOT NULL,           -- Array of [lat, lng] points
  area_hectares NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

#### Communication

##### `finance_notifications`
**Purpose**: System notifications

**Schema**:
```sql
CREATE TABLE finance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,                           -- approval_request, payment_due, etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium',               -- Low, Medium, High, Urgent
  target_role TEXT,                             -- Finance, HR, Admin
  target_user_email TEXT,                       -- Specific user
  sender_name TEXT,
  sender_email TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `announcements`
**Purpose**: Company-wide announcements

**Schema**:
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'draft',                  -- draft, sent
  target_roles TEXT[],                          -- Filter by role
  target_departments TEXT[],                    -- Filter by department
  send_sms BOOLEAN DEFAULT FALSE,
  recipients_count INTEGER,
  sms_sent_count INTEGER,
  created_by TEXT NOT NULL,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `messages`
**Purpose**: Internal messaging

**Schema**:
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',             -- text, file, image
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `conversations`
**Purpose**: Chat conversations

**Schema**:
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT DEFAULT 'direct',                   -- direct, group
  name TEXT,                                    -- Group name
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `conversation_participants`
**Purpose**: Chat participants

**Schema**:
```sql
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  user_id TEXT,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_read_at TIMESTAMP
);
```

---

##### `sms_logs`
**Purpose**: SMS delivery tracking

**Schema**:
```sql
CREATE TABLE sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  recipient_email TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',                -- pending, sent, failed, delivered
  sms_type TEXT NOT NULL,                       -- verification, notification, approval
  api_response TEXT,
  api_message_id TEXT,
  cost NUMERIC,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `sms_failures`
**Purpose**: Track failed SMS for IT troubleshooting

**Schema**:
```sql
CREATE TABLE sms_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_name TEXT,
  user_phone TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  failure_reason TEXT,
  department TEXT,
  role TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

#### System & Analytics

##### `audit_logs`
**Purpose**: Complete audit trail

**Schema**:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,                         -- create, update, delete, approve, reject
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  department TEXT,
  reason TEXT,
  record_data JSONB,                            -- Snapshot of data
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Use Cases**:
- Compliance audits
- Fraud investigation
- Change tracking
- Performance review

---

##### `metrics`
**Purpose**: Business KPIs

**Schema**:
```sql
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  period TEXT NOT NULL,                         -- daily, weekly, monthly
  date_recorded DATE DEFAULT CURRENT_DATE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Example Metrics**:
- Daily coffee purchases
- Weekly farmer registrations
- Monthly sales volume
- Supplier payment efficiency

---

##### `storage_locations`
**Purpose**: Warehouse capacity management

**Schema**:
```sql
CREATE TABLE storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  capacity INTEGER NOT NULL,                    -- In bags
  current_occupancy INTEGER DEFAULT 0,
  occupancy_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `vehicles`
**Purpose**: Fleet management

**Schema**:
```sql
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number TEXT UNIQUE NOT NULL,
  vehicle_type TEXT NOT NULL,                   -- Truck, Pickup, Van
  capacity_kg NUMERIC NOT NULL,
  status TEXT DEFAULT 'Available',              -- Available, In Transit, Maintenance
  current_driver TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

##### `network_whitelist`
**Purpose**: IP access control

**Schema**:
```sql
CREATE TABLE network_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Function**:
- `is_ip_whitelisted(check_ip TEXT)` - Returns boolean

---

#### Archive Tables

##### `archived_approval_requests`
**Purpose**: Historical approval records

**Schema**: Same as `approval_requests` plus:
```sql
  archive_period TEXT NOT NULL,                 -- '2024-Q1', '2024-January'
  archived_at TIMESTAMP DEFAULT NOW(),
  archived_by TEXT
```

---

##### `archived_payment_records`
**Purpose**: Historical payment data

---

##### `archived_finance_cash_transactions`
**Purpose**: Historical cash transactions

---

##### `archived_money_requests`
**Purpose**: Historical money requests

---

##### `archive_history`
**Purpose**: Track archiving operations

**Schema**:
```sql
CREATE TABLE archive_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_period TEXT NOT NULL,
  archived_by TEXT NOT NULL,
  archive_date TIMESTAMP DEFAULT NOW(),
  records_archived JSONB,                       -- Count per table
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Data Synchronization

### Synced Entities

#### 1. **Employees** (Firebase ➜ Supabase)

**Primary Source**: Firebase
**Sync Direction**: One-way to Supabase
**Trigger**: `sync_employee_to_firebase` (logs changes)
**Utility**: `src/utils/syncSupabaseToFirebase.ts`

**Sync Logic**:
```typescript
// Fetch from Supabase
const { data: supabaseEmployees } = await supabase
  .from('employees')
  .select('*');

// For each Supabase employee
for (const emp of supabaseEmployees) {
  // Query Firebase by email
  const firebaseQuery = query(
    collection(db, 'employees'),
    where('email', '==', emp.email)
  );
  
  // If exists: update
  // If not exists: insert
}
```

**Conflict Resolution**: Supabase wins (newer system)

---

#### 2. **Coffee Records** (Firebase ➜ Supabase)

**Primary Source**: Firebase (legacy)
**New Records**: Supabase
**Utility**: `src/utils/restoreFirebaseCoffeeRecords.ts`

**Sync Logic**:
- Quality-approved records migrate to `finance_coffee_lots`
- Original record stays in Firebase
- Sales update both systems

---

#### 3. **Payment Records** (Dual-Write)

**Both systems maintain**: `payment_records`
**Reason**: Legacy compatibility

**Write Pattern**:
```typescript
// Create in Firebase
await addDoc(collection(db, 'payment_records'), paymentData);

// Also create in Supabase
await supabase.from('payment_records').insert(paymentData);
```

---

#### 4. **Suppliers** (Migrating to Supabase)

**Current State**: Firebase primary
**Future State**: Supabase primary
**Strategy**: New suppliers → Supabase only

---

### Sync Utilities

Location: `src/utils/`

- `syncSupabaseToFirebase.ts` - Employee sync
- `restoreFirebaseCoffeeRecords.ts` - Coffee inventory sync
- `backfillSalesTracking.ts` - Historical sales sync

---

## Security & Access Control

### Row-Level Security (RLS) Policies

#### Pattern: Role-Based Access

```sql
-- Example: Only Finance can view finance_cash_transactions
CREATE POLICY "Finance users can view cash transactions"
  ON finance_cash_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE auth_user_id = auth.uid()
        AND department = 'Finance'
        AND status = 'Active'
    )
  );
```

---

#### Pattern: Ownership-Based Access

```sql
-- Example: Users can view their own overtime awards
CREATE POLICY "Users can view own overtime"
  ON overtime_awards FOR SELECT
  USING (employee_email = (auth.jwt() ->> 'email'));
```

---

#### Pattern: Approval Hierarchy

```sql
-- Example: Admin can approve requests
CREATE POLICY "Admin can approve requests"
  ON approval_requests FOR UPDATE
  USING (is_current_user_admin());
```

---

### Security Functions

#### `is_current_user_admin()`
```sql
CREATE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
      AND role = 'Super Admin'
      AND status = 'Active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### `user_has_permission(permission_name TEXT)`
```sql
CREATE FUNCTION user_has_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
      AND status = 'Active'
      AND (
        role = 'Super Admin'
        OR permission_name = ANY(permissions)
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Permission System

**Roles** (hierarchical):
1. **User** - Basic access
2. **Supervisor** - Team oversight
3. **Manager** - Department management
4. **Administrator** - System-wide access
5. **Super Admin** - Full control

**Granular Permissions** (array):
- `Finance`
- `Human Resources`
- `Procurement`
- `Quality Control`
- `Field Operations`
- `Sales & Marketing`
- `Data Analytics`
- `System Administration`

**Access Logic**:
```typescript
// Super Admin: Has all permissions
if (employee.role === 'Super Admin') return true;

// Check specific permission
if (employee.permissions.includes('Finance')) {
  // Can access finance modules
}
```

---

## Migration Strategy

### Phase 1: Dual-Write (Current)
- Critical tables written to both systems
- Firebase remains primary for reads
- Gradual RLS policy implementation

### Phase 2: Supabase Primary (In Progress)
- New features → Supabase only
- Approval workflows → Supabase only
- Finance operations → Supabase only
- Firebase read-only for legacy data

### Phase 3: Firebase Deprecation (Future)
- Complete data migration to Supabase
- Firebase becomes cold storage
- Real-time sync disabled

---

## Developer Guidelines

### Writing New Features

#### ✅ DO:
1. **Use Supabase for new tables**
2. **Implement RLS policies immediately**
3. **Use audit logging** (`audit_logs` table)
4. **Follow trigger patterns** (auto-update timestamps, workflows)
5. **Use JSONB for flexible data** (metadata, details fields)
6. **Create focused tables** (single responsibility)

#### ❌ DON'T:
1. **Don't write to Firebase** for new features
2. **Don't skip RLS policies** (security first)
3. **Don't store sensitive data unencrypted**
4. **Don't create cross-database foreign keys**
5. **Don't bypass approval workflows**

---

### Query Patterns

#### Fetching with Relations
```typescript
// ✅ Good: Single query with join
const { data } = await supabase
  .from('finance_coffee_lots')
  .select(`
    *,
    supplier:suppliers(name, code)
  `)
  .eq('finance_status', 'READY_FOR_FINANCE');
```

#### Updating with Trigger
```typescript
// ✅ Good: Let trigger handle auto-fields
const { data } = await supabase
  .from('approval_requests')
  .update({
    admin_approved: true,
    admin_approved_by: adminName
    // updated_at handled by trigger
  });
```

#### Realtime Subscriptions
```typescript
// ✅ Good: Subscribe to changes
const channel = supabase
  .channel('approval-changes')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'approval_requests',
      filter: `status=eq.Pending Finance`
    },
    (payload) => {
      console.log('New approval:', payload);
      refetchData();
    }
  )
  .subscribe();
```

---

### Testing Data Changes

#### Use Supabase SQL Editor
```sql
-- Check approval workflow state
SELECT 
  id,
  title,
  amount,
  status,
  admin_approved,
  finance_approved
FROM approval_requests
WHERE requestedby = 'user@example.com'
ORDER BY created_at DESC
LIMIT 5;
```

#### Use Edge Functions for Complex Logic
```typescript
// supabase/functions/process-daily-salary/index.ts
Deno.serve(async (req) => {
  const result = await processAllEmployees();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## Data Flow Diagrams

### Approval Workflow Flow

```
User Submission
     ↓
  approval_requests (status: Pending)
     ↓
Admin Review → AdminExpenseRequestsManager
     ↓
  admin_approved = true
  status = 'Pending Finance'
     ↓
Finance Review → PendingApprovalRequests
     ↓
  finance_approved = true
  status = 'Approved'
     ↓
Payment Processing
     ↓
  finance_cash_transactions
  supplier_payments
  ledger_entries
     ↓
Completed
```

---

### Coffee Purchase Flow

```
Field Agent Purchase
     ↓
  field_purchases (Supabase)
     ↓
  coffee_records (Firebase + Supabase)
     ↓
Quality Assessment
     ↓
  quality_assessments (status: pending)
     ↓
Quality Approval (trigger)
     ↓
  quality_assessments (status: approved)
  finance_coffee_lots (READY_FOR_FINANCE)
     ↓
Finance Payment
     ↓
  finance_coffee_lots (PAID)
  payment_records
  supplier_payments
  advance_recoveries
     ↓
Coffee Sold
     ↓
  sales_transactions
  sales_inventory_tracking
  inventory_movements
     ↓
Inventory Updated
     ↓
  inventory_items (reduced)
  coffee_records (status: sold)
```

---

### Employee Salary Flow

```
Daily (Mon-Sat, 8 AM)
     ↓
Edge Function: process-daily-salary
     ↓
Calculate: monthly_salary / days_in_month
     ↓
  ledger_entries (DAILY_SALARY, positive amount)
     ↓
User Wallet Balance Updated
     ↓
User Requests Withdrawal
     ↓
  money_requests (status: pending)
     ↓
Admin Approves
     ↓
  money_requests (admin_approved: true)
     ↓
Finance Approves
     ↓
  money_requests (finance_approved: true, status: approved)
  ledger_entries (WITHDRAWAL, negative amount)
  withdrawal_requests (status: approved)
     ↓
Payment Processed
     ↓
  withdrawal_requests (status: completed)
```

---

## Summary Table

| **Category** | **Primary Storage** | **Tables** | **Access Control** |
|-------------|-------------------|------------|-------------------|
| **User Auth** | Supabase Auth | `employees`, `biometric_credentials` | RLS by auth.uid() |
| **Approvals** | Supabase | `approval_requests`, `money_requests` | RLS by role |
| **Finance** | Supabase | `finance_coffee_lots`, `cash_sessions`, `ledger_entries` | RLS by department |
| **HR** | Supabase | `company_employees`, `attendance`, `overtime_awards` | RLS by role |
| **Inventory** | Firebase → Supabase | `coffee_records`, `inventory_items` | RLS public read |
| **Field Ops** | Supabase | `farmer_profiles`, `field_purchases`, `daily_reports` | RLS by role |
| **Milling** | Supabase | `milling_customers`, `milling_transactions` | RLS by department |
| **Sales** | Supabase | `sales_transactions`, `customers` | RLS by department |
| **EUDR** | Supabase | `eudr_documents`, `eudr_batches` | RLS by role |
| **Communication** | Supabase | `messages`, `announcements`, `sms_logs` | RLS by user/role |
| **Audit** | Supabase | `audit_logs`, `metrics` | RLS admin only |

---

## Conclusion

Your FarmFlow system uses a sophisticated dual-database architecture:

- **Firebase**: Legacy NoSQL storage for historical data
- **Supabase**: Modern SQL database with RLS for new features

The migration strategy is **gradual and safe**, with critical data synced between systems. All new development should target Supabase for better security, integrity, and real-time capabilities.

**Key Principles**:
1. ✅ Security first (RLS policies)
2. ✅ Audit everything (audit_logs)
3. ✅ Trigger-based automation (timestamps, workflows)
4. ✅ Flexible metadata (JSONB fields)
5. ✅ Clear separation of duties (approval hierarchies)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-19  
**Maintained By**: System Architecture Team
