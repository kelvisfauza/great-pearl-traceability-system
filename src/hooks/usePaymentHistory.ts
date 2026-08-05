import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

      // Page through all posted supplier payments (Supabase caps at 1000/query)
      const payments: any[] = [];
      const pageSize = 1000;
      for (let page = 0; page < 20; page++) {
        const { data, error } = await supabase
          .from('supplier_payments')
          .select('id, lot_id, supplier_id, method, status, amount_paid_ugx, gross_payable_ugx, reference, notes, payment_date, approved_at, created_at, approved_by')
          .order('created_at', { ascending: false })
          .range(page * pageSize, page * pageSize + pageSize - 1);
        if (error) {
          console.error('Error fetching payments:', error);
          break;
        }
        payments.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }

      if (payments.length === 0) {
        setPaymentRecords([]);
        return;
      }

      // Resolve lots (batch number + total value)
      const lotIds = Array.from(new Set(payments.map(p => p.lot_id).filter(Boolean))) as string[];
      const lotsById = new Map<string, any>();
      for (let i = 0; i < lotIds.length; i += 300) {
        const { data } = await supabase
          .from('finance_coffee_lots')
          .select('id, batch_number, supplier_id, total_amount_ugx, quantity_kg, unit_price_ugx')
          .in('id', lotIds.slice(i, i + 300));
        (data || []).forEach((l: any) => lotsById.set(l.id, l));
      }

      // Resolve suppliers for display
      const supplierIds = Array.from(new Set([
        ...payments.map(p => p.supplier_id),
        ...Array.from(lotsById.values()).map((l: any) => l.supplier_id),
      ].filter(Boolean))) as string[];
      const suppliersById = new Map<string, SupplierRef>();
      for (let i = 0; i < supplierIds.length; i += 300) {
        const { data } = await supabase
          .from('suppliers')
          .select('id, name, code')
          .in('id', supplierIds.slice(i, i + 300));
        (data || []).forEach((s: any) => suppliersById.set(s.id, { id: s.id, name: s.name, code: s.code }));
      }

      // Group payments by lot (fall back to the payment id for legacy unlinked rows)
      const groups = new Map<string, any[]>();
      payments.forEach(p => {
        const key = p.lot_id || `payment:${p.id}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(p);
      });

      const records: PaymentRecord[] = [];
      groups.forEach((group, key) => {
        const lot = key.startsWith('payment:') ? null : lotsById.get(key);
        const latest = group[0];
        const paidAmount = group.reduce((sum, p) => sum + (Number(p.amount_paid_ugx) || 0), 0);
        const totalAmount = Number(
          lot?.total_amount_ugx ??
          (lot ? Number(lot.quantity_kg || 0) * Number(lot.unit_price_ugx || 0) : 0)
        ) || Number(latest.gross_payable_ugx) || paidAmount;
        const balance = totalAmount - paidAmount;

        const supplierId = latest.supplier_id || lot?.supplier_id;
        const supplierDisplay = formatSupplierDisplay({
          supplier: supplierId ? suppliersById.get(supplierId) : null,
          fallbackName: 'Unknown supplier',
          includeCode: true,
        });

        records.push({
          id: latest.id,
          supplier: supplierDisplay.displayName,
          batchNumber: lot?.batch_number || latest.reference || '—',
          totalAmount,
          paidAmount,
          balance: Math.max(0, balance),
          status: balance <= 0 ? 'Paid' : 'Partially Paid',
          method: String(latest.method || 'Bank Transfer'),
          date: latest.payment_date || latest.approved_at || latest.created_at || '',
          processedBy: latest.approved_by || 'Finance',
          notes: `${group.length} payment(s)`,
          created_at: latest.created_at || new Date().toISOString(),
        });
      });

      records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPaymentRecords(records);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentRecords([]);
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
