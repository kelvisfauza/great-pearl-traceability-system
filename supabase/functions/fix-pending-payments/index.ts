import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔧 Starting to fix pending payments...');

    // Get all pending payment records
    const { data: pendingPayments, error: paymentsError } = await supabaseClient
      .from('payment_records')
      .select('id, batch_number, supplier, amount')
      .eq('status', 'Pending');

    if (paymentsError) {
      console.error('Error fetching pending payments:', paymentsError);
      throw paymentsError;
    }

    console.log(`📋 Found ${pendingPayments?.length || 0} pending payments`);

    const updates = [];
    for (const payment of pendingPayments || []) {
      // Check if there's a corresponding cash transaction
      const { data: cashTx } = await supabaseClient
        .from('finance_cash_transactions')
        .select('id, amount, confirmed_by')
        .eq('reference', payment.batch_number)
        .eq('transaction_type', 'PAYMENT')
        .not('confirmed_by', 'is', null)
        .maybeSingle();

      if (cashTx) {
        console.log(`💰 Found payment for ${payment.batch_number}`);
        
        const { error: updateError } = await supabaseClient
          .from('payment_records')
          .update({
            status: 'Paid',
            amount_paid: Math.abs(Number(cashTx.amount)),
            balance: 0,
            method: 'Cash',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);

        if (updateError) {
          console.error(`❌ Error updating ${payment.batch_number}:`, updateError);
          updates.push({ batch: payment.batch_number, success: false, error: updateError.message });
        } else {
          console.log(`✅ Fixed ${payment.batch_number}`);
          updates.push({ batch: payment.batch_number, success: true });
        }
      }
    }

    const fixed = updates.filter(u => u.success).length;
    console.log(`✨ Fixed ${fixed} out of ${pendingPayments?.length || 0} payment records`);

    return new Response(
      JSON.stringify({
        success: true,
        total: pendingPayments?.length || 0,
        fixed,
        updates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fixing pending payments:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
