import { supabase } from '@/integrations/supabase/client';

/**
 * Fixes payment records that have cash transactions but are still marked as Pending
 */
export async function fixPendingPayments() {
  console.log('🔧 Starting to fix pending payments...');

  // Get all pending payment records
  const { data: pendingPayments, error: paymentsError } = await supabase
    .from('supplier_payments' as any)
    .select('id, batch_number, supplier, amount')
    .eq('status', 'Pending');

  if (paymentsError) {
    console.error('Error fetching pending payments:', paymentsError);
    return;
  }

  console.log(`📋 Found ${pendingPayments?.length || 0} pending payments`);

  let fixed = 0;
  for (const payment of (pendingPayments as any[]) || []) {
    // Check if there's a corresponding cash transaction
    const { data: cashTx } = await supabase
      .from('finance_cash_transactions')
      .select('id, amount')
      .eq('reference', payment.batch_number)
      .eq('transaction_type', 'PAYMENT')
      .maybeSingle();

    if (cashTx) {
      console.log(`💰 Found payment for ${payment.batch_number}, updating status...`);
      
      const { error: updateError } = await supabase
        .from('supplier_payments')
        .update({
          status: 'POSTED' as any,
          amount_paid_ugx: Math.abs(cashTx.amount),
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', payment.id);

      if (updateError) {

      if (updateError) {
        console.error(`❌ Error updating ${payment.batch_number}:`, updateError);
      } else {
        console.log(`✅ Fixed ${payment.batch_number}`);
        fixed++;
      }
    }
  }

  console.log(`✨ Fixed ${fixed} payment records`);
  return { total: pendingPayments?.length || 0, fixed };
}
