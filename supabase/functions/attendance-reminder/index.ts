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
    // reminder_type: 'sign_in' (8AM), 'late_warning' (8:15AM), 'sign_out' (5PM)

    const today = new Date().toISOString().split('T')[0]

    // Get all active employees with phone numbers
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, phone, email')
      .eq('status', 'Active')
      .not('phone', 'is', null)

    if (empError) throw empError

    // Also get company workers
    const { data: companyWorkers, error: cwError } = await supabase
      .from('company_employees')
      .select('id, full_name, phone, employee_id')
      .eq('status', 'Active')
      .not('phone', 'is', null)

    if (cwError) throw cwError

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

    if (reminder_type === 'sign_in') {
      // 8 AM - remind ALL employees to sign in
      message = 'Great Pearl Coffee: Good morning. Please remember to sign in for attendance today. Thank you.'
      recipients = [
        ...(employees || []).map(e => ({ phone: e.phone!, name: e.name })),
        ...(companyWorkers || []).filter(w => w.phone).map(w => ({ phone: w.phone!, name: w.full_name })),
      ]
    } else if (reminder_type === 'late_warning') {
      // 8:15 AM - only those who haven't signed in yet
      message = 'Great Pearl Coffee: You have not signed in yet. You are now marked as late. Please sign in immediately.'
      const allPeople = [
        ...(employees || []).map(e => ({ id: e.id, phone: e.phone!, name: e.name })),
        ...(companyWorkers || []).filter(w => w.phone).map(w => ({ id: `company_${w.id}`, phone: w.phone!, name: w.full_name })),
      ]
      recipients = allPeople.filter(p => !signedInIds.has(p.id))
    } else if (reminder_type === 'sign_out') {
      // 5 PM - remind those who signed in but haven't signed out
      message = 'Great Pearl Coffee: Work hours are over. Please remember to sign out before leaving. Thank you.'
      const allPeople = [
        ...(employees || []).map(e => ({ id: e.id, phone: e.phone!, name: e.name })),
        ...(companyWorkers || []).filter(w => w.phone).map(w => ({ id: `company_${w.id}`, phone: w.phone!, name: w.full_name })),
      ]
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
