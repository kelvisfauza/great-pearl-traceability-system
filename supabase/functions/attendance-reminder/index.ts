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

    const { reminder_type } = await req.json()
    // reminder_type: 'sign_in' (every 20min 8-9AM, only unsigned), 'late_warning' (after 9AM), 'sign_out' (5:30PM)

    const today = new Date().toISOString().split('T')[0]

    // Get all active employees with phone numbers
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, phone, email')
      .eq('status', 'Active')
      .not('phone', 'is', null)

    if (empError) throw empError

    // company_employees has been unified into employees - no separate query needed
    const companyWorkers: any[] = [];

    // Get today's attendance records
    const { data: todayRecords, error: recError } = await supabase
      .from('attendance_time_records')
      .select('employee_id, arrival_time, departure_time')
      .eq('record_date', today)

    if (recError) throw recError

    const signedInIds = new Set(
      (todayRecords || []).filter(r => r.arrival_time).map(r => r.employee_id)
    )
    const signedOutIds = new Set(
      (todayRecords || []).filter(r => r.departure_time).map(r => r.employee_id)
    )

    let message = ''
    let recipients: { phone: string; name: string }[] = []

    const allPeople = [
      ...(employees || []).map(e => ({ id: e.id, phone: e.phone!, name: e.name })),
      ...(companyWorkers || []).filter(w => w.phone).map(w => ({ id: `company_${w.id}`, phone: w.phone!, name: w.full_name })),
    ]

    if (reminder_type === 'sign_in') {
      // Every 20min from 8AM-9AM - ONLY those who haven't signed in yet
      message = 'Great Agro Coffee: You have not signed in for attendance today. Please sign in now. Thank you.'
      recipients = allPeople.filter(p => !signedInIds.has(p.id))
    } else if (reminder_type === 'late_warning') {
      // After 9AM - only those who still haven't signed in
      message = 'Great Agro Coffee: You have not signed in yet. You are now marked as late. Please sign in immediately.'
      recipients = allPeople.filter(p => !signedInIds.has(p.id))
    } else if (reminder_type === 'sign_out') {
      // 5:30 PM - remind those who signed in but haven't signed out
      message = 'Great Agro Coffee: Work hours are over. Please remember to sign out before leaving. Thank you.'
      recipients = allPeople.filter(p => signedInIds.has(p.id) && !signedOutIds.has(p.id))
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid reminder_type. Use: sign_in, late_warning, sign_out' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Sending ${reminder_type} reminder to ${recipients.length} recipients`)

    let sentCount = 0
    let failCount = 0

    for (const recipient of recipients) {
      try {
        const smsRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            phone: recipient.phone,
            to: recipient.phone,
            message,
          }),
        })

        if (!smsRes.ok) {
          const errText = await smsRes.text()
          console.error(`Failed to send to ${recipient.name}: ${errText}`)
          failCount++
        } else {
          await smsRes.text()
          sentCount++
        }
      } catch (err) {
        console.error(`Error sending to ${recipient.name}:`, err)
        failCount++
      }
    }

    // Flag records where someone signed out but never signed in
    if (reminder_type === 'sign_out') {
      const missingSignIn = (todayRecords || []).filter(
        r => r.departure_time && !r.arrival_time
      )
      if (missingSignIn.length > 0) {
        for (const record of missingSignIn) {
          await supabase
            .from('attendance_time_records')
            .update({ notes: '[FLAGGED] Signed out without signing in - needs IT review' } as any)
            .eq('employee_id', record.employee_id)
            .eq('record_date', today)
        }
        console.log(`Flagged ${missingSignIn.length} records with missing sign-in`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminder_type,
        total_recipients: recipients.length,
        sent: sentCount,
        failed: failCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in attendance-reminder:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
