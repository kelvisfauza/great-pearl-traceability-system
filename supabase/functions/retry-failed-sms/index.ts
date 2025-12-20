import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://pudfybkyfedeggmokhco.supabase.co'
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
  const supabase = createClient(supabaseUrl, supabaseKey!)

  console.log('🔄 Starting SMS retry job...')

  try {
    // Get failed SMS messages that are due for retry
    const now = new Date().toISOString()
    const { data: failedMessages, error: fetchError } = await supabase
      .from('sms_logs')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', 10) // Max 10 retries
      .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
      .order('created_at', { ascending: false })
      .limit(20) // Process 20 at a time, most recent first

    if (fetchError) {
      console.error('Error fetching failed messages:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch messages', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!failedMessages || failedMessages.length === 0) {
      console.log('✅ No failed messages to retry')
      return new Response(
        JSON.stringify({ success: true, message: 'No failed messages to retry', retried: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📨 Found ${failedMessages.length} failed messages to retry`)

    const apiKey = Deno.env.get('YOOLA_SMS_API_KEY')
    if (!apiKey) {
      console.error('YOOLA_SMS_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let successCount = 0
    let failCount = 0

    for (const msg of failedMessages) {
      console.log(`🔄 Retrying SMS to ${msg.recipient_phone} (attempt ${(msg.retry_count || 0) + 1})`)

      try {
        const smsResponse = await fetch('https://yoolasms.com/api/v1/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: msg.recipient_phone,
            message: msg.message_content,
            api_key: apiKey
          })
        })

        const newRetryCount = (msg.retry_count || 0) + 1

        if (smsResponse.ok) {
          let smsResult
          try {
            const responseText = await smsResponse.text()
            smsResult = responseText.trim() ? JSON.parse(responseText) : { status: 'success' }
          } catch {
            smsResult = { status: 'success' }
          }

          console.log(`✅ SMS sent successfully to ${msg.recipient_phone}`)

          // Update as sent
          await supabase
            .from('sms_logs')
            .update({
              status: 'sent',
              retry_count: newRetryCount,
              last_retry_at: new Date().toISOString(),
              next_retry_at: null,
              provider_response: smsResult,
              failure_reason: null,
              credits_used: smsResult.credits_used || 1
            })
            .eq('id', msg.id)

          successCount++
        } else {
          const errorText = await smsResponse.text()
          console.error(`❌ Failed to send SMS to ${msg.recipient_phone}:`, errorText)

          // Schedule next retry in 5 minutes
          const nextRetry = new Date()
          nextRetry.setMinutes(nextRetry.getMinutes() + 5)

          await supabase
            .from('sms_logs')
            .update({
              retry_count: newRetryCount,
              last_retry_at: new Date().toISOString(),
              next_retry_at: newRetryCount >= 10 ? null : nextRetry.toISOString(),
              failure_reason: errorText
            })
            .eq('id', msg.id)

          failCount++
        }
      } catch (error) {
        console.error(`❌ Exception retrying SMS to ${msg.recipient_phone}:`, error)
        
        const newRetryCount = (msg.retry_count || 0) + 1
        const nextRetry = new Date()
        nextRetry.setMinutes(nextRetry.getMinutes() + 5)

        await supabase
          .from('sms_logs')
          .update({
            retry_count: newRetryCount,
            last_retry_at: new Date().toISOString(),
            next_retry_at: newRetryCount >= 10 ? null : nextRetry.toISOString(),
            failure_reason: error.message
          })
          .eq('id', msg.id)

        failCount++
      }

      // Small delay between retries to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log(`📊 Retry complete: ${successCount} sent, ${failCount} still failed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Retry complete: ${successCount} sent, ${failCount} still failed`,
        successCount,
        failCount,
        totalProcessed: failedMessages.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in retry-failed-sms:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
