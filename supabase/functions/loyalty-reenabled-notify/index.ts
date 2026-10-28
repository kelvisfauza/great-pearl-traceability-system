import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Sends an email + SMS confirmation to every active employee when an admin
// turns loyalty rewards back ON. Each message includes the amount that
// accrued (but was held back) while loyalty was suspended.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify the caller is a signed-in administrator
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Not signed in' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
    const isAdmin = (roles || []).some((r: any) => ['admin', 'super_admin'].includes((r.role || '').toLowerCase()))
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Only administrators can send loyalty notifications' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Confirm loyalty is actually ON before announcing it
    const { data: setting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'loyalty_awards')
      .maybeSingle()
    const v = (setting?.setting_value || {}) as any
    if (v.suspended === true || v.mode === 'off') {
      return new Response(JSON.stringify({ error: 'Loyalty is still OFF — turn it on first' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Held-back (uncredited) accruals per employee since suspension on 22 Oct 2026
    const { data: held } = await supabase
      .from('loyalty_daily_accruals')
      .select('user_id, amount')
      .gte('accrual_date', '2026-10-22')
    const heldByUser: Record<string, number> = {}
    for (const row of held || []) {
      heldByUser[row.user_id] = (heldByUser[row.user_id] || 0) + Number(row.amount || 0)
    }

    const { data: employees, error } = await supabase
      .from('employees')
      .select('name, phone, email, auth_user_id')
      .eq('status', 'Active')
      .eq('disabled', false)
    if (error) throw error

    let emailsSent = 0, smsSent = 0, failed = 0

    for (const emp of employees || []) {
      const heldAmount = emp.auth_user_id ? Math.round(heldByUser[emp.auth_user_id] || 0) : 0
      const heldLine = heldAmount > 0
        ? `You have UGX ${heldAmount.toLocaleString()} in loyalty earnings that were held while rewards were paused — these have now been credited to your wallet.`
        : `You can start earning loyalty rewards again from today.`

      // Email confirmation
      if (emp.email) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'general-notification',
              recipientEmail: emp.email,
              skipSms: true,
              templateData: {
                subject: 'Loyalty Rewards Are Back On',
                title: 'Loyalty Rewards Are Back On',
                recipientName: emp.name || 'Team Member',
                message:
                  `Good news — loyalty rewards have been switched back on for all staff.\n\n` +
                  `${heldLine}\n\n` +
                  `Keep using the system as usual: your daily activities earn loyalty points automatically, and earnings are paid to your wallet at the daily 8pm collection.\n\n` +
                  `Thank you for your continued hard work.`,
              },
            },
          })
          if (emailError) {
            console.error(`Email failed for ${emp.name}:`, emailError)
            failed++
          } else {
            emailsSent++
          }
        } catch (e) {
          console.error(`Email error for ${emp.name}:`, e)
          failed++
        }
      }

      // SMS confirmation
      if (emp.phone) {
        const sms = heldAmount > 0
          ? `GREAT AGRO COFFEE: Loyalty rewards are back ON. Your held earnings of UGX ${heldAmount.toLocaleString()} have been credited to your wallet. Keep working normally to earn more.`
          : `GREAT AGRO COFFEE: Loyalty rewards are back ON. Your daily system activities earn rewards again, paid to your wallet at 8pm daily.`
        try {
          const { error: smsError } = await supabase.functions.invoke('send-sms', {
            body: { phone: emp.phone, message: sms, to: emp.phone, messageType: 'loyalty_reenabled', recipientEmail: emp.email },
          })
          if (smsError) {
            console.error(`SMS failed for ${emp.name}:`, smsError)
            failed++
          } else {
            smsSent++
          }
        } catch (e) {
          console.error(`SMS error for ${emp.name}:`, e)
          failed++
        }
      }
    }

    console.log(`Loyalty re-enabled notifications: ${emailsSent} emails, ${smsSent} SMS, ${failed} failed`)

    return new Response(
      JSON.stringify({ ok: true, emailsSent, smsSent, failed, total: employees?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: (error as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
