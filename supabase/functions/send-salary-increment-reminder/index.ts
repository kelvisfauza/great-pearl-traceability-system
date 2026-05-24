import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'
import { calculatePayroll } from '../_shared/statutory.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const fmt = (n: number) => `UGX ${Math.round(n).toLocaleString()}`

const EXCLUDED_NAME_PATTERNS = [/daphine/i, /daphne/i, /recheal/i, /rachel/i]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, name, email, salary')
    .eq('status', 'Active')
    .gt('salary', 0)
    .not('email', 'is', null)

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const recipients = (employees || []).filter((e: any) =>
    !EXCLUDED_NAME_PATTERNS.some(rx => rx.test(e.name || ''))
  )

  const results: any[] = []
  for (const emp of recipients as any[]) {
    const current = Number(emp.salary) || 0
    const newGross = Math.round(current * 1.15)
    const increase = newGross - current
    const breakdown = calculatePayroll(newGross)

    const message =
`This is a friendly reminder regarding your upcoming salary adjustment effective September 2026.

Based on your continued contribution and performance, management has approved a 15% salary increase for you. Below is your detailed breakdown:

Current Gross Salary: ${fmt(current)}
New Gross Salary (+15%): ${fmt(newGross)}
Monthly Increase: ${fmt(increase)}

Statutory Deductions (on new gross):
• NSSF (5% employee): ${fmt(breakdown.nssfEmployee)}
• PAYE: ${fmt(breakdown.paye)}
• Total Statutory: ${fmt(breakdown.statutoryDeduction)}

Estimated Net Take-Home: ${fmt(breakdown.net)}

Please note this increment is performance-linked. Continued strong performance, discipline, and commitment to Great Pearl Coffee's standards are expected. The new amount will reflect from your September 2026 payroll.

If you have any questions, kindly reach out to HR or Operations.

Thank you for your dedication.`

    try {
      const { error: invokeErr } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'general-notification',
          recipientEmail: emp.email,
          idempotencyKey: `salary-increment-reminder-${emp.id}-2026-05-25`,
          templateData: {
            subject: 'Reminder: Your 15% Salary Increase — Effective September 2026',
            title: '15% Salary Increase — Reminder',
            recipientName: emp.name,
            message,
          },
        },
      })
      results.push({ email: emp.email, ok: !invokeErr, error: invokeErr?.message })
    } catch (e: any) {
      results.push({ email: emp.email, ok: false, error: String(e?.message || e) })
    }
  }

  return new Response(JSON.stringify({ ok: true, sent: results.length, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})