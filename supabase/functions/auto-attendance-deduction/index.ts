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
    const dayOfWeek = now.getUTCDay() // 0=Sun, 1=Mon, ...

    // Only run on Monday (1)
    if (dayOfWeek !== 1) {
      return new Response(JSON.stringify({ 
        message: 'Not Monday - weekly deductions only run on Mondays', 
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Calculate previous week range: last Monday to last Saturday
    const lastMonday = new Date(now)
    lastMonday.setUTCDate(now.getUTCDate() - 7)
    const lastMondayStr = lastMonday.toISOString().split('T')[0]

    const lastSaturday = new Date(now)
    lastSaturday.setUTCDate(now.getUTCDate() - 2)
    const lastSaturdayStr = lastSaturday.toISOString().split('T')[0]

    const RATE_PER_HOUR = 1000 // UGX per net late hour

    // Get all attendance time records for previous week
    const { data: records, error: recError } = await supabase
      .from('attendance_time_records')
      .select('employee_id, employee_name, employee_email, late_minutes, overtime_minutes')
      .gte('record_date', lastMondayStr)
      .lte('record_date', lastSaturdayStr)

    if (recError) throw recError

    if (!records || records.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No attendance records found for previous week',
        week: `${lastMondayStr} to ${lastSaturdayStr}`,
        processed: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Aggregate per employee: total late - total overtime
    const employeeMap: Record<string, {
      name: string
      email: string
      totalLate: number
      totalOvertime: number
    }> = {}

    for (const rec of records) {
      if (!employeeMap[rec.employee_id]) {
        employeeMap[rec.employee_id] = {
          name: rec.employee_name,
          email: rec.employee_email,
          totalLate: 0,
          totalOvertime: 0,
        }
      }
      employeeMap[rec.employee_id].totalLate += (rec.late_minutes || 0)
      employeeMap[rec.employee_id].totalOvertime += (rec.overtime_minutes || 0)
    }

    let processed = 0
    const deducted: string[] = []
    const skipped: string[] = []

    for (const [employeeId, data] of Object.entries(employeeMap)) {
      const netLateMinutes = data.totalLate - data.totalOvertime
      
      if (netLateMinutes <= 0) {
        skipped.push(`${data.name} (net late: ${netLateMinutes}min - no deduction)`)
        continue
      }

      const netLateHours = Math.ceil(netLateMinutes / 60)
      const deductionAmount = netLateHours * RATE_PER_HOUR

      // Get employee auth_user_id and phone
      const { data: emp } = await supabase
        .from('employees')
        .select('id, auth_user_id, phone, email')
        .eq('id', employeeId)
        .eq('status', 'Active')
        .maybeSingle()

      if (!emp || !emp.auth_user_id) {
        skipped.push(`${data.name} (no auth account)`)
        continue
      }

      const referenceKey = `AUTO-WEEKLY-LATE-${lastMondayStr}-${employeeId}`

      // Check if already deducted for this week
      const { data: existing } = await supabase
        .from('ledger_entries')
        .select('id')
        .eq('reference', referenceKey)
        .maybeSingle()

      if (existing) {
        skipped.push(`${data.name} (already deducted this week)`)
        continue
      }

      // Get unified user ID
      const { data: userIdData } = await supabase
        .rpc('get_unified_user_id', { input_email: emp.email })
      const userId = userIdData || emp.auth_user_id || emp.id

      // Create negative ledger entry
      const { error: ledgerError } = await supabase
        .from('ledger_entries')
        .insert({
          user_id: userId,
          entry_type: 'ADJUSTMENT',
          amount: -deductionAmount,
          reference: referenceKey,
          metadata: {
            type: 'weekly_late_deduction',
            employee_name: data.name,
            employee_email: data.email,
            week_start: lastMondayStr,
            week_end: lastSaturdayStr,
            total_late_minutes: data.totalLate,
            total_overtime_minutes: data.totalOvertime,
            net_late_minutes: netLateMinutes,
            net_late_hours: netLateHours,
            rate_per_hour: RATE_PER_HOUR,
          }
        })

      if (ledgerError) {
        console.error(`Failed to deduct for ${data.name}:`, ledgerError)
        continue
      }

      // Create absence_appeals record for tracking
      await supabase
        .from('absence_appeals')
        .insert({
          employee_id: employeeId,
          employee_name: data.name,
          employee_email: data.email,
          deduction_date: lastMondayStr,
          deduction_amount: deductionAmount,
          ledger_reference: referenceKey,
          appeal_status: 'none',
          reason: `Weekly late deduction: ${data.totalLate}min late - ${data.totalOvertime}min overtime = ${netLateMinutes}min net late (${netLateHours}hrs x UGX ${RATE_PER_HOUR})`,
        })

      // Send SMS notification
      if (emp.phone) {
        const message = `Great Agro Coffee: UGX ${deductionAmount.toLocaleString()} deducted for ${netLateHours}hr(s) net late time last week (${lastMondayStr} to ${lastSaturdayStr}). Appeal via My Deductions.`
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ phone: emp.phone, to: emp.phone, message }),
          })
        } catch (smsErr) {
          console.error(`SMS failed for ${data.name}:`, smsErr)
        }
      }

      deducted.push(`${data.name} (${netLateHours}hrs = UGX ${deductionAmount})`)
      processed++
    }

    console.log(`Weekly deduction complete: ${processed} employees deducted, ${skipped.length} skipped for week ${lastMondayStr}-${lastSaturdayStr}`)

    return new Response(JSON.stringify({
      success: true,
      week: `${lastMondayStr} to ${lastSaturdayStr}`,
      processed,
      deducted,
      skipped_count: skipped.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Weekly deduction error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
