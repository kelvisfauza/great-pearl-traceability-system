import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date()
    const dayOfWeek = now.getUTCDay() // 0=Sun, 6=Sat
    
    // Only run Monday(1) to Saturday(6)
    if (dayOfWeek === 0) {
      return new Response(JSON.stringify({ message: 'Sunday - no deductions', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const today = now.toISOString().split('T')[0]
    const DEDUCTION_AMOUNT = 5000

    // Get all active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, email, name, auth_user_id')
      .eq('status', 'Active')

    if (empError) throw empError

    let processed = 0
    const deducted: string[] = []

    for (const emp of employees || []) {
      // Check if employee has signed in today via attendance_time_records
      const { data: attendance } = await supabase
        .from('attendance_time_records')
        .select('id, arrival_time')
        .eq('employee_email', emp.email)
        .eq('record_date', today)
        .maybeSingle()

      if (attendance?.arrival_time) {
        // Employee signed in - skip
        continue
      }

      // Check if already auto-deducted today
      const referenceKey = `AUTO-ABSENCE-${today}-${emp.id}`
      const { data: existing } = await supabase
        .from('ledger_entries')
        .select('id')
        .eq('reference', referenceKey)
        .maybeSingle()

      if (existing) {
        // Already deducted today - skip
        continue
      }

      // Get unified user ID
      const { data: userIdData } = await supabase
        .rpc('get_unified_user_id', { input_email: emp.email })
      const userId = userIdData || emp.auth_user_id || emp.id

      // Create negative ledger entry (allows negative balance)
      const { error: ledgerError } = await supabase
        .from('ledger_entries')
        .insert({
          user_id: userId,
          entry_type: 'ADJUSTMENT',
          amount: -DEDUCTION_AMOUNT,
          reference: referenceKey,
          metadata: {
            type: 'auto_absence_deduction',
            employee_name: emp.name,
            employee_email: emp.email,
            date: today,
            reason: 'Not signed in by 9:00 AM',
          }
        })

      if (ledgerError) {
        console.error(`Failed to deduct for ${emp.name}:`, ledgerError)
        continue
      }

      deducted.push(emp.name)
      processed++
    }

    console.log(`Auto-deduction complete: ${processed} employees deducted on ${today}`)

    return new Response(JSON.stringify({
      success: true,
      date: today,
      processed,
      deducted,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Auto-deduction error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
