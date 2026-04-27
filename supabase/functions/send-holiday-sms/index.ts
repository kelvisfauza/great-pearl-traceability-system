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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const today = new Date().toISOString().split('T')[0]
    const todayMonthDay = today.slice(5) // MM-DD

    console.log(`Checking for holiday on ${today} (month-day: ${todayMonthDay})`)

    // Check exact date match first
    const { data: exactMatch } = await supabase
      .from('public_holidays')
      .select('*')
      .eq('holiday_date', today)
      .eq('is_active', true)
      .maybeSingle()

    let holiday = exactMatch

    // If no exact match, check recurring holidays by month-day
    if (!holiday) {
      const { data: allRecurring } = await supabase
        .from('public_holidays')
        .select('*')
        .eq('is_recurring', true)
        .eq('is_active', true)

      if (allRecurring) {
        holiday = allRecurring.find((h: any) => h.holiday_date.slice(5) === todayMonthDay) || null
      }
    }

    if (!holiday) {
      console.log('No holiday today. No SMS to send.')
      return new Response(JSON.stringify({ message: 'No holiday today', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Holiday found: ${holiday.name}`)

    // Check if we already sent SMS for this holiday today (prevent duplicates)
    const { data: alreadySent } = await supabase
      .from('sms_logs')
      .select('id')
      .eq('message_type', 'holiday_greeting')
      .gte('created_at', `${today}T00:00:00`)
      .limit(1)

    if (alreadySent && alreadySent.length > 0) {
      console.log('Holiday SMS already sent today. Skipping.')
      return new Response(JSON.stringify({ message: 'Already sent today', holiday: holiday.name }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Build plain-text SMS message (no emojis for carrier compatibility)
    const message = `Happy ${holiday.name} from Great Agro Coffee! ${holiday.greeting_message.replace(/[^\x20-\x7E]/g, '')} Wishing you a wonderful day!`

    // Gather all recipients
    // 1. Active employees with phones
    const { data: employees } = await supabase
      .from('employees')
      .select('phone, name')
      .eq('status', 'Active')
      .not('phone', 'is', null)

    const employeePhones = employees?.filter((e: any) => e.phone).map((e: any) => e.phone) || []

    // 2. External price update recipients
    const additionalRecipients = [
      '0772272455', '0777510755', '0791052941', '0779637836', '0791832118', '0778970844', '0777676992'
    ]

    // 3. Suppliers with phones
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('phone, name')
      .not('phone', 'is', null)

    const supplierPhones = suppliers?.filter((s: any) => s.phone).map((s: any) => s.phone) || []

    // Deduplicate all phones
    const allPhones = [...new Set([...employeePhones, ...additionalRecipients, ...supplierPhones])]

    console.log(`Sending holiday SMS to ${allPhones.length} recipients (${employeePhones.length} employees, ${additionalRecipients.length} external, ${supplierPhones.length} suppliers)`)

    let sent = 0
    let failed = 0

    for (let i = 0; i < allPhones.length; i++) {
      // Throttle: 500ms between messages
      if (i > 0) await new Promise(r => setTimeout(r, 500))

      try {
        const smsRes = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`
          },
          body: JSON.stringify({
            phone: allPhones[i],
            message,
            messageType: 'holiday_greeting'
          })
        })

        if (smsRes.ok) {
          sent++
        } else {
          failed++
          console.error(`Failed to send to ${allPhones[i]}:`, await smsRes.text())
        }
      } catch (err) {
        failed++
        console.error(`Error sending to ${allPhones[i]}:`, err)
      }
    }

    const result = {
      holiday: holiday.name,
      message,
      total_recipients: allPhones.length,
      sent,
      failed,
      breakdown: {
        employees: employeePhones.length,
        external: additionalRecipients.length,
        suppliers: supplierPhones.length
      }
    }

    console.log('Holiday SMS results:', JSON.stringify(result))

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in send-holiday-sms:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
