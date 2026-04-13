import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const results: any[] = []

  // Send to Timothy
  const { error: err1 } = await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'general-notification',
      recipientEmail: 'tatwanzire@greatpearlcoffee.com',
      idempotencyKey: `attendance-gap-alert-2026-04-13-timothy`,
      templateData: {
        subject: 'URGENT: Attendance Records Not Updated for 13 Days',
        title: '⚠️ Attendance Input Gap Detected — 13 Days Without Records',
        message: `Dear Timothy,

This is an urgent notice regarding attendance record management.

Our system has detected that the LAST attendance record was entered on March 31, 2026 — that is 13 days ago. Since then, NO attendance records have been input into the system for any employee.

Key Findings:
• 16 active employees have had NO attendance tracked for 13 consecutive days (April 1–13)
• The period March 25–31 already showed declining entries (only 2–8 records/day vs the expected 12–16)
• Late arrivals, overtime, and absences are going completely untracked
• Weekly deductions cannot be calculated accurately without this data
• This creates serious compliance and payroll risks for the company

As the person responsible for IT & Attendance Management, you are required to:
1. Input ALL missing attendance records for April 1–13, 2026 immediately
2. Ensure daily attendance is recorded going forward without any gaps
3. Provide a brief written explanation for the 13-day gap

This matter requires your IMMEDIATE attention. Continued gaps in attendance tracking will be escalated to senior management.

Regards,
Great Pearl Coffee System`,
        recipientName: 'Artwanzire Timothy'
      }
    }
  })
  results.push({ to: 'timothy', error: err1?.message || null })

  // Send CC copy to Denis
  const { error: err2 } = await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'general-notification',
      recipientEmail: 'bwambaledenis@greatpearlcoffee.com',
      idempotencyKey: `attendance-gap-alert-2026-04-13-denis-cc`,
      templateData: {
        subject: 'CC: URGENT — Attendance Records Not Updated for 13 Days (Timothy)',
        title: '⚠️ Attendance Input Gap — 13 Days Without Records',
        message: `Dear Denis,

This is a copy of the alert sent to Artwanzire Timothy regarding a critical gap in attendance record management.

The last attendance record was entered on March 31, 2026 — 13 days ago. Since then, NO attendance records have been input for any of the 16 active employees.

Key Findings:
• 13 consecutive days (April 1–13) with zero attendance entries
• The period March 25–31 already showed declining entries (2–8/day vs expected 12–16)
• Late arrivals, overtime, and absences are untracked
• Weekly deductions cannot be calculated
• Compliance and payroll risks

Timothy has been instructed to input all missing records immediately and provide an explanation for the gap.

Please follow up on this matter as his supervisor.

Regards,
Great Pearl Coffee System`,
        recipientName: 'Bwambale Denis'
      }
    }
  })
  results.push({ to: 'denis', error: err2?.message || null })

  // Also CC operations
  const { error: err3 } = await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'general-notification',
      recipientEmail: 'operations@greatpearlcoffee.com',
      idempotencyKey: `attendance-gap-alert-2026-04-13-ops-cc`,
      templateData: {
        subject: 'CC: URGENT — Attendance Records Gap Alert (13 Days)',
        title: '⚠️ Attendance Input Gap — Operations Notice',
        message: `This is a copy of the attendance gap alert sent to Artwanzire Timothy (IT) with CC to Bwambale Denis (Admin).

Issue: The last attendance record was entered on March 31, 2026 — 13 days ago. Zero records have been input for April 1–13 for all 16 active employees.

Timothy has been instructed to input all missing records immediately.

Regards,
Great Pearl Coffee System`,
        recipientName: 'Operations'
      }
    }
  })
  results.push({ to: 'operations', error: err3?.message || null })

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
