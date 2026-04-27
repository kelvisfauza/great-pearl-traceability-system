import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get today's date and yesterday's date in EAT (UTC+3)
    const nowEAT = new Date(Date.now() + 3 * 60 * 60 * 1000)
    const today = nowEAT.toISOString().split('T')[0]
    
    // Check: how many days since the last attendance record?
    const { data: lastRecord, error: lastErr } = await supabase
      .from('attendance_time_records')
      .select('record_date')
      .order('record_date', { ascending: false })
      .limit(1)
      .single()

    if (lastErr && lastErr.code !== 'PGRST116') {
      throw lastErr
    }

    const lastDate = lastRecord?.record_date || null
    let daysSinceLast = 0

    if (lastDate) {
      const lastMs = new Date(lastDate).getTime()
      const todayMs = new Date(today).getTime()
      daysSinceLast = Math.floor((todayMs - lastMs) / (24 * 60 * 60 * 1000))
    }

    // Get active employee count
    const { count: activeCount } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Active')

    // Get yesterday's record count
    const yesterday = new Date(nowEAT)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const { count: yesterdayCount } = await supabase
      .from('attendance_time_records')
      .select('id', { count: 'exact', head: true })
      .eq('record_date', yesterdayStr)

    // Decision: should we alert?
    // Alert if: no records yesterday, OR gap > 1 day
    const noRecordsYesterday = (yesterdayCount || 0) === 0
    const hasGap = daysSinceLast > 1

    if (!noRecordsYesterday && !hasGap) {
      return new Response(JSON.stringify({
        status: 'ok',
        message: `Attendance is up to date. Last record: ${lastDate}, yesterday had ${yesterdayCount} records.`,
        daysSinceLast,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Build alert message
    const severity = daysSinceLast >= 7 ? 'CRITICAL' : daysSinceLast >= 3 ? 'URGENT' : 'WARNING'
    const icon = daysSinceLast >= 7 ? '🚨' : daysSinceLast >= 3 ? '⚠️' : '📋'

    const messageToTimothy = `Dear Timothy,

${icon} ${severity}: Attendance records have NOT been updated.

• Last attendance record: ${lastDate || 'NONE FOUND'}
• Days since last record: ${daysSinceLast} day(s)
• Yesterday (${yesterdayStr}): ${yesterdayCount || 0} records entered (expected ~${activeCount || 16})
• Active employees: ${activeCount || 16}

This means attendance for ${daysSinceLast} day(s) is missing from the system. Late arrivals, overtime, and absences are going untracked, and weekly deductions cannot be calculated.

Action required:
1. Input all missing attendance records immediately
2. Ensure attendance is recorded daily going forward

This is an automated daily check. If you have already addressed this, please disregard.

Regards,
Great Pearl Coffee System`

    const messageToDenis = `Dear Denis,

This is a copy of the daily attendance monitoring alert sent to Artwanzire Timothy.

${icon} ${severity}: Attendance records have not been updated for ${daysSinceLast} day(s).
• Last record date: ${lastDate || 'NONE'}
• Yesterday: ${yesterdayCount || 0} records (expected ~${activeCount || 16})

Timothy has been instructed to input all missing records. Please follow up as his supervisor.

Regards,
Great Pearl Coffee System`

    const results: any[] = []

    // Send to Timothy
    const { error: err1 } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'general-notification',
        recipientEmail: 'tatwanzire@greatpearlcoffee.com',
        idempotencyKey: `attendance-monitor-${today}-timothy`,
        templateData: {
          subject: `${severity}: Attendance Records Not Updated — ${daysSinceLast} Day Gap`,
          title: `${icon} Daily Attendance Monitoring Alert`,
          message: messageToTimothy,
          recipientName: 'Artwanzire Timothy'
        }
      }
    })
    results.push({ to: 'timothy', error: err1?.message || null })

    // CC to Denis
    const { error: err2 } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'general-notification',
        recipientEmail: 'bwambaledenis@greatpearlcoffee.com',
        idempotencyKey: `attendance-monitor-${today}-denis`,
        templateData: {
          subject: `CC: ${severity} — Attendance Gap Alert (${daysSinceLast} Days)`,
          title: `${icon} Attendance Monitoring — Supervisor Copy`,
          message: messageToDenis,
          recipientName: 'Bwambale Denis'
        }
      }
    })
    results.push({ to: 'denis', error: err2?.message || null })

    // CC to Operations
    const { error: err3 } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'general-notification',
        recipientEmail: 'operations@greatpearlcoffee.com',
        idempotencyKey: `attendance-monitor-${today}-ops`,
        templateData: {
          subject: `CC: Attendance Gap Alert — ${daysSinceLast} Days Without Records`,
          title: `${icon} Attendance Monitoring — Operations Notice`,
          message: `Daily attendance monitoring alert: Records have not been updated for ${daysSinceLast} day(s). Last record: ${lastDate || 'NONE'}. Yesterday: ${yesterdayCount || 0} records. Timothy and Denis have been notified.`,
          recipientName: 'Operations'
        }
      }
    })
    results.push({ to: 'operations', error: err3?.message || null })

    return new Response(JSON.stringify({
      status: 'alerted',
      severity,
      daysSinceLast,
      lastRecordDate: lastDate,
      yesterdayRecords: yesterdayCount || 0,
      expectedRecords: activeCount || 16,
      emailResults: results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Attendance monitor error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
