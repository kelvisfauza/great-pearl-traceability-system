import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, orderBy } from 'firebase/firestore';
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
      
      console.log('🔍 Finance fetching from same source as Quality (Firebase coffee_records)...');
      
      // Fetch ALL coffee records from Firebase (same as Quality does)
      const coffeeRecordsQuery = query(
        collection(db, 'coffee_records'),
        orderBy('date', 'desc')
      );
      const coffeeSnapshot = await getDocs(coffeeRecordsQuery);
      
      console.log('📦 Found coffee records:', coffeeSnapshot.size);
      
      // Convert each coffee record to a payment entry
      coffeeSnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Only show records that are pending or ready for payment
        // Exclude records that have already been paid
        if (data.status === 'paid' || data.status === 'completed') {
          return;
        }
        
        const quantity = Number(data.kilograms) || 0;
        const pricePerKg = Number(data.price_per_kg) || 7000; // Use stored price or default
        const totalAmount = quantity * pricePerKg;
        
        console.log(`📝 Processing: ${data.supplier_name} - ${quantity}kg @ ${pricePerKg}/kg`);
        
        payments.push({
          id: doc.id,
          batchNumber: data.batch_number || 'Unknown',
          supplier: data.supplier_name || 'Unknown Supplier',
          assessedBy: data.assessed_by || 'Store Department',
          quantity,
          pricePerKg,
          totalAmount,
          dateAssessed: data.date || new Date().toLocaleDateString(),
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