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
      .select('id, email, name, auth_user_id, phone')
      .eq('status', 'Active')

    if (empError) throw empError

    let processed = 0
    const deducted: string[] = []
    const skipped: string[] = []

    for (const emp of employees || []) {
      if (!emp.auth_user_id) {
        skipped.push(`${emp.name} (no auth_user_id)`)
        continue
      }

      // ONLY check if employee has logged into the system today via user_sessions
      // We do NOT check attendance_time_records because those are fed late
      const { data: session } = await supabase
        .from('user_sessions')
        .select('id, created_at')
        .eq('user_id', emp.auth_user_id)
        .gte('created_at', today + 'T00:00:00Z')
        .lte('created_at', today + 'T06:00:00Z') // 9AM EAT = 6AM UTC
        .limit(1)
        .maybeSingle()

      if (session) {
        // Employee logged into the system before 9AM - skip
        skipped.push(`${emp.name} (logged in)`)
        continue
      }

      // Check if already deducted today
      const { data: existing } = await supabase
        .from('absence_appeals')
        .select('id')
        .eq('employee_id', emp.id)
        .eq('deduction_date', today)
        .maybeSingle()

      if (existing) {
        skipped.push(`${emp.name} (already deducted)`)
        continue
      }

      // Get unified user ID
      const { data: userIdData } = await supabase
        .rpc('get_unified_user_id', { input_email: emp.email })
      const userId = userIdData || emp.auth_user_id || emp.id

      const referenceKey = `AUTO-ABSENCE-${today}-${emp.id}`

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
            reason: 'Not logged into system by 9:00 AM',
          }
        })

      if (ledgerError) {
        console.error(`Failed to deduct for ${emp.name}:`, ledgerError)
        continue
      }

      // Create absence_appeals record for tracking and appeal
      await supabase
        .from('absence_appeals')
        .insert({
          employee_id: emp.id,
          employee_name: emp.name,
          employee_email: emp.email,
          deduction_date: today,
          deduction_amount: DEDUCTION_AMOUNT,
          ledger_reference: referenceKey,
          appeal_status: 'none',
        })

      // Send SMS notification
      if (emp.phone) {
        const smsMessage = `Great Pearl Coffee: UGX ${DEDUCTION_AMOUNT.toLocaleString()} has been deducted from your wallet for not logging into the system by 9:00 AM today (${today}). You can appeal this deduction in the system under My Deductions. Contact HR for assistance.`

        try {
          await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              phone: emp.phone,
              to: emp.phone,
              message: smsMessage,
            }),
          })

          await supabase
            .from('absence_appeals')
            .update({ sms_sent: true })
            .eq('employee_id', emp.id)
            .eq('deduction_date', today)
        } catch (smsErr) {
          console.error(`SMS failed for ${emp.name}:`, smsErr)
        }
      }

      // Also queue SMS via notification queue
      await supabase
        .from('sms_notification_queue')
        .insert({
          recipient_phone: emp.phone || '',
          recipient_email: emp.email,
          message: `Great Pearl Coffee: UGX ${DEDUCTION_AMOUNT.toLocaleString()} deducted for not logging in by 9AM on ${today}. Appeal via system.`,
          notification_type: 'absence_deduction',
          reference_id: referenceKey,
        })

      deducted.push(emp.name)
      processed++
    }

    console.log(`Auto-deduction complete: ${processed} employees deducted, ${skipped.length} skipped on ${today}`)

    return new Response(JSON.stringify({
      success: true,
      date: today,
      processed,
      deducted,
      skipped_count: skipped.length,
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
