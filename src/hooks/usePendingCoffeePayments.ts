import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CoffeePayment {
  id: string;
  batchNumber: string;
  supplier: string;
  assessedBy: string;
  quantity: number;
  pricePerKg: number;
  totalAmount: number;
  dateAssessed: string;
  qualityAssessmentId: string;
}

interface ProcessPaymentData {
  paymentId: string;
  method: 'Cash' | 'Bank';
  amount: number;
  notes?: string;
  batchNumber: string;
  supplier: string;
}

export const usePendingCoffeePayments = () => {
  const [coffeePayments, setCoffeePayments] = useState<CoffeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { employee } = useAuth();

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      
      const payments: CoffeePayment[] = [];
      
      console.log('🔍 Fetching pending coffee payments from finance_coffee_lots...');
      
      // Fetch from Supabase finance_coffee_lots (new parallel workflow)
      const { data: financeLots, error: financeError } = await supabase
        .from('finance_coffee_lots')
        .select('*')
        .eq('finance_status', 'READY_FOR_FINANCE');

      console.log('📊 Finance lots found:', financeLots?.length || 0, 'Error:', financeError);
      
      if (!financeError && financeLots) {
        for (const lot of financeLots) {
          // Get supplier name from coffee_records
          const { data: coffeeRecord } = await supabase
            .from('coffee_records')
            .select('supplier_name, batch_number')
            .eq('id', lot.coffee_record_id)
            .maybeSingle();

          const qualityJson = lot.quality_json as any;

          payments.push({
            id: lot.id,
            batchNumber: coffeeRecord?.batch_number || qualityJson?.batch_number || 'Unknown',
            supplier: coffeeRecord?.supplier_name || 'Unknown Supplier',
            assessedBy: lot.assessed_by,
            quantity: lot.quantity_kg,
            pricePerKg: lot.unit_price_ugx,
            totalAmount: lot.total_amount_ugx || (lot.quantity_kg * lot.unit_price_ugx),
            dateAssessed: new Date(lot.assessed_at).toLocaleDateString(),
            qualityAssessmentId: lot.id
          });
        }
      }
      
      // Also fetch quality assessments from Firebase (legacy workflow)
      const qualityQuery = query(
        collection(db, 'quality_assessments'),
        where('status', 'in', ['assessed', 'submitted_to_finance'])
      );
      const qualitySnapshot = await getDocs(qualityQuery);
      
      // Fetch coffee records for legacy workflow
      const coffeeRecordsQuery = query(collection(db, 'coffee_records'));
      const coffeeSnapshot = await getDocs(coffeeRecordsQuery);
      const coffeeRecords = coffeeSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      qualitySnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Skip if already in payments from finance_coffee_lots
        if (payments.some(p => p.qualityAssessmentId === doc.id)) return;
        
        // Find corresponding coffee record
        const coffeeRecord = coffeeRecords.find((cr: any) => 
          cr.id === data.store_record_id || 
          cr.batch_number === data.batch_number
        );
        
        const quantity = (coffeeRecord as any)?.kilograms || data.kilograms || 0;
        const pricePerKg = data.suggested_price || 0;
        const totalAmount = quantity * pricePerKg;
        
        payments.push({
          id: doc.id,
          batchNumber: data.batch_number || 'Unknown',
          supplier: (coffeeRecord as any)?.supplier_name || data.supplier_name || 'Unknown Supplier',
          assessedBy: data.assessed_by || 'Unknown',
          quantity,
          pricePerKg,
          totalAmount,
          dateAssessed: new Date(data.created_at || data.date_assessed).toLocaleDateString(),
          qualityAssessmentId: doc.id
        });
      });
      
      // Sort by date (newest first)
      payments.sort((a, b) => 
        new Date(b.dateAssessed).getTime() - new Date(a.dateAssessed).getTime()
      );
      
      console.log('Fetched pending coffee payments:', payments);
      setCoffeePayments(payments);
    } catch (error) {
      console.error('Error fetching pending coffee payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (paymentData: ProcessPaymentData) => {
    try {
      // Create payment record in Firebase
      const paymentRecord = {
        supplier: paymentData.supplier,
        amount: paymentData.amount,
        paid_amount: paymentData.method === 'Cash' ? paymentData.amount : 0,
        status: paymentData.method === 'Cash' ? 'Paid' : 'Processing',
        method: paymentData.method === 'Cash' ? 'Cash' : 'Bank Transfer',
        date: new Date().toLocaleDateString(),
        batchNumber: paymentData.batchNumber,
        qualityAssessmentId: paymentData.paymentId,
        notes: paymentData.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        processed_by: employee?.name || 'Finance Department'
      };

      await addDoc(collection(db, 'payment_records'), paymentRecord);

      // Update quality assessment status
      const newStatus = paymentData.method === 'Cash' ? 'payment_processed' : 'submitted_to_finance';
      
      // Try updating in Supabase first
      const { error: supabaseError } = await supabase
        .from('quality_assessments')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentData.paymentId);

      // Fallback to Firebase if Supabase fails
      if (supabaseError) {
        await updateDoc(doc(db, 'quality_assessments', paymentData.paymentId), {
          status: newStatus,
          updated_at: new Date().toISOString()
        });
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
    } catch (error) {
      console.error('Error processing payment:', error);
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