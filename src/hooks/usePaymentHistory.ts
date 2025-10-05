import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentRecord {
  id: string;
  supplier: string;
  batchNumber: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: 'Paid' | 'Partially Paid';
  method: string;
  date: string;
  processedBy: string;
  notes?: string;
  created_at: string;
}

export const usePaymentHistory = () => {
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching payment history...');

      // Fetch payment records from Firebase
      const paymentsQuery = query(
        collection(db, 'payment_records'),
        orderBy('created_at', 'desc')
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);

      // Fetch coffee records to get total amounts
      const coffeeQuery = query(collection(db, 'coffee_records'));
      const coffeeSnapshot = await getDocs(coffeeQuery);
      const coffeeMap = new Map();
      
      coffeeSnapshot.docs.forEach(doc => {
        const data = doc.data();
        coffeeMap.set(data.batch_number, {
          kilograms: data.kilograms || 0,
          pricePerKg: data.price_per_kg || 0,
          supplier: data.supplier_name
        });
      });

      // Fetch quality assessments for pricing
      const { data: qualityData } = await supabase
        .from('quality_assessments')
        .select('*');
      
      const qualityMap = new Map();
      if (qualityData) {
        qualityData.forEach(qa => {
          qualityMap.set(qa.batch_number, qa.suggested_price || 0);
        });
      }

      // Group payments by batch number to calculate totals
      const batchPayments = new Map<string, any[]>();
      paymentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const batchNumber = data.batchNumber || data.batch_number;
        if (!batchPayments.has(batchNumber)) {
          batchPayments.set(batchNumber, []);
        }
        batchPayments.get(batchNumber)?.push({
          id: doc.id,
          ...data
        });
      });

      const records: PaymentRecord[] = [];

      // Process each batch
      batchPayments.forEach((payments, batchNumber) => {
        const coffeeData = coffeeMap.get(batchNumber);
        const qualityPrice = qualityMap.get(batchNumber);
        
        if (coffeeData) {
          const pricePerKg = qualityPrice || coffeeData.pricePerKg || 0;
          const totalAmount = coffeeData.kilograms * pricePerKg;
          const paidAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          const balance = totalAmount - paidAmount;
          const status = balance <= 0 ? 'Paid' : 'Partially Paid';

          // Add a record for this batch (combining all payments)
          const latestPayment = payments[0]; // Most recent
          records.push({
            id: latestPayment.id,
            supplier: latestPayment.supplier || coffeeData.supplier,
            batchNumber,
            totalAmount,
            paidAmount,
            balance: Math.max(0, balance),
            status,
            method: latestPayment.method || 'Cash',
            date: latestPayment.date || new Date().toLocaleDateString(),
            processedBy: latestPayment.processed_by || 'Finance',
            notes: latestPayment.notes,
            created_at: latestPayment.created_at || new Date().toISOString()
          });
        }
      });

      // Sort by date (newest first)
      records.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('📊 Payment history loaded:', records.length, 'records');
      setPaymentRecords(records);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  return {
    paymentRecords,
    loading,
    refetch: fetchPaymentHistory
  };
};
