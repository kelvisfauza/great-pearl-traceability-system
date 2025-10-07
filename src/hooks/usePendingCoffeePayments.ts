import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

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
  qualityGrade?: string;
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
      
      console.log('🔍 Finance fetching coffee records from Supabase...');
      
      // Fetch coffee records from SUPABASE (which has the correct data)
      const { data: coffeeRecords, error: coffeeError } = await supabase
        .from('coffee_records')
        .select('*')
        .not('status', 'in', '("paid","completed")')
        .order('date', { ascending: false });
      
      if (coffeeError) {
        console.error('Error fetching coffee records:', coffeeError);
        throw coffeeError;
      }
      
      console.log('📦 Found coffee records in Supabase:', coffeeRecords?.length || 0);
      
      // Fetch all PAID payment records from Supabase to exclude them
      const { data: paidPayments } = await supabase
        .from('payment_records')
        .select('batch_number')
        .eq('status', 'Paid');
      
      const paidBatchNumbers = new Set(
        paidPayments?.map(p => p.batch_number).filter(Boolean) || []
      );

      console.log('💳 Found paid batch numbers:', paidBatchNumbers.size);
      
      // Fetch all quality assessments from Supabase
      const { data: qualityAssessments } = await supabase
        .from('quality_assessments')
        .select('*');
      
      const qualityMap = new Map();
      qualityAssessments?.forEach(assessment => {
        if (assessment.store_record_id) {
          qualityMap.set(assessment.store_record_id, {
            id: assessment.id,
            pricePerKg: assessment.suggested_price || 0,
            assessedBy: assessment.assessed_by || 'Quality Department'
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
        
        payments.push({
          id: record.id,
          batchNumber: record.batch_number || 'Unknown',
          supplier: record.supplier_name || 'Unknown Supplier',
          supplierId: record.supplier_id || '',
          supplierCode: '', // Not in Supabase schema
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
          qualityGrade: qualityAssessment?.grade || 'Standard',
          qualityParams: qualityAssessment ? {
            moisture: qualityAssessment.moisture,
            defects: qualityAssessment.group1_defects || qualityAssessment.group2_defects,
            grade: qualityAssessment.grade
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

      // Check available cash balance (only confirmed balance)
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

      const availableCash = cashBalance?.current_balance || 0;

      if (availableCash < paymentData.amount) {
        throw new Error(`Insufficient funds. Available: UGX ${availableCash.toLocaleString()}, Required: UGX ${paymentData.amount.toLocaleString()}`);
      }

      // Create payment record in Firebase
      const paymentRecord = {
        supplier: paymentData.supplier,
        amount: paymentData.amount,
        paid_amount: paymentData.method === 'Cash' ? paymentData.amount : 0,
        status: paymentData.method === 'Cash' ? 'Paid' : 'Processing',
        method: paymentData.method === 'Cash' ? 'Cash' : 'Bank Transfer',
        date: new Date().toLocaleDateString(),
        batchNumber: paymentData.batchNumber,
        qualityAssessmentId: paymentData.qualityAssessmentId,
        notes: paymentData.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        processed_by: employee?.name || 'Finance Department'
      };

      console.log('📝 Creating payment record...', paymentRecord);
      const paymentDocRef = await addDoc(collection(db, 'payment_records'), paymentRecord);
      console.log('✅ Payment record created:', paymentDocRef.id);

      // Update coffee_record status to "paid" in Firebase
      console.log('📦 Updating coffee record status:', paymentData.paymentId);
      try {
        await updateDoc(doc(db, 'coffee_records', paymentData.paymentId), {
          status: 'paid',
          updated_at: new Date().toISOString()
        });
        console.log('✅ Coffee record updated to paid in Firebase');
      } catch (coffeeUpdateError: any) {
        console.error('❌ Failed to update coffee record in Firebase:', coffeeUpdateError);
        throw new Error(`Failed to update coffee record: ${coffeeUpdateError.message}`);
      }

      // Also update coffee_record status in Supabase
      console.log('📦 Updating coffee record in Supabase by batch number:', paymentData.batchNumber);
      try {
        const { error: supabaseUpdateError } = await supabase
          .from('coffee_records')
          .update({ 
            status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('batch_number', paymentData.batchNumber);
        
        if (supabaseUpdateError) {
          console.error('❌ Failed to update coffee record in Supabase:', supabaseUpdateError);
        } else {
          console.log('✅ Coffee record updated to paid in Supabase');
        }
      } catch (supabaseError: any) {
        console.error('❌ Error updating Supabase coffee record:', supabaseError);
      }

      // Update payment_records status in Supabase
      console.log('💳 Updating payment_records in Supabase...');
      try {
        const { error: paymentUpdateError } = await supabase
          .from('payment_records')
          .update({ 
            status: paymentData.method === 'Cash' ? 'Paid' : 'Processing',
            updated_at: new Date().toISOString()
          })
          .eq('batch_number', paymentData.batchNumber);
        
        if (paymentUpdateError) {
          console.error('❌ Failed to update payment_records in Supabase:', paymentUpdateError);
        } else {
          console.log('✅ Payment_records updated in Supabase');
        }
      } catch (paymentSupabaseError: any) {
        console.error('❌ Error updating Supabase payment_records:', paymentSupabaseError);
      }

      // Handle advance recovery if applicable
      if (paymentData.advanceRecovered && paymentData.advanceRecovered > 0 && paymentData.supplierId) {
        console.log('💰 Processing advance recovery:', {
          supplierId: paymentData.supplierId,
          supplierCode: paymentData.supplierCode,
          amountToRecover: paymentData.advanceRecovered
        });

        // Get supplier advances from Firebase - match by ID OR code for flexibility
        const advancesQuery = query(
          collection(db, 'supplier_advances'),
          where('is_closed', '==', false),
          orderBy('issued_at', 'asc')
        );
        
        const advancesSnapshot = await getDocs(advancesQuery);
        const allAdvances = advancesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Array<{
          id: string;
          supplier_id: string;
          supplier_code?: string;
          outstanding_ugx: number;
          amount_ugx: number;
          is_closed: boolean;
          [key: string]: any;
        }>;

        // Filter advances for this supplier (match by ID or code)
        const advances = allAdvances.filter(adv => 
          adv.supplier_id === paymentData.supplierId || 
          (paymentData.supplierCode && adv.supplier_code === paymentData.supplierCode)
        );

        console.log('📋 Found advances to recover:', advances.length);

        let remainingRecovery = paymentData.advanceRecovered;
        let totalRecovered = 0;
        
        // Recover from oldest advances first (FIFO)
        for (const advance of advances || []) {
          if (remainingRecovery <= 0) break;

          const currentOutstanding = Number(advance.outstanding_ugx);
          const recoveryAmount = Math.min(remainingRecovery, currentOutstanding);
          const newOutstanding = currentOutstanding - recoveryAmount;
          const isClosed = newOutstanding === 0;

          console.log(`   💵 Recovering from advance ${advance.id}:`, {
            outstanding: currentOutstanding,
            recovering: recoveryAmount,
            newOutstanding,
            willClose: isClosed
          });

          const advanceRef = doc(db, 'supplier_advances', advance.id);
          await updateDoc(advanceRef, {
            outstanding_ugx: newOutstanding,
            is_closed: isClosed,
            updated_at: new Date().toISOString()
          });

          totalRecovered += recoveryAmount;
          remainingRecovery -= recoveryAmount;
          
          console.log(`   ✅ Advance ${isClosed ? 'fully paid' : 'partially recovered'}`);
        }

        console.log('✅ Total advance recovered:', totalRecovered);
      }

      // Calculate net payment after advance recovery
      const netPayment = paymentData.amount - (paymentData.advanceRecovered || 0);

      // Update cash balance (net effect)
      const newBalance = availableCash - netPayment;
      
      const { error: balanceUpdateError } = await supabase
        .from('finance_cash_balance')
        .update({
          current_balance: newBalance,
          updated_by: employee?.name || 'Finance'
        })
        .eq('id', cashBalance.id);

      if (balanceUpdateError) {
        console.error('Error updating cash balance:', balanceUpdateError);
        throw new Error('Failed to update cash balance');
      }

      // Record transactions for proper cash flow tracking
      let currentBalance = availableCash;

      // If advance was recovered, record it as CASH IN first
      if (paymentData.advanceRecovered && paymentData.advanceRecovered > 0) {
        console.log('💰 Recording advance recovery:', paymentData.advanceRecovered);
        
        const { error: recoveryError } = await supabase
          .from('finance_cash_transactions')
          .insert({
            transaction_type: 'ADVANCE_RECOVERY',
            amount: paymentData.advanceRecovered,
            balance_after: currentBalance + paymentData.advanceRecovered,
            reference: paymentData.batchNumber,
            notes: `Advance recovery from ${paymentData.supplier} - ${paymentData.batchNumber}`,
            created_by: employee?.name || 'Finance',
            status: 'confirmed',
            confirmed_by: employee?.name || 'Finance',
            confirmed_at: new Date().toISOString()
          });

        if (recoveryError) {
          console.error('❌ Error recording advance recovery:', recoveryError);
          throw new Error('Failed to record advance recovery: ' + recoveryError.message);
        }
        
        currentBalance += paymentData.advanceRecovered;
        console.log('✅ Advance recovery recorded successfully');
      } else {
        console.log('ℹ️ No advance recovery for this payment. advanceRecovered:', paymentData.advanceRecovered);
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
      }

      // Update quality assessment status (if it exists)
      if (paymentData.qualityAssessmentId && paymentData.qualityAssessmentId !== paymentData.paymentId) {
        const newStatus = paymentData.method === 'Cash' ? 'payment_processed' : 'submitted_to_finance';
        
        console.log('🔬 Updating quality assessment:', paymentData.qualityAssessmentId);
        // Try updating in Supabase first
        const { error: supabaseError } = await supabase
          .from('quality_assessments')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentData.qualityAssessmentId);

        // Fallback to Firebase if Supabase fails
        if (supabaseError) {
          console.log('⚠️ Supabase update failed, trying Firebase:', supabaseError);
          try {
            await updateDoc(doc(db, 'quality_assessments', paymentData.qualityAssessmentId), {
              status: newStatus,
              updated_at: new Date().toISOString()
            });
            console.log('✅ Quality assessment updated in Firebase');
          } catch (fbError: any) {
            console.error('❌ Firebase update also failed:', fbError);
            // Don't throw here, quality assessment update is optional
          }
        } else {
          console.log('✅ Quality assessment updated in Supabase');
        }
      }

      // If bank transfer, create approval request
      if (paymentData.method === 'Bank') {
        await supabase
          .from('approval_requests')
          .insert({
            type: 'Bank Transfer',
            title: `Coffee Payment - ${paymentData.supplier}`,
            description: `Bank transfer payment for coffee batch ${paymentData.batchNumber}`,
            amount: paymentData.amount.toString(),
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