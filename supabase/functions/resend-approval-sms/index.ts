import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { requestId } = await req.json()

    if (!requestId) {
      throw new Error('Request ID is required')
    }

    console.log('📧 Fetching approval request:', requestId)

    // Get the approval request details
    const { data: request, error: requestError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError) {
      throw new Error(`Failed to fetch request: ${requestError.message}`)
    }

    console.log('📋 Request details:', request)

    // Get requester name
    const { data: requester } = await supabase
      .from('employees')
      .select('name')
      .eq('email', request.requestedby)
      .single()

    const senderName = requester?.name || 'Unknown User'

    // Fetch all administrators with phone numbers
    const { data: admins, error: adminsError } = await supabase
      .from('employees')
      .select('name, email, phone, role')
      .in('role', ['Administrator', 'Super Admin'])
      .eq('status', 'Active')
      .not('phone', 'is', null)

    if (adminsError) {
      throw new Error(`Failed to fetch admins: ${adminsError.message}`)
    }

    console.log('👥 Found admins:', admins?.length || 0)

    if (!admins || admins.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No administrators found with phone numbers' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let smsSent = 0
    let smsFailed = 0
    const results = []

    // Send SMS to each administrator
    for (const admin of admins) {
      if (admin.phone) {
        try {
          console.log(`📱 Sending SMS to ${admin.name} at ${admin.phone}`)
          
          const message = `APPROVAL REQUEST\n\nFrom: ${senderName}\nType: ${request.type}\nAmount: UGX ${request.amount.toLocaleString()}\nTitle: ${request.title}\n\nPlease review this request in the system.`

          const { data: smsData, error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              to: admin.phone,
              message: message
            }
          })

          if (smsError) {
            throw smsError
          }

          smsSent++
          results.push({ admin: admin.name, status: 'sent', phone: admin.phone })
          console.log(`✅ SMS sent to ${admin.name}`)
        } catch (error) {
          smsFailed++
          results.push({ 
            admin: admin.name, 
            status: 'failed', 
            phone: admin.phone,
            error: error.message 
          })
          console.error(`❌ Failed to send SMS to ${admin.name}:`, error)
        }
      }
    }

    console.log(`✅ Summary: ${smsSent} sent, ${smsFailed} failed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        smsSent, 
        smsFailed,
        details: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
