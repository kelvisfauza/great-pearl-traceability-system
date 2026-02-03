import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { formatSupplierDisplay, type SupplierRef } from '@/utils/supplierDisplay';

interface CoffeePayment {
  id: string;
  batchNumber: string;
  supplier: string;
  supplierId: string;
  supplierCode?: string;
  assessedBy: string;
  quantity: number;
  pricePerKg: number;
  totalAmount: number;
  dateAssessed: string;
  qualityAssessmentId: string;
  isPricedByQuality: boolean;
  qualityAssessmentExists: boolean;
  createdBy?: string;
  coffeeType?: string;
  bags?: number;
  dateReceived?: string;
  qualityParams?: any;
}

interface ProcessPaymentData {
  paymentId: string; // Coffee record ID
  qualityAssessmentId: string; // Quality assessment ID
  method: 'Cash' | 'Bank';
  amount: number;
  notes?: string;
  batchNumber: string;
  supplier: string;
  supplierId?: string;
  supplierCode?: string;
  advanceRecovered?: number;
}

export const usePendingCoffeePayments = () => {
  const [coffeePayments, setCoffeePayments] = useState<CoffeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { employee } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      
      const payments: CoffeePayment[] = [];
      
      console.log('🔍 Finance fetching pending coffee payments...');
      
      // Optimized: Fetch only unpaid coffee records with minimal fields first
      const { data: coffeeRecords, error: coffeeError } = await supabase
        .from('coffee_records')
        .select('id, batch_number, supplier_name, supplier_id, kilograms, bags, coffee_type, date, created_at, created_by')
        .in('status', ['pending', 'assessed', 'submitted_to_finance'])
        .order('date', { ascending: false })
        .limit(100);
      
      if (coffeeError) {
        console.error('Error fetching coffee records:', coffeeError);
        throw coffeeError;
      }
      
      if (!coffeeRecords || coffeeRecords.length === 0) {
        console.log('📦 No pending coffee records found');
        setCoffeePayments([]);
        setLoading(false);
        return;
      }
      
      console.log('📦 Found coffee records:', coffeeRecords.length);

      // Resolve supplier codes/names from suppliers table (avoid legacy supplier_name values like "(SUP...)" )
      const supplierIds = Array.from(
        new Set((coffeeRecords || []).map((r: any) => r.supplier_id).filter(Boolean))
      ) as string[];
      const suppliersById = new Map<string, SupplierRef>();
      if (supplierIds.length > 0) {
        const { data: suppliersData } = await supabase
          .from('suppliers')
          .select('id, name, code')
          .in('id', supplierIds);
        (suppliersData || []).forEach((s: any) => {
          suppliersById.set(s.id, { id: s.id, name: s.name, code: s.code });
        });
      }
      
      // Get batch numbers to check for payments
      const batchNumbers = coffeeRecords.map(r => r.batch_number).filter(Boolean);
      
      // Fetch paid batch numbers in one query
      const { data: paidPayments } = await supabase
        .from('payment_records')
        .select('batch_number')
        .in('batch_number', batchNumbers)
        .eq('status', 'Paid');
      
      const paidBatchNumbers = new Set(
        paidPayments?.map(p => p.batch_number).filter(Boolean) || []
      );

      // Fetch quality assessments for these records only
      const recordIds = coffeeRecords.map(r => r.id);
      const { data: qualityAssessments } = await supabase
        .from('quality_assessments')
        .select('id, store_record_id, suggested_price, assessed_by, moisture, group1_defects, group2_defects')
        .in('store_record_id', recordIds);
      
      const qualityMap = new Map();
      qualityAssessments?.forEach(assessment => {
        if (assessment.store_record_id) {
          qualityMap.set(assessment.store_record_id, {
            id: assessment.id,
            pricePerKg: assessment.suggested_price || 0,
            assessedBy: assessment.assessed_by || 'Quality Department',
            moisture: assessment.moisture,
            group1_defects: assessment.group1_defects,
            group2_defects: assessment.group2_defects
          });
        }
      });
      
      console.log('🔬 Found quality assessments:', qualityMap.size);
      
      // Convert each coffee record to a payment entry
      coffeeRecords?.forEach(record => {
        const batchNumber = record.batch_number || 'Unknown';
        
        // Skip if already paid
        if (paidBatchNumbers.has(batchNumber)) {
          console.log(`⏭️ Skipping ${batchNumber} - already paid`);
          return;
        }
        
        // Get quantity from the coffee record
        const quantity = Number(record.kilograms) || 0;
        
        console.log(`📦 ${batchNumber}: ${record.supplier_name} - ${quantity}kg`);
        
        if (quantity === 0) {
          console.warn(`⚠️ ${batchNumber} has zero quantity!`);
        }
        
        const qualityAssessment = qualityMap.get(record.id);
        
        // Check if Quality has priced this
        const isPricedByQuality = !!qualityAssessment && qualityAssessment.pricePerKg > 0;
        const pricePerKg = isPricedByQuality ? qualityAssessment.pricePerKg : 0;
        const totalAmount = quantity * pricePerKg;
        const assessedBy = isPricedByQuality ? qualityAssessment.assessedBy : 'Store Department';
        
        const supplierRef = record.supplier_id ? suppliersById.get(record.supplier_id) : null;
        const supplierDisplay = formatSupplierDisplay({
          supplier: supplierRef,
          fallbackName: record.supplier_name || 'Unknown Supplier',
          includeCode: true,
        });

        payments.push({
          id: record.id,
          batchNumber: record.batch_number || 'Unknown',
          supplier: supplierDisplay.displayName,
          supplierId: record.supplier_id || '',
          supplierCode: supplierDisplay.code,
          assessedBy,
          quantity,
          pricePerKg,
          totalAmount,
          dateAssessed: record.date || new Date().toLocaleDateString(),
          qualityAssessmentId: qualityAssessment?.id || record.id,
          isPricedByQuality,
          qualityAssessmentExists: !!qualityAssessment,
          createdBy: record.created_by || 'Store Department',
          coffeeType: record.coffee_type || 'Not specified',
          bags: record.bags || 0,
          dateReceived: record.date || record.created_at?.split('T')[0] || new Date().toLocaleDateString(),
          qualityParams: qualityAssessment ? {
            moisture: qualityAssessment.moisture,
            defects: qualityAssessment.group1_defects || qualityAssessment.group2_defects
          } : null
        });
      });
      
      // Sort by date (newest first)
      payments.sort((a, b) => 
        new Date(b.dateAssessed).getTime() - new Date(a.dateAssessed).getTime()
      );
      
      console.log('✅ Fetched pending coffee payments:', payments.length, 'records');
      console.log('📊 Summary:', {
        total: payments.length,
        withZeroQuantity: payments.filter(p => p.quantity === 0).length,
        priced: payments.filter(p => p.isPricedByQuality).length,
        unpriced: payments.filter(p => !p.isPricedByQuality).length
      });
      setCoffeePayments(payments);
    } catch (error) {
      console.error('Error fetching pending coffee payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (paymentData: ProcessPaymentData) => {
    try {
      console.log('💰 Processing payment:', paymentData);
      
      // Validate payment data
      if (!paymentData.paymentId || !paymentData.supplier || !paymentData.batchNumber) {
        throw new Error('Missing required payment information');
      }

      // Check available cash balance from finance_cash_balance table
      const { data: cashBalance, error: cashError } = await supabase
        .from('finance_cash_balance')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cashError) {
        console.error('Error fetching cash balance:', cashError);
        throw new Error('Failed to check available cash');
      }

      let availableCash = cashBalance?.current_balance || 0;

      // If finance_cash_balance is empty/zero, calculate from transactions
      if (!cashBalance || availableCash === 0) {
        console.log('📊 Calculating cash from transactions (balance table empty)');
        const { data: allTransactions } = await supabase
          .from('finance_cash_transactions')
          .select('amount, transaction_type, status')
          .eq('status', 'confirmed');

        let totalCashIn = 0;
        let totalCashOut = 0;
        
        allTransactions?.forEach(transaction => {
          const amount = Math.abs(Number(transaction.amount));
          if (transaction.transaction_type === 'DEPOSIT' || transaction.transaction_type === 'ADVANCE_RECOVERY') {
            totalCashIn += amount;
          } else if (transaction.transaction_type === 'PAYMENT' || transaction.transaction_type === 'EXPENSE') {
            totalCashOut += amount;
          }
        });

        availableCash = totalCashIn - totalCashOut;
        console.log('💰 Calculated available cash:', availableCash.toLocaleString());
      }

      if (availableCash < paymentData.amount) {
        throw new Error(`Insufficient funds. Available: UGX ${availableCash.toLocaleString()}, Required: UGX ${paymentData.amount.toLocaleString()}`);
      }

      // Update or create payment record in Supabase
      console.log('📝 Updating payment record in Supabase...');
      
      // Check if payment record already exists for this batch
      const { data: existingPayment } = await supabase
        .from('payment_records')
        .select('id')
        .eq('batch_number', paymentData.batchNumber)
        .maybeSingle();

      if (existingPayment) {
        // Update existing payment record
        const { error: paymentUpdateError } = await supabase
          .from('payment_records')
          .update({
            status: paymentData.method === 'Cash' ? 'Paid' : 'Processing',
            method: paymentData.method === 'Cash' ? 'Cash' : 'Bank Transfer',
            amount_paid: paymentData.amount,
            balance: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPayment.id);

        if (paymentUpdateError) {
          console.error('❌ Failed to update payment record:', paymentUpdateError);
          throw new Error(`Failed to update payment record: ${paymentUpdateError.message}`);
        }
        console.log('✅ Payment record updated in Supabase');
      } else {
        // Create new payment record
        const { error: paymentInsertError } = await supabase
          .from('payment_records')
          .insert({
            supplier: paymentData.supplier,
            amount: paymentData.amount,
            amount_paid: paymentData.amount,
            balance: 0,
            status: paymentData.method === 'Cash' ? 'Paid' : 'Processing',
            method: paymentData.method === 'Cash' ? 'Cash' : 'Bank Transfer',
            date: new Date().toISOString().split('T')[0],
            batch_number: paymentData.batchNumber,
            quality_assessment_id: paymentData.qualityAssessmentId
          });

        if (paymentInsertError) {
          console.error('❌ Failed to create payment record:', paymentInsertError);
          throw new Error(`Failed to create payment record: ${paymentInsertError.message}`);
        }
        console.log('✅ Payment record created in Supabase');
      }

      // Update coffee_record status to "inventory" in Supabase (after payment)
      console.log('📦 Updating coffee record in Supabase...');
      const { error: coffeeUpdateError } = await supabase
        .from('coffee_records')
        .update({ 
          status: 'inventory',
          updated_at: new Date().toISOString()
        })
        .eq('batch_number', paymentData.batchNumber);
      
      if (coffeeUpdateError) {
        console.error('❌ Failed to update coffee record:', coffeeUpdateError);
        throw new Error(`Failed to update coffee record: ${coffeeUpdateError.message}`);
      }
      console.log('✅ Coffee record updated to paid');

      // Update quality assessment status to "paid" 
      if (paymentData.qualityAssessmentId) {
        console.log('📋 Updating quality assessment status...');
        const { error: qaUpdateError } = await supabase
          .from('quality_assessments')
          .update({ 
            status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentData.qualityAssessmentId);
        
        if (qaUpdateError) {
          console.error('❌ Failed to update quality assessment:', qaUpdateError);
          // Don't throw - payment succeeded, this is just status sync
        } else {
          console.log('✅ Quality assessment status updated to paid');
        }
      }

      // Handle advance recovery if applicable  
      if (paymentData.advanceRecovered && paymentData.advanceRecovered > 0 && paymentData.supplierId) {
        console.log('💰 Processing advance recovery from Supabase...');

        // Get supplier advances from Supabase
        const { data: advances } = await supabase
          .from('supplier_advances')
          .select('*')
          .eq('supplier_id', paymentData.supplierId)
          .eq('is_closed', false)
          .order('issued_at', { ascending: true });

        console.log('📋 Found advances to recover:', advances?.length || 0);

        let remainingRecovery = paymentData.advanceRecovered;
        
        // Recover from oldest advances first (FIFO)
        for (const advance of advances || []) {
          if (remainingRecovery <= 0) break;

          const currentOutstanding = Number(advance.outstanding_ugx);
          const recoveryAmount = Math.min(remainingRecovery, currentOutstanding);
          const newOutstanding = currentOutstanding - recoveryAmount;
          const isClosed = newOutstanding === 0;

          await supabase
            .from('supplier_advances')
            .update({
              outstanding_ugx: newOutstanding,
              is_closed: isClosed,
              updated_at: new Date().toISOString()
            })
            .eq('id', advance.id);

          remainingRecovery -= recoveryAmount;
        }

        console.log('✅ Advance recovery completed');
      }

      // Calculate net payment after advance recovery
      const netPayment = paymentData.amount - (paymentData.advanceRecovered || 0);
      const newBalance = availableCash - netPayment;

      // Record transactions FIRST, then balance will be calculated from transactions
      let currentBalance = availableCash;

      // If advance was recovered, record it as CASH IN first
      if (paymentData.advanceRecovered && paymentData.advanceRecovered > 0) {
        currentBalance += paymentData.advanceRecovered;
        
        const { error: recoveryError } = await supabase
          .from('finance_cash_transactions')
          .insert({
            transaction_type: 'ADVANCE_RECOVERY',
            amount: paymentData.advanceRecovered,
            balance_after: currentBalance,
            reference: paymentData.batchNumber,
            notes: `Advance recovery from ${paymentData.supplier} - ${paymentData.batchNumber}`,
            created_by: employee?.name || 'Finance',
            status: 'confirmed',
            confirmed_by: employee?.name || 'Finance',
            confirmed_at: new Date().toISOString()
          });

        if (recoveryError) {
          console.error('Error recording advance recovery:', recoveryError);
          throw new Error('Failed to record advance recovery');
        }
      }

      // Record the payment as CASH OUT
      const { error: paymentError } = await supabase
        .from('finance_cash_transactions')
        .insert({
          transaction_type: 'PAYMENT',
          amount: -paymentData.amount,
          balance_after: newBalance,
          reference: paymentData.batchNumber,
          notes: `Payment to ${paymentData.supplier} - ${paymentData.batchNumber}${paymentData.notes ? ' - ' + paymentData.notes : ''}`,
          created_by: employee?.name || 'Finance',
          status: 'confirmed',
          confirmed_by: employee?.name || 'Finance',
          confirmed_at: new Date().toISOString()
        });

      if (paymentError) {
        console.error('Error recording payment transaction:', paymentError);
        throw new Error('Failed to record payment transaction');
      }

      // Update cash balance table based on final balance
      if (cashBalance?.id) {
        await supabase
          .from('finance_cash_balance')
          .update({
            current_balance: newBalance,
            updated_by: employee?.name || 'Finance'
          })
          .eq('id', cashBalance.id);
      } else {
        await supabase
          .from('finance_cash_balance')
          .insert({
            current_balance: newBalance,
            updated_by: employee?.name || 'Finance'
          });
      }

      // Record in daily tasks (day book)
      await supabase
        .from('daily_tasks')
        .insert({
          task_type: 'coffee_payment',
          description: `Coffee payment to ${paymentData.supplier} - Batch ${paymentData.batchNumber}`,
          amount: paymentData.amount,
          batch_number: paymentData.batchNumber,
          completed_by: employee?.name || 'Finance',
          department: 'Finance',
          date: new Date().toISOString().split('T')[0]
        });

      // Update quality assessment status (if it exists) in Supabase only
      if (paymentData.qualityAssessmentId && paymentData.qualityAssessmentId !== paymentData.paymentId) {
        const newStatus = paymentData.method === 'Cash' ? 'payment_processed' : 'submitted_to_finance';
        
        await supabase
          .from('quality_assessments')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentData.qualityAssessmentId);
      }

      // If bank transfer, create approval request
      if (paymentData.method === 'Bank') {
        await supabase
          .from('approval_requests')
          .insert({
            type: 'Bank Transfer',
            title: `Coffee Payment - ${paymentData.supplier}`,
            description: `Bank transfer payment for coffee batch ${paymentData.batchNumber}`,
            amount: paymentData.amount,
            requestedby: employee?.name || 'Finance Department',
            department: 'Finance',
            daterequested: new Date().toISOString(),
            status: 'Pending',
            priority: 'Medium',
            details: {
              paymentId: paymentData.paymentId,
              supplier: paymentData.supplier,
              batchNumber: paymentData.batchNumber,
              method: 'Bank Transfer'
            }
          });
      }

      // Refresh the payments list
      await fetchPendingPayments();
      
      // Invalidate finance stats to update available cash
      queryClient.invalidateQueries({ queryKey: ['finance-stats'] });
      
      console.log('✅ Payment processing completed successfully');
    } catch (error: any) {
      console.error('❌ Error processing payment:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      throw error;
    }
  };

  return {
    coffeePayments,
    loading,
    processPayment,
    refetch: fetchPendingPayments
  };
};