import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SearchResult {
  id: string;
  type: 'supplier' | 'batch' | 'employee' | 'transaction' | 'quality' | 'payment';
  title: string;
  subtitle: string;
  navigateTo: string;
  metadata?: any;
}

export const useGlobalSearch = (searchTerm: string) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { employee, hasPermission } = useAuth();

  useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      const searchResults: SearchResult[] = [];

      try {
        const lowerSearch = searchTerm.toLowerCase();

        // Search Suppliers (visible to all)
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('*')
          .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
          .limit(10);

        if (suppliers) {
          suppliers.forEach(supplier => {
            searchResults.push({
              id: supplier.id,
              type: 'supplier',
              title: supplier.name,
              subtitle: `Code: ${supplier.code} | Origin: ${supplier.origin}`,
              navigateTo: `/suppliers?id=${supplier.id}`,
              metadata: supplier
            });
          });
        }

        // Search Coffee Records by Batch Number (Store Management)
        if (hasPermission('Store Management')) {
          const { data: coffeeRecords } = await supabase
            .from('coffee_records')
            .select('*')
            .or(`batch_number.ilike.%${searchTerm}%,supplier_name.ilike.%${searchTerm}%`)
            .limit(10);

          if (coffeeRecords) {
            coffeeRecords.forEach(record => {
              searchResults.push({
                id: record.id,
                type: 'batch',
                title: `Batch: ${record.batch_number}`,
                subtitle: `${record.supplier_name} | ${record.kilograms}kg | ${record.date}`,
                navigateTo: `/store?batch=${record.batch_number}`,
                metadata: record
              });
            });
          }
        }

        // Search Quality Assessments
        if (hasPermission('Quality Control')) {
          const { data: qualityAssessments } = await supabase
            .from('quality_assessments')
            .select('*')
            .ilike('batch_number', `%${searchTerm}%`)
            .limit(10);

          if (qualityAssessments) {
            qualityAssessments.forEach(assessment => {
              searchResults.push({
                id: assessment.id,
                type: 'quality',
                title: `Quality: ${assessment.batch_number}`,
                subtitle: `Moisture: ${assessment.moisture}% | Status: ${assessment.status}`,
                navigateTo: `/quality-control?batch=${assessment.batch_number}`,
                metadata: assessment
              });
            });
          }
        }

        // Search Employees (HR permission)
        if (hasPermission('User Management') || hasPermission('HR Management')) {
          const { data: employees } = await supabase
            .from('employees')
            .select('*')
            .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,employee_id.ilike.%${searchTerm}%`)
            .limit(10);

          if (employees) {
            employees.forEach(emp => {
              searchResults.push({
                id: emp.id,
                type: 'employee',
                title: emp.name,
                subtitle: `${emp.position} | ${emp.department}`,
                navigateTo: `/human-resources?employee=${emp.id}`,
                metadata: emp
              });
            });
          }
        }

        // Search Payment Records (Finance permission)
        if (hasPermission('Finance Management')) {
          const { data: payments } = await supabase
            .from('payment_records')
            .select('*')
            .or(`batch_number.ilike.%${searchTerm}%,supplier.ilike.%${searchTerm}%`)
            .limit(10);

          if (payments) {
            payments.forEach(payment => {
              searchResults.push({
                id: payment.id,
                type: 'payment',
                title: `Payment: ${payment.supplier}`,
                subtitle: `${payment.amount} UGX | ${payment.status} | ${payment.date}`,
                navigateTo: `/finance?payment=${payment.id}`,
                metadata: payment
              });
            });
          }
        }

        // Search Sales Transactions
        if (hasPermission('Sales Management')) {
          const { data: sales } = await supabase
            .from('sales_transactions')
            .select('*')
            .or(`customer.ilike.%${searchTerm}%,truck_details.ilike.%${searchTerm}%`)
            .limit(10);

          if (sales) {
            sales.forEach(sale => {
              searchResults.push({
                id: sale.id,
                type: 'transaction',
                title: `Sale: ${sale.customer}`,
                subtitle: `${sale.weight}kg | ${sale.total_amount} UGX | ${sale.date}`,
                navigateTo: `/sales-marketing?sale=${sale.id}`,
                metadata: sale
              });
            });
          }
        }

        setResults(searchResults);
      } catch (error) {
        console.error('Global search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm, hasPermission]);

  return { results, loading };
};
