import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const KAMPALA_OFFSET_MS = 3 * 60 * 60 * 1000

const kampalaToday = () => new Date(Date.now() + KAMPALA_OFFSET_MS).toISOString().slice(0, 10)

const prettyDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const day = (body?.date as string) || kampalaToday()
    const notify = body?.notify !== false

    const { data: credited, error } = await supabase.rpc('credit_daily_loyalty', { p_date: day })
    if (error) throw new Error(`credit_daily_loyalty failed: ${error.message}`)

    const rows = (credited || []) as Array<{ user_id: string; total: number; items: number }>
    const results: Record<string, unknown>[] = []

    for (const row of rows) {
      const amount = Math.round(Number(row.total) || 0)
      if (amount <= 0) continue

      // Resolve the person behind the wallet id
      let emp: any = null
      const byAuth = await supabase
        .from('employees')
        .select('id, name, email, phone, disabled')
        .eq('auth_user_id', row.user_id)
        .maybeSingle()
      emp = byAuth.data
      if (!emp) {
        const byId = await supabase
          .from('employees')
          .select('id, name, email, phone, disabled')
          .eq('id', row.user_id)
          .maybeSingle()
        emp = byId.data
      }

      if (!emp || emp.disabled === true || !notify) {
        results.push({ user_id: row.user_id, amount, notified: false })
        continue
      }

      let walletBalance: number | null = null
      if (emp.email) {
        const { data: bal } = await supabase.rpc('get_user_balance_safe', { user_email: emp.email })
        walletBalance = Number((bal as any)?.[0]?.wallet_balance ?? (bal as any)?.wallet_balance ?? 0)
      }

      let emailOk = false
      if (emp.email && emp.email.includes('@')) {
        const { error: mailErr } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'loyalty-daily-credit',
            recipientEmail: emp.email,
            idempotencyKey: `loyalty-daily-${day}-${emp.id}`,
            templateData: {
              employeeName: emp.name,
              amount: amount.toLocaleString(),
              activityCount: row.items,
              awardDate: prettyDate(day),
              walletBalance: walletBalance !== null ? Math.round(walletBalance).toLocaleString() : '',
            },
          },
        })
        emailOk = !mailErr
      }

      let smsOk = false
      if (emp.phone) {
        const message = `Dear ${emp.name}, your daily loyalty collection of UGX ${amount.toLocaleString()} for ${day} has been credited to your wallet${
          walletBalance !== null ? `. Balance: UGX ${Math.round(walletBalance).toLocaleString()}` : ''
        }. - Great Agro Coffee`
        const { error: smsErr } = await supabase.functions.invoke('send-sms', {
          body: {
            phone: emp.phone,
            message,
            userName: emp.name,
            recipientEmail: emp.email,
            messageType: 'loyalty_daily_credit',
            idempotency_key: `loyalty-daily-sms-${day}-${emp.id}`,
          },
        })
        smsOk = !smsErr
      }

      results.push({ user_id: row.user_id, name: emp.name, amount, activities: row.items, emailOk, smsOk })
    }

    return new Response(
      JSON.stringify({ ok: true, date: day, credited: rows.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('daily-loyalty-payout error:', message)
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
