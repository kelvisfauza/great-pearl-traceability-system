import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AMOUNT = 3500
const RECIPIENTS = [
  'tatwanzire@greatpearlcoffee.com',
  'musemawyclif@greatpearlcoffee.com',
  'bwambalebenson@greatpearlcoffee.com',
  'fauzakusa@greatpearlcoffee.com',
  'johnmasereka@greatpearlcoffee.com',
  'nuwagabagadaffi@greatpearlcoffee.com',
  'onesmusrubambura@greatpearlcoffee.com',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const today = new Date().toISOString().slice(0, 10)
  const results: Record<string, unknown>[] = []

  for (const email of RECIPIENTS) {
    try {
      const { data: emp } = await supabase
        .from('employees')
        .select('id, name, email, phone, disabled')
        .ilike('email', email)
        .maybeSingle()

      if (!emp || emp.disabled === true) {
        results.push({ email, status: 'skipped', reason: 'not found or disabled' })
        continue
      }

      const { data: userId } = await supabase.rpc('get_unified_user_id', { input_email: emp.email })
      if (!userId) {
        results.push({ email, status: 'skipped', reason: 'no unified user id' })
        continue
      }

      const reference = `SUNDAY-LUNCH-${today}-${String(userId).slice(0, 8)}`

      const { data: existing } = await supabase
        .from('ledger_entries')
        .select('id')
        .eq('reference', reference)
        .maybeSingle()
      if (existing) {
        results.push({ email, status: 'already_credited' })
        continue
      }

      const { error: ledgerErr } = await supabase.from('ledger_entries').insert({
        user_id: String(userId),
        entry_type: 'DEPOSIT',
        amount: AMOUNT,
        reference,
        source_category: 'SYSTEM_AWARD',
        metadata: {
          allowance_type: 'Lunch Allowance',
          employee_name: emp.name,
          work_date: today,
          reason: 'Sunday working lunch allowance',
          description: `Lunch allowance for working on Sunday ${today}`,
        },
        created_at: new Date().toISOString(),
      })
      if (ledgerErr) {
        results.push({ email, status: 'failed', reason: ledgerErr.message })
        continue
      }

      let smsOk = false
      if (emp.phone) {
        const { error: smsErr } = await supabase.functions.invoke('send-sms', {
          body: {
            phone: emp.phone,
            message: `Dear ${emp.name}, a lunch allowance of UGX ${AMOUNT.toLocaleString()} has been credited to your wallet for working today (Sunday). Thank you for your commitment. - Great Agro Coffee`,
            userName: emp.name,
            messageType: 'monthly_allowance',
            recipientEmail: emp.email,
          },
        })
        smsOk = !smsErr
      }

      let emailOk = false
      const { error: mailErr } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'allowance-credited',
          recipientEmail: emp.email,
          idempotencyKey: `sunday-lunch-${today}-${emp.id}`,
          templateData: {
            employeeName: emp.name,
            allowanceType: 'Lunch Allowance (Sunday Work)',
            amount: AMOUNT.toLocaleString(),
            month: today,
            disbursementMethod: 'Wallet credit',
            phone: emp.phone || '',
          },
        },
      })
      emailOk = !mailErr

      results.push({ email, name: emp.name, status: 'credited', smsOk, emailOk })
    } catch (e) {
      results.push({ email, status: 'error', reason: String(e) })
    }
  }

  return new Response(JSON.stringify({ ok: true, amount: AMOUNT, results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
