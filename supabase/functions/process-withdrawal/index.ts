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
    console.log('Process withdrawal function started');

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const withdrawalApiKey = Deno.env.get('WITHDRAWAL_API_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasWithdrawalKey: !!withdrawalApiKey
    });

    if (!supabaseUrl || !supabaseKey || !withdrawalApiKey) {
      return new Response(JSON.stringify({ 
        error: 'Missing environment variables',
        details: {
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey,
          hasWithdrawalKey: !!withdrawalApiKey
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client created');

    if (req.method !== 'POST') {
      console.log('Invalid method:', req.method);
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    
    const { withdrawalRequestId } = requestBody;

    if (!withdrawalRequestId) {
      return new Response(JSON.stringify({ error: 'Withdrawal request ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing withdrawal request:', withdrawalRequestId);

    // Get the withdrawal request
    const { data: withdrawalRequest, error: fetchError } = await supabaseClient
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawalRequestId)
      .eq('status', 'pending')
      .maybeSingle();

    console.log('Withdrawal request fetch result:', { withdrawalRequest, fetchError });

    if (fetchError) {
      console.error('Error fetching withdrawal request:', fetchError);
      return new Response(JSON.stringify({ 
        error: 'Database error', 
        details: fetchError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!withdrawalRequest) {
      return new Response(JSON.stringify({ error: 'Withdrawal request not found or already processed' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user account to verify balance
    const { data: userAccount, error: accountError } = await supabaseClient
      .from('user_accounts')
      .select('current_balance')
      .eq('user_id', withdrawalRequest.user_id)
      .maybeSingle();

    console.log('User account fetch result:', { userAccount, accountError });

    if (accountError) {
      console.error('Error fetching user account:', accountError);
      return new Response(JSON.stringify({ 
        error: 'Database error', 
        details: accountError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!userAccount) {
      return new Response(JSON.stringify({ error: 'User account not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user has sufficient balance
    if (userAccount.current_balance < withdrawalRequest.amount) {
      console.log('Insufficient balance:', userAccount.current_balance, '<', withdrawalRequest.amount);
      
      await supabaseClient
        .from('withdrawal_requests')
        .update({ 
          status: 'failed',
          processed_at: new Date().toISOString(),
          failure_reason: 'Insufficient balance'
        })
        .eq('id', withdrawalRequestId);

      return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Prepare Zengapay transfer request
    const transferData = {
      msisdn: withdrawalRequest.phone_number,
      amount: withdrawalRequest.amount,
      external_reference: `WD-${withdrawalRequestId}`,
      narration: `Payout - ${withdrawalRequest.amount}`,
      use_contact: "false"
    };

    console.log('Initiating Zengapay transfer:', transferData);

    // Call Zengapay API
    const zengapayResponse = await fetch('https://api.sandbox.zengapay.com/v1/transfers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${withdrawalApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transferData)
    });

    console.log('Zengapay response status:', zengapayResponse.status);
    
    const zengapayResult = await zengapayResponse.json();
    console.log('Zengapay API response:', zengapayResult);

    if (zengapayResponse.ok && zengapayResult.code === 202) {
      // Transfer initiated successfully
      const transactionReference = zengapayResult.transactionReference;

      // Update withdrawal request status
      const { error: updateError } = await supabaseClient
        .from('withdrawal_requests')
        .update({
          status: 'processing',
          transaction_reference: transactionReference,
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawalRequestId);

      if (updateError) {
        console.error('Error updating withdrawal request:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update withdrawal status' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Deduct amount from user balance
      const { error: balanceError } = await supabaseClient
        .from('user_accounts')
        .update({
          current_balance: userAccount.current_balance - withdrawalRequest.amount,
          total_withdrawn: userAccount.total_withdrawn + withdrawalRequest.amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', withdrawalRequest.user_id);

      if (balanceError) {
        console.error('Error updating user balance:', balanceError);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Withdrawal initiated successfully',
        transactionReference: transactionReference
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      // Transfer failed
      console.error('Zengapay transfer failed:', zengapayResult);
      
      await supabaseClient
        .from('withdrawal_requests')
        .update({
          status: 'failed',
          processed_at: new Date().toISOString(),
          failure_reason: zengapayResult.message || 'Transfer failed'
        })
        .eq('id', withdrawalRequestId);

      return new Response(JSON.stringify({
        error: 'Transfer failed',
        details: zengapayResult.message || 'Unknown error'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})