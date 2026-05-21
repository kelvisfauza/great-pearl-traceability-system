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

    // ---- AuthN/AuthZ: only Super Admin / Administrator can run this maintenance job ----
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Allow direct service-role/cron invocation
    if (token !== serviceKey) {
      const { data: userData, error: userErr } = await supabaseClient.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: caller } = await supabaseClient
        .from('employees')
        .select('role, status')
        .eq('auth_user_id', userData.user.id)
        .maybeSingle();
      if (!caller || caller.status !== 'Active' || !['Super Admin', 'Administrator'].includes(caller.role)) {
        return new Response(JSON.stringify({ success: false, error: 'Forbidden — Administrator role required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('🔧 Starting to fix pending payments...');

    // Get all pending payment records
    const { data: pendingPayments, error: paymentsError } = await supabaseClient
      .from('supplier_payments')
      .select('id, batch_number, supplier_id, amount_paid_ugx')
      .eq('status', 'PENDING_ADMIN_APPROVAL');

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
        .maybeSingle();

      if (cashTx) {
        console.log(`💰 Found payment for ${payment.batch_number}`);
        
        const { error: updateError } = await supabaseClient
          .from('supplier_payments')
          .update({
            status: 'POSTED',
            amount_paid_ugx: Math.abs(Number(cashTx.amount)),
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
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
