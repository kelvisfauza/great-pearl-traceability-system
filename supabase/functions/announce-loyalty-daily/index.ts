import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TITLE = 'Loyalty Points Restored — Now Paid Once Daily at 8:00 PM'

const MESSAGE = `Management is pleased to announce that loyalty points have been restored, with an improved and fairer way of paying them out.

What changes from today:
- The system now records your rewarded work quietly throughout the day. You will no longer see points landing in your wallet one by one.
- Every evening at 8:00 PM, the whole day's points are added to your wallet as a single daily collection.
- You will receive an email and a text message each evening confirming the amount credited and your new wallet balance.
- Fair-use limits remain in place: the same daily and monthly ceilings apply, so the reward reflects genuine work, not repeated clicking.
- All balances earned before the pause remain untouched in your wallet.

Why this change:
Paying points instantly created constant interruptions and encouraged activity for the sake of activity. A single, once-a-day payment is easier to follow, easier to audit, and rewards a full day of real work.

If your evening confirmation does not arrive, or the amount looks wrong, please contact the Operations Office on +256 393 101 103.

Thank you for your continued commitment.
Management, Great Agro Coffee`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, email, disabled, status')
    .eq('status', 'Active')

  const results: Record<string, unknown>[] = []
  const stamp = '2026-09-17'

  for (const emp of (employees || []) as any[]) {
    const email = (emp.email || '').trim()
    if (emp.disabled === true || !email.includes('@') || email.includes('noauth.')) {
      results.push({ name: emp.name, status: 'skipped' })
      continue
    }
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'general-notification',
        recipientEmail: email,
        idempotencyKey: `loyalty-daily-announce-${stamp}-${emp.id}`,
        templateData: { title: TITLE, subject: TITLE, message: MESSAGE, recipientName: emp.name },
      },
    })
    results.push({ name: emp.name, email, status: error ? `failed: ${error.message}` : 'sent' })
    await new Promise((r) => setTimeout(r, 1200))
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
