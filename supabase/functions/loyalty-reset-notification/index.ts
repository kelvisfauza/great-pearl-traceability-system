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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get all active, non-disabled employees with phone numbers
    const { data: employees, error } = await supabase
      .from('employees')
      .select('name, phone, email')
      .eq('status', 'Active')
      .eq('disabled', false)
      .not('phone', 'is', null)

    if (error) throw error

    const message = `GREAT PEARL COFFEE\n\nMonthly Loyalty Reset\n\nYour loyalty rewards balance has reset to zero for the new month. Please remember to withdraw your earnings before the end of each month.\n\nNote: Only loyalty rewards reset monthly. Your direct deposits remain in your wallet.\n\nThank you for your hard work!`

    let sent = 0
    let failed = 0

    for (const emp of (employees || [])) {
      if (!emp.phone) continue
      try {
        const { error: smsError } = await supabase.functions.invoke('send-sms', {
          body: { phone: emp.phone, message, to: emp.phone }
        })
        if (smsError) {
          console.error(`SMS failed for ${emp.name}:`, smsError)
          failed++
        } else {
          sent++
        }
      } catch (e) {
        console.error(`SMS error for ${emp.name}:`, e)
        failed++
      }
    }

    console.log(`Loyalty reset SMS: ${sent} sent, ${failed} failed out of ${employees?.length || 0}`)

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: employees?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
