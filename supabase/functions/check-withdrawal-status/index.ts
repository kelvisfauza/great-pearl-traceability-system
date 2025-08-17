import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { transactionReference } = await req.json()

    if (!transactionReference) {
      return new Response(JSON.stringify({ error: 'Transaction reference is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Checking withdrawal status for transaction:', transactionReference)

    // Check status with Zengapay
    const zengapayResponse = await fetch(`https://api.sandbox.zengapay.com/v1/transfers/${transactionReference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('WITHDRAWAL_API_KEY')}`
      }
    })

    const zengapayResult = await zengapayResponse.json()
    console.log('Zengapay status response:', zengapayResult)

    if (!zengapayResponse.ok) {
      console.error('Failed to check transaction status:', zengapayResult)
      return new Response(JSON.stringify({ error: 'Failed to check transaction status' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const transactionData = zengapayResult.data
    const transactionStatus = transactionData.transactionStatus

    // Update withdrawal request status based on Zengapay response
    let newStatus = 'processing'
    if (transactionStatus === 'SUCCEEDED') {
      newStatus = 'completed'
    } else if (transactionStatus === 'FAILED') {
      newStatus = 'failed'
    }

    // Update the withdrawal request in our database
    const { error: updateError } = await supabaseClient
      .from('withdrawal_requests')
      .update({
        status: newStatus,
        mno_transaction_id: transactionData.MNOTransactionReferenceId,
        completion_date: transactionData.transactionCompletionDate !== '0000-00-00 00:00:00' 
          ? transactionData.transactionCompletionDate 
          : null,
        updated_at: new Date().toISOString()
      })
      .eq('transaction_reference', transactionReference)

    if (updateError) {
      console.error('Error updating withdrawal request:', updateError)
    }

    // If transaction failed, refund the user
    if (transactionStatus === 'FAILED') {
      const { data: withdrawalRequest } = await supabaseClient
        .from('withdrawal_requests')
        .select('user_id, amount')
        .eq('transaction_reference', transactionReference)
        .single()

      if (withdrawalRequest) {
        await supabaseClient
          .from('user_accounts')
          .update({
            current_balance: supabaseClient.sql`current_balance + ${withdrawalRequest.amount}`,
            total_withdrawn: supabaseClient.sql`GREATEST(total_withdrawn - ${withdrawalRequest.amount}, 0)`,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', withdrawalRequest.user_id)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      status: newStatus,
      transactionData: transactionData
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error checking withdrawal status:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})