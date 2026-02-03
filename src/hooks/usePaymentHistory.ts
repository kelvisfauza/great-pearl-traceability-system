import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatSupplierDisplay, type SupplierRef } from '@/utils/supplierDisplay';

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
      console.log('📊 Fetching payment history from Supabase...');

      // Fetch only PAID payment records from Supabase
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payment_records')
        .select('*')
        .eq('status', 'Paid')
        .order('created_at', { ascending: false });

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        setPaymentRecords([]);
        return;
      }

      const batchNumbers = Array.from(
        new Set((paymentsData || []).map(p => p.batch_number).filter(Boolean))
      ) as string[];

      // Fetch matching coffee_records from Supabase (preferred source)
      const coffeeSupabaseMap = new Map<string, any>();
      if (batchNumbers.length > 0) {
        const { data: coffeeRows } = await supabase
          .from('coffee_records')
          .select('batch_number, kilograms, supplier_id, supplier_name')
          .in('batch_number', batchNumbers);
        (coffeeRows || []).forEach(r => {
          if (r.batch_number) coffeeSupabaseMap.set(r.batch_number, r);
        });
      }

      // Resolve supplier info from suppliers table for display
      const supplierIds = Array.from(
        new Set(Array.from(coffeeSupabaseMap.values()).map((r: any) => r.supplier_id).filter(Boolean))
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

      // Fetch coffee records from Firebase as a fallback (legacy)
      const coffeeSnapshot = await getDocs(collection(db, 'coffee_records'));
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

      // Group payments by batch number
      const batchPayments = new Map<string, any[]>();
      (paymentsData || []).forEach(payment => {
        const batchNumber = payment.batch_number;
        if (!batchNumber) return;
        
        if (!batchPayments.has(batchNumber)) {
          batchPayments.set(batchNumber, []);
        }
        batchPayments.get(batchNumber)?.push(payment);
      });

      const records: PaymentRecord[] = [];

      // Process each batch
      batchPayments.forEach((payments, batchNumber) => {
        const coffeeData = coffeeSupabaseMap.get(batchNumber) || coffeeMap.get(batchNumber);
        const qualityPrice = qualityMap.get(batchNumber);
        
        if (coffeeData) {
          const pricePerKg = qualityPrice || coffeeData.pricePerKg || 0;
          const totalAmount = coffeeData.kilograms * pricePerKg;
          
          // Calculate total paid for this batch
          const paidAmount = payments.reduce((sum, p) => {
            return sum + (Number(p.amount) || 0);
          }, 0);
          
          const balance = totalAmount - paidAmount;
          const status = balance <= 0 ? 'Paid' : 'Partially Paid';

          // Use the most recent payment for display
          const latestPayment = payments[0];

          const supplierRef = coffeeData.supplier_id ? suppliersById.get(coffeeData.supplier_id) : null;
          const supplierDisplay = formatSupplierDisplay({
            supplier: supplierRef,
            fallbackName:
              latestPayment.supplier ||
              (coffeeData as any).supplier_name ||
              (coffeeData as any).supplier,
            includeCode: true,
          });
          
          records.push({
            id: latestPayment.id,
            supplier: supplierDisplay.displayName,
            batchNumber,
            totalAmount,
            paidAmount,
            balance: Math.max(0, balance),
            status,
            method: latestPayment.method || 'Bank Transfer',
            date: latestPayment.date || new Date().toLocaleDateString(),
            processedBy: 'Finance',
            notes: `${payments.length} payment(s)`,
            created_at: latestPayment.created_at || new Date().toISOString()
          });
        }
      });

      // Sort by date (newest first)
      records.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('📊 Payment history loaded:', records.length, 'batches');
      console.log('📊 Sample record:', records[0]);
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
